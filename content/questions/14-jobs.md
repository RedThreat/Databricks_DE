<!-- Practice questions for the topic 'jobs'. Format: see README.md. -->

## site-023
exam: A4
topic: jobs
level: A
source: site

A job has a cleanup task that must run after the other tasks, whether they succeed or fail. Which Run if condition?

- [ ] `ALL_SUCCESS` :: The default; cleanup would be skipped after a failure.
- [x] `ALL_DONE` :: Correct. The task runs once all dependencies finish, whatever their result.
- [ ] `AT_LEAST_ONE_FAILED` :: Runs only when something failed.
- [ ] `NONE_FAILED` :: Skipped when a dependency failed.

> Cleanup that must always run: `ALL_DONE`.

## site-068
exam: A4
topic: jobs
level: A
source: site

A task should send an alert only if any upstream task failed. Which Run if condition?

- [ ] `ALL_SUCCESS` :: Runs only when everything succeeded.
- [ ] `ALL_DONE` :: Runs whatever happened, so it would alert on success too.
- [x] `AT_LEAST_ONE_FAILED` :: Correct. Made for alerting and compensation steps.
- [ ] `NONE_FAILED` :: The opposite.

> Alerting branch: `AT_LEAST_ONE_FAILED`. A task whose condition is not met ends as Excluded.

## site-028
exam: A4
topic: jobs
level: A
source: site

A task occasionally fails because of a transient network error. What addresses this with the least effort?

- [ ] Increase the cluster size :: Size does not fix network blips.
- [x] Set a retry policy on the task (maximum retries and interval) :: Correct. Retries are configured per task; by default triggered jobs do not retry.
- [ ] Change the trigger to Continuous :: Changes how runs start, not how a task recovers.
- [ ] Add a second identical task :: Duplicates work and still fails the run.

> Transient errors: task retries. Make the task idempotent so a retry is safe.

## site-072
exam: A4
topic: jobs
level: A
source: site

A task must be stopped if it runs longer than one hour. Which setting?

- [ ] A duration warning threshold :: Only sends a notification.
- [x] `timeout_seconds = 3600` :: Correct. The attempt is killed and marked Timed Out.
- [ ] `max_retries = 1` :: Controls retries after failure.
- [ ] `max_concurrent_runs = 1` :: Controls parallel runs of the job.

> Timeout kills (per attempt); a duration warning only notifies.

## new-jobs-01
exam: A4
topic: jobs
level: A
source: new

A task sometimes hangs on an external call. It should be stopped after 30 minutes and tried again automatically. What do you configure?

- [ ] A duration warning of 30 minutes and two retries :: The warning does not stop the task.
- [x] A 30-minute timeout, retries, and *retry on timeout* enabled :: Correct. By default a timed-out attempt is not retried.
- [ ] Two retries only :: A hung task never fails, so retries never start.
- [ ] A continuous trigger :: Restarts the whole job, not the task, and continuous jobs do not use retry policies.

> Hung tasks: timeout plus `retry_on_timeout`.

## site-025
exam: A4 P1
topic: jobs
level: A
source: site

Task A computes a row count that Task B, in the same job run, needs. What is the recommended way to pass the value?

- [ ] Write it to a global temporary view :: Tasks may run on different compute; temporary views do not cross tasks.
- [x] `dbutils.jobs.taskValues.set()` in A and `dbutils.jobs.taskValues.get()` in B :: Correct. Task values are the built-in way to pass small values between tasks.
- [ ] A widget with the same name :: Widgets receive parameters; they do not carry results between tasks.
- [ ] Environment variables on the cluster :: Static configuration, not run results.

> Small values between tasks: task values (or the reference `{{tasks.A.values.key}}`).

## site-073
exam: A4
topic: jobs
level: A
source: site

How can task B use, in its parameters, the value that task `ingest` set with key `row_count`?

- [x] `{{tasks.ingest.values.row_count}}` :: Correct. A dynamic value reference to a task value.
- [ ] `${ingest.row_count}` :: Bundle-style substitution, not a job reference.
- [ ] `{{job.ingest.row_count}}` :: `job.` references are for job-level context.
- [ ] `$row_count` :: Not a reference syntax.

> `{{tasks.<task>.values.<key>}}`, `{{job.parameters.<name>}}`, `{{job.run_id}}`.

## new-jobs-02
exam: A4
topic: jobs
level: A
source: new

