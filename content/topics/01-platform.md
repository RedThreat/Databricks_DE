---
id: platform
title: Platform and compute
group: Foundations
order: 1
summary: Lakehouse architecture, control and compute planes, compute types and how to choose one, access modes, libraries and environments, and why clusters fail to start.
---

## The lakehouse

A lakehouse keeps all data in cloud object storage in open formats (Delta Lake or Apache Iceberg, both on Parquet files) and adds what a data warehouse gives you: ACID transactions, schema enforcement, fine-grained security and fast SQL. One copy of the data serves BI, data engineering, streaming and machine learning, so there is no separate lake and warehouse to keep in sync.

Databricks calls its product the **Data Intelligence Platform**: the lakehouse plus AI features that use your metadata (Databricks Assistant, Genie, AI functions, predictive optimization).

| Building block | Role |
|---|---|
| Cloud object storage (S3, ADLS, GCS) | Where the data files live, in your cloud account |
| Delta Lake | Transaction log on top of Parquet: ACID, time travel, schema enforcement |
| Unity Catalog | One governance layer for data and AI assets: permissions, lineage, audit, discovery |
| Photon | Vectorised C++ query engine that speeds up SQL and DataFrame work |
| Lakeflow | Ingestion (Lakeflow Connect), pipelines (Spark Declarative Pipelines) and orchestration (Jobs) |
| Databricks SQL | SQL warehouses, queries, dashboards and alerts |

## Control plane and compute plane

| | Control plane | Compute plane |
|---|---|---|
| What runs there | Web application, notebooks and job definitions, job scheduler, cluster manager, REST APIs, Unity Catalog service | The machines that process data |
| Where | Always in the Databricks account | **Classic compute**: virtual machines in *your* cloud account and network. **Serverless compute**: in a Databricks-managed account, isolated per workspace, in the same region |

Your data stays in your cloud storage in both cases. Serverless only changes who owns the machines.

**Account and workspaces.** The account console manages workspaces, identities (users, groups, service principals) and Unity Catalog metastores. A metastore is the top-level Unity Catalog container; you create **one per region** and attach every workspace in that region to it, so all those workspaces see the same catalogs and the same grants.

**Identities.** Users are people. Groups should be **account groups** (created at account level), not workspace-local groups. **Service principals** are identities for automation: run production jobs and CI/CD as a service principal, not as a person.

## Compute types

| Compute | What it is | Use it for | Watch out |
|---|---|---|---|
| Serverless compute for notebooks | Managed compute that starts in seconds | Interactive Python and SQL | No R, no RDD API, no Spark UI (use the query profile), only a few Spark settings |
| Serverless jobs | Managed compute for job tasks | Default for scheduled jobs | Streaming only with `availableNow` or `once` triggers |
| Serverless SQL warehouse | Managed SQL engine with fast start and automatic scaling | BI, dashboards, ad hoc SQL, SQL tasks in jobs | Runs SQL only |
| Pro or classic SQL warehouse | SQL warehouse whose machines run in your account | SQL when serverless is not allowed or when the warehouse needs your private network | Slower start (minutes); classic lacks some features |
| All-purpose cluster (classic) | Cluster you create and share for interactive work | Development and exploration that needs classic features | Highest DBU rate; never for scheduled production jobs |
| Job compute (classic) | Cluster created for one job run and terminated after it | Production jobs that need R, RDD, init scripts, GPUs or specific instance types | Several minutes to start |
| Pipeline compute | Compute for Lakeflow Spark Declarative Pipelines | Pipelines; serverless is recommended | Classic pipeline clusters are configured in the pipeline settings |

**Cost model.** Work is billed in DBUs (Databricks Units) per second. On classic compute you pay DBUs to Databricks *and* the virtual machines to your cloud provider. On serverless the DBU price already includes the machines. All-purpose compute has a higher DBU rate than job compute, which is why production jobs never run on all-purpose clusters.

Ways to cut classic costs:

- **Job compute** instead of all-purpose for anything scheduled.
- **Autoscaling** (min and max workers) when the volume varies from run to run.
- **Auto termination** on all-purpose clusters so idle clusters shut down.
- **Spot instances** for workers on jobs that tolerate interruption.
- **Pools** keep idle instances ready to shorten start times. Idle pool instances cost no DBUs, but the cloud provider still bills the machines.
- **Photon** speeds up most SQL and DataFrame work but has a higher DBU rate on classic compute; it pays off on heavy workloads, not on small simple ones. It is always on in serverless and SQL warehouses. Python UDFs and RDD code do not run in Photon.

**Serverless performance modes.** Serverless jobs and pipelines run either *performance optimized* (fast start, faster runs) or *standard* (cheaper, a start-up delay of a few minutes). Choose standard for jobs where a few extra minutes do not matter.

## Access modes

| Mode (old name) | Who uses it | Supports | Does not support |
|---|---|---|---|
| **Standard** (Shared) | Many users, isolated from each other | Python, SQL, Scala, Unity Catalog with full security | R, RDD API, some low-level APIs; init scripts and JARs must be on the metastore allowlist |
| **Dedicated** (Single user) | One user or one group | All languages including R and the RDD API, ML runtimes, GPUs | Sharing with other users |
| No isolation shared | Legacy | — | Unity Catalog |

