<!-- Practice questions for the topic 'ingest-sources'. Format: see README.md. -->

## site-009
exam: A2 P2
topic: ingest-sources
level: A
source: site

A company needs to ingest data from Salesforce into Delta tables without writing or maintaining API code. What should they use?

- [ ] Auto Loader :: Ingests files from cloud storage, not data from a SaaS API.
- [ ] A notebook with the `requests` library :: That is exactly the API code they do not want to maintain.
- [x] A Lakeflow Connect managed connector :: Correct. Managed connectors ingest from SaaS applications and databases incrementally, with no code.
- [ ] `COPY INTO` :: Loads files from storage.

> SaaS or a supported database, no code to maintain: Lakeflow Connect managed connector.

## site-054
exam: A2 P2
topic: ingest-sources
level: A
source: site

Events arrive in an Apache Kafka topic and must be ingested with low latency. Which approach?

- [ ] `COPY INTO` :: Loads files, not messages from a broker.
- [x] Structured Streaming (or a streaming table) reading from Kafka :: Correct. Kafka is a streaming source for Structured Streaming and for `read_kafka` in pipelines.
- [ ] Lakehouse Federation :: Federates databases, not message brokers.
- [ ] Manual upload :: Not continuous and not low latency.

> Message buses (Kafka, Kinesis, Event Hubs): Structured Streaming or streaming tables.

## site-096
exam: A2 P2
topic: ingest-sources
level: A
source: site

An engineer reads a table over JDBC with `partitionColumn = 'order_id'`, `lowerBound = 1`, `upperBound = 1000` and `numPartitions = 8`, expecting only the first 1,000 orders, but gets millions of rows. Why?

- [ ] `numPartitions` is too high :: It changes parallelism, not which rows are read.
- [x] `lowerBound` and `upperBound` only define the partition stride; they do not filter rows :: Correct. Rows outside the bounds go to the first and last partitions. Filter with a `WHERE` in a `dbtable` subquery.
- [ ] JDBC ignores `partitionColumn` on serverless :: Not the reason, and partitioned JDBC reads work on serverless.
- [ ] The driver needs `fetchsize` :: `fetchsize` tunes round trips, not filtering.

> JDBC bounds split the work; they do not filter.

## new-ingest-sources-02
exam: P2 A2
topic: ingest-sources
level: P
source: new

A Lakeflow Connect ingestion from SQL Server has two components: an ingestion gateway and an ingestion pipeline. Which statement is correct?

- [x] The gateway runs continuously on classic compute, reads snapshots and change data from SQL Server and stages them in a volume; the serverless pipeline applies the staged changes to streaming tables :: Correct. The gateway must keep running so no change log entries are missed.
- [ ] The gateway runs only during the scheduled pipeline update, to save cost :: Stopping it risks losing change log entries the database purges.
- [ ] The pipeline reads SQL Server directly; the gateway only stores credentials :: Credentials live in the connection; the gateway does the extraction.
- [ ] Both run on the analysts' SQL warehouse :: Neither runs on a SQL warehouse.

> Database connectors: always-on gateway (extract and stage) plus scheduled serverless pipeline (apply).

## new-ingest-sources-03
exam: P2 P1
topic: ingest-sources
level: P
source: new

Before turning on a Lakeflow Connect ingestion from MySQL, what must be true of the source database?

- [ ] It must be exported to CSV every night :: Managed connectors read the database directly.
- [x] Change capture must be enabled (the binary log for MySQL) so the connector can read changes incrementally :: Correct. SQL Server needs change tracking or CDC, PostgreSQL logical replication, MySQL the binlog.
- [ ] It must be migrated to Delta Lake first :: The point of the connector is to ingest from the database as it is.
- [ ] It must be reachable through a public IP without authentication :: Connections always authenticate, and private networking is supported.

> Incremental database ingestion depends on the database's change log being enabled.

## new-ingest-sources-04
exam: A2
topic: ingest-sources
level: A
source: new

