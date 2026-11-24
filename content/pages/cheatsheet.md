---
title: Cheat sheet
---

The last-day review: the keyword in the question, and the answer it usually points to. Each block links to the topic with the full explanation.

## Ingestion ([files](#/topic/ingest-files), [sources](#/topic/ingest-sources), [sharing](#/topic/sharing))

| The question says | Think |
|---|---|
| Millions of files, schema changes, incremental | Auto Loader with schema evolution |
| Thousands of files, SQL, idempotent, scheduled | `COPY INTO` |
| Corrected file, same name, `COPY INTO` | Delete old rows, `FILES = (...)` + `'force' = 'true'` |
| New columns must stop ingestion for review | `failOnNewColumns` |
| Never stop, never lose unexpected data | `rescue` → `_rescued_data` |
| Default without a schema | `addNewColumns`: fail, evolve on restart |
| JSON and CSV types with Auto Loader | STRING unless `inferColumnTypes` / `schemaHints` |
| Listing millions of files is slow | File notification with managed file events |
| Process what is new, then stop | `trigger(availableNow=True)` |
| Source file of each row | `_metadata.file_path` |
| SaaS or database, no code | Lakeflow Connect managed connector |
| Database CDC into Databricks | Database connector: gateway + ingestion pipeline |
| Use credentials without seeing them | Connection + `USE CONNECTION` |
| JDBC bounds | Stride only; they do not filter |
| Query a database without copying | Lakehouse Federation (connection + foreign catalog) |
| Another Databricks customer | D2D sharing (metastore sharing identifier) |
| Partner without Databricks | Open sharing (token or OIDC) |
| Neither side may see the other's data | Clean room |

## Delta and layout ([delta](#/topic/delta), [layout](#/topic/layout))

| The question says | Think |
|---|---|
| Partial reads, concurrent writes, half-written data | Delta Lake transaction log |
| Upsert | `MERGE`; one source row per key |
| Remove target rows missing from the source | `WHEN NOT MATCHED BY SOURCE THEN DELETE` |
| Replace data and schema, keep history and grants | `CREATE OR REPLACE TABLE ... AS SELECT` |
| Add new columns on write | `mergeSchema` (replace schema: `overwriteSchema`) |
| Undo a bad write | `RESTORE TABLE ... TO VERSION AS OF` (new commit) |
| Old version no longer readable | `VACUUM` removed its files |
| Small files | `OPTIMIZE`, optimized writes, auto compaction |
| High-cardinality filter column | Liquid clustering, never partitioning |
| Unknown or changing filters | `CLUSTER BY AUTO` (managed + predictive optimization) |
| Changed clustering keys | `OPTIMIZE t FULL` |
| Frequent row updates rewrite files | Deletion vectors |
| Predictive optimization skips a table | It is external |

## Transformations ([transform](#/topic/transform), [semi-structured](#/topic/semi-structured), [UDFs and AI](#/topic/udf-ai))

| The question says | Think |
|---|---|
| PySpark `union` | By position, keeps duplicates |
| Different column order | `unionByName(allowMissingColumns=True)` |
| SQL `UNION` | Removes duplicates |
| `= NULL` | Never true: `IS NULL`, `<=>` |
| Rows with no match | `left_anti` |
| Latest row per key | `row_number()` ordered by time desc, keep 1 |
| `fillna(0)` | Numeric columns only |
| ANSI cast failure | `try_cast` |
| `M` / `m` in date patterns | Month / minute |
| `[0]` / `element_at(..., 1)` | Both the first element |
| Ties share a rank, no gaps | `dense_rank` |
| JSON string field | `raw:a.b`; struct: `a.b` |
| Arrays with NULL must keep the row | `explode_outer` |
| Changing JSON shape | VARIANT; `variant_explode`, case-sensitive paths |
| Fastest custom logic | Built-in > SQL UDF > pandas UDF > Python UDF |
| Classify text into labels in SQL | `ai_classify` |

## Pipelines, streaming, CDC ([pipelines](#/topic/pipelines), [streaming](#/topic/streaming), [CDC](#/topic/cdc), [modeling](#/topic/modeling))

