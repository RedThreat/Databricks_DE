---
id: layout
title: Table layout and maintenance
group: Foundations
order: 3
summary: Data skipping, small files, partitioning versus Z-order versus liquid clustering, CLUSTER BY AUTO, OPTIMIZE, deletion vectors and predictive optimization.
---

## Why layout matters

Delta stores **statistics** for each data file: minimum, maximum and null count of the first 32 columns. A query with a filter skips every file whose range cannot contain a match. That **data skipping** only works when similar values sit in the same files. If `event_date` values are spread across all files, every file's min/max range covers the filter and nothing is skipped, however good the statistics are.

File size matters too. Thousands of tiny files mean high overhead to list and open them; a few huge files limit parallelism and skipping. Databricks tunes file sizes automatically; your job is to avoid creating the problem (for example by partitioning on a high-cardinality column) and to compact regularly.

## Partitioning, Z-order and liquid clustering

| | Hive-style partitioning | Z-order | Liquid clustering |
|---|---|---|---|
| Syntax | `PARTITIONED BY (col)` | `OPTIMIZE t ZORDER BY (a, b)` | `CLUSTER BY (a, b)` or `CLUSTER BY AUTO` |
| How it works | One folder per value | Co-locates values inside files when `OPTIMIZE` runs | Clusters data incrementally when `OPTIMIZE` runs |
| Good for | Very large tables, low-cardinality column, each partition at least about 1 GB | Legacy tables | New tables of any size, high-cardinality keys, changing filters, merge keys, concurrent writers |
| Change the columns | Recreate the table | Rerun Z-order on everything | `ALTER TABLE t CLUSTER BY (...)`; no immediate rewrite |
| Skewed data | Uneven partitions | Full rewrite each time | Handled well |
| Combine with others | Not with liquid clustering | Not with liquid clustering | Replaces both; up to 4 keys |

Recommendations:

- Use **liquid clustering** for new tables. Choose the columns most used in filters and join or merge conditions.
- Use **`CLUSTER BY AUTO`** when you do not know the filter columns or they change: Databricks picks and adjusts keys from the query history. It needs a Unity Catalog **managed** table with **predictive optimization**.
- Never partition on a high-cardinality column such as `customer_id` or `order_id`: you get millions of tiny partitions and files.
- Do not partition tables smaller than about 1 TB.
- An unpartitioned table can switch to liquid clustering with `ALTER TABLE ... CLUSTER BY`. A partitioned table must be recreated (for example `CREATE OR REPLACE TABLE ... CLUSTER BY (...) AS SELECT ...`).

```sql
CREATE TABLE sales.events (event_id BIGINT, customer_id BIGINT, event_ts TIMESTAMP, country STRING)
CLUSTER BY (customer_id, event_ts);

ALTER TABLE sales.events CLUSTER BY (country, event_ts);  -- new keys; old data is not rewritten yet
OPTIMIZE sales.events FULL;                              -- recluster all existing data with the new keys
ALTER TABLE sales.events CLUSTER BY AUTO;                -- let Databricks choose
ALTER TABLE sales.events CLUSTER BY NONE;                -- stop clustering
```

Clustering happens when `OPTIMIZE` runs, not on every small write, so recently inserted rows stay unclustered until the next `OPTIMIZE` (manual or by predictive optimization).

**Iceberg tables** follow the same principles: partition only on low-cardinality columns that match the data grain (for example a daily partition transform for data loaded and queried by day), cluster on the columns queries filter on, and compact small files regularly.

## OPTIMIZE and automatic file management

| Command or setting | What it does |
|---|---|
| `OPTIMIZE t` | Compacts small files into larger ones; on clustered tables also clusters the data that is not yet clustered |
| `OPTIMIZE t FULL` | Reclusters all data, for example after changing clustering keys (can take hours on big tables) |
| `OPTIMIZE t WHERE date >= '2026-11-01'` | Limits the work to some partitions (partitioned tables only) |
| `OPTIMIZE t ZORDER BY (a)` | Legacy Z-ordering; not allowed on clustered tables |
| Optimized writes (`delta.autoOptimize.optimizeWrite`) | Writes fewer, larger files by shuffling data before the write |
| Auto compaction (`delta.autoOptimize.autoCompact`) | Compacts small files right after a write |
| `ANALYZE TABLE t COMPUTE STATISTICS FOR ALL COLUMNS` | Column statistics for the query optimizer (join planning), not for file skipping |

