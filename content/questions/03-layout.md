<!-- Practice questions for the topic 'layout'. Format: see README.md. -->

## sp-01
exam: P5 A6
topic: layout
level: P
source: sp

A 2 TB managed table receives a daily `MERGE` on `order_id` and many scattered single-row updates. Which TWO actions most reduce the cost of the merge?

- [x] Liquid clustering with `CLUSTER BY (order_id)` :: Correct. Rows with nearby keys are stored together, so the merge finds and rewrites fewer files.
- [x] Enable deletion vectors on the table :: Correct. Updated and deleted rows are marked in small side files instead of rewriting whole Parquet files.
- [ ] Run `VACUUM RETAIN 0 HOURS` before each merge :: Does not speed up the merge, breaks concurrent readers and destroys time travel.
- [ ] Partition the table by `order_id` :: A very high-cardinality key creates millions of tiny partitions and files.
- [ ] Replace the merge with `DROP TABLE` and `CREATE TABLE` each day :: Rewrites everything and loses history: the opposite of an efficient incremental load.

> Merge-heavy tables: cluster on the merge key and use deletion vectors.

## sp-02
exam: P5 P9
topic: layout
level: P
source: sp

A query with `WHERE event_ts = '2025-03-10'` on a Delta table of 40,000 files reads almost all of them, although min/max statistics are collected. What is the most likely cause?

- [x] `event_ts` values are spread across all files, so each file's min/max range covers the filtered date :: Correct. Data skipping only works when files hold narrow ranges; without clustering almost no file can be skipped.
- [ ] The filter is applied only after the whole table is read :: Spark pushes predicates down into the scan; the problem is the file layout.
- [ ] Timestamp columns do not support data skipping :: Date and timestamp columns are supported.
- [ ] Delta does not collect statistics on large tables :: Statistics are collected on the first columns regardless of table size.

> Statistics only help when the layout keeps values together. That is what clustering is for.

## sa-46
exam: A6 P5
topic: layout
level: A
source: sa

A Delta table has accumulated tens of thousands of very small files from frequent micro-batch writes, and reads have become slow. Which operation tackles this problem directly?

- [x] `OPTIMIZE`, to compact the small files into larger ones :: Correct. It rewrites the data into well-sized files, removing the overhead of opening thousands of files on every read.
- [ ] `VACUUM`, to remove old files :: It deletes files that no retained version uses; it does not compact the active small files.
- [ ] `REFRESH TABLE`, to update the metadata :: Refreshes a metadata cache; it does not change the physical files.
- [ ] More workers on the cluster that reads :: More parallelism does not remove the per-file overhead; it treats the symptom at a higher cost.

> `OPTIMIZE` compacts; `VACUUM` cleans up old versions' files. They often appear together as distractors.

## sp-72
exam: P5
topic: layout
level: P
source: sp

A table receives thousands of small writes and reads become slow. Which combination reduces the problem?

- [x] Enable optimized writes and auto compaction, and run `OPTIMIZE` (or let predictive optimization run it) :: Correct. Writes produce larger files, and the remaining small files are compacted.
- [ ] Partition the table by timestamp :: Creates even more partitions and small files.
- [ ] Disable statistics collection :: Hurts data skipping and solves nothing.
- [ ] Run `VACUUM` with `RETAIN 0 HOURS` :: Removes obsolete files but does not compact small ones, and it is dangerous.

> Prevent small files at write time (optimized writes), compact after writes (auto compaction), and maintain (OPTIMIZE or predictive optimization).

## site-127
exam: A6 P5
topic: layout
level: A
source: site

Yesterday an engineer ran `ALTER TABLE t CLUSTER BY (region, order_date)`, but queries filtering on `region` still scan most files. What should they run?

- [ ] `VACUUM t` :: Deletes old files; it does not reorganise data.
- [x] `OPTIMIZE t FULL` :: Correct. Changing keys does not rewrite existing data; `OPTIMIZE FULL` reclusters all of it (it can take hours on a large table).
- [ ] `ANALYZE TABLE t` :: Collects statistics for the optimizer; it does not move data.
- [ ] Recreate the table :: Unnecessary; liquid clustering keys can change in place.