Rule of thumb: R or RDD code means **dedicated** classic compute.

**Cluster policies** restrict what users can create (instance types, maximum workers, auto termination, tags, runtime versions) and can preinstall libraries. Use them to standardise configuration and control cost across a team.

## Choosing compute

| Scenario | Choose |
|---|---|
| Nightly production ETL in Python or SQL, lowest effort | Serverless jobs |
| Same, but the code needs R, RDD, init scripts, GPUs or custom instance types | Classic job compute (dedicated access mode for R or RDD) |
| Several tasks in one job with the same classic configuration | One shared job cluster referenced by `job_cluster_key` |
| Many analysts running SQL and dashboards with bursty load | Serverless SQL warehouse |
| SQL that must reach a database inside your private network, with no extra networking set up | Pro or classic SQL warehouse (runs in your network) |
| A team exploring data together in notebooks for weeks | All-purpose cluster or serverless notebooks |
| SQL task inside a job | Serverless or pro SQL warehouse (not classic) |
| Weekly small job that can simply be rerun if it fails, cheapest option | Job compute with spot workers |

## Libraries and environments

Libraries can be installed at several levels. When the same package exists at more than one level, the most specific wins: **notebook-scoped** (`%pip install`) beats **compute-scoped** (cluster or task libraries), which beats the version **built into the runtime**.

```python
%pip install requests==2.32.3 -r /Volumes/main/config/libs/requirements.txt
dbutils.library.restartPython()   # restarts Python; variables defined before are lost
```

- Put `%pip` at the top of the notebook, then restart Python.
- **Pin versions** (`==`). An unpinned library breaks the day a new release changes its API or its dependencies.
- Prefer **wheels** (`.whl`) to source archives (`.tar.gz`): a source archive must be built during installation and fails when build tools or headers are missing.
- Keep library files in workspace files or Unity Catalog volumes, not in the DBFS root.
- On **serverless**, there are no cluster libraries and no init scripts. Dependencies go in the notebook's **Environment** side panel, or in an `environments` entry referenced by `environment_key` for Python script, wheel and dbt tasks. Pipelines list their dependencies in the pipeline settings.
- If a serverless notebook or notebook task runs out of memory in its Python process (for example after `toPandas()`), set **Memory: High** in the Environment panel: 32 GB instead of 16 GB, at a higher DBU rate. It does not enlarge the Spark session, and only notebook tasks have it.
- **Serverless auto-optimization** is on by default and may retry a failed serverless task on its own. For a task that must run at most once (a non-idempotent append, a call that sends emails), untick *Enable serverless auto-optimization* in the task's retry policy.

## Why a cluster fails to start

Start with the cluster **event log**: the termination reason code tells you which layer failed.

| Termination reason | Likely cause | Fix |
|---|---|---|
| `INIT_SCRIPT_FAILURE` | An init script exited with an error | Read the init script logs in the cluster log delivery path (`<log path>/<cluster id>/init_scripts/`), fix the script |
| Cloud provider errors (quota, capacity, no spot capacity, subnet out of IPs) | The cloud could not supply the machines | Another instance type or zone, on-demand instead of spot, a quota increase |
| `LIBRARY_INSTALLATION_ERROR` on a library | A package or one of its dependencies failed to install | Pin versions, check the package index, use a wheel |
| Policy validation error | The configuration breaks the cluster policy | Use a configuration the policy allows |

## Product names: old and new

Training material and question banks written before 2026 use the old names. The exam uses the new ones; the concepts did not change.

| Current name | Old name |
|---|---|
| Lakeflow Spark Declarative Pipelines | Delta Live Tables (DLT) |
| Lakeflow Jobs | Databricks Workflows, Jobs |
| Declarative Automation Bundles | Databricks Asset Bundles (DABs) |
| Git folders | Repos |
| OpenSharing | Delta Sharing |
| `AUTO CDC` | `APPLY CHANGES INTO` |
| Standard and Dedicated access mode | Shared and Single user access mode |
| `pyspark.pipelines` (`dp`) | `dlt` Python module |
| Data quality monitoring (data profiling, anomaly detection) | Lakehouse Monitoring |

## Exam traps

!!! trap "The control plane is never in your account"
    Classic compute runs in your cloud account; serverless runs in the Databricks account. The control plane is in the Databricks account in both cases.

!!! trap "All-purpose compute for a scheduled job"
    Any answer that runs a production schedule on an all-purpose cluster is wrong on cost.

!!! trap "Serverless limits"
    No R, no RDD API, no init scripts, no Spark UI, few Spark settings, and streaming only with `availableNow` or `once`. A question that mentions one of these needs classic compute.

!!! tip "More workers do not help the driver"
    Adding workers adds executor capacity. It does not give the driver more memory.

## Hands-on

1. Create a Databricks Free Edition account. It is serverless only, which is enough for almost every exercise on this site.
2. Create a notebook, attach it to serverless compute and run `SELECT current_catalog(), current_schema(), current_user()`.
3. Open the Environment side panel and add `faker==30.8.2` as a dependency; import it in the next cell.
4. Open **SQL Warehouses**, run a query on the starter warehouse, then open its **query profile**.
5. In Catalog Explorer, browse the `samples` and `system` catalogs.
