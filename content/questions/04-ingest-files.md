<!-- Practice questions for the topic 'ingest-files'. Format: see README.md. -->

## site-004
exam: A2 P2
topic: ingest-files
level: A
source: site

Millions of JSON files land continuously in cloud storage, and new fields are added over time. Which ingestion method fits best?

- [ ] `COPY INTO` scheduled every minute :: Good for thousands of files per run, not millions arriving continuously, and its schema evolution is limited to `mergeSchema`.
- [x] Auto Loader (`cloudFiles`) with schema evolution :: Correct. It scales to millions of files, processes only new ones through its checkpoint, and evolves the schema.
- [ ] `CREATE TABLE AS SELECT` with `read_files` :: A one-time batch load that rereads everything each time.
- [ ] Lakehouse Federation :: Queries external databases in place; it does not ingest files.

> Millions of files, continuous arrival, changing schema: Auto Loader.

## site-055
exam: A2
topic: ingest-files
level: A
source: site

An analyst wants a SQL-only, idempotent, scheduled load of a few thousand CSV files into an existing Delta table. Which option is most appropriate?

- [x] `COPY INTO` :: Correct. SQL, incremental and idempotent: already loaded files are skipped.
- [ ] Auto Loader with file notification :: Built for millions of files and written in Python (or as a pipeline); more than this case needs.
- [ ] A Python `foreach` loop over the files :: Hand-written, not idempotent, hard to maintain.
- [ ] Lakeflow Connect :: Ingests from applications and databases, not from a folder of files.

> Thousands of files, SQL, idempotent: `COPY INTO`.

## site-005
exam: A2
topic: ingest-files
level: A
source: site

A data engineer runs the same `COPY INTO` command twice with no new files arriving in between. What happens on the second run?

- [ ] All files are loaded again, creating duplicates :: `COPY INTO` remembers loaded files.
- [ ] The command fails because the files were already loaded :: It succeeds and loads nothing.
- [x] No new rows are loaded, because already loaded files are skipped :: Correct. `COPY INTO` is idempotent.
- [ ] The target table is overwritten :: `COPY INTO` only appends.

> `COPY INTO` is idempotent, so reruns and job retries are safe.

## site-094
exam: A2
topic: ingest-files
level: A
source: site

A supplier uploads a corrected file with the same name as a file that `COPY INTO` already loaded. What is the correct way to fix the table?

- [ ] Run `COPY INTO` again; it detects that the file changed :: Loaded files are skipped even when their content changed.
- [x] Delete the rows that came from the original file, then run `COPY INTO` with `FILES = ('file.csv')` and `COPY_OPTIONS ('force' = 'true')` :: Correct. `force` reloads the file but does not replace the old rows, and `FILES` limits the reload to that one file.
- [ ] Run `COPY INTO` with `'force' = 'true'` on the whole folder :: Reloads every file and duplicates all the data.
- [ ] Run `VACUUM`, then `COPY INTO` :: `VACUUM` does not reset the list of loaded files.

> `force` = load again, not replace. Remove the old rows first and target the single file.

## site-095
exam: A2
topic: ingest-files
level: A
source: site

In `COPY INTO`, which option lets the TARGET table's schema evolve when the source files gain new columns?

- [ ] `FORMAT_OPTIONS ('mergeSchema' = 'true')` :: Merges the schemas of the source files being read; it does not change the target table.
- [x] `COPY_OPTIONS ('mergeSchema' = 'true')` :: Correct. This lets the target table gain the new columns.
- [ ] `FORMAT_OPTIONS ('inferSchema' = 'true')` :: Infers column types from the files; nothing to do with the target.
- [ ] `COPY_OPTIONS ('force' = 'true')` :: Reloads files that were already loaded.

> `FORMAT_OPTIONS` shape what is read; `COPY_OPTIONS ('mergeSchema')` evolves the target.

## site-049
exam: A2
topic: ingest-files
level: A
source: site

What is `cloudFiles.schemaLocation` used for in Auto Loader?

- [ ] Where the output table is stored :: The target table is set by `toTable` or the pipeline.
- [x] Where Auto Loader stores the inferred schema and its changes over time :: Correct. It is required when the schema is inferred.
- [ ] Where bad records are written :: That is `badRecordsPath`.
- [ ] Where Kafka offsets are stored :: Offsets of any streaming source live in the checkpoint.

> Schema location = schema history. Checkpoint location = progress (which files were processed).

## site-008
exam: A2
topic: ingest-files
level: A
source: site

