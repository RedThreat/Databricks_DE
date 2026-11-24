---
id: semi-structured
title: Semi-structured and unstructured data
group: Ingestion
order: 6
summary: JSON as strings, structs or VARIANT, path syntax, parse_json and variant_get, exploding arrays, higher-order functions, and ingesting nested and binary files.
---

## Three ways to store JSON

| | JSON in a STRING column | STRUCT, ARRAY, MAP columns | VARIANT column |
|---|---|---|---|
| Created with | Raw text | `from_json(col, schema)` or schema inference | `parse_json(col)`, or ingestion with a VARIANT schema |
| Flexibility | Any shape | Fixed schema; changes need schema evolution | Any shape |
| Query speed | Parsed again on every query | Fast | Fast (binary encoding with statistics) |
| Path syntax | `raw:customer.city` | `customer.city` | `v:customer.city` |
| Best for | Landing raw text you never query | Stable, well-known structures | Semi-structured data whose structure changes |

Databricks recommends **VARIANT** for semi-structured data that changes over time: it keeps the flexibility of a string with performance close to a struct.

## Querying JSON strings and VARIANT

```sql
-- raw is a STRING column holding JSON
SELECT raw:customer.address.city      AS city,       -- returns a STRING
       raw:items[0].sku                AS first_sku,
       raw:items[*].sku                AS all_skus,   -- wildcard: JSON strings only
       raw:price::DECIMAL(10,2)        AS price
FROM bronze.events_json;

-- v is a VARIANT column
SELECT v:customer.address.city::STRING                    AS city,
       variant_get(v, '$.items[0].sku', 'string')         AS first_sku,
       try_variant_get(v, '$.price', 'decimal(10,2)')     AS price,
       schema_of_variant(v)                               AS shape
FROM bronze.events_variant;

-- one row per array element of a VARIANT
SELECT e.event_id, i.pos, i.value:sku::STRING AS sku
FROM bronze.events_variant AS e,
     LATERAL variant_explode(e.v:items) AS i;
```

Differences that cause wrong answers:

- The `[*]` wildcard works on **JSON strings** only. On VARIANT, use `variant_explode`.
- Field names in **VARIANT** paths are **case sensitive**. In JSON-string paths they are not (unless you use brackets, such as `raw:['Owner']`).
- A path on a VARIANT returns a VARIANT. Cast it (`::STRING`, `::INT`) or use `variant_get` with a type before comparing or displaying it.
- VARIANT values cannot be used directly in `GROUP BY`, `ORDER BY`, `DISTINCT` or as clustering keys: cast them first.
- `try_parse_json` and `try_variant_get` return NULL instead of failing on bad input.
- Dot notation (`customer.address.city`) is for **STRUCT** columns. `raw.customer.city` on a string column fails.

Converting between representations:

| From | To | Function |
|---|---|---|
| JSON string | STRUCT | `from_json(raw, 'customer STRUCT<id: INT, city: STRING>')` (needs a schema; `schema_of_json` can derive one from a sample) |
| JSON string | VARIANT | `parse_json(raw)` |
| STRUCT or VARIANT | JSON string | `to_json(col)` |

## Structs, arrays and maps

| Need | Function |
|---|---|
| All fields of a struct as columns | `select("customer.*")` |
| One row per array element | `explode(arr)`; drops rows whose array is NULL or empty |
| Keep rows with NULL or empty arrays | `explode_outer(arr)` |
| Element and its position | `posexplode(arr)` (position starts at 0) |
| Array of structs to rows and columns | `inline(arr)` |
| Element by index | `arr[0]` (0-based), `element_at(arr, 1)` (1-based), `try_element_at` (NULL when out of range) |
| Transform or filter inside an array | `transform(arr, x -> x * 2)`, `filter(arr, x -> x > 0)`, `exists(arr, x -> x IS NULL)`, `aggregate(arr, 0, (acc, x) -> acc + x)` |
| Build arrays from rows | `collect_list(col)` (keeps duplicates), `collect_set(col)` (distinct) |
| Map lookup | `m['key']`, `map_keys(m)`, `map_values(m)` |
| Array size, membership | `size(arr)`, `array_contains(arr, 'x')` |

```python
from pyspark.sql import functions as F
orders = (spark.table("bronze.orders_struct")
          .select("order_id", F.explode_outer("items").alias("item"))
          .select("order_id", "item.sku", "item.qty"))
```

## Ingesting semi-structured data

- Auto Loader and `read_files` read JSON (one record per line by default; `multiLine` for documents spanning lines), XML (`rowTag`), Avro and Parquet.
- Auto Loader infers JSON fields as strings unless `inferColumnTypes` is set; nested objects become structs.
- To keep each record whole, set `singleVariantColumn` so every record lands in **one VARIANT column**. There is then no schema to evolve and no rescued data; you extract fields later with paths.
- With a schema or schema hints, a value of the wrong type goes to `_rescued_data`; it does not fail the stream. Only **malformed** records (broken JSON) fail in `FAILFAST` mode or are dropped in `DROPMALFORMED` mode.
- Databricks audit logs are delivered as JSON; `system.access.audit` exposes them as a table.

## Unstructured data

- Keep documents, images and audio in a **volume**: governed by Unity Catalog, readable from SQL and Python.
- The `binaryFile` reader returns one row per file with `path`, `modificationTime`, `length` and `content` (bytes). Use `pathGlobFilter` to pick file types; Auto Loader supports it for incremental loads.
- `ai_parse_document` extracts text and layout from PDFs and images in SQL (see *UDFs and AI functions*).
- Managed connectors such as SharePoint ingest documents from business systems.

```python
pdfs = (spark.readStream.format("cloudFiles")
          .option("cloudFiles.format", "binaryFile")
          .option("pathGlobFilter", "*.pdf")
          .load("/Volumes/main/raw/contracts/"))
```

## Exam traps

!!! trap "Colon versus dot"
    `raw:a.b` reads a JSON string or VARIANT. `a.b` reads a STRUCT. Mixing them up is a common wrong option.

!!! trap "explode drops rows"
    `explode` removes rows whose array is NULL or empty. When those rows must stay, use `explode_outer`.

!!! trap "VARIANT is case sensitive"
    `v:Customer` and `v:customer` are different paths on VARIANT, but the same on a JSON string.

## Hands-on

```sql
CREATE OR REPLACE TEMP VIEW raw_events AS SELECT * FROM VALUES
 ('{"id":1,"customer":{"name":"Ana","address":{"city":"Lisbon"}},"items":[{"sku":"A1","qty":2},{"sku":"B7","qty":1}]}'),
 ('{"id":2,"customer":{"name":"Rui"},"items":[]}') AS t(raw);

SELECT raw:customer.address.city, raw:items[*].sku FROM raw_events;
SELECT parse_json(raw) AS v FROM raw_events;
SELECT v:id::INT, i.value:sku::STRING
FROM (SELECT parse_json(raw) AS v FROM raw_events), LATERAL variant_explode(v:items) AS i;
```

Then build the same result with `from_json` and `explode_outer` in PySpark and check what happens to order 2.
