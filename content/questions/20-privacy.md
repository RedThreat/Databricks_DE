<!-- Practice questions for the topic 'privacy'. Format: see README.md. -->

## site-130
exam: A7 P6
topic: privacy
level: A
source: site

Sales staff are in account groups `sales_UK`, `sales_FR` and so on. Each team should see only its country's rows. Which row filter function body fits?

- [ ] `RETURN is_member('sales_' || country)` :: `is_member` checks workspace-local groups.
- [x] `RETURN is_account_group_member('sales_' || country)` :: Correct. One function on one table serves every team.
- [ ] `RETURN current_user() = country` :: Compares a user name with a country.
- [ ] `RETURN country IN (SELECT * FROM groups)` :: Not tied to the current user.

> Filters and masks check account groups with `is_account_group_member`.

## site-044
exam: A7
topic: privacy
level: A
source: site

Regional managers should only see rows whose `region` matches their own. What should be used?

- [ ] A column mask :: Changes values in a column, not which rows appear.
- [x] A row filter :: Correct. `ALTER TABLE t SET ROW FILTER f ON (region)`.
- [ ] A dynamic view with `SELECT *` :: `SELECT *` alone filters nothing.
- [ ] `OPTIMIZE ... ZORDER BY region` :: A layout command, not security.

> Hide rows: row filter. Hide values: column mask.

## site-043
exam: A7
topic: privacy
level: A
source: site

Only members of `hr_admins` should see the real salary column; everyone else should see NULL. What is the best solution?

- [ ] A copy of the table without the column :: Duplicates data and must be kept in sync.
- [x] A column mask function using `is_account_group_member('hr_admins')` :: Correct. `ALTER TABLE t ALTER COLUMN salary SET MASK f`.
- [ ] A row filter :: Hides rows, not values.
- [ ] Revoke `SELECT` from everyone :: Nobody could use the table.

> Per-group visibility of a column: column mask.

## sp-29
exam: P6 A7
topic: privacy
level: P
source: sp

In the `customers` table, the sales team may only see rows of its own region, and users outside `admins` must see emails masked, without duplicating data. Which solution?

- [x] A row filter and a column mask, defined as SQL functions and applied to the table :: Correct. Applied once to the table, enforced for every tool.
- [ ] One view per region :: More objects to maintain, and the base table stays unprotected.
- [ ] One copy of the table per region :: Duplicates data, which is forbidden.
- [ ] Filtering in the BI tool :: Security outside the data platform can be bypassed.

> Fine-grained access belongs on the table, not in copies or tools.

## sp-30
exam: A7 P6
topic: privacy
level: A
source: sp

Which command applies a masking function to a column of a Unity Catalog table?

- [x] `ALTER TABLE t ALTER COLUMN email SET MASK mask_email` :: Correct.
- [ ] `ALTER TABLE t SET ROW FILTER mask_email ON (email)` :: Filters rows instead of masking values.
- [ ] `GRANT MASK ON email TO analysts` :: Not a command.
- [ ] `CREATE MASKING POLICY ...` :: Syntax from other platforms.

> `SET MASK` on a column; `SET ROW FILTER` on a table.

## new-privacy-01
exam: A7
topic: privacy
level: A
source: new

A column mask hides the real `salary` from analysts. An analyst runs `SELECT * FROM employees WHERE salary > 100000`. What happens?

- [ ] The filter uses the real salary, so the analyst can infer hidden values :: Masks are applied before the user's filters.
- [x] The filter is evaluated on the masked values, so the real salaries cannot be inferred this way :: Correct.
- [ ] The query fails because masked columns cannot be filtered :: It runs on masked values.
- [ ] The mask is suspended for `WHERE` clauses :: It is not.

> Masks apply before `WHERE` and joins.

## site-135
exam: A7
topic: privacy
level: A
source: site

An admin drops a SQL UDF that a table still uses as a column mask. What happens?

- [ ] The mask is removed automatically :: The table still references it.
- [x] The table becomes inaccessible until the mask is dropped (`ALTER COLUMN ... DROP MASK`) :: Correct.
- [ ] The column shows NULL to everyone :: Queries fail instead.
- [ ] Nothing :: The table breaks.

> Drop the mask or row filter first, then the function.

## new-privacy-02
exam: A7
topic: privacy
level: A
source: new

A report must combine `orders` and `customers`, showing customer emails only to the support group and hiding orders from other regions, for a BI team that should never query the base tables. Which approach fits best?