A developer runs a notebook interactively that contains `dbutils.jobs.taskValues.get(taskKey="ingest", key="rows")`, and the call fails. In the job it works. What makes the notebook runnable interactively?

- [ ] Running it on a SQL warehouse :: Task values have nothing to do with the compute type.
- [x] Passing `debugValue=...` to `get`, which is returned when the notebook runs outside a job :: Correct.
- [ ] Setting a widget called `rows` :: `get` does not read widgets.
- [ ] Using `default=0` only :: `default` covers a missing key in a job run; interactive runs need `debugValue`.

> `taskValues.get(taskKey, key, default, debugValue)`.

## site-027
exam: A4
topic: jobs
level: A
source: site

A job parameter and a task parameter have the same key `env`. Which value does the task receive?

- [ ] The task parameter :: Job parameters take precedence.
- [x] The job parameter :: Correct. Job parameters are pushed to every task and override task parameters with the same key.
- [ ] Neither; the job fails :: There is no conflict error.
- [ ] A random one :: Precedence is defined.

> Job parameters win over task parameters.

## sp-55
exam: P1 A4
topic: jobs
level: A
source: sp

Which command and read call store and retrieve a secret correctly?

- [x] `databricks secrets put-secret SCOPE KEY` and `dbutils.secrets.get("SCOPE", "KEY")` :: Correct. Scope first, then key, on both sides.
- [ ] `databricks tokens create` and `dbutils.tokens.get()` :: Tokens authenticate to Databricks; `dbutils.tokens` does not exist.
- [ ] `databricks secrets put-secret KEY SCOPE` and `dbutils.secrets.get("KEY", "SCOPE")` :: Arguments reversed.
- [ ] `dbutils.widgets.get("KEY")` :: Widgets are notebook parameters, not a secret store.

> Secrets: scopes and keys, read with `dbutils.secrets.get(scope, key)`; values are redacted in output.

## site-074
exam: A4
topic: jobs
level: A
source: site

A branch of a job must run only if the job parameter `full_load` equals `true`. Which task type implements this?

- [ ] For each :: Loops over a list.
- [x] If/else condition :: Correct. It evaluates a comparison and runs the true or false branch.
- [ ] Run Job :: Starts another job.
- [ ] A SQL alert :: Notifies on query results; it is not job branching.

> Branching on values: If/else condition task.

## site-113
exam: A4
topic: jobs
level: A
source: site

An ingest task sometimes finds no new files, and the transform should not run in that case. What is the best design?

- [ ] Make ingest fail when there are no files :: Marks a healthy run as failed and triggers false alerts.
- [x] Set a task value with the row count and add an If/else condition (`{{tasks.ingest.values.rows}} > 0`) before the transform :: Correct. The decision is about data, so it needs a condition on a value.
- [ ] Run if `ALL_DONE` on the transform :: Run if reacts to success or failure, not to data.
- [ ] A continuous trigger :: Changes how runs start, not what runs.

> Run if = outcomes. If/else = values.

## site-114
exam: A4
topic: jobs
level: A
source: site

An If/else condition `{{tasks.count.values.n}} == 0` never matches, although the count is zero. The value arrives as `0.0`. Why?

- [ ] Task values cannot be numbers :: They can.
- [x] `==` and `!=` compare values as strings; use a numeric operator such as `<= 0` :: Correct. `"0.0"` is not equal to `"0"` as text.
- [ ] If/else only works with job parameters :: It works with any reference.
- [ ] The condition needs Run if `ALL_DONE` :: Unrelated.

> In If/else, `==`/`!=` are string comparisons; `<`, `>`, `<=`, `>=` are numeric.

## site-070
exam: A4
topic: jobs
level: A
source: site

A job must run the same notebook once per country code, for a list of 50 codes. Which task type?

- [ ] If/else condition :: Chooses between two branches.
- [x] For each :: Correct. It runs a nested task once per element, passing the element as `{{input}}`.
- [ ] Run Job :: Starts one other job.
- [ ] Pipeline :: Runs a declarative pipeline.

> Same task over a list: For each.

## sp-54
exam: P1 A4
topic: jobs
level: P
source: sp

A job must download N report types from an unstable API. The list changes over time, each item must be tracked individually, and only failed items should be retried. Which design?

- [x] A For each task over the list :: Correct. Each iteration is a tracked run with its own retries, and concurrency is configurable.
- [ ] A loop inside one notebook :: Failures are hidden inside one task, and a retry reruns everything.
- [ ] N fixed tasks written by hand :: The job must be edited whenever the list changes.
- [ ] A pandas UDF making the calls :: A UDF is not an orchestration or retry mechanism.

