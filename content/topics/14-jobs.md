---
id: jobs
title: Lakeflow Jobs
group: Orchestration and DevOps
order: 14
summary: Tasks and the task graph, compute per task, parameters and task values, retries and timeouts, Run if, If/else and For each, triggers, concurrency, repair runs, and automating jobs with the API, CLI and SDK.
---

## Jobs and tasks

A job is a graph of **tasks** plus a **trigger**, compute, parameters, notifications and permissions. Tasks with no dependency between them run in parallel; `depends_on` builds the graph (up to 1,000 tasks).

| Task type | Runs |
|---|---|
| Notebook | A notebook (Python, SQL, Scala, R) from the workspace or a Git repository |
| Python script, Python wheel, JAR | Code files and packages |
| SQL | A query, a SQL file or an alert, on a SQL warehouse |
| Dashboard | Refreshes a dashboard (and sends subscriptions) after the data is ready |
| Pipeline | A declarative pipeline update (optionally a full refresh) |
| dbt | A dbt project |
| Run Job | Another job, to reuse and modularise |
| If/else condition | Chooses a branch from a comparison |
| For each | Runs a nested task once per item of a list |

**Compute per task**

| Option | Notes |
|---|---|
| Serverless | Recommended default. Python script, wheel and dbt tasks declare an `environment_key` with their dependencies |
| Job cluster | Classic cluster created for the run. Several tasks share it through the same `job_cluster_key`; libraries are then declared on each task |
| Existing all-purpose cluster | Possible, but expensive and not isolated; avoid in production |
| SQL warehouse | SQL and dashboard tasks (serverless or pro, not classic). A notebook task can use a warehouse only if the notebook is entirely SQL |

## Parameters, values and secrets

- **Job parameters** are defined at job level, pushed to every task, and **override** task parameters with the same key. A run can be started with different values.
- **Task parameters** are per task: notebook parameters (read with `dbutils.widgets.get("name")`) or command-line arguments for scripts.
- **Dynamic value references** insert run context: `{{job.id}}`, `{{job.run_id}}`, `{{job.start_time.iso_date}}`, `{{job.parameters.env}}`, `{{task.name}}`, `{{tasks.ingest.values.rows}}`.
- **Task values** pass small results between tasks of the same run:

```python
# in task "ingest"
dbutils.jobs.taskValues.set(key="rows", value=new_rows)
# in a later task
rows = dbutils.jobs.taskValues.get(taskKey="ingest", key="rows", default=0, debugValue=0)
```

`debugValue` is what `get` returns when you run the notebook interactively, outside a job; without it the call fails.

- **Secrets**: store with `databricks secrets put-secret SCOPE KEY`, read with `dbutils.secrets.get("SCOPE", "KEY")`. Values are redacted in outputs.

## Control flow

**Retries and timeouts** (per task):

| Setting | Effect |
|---|---|
| Retries (`max_retries`, `min_retry_interval_millis`) | Rerun the task after a failure; for transient errors. Default: no retries for triggered jobs |
| `retry_on_timeout` | Also retry when the attempt timed out |
| Timeout (`timeout_seconds`) | Kills an attempt that runs too long; status *Timed Out*. Applies to each attempt |
| Duration warning (health rule) | Only notifies; the run continues |

**Run if** decides whether a task runs, based on the outcome of its dependencies:

| Condition | Runs when | Typical use |
|---|---|---|
| `ALL_SUCCESS` (default) | All dependencies succeeded | Normal flow |
| `ALL_DONE` | All dependencies finished, whatever the result | Cleanup that must always run |
| `AT_LEAST_ONE_FAILED` | At least one dependency failed | Alerting, compensation |
| `NONE_FAILED` | None failed (some may be skipped or excluded) | Continue after optional branches |
| `AT_LEAST_ONE_SUCCESS` | At least one succeeded | Fan-in of alternative paths |
| `ALL_FAILED` | All failed | Fallback |

A task whose Run if condition is not met ends as **Excluded**, which is normal in a healthy run.

**Run if reacts to success or failure, not to data.** To skip downstream work when there is nothing new, set a task value with the row count and add an **If/else condition** task:

| Left | Operator | Right |
|---|---|---|
| `{{tasks.ingest.values.rows}}` | `>` | `0` |

In If/else, `==` and `!=` compare values **as strings** (`0` and `0.0` are different), while `>`, `>=`, `<`, `<=` compare numbers.

