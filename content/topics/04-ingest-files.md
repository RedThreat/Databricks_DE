---
id: ingest-files
title: "Ingesting files: COPY INTO and Auto Loader"
group: Ingestion
order: 4
summary: Uploads and volumes, read_files, COPY INTO, Auto Loader with checkpoints, schema inference and evolution, file detection modes, triggers, and how to choose between them.
---

## The options at a glance

| Method | Incremental | Scale | Interface | Use it when |
|---|---|---|---|---|
| Upload page (*Create or modify table*) | No | Up to 10 files, under 2 GB in total; CSV, TSV, JSON, Avro, Parquet or text; no archives | UI | One small file from your laptop |
| Upload to a volume, then create the table | No | Larger files (the UI takes up to 5 GB per file; CLI and API more) | UI, CLI, API | A one-off file that is too big for the upload page, or that you want to keep for reloads |
| `read_files` / `spark.read` | No: reads everything every time | Any | SQL, Python | Exploring files, one-time loads (`CREATE TABLE AS SELECT`) |
| `COPY INTO` | Yes, idempotent | Thousands of files per run | SQL | Scheduled SQL loads of files into an existing table |
| Auto Loader (`cloudFiles`) | Yes, exactly once through a checkpoint | Millions of files | Python, or `STREAM read_files` in SQL | Continuous or frequent arrivals, schema that changes, large volumes |

All of them read from a **Unity Catalog volume** (`/Volumes/catalog/schema/volume/...`, needs `READ VOLUME`) or from an **external location** (cloud URI, needs `READ FILES`). Volumes are the recommended landing zone: access control and lineage come with them.

Every file source exposes a hidden **`_metadata`** column (`file_path`, `file_name`, `file_size`, `file_modification_time`). Select it explicitly to record where each row came from; `input_file_name()` is the old way and is not supported everywhere.

## read_files

```sql
SELECT *, _metadata.file_path AS source_file
FROM read_files('/Volumes/main/raw/landing/orders/',
                format => 'csv', header => true,
                schemaHints => 'amount DECIMAL(10,2)');
```

`read_files` infers column types by default. It is batch: run it twice and you read every file twice. Inside a declarative pipeline, `STREAM read_files(...)` makes it incremental (Auto Loader underneath).

## COPY INTO

```sql
CREATE TABLE IF NOT EXISTS main.bronze.orders;   -- schemaless placeholder, filled by the first load

COPY INTO main.bronze.orders
FROM (SELECT *, _metadata.file_path AS source_file
      FROM '/Volumes/main/raw/landing/orders/')
FILEFORMAT = CSV
PATTERN = 'orders_*.csv'
FORMAT_OPTIONS ('header' = 'true', 'inferSchema' = 'true', 'mergeSchema' = 'true')
COPY_OPTIONS ('mergeSchema' = 'true');
```

- **Idempotent.** The table remembers which files it loaded and skips them on the next run, **even if they were modified**. Rerunning the command or retrying the job does not duplicate data.
- **Reloading a corrected file with the same name**: `force` reloads but does not replace anything, so delete the old rows first, then load just that file:

```sql
DELETE FROM main.bronze.orders WHERE source_file LIKE '%orders_2026-11-20.csv';
COPY INTO main.bronze.orders FROM '/Volumes/main/raw/landing/orders/'
FILEFORMAT = CSV FILES = ('orders_2026-11-20.csv')
FORMAT_OPTIONS ('header' = 'true') COPY_OPTIONS ('force' = 'true');
```

- `FILES` (an explicit list, up to 1,000 names) and `PATTERN` (a glob) cannot be used together.
- `FORMAT_OPTIONS ('inferSchema', 'mergeSchema')` shape the schema **read from the files**. `COPY_OPTIONS ('mergeSchema' = 'true')` lets the **target table** gain new columns. A schemaless placeholder table only accepts `COPY INTO` with `mergeSchema`.
- `FROM (SELECT ...)` casts, renames or adds columns during the load.
- `VALIDATE ALL` (or `VALIDATE 10 ROWS`) checks the files and reports problems without writing.

## Auto Loader

```python
(spark.readStream.format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.schemaLocation", "/Volumes/main/raw/_meta/orders/schema")
    .option("cloudFiles.schemaEvolutionMode", "addNewColumns")
    .option("cloudFiles.schemaHints", "amount DECIMAL(10,2), order_ts TIMESTAMP")
    .option("pathGlobFilter", "*.json")
    .load("/Volumes/main/raw/landing/orders/")          # the base directory, not a glob
    .select("*", "_metadata.file_path")
  .writeStream
    .option("checkpointLocation", "/Volumes/main/raw/_meta/orders/checkpoint")
    .trigger(availableNow=True)                         # process what is new, then stop
    .toTable("main.bronze.orders"))
```

**Checkpoint.** The checkpoint records which files were processed, which gives exactly-once ingestion across restarts. Use one checkpoint per stream, keep it outside the source folder and the table, and never share it. Deleting it, or pointing a stream at a different source with the old one, makes files be read again.

**Schema location.** `cloudFiles.schemaLocation` stores the inferred schema and every version of it. It is required when Auto Loader infers the schema.