> For each gives per-item status, retries and parallelism.

## new-jobs-03
exam: P1
topic: jobs
level: P
source: new

A For each task processes 300 tenant IDs; each nested run calls a rate-limited API. Runs fail with HTTP 429 when too many iterations run at once. What should you change first?

- [ ] Replace For each with a Python loop :: Loses per-item tracking and retries.
- [x] Lower the For each concurrency and give the nested task a retry policy :: Correct. Concurrency limits parallel calls; retries absorb the remaining transient errors.
- [ ] Increase the cluster size :: More capacity means even more parallel calls.
- [ ] Use a continuous trigger :: Irrelevant to the rate limit.

> For each concurrency (up to 100) is a throttle as well as an accelerator.

## sp-58
exam: P1 A4
topic: jobs
level: P
source: sp

A validation notebook runs in a job and must make the job fail when a check does not pass. How?

- [x] Raise an exception when the check fails :: Correct. An unhandled exception marks the task as failed.
- [ ] Print an error message :: The task still succeeds.
- [ ] Call `dbutils.notebook.exit("error")` :: Ends the notebook successfully, returning the text.
- [ ] Ignore it and check manually later :: Defeats the automation.

> Fail a task with an exception; `dbutils.notebook.exit` means success.

## site-026
exam: A4
topic: jobs
level: A
source: site

Files from a partner arrive at unpredictable times in a Unity Catalog volume. The job should start shortly after each arrival. Which trigger?

- [ ] Scheduled :: Would run at fixed times, too early or too late.
- [ ] Continuous :: Keeps a run active all the time, even with no files.
- [x] File arrival :: Correct. It watches a volume or external location and starts the job when new files appear.
- [ ] Manual :: Needs a person.

> Unpredictable file drops: file arrival trigger.

## site-118
exam: A4
topic: jobs
level: A
source: site

A source system overwrites the same file name in a volume every day, and a file arrival trigger on that path never fires. Why?

- [ ] File arrival triggers only watch external locations :: Volumes are supported.
- [x] File arrival triggers fire only for new files, not for overwritten ones :: Correct. Ask for unique file names, or use another trigger.
- [ ] The trigger needs *wait after last change* set to 0 :: That setting delays the trigger; it does not detect overwrites.
- [ ] The volume must be managed :: Managed and external volumes both work.

> Only new files trigger a run.

## site-071
exam: A4
topic: jobs
level: A
source: site

A job should run only when the source table `silver.orders` is updated. Which trigger?

- [ ] Scheduled :: Runs whether or not the table changed.
- [ ] File arrival :: Watches storage paths, not tables.
- [x] Table update :: Correct. It starts the job when one or all of the monitored tables are updated.
- [ ] Continuous :: Keeps a run active permanently.

> Downstream of a table another process refreshes: table update trigger.

## site-116
exam: A4
topic: jobs
level: A
source: site

A job uses a table update trigger on `silver.orders`, but it never starts, even though the table is updated. What is the most likely cause?

- [ ] Table update triggers only work on views :: They work on tables.
- [x] The job's *run as* identity lacks `SELECT` on the monitored table :: Correct. The trigger is evaluated with that identity; without access it cannot see updates.
- [ ] The table is managed :: Managed tables are supported.
- [ ] The trigger needs a file arrival path :: Different trigger type.

> Triggers evaluate as the job's run-as principal; give it access to what it watches.

## new-jobs-04
exam: A4
topic: jobs
level: A
source: new

Upstream data lands reliably by 02:00, and the finance report must be ready by 06:00 every day. Which trigger is the simplest correct choice?

- [x] A scheduled trigger at, say, 02:30 in the business time zone :: Correct. Predictable arrival plus a fixed deadline suits a time-based trigger.
- [ ] A continuous trigger :: Keeps compute running all day for one daily load.
- [ ] A file arrival trigger on a table :: File arrival watches storage paths.
- [ ] Manual runs by the finance team :: Not automated.

> Time-based triggers for predictable data and fixed deadlines; data-driven triggers when arrival is unpredictable.

## site-115
exam: A4
topic: jobs
level: A
source: site

Which Quartz cron expression schedules a job every day at 06:30?

- [ ] `30 6 * * *` :: Unix cron, without the seconds field.
- [x] `0 30 6 * * ?` :: Correct. Quartz fields: seconds, minutes, hours, day of month, month, day of week.
- [ ] `6 30 * * * ?` :: Means second 6, minute 30 of every hour.
- [ ] `0 6 30 * * ?` :: Hour 30 does not exist.

