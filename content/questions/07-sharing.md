<!-- Practice questions for the topic 'sharing'. Format: see README.md. -->

## sa-09
exam: A2 P2
topic: sharing
level: A
source: sa

A bank must join lakehouse tables with data in an internal PostgreSQL database. Auditors require the numbers to always reflect the current state of the source and forbid keeping a second copy of the data. Which approach meets both requirements?

- [x] Lakehouse Federation, with a connection and a foreign catalog in Unity Catalog :: Correct. Queries run against the source when they are executed: no copy, no lag.
- [ ] An incremental ingestion pipeline that replicates PostgreSQL every hour :: Creates the forbidden copy and up to an hour of lag.
- [ ] Export the tables to CSV and load them daily :: Manual, copied and a day late.
- [ ] Delta Sharing from PostgreSQL :: Sharing publishes Databricks tables to recipients; it does not query an external database.

> No copy + always current + external database = Lakehouse Federation.

## sp-36
exam: P2
topic: sharing
level: P
source: sp

What is the difference between a foreign catalog and an external location?

- [x] A foreign catalog exposes an external database for federated queries; an external location grants access to a cloud storage path :: Correct. One is for databases, the other for files in object storage.
- [ ] They are synonyms :: They serve different purposes.
- [ ] A foreign catalog copies the data into the metastore :: The data stays in the source.
- [ ] An external location is only for streaming :: It governs any access to a cloud path.

> Foreign catalog = database (federation). External location = storage path (files, external tables, volumes).

## sa-13
exam: P2
topic: sharing
level: A
source: sa

A hotel group wants to share occupancy tables with a consultancy that also uses Databricks with Unity Catalog, but in another account and another cloud. Which approach applies and what must the consultancy provide?

- [x] Databricks-to-Databricks sharing, using the sharing identifier of the consultancy's Unity Catalog metastore :: Correct. With Unity Catalog on both sides, sharing goes metastore to metastore; the identifier looks like `cloud:region:metastore-id`.
- [ ] Open sharing with a credential file :: It would work, but it is meant for recipients outside Databricks; D2D avoids managing tokens.
- [ ] Direct access to the storage container that holds the tables :: Exposes raw files and bypasses Unity Catalog governance and audit.
- [ ] Export to Parquet and transfer by SFTP every week :: Creates copies and lag, without object-level access control.

> The recipient's platform decides the mode: Databricks with Unity Catalog on both sides means D2D and a metastore sharing identifier.

## sa-14
exam: P2
topic: sharing
level: A
source: sa

The same company now needs to share a subset of those tables with a partner that uses another data platform and its own BI tools, without Databricks. How do they share securely?

- [x] OpenSharing with the open protocol (open sharing) :: Correct. Any compatible client can read through the REST-based protocol, with a credential, while access stays governed on the provider side.
- [ ] Databricks-to-Databricks sharing :: Requires a recipient with a Unity Catalog workspace, which the partner does not have.
- [ ] Mount the storage container in the partner's environment :: Raw file access, no per-table control, no audit on the provider side.
- [ ] Build a custom API to serve the tables :: Reinvents what sharing already does and adds code to maintain.

> Recipient on Databricks with Unity Catalog: D2D. Any other platform: open sharing.

## sa-15
exam: P2
topic: sharing
level: A
source: sa

Data is shared from an AWS account to a partner on Azure, and the monthly egress bill has grown a lot. The sharing works and will continue. Which strategy specifically reduces the egress cost?

- [x] Host the shared dataset in object storage that does not charge egress fees (or replicate it to the partner's region) :: Correct. The provider pays for bytes leaving its cloud; where the data lives is what removes the charge.
- [ ] Set up a VPN between the two clouds :: Improves security, but egress is still billed.
- [ ] Switch from D2D to open sharing :: The mode does not change the bytes crossing the cloud boundary.
- [ ] Compress the tables with a more aggressive codec :: A marginal gain with extra CPU cost; the fee remains.

> Egress cost is about where the data is stored, not how it is shared.

## new-sharing-01
exam: P2
topic: sharing
level: P
source: new

A retailer and a publisher, both on Databricks, want to measure how many customers they have in common. Neither company may see the other's customer records. What should they use?

- [ ] Each shares its customer table with the other through D2D sharing :: Both would see the other's raw records.
- [x] A clean room where each adds its table and both approve a notebook that outputs only the overlap counts :: Correct. Collaborators run approved code on combined data without direct access to each other's tables.
- [ ] Lakehouse Federation between the two workspaces :: Federation would give direct query access to the other side's data.
- [ ] Export hashed customer lists to CSV and email them :: Insecure and ungoverned, and the lists themselves are shared.

> "Neither side may see the other's data" = clean room.

## new-sharing-03
exam: P2
topic: sharing
level: P
source: new

A provider shares a table with a Databricks recipient through D2D sharing and wants the recipient to be able to read it as a stream and use time travel. How should the table be added to the share?

- [ ] As a view over the table :: A view does not carry the table's history.
- [x] `ALTER SHARE s ADD TABLE t WITH HISTORY` :: Correct. Sharing the table with history lets recipients query previous versions and read it incrementally as a stream.
- [ ] With `VACUUM` disabled on the recipient side :: The recipient cannot change the provider's table maintenance.
- [ ] As a deep clone in the recipient's metastore :: That is a copy, which sharing is meant to avoid.

> `WITH HISTORY` enables time travel and streaming reads for recipients.

## new-sharing-04
exam: P2
topic: sharing
level: P
source: new

After a D2D share is granted to their metastore, how do users at the recipient company start querying the shared tables?

- [ ] They must copy the tables into their own catalog first :: Shared data is read in place.
- [x] A recipient admin creates a catalog from the share (`CREATE CATALOG ... USING SHARE provider.share`) and grants their users access to it :: Correct. The shared catalog then behaves like a read-only catalog in their metastore.
- [ ] The provider adds each recipient user to the share :: The provider grants the share to the recipient (metastore); the recipient manages its own users.
- [ ] They download a credential file and use pandas :: That is the open sharing flow, not D2D.

> D2D: provider grants to the metastore; recipient mounts the share as a catalog and grants internally.

## sp-35
exam: P2
topic: sharing
level: P
source: sp

Which steps let you query an external PostgreSQL database directly from Databricks, without copying the data (Lakehouse Federation)?

- [x] Create a `CONNECTION`, then a `FOREIGN CATALOG` on it, then grant privileges in Unity Catalog :: Correct. Queries are federated; the data stays in the source.
- [ ] Create an external location and a storage credential :: Those govern cloud storage paths, not databases.
- [ ] Mirror everything with Auto Loader :: Copies data, and Auto Loader ingests files.
- [ ] Partner Connect with ACLs in PostgreSQL :: Keeps governance outside Unity Catalog.

> Federation = connection + foreign catalog + grants.

## sp-33
exam: P2 P6
topic: sharing
level: P
source: sp

Who can create OpenSharing shares without being a metastore admin?

- [x] Users granted the `CREATE SHARE` privilege on the metastore :: Correct. Share creation can be delegated precisely.
- [ ] Any user with `USE CATALOG` :: Only lets them reference the catalog.
- [ ] Any user with permission on a cluster :: Compute permissions do not allow sharing data.
- [ ] Only workspace admins :: Sharing is governed in the metastore, not by the workspace admin role.

> Shares and recipients are metastore-level securables: `CREATE SHARE`, `CREATE RECIPIENT`.
