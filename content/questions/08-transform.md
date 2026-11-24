<!-- Practice questions for the topic 'transform'. Format: see README.md. -->

## site-061
exam: A3
topic: transform
level: A
source: site

How do you get the FIRST element of the array produced by this expression?

```python
split(col("full_name"), " ")
```

- [ ] `getItem(1)` :: `getItem` and `[i]` are 0-based, so index 1 is the second element.
- [x] `getItem(0)` or `element_at(..., 1)` :: Correct. Bracket and `getItem` indexing start at 0; `element_at` starts at 1.
- [ ] `element_at(..., 0)` :: `element_at` is 1-based; index 0 raises an error.
- [ ] `first()` :: `first` is an aggregate over rows, not an array accessor.

> `[i]` and `getItem` start at 0. `element_at` starts at 1 and `try_element_at` returns NULL out of range.

## site-104
exam: A3
topic: transform
level: A
source: site

`order_date` strings look like `07/03/2026`, meaning 7 March. Which expression parses them correctly?

- [ ] `to_date(order_date)` :: Without a format, `to_date` behaves like a cast and expects `yyyy-MM-dd`.
- [ ] `to_date(order_date, 'dd/mm/yyyy')` :: Lower-case `mm` means minutes, not months.
- [x] `to_date(order_date, 'dd/MM/yyyy')` :: Correct. `dd` is the day, `MM` the month, `yyyy` the year.
- [ ] `CAST(order_date AS DATE)` :: A cast expects the ISO format and fails (or returns NULL) on `07/03/2026`.

> In datetime patterns, `M` is month and `m` is minute. Use `try_to_date` when bad strings must become NULL instead of failing.

## sa-50
exam: A3
topic: transform
level: A
source: sa

While reviewing SQL scripts, you need the statement that defines the structure of a new table. Which is a DDL statement that creates a table?

- [x] `CREATE TABLE sensors (id INT, location STRING);` :: Correct. `CREATE TABLE` defines a new table's name, columns and types.
- [ ] `DROP TABLE sensors;` :: Also DDL, but it removes a table instead of creating one.
- [ ] `INSERT INTO sensors VALUES (1, 'Porto');` :: DML: it changes data inside an existing table.
- [ ] `ALTER TABLE sensors ADD COLUMN altitude INT;` :: DDL, but it changes an existing table instead of creating one.

> DDL defines structure (CREATE, ALTER, DROP, TRUNCATE); DML changes data (INSERT, UPDATE, DELETE, MERGE).

## site-013
exam: A3
topic: transform
level: A
source: site

What is the problem with this code?

```python
df1 = spark.createDataFrame([(1, "Ana")], ["id", "name"])
df2 = spark.createDataFrame([("Rui", 2)], ["name", "id"])
result = df1.union(df2)
```

- [ ] `union` removes duplicates :: PySpark `union` keeps duplicates.
- [x] `union` matches columns by position, so names and ids get mixed up; use `unionByName` :: Correct. Columns are paired by position, not by name.
- [ ] `union` fails because the column order differs :: It fails only if types cannot be reconciled; otherwise it silently mixes the columns.
- [ ] There is no problem :: The result has a name in the `id` column.

> Different column order: `unionByName`.

## site-014
exam: A3
topic: transform
level: A
source: site

Table A has 3 rows and table B has the same 3 rows. How many rows does `SELECT * FROM A UNION SELECT * FROM B` return?

- [ ] 0 :: `UNION` combines rows; it does not subtract them.
- [x] 3 :: Correct. SQL `UNION` removes duplicates (`UNION DISTINCT`).
- [ ] 6 :: That is `UNION ALL`.
- [ ] An error :: Same schemas, so the query runs.

> SQL `UNION` deduplicates; `UNION ALL` and PySpark `union` do not.

## new-transform-01
exam: A3
topic: transform
level: A
source: new

Two DataFrames hold the same kind of records, but the second one has an extra column `channel` and the columns are in a different order. You must stack them, filling `channel` with NULL for the first. Which call?