> Quartz starts with seconds. Also set the time zone of the schedule.

## site-117
exam: A4
topic: jobs
level: A
source: site

Which statement about continuous jobs is correct?

- [ ] They support task dependencies and per-task retry policies :: They do not.
- [x] They keep one run active, cannot use task dependencies or retry policies, and restart with exponential backoff after failures :: Correct.
- [ ] They run on a Quartz schedule every minute :: No schedule; a new run starts when the previous one ends.
- [ ] They require a file arrival location :: That is another trigger.

> Continuous = always one active run, restarted with backoff.

## site-119
exam: A4
topic: jobs
level: A
source: site

A job contains a pipeline task and has `max_concurrent_runs = 5`. How many runs of this job can be active at the same time?

- [ ] 5 :: The pipeline task limits it.
- [x] 1 :: Correct. A pipeline runs one update at a time, so a job with a pipeline task allows one active run.
- [ ] Unlimited :: Concurrency is always bounded.
- [ ] 0 :: The job still runs.

> Pipeline task in a job = one active run.

## new-jobs-05
exam: A4 A6
topic: jobs
level: A
source: new

A job has `max_concurrent_runs = 1` and queueing disabled. A run is still active when the next scheduled run is due. What happens to the new run?

- [ ] It cancels the active run :: Active runs are not cancelled by new ones.
- [x] It is skipped :: Correct. With queueing on, it would wait (up to 48 hours) instead.
- [ ] It runs in parallel anyway :: The limit prevents that.
- [ ] The job is paused :: Nothing is paused.

> Concurrency limit reached: queued if queueing is on, otherwise Skipped.

## site-093
exam: A4 A1
topic: jobs
level: A
source: site

A job task runs a notebook containing Python cells, and the task is configured to use a SQL warehouse. What happens?

- [ ] The Python cells are skipped :: Cells are not silently skipped.
- [x] The task fails, because SQL warehouses run only SQL :: Correct. Only an all-SQL notebook can run on a warehouse.
- [ ] The warehouse converts Python to SQL :: There is no such conversion.
- [ ] It runs, but without Photon :: It does not run at all.

> Python needs serverless or cluster compute; warehouses are SQL only.

## new-jobs-06
exam: A4
topic: jobs
level: A
source: new

A job must run a SQL file against a SQL warehouse after the ETL tasks. Which warehouse types can a SQL task use?

- [ ] Any warehouse, including classic :: Classic warehouses are not supported for SQL tasks.
- [x] Serverless or pro SQL warehouses :: Correct.
- [ ] Only an all-purpose cluster :: SQL tasks run on SQL warehouses.
- [ ] Only the job's shared job cluster :: Job clusters run notebooks and code, not SQL tasks.

> SQL and dashboard tasks: serverless or pro warehouse.

## new-jobs-07
exam: A4
topic: jobs
level: A
source: new

A dashboard must show fresh numbers as soon as the nightly pipeline has updated the gold tables, and subscribers should get the refreshed version. How should this be built?

- [ ] Schedule the dashboard to refresh at a fixed time and hope the pipeline has finished :: Breaks when the pipeline runs late.
- [x] Add a dashboard task to the job, depending on the pipeline task :: Correct. It refreshes the dashboard and its subscriptions right after the data is ready.
- [ ] Use a continuous trigger on the dashboard :: Dashboards are not jobs with triggers.
- [ ] Run the pipeline from the dashboard :: Dashboards do not orchestrate pipelines.

> Orchestrate consumers after producers: pipeline task, then dashboard task.

## new-jobs-08
exam: A4
topic: jobs
level: A
source: new

Five different jobs must all start the same "load reference data" workflow first, and the team wants to maintain that workflow in one place. Which task type helps?

- [ ] Copy the reference tasks into all five jobs :: Five copies to maintain.
- [x] A Run Job task that calls the reference data job :: Correct. The shared workflow is defined once and reused.
- [ ] A For each task :: Loops over a list; it does not reuse another job.
- [ ] A file arrival trigger on each job :: Unrelated to reuse.

> Reuse a whole workflow: Run Job task.

## sa-35
exam: A4 P8
topic: jobs
level: A
source: sa

A six-task workflow takes four hours. It failed at the fifth task because of a code error, now fixed. The first four tasks succeeded and are the slowest. What should you do?

