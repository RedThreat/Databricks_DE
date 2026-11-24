<!-- Practice questions for the topic 'governance'. Format: see README.md. -->

## site-129
exam: A7 P7
topic: governance
level: A
source: site

A schema owner grants `SELECT` on `finance.reporting.invoices` to the auditors, but they still get a permission error. What is missing?

- [ ] `ALL PRIVILEGES` on the table :: Far more than needed, and still not enough without the parents.
- [x] `USE CATALOG` on `finance` and `USE SCHEMA` on `finance.reporting` :: Correct. Every access needs the usage privileges on the parents; only their owners (or `MANAGE` holders) can grant them.
- [ ] `MODIFY` on the table :: Write access is unrelated to reading.
- [ ] `BROWSE` on the metastore :: Metadata visibility, not data access.

> Reading = `USE CATALOG` + `USE SCHEMA` + `SELECT`.

## sa-12
exam: A7
topic: governance
level: A
source: sa

An analyst can see the catalog and the schema in Catalog Explorer, but every `SELECT` on its tables returns a permission error. What is the most likely explanation?

- [x] The analyst has `USE CATALOG` and `USE SCHEMA` but lacks `SELECT` on the tables :: Correct. Usage privileges let you navigate; reading is a separate privilege.
- [ ] The metastore is not attached to the workspace :: Then the catalog would not be visible at all.
- [ ] The tables are corrupted :: Corruption gives read errors, not permission errors.
- [ ] `REFRESH` must be run on the catalog :: The issue is authorisation, not a metadata cache.

> Seeing that something exists and reading it are different privileges.

## sa-06
exam: A7 P6
topic: governance
level: A
source: sa

Pharmaceutical analysts must query the tables of the clinical trials catalog but must not change any data. Which privilege on the tables gives exactly that?

- [x] `SELECT` :: Correct. Read access and nothing more: least privilege.
- [ ] `MODIFY` :: Allows inserts, updates and deletes, exactly what is forbidden.
- [ ] `ALL PRIVILEGES` :: Includes every write and create privilege.
- [ ] `USE SCHEMA` :: Only lets you traverse the schema; on its own it reads nothing.

> Traverse with `USE`, read with `SELECT`, write with `MODIFY`.

## sa-07
exam: A7 P6
topic: governance
level: A
source: sa

A logistics team must create tables inside the schema `operations.routes`. It must not create new schemas or catalogs. What is the minimum set of grants?

- [x] `USE CATALOG` on `operations`, `USE SCHEMA` and `CREATE TABLE` on `operations.routes` :: Correct. Traverse the catalog, traverse the schema, create tables there. Nothing more.
- [ ] `CREATE CATALOG` and `CREATE TABLE` on `operations.routes` :: Creating catalogs goes far beyond the request, and `USE SCHEMA` is missing.
- [ ] `USE CATALOG` on `operations` and `CREATE SCHEMA` on `operations.routes` :: Allows new schemas, which is excluded, and does not allow creating tables.
- [ ] `ALL PRIVILEGES` on the catalog :: Grants everything, including dropping other teams' objects.

> "Least privilege" answers never include `CREATE SCHEMA` or `CREATE CATALOG` for a create-table task.

## site-088
exam: A7 P7
topic: governance
level: A
source: site

A privilege is granted on a schema. Which objects does it apply to?

- [ ] Only tables that existed at grant time :: Future objects are included.
- [x] All current and future objects in the schema :: Correct. Privileges are inherited downward.
- [ ] Only views :: All object types in the schema.
- [ ] Only the schema itself :: Inheritance applies to its children.

> Grants on catalogs and schemas flow down to current and future objects.

## site-041
exam: A7 P7
topic: governance
level: A
source: site

A user has `SELECT` through a grant on the schema. An admin runs `REVOKE SELECT ON TABLE t FROM user`. What is the result?

- [ ] The user loses access to `t` :: The schema-level grant still applies.
- [ ] The command fails :: It succeeds and changes nothing.
- [x] The user still has access to `t` through the schema-level grant :: Correct. Revoke at the level where the privilege was granted.
- [ ] The user loses access to the whole schema :: A table-level revoke cannot affect the schema.

