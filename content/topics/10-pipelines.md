---
id: pipelines
title: Lakeflow Spark Declarative Pipelines
group: Transformation
order: 10
summary: Streaming tables, materialized views and views, SQL and Python syntax, expectations and quarantine, pipeline modes, full refresh, and when to choose pipelines over hand-written streaming.
---

## What a declarative pipeline is

You declare **datasets** (what each table should contain) in SQL or Python files. The engine works out the dependency graph, runs the flows in the right order, keeps checkpoints, retries failures, scales compute, records lineage and data quality metrics, and publishes the results to Unity Catalog. Formerly called Delta Live Tables (DLT).

Pipeline settings you should know:

- **Source code**: a folder of `.sql` and `.py` files (each dataset defined once).
- **Default catalog and schema**: where datasets are published.
- **Compute**: serverless (recommended) or classic clusters with autoscaling.
- **Mode**: *triggered* (process what is available, then stop; schedule it in a job) or *continuous* (keep running for low latency).
- **Run as**: the identity the pipeline uses; use a service principal in production.

## Dataset types

| | Streaming table | Materialized view | Temporary view |
|---|---|---|---|
| Processing | Incremental: each input row is processed once (append) | Keeps a query result up to date; refreshes incrementally when possible, otherwise recomputes | Not stored; computed when used inside the pipeline |
| Typical source | Streaming: `STREAM read_files(...)`, Kafka, another table read as a stream | Any batch query: joins, aggregations, windows | Any |
| Good for | Ingestion (bronze), append-only cleaning, `AUTO CDC` targets | Aggregates, joins with dimensions, "latest status" per key, gold tables | Intermediate steps nobody reads outside the pipeline |
| When the query changes | Only new rows use the new logic, until a full refresh | Next refresh uses the new logic for everything | — |

**Choosing a streaming table or a materialized view** (both are valid gold objects too):

- Source is append-only and you need low latency and low cost per row: **streaming table**.
- The result depends on all the data (aggregations), sources get updates or deletes, or dimension changes must be reflected in old rows: **materialized view**.
- A streaming table joined with a dimension (stream-static join) uses the dimension as it was when each row was processed; later dimension changes do not update old rows. A materialized view would.

Raw delivery events arriving all day plus "current status per delivery" is the classic pair: a streaming table for the events, a materialized view for the latest status.

## Syntax

```sql
-- bronze: incremental file ingestion
CREATE OR REFRESH STREAMING TABLE bronze_orders
COMMENT 'Raw orders from the landing volume'
AS SELECT *, _metadata.file_path AS source_file
FROM STREAM read_files('/Volumes/main/raw/landing/orders/', format => 'json');

-- silver: incremental cleaning with expectations
CREATE OR REFRESH STREAMING TABLE silver_orders (
  CONSTRAINT valid_id     EXPECT (order_id IS NOT NULL) ON VIOLATION FAIL UPDATE,
  CONSTRAINT valid_amount EXPECT (amount > 0)           ON VIOLATION DROP ROW,
  CONSTRAINT has_email    EXPECT (email IS NOT NULL)
) AS SELECT order_id, customer_id, try_cast(amount AS DECIMAL(10,2)) AS amount, email, order_ts
FROM STREAM bronze_orders;

-- gold: aggregate
CREATE OR REFRESH MATERIALIZED VIEW gold_daily_sales AS
SELECT date(order_ts) AS order_date, sum(amount) AS revenue, count(*) AS orders
FROM silver_orders GROUP BY ALL;
```

```python
from pyspark import pipelines as dp        # older code: import dlt
from pyspark.sql import functions as F

@dp.table(comment="Clean orders")          # streaming table, because the query is a stream
@dp.expect("has_email", "email IS NOT NULL")
@dp.expect_or_drop("valid_amount", "amount > 0")
@dp.expect_or_fail("valid_id", "order_id IS NOT NULL")
def silver_orders():
    return spark.readStream.table("bronze_orders")

@dp.materialized_view
def gold_daily_sales():
    return (spark.read.table("silver_orders")
            .groupBy(F.to_date("order_ts").alias("order_date"))
            .agg(F.sum("amount").alias("revenue")))

@dp.temporary_view
def orders_enriched():                     # intermediate step, not persisted
    return spark.read.table("silver_orders").join(spark.read.table("dim_customers"), "customer_id")
```

- Read another dataset of the pipeline with `spark.readStream.table(...)` (incremental) or `spark.read.table(...)` (complete). Legacy code uses `dlt.read_stream`, `dlt.read` and the `LIVE.` prefix.
- In the legacy `dlt` module, `@dlt.table` persists a dataset and `@dlt.view` does not.
- Several sources can feed one streaming table with **append flows** (`dp.create_streaming_table("all_orders")` plus `@dp.append_flow(target="all_orders")` per source), without a union that restarts when a source is added.
- **Sinks** (`dp.create_sink`) write a flow to Kafka or to an external Delta table.

