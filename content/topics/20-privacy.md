---
id: privacy
title: "Data privacy: masks, filters, ABAC and PII"
group: Governance
order: 20
summary: Row filters and column masks, dynamic views, ABAC policies with governed tags, detecting and masking PII in pipelines, hashing, tokenization, suppression and generalization, and GDPR erasure and retention with Delta Lake.
---

## Row filters and column masks

Both are SQL functions in Unity Catalog attached to a table. They apply to every query from every tool, without copying the data.

```sql
-- row filter: returns TRUE for the rows the current user may see
CREATE OR REPLACE FUNCTION main.sec.region_filter(region STRING)
RETURN is_account_group_member('sales_admins')
    OR is_account_group_member(concat('sales_', region));

ALTER TABLE main.sales.orders SET ROW FILTER main.sec.region_filter ON (region);

-- column mask: receives the column value, returns what the user may see
CREATE OR REPLACE FUNCTION main.sec.mask_email(email STRING)
RETURN CASE WHEN is_account_group_member('hr_admins') THEN email
            ELSE regexp_replace(email, '^[^@]+', '***') END;

ALTER TABLE main.hr.employees ALTER COLUMN email SET MASK main.sec.mask_email;
-- a mask can read other columns:  SET MASK main.sec.mask_salary USING COLUMNS (country)

ALTER TABLE main.hr.employees ALTER COLUMN email DROP MASK;
ALTER TABLE main.sales.orders DROP ROW FILTER;
```

- A **row filter** returns BOOLEAN; rows where it returns FALSE or NULL are hidden. One row filter per table.
- A **column mask** takes the column value as its first parameter and returns the same type. One mask per column.
- `is_account_group_member()` checks **account** groups (the ones Unity Catalog uses); `is_member()` checks workspace-local groups. `current_user()` / `session_user()` return the user.
- Masks are applied before the user's `WHERE` and joins, so users cannot filter on the hidden real values.
- Applying a filter or mask needs `EXECUTE` on the function and ownership of the table (or `MANAGE` with the right privileges).
- Reading protected tables works on SQL warehouses, standard access mode, and dedicated access mode on Databricks Runtime 15.4 LTS or later with serverless enabled (the filtering then runs on serverless).
- **Drop the filter or mask before dropping its function**; a table whose mask function was deleted becomes unreadable.
- Masks and filters cannot be set on views.

**Dynamic views** are the older approach: a view whose `SELECT` uses `CASE WHEN is_account_group_member(...)` for columns and a `WHERE` for rows. Users get `SELECT` on the view only. They still make sense when the protected result combines several tables or reshapes data; for a single table, row filters and column masks protect the table itself.

## ABAC: policies driven by governed tags

Attribute-based access control lets a central team write **one policy** that applies to every matching table, now and in the future, based on **governed tags**.

```sql
-- 1. tag the sensitive columns (governed tag "pii", allowed values email, ssn, phone...)
ALTER TABLE crm.customers.contacts ALTER COLUMN email SET TAGS ('pii' = 'email');

-- 2. one mask policy for the whole catalog
CREATE POLICY mask_emails
ON CATALOG crm
COMMENT 'Emails masked for everyone except the privacy team'
COLUMN MASK main.sec.mask_email
TO `account users` EXCEPT `privacy_team`
FOR TABLES
MATCH COLUMNS has_tag_value('pii', 'email') AS email_col
ON COLUMN email_col;

-- 3. a row filter policy for tables with a tagged region column
CREATE POLICY emea_only
ON SCHEMA sales.orders
ROW FILTER main.sec.filter_by_region
TO `emea_team`
FOR TABLES
MATCH COLUMNS has_tag('region') AS rgn
USING COLUMNS (rgn, 'EMEA');
```

- Policies are created on a **catalog, schema or table** and target principals (`TO ... EXCEPT ...`). `WHEN` adds conditions on table tags; `MATCH COLUMNS` selects columns by their tags.
- **Column tags are set on columns.** A tag on the table, schema or catalog does not make its columns match `MATCH COLUMNS`.
- Policies **do not grant access**: they only change what users see in tables they can already query.
- Table owners **cannot override** a policy set above them.
- Creating a policy requires `MANAGE` (or ownership) on its scope and `EXECUTE` on the function; assigning a governed tag requires permission to use the tag and `APPLY TAG` on the object.
- Querying needs serverless compute or Databricks Runtime 16.4 or later; if the policy cannot be evaluated, access fails (fail closed).
- If two policies give a user different masks for the same column (or different filters for a table), the query fails: design policies so each column matches one mask per user. `SHOW GRANTS` does not list policies; inspect them in Catalog Explorer or with the policy and `information_schema` views.
- Pipelines and jobs evaluate policies as their run-as identity: add the service principal to `EXCEPT` when it must process the real values.
- Deleting a tag value or a function that a policy uses breaks queries across the policy's whole scope.

