---
id: monitoring
title: Monitoring, alerting and system tables
group: Operations
order: 17
summary: Job run history and statuses, finding upstream blockers, pipeline event logs, system tables for cost, audit and workloads, SQL alerts, monitoring with the API, CLI and SDK, and data quality monitoring.
---

## Monitoring jobs

**The Runs tab** of a job has two views:

- **Matrix view**: one column per run; the bar height is the run's duration and each cell is a task's status. Comparing bar heights against recent runs shows trends at a glance.
- **List view**: runs with start time, duration, trigger and status.

The UI keeps about **60 days** of runs. For longer baselines use the system tables below.

Inside a run, the **duration breakdown** separates time spent *queued*, *waiting for resources* (getting compute), *installing libraries* and *running*. If only *waiting for resources* grew, the code is not the problem: use pools, serverless (performance optimized), or group small jobs into one multi-task job.

**Run and task statuses**

| Status | Meaning |
|---|---|
| Succeeded | Every task succeeded |
| Failed | A leaf task failed (the final state comes from the leaf tasks) |
| Succeeded with failures | Only non-leaf tasks failed; leaf tasks still succeeded (for example with Run if `ALL_DONE`) |
| Timed out | An attempt exceeded its timeout |
| Canceled | Stopped by a user or an API call |
| Skipped | Not started because the concurrency limit was reached and queueing was off |
| Upstream failed / Upstream canceled | Did not run because a dependency failed or was canceled |
| Excluded | Did not run because its Run if condition was not met (normal) |

**Finding the blocker**: in the task graph, walk upstream from any *Upstream failed* task to the **first** task that failed, and read its output and logs.

**Health rules** add a duration warning (`RUN_DURATION_SECONDS`) or streaming backlog thresholds; they notify but do not stop the run.

## Monitoring pipelines

- The pipeline graph shows each dataset's status, row counts and quality metrics; the data quality view shows passed and failed records per expectation.
- The **event log** records everything and is queryable:

```sql
SELECT timestamp, event_type, message
FROM event_log(TABLE(main.sales.silver_orders))          -- or event_log('<pipeline-id>')
WHERE level = 'ERROR' ORDER BY timestamp DESC;

SELECT timestamp,
       details:flow_progress.data_quality.expectations AS expectations,
       details:flow_progress.metrics.backlog_bytes       AS backlog
FROM event_log(TABLE(main.sales.silver_orders))
WHERE event_type = 'flow_progress';
```

| Event type | Tells you |
|---|---|
| `flow_progress` | Rows processed, backlog, data quality results per expectation |
| `update_progress` | State of each update (running, completed, failed) |
| `planning_information` | Whether a materialized view refreshed incrementally or fully, and why |
| `user_action` | Who started, stopped or changed the pipeline |
| `cluster_resources` | Autoscaling decisions |

## System tables

System tables are read-only Delta tables in the `system` catalog, governed by Unity Catalog (an admin enables the schemas and grants `USE` and `SELECT`).

| Table | Use it for |
|---|---|
| `system.billing.usage` | Usage in DBUs (`usage_quantity`) by SKU, workspace, job, pipeline, warehouse and custom tags |
| `system.billing.list_prices` | Price per SKU over time; join with usage to estimate cost |
| `system.compute.clusters`, `node_timeline`, `warehouse_events` | Compute configuration, utilisation, warehouse scaling and idle time |
| `system.query.history` | Queries on SQL warehouses and serverless: duration, user, bytes read |
| `system.lakeflow.jobs`, `job_tasks`, `job_run_timeline`, `job_task_run_timeline` | Job definitions and run history (about a year), for trends and failure rates |
| `system.access.audit` | Who did what, when, from where (about a year of events) |
| `system.access.table_lineage`, `column_lineage` | Lineage between tables, columns, notebooks and jobs |
| `system.storage.predictive_optimization_operations_history` | What predictive optimization did |

