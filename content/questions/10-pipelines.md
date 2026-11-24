<!-- Practice questions for the topic 'pipelines'. Format: see README.md. -->

## sa-26
exam: A3
topic: pipelines
level: A
source: sa

A team is considering moving hand-written Spark pipelines to Lakeflow Spark Declarative Pipelines and wants to know what they gain. Which description matches what the product offers?

- [x] Declarative data quality checks, schema evolution support, declarative development and one model for batch and streaming :: Correct. Expectations for quality, schema handling, dependencies and orchestration managed for you, and the same definitions for batch and streaming.
- [ ] Manual schema enforcement, high operational overhead and limited scalability :: This describes the hand-written situation the product removes.
- [ ] Custom code for every quality check and no streaming support :: Expectations are declarative and streaming is built in.
- [ ] Batch only, no versioning and fixed infrastructure costs :: Pipelines stream, write versioned Delta tables and use autoscaling or serverless compute.

> If a description of declarative pipelines sounds like heavy operational work, it describes the world before them.

## site-066
exam: A3 P1
topic: pipelines
level: A
source: site

A source is append-only and every row must be processed exactly once, incrementally. Which dataset type fits best?

- [ ] Materialized view :: Keeps a query result current; it may recompute instead of processing each row once.
- [x] Streaming table :: Correct. Each input row is processed once, incrementally.
- [ ] View :: Not stored; recomputed when used.
- [ ] External table :: A storage choice, not an incremental processing model.

> Append-only and incremental: streaming table.

## site-065
exam: A3 P1
topic: pipelines
level: A
source: site

A gold aggregate is expensive to compute, must be refreshed when its sources change, and is queried constantly by BI. Which object?

- [ ] View :: Recomputes the expensive query on every read.
- [x] Materialized view :: Correct. The result is stored and refreshed (on a schedule, on source updates, or incrementally).
- [ ] Temporary view :: Lives only in a session or pipeline.
- [ ] Streaming table :: For append-only incremental processing, not a recomputed aggregate.

> Precomputed, refreshed results for BI: materialized view.

## sp-20
exam: P1 A3
topic: pipelines
level: P
source: sp

A pipeline receives delivery tracking events. It must store the raw events incrementally and expose the latest status of each delivery, recomputed automatically. Which combination?

- [x] A streaming table for the raw events and a materialized view for the latest status per delivery :: Correct. Streaming tables suit append-only ingestion; the materialized view recomputes the current state per key.
- [ ] A materialized view for the raw events and a streaming table for the latest status :: Roles reversed: ingestion would be recomputed, and "latest status" needs replacing values.
- [ ] Two streaming tables :: Streaming tables append; keeping only the latest value per key needs something else.
- [ ] Two materialized views :: Recomputing raw ingestion at every refresh is unnecessary and expensive.

> Events: streaming table. Current state per key: materialized view (or `AUTO CDC`).

## sa-25
exam: A3
topic: pipelines
level: A
source: sa

In a code review, an intermediate cleaning step between bronze and silver, used only inside the pipeline, is declared with `@dlt.table`. It takes storage for nothing. What is the right fix?

- [x] Declare it as a view (`@dlt.view`, or `@dp.temporary_view`), since it does not need to be persisted :: Correct. A view chains transformations inside the pipeline without materialising data.
- [ ] Keep `@dlt.table` and run `VACUUM` often :: The table is still materialised; this treats the symptom.
- [ ] Keep `@dlt.table` and add a comment saying it is temporary :: A comment changes nothing.
- [ ] Replace it with a CTE in the final query :: Can work in simple cases, but loses reuse and visibility of the step in the pipeline graph.

> Persist only what someone reads outside the pipeline.

## sa-27
exam: A3
topic: pipelines
level: A
source: sa

This is the first step of a pipeline that reads JSON order files and must persist the result as a Delta table. Which two problems does the code have?

```python
import dlt

@dlt.view
def bronze_orders():
    return spark.read.parquet("abfss://landing@account.dfs.core.windows.net/orders/")
```

- [x] It uses `@dlt.view` instead of `@dlt.table`, and reads Parquet although the source is JSON :: Correct. Persisting needs a table, and the reader must match the source format.
- [ ] It does not import `pyspark.sql.functions` or define the schema explicitly :: Neither is required here.
- [ ] The path should be relative and the function should take a parameter :: Absolute storage paths are normal, and dataset functions take no parameters.
- [ ] A mandatory expectation is missing :: Expectations are recommended, not mandatory.

> In pipeline code check two things: does the decorator persist what must be persisted, and does the reader match the source?

## site-064
exam: A3 P3
topic: pipelines
level: A
source: site

What does an expectation do by default when it has NO `ON VIOLATION` clause?

- [ ] Drops the row :: That needs `ON VIOLATION DROP ROW`.
- [ ] Fails the update :: That needs `ON VIOLATION FAIL UPDATE`.
- [x] Keeps the row and records the violation (warn) :: Correct. The metric is recorded and the row is written.
- [ ] Quarantines the row :: There is no automatic quarantine.

