<!-- Practice questions for the topic 'delta'. Format: see README.md. -->

## site-048
exam: A1
topic: delta
level: A
source: site

What gives Delta Lake its ACID guarantees on top of object storage?

- [ ] The Hive metastore :: A metastore stores table metadata; it does not make writes atomic.
- [x] The `_delta_log` transaction log :: Correct. Each commit is an atomic entry in the log, and readers only see committed versions.
- [ ] Photon :: Photon is a query engine; it makes queries faster, not transactional.
- [ ] Parquet statistics only :: Statistics help data skipping; they give no transactional guarantees.

> Delta = Parquet files + `_delta_log`. The log provides atomic commits, isolation, history and schema enforcement.

## sa-01
exam: A1
topic: delta
level: A
source: sa

An insurer stores policies as Parquet files in an ADLS container. Two nightly routines write to the same folder, and in the morning some reports occasionally read records from a write that was still in progress. Which change fixes the problem at its root?

- [x] Convert the folder into a Delta table :: Correct. The transaction log makes each write atomic: readers only see data from completed commits, and failed writes leave nothing visible.
- [ ] Add more workers to the cluster that writes :: The write finishes sooner, but a reader can still catch it halfway. The problem is atomicity, not speed.
- [ ] Schedule the two routines two hours apart :: Lowers the odds but guarantees nothing; any delay brings the problem back.
- [ ] Enable Unity Catalog on the container :: Unity Catalog governs who can access what; it does not make writes transactional.

> Partial reads and clashing concurrent writes are the signature of missing ACID transactions. On Databricks the answer is Delta Lake.

## sa-02
exam: A1 A3
topic: delta
level: A
source: sa

Twenty minutes ago a `DELETE` with a wrong filter removed about three million rows from a production Delta table. A backup exists, but restoring it takes hours. What is the fastest way to get the previous state back?

- [x] `RESTORE TABLE ... TO VERSION AS OF` the version before the delete :: Correct. The log still references the previous version, so `RESTORE` brings it back quickly, as long as `VACUUM` has not removed its files.
- [ ] Run `VACUUM`, then reprocess the source :: `VACUUM` deletes exactly the old files that time travel needs; it would make things worse.
- [ ] Run `OPTIMIZE` to rebuild the table's files :: `OPTIMIZE` compacts files; it does not bring back deleted rows.
- [ ] Run `REFRESH TABLE` to invalidate the metadata cache :: The rows really were removed from the current version; refreshing a cache does not restore them.

> Time travel and `RESTORE` work within the retention window. After an aggressive `VACUUM` they no longer can.

## sa-03
exam: A1 A2
topic: delta
level: A
source: sa

A pipeline appends to a Delta table whose column `monthly_premium` is declared as `DECIMAL(10,2)`. After a change in the source system, the field arrives as text and the append starts failing. What explains the failure?

- [x] Schema enforcement: Delta rejects writes whose schema does not match the table :: Correct. Instead of silently corrupting the column, Delta refuses the write until someone decides how to handle the change.
- [ ] The table ran out of storage space :: Lack of space gives an I/O error, not a type mismatch.
- [ ] Append mode does not support numeric columns :: Append works with any column type.
- [ ] `OPTIMIZE` was not run after the last write :: `OPTIMIZE` is optional maintenance, never a prerequisite for writing.

> Schema enforcement fails on purpose. Intended changes are accepted explicitly (cast the data, or evolve the schema).

## sp-80
exam: A1 P1
topic: delta
level: A
source: sp

A write to a Delta table contains a column that does not exist in the table schema, and `mergeSchema` is not enabled. What happens?

- [x] The write fails because of schema enforcement :: Correct. Delta rejects data that does not match the table schema.
- [ ] The column is added automatically :: Only with `mergeSchema` or automatic schema merging turned on.
- [ ] The new column is silently ignored :: Delta never drops columns silently.
- [ ] The table is recreated with the new schema :: Only an overwrite with `overwriteSchema` would replace the schema.

> Extra column without `mergeSchema`: the write fails. Missing columns, on the other hand, are written as NULL.

## sp-11
exam: A2 P2
topic: delta
level: A
source: sp

An append-only pipeline occasionally receives new columns from the source and must not fail. Which write option evolves the table schema automatically?

- [x] `option("mergeSchema", "true")` :: Correct. New columns are added to the table schema on appends, in batch and in streaming writes.
- [ ] `option("overwriteSchema", "true")` :: Replaces the whole schema and only works with overwrite, not append.
- [ ] `option("ignoreChanges", "true")` :: A streaming read option for sources with updates, unrelated to schemas.
- [ ] `spark.sql.ansi.enabled = false` :: Controls SQL error semantics, not table schemas.

> `mergeSchema` adds columns; `overwriteSchema` replaces the schema and needs overwrite.

## site-021
exam: A3
topic: delta
level: A
source: site