## Expectations

| Clause (SQL) | Python decorator | Invalid row | Pipeline |
|---|---|---|---|
| no `ON VIOLATION` | `@dp.expect` | **Kept**, violation counted | Continues |
| `ON VIOLATION DROP ROW` | `@dp.expect_or_drop` | **Dropped**, counted | Continues |
| `ON VIOLATION FAIL UPDATE` | `@dp.expect_or_fail` | — | **Update fails**; the transaction is rolled back |

- Python can group rules: `@dp.expect_all({...})`, `@dp.expect_all_or_drop`, `@dp.expect_all_or_fail`.
- Metrics appear in the pipeline's data quality view and in the **event log** (`flow_progress` events, `details.flow_progress.data_quality.expectations`), with passed and failed counts per rule.
- `DROP ROW` keeps only a count, not the rejected rows. When rejected rows and the reason must be kept, build a **quarantine table** with the opposite condition. Handle NULLs: `NOT (amount > 0)` is NULL, not true, for a NULL amount, so write `NOT coalesce(amount > 0, false)` or compute an `is_valid` flag once and split on it.

```sql
CREATE OR REFRESH STREAMING TABLE orders_quarantine AS
SELECT *, 'amount must be positive' AS reason
FROM STREAM bronze_orders WHERE NOT coalesce(amount > 0, false);
```

- **Delta constraints** (`CHECK`, `NOT NULL`) are different: they apply to every writer of the table and make the write fail. Expectations exist only inside the pipeline and can warn, drop or fail.
- Use `FAIL UPDATE` when bad data signals a broken upstream and continuing would be worse than stopping; `DROP ROW` for expected noise; warn to monitor a rule before enforcing it.

## Running and operating a pipeline

- An **update** runs the graph. *Refresh* processes new data; **full refresh** truncates streaming tables, resets their checkpoints and reprocesses everything still available in the sources. Data no longer in the source (expired Kafka messages, deleted files) is lost; protect such tables with `pipelines.reset.allowed = false`.
- **Development mode** reuses compute and does not retry, for fast iteration. **Production mode** restarts and retries on failure.
- The **event log** is queryable: `SELECT * FROM event_log(TABLE(main.sales.silver_orders))` (or by pipeline ID). Useful event types: `flow_progress` (rows, quality metrics, backlog), `update_progress` (state of each update), `planning_information` (whether a materialized view refreshed incrementally or fully), `user_action`.
- **Deleting a pipeline deletes the tables it defines.**
- Schedule triggered pipelines with a **pipeline task** in Lakeflow Jobs, which can also request a full refresh.

### Materialized views and streaming tables outside a pipeline

In Databricks SQL you can create them directly; Databricks runs a serverless pipeline for them behind the scenes.

```sql
CREATE MATERIALIZED VIEW gold.sales_by_region
SCHEDULE EVERY 1 HOUR
AS SELECT region, sum(amount) AS revenue FROM silver.orders GROUP BY region;

REFRESH MATERIALIZED VIEW gold.sales_by_region;
```

- They need a pro or serverless SQL warehouse (or serverless compute). A refresh can also be scheduled or triggered when the source tables update.
- A refresh **runs as the owner**: if the owner loses access to a source, refreshes fail. Make a service principal the owner.
- A view is recomputed at every query; a materialized view is precomputed, so it suits expensive aggregates read often by BI.

## Pipelines or Structured Streaming code?

| Choose declarative pipelines when | Choose Structured Streaming code when |
|---|---|
| Standard ETL: ingest, clean, join, aggregate, CDC | You need custom `foreachBatch` logic or writes to several systems per batch |
| You want checkpoints, retries, orchestration, lineage and quality metrics managed for you | You need arbitrary stateful processing or fine control of triggers and state |
| A small team must keep operations low | You already have tested streaming code to run inside a job |

## Exam traps

!!! trap "No ON VIOLATION means keep"
    An expectation without an action keeps the row and records the violation.

!!! trap "DROP ROW is not a quarantine"
    Dropped rows are gone; only their count remains. Keeping them needs a separate table.

!!! trap "Full refresh of a streaming table"
    It truncates the table. Anything the source no longer holds is lost for good.

!!! tip "Table versus view"
    Persist only what someone reads outside the pipeline; intermediate steps can be temporary views.

## Hands-on

In Free Edition, create a pipeline (*Jobs & Pipelines → ETL pipeline*) with the SQL above, pointing `read_files` at a volume with a few JSON files. Run it, add a file with a negative amount and one with a NULL `order_id`, and check the data quality counts, the failed update, and the event log:

```sql
SELECT timestamp, details:flow_progress.data_quality.expectations
FROM event_log(TABLE(workspace.default.silver_orders))
WHERE event_type = 'flow_progress';
```
