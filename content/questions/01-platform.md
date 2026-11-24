<!-- Practice questions for the topic 'platform'. Format: see README.md. -->

## site-003
exam: A1
topic: platform
level: A
source: site

An older study guide mentions "Delta Live Tables (DLT)". What is the current name of this product?

- [ ] Lakeflow Connect :: The ingestion connectors.
- [ ] Lakeflow Jobs :: The orchestrator (formerly Workflows).
- [x] Lakeflow Spark Declarative Pipelines :: Correct. DLT was renamed; the concepts (streaming tables, materialized views, expectations) are the same.
- [ ] Declarative Automation Bundles :: The deployment tool (formerly Asset Bundles).

> DLT → Lakeflow Spark Declarative Pipelines; Workflows → Lakeflow Jobs; Asset Bundles → Declarative Automation Bundles; Repos → Git folders.

## site-001
exam: A1
topic: platform
level: A
source: site

Which statement about the Databricks architecture is correct?

- [ ] The control plane runs in the customer's cloud account when classic compute is used :: The control plane never moves to the customer's account; only the compute plane differs.
- [x] The control plane is always hosted in the Databricks account; classic compute runs in the customer's cloud account :: Correct. Classic machines are VMs in your account; serverless machines are in the Databricks account.
- [ ] Serverless compute runs in the customer's cloud account :: Serverless compute runs in a Databricks-managed account, in the same region.
- [ ] Both planes always run in the customer's cloud account :: The control plane (web app, scheduler, APIs) is always operated by Databricks.

> The control plane is always in the Databricks account. Only the compute plane can be in your account (classic) or in Databricks' account (serverless).

## site-002
exam: A1
topic: platform
level: A
source: site

A team runs a nightly Python ETL in production and wants the lowest-cost compute option. Which should they AVOID?

- [ ] Serverless jobs compute :: A good default for scheduled jobs: no idle cost and no cluster to manage.
- [ ] Job compute (classic) :: Created for the run and terminated after it, at the lower jobs DBU rate.
- [x] All-purpose compute :: Correct. All-purpose clusters are meant for interactive work and have the highest DBU rate.
- [ ] A job cluster shared across tasks with job_cluster_key :: Sharing one job cluster between tasks of the same run saves start-up time and cost.

> Scheduled production work runs on job compute or serverless jobs, never on all-purpose clusters.

## site-047
exam: A1 P1
topic: platform
level: A
source: site

A workload uses the RDD API and R. Which compute should it run on?

- [ ] Serverless jobs :: Serverless supports neither R nor the RDD API.
- [ ] Serverless SQL warehouse :: SQL warehouses run SQL only.
- [x] Classic job compute with dedicated access mode :: Correct. Dedicated access mode supports R and the RDD API; standard access mode supports neither.
- [ ] Any serverless option :: No serverless option runs R or RDD code.

> R or RDD code means classic compute in dedicated access mode.

## sa-29
exam: A1
topic: platform
level: A
source: sa

An ETL process runs every night, uses a lot of resources, and its volume varies a great deal from day to day. The team wants a cost-effective option that adapts to the load. Which compute fits?

- [x] A job cluster with autoscaling :: Correct. The cluster exists only for the run, so there is no idle cost, and autoscaling follows the varying volume.
- [ ] An all-purpose cluster that is always on :: Higher DBU rate than a job cluster, and it keeps billing while idle.
- [ ] A dedicated cluster of fixed size :: A fixed size is either too small on peak nights or wasteful on quiet ones.
- [ ] A serverless SQL warehouse :: A SQL warehouse serves SQL queries and BI, not a notebook or Spark ETL pipeline.

> Scheduled and automated work runs on job compute; all-purpose compute is for interactive development.

## sa-30
exam: A1
topic: platform
level: A
source: sa

Four analysts will spend the next few weeks exploring a dataset in notebooks, interactively and together. Which type of cluster suits this work?

- [x] An all-purpose cluster :: Correct. All-purpose clusters are built for interactive, shared work: several users attached to the same cluster all day.
- [ ] A job cluster :: A job cluster is created and destroyed for each job run; it cannot host an interactive session.
- [ ] A serverless SQL warehouse :: It runs SQL queries and dashboards, not Python or Scala notebooks.
- [ ] One minimum-size cluster per analyst :: Four times the fixed cost, and no shared environment for the collaboration the scenario describes.

> Interactive and collaborative work means all-purpose compute (or serverless notebooks); scheduled and automated work means job compute.

## sa-31
exam: A1
topic: platform
level: A
source: sa

A simple script joins about 10 GB of data once a week. It is not critical: if it fails it can be rerun without consequences. The explicit requirement is the cheapest compute possible. Which configuration do you choose?

- [x] A job cluster with spot instances :: Correct. The job cluster avoids idle cost and spot instances add a large discount. Losing an instance mid-run is acceptable for a small job that can be rerun.
- [ ] A job cluster with Photon enabled :: Photon speeds up execution but has a higher DBU rate on classic compute; for a small, simple job the extra cost does not pay off.
- [ ] A job cluster with on-demand instances :: More expensive than spot, with no benefit when interruptions are acceptable.
- [ ] An all-purpose cluster shared with other teams :: Higher DBU rate and unpredictable performance, since it depends on what other teams are running.

