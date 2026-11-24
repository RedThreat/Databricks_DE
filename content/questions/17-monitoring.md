<!-- Practice questions for the topic 'monitoring'. Format: see README.md. -->

## site-087
exam: A7 P4 P6
topic: monitoring
level: A
source: site

Where can you query who accessed which tables in Unity Catalog?

- [x] `system.access.audit` :: Correct. Audit events record who did what, when and from where.
- [ ] `system.billing.usage` :: Usage and cost, not access.
- [ ] `DESCRIBE HISTORY` :: Operations on one Delta table, not reads by users.
- [ ] `information_schema.tables` only :: Lists tables, not access events.

> Who did what: `system.access.audit`.

## sa-10
exam: A2 P4
topic: monitoring
level: A
source: sa

To meet compliance requirements, a security team wants to ingest the workspace's activity logs into a SIEM tool. In which format are Databricks audit logs delivered?

- [x] JSON :: Correct. Each event is a JSON object with time, identity, action, affected resource and request origin.
- [ ] CSV :: A flat format does not fit the nested, variable fields of events.
- [ ] XML :: Structured, but not the format used.
- [ ] Unstructured plain text :: Would not allow consistent processing.

> Audit logs: JSON files, or the `system.access.audit` table.

## sp-42
exam: P4
topic: monitoring
level: P
source: sp

Which query returns daily DBU usage per SKU?

- [x] `SELECT date_trunc('day', usage_start_time) AS d, sku_name, SUM(usage_quantity) FROM system.billing.usage GROUP BY d, sku_name` :: Correct. Sums consumption by both dimensions.
- [ ] The same query with `COUNT(usage_quantity)` :: Counts usage records, not consumption.
- [ ] The same query with `SUM(dbus)` :: There is no `dbus` column; it is `usage_quantity`.
- [ ] The same query with `GROUP BY d` only :: `sku_name` is neither grouped nor aggregated.

> Usage = `SUM(usage_quantity)` from `system.billing.usage`; cost = join with `list_prices`.

## new-mon-01
exam: P4
topic: monitoring
level: P
source: new

Finance wants the estimated list cost in dollars per job for last month. Which approach is correct?

- [ ] `SUM(usage_quantity)` from `system.billing.usage` grouped by job :: DBUs, not dollars.
- [x] Join `system.billing.usage` with `system.billing.list_prices` on SKU and the price validity period, multiply `usage_quantity` by the price, and group by `usage_metadata.job_id` :: Correct.
- [ ] Count runs per job in `system.lakeflow.job_run_timeline` :: Runs are not cost.
- [ ] Read the cloud provider bill only :: Misses the DBU cost split by job.

> Cost = usage × list price, attributed through `usage_metadata` and tags.

## sp-43
exam: P4
topic: monitoring
level: P
source: sp

Executives need a daily report of consumption per team that updates itself. What should you build?

- [x] A dashboard on system tables with a scheduled refresh and a subscription :: Correct. Generated and delivered with no manual work.
- [ ] Share the query so each executive runs it :: Needs manual runs every time.
- [ ] Ask each team to report its own usage :: Incomplete, late and not auditable.
- [ ] Revoke access to SQL warehouses :: Produces no report.

> Recurring reporting: dashboard + schedule + subscription.

## sp-64
exam: P4
topic: monitoring
level: P
source: sp

A SQL alert must fire when more than 15% of customers have no email AND more than 10% have an invalid phone number. Which query pattern works for the alert?

- [x] Compute both percentages in a subquery and return `CASE WHEN p_email > 15 AND p_phone > 10 THEN 1 ELSE 0 END` :: Correct. The alert evaluates one value, so the combined logic must live in it.
- [ ] Return both percentages in separate columns :: The alert condition checks one column.
- [ ] `SELECT COUNT(*)` with `OR` between the conditions :: Uses OR instead of AND and counts rows instead of percentages.
- [ ] List the customers matching both conditions :: A list of rows has no single value to compare.

> Alerts compare one value; build composite conditions in the query.

## new-mon-02
exam: P4
topic: monitoring
level: P
source: new

The platform team wants to be notified when any SQL warehouse has been running for more than 2 hours without executing queries. What is the simplest approach?

- [ ] Ask users to stop warehouses when they finish :: Manual and unreliable.
- [x] A SQL alert on a query over the compute system tables (warehouse events and query history) that returns the number of idle warehouses, triggering when it is above 0 :: Correct. Alerts on system tables cover warehouse health and cost.
- [ ] A Spark UI listener :: Warehouses do not expose the Spark UI.
- [ ] Disable auto stop :: Makes idle time worse.

> System tables + SQL alerts = operational monitoring without extra tools.

## sp-22
exam: P4 P3
topic: monitoring
level: P
source: sp

