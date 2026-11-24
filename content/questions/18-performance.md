<!-- Practice questions for the topic 'performance'. Format: see README.md. -->

## site-035
exam: A6 P8
topic: performance
level: A
source: site

In the Spark UI, one task of a stage takes 20 minutes while the median task takes 30 seconds. What is the most likely cause?

- [ ] Too many workers :: Would not make one task slow.
- [x] Data skew :: Correct. One partition holds far more data than the others.
- [ ] Photon is disabled :: Would slow all tasks evenly.
- [ ] The table has too few versions :: Irrelevant.

> Max far above the median = skew. More workers do not help one huge task.

## site-126
exam: A6 P5
topic: performance
level: A
source: site

An aggregation by `device_id` is dominated by one test device. AQE is on, but the stage is still skewed. Why, and what helps?

- [x] AQE splits skewed partitions only in joins, not in aggregations; salt the key and aggregate in two stages :: Correct.
- [ ] AQE needs more workers :: Workers do not change how AQE plans.
- [ ] Lower `spark.sql.shuffle.partitions` :: Makes every partition, including the skewed one, bigger.
- [ ] Broadcast the table :: Broadcasting applies to joins.

> Aggregation skew: salting (or filtering out a known junk key).

## sp-71
exam: P5 A6
topic: performance
level: P
source: sp

A join between two large tables is slow because one key holds most of the records. What helps?

- [x] Keep AQE enabled with skew join handling, or salt the hot key :: Correct. AQE splits skewed partitions into smaller tasks.
- [ ] Increase driver memory :: The driver does not execute the join.
- [ ] Turn the join into a cross join :: Explodes the data volume.
- [ ] Disable the shuffle :: Distributed joins need a shuffle unless one side is broadcast.

> Join skew: AQE skew join, or salting.

## site-037
exam: A6 A3 P5
topic: performance
level: A
source: site

A join between a 2 TB fact table and a 5 MB lookup table shows a huge shuffle. What is the best optimisation?

- [x] Broadcast the small table :: Correct. Each executor receives the small table, so the large one is not shuffled.
- [ ] Repartition the large table into 10,000 partitions :: Adds another shuffle.
- [ ] Use a cross join :: Multiplies rows.
- [ ] Cache the large table :: Avoids rereads, not the join shuffle.

> Large-small joins: broadcast the small side (`F.broadcast` or a `BROADCAST` hint).

## site-080
exam: A6 P5
topic: performance
level: A
source: site

The Spark UI shows a large amount of spill to disk in a stage. What is the likely cause?

- [x] Partitions too large for the executors' memory :: Correct. Use more (smaller) partitions, memory-optimised nodes, or fewer columns.
- [ ] Too few Delta versions :: Unrelated.
- [ ] The table is managed :: Unrelated.
- [ ] Photon is enabled :: Photon does not cause spill.

> Spill = partitions that do not fit in memory.

## sp-70
exam: P5 P8
topic: performance
level: P
source: sp

The query profile shows a sort operator with a long time, a high memory peak and frequent spill to disk. Which action helps?

- [x] Increase the number of shuffle partitions (or use `auto`) so each partition is smaller :: Correct. Smaller partitions fit in memory and spill less.
- [ ] Repartition everything into a single partition :: Concentrates the sort in one task and worsens the spill.
- [ ] Replace the sort with a filter :: Changes the query result.
- [ ] Use a broadcast join :: Optimises joins, not sorts.

> Spill fixes: smaller partitions or more memory.

## site-036
exam: A6 P8
topic: performance
level: A
source: site

A notebook calls `df.collect()` on a 500 GB DataFrame and fails with an out-of-memory error on the driver. What fixes it?

- [ ] Add more workers :: Workers do not add driver memory.
- [x] Do not bring the data to the driver: write it to a table, aggregate it, or use `limit` :: Correct.
- [ ] Increase `spark.sql.shuffle.partitions` :: Affects executors, not the driver's collect.
- [ ] Enable Photon :: Does not change what is collected.

> Driver OOM comes from `collect()`, `toPandas()` and large broadcasts.

## sa-44
exam: A6 A3
topic: performance
level: A
source: sa

A Spark SQL ETL fails with `java.lang.OutOfMemoryError: Java heap space` in the executors. The logic is correct and all the data must be processed. Which TWO actions address the cause?