- [ ] A column mask on the report :: Masks cannot be set on views.
- [x] A dynamic view joining both tables, using `is_account_group_member` in `CASE` expressions and in the `WHERE`, with `SELECT` granted on the view only :: Correct. Dynamic views suit protected results built from several tables.
- [ ] Copy both tables into a reporting schema without emails :: Duplicates data.
- [ ] Give the BI team `SELECT` on both tables and trust the BI tool :: Exposes the base tables.

> Single table: filters and masks. Combined or reshaped result: dynamic view.

## site-132
exam: A7 P6
topic: privacy
level: A
source: site

Every email column in the `crm` catalog (300 tables, growing weekly) must be masked, and table owners must not be able to remove the masking. What is the best approach?

- [ ] A column mask on each table :: 300 manual steps, owners can remove them, and new tables are missed.
- [x] Tag the email columns and create one ABAC column mask policy on catalog `crm` with `MATCH COLUMNS has_tag_value('pii', 'email')` :: Correct. It covers current and future tagged columns, and table owners cannot override it.
- [ ] A dynamic view per table :: 300 views, and the base tables stay open.
- [ ] Revoke `SELECT` from everyone :: Nobody could use the data.

> Central rules at scale: ABAC policies on governed tags.

## site-133
exam: A7 P6
topic: privacy
level: A
source: site

A table is tagged `pii`, but its columns are not. An ABAC column mask policy uses `MATCH COLUMNS has_tag_value('pii', ...)`. Are the columns masked?

- [ ] Yes, columns inherit table tags :: Column conditions only see tags on the columns.
- [x] No, `MATCH COLUMNS` only checks tags set directly on columns :: Correct. Tag the columns.
- [ ] Yes, but only for new rows :: Tags do not work per row.
- [ ] Only on SQL warehouses :: Compute type is not the issue.

> Column tags must be set on the columns themselves.

## new-privacy-03
exam: P6
topic: privacy
level: P
source: new

After an ABAC row filter policy was created on a schema for the group `analysts`, a manager asks whether it gives analysts access to the schema's tables. What is the answer?

- [ ] Yes, policies grant `SELECT` on matching tables :: Policies do not grant privileges.
- [x] No; the policy only changes what analysts see in tables they can already read; access still comes from `GRANT` :: Correct.
- [ ] Yes, but only for tables created after the policy :: Policies never grant.
- [ ] Only if the tables are managed :: Unrelated.

> ABAC policies restrict; grants allow.

## new-privacy-04
exam: P6
topic: privacy
level: P
source: new

An ABAC mask policy hides `ssn` columns from `account users`. A nightly pipeline, running as a service principal, must compute a hash of the real SSN. The pipeline now hashes the masked value. What should be changed?

- [ ] Disable the policy during the nightly run :: Leaves data exposed and is not auditable.
- [x] Add the pipeline's service principal to the policy's `EXCEPT` list :: Correct. Pipelines evaluate policies as their run-as identity.
- [ ] Run the pipeline as a regular user :: Users are also in `account users`, and production should not run as a person.
- [ ] Copy the table without the policy :: Creates an unprotected copy.

> Policies apply to pipelines too; exempt the service principal explicitly when it needs real values.

## sp-41
exam: P6
topic: privacy
level: P
source: sp

Which practice best guarantees consistent PII masking across dozens of batch and streaming pipelines?

- [x] Central masking functions in Unity Catalog, applied to the sensitive columns :: Correct. One definition applies to every query and pipeline.
- [ ] Each pipeline implements its own masking function :: Different logic and gaps in coverage.
- [ ] Mask only direct identifiers :: Combined quasi-identifiers can still re-identify people.
- [ ] Trust external systems to inherit the mask :: Outside Unity Catalog the policy does not apply.

> One governed function, applied everywhere.

## new-privacy-05
exam: P6
topic: privacy
level: P
source: new

Customer support notes are free text and sometimes contain names, phone numbers and emails. Analysts need the notes, without the personal data. What can a pipeline apply?

- [ ] A column mask that returns NULL for the whole notes column :: Hides everything, including useful content.
- [x] `ai_mask(notes, ARRAY('person', 'phone', 'email'))` when building the silver table :: Correct. Entities of the listed types are replaced inside the text.
- [ ] `sha2(notes, 256)` :: Destroys the text entirely.
- [ ] A row filter :: Removes whole rows.

> PII inside free text: entity masking (`ai_mask`), applied in the pipeline.

## sp-40
exam: P6
topic: privacy
level: P
source: sp

When copying a production sample to a sandbox, users' emails must not appear. Which code fits?

- [x] `df.withColumn("email", sha2(col("email"), 256))` :: Correct. The original column is overwritten with a deterministic hash, so joins by user still work.
- [ ] `df.withColumn("email_hash", sha2(col("email"), 256))` :: The original email stays in the DataFrame.
- [ ] `regexp_replace` changing only the domain :: The part before `@` still identifies the person.
- [ ] `df.withColumn("email", expr("uuid()"))` :: Removes the PII but prevents any consistent per-user analysis.