- [x] Repair run :: Correct. Only the failed task and its dependents run again; the successful tasks are reused.
- [ ] Run the whole workflow again :: Repeats four hours of finished work.
- [ ] Restart the cluster and wait :: The cause was code, already fixed.
- [ ] Create a new workflow with only the last two tasks :: Duplicates definitions that someone must maintain.

> Repair run reuses successful work. Watch out for appending tasks, which rerun from the start.

## sa-36
exam: A4
topic: jobs
level: A
source: sa

Another workflow of the same team has a single task, which failed because of a code error that has now been fixed. What should you do?

- [x] Run the job again :: Correct. With one task there is nothing successful to preserve; repairing and rerunning give the same result.
- [ ] Repair run, to save time :: Nothing to save: the only task is the one that failed.
- [ ] Move the job to another cluster :: The error was in the code.
- [ ] Turn the workflow into a multi-task job before rerunning :: Restructuring brings nothing now.

> Repair versus rerun depends on the job's structure, not on the severity of the error.

## sp-53
exam: P8 A4
topic: jobs
level: P
source: sp

A job has four parallel tasks. One failed because a new cluster policy banned its instance type. How do you fix it without redoing the others?

- [x] Change the failed task's compute configuration and run a repair run of that task :: Correct. A repair uses the current task settings and reuses the successful tasks.
- [ ] Rerun the whole job :: Wastes the successful work.
- [ ] Disable the cluster policy :: Removes cost governance for everyone.
- [ ] Create a cluster by hand and run everything again :: Leaves the declarative configuration and reprocesses everything.

> Repairs run with the current settings, so you can fix configuration before repairing.

## new-jobs-09
exam: P8
topic: jobs
level: P
source: new

A run of a parameterised job failed because it was started with the wrong `processing_date`. Three of five tasks succeeded but used values that do not depend on the date. How do you correct the run without starting from scratch?

- [ ] Edit the job definition, change the default date, and run it again :: Changes the job for every future run and redoes all tasks.
- [x] Repair the run with a parameter override for `processing_date` :: Correct. A repair can override job parameters and reruns only the tasks that need it.
- [ ] Clone the job with a new default :: Creates a second job to maintain.
- [ ] Cancel and delete the run :: Loses the run history and fixes nothing.

> Repair runs accept parameter overrides.

## sa-37
exam: A4 A6
topic: jobs
level: A
source: sa

A notebook job failed in production with an error about the size of its output, although the transformation logic is correct and the data was written. What is the most likely cause?

- [x] The notebook's output exceeded the limit for notebook job runs (20 MB in total, 8 MB per cell) :: Correct. Displaying large DataFrames or verbose printing makes the run fail even when the writes succeeded.
- [ ] The target table reached a maximum number of files :: No such limit shows up this way.
- [ ] The cluster ran out of memory during the write :: That would raise an out-of-memory error, and the data would not have been written.
- [ ] The driver lost its connection to storage :: That gives an I/O or authentication error, and the write would not have completed.

> Do not `display` big DataFrames in production notebooks; log counts instead.

## new-jobs-10
exam: P1
topic: jobs
level: P
source: new

A platform team must create 150 similar ingestion jobs (one per source system) and keep them in sync with a configuration file. Which approach is most maintainable?

- [ ] Create them by hand in the UI :: Slow, error-prone, and drifts from the configuration file.
- [x] Generate them from the configuration with a bundle (or the Jobs API / Python SDK in a CI pipeline) :: Correct. Jobs defined as code are created, updated and reviewed consistently.
- [ ] Clone one job 150 times and edit each :: Still manual and hard to keep in sync.
- [ ] Put all 150 sources in one notebook loop :: Loses per-source tracking, retries and scheduling.

> Many jobs: define them as code (bundles, API, SDK).

## site-069
exam: A4
topic: jobs
level: A
source: site

Three tasks need the same classic cluster configuration and should share one cluster within a job run. What do you configure?

- [ ] An all-purpose cluster :: Higher DBU rate and it is not tied to the job run.
- [x] A shared job cluster referenced by `job_cluster_key` :: Correct. Tasks that reference the same `job_cluster_key` run on the same job cluster, which starts once per run.
- [ ] Three separate job clusters :: Three start-ups and three times the overhead.
- [ ] A SQL warehouse :: A SQL warehouse only runs SQL tasks.

> `job_cluster_key` lets several tasks in one run share a job cluster. Libraries are then declared on each task, not on the shared cluster.
