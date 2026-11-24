---
id: testing
title: Testing and code quality
group: Orchestration and DevOps
order: 16
summary: Writing testable transformations, chaining them with DataFrame.transform, unit tests with pytest and pyspark.testing assertions, integration tests with bundles, and how tests differ from data quality checks.
---

## Two kinds of checks

| | Tests | Data quality checks |
|---|---|---|
| Question | Does my **code** do the right thing? | Is today's **data** acceptable? |
| When | Before deployment (CI) | Every run, in production |
| Tools | `pytest`, `pyspark.testing`, integration jobs | Expectations, `CHECK` constraints, quarantine tables, monitoring |
| Input | Small, hand-made datasets with known answers | Real data |

You need both: a correct transformation still fails on corrupt input, and good data does not fix a bug.

## Writing testable code

Keep **I/O at the edges** and the logic in **pure functions** that take DataFrames (and parameters) and return a DataFrame. Reading tables and writing results happens in a thin entry point (a notebook or a `main` function).

```python
# src/orders/transform.py
from pyspark.sql import DataFrame, functions as F

def clean_orders(df: DataFrame) -> DataFrame:
    return (df.filter(F.col("order_id").isNotNull())
              .withColumn("amount", F.coalesce("amount", F.lit(0.0)))
              .dropDuplicates(["order_id"]))

def add_vat(df: DataFrame, rate: float = 0.23) -> DataFrame:
    return df.withColumn("amount_with_vat", F.round(F.col("amount") * (1 + rate), 2))
```

```python
# notebooks/run_orders (thin entry point)
from orders.transform import clean_orders, add_vat
result = (spark.read.table("main.bronze.orders")
            .transform(clean_orders)
            .transform(add_vat, rate=0.23))       # extra arguments are passed to the function
result.write.mode("overwrite").saveAsTable("main.silver.orders")
```

`DataFrame.transform(f, *args, **kwargs)` chains functions in a readable pipeline, and each function can be tested on its own. Package the functions (see *CI/CD*) instead of sharing them through `%run`, which cannot be imported by a test runner.

## Unit tests with pytest

```python
# tests/conftest.py
import pytest
from pyspark.sql import SparkSession

@pytest.fixture(scope="session")
def spark():
    # local Spark for pure PySpark logic; use DatabricksSession (Databricks Connect)
    # when the code needs Databricks features such as Unity Catalog tables
    return SparkSession.builder.master("local[2]").getOrCreate()
```

```python
# tests/test_transform.py
from pyspark.testing import assertDataFrameEqual, assertSchemaEqual
from orders.transform import clean_orders, add_vat

def test_clean_orders_removes_null_ids_and_duplicates(spark):
    raw = spark.createDataFrame(
        [(1, 10.0), (1, 10.0), (None, 5.0), (2, None)], "order_id INT, amount DOUBLE")
    expected = spark.createDataFrame([(1, 10.0), (2, 0.0)], "order_id INT, amount DOUBLE")
    assertDataFrameEqual(clean_orders(raw), expected)

def test_add_vat_schema(spark):
    df = spark.createDataFrame([(1, 100.0)], "order_id INT, amount DOUBLE")
    out = add_vat(df)
    assertSchemaEqual(out.schema, spark.createDataFrame(
        [], "order_id INT, amount DOUBLE, amount_with_vat DOUBLE").schema)
```

- **`assertDataFrameEqual(actual, expected)`** compares schemas and rows and prints a readable diff. Row order is ignored by default (`checkRowOrder=False`); `rtol` and `atol` allow tolerance on floating-point values. It also accepts lists of `Row`s.
- **`assertSchemaEqual(actual, expected)`** compares column names, types and nullability.
- Build tiny input DataFrames inside the test with `spark.createDataFrame` and an explicit schema. Cover the edge cases: NULLs, empty input, duplicates, out-of-range values, unexpected strings.
- Run tests locally, in CI on every pull request, or on Databricks with Databricks Connect. A notebook can also call `pytest.main([...])` to run the suite on a cluster.

## Integration tests

Unit tests check functions; integration tests check the **deployed** job or pipeline against real services:

1. A `test` target in the bundle points at a test catalog (`${var.catalog}`) with small, representative data (or shallow clones of production tables).
2. CI runs `databricks bundle deploy -t test` and then `databricks bundle run -t test orders_job`.
3. A final task asserts on the outputs (row counts, keys, totals) and **raises an exception** when a check fails, so the run, and the CI step, fail.
4. Optionally `bundle destroy -t test --auto-approve` cleans up.

## Exam traps

!!! trap "Expectations are not unit tests"
    Expectations validate production data at runtime. Testing transformation logic before deployment uses `pytest` and `pyspark.testing`.

!!! trap "Order of rows"
    `assertDataFrameEqual` ignores row order by default; asking for an `orderBy` before comparing is unnecessary.

!!! tip "Pure functions"
    A function that reads and writes tables cannot be unit-tested in isolation. Move the reads and writes out, and pass DataFrames in.

## Hands-on

1. Create a folder with `src/orders/transform.py` and `tests/test_transform.py` as above, install `pyspark` and `pytest` locally, and run `pytest`.
2. Break `clean_orders` on purpose (remove the `dropDuplicates`) and read the diff printed by `assertDataFrameEqual`.
3. Add the tests to a bundle created with `databricks bundle init default-python` (it already includes a `tests/` folder) and run them from a GitHub Actions workflow.