- [ ] `df1.union(df2)` :: Matches by position and fails because the column counts differ.
- [x] `df1.unionByName(df2, allowMissingColumns=True)` :: Correct. Columns are matched by name and the missing one is filled with NULL.
- [ ] `df1.join(df2, "id", "full")` :: Combines columns side by side, not rows.
- [ ] `df1.crossJoin(df2)` :: Every combination of rows.

> Stack rows by name, tolerating missing columns: `unionByName(allowMissingColumns=True)`.

## site-015
exam: A3
topic: transform
level: A
source: site

A query uses `WHERE discount = NULL` and returns no rows, although some rows have NULL in `discount`. What is the fix?

- [ ] `WHERE discount == NULL` :: Any comparison with NULL returns NULL.
- [x] `WHERE discount IS NULL` :: Correct. Use `IS NULL` / `isNull()`, or the null-safe `<=>`.
- [ ] `WHERE discount = 'NULL'` :: Compares with the text "NULL".
- [ ] `WHERE isnull = discount` :: Not valid.

> Comparisons with NULL are never true; test NULL with `IS NULL`.

## new-transform-02
exam: A3 P3
topic: transform
level: A
source: new

Two tables must be joined on `(customer_id, region)`, and `region` is NULL for some customers in both tables. Those rows must match each other. Which condition?

- [ ] `a.region = b.region` :: NULL never equals NULL, so those rows are lost.
- [x] `a.region <=> b.region` (`eqNullSafe` in PySpark) :: Correct. The null-safe operator treats two NULLs as equal.
- [ ] `coalesce(a.region) = coalesce(b.region)` :: `coalesce` with one argument changes nothing.
- [ ] A cross join filtered afterwards :: Expensive and still needs a null-safe comparison.

> Normal joins never match NULL keys; `<=>` does.

## site-058
exam: A3
topic: transform
level: A
source: site

A column `bonus` holds the values 100, NULL and 200. What does `SELECT count(bonus), count(*)` return?

- [ ] 3, 3 :: `count(bonus)` skips the NULL.
- [x] 2, 3 :: Correct. `count(col)` ignores NULLs; `count(*)` counts every row.
- [ ] 2, 2 :: `count(*)` counts all rows.
- [ ] 3, 2 :: Reversed.

> `count(col)`, `sum` and `avg` ignore NULLs.

## site-112
exam: A3
topic: transform
level: A
source: site

The average order value looks too high. Some orders have a NULL amount, and the business rule says a missing amount means 0. What should you compute?

- [ ] `avg(amount)` :: Ignores NULL rows, so the average covers only orders with a value.
- [x] `avg(coalesce(amount, 0))` :: Correct. NULLs become 0 and count in the average.
- [ ] `sum(amount) / count(amount)` :: Same as `avg(amount)`.
- [ ] `count(*)` :: A count, not an average.

> When NULL means zero, replace it before aggregating.

## site-059
exam: A3
topic: transform
level: A
source: site

`df` has the columns `qty` (int) and `region` (string). What does `df.fillna(0)` do?

- [ ] Fills NULLs in all columns with 0 or "0" :: The value's type decides which columns are filled.
- [x] Fills NULLs only in numeric columns such as `qty` :: Correct. For several types use a dictionary: `fillna({"qty": 0, "region": "n/a"})`.
- [ ] Fails because `region` is a string :: It simply skips the string column.
- [ ] Drops rows with NULL :: That is `dropna`.

> `fillna` fills only columns whose type matches the value.

## site-103
exam: A3
topic: transform
level: A
source: site

On a recent runtime with ANSI mode enabled, `CAST(amount AS DECIMAL(10,2))` fails because some bronze rows contain `'N/A'`. What is the recommended fix?

- [ ] Set `spark.sql.ansi.enabled = false` for the session :: Changes behaviour for every query in the session (for example, silent overflows).
- [x] Use `try_cast(amount AS DECIMAL(10,2))` and handle the resulting NULLs :: Correct. Invalid values become NULL, which you can count or quarantine.
- [ ] `fillna("0")` before the cast :: `'N/A'` is not NULL, so nothing changes.
- [ ] `CAST(... AS STRING)` :: The column stays text.

