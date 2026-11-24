---
id: udf-ai
title: UDFs and AI functions
group: Transformation
order: 9
summary: When to write a UDF, SQL versus Python versus pandas UDFs, Unity Catalog functions, and AI functions such as ai_query, ai_classify and ai_parse_document in batch pipelines.
---

## Built-in functions first

A UDF is a black box: the optimizer cannot look inside it, Photon cannot run Python code, and a UDF in a filter prevents data skipping. Check the built-in function list before writing one. When you do need a UDF, the cost depends on its kind:

| Kind | Runs where | Speed | Use when |
|---|---|---|---|
| Built-in function | Engine (Photon where available) | Fastest | Always, if one exists |
| **SQL UDF** | Inlined into the query plan | Close to built-ins | The logic can be written in SQL and you want to reuse it |
| **pandas UDF** (vectorized) | Python worker, batches through Apache Arrow | Good | Logic needs Python libraries (NumPy, pandas, a parser, a model) |
| **Python UDF** (row at a time) | Python worker, one call per row | Slowest | Small data or no alternative; mark it Arrow-optimized (`useArrow=True`) to cut serialisation cost |

pandas UDFs are faster than plain Python UDFs because Arrow moves whole batches between the JVM and Python and the function works on pandas Series, instead of serialising and calling Python once per row. Serialisation still happens; it is just much cheaper.

## SQL UDFs and Unity Catalog functions

```sql
CREATE OR REPLACE FUNCTION main.util.normalize_phone(p STRING)
RETURNS STRING
COMMENT 'Keeps digits and the leading +'
RETURN regexp_replace(p, '[^0-9+]', '');

CREATE OR REPLACE FUNCTION main.util.mask_iban(iban STRING)
RETURNS STRING
LANGUAGE PYTHON
AS $$
  if iban is None:
      return None
  return iban[:4] + "*" * (len(iban) - 8) + iban[-4:]
$$;

SELECT main.util.normalize_phone(phone), main.util.mask_iban(iban) FROM silver.customers;
GRANT EXECUTE ON FUNCTION main.util.mask_iban TO `analysts`;
```

- A function created with a three-level name is a **Unity Catalog function**: stored once, governed with `EXECUTE`, visible in lineage, and usable from notebooks, jobs and SQL warehouses in every attached workspace.
- `LANGUAGE PYTHON` functions run in an isolated Python environment; SQL functions are inlined and faster.
- A function can also **return a table** (`RETURNS TABLE (...)`) and be used in `FROM`.
- `CREATE TEMPORARY FUNCTION` lives only for the session.
- SQL UDFs are what row filters and column masks are made of (see *Data privacy*).

## Python and pandas UDFs in PySpark

```python
import pandas as pd
from pyspark.sql import functions as F
from pyspark.sql.functions import pandas_udf, udf

@udf("string", useArrow=True)                 # row at a time, Arrow-optimised
def initials(name):
    return None if name is None else "".join(p[0] for p in name.split())

@pandas_udf("double")                          # Series in, Series out
def to_fahrenheit(c: pd.Series) -> pd.Series:
    return c * 9 / 5 + 32

readings.select("sensor", to_fahrenheit("temp_c").alias("temp_f"))
spark.udf.register("to_fahrenheit", to_fahrenheit)   # callable from SQL in this session
```

| pandas UDF shape | Signature | Typical use |
|---|---|---|
| Series to Series | `pd.Series -> pd.Series` | Vectorised column logic |
| Iterator of Series | `Iterator[pd.Series] -> Iterator[pd.Series]` | Expensive setup once per batch stream, such as loading a model |
| Series to scalar | `pd.Series -> float` | Custom aggregation in `groupBy().agg()` |
| `applyInPandas` | function on each group's pandas DataFrame | Per-group logic (one model per store) |
| `mapInPandas` | iterator of DataFrames | Row batches in, row batches out |

UDFs must handle `None` themselves. Return types are declared; a value of another type becomes NULL or fails.

**Choosing under constraints**: logic expressible in SQL, used by analysts on SQL warehouses → SQL UDF in Unity Catalog. Needs a Python library, large data → pandas UDF. Must be governed and shared across teams → Unity Catalog function. Loads a model or a big lookup → iterator pandas UDF.

## AI functions

AI functions call models served by Databricks from SQL or Python, so you can enrich data in batch without building an API client.

| Function | Does |
|---|---|
| `ai_query(endpoint, request)` | Sends each row to any model serving endpoint (foundation model or your own model) and returns the response |
| `ai_classify(text, labels)` | Picks one of the given labels |
| `ai_extract(text, labels)` | Extracts entities such as person, location, product |
| `ai_analyze_sentiment(text)` | positive, negative, neutral or mixed |
| `ai_summarize`, `ai_translate`, `ai_fix_grammar`, `ai_gen`, `ai_similarity` | Summary, translation, grammar fixes, free generation, semantic similarity |
| `ai_mask(text, labels)` | Replaces entities of the given types (for example names, emails) with a mask |
| `ai_parse_document(content)` | Extracts text, tables and layout from PDFs and images |

```sql
CREATE OR REFRESH STREAMING TABLE silver_tickets AS
SELECT ticket_id, body,
       ai_classify(body, ARRAY('billing', 'delivery', 'product', 'other')) AS category,
       ai_analyze_sentiment(body)                                          AS sentiment,
       ai_query('my_llm_endpoint',
                CONCAT('Summarise this ticket in one sentence: ', body),
                failOnError => false)                                      AS summary
FROM STREAM bronze_tickets;
```

- With `failOnError => false`, `ai_query` returns a struct with the result and an error message instead of failing the whole query on one bad row.
- `ai_query` accepts a `responseFormat` to force structured (JSON schema) output, useful for extraction into columns.
- AI functions cost tokens or throughput. Run them **incrementally** (a streaming table processes each new row once) instead of in a materialized view that might recompute every row, and test on a `LIMIT` sample first.
- They run on SQL warehouses (pro or serverless), serverless compute and recent runtimes, in regions where the models are available.

## Exam traps

!!! trap "UDF performance order"
    Built-in, then SQL UDF, then pandas UDF, then plain Python UDF. An answer that replaces a built-in function with a Python UDF "for speed" is wrong.

!!! trap "pandas UDFs still serialise"
    They are faster because of Arrow batches, not because data stays in the JVM.

!!! tip "Incremental AI enrichment"
    Put AI functions on new rows only (streaming table, `MERGE` of new keys), not on the full table at every refresh.

## Hands-on

1. Create `workspace.default.normalize_phone` as a SQL UDF and use it on a few literal values.
2. Write the same logic as a Python UDF and as a pandas UDF; apply each to `spark.range(5_000_000)` with a generated string column and compare run times.
3. In a SQL editor, run `SELECT ai_analyze_sentiment('The delivery was late again')` and `ai_classify('Where is my parcel?', ARRAY('billing', 'delivery'))` if AI functions are available in your workspace.