> Pseudonymise in place; add a secret salt so the hash cannot be reversed with a list of known emails.

## new-privacy-06
exam: P6
topic: privacy
level: P
source: new

Payment card numbers must be replaced in analytics tables, but the fraud team must occasionally recover the real number for a specific case. Which technique fits?

- [ ] Hashing with SHA-256 :: One-way: the fraud team could not recover the value.
- [x] Tokenization: replace the number with a random token and keep the token-to-value mapping in a separate, tightly restricted table :: Correct. Reversible only for authorised users.
- [ ] Suppression of the column :: Nothing could be recovered.
- [ ] Generalization to the card's first four digits :: Loses the value permanently.

> Reversible for a few, opaque for everyone else: tokenization.

## new-privacy-07
exam: P6
topic: privacy
level: P
source: new

A research dataset must not allow re-identification. It contains exact birth dates, full postcodes and gender. Which technique reduces the risk from these quasi-identifiers while keeping the data useful?

- [ ] Hash each column :: Hashes of low-cardinality values are easy to reverse and keep the same linkability.
- [x] Generalization: birth date to year or age band, postcode to district :: Correct. Less precise values match many people.
- [ ] Tokenization of each column :: Keeps exact linkability through the tokens.
- [ ] Leave them; they are not direct identifiers :: Combined, they often identify a person.

> Quasi-identifiers: generalize (and suppress rare combinations).

## new-privacy-08
exam: P6
topic: privacy
level: P
source: new

A customer exercises the GDPR right to erasure. Their rows were deleted with `DELETE` from every table yesterday. Which statement is true?

- [ ] The data is gone for good; nothing else is needed :: Old files still hold it.
- [x] The rows can still be read through time travel (and the change data feed) until old files are removed: run `REORG TABLE ... APPLY (PURGE)` where deletion vectors are used, then `VACUUM` after the retention period :: Correct.
- [ ] `OPTIMIZE` alone removes the old files :: It rewrites files but old ones stay until vacuumed.
- [ ] `RESTORE` permanently deletes history :: It does the opposite.

> Erasure on Delta = `DELETE` + purge + `VACUUM`, within the legal deadline.

## new-privacy-09
exam: P6
topic: privacy
level: P
source: new

A table has Change Data Feed enabled for downstream pipelines. After a GDPR delete, the privacy officer asks whether the deleted values still exist anywhere in the table's storage. What is the answer?

- [ ] No; CDF never stores deleted values :: It records deletes with the deleted row's values.
- [x] Yes; the change files hold the deleted row until `VACUUM` removes them after the retention period :: Correct. Set retention so files disappear within the deadline.
- [ ] Only if the table is external :: Same for managed tables.
- [ ] Only if deletion vectors are disabled :: CDF files exist either way.

> Change feeds and time travel are copies of history; erasure must account for them.

## new-privacy-10
exam: P6
topic: privacy
level: P
source: new

A policy requires clickstream events older than two years to be deleted permanently, every day. Which implementation fits?

- [ ] Set `delta.logRetentionDuration` to two years :: Controls history entries, not data rows.
- [x] A scheduled job that runs `DELETE FROM clicks WHERE event_date < current_date() - INTERVAL 730 DAYS`, with `VACUUM` (or predictive optimization) removing the old files after the file retention period :: Correct.
- [ ] `VACUUM clicks RETAIN 17520 HOURS` :: Removes old file versions, not current rows older than two years.
- [ ] A row filter hiding old rows :: Hides them but keeps the data.

> Retention = scheduled delete + vacuum. Hiding is not deleting.

## site-131
exam: A7
topic: privacy
level: A
source: site

A job on dedicated access mode with Databricks Runtime 15.3 cannot read a table that has a column mask. What fixes it?

- [ ] Remove the mask :: That defeats the security requirement.
- [x] Use Databricks Runtime 15.4 LTS or later (with serverless compute enabled in the workspace), or standard access mode, or a SQL warehouse :: Correct. On dedicated compute, filtering for masked or filtered tables runs on serverless and needs 15.4 LTS or later.
- [ ] Grant `MODIFY` on the table :: Write privileges do not change how masks are evaluated.
- [ ] Add the user to the mask's EXCEPT list :: Masks are SQL functions; there is no EXCEPT list on a mask, and exempting users is not the problem here.

> Reading tables with row filters or column masks: SQL warehouses, standard access mode, or dedicated access mode on 15.4 LTS or later with serverless enabled.
