<!-- Practice questions for the topic 'udf-ai'. Format: see README.md. -->

## sp-62
exam: P1
topic: udf-ai
level: P
source: sp

Why are pandas UDFs usually faster than plain Python UDFs?

- [x] They use Apache Arrow and process vectorised batches, reducing the cost of moving data between the JVM and Python :: Correct. Instead of one call per row, they work on pandas Series.
- [ ] They remove serialisation entirely :: Serialisation still happens, but in efficient batches.
- [ ] They run inside the JVM, without a Python process :: They still run in Python workers.
- [ ] They process one row at a time to save memory :: That is the model of plain Python UDFs.

> pandas UDF speed comes from Arrow batches and vectorised code.

## new-udf-01
exam: P1 A3
topic: udf-ai
level: P
source: new

A phone-number normalisation rule written in SQL must be reused by analysts on SQL warehouses and by engineers in pipelines across three workspaces, with access controlled centrally. What should be created?

- [ ] A Python UDF registered with `spark.udf.register` in a notebook :: Lives only in that session.
- [x] A Unity Catalog SQL function (`CREATE FUNCTION main.util.normalize_phone(...) RETURN ...`) with `EXECUTE` granted to the groups :: Correct. Stored once, governed, usable from SQL and Python everywhere the metastore is attached.
- [ ] A temporary function created at the start of each job :: Must be redefined everywhere; no central governance.
- [ ] A view that applies the rule to one table :: Works for one table only.

> Shared, governed logic: Unity Catalog functions; SQL UDFs are also the fastest kind.

## new-udf-02
exam: P1
topic: udf-ai
level: P
source: new

A pandas UDF scores rows with a model that takes 20 seconds to load. Loading it for every batch makes the job slow. Which pandas UDF form fixes this?

- [ ] Series to scalar :: An aggregation form.
- [x] Iterator of Series to Iterator of Series, loading the model once before looping over the batches :: Correct. Expensive setup happens once per task instead of once per batch.
- [ ] A plain Python UDF :: Even slower: one call per row.
- [ ] `applyInPandas` grouped by a constant :: Forces all data into one group.

> Expensive initialisation in a UDF: iterator pandas UDF.

## new-udf-03
exam: A3
topic: udf-ai
level: A
source: new

A notebook uses a Python UDF that returns `name.strip().upper()`. Which change gives the biggest performance gain?

- [ ] Convert it to a pandas UDF :: Better than a plain UDF, but still slower than built-ins.
- [x] Replace it with the built-in functions `upper(trim(name))` :: Correct. Built-ins run in the engine (and Photon), with no Python serialisation.
- [ ] Cache the DataFrame first :: The UDF cost remains.
- [ ] Add more executors :: Spends more for the same inefficiency.

> If a built-in function exists, a UDF is the wrong answer.

## new-udf-04
exam: P3
topic: udf-ai
level: P
source: new

Support tickets must be tagged with one of `billing`, `delivery`, `product` or `other`, in a SQL pipeline, without training a model. Which function fits?

- [ ] `ai_analyze_sentiment(body)` :: Returns sentiment, not a category.
- [x] `ai_classify(body, ARRAY('billing', 'delivery', 'product', 'other'))` :: Correct. It picks one of the given labels for each row.
- [ ] `ai_summarize(body)` :: Produces a summary.
- [ ] `regexp_extract(body, 'billing|delivery')` :: Brittle keyword matching, not classification.

> Fixed label set: `ai_classify`. Free-form or custom model: `ai_query`.

## new-udf-05
exam: P3
topic: udf-ai
level: P
source: new

A batch query calls `ai_query` on a million rows; a handful of malformed inputs make the whole query fail after an hour. What should you change?

- [ ] Retry the query until it passes :: The same rows fail again.
- [x] Call `ai_query(..., failOnError => false)` so each row returns a result and an error message, then handle the failed rows :: Correct. One bad row no longer fails the batch.
- [ ] Replace `ai_query` with a Python UDF calling the endpoint :: More code and no better error handling.
- [ ] Run it on a bigger SQL warehouse :: Size does not fix malformed input.

> Batch inference: `failOnError => false`, then inspect the errors.

## new-udf-06
exam: P3
topic: udf-ai
level: P
source: new

Product reviews are enriched with `ai_analyze_sentiment` in a materialized view, and costs grow every day because existing reviews are scored again. Which design avoids paying for old rows again?

- [x] Score reviews in a streaming table that processes each new review once :: Correct. Incremental processing calls the model only for new rows.
- [ ] Refresh the materialized view more often :: Increases the cost.
- [ ] Replace the function with `ai_query` :: Same cost profile if old rows are recomputed.
- [ ] Use a regular view :: Calls the model on every query.

> Run AI functions incrementally; never re-score unchanged rows.