**For each** runs a nested task once per element of a JSON array (a literal, a job parameter or a task value). The nested task reads the current item as `{{input}}`; each iteration is tracked and retried on its own, with a concurrency of up to 100. Use it instead of a loop inside one notebook, which hides failures and cannot retry single items.

To make a task fail on purpose (a validation that does not pass), **raise an exception**. `dbutils.notebook.exit("...")` ends the notebook **successfully** and returns the text.

## Triggers

| Trigger | Starts the job | Details |
|---|---|---|
| Scheduled | On a cron schedule | Quartz syntax with **seconds first** and a time zone: `0 30 6 * * ?` = 06:30 every day |
| File arrival | When **new** files arrive in a volume or external location | Checked about every minute; files rewritten with the same name do not count; options *minimum time between triggers* and *wait after last change* |
| Table update | When monitored tables (up to 10, any or all) are updated | The job's *run as* identity needs `SELECT` on them, otherwise the job never starts |
| Continuous | Keeps exactly one run active; starts a new one when the last ends | No task dependencies or retry policies; failures restart with exponential backoff |
| Manual / API | Run now, CLI, REST API, SDK, other jobs | — |

**Time-based or data-driven?** A schedule fits a fixed business deadline with predictable data. File arrival fits files that land at unpredictable times. Table update fits a job that depends on a table another team or pipeline refreshes. Continuous fits data that never stops and needs low latency.

## Concurrency, identity and permissions

- `max_concurrent_runs` (default 1). When a new run would exceed it, it is **queued** (if queueing is on, for up to 48 hours) or **Skipped**.
- A job with a **pipeline task** can only have one active run, because a pipeline runs one update at a time.
- **Run as** a service principal in production, so runs do not depend on a person's account.
- Job permissions: *Can View*, *Can Manage Run* (start, cancel, repair), *Is Owner*, *Can Manage* (edit). Grant the least level each person needs.
- Notifications (email, Slack, Teams, webhooks) on start, success, failure, duration warning and streaming backlog.
- A notebook task's total output is limited (20 MB, 8 MB per cell); a run that exceeds it fails even though its writes succeeded. Do not `display` large DataFrames in production notebooks.

## Repair runs

When a multi-task run fails, **Repair run** reruns only the failed tasks and the tasks that depend on them, reusing the successful ones. You can change task settings and **override parameters** for the repair.

- A repaired task starts again from the beginning, so a task that appends can create duplicates: write with `MERGE` or overwrite instead.
- For a single-task job, repairing and rerunning are the same thing.
- CLI: `databricks jobs repair-run RUN_ID --rerun-all-failed-tasks`.

## Automating jobs

| Tool | Example |
|---|---|
| UI | Jobs & Pipelines → Create job |
| REST API (Jobs 2.2) | `POST /api/2.2/jobs/run-now` with `job_id` and `job_parameters` |
| CLI | `databricks jobs create --json @job.json`, `databricks jobs run-now 123`, `databricks jobs get-run 456`, `databricks jobs list-runs --job-id 123 --completed-only --start-time-from <epoch ms>`, `databricks jobs cancel-run 456` |
| Python SDK | `WorkspaceClient().jobs.run_now(job_id=123).result()` |
| Bundles | Jobs defined as YAML and deployed per environment (see *CI/CD*) |

## Exam traps

!!! trap "Run if is about outcomes"
    "Skip the transform when no files arrived" is an If/else on a task value, not a Run if condition, and not a deliberate failure.

!!! trap "Quartz has seconds"
    `30 6 * * *` is Unix cron. Databricks uses Quartz: `0 30 6 * * ?`.

!!! trap "Timeout versus warning"
    A timeout stops the attempt; a duration warning only notifies.

!!! tip "Upstream failed"
    Walk up the graph to the first task that failed; the task marked *Upstream failed* did not run.

## Hands-on

1. Create a job with three notebook tasks: `ingest` sets a task value `rows`, an If/else task checks `{{tasks.ingest.values.rows}} > 0`, and `transform` runs on the true branch. Add a `cleanup` task with Run if `ALL_DONE`.
2. Add a job parameter `env` and read it in a notebook with `dbutils.widgets.get("env")`.
3. Make `transform` raise an exception, run the job, fix the code, and use **Repair run**.
4. Add a For each task over `["PT", "ES", "FR"]` that passes `{{input}}` to a notebook parameter.
5. Add a file arrival trigger on a volume folder and drop a file into it.