Where can you programmatically extract the number of records that passed and failed each expectation of a declarative pipeline?

- [x] In the event log, in `flow_progress` events, under `details.flow_progress.data_quality.expectations` :: Correct. The pipeline records quality metrics per expectation there.
- [ ] In events of type `expectation_result` :: That event type does not exist.
- [ ] In `system.billing.usage` :: Usage and cost only.
- [ ] In `DESCRIBE HISTORY` of the target table :: Lists Delta operations, not expectation results.

> Pipeline health and quality: the event log.

## new-mon-03
exam: P4
topic: monitoring
level: P
source: new

A materialized view in a pipeline suddenly takes much longer to refresh. How can you find out whether it was refreshed incrementally or recomputed in full, and why?

- [ ] `DESCRIBE DETAIL` on the materialized view :: Shows files and properties, not refresh decisions.
- [x] Query the pipeline event log for `planning_information` events :: Correct. They record the refresh technique chosen and the reason.
- [ ] Check `system.billing.usage` :: Shows cost, not the refresh method.
- [ ] Look at the Spark UI Storage tab :: Shows cached data.

> `planning_information` explains incremental versus full refreshes.

## site-082
exam: A6
topic: monitoring
level: A
source: site

A job run shows task D as *Upstream failed*. How should you troubleshoot?

- [ ] Fix task D's code :: D never ran.
- [x] Go up the task graph to the first failed task and inspect it :: Correct.
- [ ] Increase D's retries :: D did not fail; it was not started.
- [ ] Change D's compute :: Irrelevant to D.

> *Upstream failed* points upstream: find the first failure.

## new-mon-04
exam: A6
topic: monitoring
level: A
source: new

A job ends with the status *Succeeded with failures*. What does this tell you?

- [x] At least one non-leaf task failed, but the leaf tasks succeeded (for example because a downstream task runs with `ALL_DONE`) :: Correct. The final state is derived from the leaf tasks.
- [ ] Every task succeeded, with warnings :: A task did fail.
- [ ] A leaf task failed :: The run would be Failed.
- [ ] The job timed out :: The status would be Timed out.

> Final status comes from leaf tasks; check failed non-leaf tasks even when the run "succeeded".

## site-125
exam: A6
topic: monitoring
level: A
source: site

A job got 10 minutes slower with no code or data change. The run's duration breakdown shows the extra time in *Waiting for resources*. Which change helps?

- [ ] Tune `spark.sql.shuffle.partitions` :: The running time did not change.
- [x] Reduce compute acquisition time: instance pools, serverless (performance optimized), or grouping jobs into one multi-task job :: Correct. The problem is getting compute, not the code.
- [ ] Add a broadcast hint :: Affects query execution, not start-up.
- [ ] Run `OPTIMIZE` on the tables :: Affects reads, not waiting for compute.

> Read the duration breakdown before tuning anything.

## new-mon-05
exam: A6 P4
topic: monitoring
level: A
source: new

A manager asks whether a daily job has been getting slower over the last six months. The job's Runs tab only shows about two months. Where do you get the data?

- [ ] Export screenshots of the matrix view every week :: Manual and too late for past runs.
- [x] `system.lakeflow.job_run_timeline`, aggregating run durations by `run_id` and date :: Correct. System tables keep about a year of run history.
- [ ] `DESCRIBE HISTORY` of the job's output table :: Shows table versions, not job durations.
- [ ] The cluster event log :: Covers cluster events, not job run history.

> Beyond the UI's window: `system.lakeflow` tables.

## new-mon-06
exam: A6
topic: monitoring
level: A
source: new

In the matrix view of a job's run history, the last five bars are clearly taller than the previous twenty, and all task cells are green. What does this indicate and what is a good next step?

- [ ] Nothing; the bars show data volume, not time :: Bar height is run duration.
- [x] Runs are succeeding but taking longer; compare the slow runs' task durations and duration breakdown with earlier runs to find which task and which phase grew :: Correct.
- [ ] The job is failing silently :: Green cells mean the tasks succeeded.
- [ ] The job's schedule changed :: The view shows durations, not schedules.

> Matrix view: height = duration, cells = task status. Compare with the baseline, then drill down.

## sp-52
exam: P4 P1
topic: monitoring
level: P
source: sp

An external orchestrator must know whether job X has already finished today. Which `databricks jobs list-runs` options should it use?

