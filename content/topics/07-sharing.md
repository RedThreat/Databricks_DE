---
id: sharing
title: Sharing, Clean Rooms and Federation
group: Ingestion
order: 7
summary: Using data without copying it - OpenSharing between organisations (Databricks-to-Databricks and open), Clean Rooms for private collaboration, and Lakehouse Federation for external databases.
---

## Three ways to use data without copying it

| Need | Feature |
|---|---|
| Give another organisation (or another metastore) live, read-only access to your tables | **OpenSharing** (formerly Delta Sharing) |
| Combine your data with a partner's data while neither side sees the other's raw records | **Clean Rooms** |
| Query an external database (PostgreSQL, SQL Server, Snowflake…) from Databricks, governed by Unity Catalog | **Lakehouse Federation** |

## OpenSharing

OpenSharing is an open protocol for sharing live data. The provider keeps the data; recipients read it directly, so there is no copy to keep in sync.

**Objects.** A **share** is a named collection of objects (tables, views, volumes, models, notebooks). A **recipient** represents who receives it. The provider grants the share to the recipient.

```sql
CREATE SHARE retail_share COMMENT 'Daily sales for partners';
ALTER SHARE retail_share ADD TABLE main.gold.daily_sales WITH HISTORY;   -- recipients can time travel and stream
ALTER SHARE retail_share ADD VIEW main.gold.eu_sales;                     -- share a subset through a view

CREATE RECIPIENT consultancy USING ID 'azure:westeurope:7f3e...';         -- Databricks-to-Databricks
CREATE RECIPIENT bi_partner;                                              -- open sharing
GRANT SELECT ON SHARE retail_share TO RECIPIENT consultancy;
```

### Two sharing modes

| | Databricks-to-Databricks (D2D) | Open sharing (Databricks-to-Open) |
|---|---|---|
| Recipient has | A Unity Catalog-enabled workspace (any cloud, any region, any account) | Any client: Spark, pandas, Power BI, Tableau, other platforms |
| Recipient identified by | The **sharing identifier** of their metastore: `cloud:region:metastore-uuid` | A credential: a bearer token from an activation link, or OIDC federation (no long-lived secret) |
| What can be shared | Tables, views, volumes, models, notebooks; history and streaming | Tables (and views), read through the protocol |
| On the recipient side | They create a catalog from the share (`CREATE CATALOG sales USING SHARE provider.retail_share`) and grant access to their own users | They use the credential in their client |

The recipient's platform decides the mode: Databricks with Unity Catalog means D2D; anything else means open sharing.

**Things to remember:**

- Shared data is read-only for recipients.
- The provider pays cloud **egress** when data leaves its cloud or region. To cut that cost, host the shared data in storage without egress fees or replicate it to the recipient's region; the sharing mode does not change the bytes transferred.
- You share a subset of rows or columns through a **view** (or partitions of a table).
- Databricks Marketplace is built on OpenSharing.

## Clean Rooms

A clean room is a secure, governed environment where several organisations bring data and run **approved code** on it, without any party seeing the others' raw data. It is built on OpenSharing and serverless compute.

- Each collaborator adds tables (or views) to the clean room; the others do not get direct access to them.
- Analysis runs as **notebooks that all collaborators approve**; results are written to **output tables** for the party that runs the notebook.
- Typical uses: measuring audience overlap between an advertiser and a publisher, joining customer lists by hashed identifiers, joint fraud analysis.

Choose a clean room when the requirement says *neither party may see the other's records*. Choose plain sharing when one party simply gives the other read access.

## Lakehouse Federation

Lakehouse Federation lets you query external databases in place. Unity Catalog governs access and records lineage and audit; the data stays in the source.

```sql
CREATE CONNECTION pg_ops TYPE postgresql
OPTIONS (host 'ops-db.internal', port '5432',
         user secret('ops', 'pg_user'), password secret('ops', 'pg_password'));

CREATE FOREIGN CATALOG ops USING CONNECTION pg_ops OPTIONS (database 'operations');

GRANT USE CATALOG, USE SCHEMA, SELECT ON CATALOG ops TO `analysts`;
```

- A **connection** stores the host and credentials once. Users who query the foreign catalog never see the credentials. Creating connections and foreign catalogs needs `CREATE CONNECTION` and `CREATE FOREIGN CATALOG` (and `USE CONNECTION` on the connection).
- A **foreign catalog** mirrors a database inside Unity Catalog; you grant on it like on any catalog.
- Filters and aggregates are **pushed down** to the source where possible, but performance and load depend on the source database.
- Good for ad hoc queries, proofs of concept, small reference data and "always current, never copied" requirements. For heavy, repeated workloads, ingest the data with Lakeflow Connect instead.
- **Catalog federation** is the variant for other metastores (Hive metastore, AWS Glue, Snowflake Horizon): Databricks reads the tables' files directly from object storage.

**Foreign catalog versus external location.** A foreign catalog exposes an external **database** for federated queries. An external location grants access to a **cloud storage path** for files and external tables.

## Choosing

| Requirement | Choose |
|---|---|
| Partner on Databricks with Unity Catalog needs live access to your tables | D2D sharing with their metastore sharing identifier |
| Partner on another platform, no Databricks | Open sharing (token or OIDC) |
| Two companies must match customers without exposing their lists | Clean room |
| Join lakehouse tables with an operational PostgreSQL, always current, no second copy allowed | Lakehouse Federation |
| Join with that database every five minutes on large volumes | Ingest with Lakeflow Connect (CDC) |

## Exam traps

!!! trap "Ask for the metastore, not the cluster"
    A D2D recipient is identified by its metastore sharing identifier. Cluster names, IP addresses or user credentials are never part of sharing.

!!! trap "Federation is not ingestion"
    Federation reads the source on every query; nothing is copied, so results are always current and the source carries the load.

!!! tip "Egress is about location"
    The cost of sharing across clouds or regions comes from where the data lives, not from the sharing mode.

## Hands-on

1. In Catalog Explorer, open **Delta Sharing** (*Shared with me*) and browse the providers available in your workspace, if any.
2. If your workspace allows it, create a share with one table and a view, and create an open sharing recipient to see the activation link flow.
3. Read the list of Lakehouse Federation connection types in the *Create connection* dialog to know which sources are supported.
