<!-- Practice questions for the topic 'testing'. Format: see README.md. -->

## sp-61
exam: P1
topic: testing
level: P
source: sp

Which approach makes PySpark transformations modular and easy to test?

- [x] Pure functions that take and return a DataFrame, chained with `df.transform(f1).transform(f2)` :: Correct. Each step can be tested on its own.
- [ ] One large function that does everything, called from the notebook :: Hard to test in parts.
- [ ] Global variables shared between cells :: Couples the steps and hides dependencies.
- [ ] Copy and paste the code into each pipeline :: Drift and duplicated maintenance.

> Small pure functions + `DataFrame.transform` = composable and testable.

## new-testing-01
exam: P1
topic: testing
level: P
source: new

A unit test must check that `clean_orders(raw)` returns exactly the expected rows and schema, and print a readable difference when it does not. Which assertion fits?

- [ ] `assert clean_orders(raw).count() == expected.count()` :: Same counts can hide wrong values.
- [x] `pyspark.testing.assertDataFrameEqual(clean_orders(raw), expected)` :: Correct. It compares schema and rows and shows a diff on failure.
- [ ] `assert clean_orders(raw).collect() == expected.collect()` :: Fails on row order and gives no useful diff.
- [ ] `clean_orders(raw).show()` and inspect the output :: Not an automated test.

> `assertDataFrameEqual` for data, `assertSchemaEqual` for schemas.

## new-testing-02
exam: P1
topic: testing
level: P
source: new

A test compares the output of a transformation with an expected DataFrame using `assertDataFrameEqual`. The rows are the same but come back in a different order. What happens?

- [x] The test passes, because row order is ignored by default (`checkRowOrder=False`) :: Correct. Set `checkRowOrder=True` only when order is part of the requirement.
- [ ] The test fails unless both DataFrames are sorted first :: Sorting is not needed by default.
- [ ] The test fails because Spark row order is random :: The assertion is designed for that.
- [ ] The assertion only compares schemas :: That is `assertSchemaEqual`.

> Spark does not guarantee order; the testing helpers ignore it unless asked.

## new-testing-03
exam: P1
topic: testing
level: P
source: new

A function adds a computed column. A test must fail if the column's type or nullability changes, regardless of the data. Which check?

- [x] `assertSchemaEqual(actual.schema, expected_schema)` :: Correct. It compares names, types and nullability of the columns.
- [ ] `assertDataFrameEqual` on an empty DataFrame only :: Compares data; a schema check states the intent directly.
- [ ] `actual.printSchema()` :: Prints, does not assert.
- [ ] `len(actual.columns) == 5` :: Misses type and nullability changes.

> Schema contracts: `assertSchemaEqual`.

## new-testing-04
exam: P1
topic: testing
level: P
source: new

A transformation notebook reads `main.bronze.orders`, cleans it and writes `main.silver.orders`, all in one function. The team cannot write unit tests for it. What should they change?

- [ ] Add expectations to the silver table :: Validates data at runtime; does not test the logic.
- [x] Move reading and writing out of the function, so it takes a DataFrame and returns a DataFrame, then test it with small in-memory inputs :: Correct. I/O at the edges, logic in pure functions.
- [ ] Run the notebook against production and compare row counts :: Slow, risky and not a unit test.
- [ ] Wrap the function in `try`/`except` :: Hides errors.

> Testable code keeps I/O out of the transformation.

## new-testing-05
exam: P1 P8
topic: testing
level: P
source: new

Unit tests pass, but the team wants to verify before each release that the deployed job works end to end with real services. Which practice fits?

- [ ] More unit tests with mocked Spark :: Still does not exercise the deployed job.
- [x] An integration test: deploy the bundle to a `test` target, run the job on representative test data, and fail the run with an exception when output checks fail :: Correct. CI runs it after `bundle deploy -t test`.
- [ ] Run the job in production and roll back if it fails :: Tests in production with real consequences.
- [ ] Rely on expectations in production :: Catches bad data, not broken deployments.

> Unit tests for functions; integration tests for deployed jobs in a test environment.

## new-testing-06
exam: P1
topic: testing
level: P
source: new

Tests for a package run locally with a plain `SparkSession`, but one function reads Unity Catalog tables and uses Databricks-specific features. How can that test run from the developer's IDE?

- [ ] It cannot; such code can only be tested by hand in notebooks :: Databricks Connect exists for this.
- [x] Use Databricks Connect (`DatabricksSession`) in the test fixture so the Spark code runs on Databricks compute :: Correct. The test runs from the IDE or CI while executing remotely.
- [ ] Install Unity Catalog locally :: Not how Unity Catalog is used.
- [ ] Replace the function with a SQL query :: Changes the code instead of testing it.

> Local Spark for pure logic; Databricks Connect when the code needs Databricks features.