> `REVOKE` only removes grants at the level where you run it.

## site-042
exam: A7
topic: governance
level: A
source: site

An admin wants to block one user explicitly from a table with `DENY` in Unity Catalog. What should they know?

- [ ] `DENY` overrides any `GRANT` :: There is no `DENY` in Unity Catalog.
- [x] `DENY` does not exist in Unity Catalog; anything not granted is denied :: Correct. Restructure grants (for example a smaller group) to exclude someone.
- [ ] `DENY` only works on views :: It does not exist.
- [ ] `DENY` must be combined with `REVOKE` :: It does not exist.

> `DENY` belonged to legacy `hive_metastore` table ACLs. Unity Catalog is grant-only.

## new-gov-01
exam: A7 P6
topic: governance
level: A
source: new

The group `sales` has `SELECT` on schema `main.crm`. One contractor in that group must not read `main.crm.contracts`, while everyone else keeps access. What works in Unity Catalog?

- [ ] `DENY SELECT ON TABLE main.crm.contracts TO contractor` :: `DENY` does not exist.
- [ ] `REVOKE SELECT ON TABLE main.crm.contracts FROM contractor` :: The contractor still inherits `SELECT` from the schema grant through the group.
- [x] Restructure the grants: grant on the schema to a group without the contractor (or grant table by table), so the contractor is never granted that table :: Correct.
- [ ] Add a row filter that hides all rows from the contractor :: Possible as a workaround, but grants are the right tool for access to a table.

> Exclusions are designed with group structure, not with deny rules.

## site-089
exam: A7 P6
topic: governance
level: A
source: site

To which principals should privileges be granted in Unity Catalog?

- [ ] Workspace-local groups :: Not usable for Unity Catalog grants across workspaces.
- [x] Account-level groups and service principals :: Correct. Service principals are referenced by their application ID.
- [ ] Only individual users :: Hard to maintain as people join and leave.
- [ ] Only the metastore admin :: Others need access too.

> Grant to account groups and service principals.

## site-084
exam: A7 P7
topic: governance
level: A
source: site

A group should be able to see table names and metadata in Catalog Explorer, but NOT read data. Which privilege?

- [ ] `SELECT` :: Reads data.
- [x] `BROWSE` :: Correct. Shows objects and metadata without data access.
- [ ] `MODIFY` :: Writes data.
- [ ] `USE CONNECTION` :: Uses connections for federation and connectors.

> Discovery without data: `BROWSE`.

## new-gov-02
exam: A7 P6
topic: governance
level: A
source: new

A security officer must manage grants on the `finance` catalog (grant, revoke, transfer ownership) but must not be able to read the data. Which privilege fits?

- [ ] `ALL PRIVILEGES` :: Includes `SELECT` and `MODIFY`, and still not `MANAGE`.
- [x] `MANAGE` :: Correct. It allows managing privileges, transferring ownership, renaming and dropping, without data access.
- [ ] Ownership of the catalog :: Owners have all privileges, including reading.
- [ ] `BROWSE` :: Metadata only; cannot grant.

> `MANAGE` = administration without data access.

## sp-31
exam: P6 A7
topic: governance
level: P
source: sp

A project group must create and manage schemas, tables and volumes in a catalog and give colleagues access to what it creates, but must not rename, drop or transfer ownership of the catalog. What should be granted?

- [x] `ALL PRIVILEGES` on the catalog :: Correct. It implies every catalog-level privilege (create schemas, tables, volumes, read, write) but not `MANAGE`; the group owns what it creates and can grant on it, while renaming or dropping the catalog needs ownership or `MANAGE`.
- [ ] Make the group the owner of the catalog :: The owner can rename and drop it, which is to be avoided.
- [ ] `USE CATALOG` and `USE SCHEMA` :: Only navigation.
- [ ] `SELECT` on the catalog :: Read only.

> `ALL PRIVILEGES` does not include `MANAGE` or ownership.