| The question says | Think |
|---|---|
| Append-only, each row once | Streaming table |
| Expensive aggregate for BI | Materialized view |
| Intermediate step | Temporary view |
| No `ON VIOLATION` | Warn: keep row, count |
| Discard and continue / stop | `DROP ROW` / `FAIL UPDATE` |
| Keep rejected rows | Quarantine table (NULL-safe condition) |
| Rule for every writer | Delta `CHECK` constraint |
| MV refresh fails after owner left | Owner = service principal |
| Upsert from a stream | `foreachBatch` + `MERGE` |
| Bound state | Watermark |
| Duplicates days apart | Insert-only `MERGE` |
| History with validity dates | SCD type 2 (`AUTO CDC ... STORED AS SCD TYPE 2`) |
| Out-of-order events | `SEQUENCE BY` |
| Only snapshots available | `AUTO CDC FROM SNAPSHOT` |
| React to updates and deletes downstream | Change Data Feed |
| Keep raw events for years | Bronze |
| Governed metrics at any grain | Metric view |

## Jobs and CI/CD ([jobs](#/topic/jobs), [CI/CD](#/topic/cicd), [testing](#/topic/testing))

| The question says | Think |
|---|---|
| Cleanup that always runs | Run if `ALL_DONE` |
| Alert on failure | Run if `AT_LEAST_ONE_FAILED` |
| Skip when no new data | Task value + If/else |
| Same task per list item | For each |
| Files arrive at random times | File arrival trigger |
| Run after a table changes | Table update trigger (run-as needs `SELECT`) |
| Kill after one hour | Timeout (warning only notifies) |
| Rerun only failed tasks | Repair run |
| Quartz 06:30 | `0 30 6 * * ?` |
| Same code dev → prod | Bundle with targets and variables |
| Variable on `bundle run` ignored | Resolved at deploy: use job parameters |
| Adopt a UI job | `generate` + `bind` |
| CI authentication | Service principal, OAuth M2M or OIDC federation |
| Pull request | In the Git provider |
| Testable transformations | Pure functions + `DataFrame.transform` + `assertDataFrameEqual` |

## Operations ([monitoring](#/topic/monitoring), [performance](#/topic/performance), [platform](#/topic/platform))

| The question says | Think |
|---|---|
| One task far slower than the median | Skew: AQE skew join (joins) or salting |
| Spill | Smaller partitions, more memory |
| Big table joined with tiny table | Broadcast the tiny one |
| `collect()` OOM | Driver: do not collect |
| Serverless, no Spark UI | Query profile |
| `spark.default.parallelism` | RDDs only |
| Slower run, *Waiting for resources* | Pools or serverless, not Spark tuning |
| History older than 60 days | `system.lakeflow` tables |
| Who did what | `system.access.audit` |
| Cost | `system.billing.usage` × `list_prices` |
| Expectation metrics | Event log `flow_progress` |
| R or RDD | Classic, dedicated access mode |
| Scheduled job, lowest cost | Serverless jobs or job compute, never all-purpose |

## Governance ([governance](#/topic/governance), [privacy](#/topic/privacy))

| The question says | Think |
|---|---|
| Read a table | `USE CATALOG` + `USE SCHEMA` + `SELECT` |
| Block one user with `DENY` | No `DENY` in Unity Catalog |
| `REVOKE` on table, grant on schema | Access remains |
| Drop external table | Metadata only |
| Recover dropped managed table | `UNDROP` (7 days) |
| External → managed | `ALTER TABLE ... SET MANAGED` |
| Metadata only | `BROWSE` |
| Manage grants without data | `MANAGE` |
| Volume files | `READ VOLUME` / `WRITE VOLUME` |
| One group sees a column | Column mask, `is_account_group_member` |
| Rows per region | Row filter |
| One rule for all PII columns, owners cannot remove | ABAC policy on governed tags |
| Reversible pseudonym | Tokenization |
| GDPR erasure | `DELETE` + purge + `VACUUM` |

## Numbers to remember

| Item | Value |
|---|---|
| Associate | 45 scored questions, 90 minutes |
| Professional | 60 scored questions, 120 minutes |
| `VACUUM` default retention | 7 days |
| Delta log retention | 30 days |
| `UNDROP` window | 7 days |
| Auto broadcast threshold | 10 MB |
| Default shuffle partitions (Spark) | 200 (Databricks: use auto) |
| Liquid clustering keys | Up to 4 |
| Table update trigger | Up to 10 tables |
| For each concurrency | Up to 100 |
| Queued runs wait | Up to 48 hours |
| Job runs in the UI | About 60 days |
| Upload page | 10 files, under 2 GB |
| Auto Loader inference sample | 50 GB or 1,000 files |
| Notebook job output limit | 20 MB total, 8 MB per cell |
