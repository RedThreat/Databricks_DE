---
id: transform
title: Spark SQL and PySpark transformations
group: Transformation
order: 8
summary: Selecting and cleaning columns, types, ANSI mode and NULLs, joins and unions, deduplication, aggregations and window functions, in both SQL and PySpark.
---

## DataFrame basics

- DataFrames are **immutable** and **lazy**: transformations (`select`, `filter`, `join`, `groupBy`) build a plan; actions (`count`, `show`, `collect`, `write`) run it.
- Read a table with `spark.read.table("cat.sch.t")` (or `spark.table`), write with `df.write.saveAsTable(...)`. A temporary view (`df.createOrReplaceTempView("v")`) lets you mix SQL and Python in a session.

| Task | PySpark | SQL |
|---|---|---|
| Choose columns | `select("a", F.col("b").alias("c"))`, `selectExpr("a * 2 AS a2")` | `SELECT a, b AS c` |
| All but some columns | `drop("x", "y")` | `SELECT * EXCEPT (x, y)` |
| Add or replace columns | `withColumn("n", expr)`; several at once: `withColumns({"n": e1, "m": e2})` | expressions in `SELECT` |
| Rename | `withColumnRenamed("old", "new")` | `old AS new` |
| Filter rows | `filter(cond)` or its alias `where(cond)` | `WHERE` |
| Conditional value | `F.when(c, v).otherwise(w)` | `CASE WHEN ... END` |
| Sort, limit | `orderBy(F.desc("ts"))`, `limit(10)` | `ORDER BY ts DESC LIMIT 10` |

`withColumnRenamed` and `drop` **silently do nothing** when the column does not exist. Calling `withColumn` in a long loop builds a huge plan; use `withColumns` or one `select`.

## Types, ANSI mode and NULLs

**ANSI mode** is on by default in recent runtimes, serverless and SQL warehouses. An invalid cast, an arithmetic overflow or an array index out of range then **fails** the query instead of returning NULL:

| Fails under ANSI | Returns NULL instead |
|---|---|
| `CAST('N/A' AS INT)` | `try_cast('N/A' AS INT)` |
| `to_date('31/02/2026', 'dd/MM/yyyy')` | `try_to_date(...)`, `try_to_timestamp(...)` |
| `split(ref, '-')[2]` on a short value | `try_element_at(split(ref, '-'), 3)` (1-based) |
| `a / 0` | `try_divide(a, 0)` |

Do not turn ANSI off for the session to make one cast pass: it changes behaviour everywhere (overflows become silent). Use the `try_` functions and count the rows that became NULL as a quality metric.

**Date patterns**: `yyyy` year, `MM` month, `dd` day, `HH` hour, `mm` **minute**, `ss` second. `to_date(s)` without a pattern behaves like a cast and expects `yyyy-MM-dd`.

**NULL rules**:

- `x = NULL` is never true (it is NULL). Use `IS NULL`, `isNull()`, or the null-safe operator `<=>` (`eqNullSafe` in PySpark).
- NULL join keys never match in a normal join.
- `count(col)`, `sum`, `avg`, `min` and `max` ignore NULLs; `count(*)` counts every row. If the business rule says NULL means 0, use `avg(coalesce(x, 0))`.
- `coalesce(a, b, 'n/a')` returns the first non-NULL value.
- `fillna(0)` fills only numeric columns and `fillna("n/a")` only string columns; mix them with a dictionary: `fillna({"qty": 0, "region": "n/a"})`. `dropna(subset=["id"])` drops rows with NULL ids.

## Joins

| Join | Keeps | Columns returned |
|---|---|---|
| `inner` | Rows with a match on both sides | Both |
| `left` (`left_outer`) | All left rows; NULLs where no match | Both |
| `right`, `full` | All right rows; all rows of both | Both |
| `left_semi` | Left rows that **have** a match | Left only |
| `left_anti` | Left rows that have **no** match | Left only |
| `cross` | Every combination | Both |

```python
# list of names: one copy of each key in the result
orders.join(prices, ["product_id", "region"], "left")
# expression: both copies stay, so select or drop through the DataFrame reference
orders.join(prices, (orders.product_id == prices.product_id) & (orders.region == prices.region)) \
      .drop(prices.product_id, prices.region)
```

- Joining on an expression keeps both key columns; selecting `"product_id"` afterwards fails with `AMBIGUOUS_REFERENCE`. Join on a list of names (SQL: `USING (product_id, region)`).
- Keep the fact table on the left of a `left` join when no fact row may be lost.
- Duplicate keys on the right side multiply rows (fan-out). Deduplicate dimensions first.
- In SQL, a `JOIN` without `ON` is a cross join.
- **Broadcast joins** send a small table to every executor and avoid shuffling the large one: `F.broadcast(small_df)` or `/*+ BROADCAST(dim) */`. Spark does it automatically below `spark.sql.autoBroadcastJoinThreshold` (10 MB by default; -1 turns it off). A hint overrides the threshold, so never broadcast the large side.