> ANSI mode: use `try_cast`, `try_to_date`, `try_element_at`, `try_divide`.

## site-108
exam: A3
topic: transform
level: A
source: site

With ANSI mode on, `split(order_ref, '-')[2]` fails with `INVALID_ARRAY_INDEX` for short values such as `'GB-LON'`. Which expression returns NULL instead?

- [ ] `split(order_ref, '-')[3]` :: Still out of range, and still fails.
- [ ] `element_at(split(order_ref, '-'), 2)` :: Returns the second element, not the third, and also fails when out of range.
- [x] `try_element_at(split(order_ref, '-'), 3)` :: Correct. It is 1-based and returns NULL when the index is out of range.
- [ ] `getItem(2)` :: Same as `[2]`.

> `[i]` is 0-based and fails out of range under ANSI; `try_element_at` is 1-based and returns NULL.

## site-016
exam: A3 P3
topic: transform
level: A
source: site

You need to keep only the most recent record per `customer_id`, based on `updated_at`. Which approach guarantees this?

- [ ] `df.dropDuplicates(["customer_id"])` :: Keeps an arbitrary row per key.
- [ ] `df.distinct()` :: Removes only rows identical in every column.
- [x] `row_number()` over a window partitioned by `customer_id` ordered by `updated_at` descending, then keep row number 1 :: Correct. The order decides which row survives (in SQL, `QUALIFY`).
- [ ] `df.groupBy("customer_id").count()` :: Counts rows; the records are lost.

> Latest row per key: `row_number()` with an ordered window, plus a tiebreaker for equal timestamps.

## site-017
exam: A3
topic: transform
level: A
source: site

Which join returns the customers that have NO matching rows in the orders table, with only the customer columns?

- [ ] `left_outer` :: Returns all customers with order columns (NULL when no match).
- [ ] `left_semi` :: Returns customers that DO have orders.
- [x] `left_anti` :: Correct. Left rows without a match, left columns only.
- [ ] `cross` :: Every combination of customers and orders.

> Semi = exists; anti = not exists. Both return only left columns.

## sa-52
exam: A3
topic: transform
level: A
source: sa

A sales fact table must be joined with a product dimension, keeping every sale even when the product is missing from the dimension. Which join?

- [x] A left join, with sales on the left :: Correct. All left rows are kept, with NULLs where the dimension has no match.
- [ ] An inner join :: Drops sales whose product is missing.
- [ ] A cross join :: Produces every combination of sales and products.
- [ ] A right join, with sales on the left :: Keeps every product and drops unmatched sales: the opposite.

> Fact on the left with a left join when no fact row may be lost.

## site-106
exam: A3
topic: transform
level: A
source: site

This `select` fails with `AMBIGUOUS_REFERENCE`. What is the simplest fix?

```python
(orders.join(prices,
     (orders.product_id == prices.product_id) & (orders.region == prices.region))
   .select("product_id", "unit_price"))
```

- [ ] Drop `"product_id"` after the join :: Dropping by name removes both copies.
- [x] Join on a list of column names: `orders.join(prices, ["product_id", "region"])` :: Correct. A join on names keeps one copy of each key.
- [ ] Use a cross join :: Changes the result completely.
- [ ] Use `unionByName` :: Stacks rows; it is not a join.

> Expression joins keep both key columns; name-list joins (`USING`) keep one.

## new-transform-04
exam: A3
topic: transform
level: A
source: new

A report needs one row for every combination of the 365 days of 2026 and the 40 stores, even for days with no sales. Which join builds that grid?

- [ ] `inner` join of days and stores on the date :: Stores do not have a date column to join on.
- [x] A cross join of the days table and the stores table :: Correct. Every day is combined with every store (365 × 40 rows); sales can then be left-joined onto the grid.
- [ ] `left_semi` join :: Returns only the left columns of matching rows.
- [ ] `unionByName` :: Stacks rows instead of combining them.

> Cross join = every combination; use it deliberately for grids and calendars.