Auto Loader runs WITHOUT a provided schema and with default settings. A new column appears in the files. What happens?

- [x] The stream fails with an `UnknownFieldException`; after a restart the new column is included :: Correct. The default mode without a schema is `addNewColumns`: fail, update the stored schema, continue after restart.
- [ ] The column is written to `_rescued_data` and the stream continues :: That is the `rescue` mode.
- [ ] The stream ignores the column forever :: That is the `none` mode, the default only when you provide a schema.
- [ ] The stream fails and the column is never added :: That is `failOnNewColumns`.

> Default without a schema: `addNewColumns`. Run it in a job with retries so the restart is automatic.

## site-007
exam: A2
topic: ingest-files
level: A
source: site

An Auto Loader stream uses `cloudFiles.schemaEvolutionMode = 'rescue'`. A new column appears in the source files. What happens?

- [ ] The stream fails and adds the column on restart :: That is `addNewColumns`.
- [ ] The new column is added to the table schema automatically :: `rescue` never changes the schema.
- [x] The schema does not change; the new data goes to the `_rescued_data` column :: Correct. The stream keeps running and nothing is lost.
- [ ] The new column is silently dropped with no trace :: Data that does not fit is kept in `_rescued_data`.

> `rescue`: fixed schema, unexpected data rescued, no failure.

## sa-17
exam: A2 P2
topic: ingest-files
level: A
source: sa

A team ingests files from an external supplier who has already changed the layout twice without warning. The new policy: if unexpected columns arrive, ingestion must stop until someone confirms the change is intended. Which Auto Loader schema evolution mode implements this?

- [x] `failOnNewColumns` :: Correct. The stream fails on purpose when a column outside the known schema appears, forcing a human review.
- [ ] `addNewColumns` :: Adds the column and continues after a restart, without anyone validating it.
- [ ] `rescue` :: Keeps the unexpected data in `_rescued_data` and keeps running; it never stops.
- [ ] `none` :: Ignores new columns and carries on.

> "Stop and check before continuing" means `failOnNewColumns`.

## sa-18
exam: A2 P2
topic: ingest-files
level: A
source: sa

On a payments platform, the ingestion pipeline must never stop, but records with unexpected fields must not be lost either: they will be analysed later. Which configuration fits?

- [x] `rescue` mode, which sends data that does not fit to `_rescued_data` :: Correct. The pipeline keeps running and nothing is lost.
- [ ] `failOnNewColumns` :: Stops the pipeline, which is exactly what is forbidden.
- [ ] `none` :: Keeps running but drops what does not fit, losing the records to analyse.
- [ ] Turn off schema inference and read everything as strings :: Avoids failures but destroys the typing of every column and pushes the problem downstream.

> `rescue` and `failOnNewColumns` serve opposite priorities: keep going without loss, or stop to validate.

## sa-19
exam: A2
topic: ingest-files
level: A
source: sa

A landing folder receives CSV reports, JSON manifests and compressed logs. The pipeline must process only the CSV files. Assess this code:

```python
df = (spark.readStream.format("cloudFiles")
        .option("cloudFiles.format", "csv")
        .option("pathGlobFilter", "*.csv")
        .load(landing_dir))
```

- [x] The code is correct :: Correct. `pathGlobFilter` filters by file name, options come before `load`, and `load` receives the base directory.
- [ ] The filter should be in the path, as `load(landing_dir + "/*.csv")` :: `load` expects the base directory Auto Loader watches; name filtering belongs in `pathGlobFilter`.
- [ ] The chain must end with `.append()` :: There is no `append` on a reader; output modes belong to writers.
- [ ] `cloudFiles.format` is unnecessary when `pathGlobFilter` is set :: One says how to parse content, the other which files to consider.

> Syntax questions: does the method exist, are options before `load`, does `load` get a directory?

## sa-20
exam: A2
topic: ingest-files
level: A
source: sa

Before building the real ingestion, an engineer only wants to load the files already in a folder into a DataFrame and check that the content and types are as expected. What is the right approach for this step?

- [x] A simple batch read with `spark.read` :: Correct. To inspect content and schema once, a batch read is direct and sufficient.
- [ ] Auto Loader with `readStream` and `cloudFiles` :: The production answer, not the exploration one; it adds checkpoints and state for no reason here.
- [ ] A declarative pipeline with expectations :: Sets up orchestration and continuous validation for a one-time inspection.
- [ ] Create an external table and query it with SQL :: Possible, but adds a catalog object for a check a DataFrame does in seconds.

> Loading once to check is exploration; ingesting as data arrives is production.