> Photon is not a free upgrade on classic compute. Spot workers are the classic way to cut the cost of jobs that tolerate interruption.

## sa-32
exam: A1
topic: platform
level: A
source: sa

A BI team runs SQL queries with very irregular volume: busy peaks and long idle periods. They do not want to manage or size infrastructure and want to pay only for what runs. Which option meets every requirement?

- [x] A serverless SQL warehouse :: Correct. It starts in seconds, scales with the query load and stops when idle, so you pay for actual use.
- [ ] A classic SQL warehouse of fixed size :: You must size and manage it, and it starts slowly when it has been stopped.
- [ ] A job cluster scheduled every hour :: It cannot serve interactive queries; analysts would wait for the next scheduled run.
- [ ] An all-purpose cluster with autoscaling :: It scales, but still needs configuration and management, and it starts slowly when stopped.

> SQL, bursty load, no infrastructure to manage and pay per use: serverless SQL warehouse.

## sa-33
exam: A1
topic: platform
level: A
source: sa

An analyst must query, with SQL, a database that lives inside the company's private cloud network. No extra networking has been set up for serverless compute. Which SQL warehouse type reaches the database without further network configuration?

- [x] A pro or classic SQL warehouse :: Correct. Their machines run in the customer's cloud account and network, so they can reach resources in that network directly.
- [ ] A serverless SQL warehouse :: It runs in the Databricks-managed serverless plane; reaching a private network needs extra setup (private connectivity), which the scenario rules out.
- [ ] A job cluster running a SQL task :: SQL tasks run on SQL warehouses, and a job cluster is not interactive compute for an analyst.
- [ ] An all-purpose cluster in standard access mode :: It runs notebooks; it is not the compute designed to serve SQL queries and dashboards.

> When a question stresses the customer's own private network, look for compute that runs in the customer's account.

## sa-34
exam: A1
topic: platform
level: A
source: sa

A team wants to cut costs by moving workloads to serverless while keeping today's SLAs. Several candidates exist. Where should they start to get the best balance of savings and risk?

- [x] An efficient pipeline that runs often and already works on a recent runtime with Unity Catalog :: Correct. Frequent runs maximise the savings, and existing compatibility keeps the migration risk low.
- [ ] Legacy pipelines with old dependencies and JDBC links to obsolete systems :: These carry the highest risk of incompatibility; starting here turns the migration into a remediation project.
- [ ] Dashboards that are rarely used :: Little use means little saving; the migration effort does not pay off.
- [ ] The most business-critical workload, to test the worst case :: Testing on the most critical system exposes the business to migration risk for no reason.

> Migrate first what runs often and is already compatible.

## sp-50
exam: A1 P1
topic: platform
level: P
source: sp

How do you standardise libraries, environment variables and Spark settings across all the clusters a team creates?

- [x] A cluster policy :: Correct. A policy defines and enforces those settings centrally for every cluster created with it.
- [ ] Configure them by hand in each notebook :: Inconsistent and hard to audit.
- [ ] Init scripts stored in the DBFS root :: Discouraged practice, and restricted on governed compute.
- [ ] Let each user choose :: Leads to drift between environments.

> Cluster policies standardise and restrict classic compute configuration, including libraries.

## new-platform-01
exam: A6 P8
topic: platform
level: A
source: new

A classic job cluster fails to start. The cluster event log shows the termination reason `INIT_SCRIPT_FAILURE`. What do you check next?

- [ ] The Spark UI of the failed run :: The cluster never started, so there is no Spark application to inspect.
- [x] The init script logs in the cluster log delivery location :: Correct. Init script output (`.stdout.log` and `.stderr.log`) is written under `<log path>/<cluster id>/init_scripts/` and shows why the script failed.
- [ ] The query profile of the last query :: Query profiles exist for SQL warehouse and serverless queries, not for a cluster that failed to start.
- [ ] `system.billing.usage` :: Billing records show usage, not why a script failed.

> Cluster start problems: event log first (termination reason), then the logs of the layer it names.

## new-platform-02
exam: A6 P1
topic: platform
level: A
source: new

A job that has not changed in months starts failing at the library installation step with `LIBRARY_INSTALLATION_ERROR`. The task installs `pandas` and `pyarrow` from PyPI without versions. What is the most robust fix?

- [ ] Add more workers to the job cluster :: The failure happens while installing packages; cluster size is irrelevant.
- [ ] Increase the task's retry count :: Retrying installs the same incompatible versions again.
- [x] Pin the versions that are known to work, for example in a requirements file :: Correct. Unpinned libraries pick up new releases whose dependencies can conflict with the runtime; pinning makes installs repeatable.
- [ ] Move the installation into an init script :: The same unpinned versions would still be resolved, and serverless does not run init scripts.

> Unpinned dependencies are the usual cause of jobs that break "without any change". Pin with `==`.

## new-platform-03
exam: P1
topic: platform
level: P
source: new

