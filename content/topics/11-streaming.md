---
id: streaming
title: Structured Streaming
group: Transformation
order: 11
summary: Micro-batches, checkpoints and exactly-once, triggers, output modes, watermarks and stateful operations, deduplication, foreachBatch with MERGE, and monitoring streams.
---

## The model

Structured Streaming treats a stream as a table that keeps growing. Each **micro-batch** reads the new input, updates the result and writes it to the sink.

```python
from pyspark.sql import functions as F
events = spark.readStream.table("main.bronze.events")          # Delta table as a source
(events.filter("event_type = 'purchase'")
   .writeStream
   .option("checkpointLocation", "/Volumes/main/meta/checkpoints/purchases")
   .trigger(availableNow=True)
   .toTable("main.silver.purchases"))
```

- **Sources**: Delta tables, files through Auto Loader, Kafka, Kinesis, Event Hubs, Pub/Sub.
- **Sinks**: Delta tables (`toTable`), Kafka, or any code through `foreachBatch`.
- **Exactly-once** comes from three things together: a replayable source, the **checkpoint** (offsets and state, written before each batch commits) and an idempotent sink such as Delta. A restarted query resumes where it stopped.
- One checkpoint per query, never shared. Deleting it makes the query start over. Some changes to a running query (adding or changing stateful operations, changing sources) are incompatible with its checkpoint and need a new one.

Triggers (`availableNow`, `processingTime`, none, deprecated `once`) are described in *Ingesting files*; they work the same for every source.

## Output modes

| Mode | Writes each batch | Typical use | Delta sink |
|---|---|---|---|
| `append` (default) | Only new rows that will never change | Row-level transformations; windowed aggregations with a watermark (a window is written once it closes) | Yes |
| `complete` | The whole result table | Small aggregations that are rewritten every batch | Yes |
| `update` | Only rows changed in this batch | Running aggregates | No direct support: use `foreachBatch` with `MERGE` |

## Stateful operations and watermarks

Aggregations, deduplication and stream-stream joins keep **state** between batches (in the state store, RocksDB recommended, saved in the checkpoint). Without a limit, state grows forever.

A **watermark** says how late data may arrive:

```python
counts = (events
  .withWatermark("event_ts", "10 minutes")
  .groupBy(F.window("event_ts", "5 minutes"), "store_id")
  .count())
```

- Spark keeps state for windows that can still receive data: anything older than *latest event time seen − 10 minutes* is finalised, written (in append mode) and dropped from state.
- Events arriving later than the watermark are ignored for those windows.
- Window types: tumbling `window(ts, "5 minutes")`, sliding `window(ts, "10 minutes", "5 minutes")`, session `session_window(ts, "30 minutes")`.

**Deduplication**

| Situation | Use |
|---|---|
| Duplicates arrive close together (minutes or hours) | `withWatermark(...)` plus `dropDuplicatesWithinWatermark(["event_id"])`; state is kept only for the watermark period |
| Duplicates can arrive days apart | Insert-only `MERGE` against the target table inside `foreachBatch`: it checks the whole table, with no state limit |

**Joins**

- Stream-static join: each batch joins with the current version of a Delta table. It keeps no state; rows already processed are not updated when the static table changes.
- Stream-stream join: both sides need watermarks and a time condition (for example `click_ts BETWEEN view_ts AND view_ts + INTERVAL 1 HOUR`) so state can be cleaned up.

## foreachBatch

`foreachBatch` hands each micro-batch to your function as a normal DataFrame, so you can use batch-only operations: `MERGE`, writes to several tables, JDBC writes.

```python
from delta.tables import DeltaTable

def upsert_customers(batch_df, batch_id):
    latest = batch_df.dropDuplicates(["customer_id"])        # one row per key for MERGE
    (DeltaTable.forName(batch_df.sparkSession, "main.silver.customers").alias("t")
        .merge(latest.alias("s"), "t.customer_id = s.customer_id")
        .whenMatchedUpdateAll()
        .whenNotMatchedInsertAll()
        .execute())

(spark.readStream.table("main.bronze.customer_updates")
   .writeStream.foreachBatch(upsert_customers)
   .option("checkpointLocation", "/Volumes/main/meta/checkpoints/customers")
   .trigger(availableNow=True)
   .start())
```

- If a batch fails halfway, it is **retried**: `foreachBatch` is at-least-once unless your writes are idempotent. `MERGE` on a key is naturally idempotent. For appends, pass the Delta options `txnAppId` (a fixed ID for the query) and `txnVersion` (the `batch_id`) so a retried batch is skipped.
- When the function writes the batch to several tables, `persist()` it first so the source is not read twice, and `unpersist()` at the end.
- Separate streams have separate latency: if valid and invalid records need very different latencies, two independent streams on the same bronze table keep the slow path from delaying the fast one.

## Monitoring a stream

- `query.lastProgress` and `query.recentProgress` show input rows per second, processed rows per second, batch duration and state size. A processing rate lower than the input rate means a growing backlog.
- The Spark UI has a **Structured Streaming** tab with the same metrics over time.
- `StreamingQueryListener` pushes progress events to your own monitoring.
- In declarative pipelines, `flow_progress` events in the event log carry the same information, including backlog.

## Exam traps

!!! trap "Update mode and Delta"
    A Delta sink does not accept `update` output mode. Upserts from a stream are done with `foreachBatch` and `MERGE`.

!!! trap "Watermarks forget"
    Deduplication or aggregation with a 1-hour watermark cannot catch a duplicate that arrives 10 days later.

!!! trap "foreachBatch can run twice"
    A failed batch is retried; non-idempotent appends inside `foreachBatch` create duplicates unless you use `txnAppId` and `txnVersion`.

## Hands-on

1. Create a table with `spark.range` and a timestamp column, then read it as a stream with `availableNow` into a second table. Append rows to the source and run again; only new rows are processed.
2. Run a windowed count with a watermark in `complete` mode to a memory sink (`.format("memory").queryName("counts")`) on classic compute, or with `availableNow` into a Delta table in `append` mode on serverless.
3. Write the `foreachBatch` upsert above and run it twice on the same input; check that the target has no duplicates.
4. Print `query.lastProgress` after a run.
