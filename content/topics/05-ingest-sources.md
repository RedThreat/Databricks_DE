---
id: ingest-sources
title: Connectors, databases and message buses
group: Ingestion
order: 5
summary: Lakeflow Connect managed and standard connectors, database CDC with an ingestion gateway, Kafka and other message buses, JDBC, ODBC and REST from notebooks, and how to pick an ingestion method.
---

## Lakeflow Connect

Lakeflow Connect is the ingestion part of Lakeflow. It offers two families of connectors:

| | Managed connectors | Standard connectors |
|---|---|---|
| Sources | SaaS applications (Salesforce, Workday, ServiceNow, Google Analytics, SharePoint and others) and databases (SQL Server, MySQL, PostgreSQL and others) | Cloud object storage, SFTP, message buses (Kafka, Kinesis, Event Hubs, Pub/Sub, Pulsar) |
| What you build | Nothing but configuration: Databricks runs a managed, incremental ingestion pipeline | Your own pipeline or stream (Auto Loader, `read_kafka`, Structured Streaming) |
| Output | Streaming tables in Unity Catalog | Whatever your code writes |
| Control | Low effort, less customisation | More control over parsing and transformation |

### Managed connectors in practice

- You create the ingestion from the UI (*Data ingestion*), the API, or a bundle. Behind it is a **serverless declarative pipeline** that writes **streaming tables**; scheduling it creates a Lakeflow job.
- Credentials live in a Unity Catalog **connection** (`CREATE CONNECTION`). Someone with `USE CONNECTION` can build ingestion pipelines without ever seeing the secret.
- Ingestion is **incremental**: after the first full snapshot only changes are read.
- History tracking is off by default (**SCD type 1**: rows are updated in place). Connectors that support it can keep **SCD type 2** history.
- A **full refresh** reloads everything and discards the SCD type 2 history.
- **Deleting the ingestion pipeline deletes the tables it manages.**

### Database connectors and the ingestion gateway

Database connectors (SQL Server, MySQL, PostgreSQL) use two parts:

1. An **ingestion gateway** that runs continuously on classic compute close to the database, reads the initial snapshot and then the change log (SQL Server change tracking or CDC, MySQL binlog, PostgreSQL logical replication), and stages the data in a Unity Catalog volume.
2. An **ingestion pipeline** (serverless) that applies the staged snapshots and changes to the streaming tables on its schedule.

The source must have change capture enabled, and the gateway must keep running: if it stops for too long, the database may purge change log entries that were never read, forcing a full refresh.

## Message buses

Kafka, Kinesis, Event Hubs (through its Kafka endpoint) and Pub/Sub are read with Structured Streaming or with streaming tables.

```python
raw = (spark.readStream.format("kafka")
         .option("kafka.bootstrap.servers", "broker1:9092")
         .option("subscribe", "orders")
         .option("startingOffsets", "earliest")
         .load())                                  # key, value (binary), topic, partition, offset, timestamp
orders = raw.select(F.col("value").cast("string").alias("json"), "timestamp")
```

```sql
CREATE OR REFRESH STREAMING TABLE bronze_orders AS
SELECT CAST(value AS STRING) AS json, timestamp
FROM STREAM read_kafka(bootstrapServers => 'broker1:9092', subscribe => 'orders');
```

- `value` arrives as binary: cast it, then parse it (`from_json` or `parse_json` into VARIANT).
- Kafka keeps messages for a limited time. A **full refresh** of a streaming table truncates it and rereads only what Kafka still holds, so older data is lost. Guard bronze tables from full refreshes in that case (pipeline table property `pipelines.reset.allowed = false`).
- Applications that need to **push** records straight into Delta tables, without running a broker, can use **Zerobus Ingest**, the push-based API of Lakeflow Connect.

## JDBC, ODBC and REST from notebooks

When no managed connector exists, write the ingestion yourself in a notebook or Python task and schedule it with Lakeflow Jobs.

### JDBC