## site-090
exam: A7 P6
topic: governance
level: A
source: site

A group must use a masking function defined in Unity Catalog. Which privilege on the function?

- [ ] `SELECT` :: Applies to tables and views.
- [x] `EXECUTE` :: Correct. Functions and models are used with `EXECUTE`.
- [ ] `MODIFY` :: Applies to table data.
- [ ] `USE SCHEMA` only :: Needed, but not sufficient.

> Functions: `EXECUTE`.

## site-045
exam: A7
topic: governance
level: A
source: site

A group needs to read files stored in a Unity Catalog volume. Which privilege is required, besides `USE CATALOG` and `USE SCHEMA`?

- [ ] `SELECT` :: For tables and views.
- [x] `READ VOLUME` :: Correct. Volumes use `READ VOLUME` and `WRITE VOLUME`.
- [ ] `READ FILES` :: For paths in external locations.
- [ ] `BROWSE` :: Metadata only.

> Volumes: `READ VOLUME` / `WRITE VOLUME`. External locations: `READ FILES` / `WRITE FILES`.

## new-gov-03
exam: A7 P6
topic: governance
level: A
source: new

A service principal runs a pipeline that reads `main.bronze` tables and writes new tables in `main.silver`. Which grants follow least privilege?

- [ ] `ALL PRIVILEGES` on the `main` catalog :: Far more than needed.
- [x] `USE CATALOG` on `main`; `USE SCHEMA` and `SELECT` on `main.bronze`; `USE SCHEMA`, `SELECT`, `MODIFY` and `CREATE TABLE` on `main.silver` :: Correct.
- [ ] `SELECT` on both schemas only :: Cannot traverse the catalog or write silver.
- [ ] Ownership of both schemas :: Includes dropping them.

> Least privilege per layer: read where you read, write where you write.

## site-040
exam: A7
topic: governance
level: A
source: site

What happens when you run `DROP TABLE` on an EXTERNAL table in Unity Catalog?

- [ ] Metadata and data files are deleted :: That is the managed table behaviour.
- [x] Only the metadata is removed; the data files remain in the external location :: Correct.
- [ ] Nothing; external tables cannot be dropped :: They can.
- [ ] The table becomes managed :: Dropping never converts a table.

> External: drop metadata only. Managed: drop data too (recoverable with `UNDROP` for 7 days).

## site-086
exam: A7
topic: governance
level: A
source: site

A MANAGED table was dropped by mistake two days ago. What can recover it?

- [ ] `RESTORE TABLE` :: Restores a version of an existing table, not a dropped one.
- [x] `UNDROP TABLE` :: Correct. Dropped tables can be recovered for 7 days, with their grants and properties.
- [ ] `VACUUM` :: Deletes files; the opposite.
- [ ] It cannot be recovered :: It can, within 7 days.

> `UNDROP` within 7 days; `SHOW TABLES DROPPED` lists candidates.

## site-134
exam: A7 P5
topic: governance
level: A
source: site

You need to move an external Delta table to managed storage while keeping its name, permissions and history. Which command?

- [ ] `CREATE TABLE new AS SELECT * FROM old` :: A new table without history or grants.
- [x] `ALTER TABLE t SET MANAGED` :: Correct. Converts in place and keeps name, grants and history.
- [ ] `ALTER TABLE t SET EXTERNAL` :: There is no managed-to-external conversion for Unity Catalog tables.
- [ ] `CONVERT TO DELTA` :: Turns Parquet into Delta; does not change managed or external.

> `SET MANAGED` brings external tables into managed storage, unlocking predictive optimization.

## new-gov-04
exam: A7 P5
topic: governance
level: A
source: new

A team creates new Delta tables that only Databricks reads and writes. It wants the least maintenance and the best performance over time. Which table type should it use?

- [x] Unity Catalog managed tables :: Correct. Predictive optimization, automatic clustering and file sizing, metadata caching and `UNDROP` come with them.
- [ ] External tables in a team-owned path :: Need their own maintenance jobs and get no predictive optimization.
- [ ] Parquet tables without Delta :: Lose transactions and history.
- [ ] Tables in `hive_metastore` :: Legacy, outside Unity Catalog governance.

