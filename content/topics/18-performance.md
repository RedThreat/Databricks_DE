---
id: performance
title: Performance tuning and troubleshooting
group: Operations
order: 18
summary: How Spark executes work, the tuning settings the exam names, reading the Spark UI and the query profile, skew, spill, shuffles, out-of-memory errors, caching, and where to look when something fails.
---

## How Spark executes work

- The **driver** plans the query, schedules tasks and collects results. **Executors** run tasks and hold cached data.
- Each action starts a **job**; a job is split into **stages** at every **shuffle** (data exchanged between executors for `groupBy`, `join`, `distinct`, `orderBy`, windows, `repartition`); each stage runs one **task per partition**.
- **Adaptive Query Execution (AQE)**, on by default, re-plans at runtime: it merges small shuffle partitions, switches a join to a broadcast join when one side turns out small, and splits skewed partitions in joins.
- **Photon** executes SQL and DataFrame operators in vectorised native code. Python UDFs and RDD code fall back to the standard engine.

## Tuning settings

| Setting | Default | Controls | Remember |
|---|---|---|---|
| `spark.sql.shuffle.partitions` | 200 in Spark; Databricks recommends `auto` | Number of partitions after a shuffle | Too few: huge partitions, spill, OOM. Too many: tiny tasks. A fixed legacy value disables auto-optimized shuffle; serverless manages it for you |
| `spark.default.parallelism` | Total cores | Partitions for **RDD** operations | Does not affect DataFrame shuffles |
| Executor memory (worker node type) | Depends on node | Memory per executor | Choose larger or memory-optimised workers |
| Driver memory (driver node type) | Depends on node | Memory of the driver | Cannot be changed at runtime; more workers do not add driver memory |
| `spark.sql.autoBroadcastJoinThreshold` | 10 MB | Size under which a table is broadcast at planning time | `-1` disables it; AQE can still broadcast at runtime; hints override the threshold |
| `spark.sql.files.maxPartitionBytes` | 128 MB | Size of input partitions when reading files | |

Serverless compute accepts only a few Spark settings, and SQL warehouses essentially none: on those, the platform tunes these values.

**Method**: change one thing at a time, rerun on the same input, and compare total time and stage metrics. Without a new measurement you do not know whether the change helped.

## Reading the Spark UI

Start from the **Jobs** tab, open the slowest job, then its slowest **stage**. The stage page shows **summary metrics** for its tasks (min, 25th percentile, median, 75th percentile, max) for duration, GC time, input, shuffle read and write, and spill.

| What you see | Means |
|---|---|
| Max task duration far above the median and 75th percentile | **Skew**: a few partitions hold much more data |
| *Spill (memory)* and *Spill (disk)* columns appear | Partitions did not fit in executor memory |
| Huge shuffle read and write | Expensive data exchange, often a join that could be a broadcast |
| High GC time | Memory pressure |
| CPU time close to task time | CPU-bound work: more or faster cores help |
| CPU time much lower than task time | Tasks wait (I/O, shuffle fetches, skewed neighbours) |

Other tabs: **SQL / DataFrame** (the query plan with metrics per operator: rows, time, files read and pruned, join strategy), **Executors** (memory, GC, failed tasks, lost executors), **Storage** (cached data), **Environment** (settings), **Structured Streaming**.

**Serverless and SQL warehouses have no Spark UI**: use the **query profile**. It shows each operator's time, rows, peak memory and spill, files and bytes read versus pruned, the join strategy, and insights such as data skew or spill. From a serverless job run, open the run's query history to reach the profiles.

## Problems and fixes

