<!-- Practice questions for the topic 'streaming'. Format: see README.md. -->

## site-011
exam: A2 P1
topic: streaming
level: A
source: site

Which trigger makes a Structured Streaming or Auto Loader query process all data currently available and then stop?

- [ ] `trigger(processingTime="0 seconds")` :: Runs micro-batches continuously, forever.
- [ ] `trigger(continuous="1 second")` :: Experimental continuous processing that never stops.
- [x] `trigger(availableNow=True)` :: Correct. It processes everything available, in rate-limited micro-batches, then stops.
- [ ] No trigger (the default) :: Same as `processingTime` 0: runs until stopped.

> Scheduled incremental processing: `availableNow`. `once` is deprecated.

## site-092
exam: A1 P1
topic: streaming
level: A
source: site

A Structured Streaming notebook that worked on classic compute fails on serverless with `INFINITE_STREAMING_TRIGGER_NOT_SUPPORTED`. The code sets no trigger. What is the fix?

- [ ] `trigger(processingTime="1 minute")` :: Still an endless stream, which serverless rejects.
- [x] `trigger(availableNow=True)` :: Correct. Serverless runs streams that stop: `availableNow` (or the deprecated `once`).
- [ ] Add more workers :: Serverless has no workers to configure, and the error is about the trigger.
- [ ] Enable Photon :: Photon is always on in serverless and unrelated.

> Endless triggers need classic compute, a continuous job, or a continuous pipeline; serverless jobs run `availableNow` streams.

## sp-28
exam: P1
topic: streaming
level: P
source: sp

In hand-written Structured Streaming, valid records need low latency and invalid ones are analysed rarely, at minimum cost. Which design fits?

- [x] Two independent streams on the same bronze table (one keeps `value >= 0`, the other `value < 0`), running on the same compute :: Correct. The latency of valid records is isolated from the quarantine path, and the compute is shared.
- [ ] One `foreachBatch` writing both outputs with try/except :: Couples the two paths: a delay in the quarantine write delays the valid records.
- [ ] One table with a boolean `quarantine` column :: Every consumer must filter, and the physical separation is lost.
- [ ] A dedicated cluster plus a daily job for the invalid records :: Adds cost for no reason.

> Separate streams have separate checkpoints and separate latency.

## sp-10
exam: P1 P2
topic: streaming
level: P
source: sp

Messages from a broker can be duplicated with up to 10 days between copies, and each `message_id` must exist only once in the Delta table. Which approach fits best?

- [x] `MERGE INTO` against the whole target on `message_id` with only `WHEN NOT MATCHED THEN INSERT`, inside `foreachBatch` :: Correct. It checks the entire table, so the time between duplicates does not matter.
- [ ] `dropDuplicates` with a 1-hour watermark :: State is dropped after the watermark; duplicates 10 days apart get through.
- [ ] Enable Change Data Feed :: Records changes; it does not remove duplicates.
- [ ] Use time travel to remove duplicates :: Reads old versions; it does not deduplicate ingestion.

> Long gaps between duplicates: insert-only `MERGE`. Short gaps: watermark-based deduplication.

## sp-25
exam: P1 A2
topic: streaming
level: P
source: sp

What does the option `skipChangeCommits` do when reading a Delta table as a stream?

- [x] It ignores commits that update or delete existing rows (`UPDATE`, `DELETE`, `MERGE`) and processes only appends :: Correct. Useful when you only want inserted data and accept losing those changes.
- [ ] It propagates updates as new records :: That resembles the legacy `ignoreChanges`.
- [ ] It enables Change Data Feed :: CDF is a table property enabled separately.
- [ ] It reprocesses the whole table on each micro-batch :: The stream stays incremental.

> A Delta stream source expects appends. `skipChangeCommits` ignores changes; CDF processes them.

## new-streaming-01
exam: P1
topic: streaming
level: P
source: new

A streaming aggregation keeps a running total per customer and must upsert the changed totals into a Delta table every micro-batch. The query fails when written with `outputMode("update")` to the Delta sink. What should you do?

- [ ] Switch to `append` mode without a watermark :: Aggregations without a watermark cannot use append mode.
- [x] Use `foreachBatch` and `MERGE` each batch's changed rows into the target :: Correct. The Delta sink supports append and complete; upserts go through `foreachBatch`.
- [ ] Use `complete` mode to a memory sink :: Not durable, and memory sinks are for testing.
- [ ] Disable the checkpoint :: Removes exactly-once guarantees and solves nothing.