> Default to managed tables; use external tables when other systems must own the files.

## new-gov-05
exam: A7
topic: governance
level: A
source: new

Which command shows whether `main.sales.orders` is a managed or an external table?

- [ ] `DESCRIBE HISTORY main.sales.orders` :: Shows versions and operations.
- [x] `DESCRIBE TABLE EXTENDED main.sales.orders` (the *Type* row), or `information_schema.tables` :: Correct.
- [ ] `SHOW GRANTS ON TABLE main.sales.orders` :: Shows privileges.
- [ ] `OPTIMIZE main.sales.orders` :: Compacts files.

> Table type: `DESCRIBE TABLE EXTENDED`, Catalog Explorer or `information_schema.tables`.

## new-gov-06
exam: A7
topic: governance
level: A
source: new

To create an external table on `abfss://raw@acct.dfs.core.windows.net/events/`, what must exist in Unity Catalog first?

- [ ] A volume on that path :: Volumes hold files; a table needs an external location.
- [x] A storage credential for the cloud identity and an external location covering that path, plus `CREATE EXTERNAL TABLE` on the location :: Correct.
- [ ] A connection of type `abfss` :: Connections are for databases and services.
- [ ] Nothing; any path can be used directly :: Unity Catalog governs access to storage paths.

> Storage credential (identity) + external location (path) = governed access to cloud storage.

## site-091
exam: A1 P7
topic: governance
level: A
source: site

A development workspace and an analytics workspace in the same region both need the governed `sales` catalog with the same permissions. What is the recommended approach?

- [ ] Deep clone the tables into each workspace :: Two copies of the truth.
- [x] Attach both workspaces to the region's single Unity Catalog metastore :: Correct. The catalog appears in both, and grants apply in both.
- [ ] Create a second metastore for the analytics workspace :: One metastore per region is the model.
- [ ] Share the catalog with OpenSharing between the two workspaces :: Sharing is for other metastores or organisations.

> Same region, same metastore, same data and grants.

## new-gov-07
exam: P6 P7
topic: governance
level: P
source: new

The `prod` catalog must only be accessible from the production workspace, even though development workspaces are attached to the same metastore. What do you configure?

- [ ] Separate metastores per workspace :: One metastore per region; not the tool for this.
- [x] Bind the `prod` catalog to the production workspace (workspace-catalog binding) :: Correct. Other workspaces cannot access it, whatever the user's grants.
- [ ] Revoke all grants in development :: Users with grants could still reach it from any attached workspace.
- [ ] A row filter on every table :: Filters rows by user, not by workspace.

> Workspace bindings limit which workspaces can reach a catalog.

## sp-56
exam: P6
topic: governance
level: P
source: sp

When configuring job permissions under least privilege, what should you do?

- [x] Give each user only the level their role needs, such as Can View or Can Manage Run :: Correct.
- [ ] Give everyone Can Manage to avoid support tickets :: Lets anyone change or delete jobs.
- [ ] Give everyone Can Manage Run and one group Can Manage :: Running every job without need is still too much.
- [ ] Use only folder permissions, never per-job permissions :: Loses per-job control.

> Workspace objects have their own ACLs; apply least privilege there too.

## new-gov-08
exam: A7 P6
topic: governance
level: A
source: new

A table created by an engineer who is leaving the company feeds production. What should be done with it?

- [ ] Nothing; tables do not have owners :: Every securable has an owner.
- [x] Transfer ownership to a group or service principal (`ALTER TABLE ... SET OWNER TO ...`) :: Correct. Production objects should not depend on one person's account.
- [ ] Recreate it with `CREATE TABLE AS SELECT` :: Loses history and grants.
- [ ] Grant `ALL PRIVILEGES` to the replacement engineer :: Ownership stays with the departing person.

> Production ownership belongs to groups or service principals.

