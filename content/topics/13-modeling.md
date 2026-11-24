---
id: modeling
title: Medallion architecture and data modeling
group: Transformation
order: 13
summary: Bronze, silver and gold layers, cleaning bronze into silver, facts, dimensions and star schemas, gold objects for BI, and Unity Catalog metric views.
---

## The medallion architecture

| Layer | Contains | Typical operations |
|---|---|---|
| Landing | Files as delivered, in a volume | Nothing; this is the drop zone |
| **Bronze** | Raw data as received, append-only, plus ingestion metadata (load time, source file) | Auto Loader, `COPY INTO`, connectors; minimal changes |
| **Silver** | Clean, typed, deduplicated, validated and conformed data at entity level | Casting, standardising, deduplication, joins, `MERGE`, CDC, expectations |
| **Gold** | Business-ready data: aggregates, dimensional models, features | Aggregations, star schemas, materialized views, metric views |

Why keep bronze raw: it is the **replay source**. Sources such as Kafka or Event Hubs keep data for days; regulators may require the original records for years. Landing everything in bronze Delta tables on cheap object storage lets you rebuild silver and gold whenever the logic changes.

Layers usually map to separate schemas or catalogs, with permissions per layer (engineers write bronze and silver; analysts read gold).

## From bronze to silver

A silver table is where data becomes trustworthy. A typical checklist:

1. **Types**: `try_cast` and `try_to_timestamp`; count the rows that failed.
2. **Standardise**: trim, case, codes, units, time zones.
3. **NULLs**: defaults with `coalesce` where the business allows, rejection where it does not.
4. **Deduplicate**: keep the latest record per key.
5. **Validate**: expectations, `CHECK` constraints, or a quarantine table for rejects.
6. **Flatten and conform**: explode nested arrays, map source codes to common ones, join reference data.
7. **Write**: `MERGE` for entity tables (customers, products), append for events (orders, clicks).

## Dimensional modelling

| | Fact table | Dimension table |
|---|---|---|
| Contains | Events and measures (amounts, quantities) plus foreign keys to dimensions | Descriptive attributes (who, what, where, when) |
| Size | Many rows, keeps growing | Fewer rows, changes slowly |
| Answers | "How much?", "how many?" | "Who?", "what?", "when?", "where?" |
| History | Append | SCD type 1 or type 2 |

- A **star schema** has one fact table in the middle joined directly to its dimensions; it is the standard gold model for BI. A snowflake schema normalises dimensions further at the cost of more joins.
- Decide the **grain** of each fact table first (for example, one row per order line).
- Use **surrogate keys** (`BIGINT GENERATED ALWAYS AS IDENTITY`) for dimensions, especially SCD type 2, where the natural key repeats across versions.
- A **date dimension** stores precomputed attributes (fiscal quarter, weekday, holiday flag) so queries just join and group.
- Declare primary and foreign keys: they are informational in Unity Catalog but help BI tools and the optimizer.

```sql
CREATE TABLE gold.dim_customer (
  customer_sk BIGINT GENERATED ALWAYS AS IDENTITY,
  customer_id STRING NOT NULL,
  name STRING, city STRING,
  valid_from TIMESTAMP, valid_to TIMESTAMP, is_current BOOLEAN,
  CONSTRAINT pk_dim_customer PRIMARY KEY (customer_sk)
);
```

## Gold objects

| Object | Stores data | Freshness | Choose it when |
|---|---|---|---|
| View | No | Always current; recomputed on every query | Light logic, or a security layer over tables |
| Materialized view | Yes | Refreshed on schedule, on source update or incrementally | Expensive aggregates or joins read often by BI |
| Streaming table | Yes | Updated incrementally as data arrives | Append-only or CDC-driven gold tables with low latency |
| Table | Yes | Whatever your job writes | Full control of the writes (`MERGE`, overwrite) |

A Unity Catalog view resolves its source tables with the **owner's** privileges: users only need `SELECT` on the view (plus `USE CATALOG` and `USE SCHEMA`), not on the tables behind it.

## Metric views

A **metric view** defines business metrics once, in Unity Catalog, as measures and dimensions over a source table or view. Every tool (SQL, dashboards, Genie) then computes "revenue" the same way, at whatever grain the query asks for.

```sql
CREATE OR REPLACE VIEW main.gold.sales_metrics
WITH METRICS
LANGUAGE YAML
AS $$
version: 1.1
source: main.gold.fact_sales
dimensions:
  - name: region
    expr: region
  - name: order_month
    expr: DATE_TRUNC('MONTH', order_date)
measures:
  - name: revenue
    expr: SUM(amount)
  - name: orders
    expr: COUNT(DISTINCT order_id)
  - name: revenue_per_order
    expr: SUM(amount) / COUNT(DISTINCT order_id)
$$;

SELECT region, MEASURE(revenue), MEASURE(revenue_per_order)
FROM main.gold.sales_metrics
GROUP BY region;
```

- Measures are aggregated at query time, so ratios such as revenue per order stay correct at any grain (a pre-aggregated table at month level could not give them by week).
- Metric views are governed like other views (`SELECT`, comments, lineage).

**Materialized view or metric view?** A materialized view **stores** precomputed results at a fixed grain for speed. A metric view **stores definitions** and computes them on demand at any grain, for consistency. They combine well: a metric view whose source is a materialized view.

## Exam traps

!!! trap "Bronze is not optional"
    "Keep the events exactly as emitted for years, cheaply" points to bronze Delta tables, not to longer retention in a message bus.

!!! trap "Facts hold measures"
    Amounts and quantities with foreign keys are facts; descriptive attributes are dimensions.

!!! tip "SCD type 2 for point-in-time truth"
    "Each past sale must show the address valid at that time" requires SCD type 2.

## Hands-on

With `samples.tpch`:

1. Build `silver.orders` from `samples.tpch.orders` with typed, renamed columns and an `ingest_ts` column.
2. Build `gold.dim_customer` and `gold.fact_orders` (grain: one row per order) and a date dimension with `sequence` and `explode`.
3. Create a materialized view of revenue per nation and month.
4. Create the metric view above on your fact table and query it with `MEASURE()` by region and by month.