> Streaming upserts into Delta: `foreachBatch` + `MERGE`.

## new-streaming-02
exam: P1
topic: streaming
level: P
source: new

A windowed count uses `withWatermark("event_ts", "15 minutes")`. What does the watermark achieve?

- [ ] It delays every event by 15 minutes before processing :: It does not delay processing.
- [x] It tells Spark how late events may arrive, so state for older windows can be finalised and dropped; events later than that are ignored :: Correct. It bounds state size and allows append mode for aggregations.
- [ ] It makes the stream run every 15 minutes :: That is a trigger.
- [ ] It deletes table data older than 15 minutes :: Watermarks affect state, not table data.

> Watermark = lateness threshold → bounded state, finalised windows.

## new-streaming-03
exam: P1 P8
topic: streaming
level: P
source: new

A `foreachBatch` function appends each micro-batch to two Delta tables. After a failure and restart, one table contains duplicates of a batch. How do you make the appends safe to retry?

- [ ] Add `.option("mergeSchema", "true")` to both writes :: Controls schema evolution, not duplicates.
- [x] Write with the options `txnAppId` (a stable ID for the query) and `txnVersion` (the `batch_id`), so Delta skips a batch that was already written :: Correct. These options make each table write idempotent per batch.
- [ ] Delete the checkpoint after each batch :: Causes full reprocessing.
- [ ] Use `trigger(once=True)` :: Deprecated, and it does not change retry behaviour.

> `foreachBatch` is at-least-once; make its writes idempotent (`MERGE`, or `txnAppId` + `txnVersion`).

## new-streaming-04
exam: P1
topic: streaming
level: P
source: new

A streaming job writing to a Delta table crashes in the middle of a micro-batch and is restarted with the same code and checkpoint. What happens?

- [ ] It starts again from the earliest offset and duplicates data :: The checkpoint records committed progress.
- [x] It replays the unfinished micro-batch from the offsets in the checkpoint; the Delta sink commits it once, so there is no loss and no duplication :: Correct. Replayable source + checkpoint + idempotent sink = exactly once.
- [ ] It skips the failed batch to avoid duplicates :: That would lose data.
- [ ] It cannot restart; a new checkpoint is required :: Restarting with the same checkpoint is the normal recovery path.

> Exactly-once recovery rests on the checkpoint.

## new-streaming-05
exam: P1
topic: streaming
level: P
source: new

Click events are sometimes sent twice within a few minutes. The stream must drop duplicates by `event_id` while keeping state small. Which code?

- [ ] `.dropDuplicates(["event_id"])` without a watermark :: Keeps every `event_id` in state forever.
- [x] `.withWatermark("event_ts", "30 minutes").dropDuplicatesWithinWatermark(["event_id"])` :: Correct. State is kept only for the watermark period.
- [ ] `.distinct()` :: Compares whole rows and keeps unbounded state.
- [ ] A `MERGE` against the target in `foreachBatch` :: Works, but scans the target every batch; it is the tool for duplicates days apart.

> Duplicates close in time: `dropDuplicatesWithinWatermark`.

## new-streaming-06
exam: P1
topic: streaming
level: P
source: new

Ad impressions and clicks are two streams. A click counts only if it happens within one hour after its impression. What does the stream-stream join need so that state does not grow forever?

- [x] Watermarks on both streams and a time condition such as `click_ts BETWEEN imp_ts AND imp_ts + INTERVAL 1 HOUR` :: Correct. Together they tell Spark when buffered rows can no longer match and may be dropped.
- [ ] A broadcast hint on the smaller stream :: Streams cannot be broadcast like static tables.
- [ ] `complete` output mode :: Not supported for this kind of join and does not bound state.
- [ ] A larger cluster :: State still grows without limit.

> Stream-stream joins: watermarks on both sides plus a time-range condition.

## new-streaming-07
exam: P4 P8
topic: streaming
level: P
source: new

`query.lastProgress` for a continuous stream shows `inputRowsPerSecond` around 50,000 and `processedRowsPerSecond` around 20,000, and batch durations keep growing. What does it mean?

- [x] The stream cannot keep up: a backlog is building, so you must add capacity or make each batch cheaper :: Correct. Processing slower than the input rate means growing latency.
- [ ] The stream is healthy; processed rows are always lower :: A persistent gap means the backlog grows.
- [ ] The source is losing data :: Input rows are still being read; they are simply waiting.
- [ ] The checkpoint is corrupted :: That would fail the query.

> Watch processed versus input rate: the gap is your backlog.