## sa-48
exam: A3
topic: transform
level: A
source: sa

You must compute, per weather station, the maximum temperature, the average temperature and the number of distinct sensors that reported. Assess this PySpark code:

```python
from pyspark.sql import functions as F

daily = (readings.groupBy("station_id")
    .agg(F.max("temp_c").alias("temp_max"),
         F.avg("temp_c").alias("temp_avg"),
         F.countDistinct("sensor_id").alias("n_sensors")))
```

- [x] The code is correct :: Correct. `groupBy` in camelCase, `agg` with column expressions, each with an alias; this is the form that allows several aggregations of the same column.
- [ ] It should use `readings.groupby(...)` in lower case :: Lower case is the pandas convention; the PySpark method is `groupBy` (`groupby` is only an alias).
- [ ] It should pass the aggregations as strings such as `"max(temp_c)"` :: `agg` takes column expressions here.
- [ ] It should use a dictionary `{"temp_c": "max", "temp_c": "avg"}` :: Duplicate keys collapse into the last one, so one aggregation would be lost.

> Several aggregations of the same column need expressions with aliases.

## sa-49
exam: A3
topic: transform
level: A
source: sa

A team wants total sales per product category, but the result has a single row summing everything. What is missing?

```python
total = sales.agg(F.sum("amount").alias("total_sales"))
```

- [x] A `groupBy` on the category column before `agg` :: Correct. Without `groupBy`, `agg` aggregates the whole DataFrame into one row.
- [ ] An alias on the sum :: The alias is there and only names the result.
- [ ] Converting to pandas before aggregating :: Pulls all data to the driver for nothing.
- [ ] Sorting with `orderBy` :: Sorting changes presentation, not the aggregation level.

> `agg` without `groupBy` = one row for the whole DataFrame.

## new-transform-05
exam: A3
topic: transform
level: A
source: new

A dashboard needs the number of distinct visitors per day on a 50-billion-row clickstream table. Small inaccuracy is acceptable; cost and speed matter most. Which function?

- [ ] `count(DISTINCT visitor_id)` :: Exact, but needs far more memory and shuffle at this scale.
- [x] `approx_count_distinct(visitor_id)` :: Correct. HyperLogLog gives a close estimate (about 5% relative error by default) at a fraction of the cost.
- [ ] `count(visitor_id)` :: Counts all non-NULL rows, not distinct visitors.
- [ ] `collect_set(visitor_id)` then `size` :: Builds huge arrays in memory.

> Large distinct counts where an estimate is fine: `approx_count_distinct`.

## new-transform-06
exam: A3
topic: transform
level: A
source: new

What is the difference between `df.describe()` and `df.summary()`?

- [ ] They are identical :: `summary` returns more statistics.
- [x] `describe()` returns count, mean, stddev, min and max; `summary()` also returns the 25%, 50% and 75% percentiles :: Correct.
- [ ] `describe()` shows the schema; `summary()` shows statistics :: The schema comes from `printSchema()` or `DESCRIBE`.
- [ ] `summary()` only works on numeric columns :: Both handle numeric and string columns (string statistics are limited).

> Quick profiling: `describe()` basic statistics, `summary()` adds quartiles.

## sp-59
exam: P3 A3
topic: transform
level: P
source: sp

Which window specification computes each customer's cumulative spend, ordered by `ts`, from the first row up to the current row?

- [x] `Window.partitionBy("customer").orderBy("ts").rowsBetween(Window.unboundedPreceding, Window.currentRow)` :: Correct. Partitioned per customer, ordered, with an explicit row frame.
- [ ] `Window.orderBy("ts").rowsBetween(Window.unboundedPreceding, Window.currentRow)` :: Without `partitionBy`, all customers are mixed.
- [ ] `Window.partitionBy("customer")` without `orderBy` :: Without order, the sum is the partition total.
- [ ] `Window.partitionBy("customer").orderBy("ts")` with no explicit frame :: The default frame is RANGE, which adds rows with the same `ts` together and can differ from a row-by-row running total.

> Running totals: partition, order, and an explicit `rowsBetween` frame.