**Choosing**: one table, a few rules → row filter or column mask. Hundreds of tables, rules that must follow new tables automatically, and owners who must not remove protection → ABAC.

## Detecting and masking PII in pipelines

- **Find it**: data classification in Unity Catalog can scan tables and tag columns that look like PII (emails, phone numbers, national IDs), so ABAC policies pick them up; `ai_mask` (see *UDFs and AI functions*) masks named entities inside free text.
- **Contain it**: land raw personal data in a restricted bronze schema; apply masking or pseudonymisation when building silver, with **one shared Unity Catalog function** used by every batch and streaming pipeline, so the logic is consistent and maintained once.
- **Mask outside too**: data copied out of Unity Catalog (exports, external systems) does not carry masks with it.

## Anonymisation and pseudonymisation techniques

| Technique | How | Reversible | Keeps joins | Example |
|---|---|---|---|---|
| **Hashing** | `sha2(concat(email, salt), 256)` with a secret salt | No (but guessable without a salt) | Yes (same input, same hash) | Pseudonymous customer key |
| **Tokenization** | Replace the value with a random token; keep the mapping in a separate, tightly restricted table | Yes, for authorised users | Yes | Payment or national IDs |
| **Suppression** | Remove the column or the record | No | No | Drop the free-text notes column |
| **Generalization** | Reduce precision | No | Partly | Age to age band, birth date to year, postcode to district |
| **Masking (display)** | Show part of the value | Not for the viewer | No | `****-****-****-1234` |

- Hash with a **salt** kept in a secret scope; an unsalted hash of an email can be reversed by hashing a list of known emails.
- **Overwrite** the original column when producing a non-sensitive copy: `withColumn("email", sha2(...))`, not a new `email_hash` column next to the original.
- Quasi-identifiers (birth date, postcode, gender) can re-identify people when combined; generalise them too.
- Pseudonymised data is still personal data under GDPR when it can be linked back; truly anonymised data is not.

## Erasure and retention with Delta Lake

A deleted row is not gone while older files still contain it. A GDPR erasure request therefore needs more than a `DELETE`:

```sql
DELETE FROM main.silver.customers WHERE customer_id = 'C-1043';   -- every layer: bronze, silver, gold
REORG TABLE main.silver.customers APPLY (PURGE);                   -- rewrite files that only had the row soft-deleted (deletion vectors)
VACUUM main.silver.customers;                                      -- after the retention period, physically remove old files
```

- **Time travel** and **Change Data Feed** files still hold the deleted values until `VACUUM` removes them; set `delta.deletedFileRetentionDuration` so files are gone within your legal deadline.
- Deleting from a table that streams read breaks append-only streams; downstream readers use `skipChangeCommits` or the change feed (and must apply the deletes too).
- Keep erasure requests in a table and apply them with a scheduled job (for example a `MERGE ... WHEN MATCHED THEN DELETE` against each table).
- With **tokenization**, deleting the person's entry in the mapping table makes the remaining tokens meaningless everywhere (a form of crypto-shredding).
- **Retention policies**: schedule `DELETE FROM t WHERE event_date < current_date() - INTERVAL 730 DAYS`, followed by `VACUUM`.

## Exam traps

!!! trap "Policies do not grant"
    ABAC and masks change what users see in tables they can already read; access still comes from `GRANT`.

!!! trap "DELETE is not erasure"
    Until old files are vacuumed, time travel and the change feed can still return the data.

!!! trap "Account groups"
    Use `is_account_group_member` in filters and masks; `is_member` checks workspace-local groups.

!!! tip "Hash in place"
    A hashed copy next to the original still exposes the original.

## Hands-on

1. Create `workspace.priv_lab.employees (id INT, name STRING, email STRING, region STRING, salary INT)` with a few rows.
2. Create a mask function for `email` and a row filter on `region` using `is_account_group_member('admins')`, apply them, and query the table.
3. Create a hashed copy with `sha2(concat(email, '<salt from a secret>'), 256)` overwriting the column.
4. Delete one employee, run `DESCRIBE HISTORY`, read the previous version with time travel (the row is still there), then discuss what `REORG ... APPLY (PURGE)` and `VACUUM` would change.
