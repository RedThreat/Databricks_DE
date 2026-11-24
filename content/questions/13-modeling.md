<!-- Practice questions for the topic 'modeling'. Format: see README.md. -->

## sa-04
exam: A3 A2
topic: modeling
level: A
source: sa

Smart electricity meters publish readings to Event Hubs, which keeps data for seven days. The regulator requires five years of the events exactly as emitted, and the storage budget is tight. In which medallion layer should these events land?

- [x] Bronze :: Correct. Bronze keeps raw data as received; Delta on object storage is cheap and durable, and keeps history available for replay and audit.
- [ ] Silver :: Silver holds cleaned and typed data derived from bronze; keeping only that loses the original the regulator requires.
- [ ] Gold :: Business aggregates, the furthest from the raw events.
- [ ] Increase Event Hubs retention to five years :: The most expensive option per GB, and it keeps history in a messaging system not built for archives or replay.

> Short source retention plus long history requirement: land raw events in bronze.

## sp-78
exam: A3
topic: modeling
level: A
source: sp

In the medallion architecture, which layer holds clean, deduplicated and conformed data, before business aggregations?

- [x] Silver :: Correct. Validated, conformed, entity-level data.
- [ ] Bronze :: Raw data as received.
- [ ] Gold :: Aggregates and models ready for consumption.
- [ ] Landing :: The file drop zone before bronze.

> Bronze raw, silver clean, gold business-ready.

## site-022
exam: A3 P9
topic: modeling
level: A
source: site

In a star schema, which table typically contains quantities and amounts plus foreign keys?

- [ ] Dimension table :: Holds descriptive attributes.
- [x] Fact table :: Correct. Events and measures, with foreign keys to the dimensions.
- [ ] Bridge view :: Resolves many-to-many relationships; not where measures live.
- [ ] Bronze table :: A medallion layer, not a dimensional role.

> Facts = measures + foreign keys; dimensions = who, what, where, when.

## sp-75
exam: P9
topic: modeling
level: P
source: sp

How should a date dimension be designed for analysis by fiscal quarter, weekday and public holidays?

- [x] Precompute and store those attributes as columns of the dimension :: Correct. Queries become simple joins and groupings, and business rules are computed once.
- [ ] Store only the date and compute everything in each query :: Repeats complex logic and cost.
- [ ] Store the date as an ISO string :: Loses native date functions and comparisons.
- [ ] Create one table per calendar :: Fragments the model; one dimension can carry columns for each calendar.

> Dimensions carry precomputed descriptive attributes.

## new-modeling-01
exam: P9
topic: modeling
level: P
source: new

Finance, sales and Genie users each compute "revenue per order" differently. The company wants one governed definition that is correct whether results are grouped by day, region or product. What should be built?

- [ ] A materialized view with revenue per order pre-aggregated by month :: Fixed grain; a monthly ratio cannot be re-aggregated correctly by day or product.
- [x] A Unity Catalog metric view defining `revenue` and `revenue_per_order` as measures, queried with `MEASURE()` :: Correct. Measures are computed at query time at any grain, from one governed definition.
- [ ] A shared notebook with the SQL formula :: Not governed, and every tool would copy it.
- [ ] A column comment explaining the formula :: Documentation does not enforce anything.

> Governed metric definitions at any grain: metric views. Precomputed speed at a fixed grain: materialized views.

## new-modeling-02
exam: P9 A3
topic: modeling
level: P
source: new

A BI dashboard queries a large join plus aggregation every few seconds, always at the same grain (day and store), and the data changes hourly. Which object gives the fastest dashboard at reasonable cost?

- [ ] A standard view :: Recomputes the expensive query on every request.
- [x] A materialized view at day and store grain, refreshed when the sources change :: Correct. Results are precomputed and reused until the next refresh.
- [ ] A metric view with no materialisation :: Consistent definitions, but each query still computes from the base tables.
- [ ] A temporary view in each dashboard query :: Same cost as a view.

> Fixed grain and frequent reads: materialized view (a metric view can sit on top of it).

## new-modeling-03
exam: A3 A7
topic: modeling
level: A
source: new

Analysts must read `gold.sales_summary`, a view over `silver.orders` and `silver.customers`. They must not query the silver tables directly. Which grants are enough?

- [ ] `SELECT` on the view and on both silver tables :: Lets them query silver directly, which is not allowed.
- [x] `USE CATALOG`, `USE SCHEMA` on `gold`, and `SELECT` on the view; the view's owner has `SELECT` on the silver tables :: Correct. Unity Catalog resolves the view's sources with the owner's privileges.
- [ ] `MODIFY` on the view :: Write privilege; reading needs `SELECT`.
- [ ] `BROWSE` on the silver schema :: Metadata only, and unrelated to querying the view.

> Views are a security layer: users need `SELECT` on the view, not on the tables behind it.

## new-modeling-04
exam: P9
topic: modeling
level: P
source: new

A customer dimension is stored as SCD type 2, so `customer_id` appears once per version. How should the fact table reference the customer so each sale points to the version valid at the time of the sale?

- [ ] By `customer_id`, joining on the current version :: Every old sale would show today's attributes.
- [x] By a surrogate key of the dimension version (for example an identity column), assigned when the fact row is loaded :: Correct. Each version has its own key, so the fact keeps the version valid at that time.
- [ ] By the customer's name :: Not unique and changes over time.
- [ ] By storing all customer attributes in the fact :: Duplicates data and breaks the dimensional model.

> SCD type 2 dimensions need surrogate keys; facts store the key of the version that was current.

## new-modeling-05
exam: P9
topic: modeling
level: P
source: new

A team starts designing a sales fact table for a new gold layer. What should they decide first?

- [ ] The clustering keys :: Layout follows from the model and the queries.
- [x] The grain: what one row represents (for example, one order line) :: Correct. Measures, keys and aggregations all depend on it.
- [ ] The dashboard colours :: Presentation, not modelling.
- [ ] The number of shuffle partitions :: An execution setting.

> Dimensional design starts with the grain of each fact table.

## new-modeling-06
exam: P9
topic: modeling
level: P
source: new

BI queries on a gold model join the fact table to `dim_product`, which is split into `product`, `subcategory` and `category` tables. Queries are slow and hard to write. Which modelling change helps most?

- [x] Denormalise the product hierarchy into a single `dim_product` (star schema) :: Correct. One join per dimension is simpler and faster for BI.
- [ ] Normalise the dimension further :: More joins, slower queries.
- [ ] Move all dimension attributes into the fact table :: Duplicates attributes on every row and breaks SCD handling.
- [ ] Replace the dimensions with views over bronze :: Pushes cleaning work into every query.

> Star schemas (denormalised dimensions) suit BI; snowflake schemas trade query simplicity for normalisation.

## new-modeling-07
exam: P9 A3
topic: modeling
level: P
source: new

A dimension table needs a surrogate key that Delta generates automatically and uniquely for every new row. How is it declared?

- [ ] `customer_sk BIGINT DEFAULT rand()` :: Random values are not guaranteed unique.
- [x] `customer_sk BIGINT GENERATED ALWAYS AS IDENTITY` :: Correct. Identity columns produce unique values on insert.
- [ ] `customer_sk STRING PRIMARY KEY` :: Primary keys are informational in Unity Catalog; they do not generate values.
- [ ] `monotonically_increasing_id()` in every load :: Values are unique per run but restart and are not stable across loads.

> Surrogate keys: identity columns.