- [x] Use larger worker nodes and enable auto-optimized shuffle :: Correct. More memory per executor, and partitions sized to the real data volume.
- [x] Set a larger number of shuffle partitions explicitly :: Correct. Less data per partition means less memory per task.
- [ ] Cache the dataset to speed up the query :: Caching uses more memory.
- [ ] Use a larger driver node and disable auto-optimized shuffle :: The error is in executors, and disabling auto shuffle removes a helpful mechanism.
- [ ] Filter out data so less is processed :: Changes the business result.

> Executor OOM: more memory per executor or less data per partition. Driver size and caching are distractors.

## sa-43
exam: A6 P8
topic: performance
level: A
source: sa

A pipeline has consistent bottlenecks. In the Spark UI, task CPU time is high relative to total task time. How do you interpret this and what do you do?

- [x] The work is CPU-bound: tune executors and cores, or resize the cluster :: Correct. Executors spent their time computing, not waiting.
- [ ] The cluster is underused: repartition to spread the work :: That is the reading for low CPU time relative to task time.
- [ ] It is a memory problem: increase executor memory :: Memory pressure shows as spill, GC time or OOM.
- [ ] Everything is efficient; change nothing :: Contradicts the bottleneck in the scenario.

> High CPU time = computing; low CPU time = waiting.

## site-081
exam: A6 P8
topic: performance
level: A
source: site

A query runs on serverless compute and you need to investigate skew. Where do you look?

- [ ] The Spark UI :: Not available for serverless.
- [x] The query profile :: Correct. It shows per-operator metrics and flags skew and spill.
- [ ] Ganglia :: A legacy metrics UI for classic clusters.
- [ ] Only the driver logs :: No per-operator metrics there.

> Serverless and SQL warehouses: query profile instead of Spark UI.

## sp-68
exam: P5 P8
topic: performance
level: P
source: sp

In Databricks SQL, a slow query shows excessive shuffle. What is the most direct way to find the responsible operator?

- [x] Open the query profile and review the top operators :: Correct. It shows real time and metrics per operator, such as costly shuffles and joins.
- [ ] Run `EXPLAIN` and estimate sizes by hand :: Shows the plan, not actual runtime metrics.
- [ ] Compare the query with and without `LIMIT` :: Changes the plan and does not isolate the cause.
- [ ] Look only at overall warehouse utilisation :: Does not show which operator is the problem.

> Query profile = actual metrics per operator.

## new-perf-01
exam: P5
topic: performance
level: P
source: new

The query profile of a query filtering `orders` by `customer_id` shows that 9,800 of the table's 10,000 files were read. What does this indicate and what is the fix?

- [ ] The warehouse is too small; scale it up :: More compute reads the same files faster but does not read fewer.
- [x] Poor data skipping: values of `customer_id` are spread across files; cluster the table on `customer_id` :: Correct. Files read versus pruned is the data skipping signal.
- [ ] The disk cache is disabled :: Caching helps repeated reads, not file pruning.
- [ ] The join strategy is wrong :: The question is about a filter on one table.

> Files read ≈ total files: fix the layout.

## sp-69
exam: P8 A6
topic: performance
level: P
source: sp

Where in the Spark UI do you see the execution plan of a Spark SQL query or DataFrame operation?

- [x] The SQL / DataFrame tab :: Correct. It shows the physical plan with metrics per operator.
- [ ] The Jobs tab :: A high-level view of jobs, without the query plan.
- [ ] The Storage tab :: Cached data.
- [ ] The Environment tab :: Settings and properties.

> Spark UI tabs: Jobs, Stages, SQL/DataFrame (plans), Storage, Environment, Executors.

## sp-74
exam: P5 A3
topic: performance
level: P
source: sp

How do you reduce the number of output files of a DataFrame without a full shuffle?

- [x] `coalesce(n)` :: Correct. It merges existing partitions without a full shuffle.
- [ ] `repartition(n)` :: Performs a full shuffle.
- [ ] `cache()` :: Does not change partitions.
- [ ] `persist(DISK_ONLY)` :: Only changes where data is stored.

> `coalesce` reduces partitions cheaply; `repartition` shuffles.

## sa-47
exam: A6 P5
topic: performance
level: A
source: sa

A dashboard queries the same dataset many times a day with the same filters, and every execution reads everything again from cloud storage. What helps in this specific case?

