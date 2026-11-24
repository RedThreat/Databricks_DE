<!-- Practice questions for the topic 'semi-structured'. Format: see README.md. -->

## site-012
exam: A2 A3 P3
topic: semi-structured
level: A
source: site

A STRING column `raw` contains JSON such as `{"customer":{"address":{"city":"Lisbon"}}}`. Which SQL expression extracts the city?

- [ ] `raw.customer.address.city` :: Dot notation is for STRUCT columns; on a string it fails.
- [x] `raw:customer.address.city` :: Correct. The colon path syntax works on JSON strings (and on VARIANT).
- [ ] `raw->customer->address->city` :: Not Databricks SQL syntax.
- [ ] `get_json(raw, 'city')` :: There is no such function, and it would ignore the nesting.

> JSON string or VARIANT: `col:path`. STRUCT: `col.field`.

## site-057
exam: A2 P3
topic: semi-structured
level: A
source: site

Which approach is recommended to store semi-structured JSON whose structure changes often?

- [ ] A STRING column :: Flexible, but parsed again on every query.
- [x] A VARIANT column (`parse_json`) :: Correct. VARIANT keeps the flexibility of a string with much better query performance.
- [ ] One table per field :: Unmanageable and slow to query.
- [ ] A BINARY column :: Opaque to SQL.

> Changing JSON structures: VARIANT.

## site-100
exam: P3 A2
topic: semi-structured
level: P
source: site

A table moves a JSON column from STRING to VARIANT, and the expression `raw:items[*].sku` stops working. What should be used on the VARIANT column?

- [ ] `raw.items.sku` :: Dot notation is for structs.
- [x] `LATERAL variant_explode(raw:items)` and then `value:sku` :: Correct. The `[*]` wildcard only works on JSON strings; on VARIANT, explode the array.
- [ ] `explode(raw:items[*])` :: The wildcard is still not supported on VARIANT.
- [ ] `from_json(raw:items)` :: `from_json` parses strings and needs a schema.

> On VARIANT: `variant_explode` instead of `[*]`, and remember that paths are case sensitive.

## site-018
exam: A3
topic: semi-structured
level: A
source: site

A column `tags` is an array; some rows have NULL or empty arrays. Those rows must stay in the output with a NULL tag. Which function?

- [ ] `explode` :: Drops rows whose array is NULL or empty.
- [x] `explode_outer` :: Correct. It keeps those rows and returns NULL for the element.
- [ ] `flatten` :: Turns an array of arrays into one array; it does not create rows.
- [ ] `posexplode` :: Adds the position but drops NULL or empty arrays like `explode`.

> `explode` loses rows with NULL or empty arrays; `explode_outer` keeps them.

## new-semi-01
exam: A2 P2
topic: semi-structured
level: A
source: new

Scanned contracts (PDF) and photos (JPEG) arrive in a volume. A pipeline must register every new file with its path, size and raw bytes for later processing. Which reader fits?

- [ ] `format("json")` with `multiLine` :: Parses JSON documents, not binary files.
- [x] Auto Loader with `cloudFiles.format = "binaryFile"` :: Correct. Each file becomes a row with `path`, `modificationTime`, `length` and `content`, ingested incrementally.
- [ ] `format("text")` :: Splits files into lines of text, which corrupts binary content.
- [ ] `COPY INTO` with `FILEFORMAT = CSV` :: Treats the bytes as delimited text.

> Unstructured files: `binaryFile`, landed in a volume, then processed (for example with `ai_parse_document`).

## new-semi-02
exam: P3 P2
topic: semi-structured
level: P
source: new

A JSON feed changes shape every few weeks. The team wants bronze ingestion that never fails on new fields and keeps every record whole, extracting fields later in silver. Which Auto Loader setting fits?

- [ ] `cloudFiles.schemaEvolutionMode = "failOnNewColumns"` :: Stops on every change.
- [x] `singleVariantColumn` so each record is stored in one VARIANT column :: Correct. There is no schema to evolve; silver extracts fields with paths such as `v:customer.id`.
- [ ] `cloudFiles.inferColumnTypes = true` :: Infers types but still evolves a column schema.
- [ ] Read the files as text and store each line as a STRING :: Works, but every later query must parse the string again; VARIANT is faster.

> Whole-record VARIANT ingestion trades schema management for flexible, fast path queries.

## new-semi-03
exam: P3
topic: semi-structured
level: P
source: new

A query on a VARIANT column fails: `SELECT v:country, count(*) FROM events GROUP BY v:country`. What fixes it?

- [ ] Use `v.country` instead of `v:country` :: Dot notation is for structs.
- [x] Cast the value before grouping, for example `GROUP BY v:country::STRING` :: Correct. VARIANT values cannot be grouped, sorted or compared directly.
- [ ] Add `DISTINCT` :: `DISTINCT` on VARIANT has the same restriction.
- [ ] Convert the table to JSON strings :: Unnecessary; a cast solves it.

> Cast VARIANT paths before `GROUP BY`, `ORDER BY`, `DISTINCT` or comparisons.

## new-semi-04
exam: P3
topic: semi-structured
level: P
source: new

The JSON documents use the key `"Customer"`. On the STRING column, `raw:customer.id` works. After converting to VARIANT, `v:customer.id` returns NULL. Why?

- [ ] VARIANT does not support nested objects :: It does.
- [x] Paths on VARIANT are case sensitive, so `v:Customer.id` is required :: Correct. JSON-string paths ignore case; VARIANT paths do not.
- [ ] `parse_json` lowercases every key :: It keeps keys as they are.
- [ ] The value must be extracted with `from_json` first :: `from_json` parses strings into structs; it is not needed on VARIANT.

> VARIANT field names are case sensitive.

## new-semi-05
exam: A2 A3
topic: semi-structured
level: A
source: new

A silver job must turn a JSON string column into typed columns. Which call parses it into a STRUCT?

- [ ] `from_json(raw)` :: `from_json` requires a schema.
- [x] `from_json(raw, "id INT, customer STRUCT<name: STRING, city: STRING>")` :: Correct. The schema defines the struct; `schema_of_json` can derive one from a sample.
- [ ] `to_json(raw)` :: Does the opposite: serialises a struct to a string.
- [ ] `parse_json(raw).*` :: `parse_json` returns a VARIANT, and `.*` expands structs, not VARIANT.

> String to STRUCT: `from_json` with a schema. String to VARIANT: `parse_json`.