```sql
-- daily list cost per SKU, last 30 days
SELECT u.usage_date, u.sku_name,
       SUM(u.usage_quantity * p.pricing.default) AS list_cost
FROM system.billing.usage u
JOIN system.billing.list_prices p
  ON u.sku_name = p.sku_name
 AND u.usage_start_time >= p.price_start_time
 AND (p.price_end_time IS NULL OR u.usage_start_time < p.price_end_time)
WHERE u.usage_date >= current_date() - INTERVAL 30 DAYS
GROUP BY ALL ORDER BY 1, 3 DESC;

-- failure rate per job, last 90 days
SELECT job_id,
       count_if(result_state = 'FAILED') / count(*) AS failure_rate,
       count(*) AS runs
FROM system.lakeflow.job_run_timeline
WHERE period_start_time >= current_date() - INTERVAL 90 DAYS AND result_state IS NOT NULL
GROUP BY job_id ORDER BY failure_rate DESC;
```

- Cost per job: `usage_metadata.job_id`. Cost per team: `custom_tags` (cluster tags, or serverless usage policies that add tags).
- Usage is measured in DBUs; `usage_quantity` is the column to sum (there is no `dbus` column).
- Long runs can be split across several rows of the timeline tables; aggregate by `run_id`.

## Alerts

A Databricks SQL alert (the Professional exam guide calls them Lakehouse alerts) runs a query on a schedule, evaluates a **condition on one value** of the result (column, operator, threshold) and notifies destinations (email, Slack, Teams, webhooks, PagerDuty) when it triggers.

- Put composite logic in the query and return a single value: `SELECT CASE WHEN pct_no_email > 15 AND pct_bad_phone > 10 THEN 1 ELSE 0 END AS breach`, alert when `breach = 1`.
- Typical uses from the exam guide: governed metrics, data quality and anomalies, usage and cost (on `system.billing.usage`), SQL warehouse health, audit and security events (on `system.access.audit`), AI agent quality, and **job branching**: an alert can run as a task, and its outcome can decide which tasks run next.
- Executives who want a daily cost report: a **dashboard** on system tables with a scheduled refresh and a **subscription**.

## Monitoring with the API, CLI and SDK

```bash
databricks jobs list-runs --job-id 123 --completed-only --start-time-from 1764547200000 -o json
databricks jobs get-run 456 -o json
databricks pipelines list-pipeline-events <pipeline-id>
```

```python
from databricks.sdk import WorkspaceClient
w = WorkspaceClient()
for run in w.jobs.list_runs(job_id=123, completed_only=True, limit=25):
    print(run.run_id, run.state.result_state, run.run_duration)
```

The Jobs REST API (`/api/2.2/jobs/runs/list`, `/runs/get`, `/runs/get-output`) offers the same information to external orchestrators and monitoring tools.

## Data quality monitoring

Formerly Lakehouse Monitoring:

- **Anomaly detection**, enabled per schema, checks tables for **freshness** (data arrives on time) and **completeness** (expected volume) automatically and records results in system tables.
- **Data profiling** computes profile and drift metrics for a table (snapshot, time series or model inference) into metric tables with a generated dashboard; alerts can be set on the metrics.

## Audit and lineage

- **Audit logs**: `system.access.audit` (or JSON files delivered to storage) answer "who read, changed or granted what". Account-level events have `workspace_id = 0`.
- **Lineage** is captured automatically for tables, columns, notebooks, jobs, pipelines, dashboards and queries. Before changing a column, open the table's **Lineage** tab in Catalog Explorer (or query the lineage system tables) to see every downstream consumer.
- `DESCRIBE HISTORY` tells you what happened to one Delta table; lineage tells you who depends on it; audit tells you who accessed it.

## Exam traps

!!! trap "Older than 60 days"
    The job UI shows about 60 days of runs. Longer trends come from `system.lakeflow` tables.

!!! trap "Run history versus code"
    If a run got slower only in *waiting for resources*, tuning Spark will not help.

!!! tip "Alerts evaluate one value"
    Combine conditions inside the query and alert on the single result.

## Hands-on

1. Open any job's Runs tab and switch between matrix and list views.
2. Query `system.billing.usage` (if your account exposes it) for your usage of the last 7 days, grouped by `sku_name`.
3. Query the event log of the pipeline from the pipelines topic for `flow_progress` events.
4. Create a SQL alert on a query that returns the number of rows in a quarantine table; trigger it by inserting a bad row.
5. Use the Python SDK in a notebook (`from databricks.sdk import WorkspaceClient`) to list your last job runs.