- [x] `--start-time-from` (today's midnight in epoch milliseconds) and `--completed-only` :: Correct. Runs started today that have finished.
- [ ] `--start-time-to` and `--active-only` :: Bounds the end of the window and returns only running runs.
- [ ] `--start-time-to` and `--completed-only` :: The time filter points the wrong way.
- [ ] `--start-time-from` and `--active-only` :: Returns only runs still in progress.

> CLI, API and SDK expose run state for external monitoring.

## new-mon-07
exam: P4
topic: monitoring
level: P
source: new

A Python script outside Databricks must check the result state of the last 20 completed runs of job 123. Which code is idiomatic?

- [ ] Scrape the Jobs UI HTML :: Fragile and unsupported.
- [x] `WorkspaceClient().jobs.list_runs(job_id=123, completed_only=True, limit=20)` from the Databricks SDK, reading `run.state.result_state` :: Correct.
- [ ] `spark.sql("SHOW JOB RUNS 123")` :: Not a SQL command.
- [ ] `dbutils.jobs.taskValues.get(...)` :: Reads task values inside a run.

> SDK, CLI and REST API offer the same run information.

## new-mon-08
exam: P4
topic: monitoring
level: P
source: new

A team wants to be warned automatically when any table in its `sales` schema stops receiving fresh data or receives far fewer rows than usual, without writing a check for every table. What should they enable?

- [ ] A Delta `CHECK` constraint on every table :: Validates rows, not freshness or volume.
- [x] Anomaly detection (data quality monitoring) on the schema, which checks freshness and completeness of its tables automatically :: Correct.
- [ ] `DESCRIBE HISTORY` reviews every morning :: Manual.
- [ ] Predictive optimization :: Maintains tables; does not watch data arrival.

> Freshness and completeness across many tables: anomaly detection.

## new-mon-09
exam: P4 P6
topic: monitoring
level: P
source: new

The security team must be notified within an hour whenever someone changes permissions on objects of the `finance` catalog. What is a simple, governed way to do this?

- [ ] Ask catalog owners to report their changes :: Manual and unreliable.
- [x] A scheduled SQL alert on a query over `system.access.audit` that counts permission-change events on `finance` objects in the last hour, triggering when the count is above 0 :: Correct. Audit system tables plus alerts cover security events.
- [ ] `DESCRIBE HISTORY` on every table :: Shows data operations, not grants.
- [ ] A row filter on the finance tables :: Restricts rows; it does not detect changes.

> Security monitoring: alerts on `system.access.audit`.

## new-mon-10
exam: P4 A6
topic: monitoring
level: P
source: new

A job usually takes 40 minutes; the business needs to know when it takes longer than 90 minutes, but the run must not be stopped. What should you configure?

- [ ] A timeout of 90 minutes :: Kills the run.
- [x] A duration warning (health rule on run duration) of 90 minutes with a notification :: Correct. It notifies and lets the run continue.
- [ ] Two retries :: Unrelated to duration.
- [ ] A continuous trigger :: Changes how runs start.

> Warn with health rules; stop with timeouts.

## new-mon-11
exam: P4 P1
topic: monitoring
level: P
source: new

A continuous streaming job must alert the on-call engineer when it falls behind its source by more than 10 minutes. What should you configure on the job?

- [ ] A duration warning of 10 minutes :: A continuous run always lasts longer than that.
- [x] A streaming backlog health rule (for example backlog in seconds above 600) with a notification :: Correct. Jobs can watch streaming backlog metrics.
- [ ] A timeout of 10 minutes :: Would stop the stream repeatedly.
- [ ] `max_concurrent_runs = 1` :: Already the case for continuous jobs; unrelated to lag.

> Streams: alert on backlog, not on duration.

## new-mon-12
exam: P4 P3
topic: monitoring
level: P
source: new

A declarative pipeline update failed overnight. Which query finds the error messages quickly?

- [x] `SELECT timestamp, message FROM event_log(TABLE(main.sales.silver_orders)) WHERE level = 'ERROR' ORDER BY timestamp DESC` :: Correct. The event log records errors with their messages and details.
- [ ] `DESCRIBE HISTORY main.sales.silver_orders` :: Shows committed operations, not failed updates.
- [ ] `SELECT * FROM system.billing.usage WHERE ...` :: Usage, not errors.
- [ ] `SHOW GRANTS ON TABLE main.sales.silver_orders` :: Privileges.

> Pipeline troubleshooting starts in the event log.

## new-mon-13
exam: P4 P5
topic: monitoring
level: P
source: new

Users complain that a SQL warehouse became slow this week. Which system table helps find the slowest and most frequent queries, with who ran them?

- [ ] `system.billing.list_prices` :: Prices per SKU.
- [x] `system.query.history` :: Correct. It records each query's duration, user, warehouse and bytes read.
- [ ] `system.access.table_lineage` :: Lineage between objects.
- [ ] `system.storage.predictive_optimization_operations_history` :: Table maintenance.

> Query-level monitoring: `system.query.history`; then open the slowest queries' profiles.
