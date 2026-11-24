---
id: delta
title: Delta Lake fundamentals
group: Foundations
order: 2
summary: The transaction log, ACID guarantees, writing with INSERT, overwrite and MERGE, schema enforcement and evolution, history, time travel, RESTORE, VACUUM and retention.
---

## How Delta Lake works

A Delta table is a folder of **Parquet data files** plus a **transaction log** in `_delta_log/`. Every write adds a numbered commit file (`00000000000000000012.json`) that lists the data files added and removed; every few commits a Parquet checkpoint summarises the log. A reader replays the log to find the files of the latest version, so it never sees half-written data.

What the log gives you:

- **ACID transactions**: a commit is all or nothing; readers see only committed versions (snapshot isolation).
- **Optimistic concurrency**: writers do not lock the table. At commit time Delta checks whether a concurrent commit touched the same data; if so, one writer fails with a concurrent modification error and must retry. Deletion vectors and row-level concurrency make such conflicts rarer.
- **Schema enforcement**, **history**, **time travel** and table-level properties.

In Unity Catalog, `CREATE TABLE` without a format creates a **managed Delta table**. Unity Catalog can also manage **Apache Iceberg** tables, and **UniForm** lets Iceberg clients read a Delta table; the commands on this page apply to Delta.

## Writing data

| Goal | SQL | PySpark |
|---|---|---|
| Add rows | `INSERT INTO t SELECT ...` | `df.write.mode("append").saveAsTable("t")` |
| Replace all rows, same schema | `INSERT OVERWRITE t SELECT ...` | `.mode("overwrite")` |
| Replace only some rows | `INSERT INTO t REPLACE WHERE region = 'EU' SELECT ...` | `.option("replaceWhere", "region = 'EU'")` |
| Replace data **and** schema, keep history and grants | `CREATE OR REPLACE TABLE t AS SELECT ...` | `.mode("overwrite").option("overwriteSchema", "true")` |
| Create a new table from a query | `CREATE TABLE t AS SELECT ...` (fails if `t` exists) | `.saveAsTable("t")` (default mode fails if `t` exists) |
| Upsert or apply changes | `MERGE INTO` | `DeltaTable.forName(...).merge(...)` |
| Change or remove rows | `UPDATE`, `DELETE`, `TRUNCATE` | `DeltaTable.update/delete` |

`CREATE OR REPLACE TABLE` is not the same as `DROP` plus `CREATE`: it keeps the table's history, grants, row filters and column masks. Dropping and recreating loses all of them.

### MERGE

```sql
MERGE INTO silver.customers AS t
USING updates AS s
  ON t.customer_id = s.customer_id
WHEN MATCHED AND s.op = 'DELETE' THEN DELETE
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
WHEN NOT MATCHED BY SOURCE AND t.active THEN UPDATE SET active = false;
```

- `WHEN MATCHED` can `UPDATE` or `DELETE`; several clauses are evaluated in order and conditions make them selective.
- `WHEN NOT MATCHED` (by target) can only `INSERT`: the row exists in the source and not in the target.
- `WHEN NOT MATCHED BY SOURCE` acts on target rows that are missing from the source (`DELETE` or `UPDATE`), for example to remove rows that disappeared from a full extract.
- The source must have **at most one row per key**. Otherwise the merge fails with `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE`; keep the latest row per key first (see the transformations topic).
- An **insert-only merge** (`WHEN NOT MATCHED THEN INSERT` only) is the standard way to add records without creating duplicates, whatever the time gap between duplicates.
- `MERGE WITH SCHEMA EVOLUTION INTO ...` lets the merge add new source columns to the target.

## Schema enforcement and evolution

**Enforcement.** A write whose data does not match the table schema is rejected: a column with an incompatible type, or a column the table does not have. Columns missing from the data are written as NULL. This is deliberate: a source change must not corrupt a table silently.

**Evolution**, when the change is wanted:

| Need | How |
|---|---|
| Accept new columns on append or overwrite | `.option("mergeSchema", "true")` |
| Accept new columns in a merge | `MERGE WITH SCHEMA EVOLUTION` |
| Replace the whole schema (types change, columns removed) | Overwrite with `overwriteSchema`, or `CREATE OR REPLACE TABLE` |
| Add a column explicitly | `ALTER TABLE t ADD COLUMNS (channel STRING)` |
| Widen a type (for example INT to BIGINT) | Type widening table feature, or a rewrite |
| Rename or drop a column | Column mapping: `ALTER TABLE t SET TBLPROPERTIES ('delta.columnMapping.mode' = 'name')`, then `RENAME COLUMN` / `DROP COLUMN` |

The session setting `spark.databricks.delta.schema.autoMerge.enabled` is the legacy way to turn on evolution for every write in a session; prefer the per-write options.

Renaming or dropping a column with column mapping changes only metadata. A dropped column's data stays in the files until `REORG TABLE t APPLY (PURGE)` rewrites them and `VACUUM` removes the old files. Both operations can break streams that read the table.

**Constraints** apply to every writer, not just one pipeline:

```sql
ALTER TABLE silver.orders ALTER COLUMN order_id SET NOT NULL;
ALTER TABLE silver.orders ADD CONSTRAINT positive_amount CHECK (amount > 0);
```

Primary and foreign keys in Unity Catalog are **informational** (not enforced). Identity columns (`id BIGINT GENERATED ALWAYS AS IDENTITY`) generate unique surrogate keys.