## sp-32
exam: P7
topic: governance
level: P
source: sp

In a workspace where Unity Catalog was enabled automatically, new users can create tables in the `default` schema of the workspace catalog but cannot read its other schemas. Why?

- [x] They received `USE CATALOG` plus privileges on the `default` schema only :: Correct. Other schemas need explicit grants.
- [ ] Unity Catalog has no privilege inheritance :: It does: grants on catalogs and schemas are inherited.
- [ ] They lack `BROWSE` :: `BROWSE` shows metadata; it does not explain data access.
- [ ] Schemas created by other users are always private :: No such automatic rule.

> The workspace catalog gives every user `USE CATALOG`; everything else must be granted.

## sp-37
exam: P7
topic: governance
level: P
source: sp

Which command adds a tag to a table in Unity Catalog?

- [x] `ALTER TABLE t SET TAGS ('domain' = 'finance')` :: Correct.
- [ ] `COMMENT ON TABLE t TAGS ('domain' = 'finance')` :: `COMMENT` sets the description.
- [ ] `APPLY TAGS ON t VALUES (...)` :: Not a command.
- [ ] `SET TAGS FOR t AS (...)` :: Not a command.

> `SET TAGS` / `UNSET TAGS` on catalogs, schemas, tables, volumes and columns.

## new-gov-09
exam: P7
topic: governance
level: P
source: new

A data steward wants a list of every column tagged `pii` across the `crm` catalog. What is the quickest way?

- [ ] Open each table in Catalog Explorer :: Slow for hundreds of tables.
- [x] Query `crm.information_schema.column_tags WHERE tag_name = 'pii'` :: Correct. Tags are queryable metadata.
- [ ] `DESCRIBE HISTORY` on every table :: History does not list tags.
- [ ] `SHOW GRANTS ON CATALOG crm` :: Lists privileges, not tags.

> `information_schema` makes tags and comments queryable.

## sp-38
exam: P7
topic: governance
level: P
source: sp

There are hundreds of legacy tables without column descriptions. How can comments be produced at scale with AI?

- [x] In Catalog Explorer, use AI-generated comments and review them before saving :: Correct. Suggestions are based on names, types and sample patterns.
- [ ] `DESCRIBE HISTORY` :: Shows operations, not meaning.
- [ ] `df.describe()` :: Numeric statistics, not descriptions.
- [ ] Write every comment by hand with `COMMENT ON COLUMN` :: Works, but takes months for thousands of columns.

> Comments and tags make data discoverable; AI suggestions speed up documentation.

## sa-08
exam: A7 P7
topic: governance
level: A
source: sa

Before changing the type of a column in a heavily used table, an engineer wants to know which notebooks, jobs and dashboards depend on it. Which Unity Catalog feature gives this view?

- [x] Data lineage, which shows upstream and downstream dependencies :: Correct. Lineage is captured automatically for tables, columns, notebooks, jobs, dashboards and queries.
- [ ] The audit logs filtered by table name :: Record accesses over time, not a dependency graph.
- [ ] The Spark UI of the cluster that read the table :: Shows execution, not dependencies.
- [ ] The Delta table history :: Shows operations on the table, not who consumes it.

> Impact analysis = lineage. History = what happened to the table. Audit = who accessed it.

## sa-11
exam: A7 P6
topic: governance
level: A
source: sa

A data engineer manages several external tables whose files sit in different storage containers. Each team must access only the tables of its own domain. How should access be managed?

- [x] Grant privileges per object in Unity Catalog, table by table or schema by schema :: Correct. Unity Catalog governs external tables just like managed ones, with auditable SQL grants at any level.
- [ ] Set permissions on the storage containers in the cloud provider :: Coarse (all or nothing per container) and outside Unity Catalog governance and audit.
- [ ] Create one role with full access and give it to every team :: Removes the separation between domains that the requirement asks for.
- [ ] Grant permissions at workspace level so they apply to every table :: Far too broad; it cannot separate teams.

> An external table is still a Unity Catalog object. Managing access in the storage layer is the classic anti-pattern.