> New clustering keys apply to future clustering. `OPTIMIZE FULL` reclusters existing data.

## site-128
exam: A6 P5
topic: layout
level: A
source: site

Predictive optimization is enabled on the catalog, but one table never gets `OPTIMIZE` or `VACUUM`. What is the likely reason?

- [ ] The table uses liquid clustering :: Clustered managed tables are exactly what predictive optimization maintains.
- [x] It is an external table; predictive optimization only runs on Unity Catalog managed tables :: Correct. Convert it with `SET MANAGED` or schedule the maintenance yourself.
- [ ] Predictive optimization only runs on Mondays :: It runs when it estimates the work is worthwhile, not on a fixed day.
- [ ] The table has fewer than 1,000 files :: There is no such file-count rule.

> Predictive optimization = managed tables only. External tables need your own maintenance jobs.

## sp-07
exam: A6 P5
topic: layout
level: A
source: sp

Which TWO maintenance operations does predictive optimization run automatically on Unity Catalog managed tables?

- [x] `OPTIMIZE` :: Correct. It compacts files and clusters data when worthwhile.
- [x] `VACUUM` :: Correct. It removes unreferenced files after the retention period.
- [ ] `PARTITION BY` :: A table definition clause, not maintenance.
- [ ] Bucketing :: A Hive/Spark layout technique, not part of the service.
- [ ] `DROP COLUMN` :: A schema change the service never makes.

> Predictive optimization runs `OPTIMIZE`, `VACUUM` and `ANALYZE`, never Z-order.

## sp-03
exam: P5 P9
topic: layout
level: P
source: sp

A 1 TB table is heavily skewed on `customer_id`, and the most filtered columns change every quarter. The team wants to change the layout strategy without rewriting the whole history each time. What should they use?

- [x] Liquid clustering, changing keys with `ALTER TABLE ... CLUSTER BY` :: Correct. Keys can change without rewriting existing data, clustering is incremental, and skew is handled better than with partitions.
- [ ] Hive-style partitioning on the most filtered column :: Changing the partition column means recreating the table, and skew creates very uneven partitions.
- [ ] Partitioning plus `ZORDER BY` on both columns :: A legacy combination: changing columns means reorganising everything, and Z-order is not incremental.
- [ ] `ZORDER BY` after every load :: Each key change reorders the whole table, which is expensive at 1 TB.

> Changing access patterns plus skew: liquid clustering (or `CLUSTER BY AUTO`).

## sp-04
exam: P5
topic: layout
level: P
source: sp

What happens to rows inserted into a liquid-clustered table after the last `OPTIMIZE`?

- [x] Small writes stay unclustered until the next `OPTIMIZE`, run manually or by predictive optimization :: Correct. Clustering is applied incrementally by `OPTIMIZE`, not during each small write.
- [ ] They are clustered immediately during the `INSERT` :: Ordinary small writes do not reorganise data.
- [ ] They are rejected if they do not follow the clustering keys :: Clustering is a physical layout, not an integrity constraint.
- [ ] They go to a staging area until a maintenance window :: There is no staging area; rows are written to the table.

> Liquid clustering is incremental: run `OPTIMIZE` often, or let predictive optimization do it.

## sp-08
exam: P5
topic: layout
level: P
source: sp

A service corrects individual account balances with `UPDATE` several times a day, and each correction rewrites whole Parquet files. Which feature reduces this rewriting?

- [x] Deletion vectors :: Correct. Changed rows are marked in a small side file, so the Parquet file is not rewritten immediately.
- [ ] Change Data Feed :: Records changes for downstream consumers; it does not change how `UPDATE` executes.
- [ ] Partitioning by `account_id` :: High cardinality creates tiny files, and updates still rewrite files inside the partition.
- [ ] Optimized writes :: Improves the size of written files, but the files hit by the update are still rewritten.

> Frequent row-level updates or deletes: deletion vectors.

## new-layout-01
exam: A6 P5
topic: layout
level: A
source: new

A data engineer wants Databricks to choose and adapt the clustering keys of a table automatically, based on how it is queried. What is required?