## sa-21
exam: A2
topic: ingest-files
level: A
source: sa

In an architecture review, someone claims that Auto Loader is only for continuous streaming and does not handle schema changes. Which description is correct?

- [x] It ingests new files incrementally, works for scheduled batch-style runs and for continuous streaming, and supports schema evolution natively :: Correct. With `availableNow` it runs as a scheduled incremental job; it has four schema evolution modes.
- [ ] Streaming only, but with schema evolution :: The evolution part is right; the streaming-only part is not.
- [ ] Batch and streaming, but no schema evolution :: Schema evolution is one of its main features.
- [ ] Batch only, and the schema must always be declared :: Wrong on both counts.

> Incremental, batch-style or continuous, with schema inference and evolution.

## sa-22
exam: A2 P1
topic: ingest-files
level: A
source: sa

An Auto Loader pipeline was pointed at a new folder, but it keeps reprocessing files that were ingested in a previous run. What is the most likely cause?

- [x] The checkpoint location was reused or deleted in a way that does not match the new source :: Correct. The checkpoint records which files were processed; if it does not match the source, files are read again.
- [ ] The schema evolution mode is `addNewColumns` :: That mode deals with new columns, not with which files were processed.
- [ ] `OPTIMIZE` was not run on the target :: Layout of the target has nothing to do with tracking source files.
- [ ] `pathGlobFilter` is too permissive :: That would let in other file types, not reprocess the same files.

> Exactly-once in Auto Loader rests on the checkpoint: one per stream, never shared or casually deleted.

## site-098
exam: A2 P2
topic: ingest-files
level: A
source: site

An Auto Loader stream in directory listing mode reads a path that now holds millions of files, and every run gets slower. What is the recommended change?

- [ ] Switch to `COPY INTO` :: It also lists the folder and is meant for smaller volumes.
- [x] Enable file events on the external location and use file notification mode (`cloudFiles.useManagedFileEvents`), keeping the same checkpoint :: Correct. New files are discovered from events instead of listing, and switching modes keeps exactly-once processing.
- [ ] Delete the checkpoint and restart :: Everything would be reprocessed.
- [ ] Lower `maxFilesPerTrigger` to 1 :: Makes runs slower; the listing cost stays.

> Huge directories: file notification (managed file events) instead of directory listing.

## site-099
exam: A2
topic: ingest-files
level: A
source: site

The same JSON files are loaded once with `read_files` and once with Auto Loader, both with default options. What difference do you expect in the column types?

- [ ] None; both infer types :: Their defaults differ.
- [x] `read_files` infers types; Auto Loader infers JSON columns as STRING unless `cloudFiles.inferColumnTypes` is true :: Correct. Auto Loader keeps JSON, CSV and XML columns as strings to avoid type conflicts between files.
- [ ] Auto Loader infers types; `read_files` returns strings :: The other way round.
- [ ] Both return a single VARIANT column :: Only with `singleVariantColumn` or an explicit VARIANT schema.

> Auto Loader: strings by default for text formats (use `inferColumnTypes` or `schemaHints`). `read_files`: typed.

## site-053
exam: A2
topic: ingest-files
level: A
source: site

You must record the source file path of every ingested row. Which column can you select during ingestion?

- [ ] `input_file_name()` only :: The older function, not supported on all Unity Catalog compute.
- [x] `_metadata.file_path` :: Correct. The hidden `_metadata` column offers `file_path`, `file_name`, `file_size` and `file_modification_time`; select it explicitly.
- [ ] `_rescued_data` :: Holds data that did not fit the schema.
- [ ] `__START_AT` :: Not a file metadata column.

> Lineage to the source file: `_metadata.file_path`.

## site-101
exam: A2
topic: ingest-files
level: A
source: site

An analyst wants a table from a single 3 GB CSV file on their laptop. The *Create or modify table* upload page rejects it. What works?

- [ ] Zip the file and upload it again :: The upload page does not accept compressed archives.
- [x] Upload the file to a Unity Catalog volume and create the table from there (`read_files`, `COPY INTO` or Catalog Explorer) :: Correct. Volumes accept larger files and keep the file for reloads.
- [ ] Split it into 20 files and use the upload page :: The page takes at most 10 files and under 2 GB in total.
- [ ] Use Lakeflow Connect :: It ingests from applications and databases, not from a laptop.

> Upload page: small, one-off. Bigger files: volume first, then load.

## site-102
exam: A2 P4
topic: ingest-files
level: A
source: site