> Default expectation = warn: keep the row, count the violation.

## site-020
exam: A3 P3
topic: pipelines
level: A
source: site

What happens to a row with `amount = -5`?

```sql
CONSTRAINT valid_amount EXPECT (amount > 0) ON VIOLATION DROP ROW
```

- [ ] The pipeline update fails :: That is `FAIL UPDATE`.
- [ ] The row is written and the violation is only logged :: That is the default without `ON VIOLATION`.
- [x] The row is dropped and the violation is recorded in the metrics :: Correct.
- [ ] The row is sent to a quarantine table automatically :: Quarantine tables must be built yourself.

> `DROP ROW`: invalid rows are removed and counted; the pipeline continues.

## sa-23
exam: A3 P3
topic: pipelines
level: A
source: sa

Farm sensors send soil humidity readings. Values outside the physically possible range must be discarded, but the flow must not fail because of them. Which mechanism implements this rule?

- [x] An expectation with `expect_or_drop` :: Correct. Violating rows are removed and the pipeline keeps running.
- [ ] An expectation with `expect_or_fail` :: Stops the pipeline at the first violation, which is forbidden here.
- [ ] An expectation with `expect` only :: Records the violation and keeps the row.
- [ ] Change data capture :: Propagates inserts, updates and deletes; it does not validate data.

> Three expectation actions, three decisions: monitor (`expect`), discard (`expect_or_drop`), stop (`expect_or_fail`).

## sa-24
exam: A3 P3
topic: pipelines
level: A
source: sa

In another pipeline, records without a parcel identifier mean a serious upstream error. The team wants the run to stop immediately in that case so nobody consumes corrupted data. Which decorator?

- [x] `expect_or_fail` :: Correct. The update fails when the condition is violated, and its writes are rolled back.
- [ ] `expect_or_drop` :: Drops the records and continues, hiding the upstream problem.
- [ ] `expect` :: Only records the violation.
- [ ] A `WHERE` filter in the source query :: Removes rows with no trace in the quality metrics and no alert.

> `expect_or_fail` when bad data is a symptom of a broken upstream, not expected noise.

## site-111
exam: A3 P3
topic: pipelines
level: A
source: site

Auditors need every rejected record and the reason it was rejected. Which approach fits?

- [ ] `ON VIOLATION DROP ROW` :: Keeps only a count, not the rows.
- [x] Quarantine: write valid rows to silver and invalid rows, with a reason, to a quarantine table :: Correct. Make sure each row (including rows with NULLs) lands in exactly one of the two tables.
- [ ] `ON VIOLATION FAIL UPDATE` :: Stops the pipeline and keeps nothing.
- [ ] A warn expectation :: Keeps bad rows in the main table.

> Rejected rows that must be kept: a quarantine table.

## new-pipelines-01
exam: P3 A3
topic: pipelines
level: P
source: new

A pipeline splits bronze rows with `WHERE amount > 0` into silver and `WHERE NOT (amount > 0)` into a quarantine table. Auditors find that rows with a NULL amount appear in neither table. What fixes it?

- [ ] Add `ON VIOLATION DROP ROW` to the silver table :: Still loses the rows.
- [x] Use a NULL-safe condition for the quarantine, such as `WHERE NOT coalesce(amount > 0, false)` (or compute an `is_valid` flag once and split on it) :: Correct. `NOT (NULL > 0)` is NULL, which a `WHERE` treats as false.
- [ ] Use `UNION` instead of two tables :: Mixes valid and invalid rows.
- [ ] Run `OPTIMIZE` on both tables :: Layout has nothing to do with it.

> NULL makes a condition and its negation both not true. Quarantine logic must handle NULLs explicitly.

## sp-19
exam: P1
topic: pipelines
level: P
source: sp

A small team needs incremental ingestion, declared quality rules, lineage and low operational effort. Which approach fits best?

- [x] Lakeflow Spark Declarative Pipelines with streaming tables, materialized views and expectations :: Correct. The platform manages checkpoints, orchestration, incremental processing and quality metrics.
- [ ] Hand-written Structured Streaming with custom checkpoints and merges :: Works, but needs far more code and maintenance.
- [ ] A scheduled notebook with validation UDFs :: No native incremental processing or built-in quality metrics.
- [ ] Shell scripts calling `spark-submit` :: Little governance and no pipeline abstraction.

> Standard ETL with low operational effort: declarative pipelines.

## new-pipelines-03
exam: P1
topic: pipelines
level: P
source: new

Which requirement is the strongest reason to write Structured Streaming code in a job instead of a declarative pipeline?

- [ ] The data must be ingested incrementally from cloud storage :: Pipelines do this with streaming tables.
- [ ] Rows that fail validation must be dropped and counted :: Expectations do this.
- [x] Each micro-batch must call custom logic that writes to two external systems and a Delta table, using `foreachBatch` :: Correct. Arbitrary per-batch side effects are where hand-written streaming gives control that declarative datasets do not.
- [ ] Lineage must appear in Unity Catalog :: Pipelines record lineage automatically.