**Inference.** Auto Loader samples the first 50 GB or 1,000 files. For **JSON, CSV and XML every column is inferred as STRING** unless `cloudFiles.inferColumnTypes = true`; this avoids type conflicts between files. Parquet and Avro keep their types. `schemaHints` force the type of chosen columns.

### Schema evolution modes

| `cloudFiles.schemaEvolutionMode` | New column appears | When it is the default |
|---|---|---|
| `addNewColumns` | The stream **fails** with `UnknownFieldException` and updates the stored schema; after a restart the column is included | No schema provided |
| `rescue` | Schema never changes; unexpected data goes to `_rescued_data`; the stream keeps running | — |
| `failOnNewColumns` | The stream fails and does **not** evolve until someone updates the schema or removes the file | — |
| `none` | Ignored; nothing is rescued unless `rescuedDataColumn` is set | A schema is provided |

Run `addNewColumns` streams in a job with retries so the restart happens automatically. Existing column types never change by evolution; a type mismatch lands in `_rescued_data` instead.

**`_rescued_data`** holds, as JSON, whatever did not fit: unknown columns (in `rescue` mode), values of the wrong type, and column names that differ only in case, plus the source file path. A **malformed** record (broken JSON) is different: it fails the read in `FAILFAST` mode and is dropped in `DROPMALFORMED` mode; with `badRecordsPath` the bad records are written to that folder for later inspection.

### Finding new files

| Mode | How | Choose it when |
|---|---|---|
| Directory listing (default) | Lists the input directory on each run | Moderate numbers of files |
| File notification | Cloud storage events tell Auto Loader which files arrived | Millions of files, or listing has become slow |

The recommended form of file notification is **managed file events**: enable file events on the external location and set `cloudFiles.useManagedFileEvents = true`. Switching from listing to file events keeps the same checkpoint and exactly-once processing. The older `cloudFiles.useNotifications = true` creates queues and subscriptions in your cloud account and needs extra cloud permissions.

### Other options worth knowing

| Option | Effect |
|---|---|
| `cloudFiles.maxFilesPerTrigger` | Upper bound on files per micro-batch (default 1,000) |
| `cloudFiles.maxBytesPerTrigger` | Soft upper bound on bytes per micro-batch, for files of very different sizes |
| `cloudFiles.includeExistingFiles` | Whether the first run also processes files already in the folder (default true) |
| `cloudFiles.allowOverwrites` | Reprocess a file whose content was rewritten in place (default false: each path once); deduplicate downstream |
| `pathGlobFilter` | Only consider files whose names match a pattern |

### Triggers

| Trigger | Behaviour | Use for |
|---|---|---|
| `availableNow=True` | Processes everything new in rate-limited batches, then stops | Scheduled incremental runs (the "batch mode" of Auto Loader); serverless jobs |
| `processingTime="1 minute"` | Runs a micro-batch every minute, forever | Low-latency continuous ingestion on classic compute |
| No trigger | Micro-batch after micro-batch with no pause | Rarely what you want: constant listing cost; fails on serverless |
| `once=True` | One batch, then stop | Deprecated; use `availableNow` |

## Choosing a method

| Scenario | Method |
|---|---|
| Millions of JSON files arriving all day, new fields appear over time | Auto Loader with schema evolution |
| A few thousand CSV files a day, SQL team, idempotent scheduled load | `COPY INTO` |
| One 3 GB CSV on a laptop | Upload it to a volume, then `read_files`, `COPY INTO` or Catalog Explorer |
| Check what a folder contains once before building anything | `spark.read` or `read_files` |
| Incremental file ingestion inside a declarative pipeline | Streaming table with `STREAM read_files` |
| Unexpected columns must stop ingestion until someone approves | Auto Loader `failOnNewColumns` |
| Ingestion must never stop and nothing may be lost | Auto Loader `rescue` |
| Files from a database or SaaS application, not a folder | See *Connectors, databases and message buses* |

## Exam traps

!!! trap "COPY INTO skips modified files"
    A corrected file with the same name is not loaded again unless you use `force`, and `force` does not remove the old rows.

!!! trap "rescue versus addNewColumns"
    `rescue` never changes the schema. `addNewColumns` fails once, then includes the column after a restart.

!!! trap "Strings by default"
    Auto Loader infers JSON and CSV columns as strings; `read_files` infers types. Same files, different column types.

!!! tip "Checkpoint equals memory"
    Every "files are processed again" scenario comes back to a checkpoint that was deleted, shared or reused for another source.

## Hands-on

1. Create a volume: `CREATE VOLUME IF NOT EXISTS workspace.default.landing;` and upload two small CSV files into an `orders/` folder.
2. Query them with `read_files`, then load them with `COPY INTO`. Run the `COPY INTO` a second time and check the row count and the number of inserted rows reported.
3. Write the Auto Loader stream above with `availableNow`, run it, add a third file with an extra column, run it again and watch the `UnknownFieldException`; run once more and see the new column.
4. Change the stream to `rescue`, add a file with yet another column, and query `_rescued_data`.