A security team ingests delivered audit log files with Auto Loader (default options) and finds events in `system.access.audit` that never reach their bronze table. Why, and what fixes it?

- [ ] Audit logs are Parquet; set `cloudFiles.format` to `parquet` :: The format is not the problem.
- [x] Delivered files can be rewritten with extra lines, and Auto Loader processes each path only once; set `cloudFiles.allowOverwrites = true` and deduplicate :: Correct. With overwrites allowed the file is read again, so duplicates must be removed (for example with an insert-only `MERGE`).
- [ ] Switch to file notification mode :: Discovery mode does not change the once-per-path rule.
- [ ] Start a new checkpoint every day :: Reprocesses everything and duplicates data.

> Files rewritten in place are not read again by default. The simplest alternative is to query `system.access.audit` directly.

## sp-13
exam: P1 P2
topic: ingest-files
level: P
source: sp

A folder receives JSON files of very different sizes. How do you limit each micro-batch to about 2 GB, whatever the number of files?

- [x] `cloudFiles.maxBytesPerTrigger = 2g` :: Correct. Limits each micro-batch by volume (a soft limit).
- [ ] `cloudFiles.maxFilesPerTrigger = 100` :: Limits by count; 100 files can be any size.
- [ ] `cloudFiles.maxSizePerTrigger` :: Not an Auto Loader option.
- [ ] `spark.sql.files.maxPartitionBytes` :: Controls read partition size in batch, not micro-batch size.

> Rate limits: `maxFilesPerTrigger` (count) and `maxBytesPerTrigger` (bytes).

## sp-16
exam: P2
topic: ingest-files
level: P
source: sp

An engineer declared `.schema("id INT, amount DOUBLE")` on a `cloudFiles` JSON stream with a bad records path, and finds syntactically valid JSON records in that path. What is the most likely explanation?

- [x] The records are valid JSON but do not fit the declared schema, for example a value of an incompatible type :: Correct. An explicit schema is checked record by record; well-formed JSON can still break the type contract.
- [ ] The bad records path only receives empty files :: It receives records that fail parsing or schema conversion.
- [ ] Auto Loader moves files larger than 128 MB there :: File size is not a criterion.
- [ ] The checkpoint is corrupted :: A corrupted checkpoint causes a run failure, not bad records.

> Malformed versus mismatched: valid JSON can still be a bad record when it does not fit the schema.

## sp-27
exam: A2 P1
topic: ingest-files
level: A
source: sp

How do you declare, in pipeline SQL, a table that ingests files from a volume incrementally?

- [x] `CREATE OR REFRESH STREAMING TABLE bronze AS SELECT * FROM STREAM read_files('/Volumes/...')` :: Correct. A streaming table processes only new files on each update.
- [ ] `CREATE TABLE bronze AS SELECT * FROM read_files('/Volumes/...')` :: A one-time static load.
- [ ] `CREATE MATERIALIZED VIEW bronze AS SELECT * FROM read_files(...)` :: A materialized view represents a query result, not append-only file ingestion.
- [ ] `INSERT OVERWRITE bronze SELECT * FROM read_files(...)` :: Rewrites the whole table every run.

> Incremental file ingestion in SQL: streaming table over `STREAM read_files`.

## new-ingest-files-02
exam: A2
topic: ingest-files
level: A
source: new

Auto Loader infers every column of a JSON feed as STRING. You want `amount` as `DECIMAL(10,2)` and `event_ts` as `TIMESTAMP` without writing the full schema. Which option?

- [x] `cloudFiles.schemaHints = "amount DECIMAL(10,2), event_ts TIMESTAMP"` :: Correct. Hints override the inferred type of the named columns only.
- [ ] `cloudFiles.schemaEvolutionMode = "addNewColumns"` :: Controls what happens with new columns, not types.
- [ ] `cloudFiles.allowOverwrites = true` :: Controls reprocessing of rewritten files.
- [ ] `mergeSchema = true` on the write :: Adds columns to the target; it does not type the source.

> `schemaHints` for a few columns; `inferColumnTypes` to infer all types.

## site-052
exam: A2
topic: ingest-files
level: A
source: site

What is Auto Loader's default mode for discovering new files?

- [ ] File notification :: Must be enabled explicitly (recommended with managed file events for large volumes).
- [x] Directory listing :: Correct. Auto Loader lists the input directory on each run unless notification mode is configured.
- [ ] Kafka offsets :: Kafka is a different source.
- [ ] Table update events :: A job trigger, not an Auto Loader mode.

> Default: directory listing. At scale: file notification with managed file events.