## Unions

| Operation | Matches columns by | Duplicates |
|---|---|---|
| PySpark `union` / `unionAll` | **Position** | Kept |
| PySpark `unionByName(other, allowMissingColumns=True)` | **Name**; missing columns become NULL | Kept |
| SQL `UNION` | Position | **Removed** (same as `UNION DISTINCT`) |
| SQL `UNION ALL` | Position | Kept |

`INTERSECT` and `EXCEPT` return common rows and rows of the first query missing from the second.

## Deduplication

| Need | Use |
|---|---|
| Remove rows identical in every column | `distinct()` / `SELECT DISTINCT` |
| One row per key, any of them | `dropDuplicates(["key"])` |
| The **latest** row per key, deterministically | `row_number()` over a window ordered by timestamp descending, plus a tiebreaker; keep row 1 |

```sql
SELECT *
FROM bronze.customers
QUALIFY row_number() OVER (PARTITION BY customer_id
                           ORDER BY updated_at DESC, ingest_id DESC) = 1;
```

Without a unique tiebreaker, two rows with the same `updated_at` make the choice non-deterministic.

## Aggregations

```python
daily = (readings.groupBy("station_id")
         .agg(F.max("temp_c").alias("temp_max"),
              F.avg("temp_c").alias("temp_avg"),
              F.countDistinct("sensor_id").alias("sensors"),
              F.approx_count_distinct("device_id").alias("devices_approx")))
```

- `agg` without `groupBy` aggregates the whole DataFrame into **one row**.
- The dictionary form (`agg({"temp_c": "max"})`) allows one function per column; several aggregations of the same column need expressions with aliases.
- `count_distinct` is exact. `approx_count_distinct` (HyperLogLog, about 5% relative error by default) is much cheaper on very large data.
- `df.describe()` gives count, mean, stddev, min and max; `df.summary()` adds the 25%, 50% and 75% percentiles.
- SQL extras: `GROUP BY ALL`, `HAVING`, `count_if(cond)`, `ROLLUP`, `CUBE`, `GROUPING SETS`, `percentile_approx`.
- Pivot: `groupBy("store").pivot("month", ["Jan", "Feb"]).sum("sales")` (listing the values avoids an extra pass).

## Window functions

```python
from pyspark.sql.window import Window
w = Window.partitionBy("region").orderBy(F.desc("total"))
running = Window.partitionBy("customer").orderBy("ts") \
                .rowsBetween(Window.unboundedPreceding, Window.currentRow)

df.select("*",
          F.row_number().over(w).alias("rn"),        # 1, 2, 3, 4 (unique)
          F.rank().over(w).alias("rk"),              # 1, 1, 3, 4 (gaps after ties)
          F.dense_rank().over(w).alias("drk"),       # 1, 1, 2, 3 (no gaps)
          F.lag("total").over(w).alias("prev"),      # previous row in the window
          F.sum("amount").over(running).alias("cumulative"))
```

- Without `partitionBy`, the window spans the whole dataset (and all data goes to one task).
- Without `orderBy`, an aggregate over a window returns the partition total.
- With `orderBy` and no explicit frame, the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: rows with the same order value are summed together. Use `rowsBetween` for a strict row-by-row running total.
- `lag` looks back, `lead` looks forward.

## Exam traps

!!! trap "union is not UNION"
    PySpark `union` keeps duplicates and matches by position. SQL `UNION` removes duplicates.

!!! trap "dropDuplicates keeps any row"
    For "the most recent record per key", the answer is a window with `row_number()` ordered by time.

!!! trap "Indexes"
    `[i]` and `getItem` start at 0; `element_at` and `try_element_at` start at 1; `posexplode` positions start at 0.

!!! tip "Read code from the details"
    In code questions, check first the write mode, NULL handling, 0 versus 1 indexing, `union` versus `unionByName`, and a missing `groupBy`.

## Hands-on

Use `samples.tpch` (available in every workspace):

1. Customers with no orders: `customer` left anti join `orders` on `c_custkey = o_custkey`.
2. Latest order per customer with `QUALIFY row_number()`.
3. Revenue per nation with `groupBy(...).agg(...)`, then rank nations inside each region with `dense_rank`.
4. Running total of order value per customer by date with `rowsBetween`.
5. `try_cast` a column of mixed strings and count how many rows became NULL.