## History, time travel and RESTORE

```sql
DESCRIBE HISTORY sales.orders;                       -- version, timestamp, operation, user, metrics
SELECT * FROM sales.orders VERSION AS OF 42;
SELECT * FROM sales.orders TIMESTAMP AS OF '2026-11-20T08:00:00';
RESTORE TABLE sales.orders TO VERSION AS OF 42;
```

- Time travel reads an old snapshot. `table_changes()` is different: it returns row-level changes and needs Change Data Feed.
- `RESTORE` writes a **new commit** that brings back the old state; the bad version stays in the history. It needs `MODIFY`.
- Two retention settings decide how far back you can go:

| Property | Default | Controls |
|---|---|---|
| `delta.logRetentionDuration` | 30 days | How long commits stay in the log (history) |
| `delta.deletedFileRetentionDuration` | 7 days | How old a removed data file must be before `VACUUM` may delete it |

Time travel needs both the log entry and the data files. After a `VACUUM`, versions older than the file retention can no longer be read or restored.

## VACUUM and other utilities

`VACUUM t` deletes data files that the current version no longer references and that are older than the retention threshold. It does not compact anything and never makes queries faster by itself; it saves storage and is how deleted data is physically removed.

- `VACUUM t RETAIN 720 HOURS` applies to that run only. To change retention for every future run, set `delta.deletedFileRetentionDuration` on the table.
- Retaining less than 7 days requires turning off a safety check and can break running readers and writers. Never use `RETAIN 0 HOURS` in production.
- `VACUUM t DRY RUN` lists what would be deleted.
- Predictive optimization runs `VACUUM` automatically on managed tables.

| Command | Shows or does |
|---|---|
| `DESCRIBE DETAIL t` | Location, number and size of files, clustering columns, properties |
| `DESCRIBE TABLE EXTENDED t` | Columns plus table type (managed or external), owner, provider |
| `SHOW TBLPROPERTIES t` | Table properties |
| `CREATE TABLE dev.t SHALLOW CLONE prod.t` | New table that references the source files; cheap copy for tests |
| `CREATE TABLE bkp.t DEEP CLONE prod.t` | Full, incremental copy of data and metadata for backup or migration |
| ``CONVERT TO DELTA parquet.`/path/to/folder` `` | Turns a Parquet folder into a Delta table in place |

Useful table properties: `delta.appendOnly = true` (blocks `UPDATE`, `DELETE` and row-changing merges; good for audit tables), `delta.enableChangeDataFeed`, `delta.enableDeletionVectors`, `delta.enableRowTracking`, `delta.columnMapping.mode`.

## Reading a Delta table as a stream

A Delta table can be a streaming source. The stream expects **appends**: a commit that updates or deletes existing rows stops the stream with an error. Options:

- `skipChangeCommits = true`: ignore commits that change or delete rows and process appends only (you lose those changes on purpose).
- `ignoreDeletes` and `ignoreChanges` are older options; `ignoreChanges` re-emits rewritten rows, which creates duplicates downstream.
- To propagate updates and deletes, read the **Change Data Feed** instead (see the CDC topic).

## Exam traps

!!! trap "Overwrite keeps the schema"
    `INSERT OVERWRITE` and `mode("overwrite")` replace the rows but keep the schema, so a new or changed column makes them fail. To change the schema too, use `CREATE OR REPLACE TABLE` or `overwriteSchema`.

!!! trap "VACUUM is not OPTIMIZE"
    `OPTIMIZE` compacts small files and improves reads. `VACUUM` deletes unreferenced old files and limits time travel.

!!! trap "mergeSchema vs overwriteSchema"
    `mergeSchema` adds columns (append or overwrite). `overwriteSchema` replaces the schema and works only with overwrite.

!!! tip "One row per key before a MERGE"
    If the source can contain several versions of a key, deduplicate it first, keeping the latest by timestamp.

## Hands-on

```sql
CREATE SCHEMA IF NOT EXISTS workspace.delta_lab;
USE workspace.delta_lab;
CREATE OR REPLACE TABLE customers (id INT, name STRING, city STRING);
INSERT INTO customers VALUES (1, 'Ana', 'Lisbon'), (2, 'Rui', 'Porto');
CREATE OR REPLACE TEMP VIEW updates AS
  SELECT * FROM VALUES (2, 'Rui', 'Braga'), (3, 'Eva', 'Faro') AS u(id, name, city);
MERGE INTO customers t USING updates s ON t.id = s.id
  WHEN MATCHED THEN UPDATE SET * WHEN NOT MATCHED THEN INSERT *;
DELETE FROM customers WHERE id = 1;
DESCRIBE HISTORY customers;
SELECT * FROM customers VERSION AS OF 1;
RESTORE TABLE customers TO VERSION AS OF 1;
DESCRIBE HISTORY customers;            -- RESTORE is a new version
```

```python
df = spark.createDataFrame([(4, "Teo", "Lisbon", "web")],
                           "id INT, name STRING, city STRING, channel STRING")
df.write.mode("append").saveAsTable("customers")                               # fails: schema enforcement
df.write.mode("append").option("mergeSchema", "true").saveAsTable("customers") # adds the column
```

Compare `DESCRIBE DETAIL customers` and `DESCRIBE HISTORY customers` before and after.
