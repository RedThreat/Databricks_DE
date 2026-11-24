---
id: cdc
title: Change data capture and SCD
group: Transformation
order: 12
summary: Applying change feeds with MERGE, AUTO CDC for SCD type 1 and type 2 in declarative pipelines, out-of-order events, snapshots, and Delta Change Data Feed for incremental downstream processing.
---

## Concepts

A **change data capture (CDC)** feed describes changes rather than current state. Each event has a key, an operation (insert, update, delete), a sequence value that orders events (a timestamp or log sequence number) and the column values. Real feeds bring problems you must handle: several events per key in one batch, events out of order, duplicates, and deletes.

**Slowly changing dimensions (SCD)** decide what to keep when an attribute changes:

| Type | Behaviour | Example |
|---|---|---|
| 0 | Never changes | Date of birth |
| 1 | Overwrite; no history | Correcting a typo in a name |
| 2 | New row per version, with validity dates; full history | Customer address, so each past sale shows the address valid at the time |

## Applying changes with MERGE

```sql
MERGE INTO silver.customers AS t
USING (
  SELECT * FROM bronze.customer_changes
  WHERE batch_date = current_date()
  QUALIFY row_number() OVER (PARTITION BY customer_id ORDER BY change_ts DESC) = 1
) AS s
ON t.customer_id = s.customer_id
WHEN MATCHED AND s.op = 'DELETE' THEN DELETE
WHEN MATCHED AND s.change_ts > t.change_ts THEN UPDATE SET *
WHEN NOT MATCHED AND s.op <> 'DELETE' THEN INSERT *;
```

- Keep the **latest event per key** before merging (otherwise the merge fails on multiple matches).
- Compare sequence values so an old event never overwrites a newer row.
- This is SCD type 1. SCD type 2 with `MERGE` needs two actions per changed key (close the current row, insert a new one), usually by merging a staged union of the changes; it is error-prone, which is why pipelines offer `AUTO CDC`.

## AUTO CDC in declarative pipelines

`AUTO CDC` (formerly `APPLY CHANGES INTO`, `dlt.apply_changes`) applies a change feed to a streaming table and handles ordering, deletes and SCD type 2 for you.

```sql
CREATE OR REFRESH STREAMING TABLE customers_history;

CREATE FLOW customers_cdc AS AUTO CDC INTO customers_history
FROM STREAM bronze_customer_changes
KEYS (customer_id)
APPLY AS DELETE WHEN op = 'DELETE'
SEQUENCE BY change_ts
COLUMNS * EXCEPT (op, change_ts)
STORED AS SCD TYPE 2
TRACK HISTORY ON * EXCEPT (last_login_ts);
```

```python
from pyspark import pipelines as dp
from pyspark.sql import functions as F

dp.create_streaming_table("customers_current")
dp.create_auto_cdc_flow(
    target="customers_current",
    source="bronze_customer_changes",
    keys=["customer_id"],
    sequence_by=F.col("change_ts"),
    apply_as_deletes=F.expr("op = 'DELETE'"),
    except_column_list=["op", "change_ts"],
    stored_as_scd_type=1,
)
```

| Clause | Meaning |
|---|---|
| `KEYS` | Columns that identify a row |
| `SEQUENCE BY` | Logical order of events; late events are applied in this order, not arrival order |
| `APPLY AS DELETE WHEN` | Which events are deletes |
| `APPLY AS TRUNCATE WHEN` | Events that empty the table (SCD type 1 only) |
| `COLUMNS` / `except_column_list` | Columns to write |
| `STORED AS SCD TYPE 1` (default) or `2` | Overwrite, or keep history |
| `TRACK HISTORY ON` | (Type 2) which column changes create a new version; changes to other columns update the current row |

- **SCD type 1** is the default.
- **SCD type 2** adds `__START_AT` and `__END_AT` (from the sequence values); the current version has `__END_AT` NULL.
- **Out-of-order events**: because of `SEQUENCE BY`, a late update older than a delete does not bring the row back; deletes are kept as tombstones for a while so late events can be resolved.
- **Snapshots instead of a feed**: when the source only provides full extracts, `AUTO CDC FROM SNAPSHOT` (Python `create_auto_cdc_from_snapshot_flow`) compares successive snapshots and derives the changes.
- A **full refresh** rebuilds the target from what the source still holds: SCD type 2 history built from events that are gone is lost.
- The target receives updates and deletes, so it is not append-only: downstream streams must read its change feed, not a plain stream.
- Lakeflow Connect database connectors use the same mechanism to keep their tables in sync with SQL Server, MySQL or PostgreSQL. If downstream consumers use Iceberg engines, make the target readable as Iceberg; the CDC logic does not change.

## Delta Change Data Feed

Change Data Feed (CDF) records row-level changes of a Delta table so downstream jobs can process only what changed.

```sql
ALTER TABLE silver.customers SET TBLPROPERTIES (delta.enableChangeDataFeed = true);

SELECT customer_id, _change_type, _commit_version, _commit_timestamp
FROM table_changes('silver.customers', 12)              -- from version 12 (or a timestamp)
WHERE _change_type IN ('update_postimage', 'delete');
```

```python
changes = (spark.readStream
             .option("readChangeFeed", "true")
             .option("startingVersion", 12)
             .table("main.silver.customers"))
```

| `_change_type` | Row |
|---|---|
| `insert` | New row |
| `update_preimage` | Values before an update |
| `update_postimage` | Values after an update |
| `delete` | Deleted row |

- CDF starts recording when you enable it; it is not retroactive.
- Updates, deletes and merges write small change files (`_change_data`); inserts are read from the data files. The extra storage is cleaned up by `VACUUM` according to the file retention.
- Typical uses: propagate silver changes to gold incrementally, feed a second pipeline's `AUTO CDC`, replicate changes to another system, audit row changes.
- CDF is not time travel: time travel returns a whole old snapshot; CDF returns the changes between versions.
- For privacy, remember that change files can still hold deleted values until they are vacuumed.

## Choosing

| Situation | Use |
|---|---|
| Change feed with inserts, updates and deletes, keep only current values | `AUTO CDC ... STORED AS SCD TYPE 1` (or `MERGE`) |
| Keep full history of attribute changes with validity periods | `AUTO CDC ... STORED AS SCD TYPE 2` |
| Source only gives full daily snapshots | `AUTO CDC FROM SNAPSHOT` |
| Downstream job must react only to updates and deletes of a table | Read its Change Data Feed and filter on `_change_type` |
| Events arrive out of order | `SEQUENCE BY` on the event's logical time |
| Replicate a database's changes into Databricks | Lakeflow Connect database connector |

## Exam traps

!!! trap "Default SCD type"
    `AUTO CDC` stores SCD type 1 unless you say `STORED AS SCD TYPE 2`.

!!! trap "Full refresh and history"
    A full refresh of an SCD type 2 target loses the history that the source no longer holds.

!!! trap "skipChangeCommits is not CDC"
    It ignores updates and deletes. To react to them, read the Change Data Feed.

## Hands-on

1. Create `customer_changes` with columns `customer_id, name, city, op, change_ts` and a few events, including two updates for the same customer and a delete.
2. Apply them to a target with the `MERGE` above; check the result.
3. In a pipeline, apply the same feed with `AUTO CDC` as SCD type 2 and look at `__START_AT` and `__END_AT`.
4. Enable CDF on the `MERGE` target, run another merge, and query `table_changes`.