- [ ] An external table with a `LOCATION` clause :: Automatic clustering is not available for external tables.
- [x] A Unity Catalog managed table with predictive optimization enabled, created or altered with `CLUSTER BY AUTO` :: Correct. Key selection is done by predictive optimization from the query history.
- [ ] A table partitioned by date with `ZORDER BY AUTO` :: There is no `ZORDER BY AUTO`, and liquid clustering cannot be combined with partitioning.
- [ ] A scheduled job that runs `ANALYZE TABLE` every hour :: `ANALYZE` collects optimizer statistics; it does not choose clustering keys.

> `CLUSTER BY AUTO` = managed table + predictive optimization.

## new-layout-03
exam: P5 P9
topic: layout
level: P
source: new

A large table is partitioned by `ingest_date` and Z-ordered by `store_id`. The team wants to move it to liquid clustering on `(store_id, ingest_date)`. What do they need to do?

- [ ] `ALTER TABLE t CLUSTER BY (store_id, ingest_date)` on the existing table :: Liquid clustering cannot be enabled on a partitioned table in place.
- [x] Recreate the table with `CLUSTER BY (store_id, ingest_date)`, for example with `CREATE OR REPLACE TABLE ... CLUSTER BY (...) AS SELECT ...` :: Correct. A partitioned table has to be rewritten without partitioning to use liquid clustering.
- [ ] Run `OPTIMIZE t ZORDER BY (store_id, ingest_date)` :: That keeps the old approach.
- [ ] Enable predictive optimization; it converts the table automatically :: Predictive optimization maintains tables; it does not change their layout definition.

> Unpartitioned tables can switch to liquid clustering with `ALTER TABLE`; partitioned ones must be recreated.

## new-layout-04
exam: P9 P5
topic: layout
level: P
source: new

A team designs a 200 TB event table loaded every hour. Queries filter on `event_date` and often on `customer_id`. Which design follows good layout principles?

- [ ] Partition by `customer_id` and by hour, so every query reads one folder :: Very high cardinality and small hourly slices produce millions of tiny files.
- [x] Cluster on the filter columns (for example `event_date, customer_id`), avoid high-cardinality partitions, and keep file sizes healthy with regular `OPTIMIZE` or predictive optimization :: Correct. Clustering follows the access pattern and compaction keeps files well sized.
- [ ] No clustering, but run `VACUUM` every hour :: `VACUUM` does not organise data or compact files.
- [ ] Write one file per load and never compact, to keep writes fast :: Hourly small files degrade reads over time.

> Partition only on low-cardinality columns that match the data grain; cluster on filter columns; compact regularly.

## sa-45
exam: A6 P5 P9
topic: layout
level: A
source: sa

A transactions table is partitioned by `transaction_date`, which suits period reports. But the most frequent queries filter on `customer_id`, which has millions of distinct values, and scan entire partitions. What is the best approach?

- [x] Recreate the table with liquid clustering on `(customer_id, transaction_date)` instead of partitioning :: Correct. Liquid clustering handles high-cardinality keys and still serves date filters; it cannot be combined with partitioning, so the table is rewritten once.
- [ ] Repartition the table by `customer_id` :: Millions of tiny partitions and files.
- [ ] Enable the disk cache and keep everything as it is :: Speeds up repeated reads but leaves each customer's rows spread over many files.
- [ ] Remove the partitioning and replace it with nothing :: Loses date pruning without helping customer filters.

> High-cardinality filters go to liquid clustering, never to partitioning; clustering replaces partitioning.

## new-layout-05
exam: P9 P5
topic: layout
level: P
source: new

An Iceberg table receives about 50 GB per day, is loaded once a day, and almost every query filters on the event day. Which layout follows the design principles for partitioning and file sizes?

- [ ] Partition by the full event timestamp :: Millions of partitions with tiny files.
- [ ] Partition by `customer_id` :: High cardinality and unrelated to the main filter.
- [x] Partition by day (a day transform of the event timestamp), which matches both the load and the query grain, and compact small files regularly :: Correct. Each partition is large and maps to how data arrives and is read.
- [ ] No partitioning and no compaction :: Every query scans everything and files stay small.

> Partition only on low-cardinality values that match the data grain; keep files large with compaction.
