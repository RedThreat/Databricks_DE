<!-- Practice questions for the topic 'cdc'. Format: see README.md. -->

## sa-28
exam: A3 P2
topic: cdc
level: A
source: sa

A customer table in a transactional system receives inserts, updates and deletes. The team wants a lakehouse table kept in sync with that state. Which capability addresses this?

- [x] Change data capture, applying the changes to the target table :: Correct. CDC propagates inserts, updates and deletes without reprocessing everything.
- [ ] Data quality expectations on the target table :: Validate rows; do not synchronise state.
- [ ] Rewrite the target table completely every night :: Works for small tables but is slow, expensive and loses change history.
- [ ] Pipeline monitoring with alerts :: Observes health; changes no data.

> CDC synchronises, expectations validate, monitoring observes.

## site-019
exam: A3 P1
topic: cdc
level: A
source: site

A customer dimension must keep the full history of address changes with validity periods. Which approach fits in a declarative pipeline?

- [ ] `AUTO CDC ... STORED AS SCD TYPE 1` :: Overwrites the old address.
- [x] `AUTO CDC ... STORED AS SCD TYPE 2` :: Correct. Each version gets `__START_AT` and `__END_AT` columns.
- [ ] A materialized view with `INSERT OVERWRITE` :: Not valid for a materialized view, and keeps no history.
- [ ] A view :: Stores nothing.

> History with validity periods = SCD type 2. `AUTO CDC` defaults to type 1.

## site-062
exam: A3 P1
topic: cdc
level: A
source: site

A pipeline whose streaming table is built with `AUTO CDC ... STORED AS SCD TYPE 2` is fully refreshed. What happens to the history?

- [ ] It is preserved :: A full refresh truncates the table.
- [x] It is lost; the table is rebuilt from the source data still available :: Correct. History built from events the source no longer holds cannot be recreated.
- [ ] It is moved to an archive table :: Nothing is archived automatically.
- [ ] Only the last version is lost :: The whole table is rebuilt.

> Protect SCD type 2 targets from full refreshes, or keep the full change history in bronze.

## sp-23
exam: P1 P2
topic: cdc
level: P
source: sp

CDC events arrive out of order: a late DELETE can arrive after a newer UPDATE of the same key. How do the AUTO CDC APIs guarantee the correct result?

- [x] `SEQUENCE BY` defines the logical order, and delete tombstones prevent late events from resurrecting deleted rows :: Correct. Events are applied in logical order, not arrival order.
- [ ] They apply events in arrival order :: That would give wrong results with late events.
- [ ] They run `VACUUM` between events :: File maintenance has nothing to do with ordering.
- [ ] They discard every DELETE that arrives after an UPDATE :: Could lose legitimate deletes; the sequence value decides.

> Out-of-order CDC: `SEQUENCE BY` on the event's logical time.

## sp-12
exam: P5 P1
topic: cdc
level: P
source: sp

An SCD type 1 table receives constant updates and deletes. A downstream streaming job must react only to updates and deletes. How should it read the table?

- [x] `readStream` with `readChangeFeed = true`, filtering `_change_type` on `update_postimage` and `delete` :: Correct. The Change Data Feed labels every row change with its type.
- [ ] `readStream` with `ignoreChanges` :: Re-emits rewritten files as new data without saying what changed.
- [ ] A batch `spark.read` every minute :: Rereads the whole table and is not incremental.
- [ ] `VERSION AS OF` :: Pins one version; it does not follow changes.

> React to updates and deletes: read the Change Data Feed.

## sp-24
exam: P1 P2
topic: cdc
level: P
source: sp

A second pipeline must incrementally process a streaming table that receives updates (SCD type 1). How should it read the source?

- [x] Read its Change Data Feed as a stream and apply the changes with `AUTO CDC` :: Correct. CDF provides inserts, updates and deletes in a form `AUTO CDC` can apply.
- [ ] `readStream` with `skipChangeCommits` :: Ignores update and delete commits, losing exactly the changes needed.
- [ ] A static `spark.read` :: Not incremental.
- [ ] `readStream` with no options :: Fails when it meets commits that change existing rows.

> A table with updates is not an append-only source: use its change feed.

## new-cdc-01
exam: P1
topic: cdc
level: P
source: new

A customer dimension uses `AUTO CDC ... STORED AS SCD TYPE 2`. Changes to `last_login_ts` happen many times a day and should not create new versions, while address changes must. What do you add?

- [ ] `APPLY AS TRUNCATE WHEN` :: Empties the table; only for SCD type 1.
- [x] `TRACK HISTORY ON * EXCEPT (last_login_ts)` :: Correct. Only the tracked columns create new versions; other changes update the current row.
- [ ] `SEQUENCE BY last_login_ts` :: Changes the ordering of events, which must stay the change timestamp.
- [ ] `COLUMNS * EXCEPT (last_login_ts)` :: Removes the column from the target entirely.

> SCD type 2 in `AUTO CDC`: `TRACK HISTORY ON` picks which columns create versions.

## new-cdc-02
exam: P1 P2
topic: cdc
level: P
source: new

A legacy system cannot provide a change feed; it only drops a complete extract of the `products` table every night. You need SCD type 2 history in a declarative pipeline. What should you use?

- [ ] `AUTO CDC` from the raw extracts :: Expects change events, not full snapshots.
- [x] `AUTO CDC FROM SNAPSHOT` (Python `create_auto_cdc_from_snapshot_flow`) with SCD type 2 :: Correct. It compares successive snapshots and derives inserts, updates and deletes.
- [ ] A materialized view over the latest extract :: Shows only the current snapshot, no history.
- [ ] `INSERT OVERWRITE` of the extract into a Delta table :: Replaces the data and keeps no history.

> Full snapshots instead of a feed: `AUTO CDC FROM SNAPSHOT`.

## new-cdc-03
exam: P5
topic: cdc
level: P
source: new

Change Data Feed was enabled on `silver.orders` today at version 120. A team asks for the row-level changes made last week (versions 80 to 110). What can you give them?

- [ ] `table_changes('silver.orders', 80, 110)` :: CDF records changes only from the version where it was enabled.
- [x] Not those changes through CDF; it is not retroactive. Old snapshots are available through time travel while their files are retained :: Correct.
- [ ] Enable CDF again with `startingVersion = 80` :: There is no backfill of change data.
- [ ] `DESCRIBE HISTORY` gives the changed rows :: It gives operations and metrics, not rows.

> CDF starts when you enable it. Turn it on early for tables others will consume incrementally.

## new-cdc-04
exam: P2 A3
topic: cdc
level: P
source: new

A daily `MERGE` applies a CDC batch to `silver.customers`. Occasionally an old event, replayed by the source, overwrites a newer value. Which change prevents this?

- [ ] `WHEN MATCHED THEN UPDATE SET *` without conditions :: That is the current behaviour.
- [x] Keep the latest event per key in the batch, and update only when `s.change_ts > t.change_ts` :: Correct. Comparing sequence values stops stale events from overwriting newer rows.
- [ ] Run `OPTIMIZE` before the merge :: Layout does not change merge logic.
- [ ] Use `INSERT OVERWRITE` instead :: Loses all rows not in the batch.

> Hand-written CDC must deduplicate per key and compare sequence values.