A Python wheel task must run on serverless compute and needs a private wheel stored in a Unity Catalog volume plus `pydantic==2.9.2`. How do you provide these dependencies?

- [ ] Install them in a cluster-scoped init script :: Serverless compute does not run init scripts.
- [ ] Add them as cluster libraries on the job cluster :: A serverless task has no cluster to attach libraries to.
- [x] Declare an environment with both dependencies in the job and reference it from the task with `environment_key` :: Correct. Serverless Python script, wheel and dbt tasks get their dependencies from a job environment.
- [ ] Run `%pip install` in a separate notebook task that runs first :: Notebook-scoped installs apply only to that notebook's own Python process.

> On serverless, dependencies are declared in the environment (side panel for notebooks, `environment_key` for script, wheel and dbt tasks).

## new-platform-04
exam: P1 A4
topic: platform
level: P
source: new

A serverless job task calls an external API that charges each customer once. The team discovers the task sometimes runs twice after a transient failure, even though no retry policy is configured. What explains it and how do you stop it?

- [ ] The job has a continuous trigger; switch to a scheduled trigger :: Nothing in the scenario points to a continuous trigger.
- [x] Serverless auto-optimization retried the task; untick *Enable serverless auto-optimization* in the task's retry policy :: Correct. Auto-optimization is on by default and can retry failed tasks; turn it off for work that must run at most once.
- [ ] Spark speculative execution reran the task; set `spark.speculation` to false :: Speculation duplicates Spark tasks inside one run, not job task runs, and serverless does not let you set it.
- [ ] Repair runs happen automatically on failure; disable repair :: Repair runs are only started by a person or an API call.

> Serverless auto-optimization may add retries. Disable it for non-idempotent tasks.

## new-platform-05
exam: P1 A1
topic: platform
level: P
source: new

A nightly serverless job has a six-hour window and the team wants to cut its cost. A start-up delay of a few minutes is acceptable. Which setting helps?

- [ ] Enable Photon on the job :: Photon is always on in serverless; it is not a setting you can turn on.
- [x] Turn off *Performance optimized* so the job's serverless tasks run in standard mode :: Correct. Standard mode costs less in exchange for a longer start-up, which fits a job with a wide window.
- [ ] Switch the tasks to an all-purpose cluster :: All-purpose compute has the highest DBU rate.
- [ ] Set `spark.sql.shuffle.partitions` to 2000 :: Unrelated to cost, and a fixed value turns off automatic shuffle tuning.

> Serverless jobs and pipelines have two modes: performance optimized (fast start) and standard (cheaper, slower start).

## new-platform-06
exam: A1 P7
topic: platform
level: A
source: new

A company has two workspaces in the same cloud region, both attached to Unity Catalog. A data engineer grants `SELECT` on `sales.gold.orders` to the `analysts` account group from the first workspace. What happens in the second workspace?

- [x] Members of `analysts` can query the table there too, because both workspaces share the region's metastore :: Correct. There is one metastore per region; grants are stored in the metastore, not in the workspace.
- [ ] Nothing; grants are per workspace and must be repeated :: Unity Catalog grants live in the metastore and apply in every workspace attached to it (unless the catalog is bound to specific workspaces).
- [ ] The table is copied to the second workspace :: Workspaces share the same data; nothing is copied.
- [ ] The grant fails until the second workspace is detached :: Attaching many workspaces to one metastore is the normal setup.

> One Unity Catalog metastore per region, shared by the workspaces of that region; grants follow the data, not the workspace.

## new-platform-07
exam: A6 P1
topic: platform
level: A
source: new

A notebook defines several variables, then a cell in the middle runs `%pip install great-expectations` followed by `dbutils.library.restartPython()`. Later cells fail with `NameError`. Why?

- [ ] `%pip` is not supported on Unity Catalog compute :: `%pip` works on serverless and on classic compute.
- [x] Restarting Python clears the notebook's state, so variables defined earlier no longer exist :: Correct. Put `%pip` installs at the top of the notebook, before any other code.
- [ ] The library replaced the built-in variables :: Installing a package does not delete user variables; the restart does.
- [ ] Notebook-scoped libraries are only visible in the next notebook :: They are visible in the same notebook after the restart.

> `%pip` at the top, then `restartPython()`, then the rest of the code.

## new-platform-08
exam: P1
topic: platform
level: P
source: new

A team installs an internal package from a source archive (`.tar.gz`). Installation fails on some clusters because a C compiler and headers are missing. What is the best long-term fix?

- [ ] Install the compiler with an init script on every cluster :: Works only on classic compute and slows every start; it treats the symptom.
- [x] Build a wheel (`.whl`) in CI and install the wheel from a volume or a package index :: Correct. Wheels are prebuilt, so nothing needs compiling at install time, and they install the same way on classic, serverless and pipelines.
- [ ] Copy the package source into every notebook :: Duplicates code and is unmaintainable.
- [ ] Use a larger instance type :: Instance size has nothing to do with missing build tools.

> Prefer wheels to source archives: they install quickly and the same way everywhere.