> Declarative pipelines for standard ETL; Structured Streaming when you need custom per-batch or stateful logic.

## new-pipelines-04
exam: P1 A3
topic: pipelines
level: P
source: new

A streaming table enriches each order with the customer's segment through a join with `dim_customers`. Marketing re-segments customers, and old orders still show the old segment. Why, and what would show the current segment?

- [ ] The pipeline is broken; restart it :: It works as designed.
- [x] A streaming table processes each row once, using the dimension as it was at that moment; a materialized view joining orders and customers would reflect current segments :: Correct. Stream-static joins do not revisit old rows.
- [ ] Enable Change Data Feed on the streaming table :: CDF exposes changes; it does not recompute old rows.
- [ ] Use `ON VIOLATION DROP ROW` :: Unrelated to joins.

> Streaming tables never revisit processed rows; recomputation is the job of materialized views.

## new-pipelines-05
exam: P1
topic: pipelines
level: P
source: new

Engineers changed the `SELECT` logic of a streaming table to fix a currency conversion. New rows are correct, but rows processed before the change still use the old logic. What reprocesses everything with the new logic?

- [ ] Nothing; streaming tables recompute old rows on the next update :: They do not.
- [x] A full refresh of that streaming table, provided the source still holds all the data :: Correct. It truncates the table and reprocesses the source from the start.
- [ ] `OPTIMIZE` on the streaming table :: Compacts files only.
- [ ] Changing the pipeline to continuous mode :: Changes latency, not past rows.

> Query changes on streaming tables apply to new rows only; a full refresh rebuilds, if the source can be replayed.

## new-pipelines-07
exam: A3 A4
topic: pipelines
level: A
source: new

A team deletes an old declarative pipeline they no longer edit, expecting its tables to remain for reporting. What happens?

- [ ] The tables remain and become regular managed tables :: Deleting the pipeline removes the datasets it defines.
- [x] The streaming tables and materialized views defined by the pipeline are deleted with it :: Correct. Back them up or move the logic before deleting.
- [ ] The tables remain but are read-only :: They are removed.
- [ ] Only the event log is deleted :: The datasets go too.

> Deleting a pipeline deletes its tables. Same for Lakeflow Connect ingestion pipelines.

## new-pipelines-08
exam: P1 P2
topic: pipelines
level: P
source: new

A streaming table `all_orders` is fed by a web orders stream. A new source (mobile orders, another Kafka topic) must be added without restarting the existing flow or doing a full refresh. What do you use?

- [ ] Rewrite the query as a `UNION` of both streams :: Changing the query changes the flow and its checkpoint; it may require a full refresh.
- [x] An additional append flow targeting the same streaming table :: Correct. Each source has its own flow and checkpoint into one target.
- [ ] A materialized view over both topics :: Recomputes instead of appending incrementally.
- [ ] A second pipeline that writes to the same table :: A table is managed by one pipeline.

> Several sources into one streaming table: append flows.

## new-pipelines-09
exam: A3 A4
topic: pipelines
level: A
source: new

Data for a pipeline arrives once a night, and the results are needed at 7:00. The pipeline should not run all day. How should it run?

- [ ] Continuous mode :: Keeps compute running all day for nothing.
- [x] Triggered mode, started by a scheduled job (or a file arrival trigger) after the data lands :: Correct. A triggered update processes what is available, then stops.
- [ ] Development mode :: Meant for iteration; it does not retry failures.
- [ ] A materialized view with no refresh :: Would never pick up new data.

> Triggered pipelines for periodic data; continuous mode only when low latency justifies always-on compute.

## site-109
exam: A3 P1
topic: pipelines
level: A
source: site

A materialized view's scheduled refreshes start failing after its owner moved teams and lost access to the source schema. Analysts can still query it. What is the fix?

- [ ] Grant the analysts `SELECT` on the source tables :: Refreshes do not run as the analysts.
- [x] Make an identity that keeps `SELECT` on the sources, such as a service principal, the owner of the materialized view :: Correct. Refreshes run with the owner's privileges.
- [ ] Convert the materialized view to a view :: Loses the precomputation dashboards rely on.
- [ ] Run `REFRESH` as an analyst :: The refresh still runs as the owner.

> Refreshes run as the owner; old results stay readable but go stale.

## site-110
exam: A3 P3
topic: pipelines
level: A
source: site

A gold table is written by a nightly job, a backfill notebook and manual SQL fixes. It must never contain a negative amount. What enforces this for every writer?

- [ ] An expectation with `ON VIOLATION FAIL UPDATE` :: Applies only inside the pipeline that defines it.
- [x] A Delta `CHECK` constraint on the table :: Correct. Any transaction that violates it fails, whoever writes.
- [ ] A `WHERE` filter in the nightly job :: The other writers ignore it.
- [ ] A row filter :: Controls what users see, not what can be written.

> Table-level rules for all writers: Delta constraints. Pipeline-level rules: expectations.