## sp-60
exam: P3 A3
topic: transform
level: P
source: sp

Salespeople must be ranked by total sales within each region. Ties share a position and the numbering must have no gaps. Which function?

- [x] `dense_rank()` over `Window.partitionBy("region").orderBy(F.desc("total"))` :: Correct. Ties get the same rank and the next rank follows without a gap (1, 1, 2).
- [ ] `rank()` over the same window :: Leaves gaps after ties (1, 1, 3).
- [ ] `row_number()` over the same window :: Gives different numbers even to ties.
- [ ] `dense_rank()` without `partitionBy` :: Ranks all regions together.

> `row_number` unique, `rank` with gaps, `dense_rank` without gaps.

## sp-65
exam: P3
topic: transform
level: P
source: sp

Which expression computes, for each sensor, the difference between the current reading and the previous one?

- [x] `value - F.lag("value").over(Window.partitionBy("sensor").orderBy("ts"))` :: Correct. `lag` reads the previous row in the ordered partition.
- [ ] `value - F.lead("value").over(...)` :: `lead` reads the next row.
- [ ] `value - F.first("value")` without a window :: An aggregate without a window has no notion of "previous".
- [ ] `value - F.avg("value").over(Window.partitionBy("sensor"))` :: Compares with the average.

> `lag` looks back, `lead` looks forward.

## new-transform-07
exam: P3
topic: transform
level: P
source: new

You need the top 3 products by revenue in each category, including all products tied at third place. Which approach is correct?

- [ ] `orderBy(F.desc("revenue")).limit(3)` :: Returns 3 rows overall, not per category.
- [ ] `row_number()` over a window per category ordered by revenue, keep `<= 3` :: Cuts ties at third place arbitrarily.
- [x] `dense_rank()` (or `rank()`) over a window partitioned by category ordered by revenue descending, keep rank `<= 3` :: Correct. Ties share a rank, so all products tied at third place are kept.
- [ ] `groupBy("category").agg(F.max("revenue"))` :: Returns only the top value per category.

> Top-N per group: a ranking window. Choose `row_number` to cut ties, `rank`/`dense_rank` to keep them.

## new-transform-08
exam: P3
topic: transform
level: P
source: new

A monthly report needs one row per store and one column per month with total sales. Which PySpark call produces it efficiently?

- [ ] `groupBy("store", "month").sum("sales")` :: Gives one row per store and month, not one column per month.
- [x] `groupBy("store").pivot("month", ["Jan", "Feb", "Mar"]).sum("sales")` :: Correct. Listing the pivot values avoids an extra pass to discover them.
- [ ] `crossJoin` of stores and months :: Builds a grid without aggregating.
- [ ] A window function partitioned by month :: Keeps one row per input row.

> Rows to columns: `pivot` (give the values when you know them).

## new-transform-09
exam: A3
topic: transform
level: A
source: new

A notebook runs `df.withColumnRenamed("cust_nm", "customer_name")`, but the column is actually called `cust_name`. What happens?

- [ ] The command fails with a column-not-found error :: `withColumnRenamed` does not check.
- [x] Nothing changes, silently; the DataFrame keeps `cust_name` :: Correct. `withColumnRenamed` and `drop` ignore columns that do not exist.
- [ ] A new empty column `customer_name` is added :: No column is added.
- [ ] All columns are renamed :: Only an existing matching column would be renamed.

> Silent no-ops: `withColumnRenamed` and `drop` with a wrong name. Check the schema after renaming.

## new-transform-10
exam: A3
topic: transform
level: A
source: new

Which PySpark expression splits a comma-separated `tags` string such as `"red,blue,green"` into one row per tag?

- [ ] `F.split("tags", ",")` :: Returns an array in one row.
- [x] `F.explode(F.split("tags", ","))` :: Correct. `split` builds the array and `explode` turns each element into a row.
- [ ] `F.flatten("tags")` :: Works on arrays of arrays, not strings.
- [ ] `F.concat_ws(",", "tags")` :: Joins strings together; the opposite.

> String to rows: `split` then `explode`.
