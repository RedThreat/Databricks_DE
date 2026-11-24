---
id: governance
title: Unity Catalog and access control
group: Governance
order: 19
summary: The object hierarchy, managed versus external tables and volumes, storage credentials and external locations, privileges and inheritance, ownership and MANAGE, workspace permissions, tags, comments and discovery.
---

## The object hierarchy

```
metastore (one per region, attached to many workspaces)
└── catalog
    └── schema
        ├── tables, views, materialized views, streaming tables, metric views
        ├── volumes (files)
        ├── functions
        └── models
```

Objects are addressed with three levels: `catalog.schema.object`. Other securables sit beside the hierarchy: **storage credentials**, **external locations**, **connections** (federation and connectors), **shares**, **recipients**, **providers** and **clean rooms**.

- Each workspace usually gets a **workspace catalog** (with a `default` schema) that all its users can use; `hive_metastore` is the legacy pre-Unity Catalog store; `system` holds system tables; `samples` holds sample data.
- A catalog can be **bound** to specific workspaces, so a production catalog is only reachable from production workspaces.
- Grants are stored in the metastore, so they apply in every workspace attached to it.

## Managed and external objects

| | Managed table | External table |
|---|---|---|
| Where the files live | Managed storage chosen by Unity Catalog (set per metastore, catalog or schema with `MANAGED LOCATION`) | A path you give with `LOCATION`, inside an external location |
| Formats | Delta or Iceberg | Delta, Parquet, CSV, JSON, Avro, ORC, text |
| `DROP TABLE` | Deletes metadata **and data** (recoverable with `UNDROP` for 7 days) | Deletes **metadata only**; files stay |
| Predictive optimization, automatic clustering | Yes | No |
| Recommended | Yes: less maintenance, better performance | When other systems must own or read the files directly |

```sql
CREATE TABLE main.sales.orders (order_id BIGINT, amount DECIMAL(10,2));      -- managed

CREATE TABLE main.raw.events_csv (id INT, payload STRING)
USING CSV OPTIONS (header 'true')
LOCATION 'abfss://raw@account.dfs.core.windows.net/events/';                 -- external

ALTER TABLE main.raw.legacy_orders SET MANAGED;   -- convert external to managed in place
SHOW TABLES DROPPED IN main.sales;
UNDROP TABLE main.sales.orders;
DROP SCHEMA main.tmp CASCADE;                       -- RESTRICT (the default) fails if not empty
```

- `ALTER TABLE ... SET MANAGED` moves an external table into managed storage **keeping its name, history and grants**; `UNSET MANAGED` can roll it back for a limited time. There is no managed-to-external conversion. A `CREATE TABLE AS SELECT` copy would lose history and grants.
- `UNDROP` brings a dropped table back with its grants and properties, if its schema and catalog still exist. Catalogs, schemas, views, volumes and functions cannot be undropped.
- To check whether a table is managed or external: `DESCRIBE TABLE EXTENDED` (field *Type*), Catalog Explorer, or `information_schema.tables.table_type`.
- **Volumes** hold non-tabular files under `/Volumes/catalog/schema/volume/`. Managed volumes live in managed storage; external volumes point to a path in an external location.

**Storage credentials and external locations.** A storage credential wraps a cloud identity (an IAM role, a managed identity, a service account). An external location combines a credential with a cloud path. External tables, external volumes and managed storage locations must be inside external locations, and paths may not overlap.

## Privileges

| Privilege | Allows |
|---|---|
| `USE CATALOG`, `USE SCHEMA` | Traversing the catalog and schema; required for any access to objects inside |
| `BROWSE` | Seeing objects and metadata in Catalog Explorer without reading data |
| `SELECT` | Reading tables, views and materialized views |
| `MODIFY` | Inserting, updating and deleting rows |
| `CREATE SCHEMA`, `CREATE TABLE`, `CREATE VOLUME`, `CREATE FUNCTION`, `CREATE MATERIALIZED VIEW` | Creating objects in a catalog or schema |
| `READ VOLUME`, `WRITE VOLUME` | Reading and writing files in a volume |
| `READ FILES`, `WRITE FILES`, `CREATE EXTERNAL TABLE`, `CREATE EXTERNAL VOLUME` | Working with paths in an external location |
| `EXECUTE` | Calling a function (including masks and filters) or a model |
| `USE CONNECTION`, `CREATE FOREIGN CATALOG` | Using a connection (federation, connectors) without seeing its credentials |
| `CREATE SHARE`, `CREATE RECIPIENT` (on the metastore) | Creating shares and recipients without being metastore admin |
| `APPLY TAG` | Setting tags on an object |
| `MANAGE` | Managing privileges, transferring ownership, renaming and dropping an object, **without** data access |
| `ALL PRIVILEGES` | Every privilege applicable at that level, except `MANAGE` (and the external-engine privileges) |

```sql
GRANT USE CATALOG ON CATALOG main TO `analysts`;
GRANT USE SCHEMA, SELECT ON SCHEMA main.sales TO `analysts`;
GRANT USE SCHEMA, SELECT, MODIFY, CREATE TABLE ON SCHEMA main.silver TO `etl-sp-app-id`;
REVOKE SELECT ON SCHEMA main.sales FROM `analysts`;
SHOW GRANTS ON SCHEMA main.sales;
```