- [x] Caching (the disk cache on the compute, and the warehouse's query result cache), because the pattern is repeated reads of the same data :: Correct. Data is served from local SSDs or cached results instead of cloud storage.
- [ ] Liquid clustering on any high-cardinality column :: Helps varied filters skip files; the issue here is rereading.
- [ ] More shuffle partitions :: Affects shuffles, not rereads.
- [ ] Convert the table to plain Parquet :: Loses transactions and skipping with no gain.

> Repeated reads of the same data: caching. It does not fix layout or memory problems.

## new-perf-02
exam: P5
topic: performance
level: P
source: new

Why does the disk cache (Delta cache) speed up repeated queries on the same Delta table?

- [ ] It keeps the results of previous queries in the driver :: That would be a result cache, and not in the driver.
- [x] It stores copies of the remote data files on the workers' local SSDs in an efficient format, so later reads avoid cloud storage :: Correct. It also detects changed files automatically.
- [ ] It compacts small files :: That is `OPTIMIZE`.
- [ ] It keeps DataFrames in executor memory :: That is the Spark cache (`df.cache()`).

> Disk cache = local SSD copies of remote files; Spark cache = memory, manual.

## new-perf-03
exam: A3 A6
topic: performance
level: A
source: new

A notebook sets `spark.default.parallelism = 1000` to speed up a DataFrame `groupBy`, but the number of tasks after the shuffle does not change. Why?

- [ ] The setting needs a cluster restart :: The setting is not the one that controls this.
- [x] `spark.default.parallelism` only affects RDD operations; DataFrame shuffles use `spark.sql.shuffle.partitions` (or auto-optimized shuffle) :: Correct.
- [ ] AQE ignores every setting :: AQE coalesces partitions but respects the shuffle settings.
- [ ] Photon disables parallelism :: Unrelated.

> DataFrames: `spark.sql.shuffle.partitions`. RDDs: `spark.default.parallelism`.

## new-perf-04
exam: A3 A6
topic: performance
level: A
source: new

A cluster's driver runs out of memory when collecting results. An engineer runs `spark.conf.set("spark.driver.memory", "64g")` in a notebook, but nothing changes. Why, and what works?

- [ ] The value must be in megabytes :: Units are not the problem.
- [x] Driver memory is fixed when the driver starts; choose a larger driver node type (or avoid collecting the data) :: Correct. Adding workers does not help either.
- [ ] `spark.driver.memory` only applies to serverless :: Serverless does not let you set it at all.
- [ ] It needs `spark.executor.memory` too :: Executors are not the problem.

> Driver memory = driver node size, chosen at start.

## new-perf-05
exam: A3 A6
topic: performance
level: A
source: new

An old notebook sets `spark.sql.shuffle.partitions = 64` for a job that has since grown tenfold, and stages now spill heavily. What is the recommended change on Databricks?

- [ ] Set it to 1 to reduce overhead :: One huge partition makes spill far worse.
- [x] Remove the legacy fixed value (or set it to `auto`) so auto-optimized shuffle sizes partitions to the data, then measure again :: Correct. A fixed value disables the automatic tuning.
- [ ] Turn off AQE :: Removes runtime optimisations.
- [ ] Cache the input :: Uses more memory.

> Prefer auto-optimized shuffle; legacy fixed values silently stop it.

## new-perf-06
exam: A3 A6
topic: performance
level: A
source: new

An engineer changes three Spark settings at once and the job gets faster on a day with less input data. What is wrong with this tuning approach?

- [ ] Nothing; faster is faster :: The cause of the improvement is unknown.
- [x] Change one setting at a time and compare runs on the same input; otherwise you cannot tell which change helped, or whether any did :: Correct.
- [ ] Settings must be changed in alphabetical order :: Not a real rule.
- [ ] Tuning is only allowed on serverless :: Serverless allows few settings.

> Re-measure after each single change, on comparable input.

## new-perf-07
exam: P8 A6
topic: performance
level: P
source: new

A nightly job on classic compute fails intermittently with "executor lost" errors, and the cluster uses spot workers. Where do you confirm whether spot instances were reclaimed?

- [ ] The query profile :: Not available for classic job clusters' Spark jobs, and it shows operators, not nodes.
- [x] The cluster event log (and the Spark UI Executors tab) for node loss and spot termination events :: Correct.
- [ ] `system.billing.list_prices` :: Prices, not node events.
- [ ] The Delta table history :: Table operations, not compute events.

> Node-level problems: cluster event log; task-level problems: Spark UI and driver logs.