| Problem | Symptom | Fix |
|---|---|---|
| Skew in a join | One task runs far longer | Keep AQE skew join handling on (it splits skewed partitions in sort-merge and shuffle hash joins); salt the hot key; broadcast if one side is small; handle NULL or dummy keys separately |
| Skew in an aggregation | One task runs far longer; AQE does not help | **Salting**: add a random suffix to the key, aggregate, remove the suffix, aggregate again |
| Spill | Spill columns in stage metrics or query profile | More (smaller) shuffle partitions or `auto`; memory-optimised workers; select only needed columns before wide operations |
| Large shuffle of a big table joined with a small one | Shuffle read/write in TBs | Broadcast the small table |
| Driver out of memory | `collect()`, `toPandas()`, huge broadcast, many results | Do not bring data to the driver: write to a table, aggregate, `limit`; larger driver node or high-memory serverless notebook |
| Executor out of memory | `OutOfMemoryError` in executors, lost executors | More shuffle partitions, larger worker nodes, fix skew, avoid broadcasting large tables, avoid caching when memory is short |
| Poor data skipping | Files read close to total files | Liquid clustering on filter columns (see *Table layout*) |
| Too many small output files | Thousands of tiny files | `OPTIMIZE`, auto compaction; `coalesce(n)` before a write |
| Slow Python logic | Python UDF stages dominate | Built-in functions, or pandas UDFs |

Adding workers does not fix skew (the slow task is still one task) and does not fix driver OOM. Lowering `spark.sql.shuffle.partitions` makes skewed partitions even bigger.

`coalesce(n)` reduces the number of partitions by merging existing ones **without a full shuffle**; `repartition(n)` or `repartition("col")` performs a **full shuffle** to increase partitions or rebalance them.

## Caching

| | Disk cache (Delta cache) | Spark cache (`df.cache()`, `CACHE TABLE`) | Query result cache |
|---|---|---|---|
| Stores | Copies of remote data files on workers' local SSDs | DataFrame or table in executor memory (and disk) | Results of identical queries on SQL warehouses |
| Enabled | Automatically on supported node types, SQL warehouses and serverless | Manually; filled by the first action | Automatically |
| Freshness | Detects changed files automatically | Can be stale until unpersisted | Invalidated when the data changes |
| Helps | Repeated reads of the same files (dashboards, iterative analysis) | Reusing one expensive intermediate result several times in a job | Repeated identical dashboard queries |
| Costs | Local disk space | Executor memory; can cause OOM | Nothing |

The disk cache makes repeated reads faster because it serves data from local SSDs instead of cloud storage. It does not fix a bad layout, and caching is never a fix for out-of-memory errors.

## Where to look when something fails

| Situation | Look in |
|---|---|
| Cluster does not start | Cluster event log (termination reason), init script logs |
| A task fails with an exception | Run output, driver logs (stdout, stderr, log4j) |
| Executors lost, OOM, spot instances reclaimed | Spark UI Executors tab, cluster event log, driver logs |
| Slow query on a warehouse or serverless | Query profile, `system.query.history` |
| A pipeline update fails | Pipeline event log (`level = 'ERROR'`) |
| A cost spike | `system.billing.usage` |
| Who changed a permission or table | `system.access.audit` |

Configure **cluster log delivery** to a volume so driver, executor and init script logs survive after the cluster terminates.

## Exam traps

!!! trap "AQE skew handling is for joins"
    It does not split skewed aggregations; salting does.

!!! trap "spark.default.parallelism"
    It only affects RDDs. DataFrame shuffles follow `spark.sql.shuffle.partitions`.

!!! trap "Cache is not memory"
    When the problem is out-of-memory, caching more data makes it worse.

!!! tip "One change at a time"
    Measure, change one setting, measure again on the same input.

## Hands-on

1. Run `spark.range(0, 50_000_000).withColumn("k", (F.col("id") % 3).cast("int"))`, add a skewed key (`when(id < 40_000_000, 0)`), group by it and inspect the stage's summary metrics (on classic compute) or the query profile (on serverless).
2. Join `samples.tpch.lineitem` with `samples.tpch.nation` with and without `F.broadcast(...)`, and compare the plans with `explain()`.
3. Call `toPandas()` on a large DataFrame in a serverless notebook, observe the error, and switch the environment memory to High.
4. Write a DataFrame with `repartition(200)` and with `coalesce(4)` and compare the number of files in `DESCRIBE DETAIL`.