A notebook ingests a paginated REST API every hour. Which design is most robust?

- [ ] Store the API token in the notebook and write responses to `/tmp` on the driver, then load them :: The token is exposed and `/tmp` disappears with the compute.
- [x] Read the token from a secret scope, follow the pages, retry with backoff on HTTP 429, write each raw response as a file to a volume, and load the folder with Auto Loader; schedule it in a Lakeflow job :: Correct. Secrets stay secret, rate limits are respected, and raw files give replay and lineage.
- [ ] Call the API once per row with a Python UDF on a large cluster :: Floods the API, ignores rate limits and is hard to retry.
- [ ] Use Lakehouse Federation on the API URL :: Federation connects to databases, not REST APIs.

> REST ingestion: secrets, pagination, backoff, land raw files in a volume, then load incrementally.

## new-ingest-sources-05
exam: A2 A1
topic: ingest-sources
level: A
source: new

A nightly notebook must read an old database through an ODBC driver that is installed with an init script. Which compute can run it?

- [ ] Serverless jobs :: Serverless does not run init scripts, so the driver cannot be installed.
- [ ] A serverless SQL warehouse :: Runs SQL only.
- [x] Classic job compute with the init script :: Correct. Classic compute runs init scripts that install drivers.
- [ ] Any compute, because ODBC is built in :: ODBC drivers for most databases are not preinstalled.

> Anything that needs init scripts or custom drivers runs on classic compute.

## new-ingest-sources-06
exam: A2 A7
topic: ingest-sources
level: A
source: new

A team connected Fivetran through Partner Connect. Fivetran created tables in a schema, but analysts get permission errors when they query them. Why?

- [ ] Partner Connect tables can only be read through Fivetran :: They are ordinary Unity Catalog tables.
- [x] The tables are owned by the partner's service principal, and nobody granted the analysts access :: Correct. Grant `USE CATALOG`, `USE SCHEMA` and `SELECT` (on the schema or tables) to the analysts' group.
- [ ] The analysts need `MODIFY` to read :: Reading needs `SELECT`, not `MODIFY`.
- [ ] Partner tables are external tables, which analysts cannot query :: Table type has nothing to do with the error.

> The identity that creates a table owns it; others need grants.

## new-ingest-sources-07
exam: P1 P2
topic: ingest-sources
level: P
source: new

A bronze streaming table reads a Kafka topic that keeps messages for 7 days. Someone runs a full refresh of the pipeline. What is the risk and how do you prevent it?

- [ ] No risk: a full refresh reads Kafka from the first message ever produced :: Kafka only holds what is still inside its retention period.
- [x] The table is truncated and rebuilt from the last 7 days only, so older data is lost; set `pipelines.reset.allowed = false` on the bronze table :: Correct. That table property protects it from full refreshes.
- [ ] Duplicates appear because Kafka offsets are reused :: A full refresh resets the checkpoint and truncates the table, so the issue is loss, not duplication.
- [ ] The refresh fails because Kafka does not support restarts :: It succeeds, which is the problem.

> Sources with limited retention: protect bronze streaming tables from full refresh.

## site-097
exam: A2 P2
topic: ingest-sources
level: A
source: site

An admin wants analysts to build ServiceNow ingestion pipelines without ever seeing the ServiceNow credentials. What should the admin do?

- [ ] Share the password in a secret scope the analysts can read :: They could read the secret.
- [x] Create a Unity Catalog connection and grant `USE CONNECTION` (plus `USE CATALOG`, `USE SCHEMA` and `CREATE TABLE` on the target) :: Correct. The connection stores the credentials; `USE CONNECTION` lets analysts build pipelines with it.
- [ ] Grant `CREATE CONNECTION` on the metastore to the analysts :: Lets them create new connections; not needed to use an existing one.
- [ ] Make the analysts workspace admins :: Far too much access.

> Credentials live in connections; `USE CONNECTION` uses them without revealing them.