`OPTIMIZE` makes reads faster. `VACUUM` deletes old unreferenced files and frees storage; it does not compact anything.

## Deletion vectors

Without deletion vectors, deleting or updating one row rewrites the whole Parquet file that contains it. With **deletion vectors**, `DELETE`, `UPDATE` and `MERGE` write a small file that marks the affected rows as removed, and readers skip those rows (merge-on-read). Writes become much cheaper; reads pay a small cost until the files are rewritten by `OPTIMIZE`, by `REORG TABLE t APPLY (PURGE)` or automatically.

```sql
ALTER TABLE accounts SET TBLPROPERTIES ('delta.enableDeletionVectors' = true);
```

Deletion vectors are on by default for new tables on recent runtimes. They matter for privacy: a deleted row physically stays in the old file until it is purged and the old files are vacuumed.

## Predictive optimization

Predictive optimization runs **`OPTIMIZE`, `VACUUM` and `ANALYZE`** automatically on **Unity Catalog managed tables**, on serverless compute, when it estimates the work pays off. You stop scheduling maintenance jobs.

- It never runs Z-order.
- It does **not** run on external tables. Convert them with `ALTER TABLE t SET MANAGED`, or schedule `OPTIMIZE` and `VACUUM` yourself.
- It is enabled or disabled per account, catalog or schema, and objects inherit the setting:

```sql
ALTER CATALOG sales ENABLE PREDICTIVE OPTIMIZATION;
ALTER SCHEMA sales.staging DISABLE PREDICTIVE OPTIMIZATION;
ALTER SCHEMA sales.gold INHERIT PREDICTIVE OPTIMIZATION;
```

- Its `VACUUM` respects `delta.deletedFileRetentionDuration`.
- What it did is recorded in `system.storage.predictive_optimization_operations_history`.
- It is required for `CLUSTER BY AUTO`.

**Why managed tables cost less to run**: predictive optimization, automatic clustering, automatic file sizing, metadata caching and `UNDROP` all come with Unity Catalog managed tables. Combined with liquid clustering, there is almost no table maintenance left to schedule.

## Choosing a layout

| Situation | Choose |
|---|---|
| New table, known filter columns | `CLUSTER BY (those columns)` |
| Filters unknown or changing every quarter | `CLUSTER BY AUTO` |
| Daily `MERGE` on a key with many scattered updates | Cluster by the merge key and enable deletion vectors |
| Frequent single-row `UPDATE`s rewrite whole files | Deletion vectors |
| Thousands of small appends make reads slow | Optimized writes and auto compaction, plus `OPTIMIZE` or predictive optimization |
| Changed clustering keys, old data still badly laid out | `OPTIMIZE t FULL` |
| Predictive optimization enabled but one table never maintained | It is external: convert it or schedule maintenance |

## Exam traps

!!! trap "Changing keys does not rewrite data"
    `ALTER TABLE ... CLUSTER BY` only affects how future `OPTIMIZE` runs cluster data. Run `OPTIMIZE t FULL` to recluster what already exists.

!!! trap "Predictive optimization and external tables"
    Predictive optimization works only on Unity Catalog managed tables, and never runs Z-order.

!!! trap "Liquid clustering does not mix"
    A clustered table cannot also be partitioned or Z-ordered.

!!! tip "High cardinality means clustering"
    A filter on a column with millions of distinct values is a clustering key, never a partition column.

## Hands-on

```sql
USE workspace.delta_lab;
CREATE OR REPLACE TABLE events CLUSTER BY (country) AS
SELECT id AS event_id, id % 1000 AS customer_id,
       element_at(array('PT','ES','FR','DE'), CAST(id % 4 + 1 AS INT)) AS country,
       timestampadd(MINUTE, CAST(id AS INT), TIMESTAMP '2026-01-01') AS event_ts
FROM range(1000000);
DESCRIBE DETAIL events;                 -- numFiles, clusteringColumns
OPTIMIZE events;
ALTER TABLE events CLUSTER BY (customer_id);
OPTIMIZE events FULL;
DESCRIBE HISTORY events;                -- see the OPTIMIZE operations and their metrics
SELECT * FROM system.storage.predictive_optimization_operations_history LIMIT 20;
```

Run a query that filters on `customer_id` before and after `OPTIMIZE FULL` and compare *files read* in the query profile.