**Rules that decide answers:**

- **Inheritance flows down**: a privilege on a catalog or schema applies to every current **and future** object inside. Privileges on the metastore are not inherited.
- To read a table you need all three: `USE CATALOG` on its catalog, `USE SCHEMA` on its schema and `SELECT` on the table (or a parent).
- **`REVOKE` acts only at the level where you run it.** Revoking `SELECT` on a table does not remove `SELECT` granted on its schema, and gives no error. Revoke at the level of the original grant.
- **There is no `DENY` in Unity Catalog.** Anything not granted is denied. `DENY` existed only in legacy `hive_metastore` table ACLs. To exclude one person from what their group can read, restructure the grants (for example, grant to a smaller group).
- Grant to **account groups** and **service principals** (by application ID), not to individuals or workspace-local groups.
- Only the owner of a catalog or schema (or someone with `MANAGE`) can grant `USE CATALOG` and `USE SCHEMA` on it, so table owners cannot open access beyond approved boundaries.

**Ownership.** The creator of an object is its owner. The owner has all privileges on it, can grant them to others and can drop it. Transfer ownership of production objects to a group or a service principal (``ALTER TABLE t SET OWNER TO `data-platform` ``). A schema owner does not automatically have privileges on tables created by others in it, but can grant them to themselves.

**Least privilege examples**

| Requirement | Grant |
|---|---|
| Analysts read one schema, never write | `USE CATALOG`, `USE SCHEMA`, `SELECT` |
| A team creates tables in one schema only | `USE CATALOG`, `USE SCHEMA`, `CREATE TABLE` on that schema |
| A pipeline reads bronze and writes silver | `USE CATALOG`; `USE SCHEMA` + `SELECT` on bronze; `USE SCHEMA` + `SELECT` + `MODIFY` + `CREATE TABLE` on silver |
| A project group creates and manages its own schemas in a catalog but must not rename, drop or transfer the catalog | `ALL PRIVILEGES` on the catalog (no ownership, no `MANAGE`) |
| See what exists without reading data | `BROWSE` |
| Administer grants without reading data | `MANAGE` |

## Workspace object permissions

Unity Catalog governs data. Workspace objects have their own access control lists:

| Object | Levels (lowest to highest) |
|---|---|
| Notebooks, files, folders | CAN READ, CAN RUN, CAN EDIT, CAN MANAGE |
| Jobs | CAN VIEW, CAN MANAGE RUN, IS OWNER, CAN MANAGE |
| Clusters | CAN ATTACH TO, CAN RESTART, CAN MANAGE |
| SQL warehouses | CAN USE, CAN MONITOR, CAN MANAGE, IS OWNER |
| Git folders | CAN READ, CAN RUN, CAN EDIT, CAN MANAGE |

Give each person the lowest level their job needs, and run production jobs as a service principal.

## Discovery: comments, tags and lineage

```sql
COMMENT ON TABLE main.sales.orders IS 'One row per order line, loaded hourly';
ALTER TABLE main.sales.orders ALTER COLUMN amount COMMENT 'Gross amount in EUR';
ALTER TABLE main.sales.orders SET TAGS ('domain' = 'sales', 'certified' = 'true');
ALTER TABLE main.sales.orders ALTER COLUMN email SET TAGS ('pii' = 'email');
SELECT * FROM main.information_schema.column_tags WHERE tag_name = 'pii';
```

- **Comments** describe objects and columns; Catalog Explorer can **generate comments with AI** for many tables at once, for review before saving.
- **Tags** (key-value) classify catalogs, schemas, tables, views, volumes and columns; search and filters use them. **Governed tags** have an account-level policy of allowed values and who may assign them; they drive ABAC policies (see *Data privacy*).
- **Lineage** is captured automatically down to the column level and shown in Catalog Explorer (see *Monitoring*).
- `information_schema` views (`tables`, `columns`, `table_privileges`, `column_tags`…) in each catalog let you query metadata with SQL.

## Exam traps

!!! trap "DENY does not exist"
    The Associate exam guide lists `GRANT`, `REVOKE` and `DENY`. In Unity Catalog, `DENY` is not a command; not granted means denied.

!!! trap "REVOKE does not remove inherited access"
    Revoke where the privilege was granted.

!!! trap "DROP on external tables"
    Only metadata is removed; the files remain in the external location.

!!! tip "Three keys to read"
    `USE CATALOG` + `USE SCHEMA` + `SELECT`. A user who sees the schema but cannot query usually lacks `SELECT`; a user with `SELECT` who cannot even see the table usually lacks a `USE` privilege.

## Hands-on

1. Create `workspace.gov_lab` with a managed table and a volume. Run `DESCRIBE TABLE EXTENDED` and find the *Type* field.
2. Drop the table, list it with `SHOW TABLES DROPPED`, and `UNDROP` it.
3. Add comments and tags, then query `information_schema.column_tags`.
4. If you have a second user or a service principal, grant `USE CATALOG`, `USE SCHEMA` and `SELECT`, revoke at the table level only, and confirm access remains.