You need to apply inserts and updates from a daily batch of changes to an existing Delta table, matching on `id`. Which command?

- [ ] `INSERT INTO` :: Appends everything, so changed rows become duplicates.
- [ ] `INSERT OVERWRITE` :: Replaces the whole table with the batch and loses every row not in it.
- [x] `MERGE INTO ... WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT` :: Correct. This is the upsert pattern (SCD type 1).
- [ ] `COPY INTO` :: Loads new files; it cannot update existing rows.

> Upsert = `MERGE`. The source must contain at most one row per key.

## site-105
exam: A3 P3
topic: delta
level: A
source: site

A daily `MERGE` into silver fails with `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE`. What is the cause and fix?

- [ ] The target has duplicates; run `OPTIMIZE` :: The error is about the source, and `OPTIMIZE` never removes duplicates.
- [x] The source batch has several rows for the same key; keep only the latest row per key before merging :: Correct. Use `row_number()` over the key ordered by timestamp descending and keep row 1.
- [ ] The merge condition is missing; add `ON` :: Without `ON` the statement would not parse.
- [ ] Schema evolution is disabled; add `mergeSchema` :: The error is about duplicate matches, not columns.

> Deduplicate the merge source by key, keeping the latest version.

## site-063
exam: A3
topic: delta
level: A
source: site

You need to replace a table's data AND change its schema, while keeping the table history and grants. Which command?

- [ ] `DROP TABLE` then `CREATE TABLE` :: Loses history, grants, row filters and masks.
- [ ] `INSERT OVERWRITE` :: Keeps the existing schema, so it fails when the schema changes.
- [x] `CREATE OR REPLACE TABLE ... AS SELECT` :: Correct. It replaces data and schema in a new version and keeps history and grants.
- [ ] `DELETE FROM` then `INSERT` :: Keeps the old schema and takes two commits.

> `CREATE OR REPLACE` replaces data and schema while keeping the table's identity, history and grants.

## site-107
exam: A3
topic: delta
level: A
source: site

`ALTER TABLE t RENAME COLUMN cust_name TO customer_name` fails on a Delta table. What is required?

- [ ] Run `OPTIMIZE` first :: File layout has nothing to do with renaming.
- [x] Enable column mapping: `ALTER TABLE t SET TBLPROPERTIES ('delta.columnMapping.mode' = 'name')` :: Correct. Column mapping lets Delta rename and drop columns by changing metadata only.
- [ ] Convert the table to external :: The table type does not matter.
- [ ] Use `withColumnRenamed` and overwrite the table :: That rewrites all the data; column mapping avoids it.

> Rename and drop column need column mapping. They are metadata-only changes and can interrupt streams that read the table.

## site-083
exam: A6 A1
topic: delta
level: A
source: site

After a `VACUUM` with the default retention, a query using `VERSION AS OF 3` (a version from 30 days ago) fails. Why?

- [ ] `OPTIMIZE` disabled time travel :: `OPTIMIZE` creates a new version; old versions stay readable until vacuumed.
- [x] `VACUUM` deleted the data files that the old version needs :: Correct. With the default 7-day file retention, files removed more than 7 days ago are deleted.
- [ ] `VERSION AS OF` only works on managed tables :: Time travel works on managed and external Delta tables.
- [ ] `DESCRIBE HISTORY` must be run first :: History is informational; it is not a prerequisite.

> `VACUUM` limits time travel to the file retention period (7 days by default).

## sp-09
exam: A1 P5
topic: delta
level: A
source: sp

An analyst needs to see the `sales` table as it was at version 42, before a faulty load. What should they use?

- [x] `SELECT * FROM sales VERSION AS OF 42` :: Correct. Time travel reads that version's snapshot while its files still exist.
- [ ] `SELECT * FROM table_changes('sales', 42)` :: Returns row-level changes (needs Change Data Feed), not the full snapshot.
- [ ] `DESCRIBE DETAIL sales` :: Shows current metadata, not old data.
- [ ] `VACUUM sales RETAIN 42 HOURS` :: Deletes files and could destroy exactly the history needed.

> Snapshot of a past version: time travel. Changes between versions: Change Data Feed.

## sp-05
exam: P6 P5
topic: delta
level: P
source: sp

A policy requires removed files of a table to be kept for 30 days by every future `VACUUM`. Which command meets it permanently?

- [x] `ALTER TABLE t SET TBLPROPERTIES ('delta.deletedFileRetentionDuration' = 'interval 30 days')` :: Correct. The property is stored in the table and applies to every later `VACUUM`.
- [ ] `VACUUM t RETAIN 720 HOURS` :: Applies to that run only; the next `VACUUM` without `RETAIN` uses the table setting again.
- [ ] `spark.conf.set("spark.databricks.delta.deletedFileRetentionDuration", "30 days")` :: A session setting: it is lost on restart and is not tied to the table.
- [ ] `DESCRIBE HISTORY t LIMIT 30` :: Lists versions; it sets nothing.