```python
jdbc_url = "jdbc:postgresql://ops-db:5432/shop"
orders = (spark.read.format("jdbc")
    .option("url", jdbc_url)
    .option("dbtable", "(SELECT * FROM orders WHERE updated_at > '2026-11-20') AS src")
    .option("user", dbutils.secrets.get("ops", "pg_user"))
    .option("password", dbutils.secrets.get("ops", "pg_password"))
    .option("partitionColumn", "order_id")
    .option("lowerBound", 1).option("upperBound", 5_000_000)
    .option("numPartitions", 8)
    .option("fetchsize", 10_000)
    .load())
```

- Credentials come from a **secret scope** or a Unity Catalog connection, never from code.
- `partitionColumn`, `lowerBound`, `upperBound` and `numPartitions` split the read into parallel queries. The bounds only set the **stride** of the partitions; they do **not filter** rows. Filter with a `WHERE` inside the `dbtable` subquery.
- The `query` option cannot be combined with `partitionColumn`; use a `dbtable` subquery instead.
- For incremental loads, keep a **high-water mark** (for example the last `updated_at` loaded) in a control table, read only newer rows, and `MERGE` them into the target.

### ODBC

ODBC drivers must be installed on the machines, usually with an init script. Serverless does not run init scripts, so ODBC ingestion needs classic compute.

### REST APIs

- Keep tokens in a secret scope.
- Handle **pagination** and **rate limits** (retry with exponential backoff on HTTP 429).
- Write raw responses as files to a **volume** (not to local `/tmp` on the driver, which disappears), then load them with Auto Loader or `COPY INTO`. Raw files give you replay and lineage.
- Schedule with Lakeflow Jobs and use job retries for transient errors.

## Partner tools

**Partner Connect** sets up tools such as Fivetran with a few clicks. The partner writes through its own service principal, which **owns** the tables it creates, so your users need explicit grants before they can read them.

## Choosing an ingestion method

Databricks' order of preference: a **managed connector** if one exists, then a **declarative pipeline** with standard connectors, then **Structured Streaming** code, then fully custom code.

| Scenario | Method |
|---|---|
| Salesforce, Workday, ServiceNow; no API code to maintain | Managed connector |
| Continuous replication of SQL Server, MySQL or PostgreSQL with CDC | Database managed connector (gateway + pipeline) |
| A database with no connector, nightly incremental extract | JDBC notebook in a scheduled job, with a high-water mark |
| Occasional queries on an operational database without copying | Lakehouse Federation (see *Sharing, Clean Rooms and Federation*) |
| Events in Kafka or Kinesis with low latency | Structured Streaming or a streaming table with `read_kafka` |
| Files in cloud storage | Auto Loader or `COPY INTO` (see *Ingesting files*) |
| Data held by another Databricks customer | OpenSharing instead of a copy |
| Heavy, repeated queries that are slow over federation | Ingest the data with Lakeflow Connect |

## Exam traps

!!! trap "JDBC bounds do not filter"
    `lowerBound` and `upperBound` decide how the table is split across partitions. Every row is still read.

!!! trap "Without copying"
    "Query without copying the data" points to Lakehouse Federation (databases) or OpenSharing (another organisation), never to an ingestion tool.

!!! trap "Deleting a managed ingestion pipeline"
    The streaming tables it created are deleted with it.

!!! tip "Do not stop the gateway"
    A database connector's gateway runs continuously; stopping it risks losing unread change log entries.

## Hands-on

Free Edition has no external database, but you can practise the patterns:

1. Store a fake token in a secret scope with the CLI (`databricks secrets create-scope lab`, `databricks secrets put-secret lab token`) and read it with `dbutils.secrets.get`.
2. Call a public REST API with `requests` (for example a paginated open data API), write each page as a JSON file to a volume, then load the folder with Auto Loader.
3. Read `samples.tpch.orders` with `spark.read.table`, write it to a new table, and implement a high-water-mark incremental load with a control table and `MERGE`.