> Retention that must hold for everyone is a table property, not an option on one command.

## sp-06
exam: P6 A1
topic: delta
level: P
source: sp

Which table property prevents rows of an audit table from being changed or deleted after they are written?

- [x] `delta.appendOnly = true` :: Correct. `UPDATE`, `DELETE` and merges that change rows are rejected.
- [ ] Time travel :: Lets you read old versions; it does not prevent changes.
- [ ] `OPTIMIZE` :: Compacts files; it does not restrict writes.
- [ ] `VACUUM` :: Cleans up old files; it protects nothing.

> `delta.appendOnly` makes a table insert-only.

## sp-66
exam: A3 P3
topic: delta
level: P
source: sp

In a `MERGE INTO`, how do you delete target rows that no longer exist in the source?

- [x] `WHEN NOT MATCHED BY SOURCE THEN DELETE` :: Correct. This clause acts on target rows with no matching source row.
- [ ] `WHEN NOT MATCHED THEN DELETE` :: `WHEN NOT MATCHED` covers source rows missing from the target, and it only allows `INSERT`.
- [ ] `WHEN MATCHED THEN INSERT` :: Matched rows can be updated or deleted, not inserted.
- [ ] `WHEN MATCHED AND false THEN UPDATE` :: A condition that is never true does nothing.

> `NOT MATCHED` = in source, not in target (insert). `NOT MATCHED BY SOURCE` = in target, not in source (delete or update).

## new-delta-01
exam: A1 A3
topic: delta
level: A
source: new

A table is at version 15. An engineer runs `RESTORE TABLE orders TO VERSION AS OF 12`. What does `DESCRIBE HISTORY orders` show afterwards?

- [ ] Versions 13 to 15 are gone and the latest version is 12 :: `RESTORE` never deletes history.
- [x] A new version 16 with operation `RESTORE`; versions 13 to 15 are still listed :: Correct. Restore writes a new commit that brings back the state of version 12.
- [ ] Nothing changes in the history; only the data files change :: Every change to a Delta table is a commit in the log.
- [ ] Version 12 is renamed to version 16 :: Versions are never renamed.

> `RESTORE` is a new commit. You could even restore "forwards" to version 15 later, while its files exist.

## new-delta-02
exam: P1 P8
topic: delta
level: P
source: new

A team wants to test a risky change to a 5 TB production table in a development schema, without copying the data and without touching the production table. What should they use?

- [x] `CREATE TABLE dev.orders SHALLOW CLONE prod.orders` :: Correct. A shallow clone copies only metadata and references the source files; writes to the clone go to its own new files.
- [ ] `CREATE TABLE dev.orders DEEP CLONE prod.orders` :: Works, but copies all 5 TB.
- [ ] `CREATE VIEW dev.orders AS SELECT * FROM prod.orders` :: A view cannot be written to, so the change cannot be tested.
- [ ] Time travel on the production table :: Reads old versions; it does not give a separate writable table.

> Shallow clone: cheap, writable copy for tests. Deep clone: full copy for backup or migration. A shallow clone breaks if the source files are vacuumed.

## new-delta-03
exam: P1 P8
topic: delta
level: P
source: new

Two jobs update different rows of the same Delta table at the same time. One of them fails at commit with a concurrent modification error. Which statement is correct?

- [ ] Delta locks the table during writes, so the second job should have waited :: Delta uses optimistic concurrency, not locks.
- [x] Delta uses optimistic concurrency; when concurrent commits conflict, one writer fails and can retry, and row-level concurrency (with deletion vectors) reduces such conflicts :: Correct. Conflicts are detected at commit time.
- [ ] The table is now corrupted and must be restored :: The failed commit never became visible; the table is consistent.
- [ ] Concurrent writes are never allowed on Delta tables :: Concurrent appends never conflict, and many concurrent updates succeed.

> Optimistic concurrency: no locks, conflicts detected at commit, the loser retries. Make jobs idempotent so a retry is safe.

## new-delta-04
exam: A3 P3
topic: delta
level: P
source: new

A job recomputes one day of data and must replace only the rows where `event_date = '2026-11-20'`, leaving all other days untouched, in one atomic write. Which option does that?

- [ ] `mode("overwrite")` :: Replaces the whole table.
- [x] `mode("overwrite").option("replaceWhere", "event_date = '2026-11-20'")` :: Correct. Only rows matching the predicate are replaced, atomically.
- [ ] `mode("append")` followed by `OPTIMIZE` :: Adds a second copy of the day instead of replacing it.
- [ ] `DELETE` followed by `INSERT` in two jobs :: Two commits; readers can see the day missing in between.

> `replaceWhere` (SQL: `INSERT INTO ... REPLACE WHERE`) overwrites a slice of a table atomically.
