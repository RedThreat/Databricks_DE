---
id: cicd
title: "CI/CD: Git folders, bundles and the CLI"
group: Orchestration and DevOps
order: 15
summary: Git folders, Declarative Automation Bundles (databricks.yml, targets, variables, modes, deploy and bind), structuring Python projects, the Databricks CLI and authentication, and a complete CI/CD flow.
---

## Git folders

Git folders (formerly Repos) clone a remote repository into the workspace.

- Link your Git account in **Settings → Linked accounts**, then **Create → Git folder** with the HTTPS URL.
- In the Git dialog you can create and switch **branches**, **pull**, **commit and push**, **merge**, **rebase**, **reset** and resolve conflicts. **Pull requests are opened in the Git provider** (GitHub, Azure DevOps, GitLab, Bitbucket), not in Databricks.
- Branch, pull and push need **CAN MANAGE** on the Git folder; CAN EDIT only lets you edit files.
- A Git folder has one checked-out branch for everyone who opens it. Give **each person their own Git folder** so that switching branches does not change the files under a colleague.
- Switching branches removes assets that do not exist on the target branch; pulling clears notebook state. Rebase and reset rewrite history (force push); merge does not.
- **Production** code is never edited by hand. Either let automation update a production Git folder (for example `databricks repos update` from CI, as a service principal), let job tasks run straight from a remote Git reference (each run takes a snapshot of that commit), or, best, deploy with bundles.

## Declarative Automation Bundles

A bundle (formerly Databricks Asset Bundle) describes, in YAML next to your code, the resources to deploy (jobs, pipelines, dashboards, schemas, volumes, apps…) and how they differ per environment. The same code is promoted from dev to test to prod by changing only the **target**.

```
orders_project/
├── databricks.yml            # the only root configuration file
├── resources/
│   ├── orders_job.yml
│   └── orders_pipeline.yml
├── src/orders/               # Python package (business logic)
├── notebooks/                # thin notebooks that call the package
├── tests/                    # pytest unit tests
└── pyproject.toml
```

```yaml
# databricks.yml
bundle:
  name: orders

include:
  - resources/*.yml

variables:
  catalog:
    description: Target catalog
    default: dev_catalog
  warehouse_id:
    lookup:
      warehouse: "Shared SQL Warehouse"     # resolves the ID from the name

artifacts:
  orders_wheel:
    type: whl
    build: uv build --wheel

targets:
  dev:
    mode: development
    default: true
    workspace:
      host: https://adb-1111.11.azuredatabricks.net
  prod:
    mode: production
    git:
      branch: main
    workspace:
      host: https://adb-2222.22.azuredatabricks.net
      root_path: /Workspace/Shared/.bundle/${bundle.name}/${bundle.target}
    run_as:
      service_principal_name: 7c1e...-app-id
    variables:
      catalog: prod_catalog
```

```yaml
# resources/orders_job.yml
resources:
  jobs:
    orders_job:
      name: orders-${bundle.target}
      parameters:
        - name: catalog
          default: ${var.catalog}
      tasks:
        - task_key: ingest
          notebook_task:
            notebook_path: ../notebooks/ingest.ipynb     # relative to THIS file
        - task_key: transform
          depends_on: [{task_key: ingest}]
          python_wheel_task:
            package_name: orders
            entry_point: transform
          environment_key: default
      environments:
        - environment_key: default
          spec:
            environment_version: "4"
            dependencies:
              - ../dist/*.whl
```

**Substitutions**: `${bundle.name}`, `${bundle.target}`, `${workspace.current_user.userName}`, `${var.catalog}`, and `${resources.jobs.orders_job.id}` (by the resource **key** in YAML, not by its display name).

**Variables**

- Declared under `variables` with an optional `default`; overridden per target; types can be simple, `complex` (maps and lists) or `lookup` (resolve an ID from a name).
- Precedence, highest first: `--var="catalog=x"` on the CLI, environment variable `BUNDLE_VAR_catalog`, the `variable-overrides.json` file, the target's `variables`, the `default`.
- Variables are **resolved at deploy time**. `bundle run --var` does not change a deployed job; values that change per run belong in **job parameters** (`databricks bundle run orders_job --params catalog=other`).
- **Secrets never go in YAML** (it is in Git). In CI, pass them with `BUNDLE_VAR_...` from the CI secret store; at runtime, read them from secret scopes.

**Targets and modes**

- A target's settings are **merged** with the top-level ones; put in the target only what changes.
- Without `-t`, the CLI uses the target marked `default: true`. Automation must always pass `-t`.
- `mode: development`: resource names prefixed with `[dev your.name]`, schedules and triggers **paused**, concurrent runs allowed, pipelines in development mode. Safe for personal work.
- `mode: production`: checks that the current Git branch matches `git.branch`, expects a `run_as` identity and a shared `root_path`. `--force` bypasses the branch check and should not be used.
- Paths in YAML are relative to the file in which they are written.

### The bundle lifecycle

| Command | Does |
|---|---|
| `databricks bundle init` | Creates a project from a template (Python, SQL, pipelines, dbt) |
| `databricks bundle validate -t prod` | Checks the configuration; `--output json` shows it fully resolved |
| `databricks bundle plan -t prod` | Shows what would be created, changed or deleted, changing nothing |
| `databricks bundle deploy -t prod` | Builds artifacts, uploads files and creates or updates the resources |
| `databricks bundle run -t prod orders_job` | Runs a deployed job or pipeline |
| `databricks bundle summary -t prod` | Lists what is deployed and where |
| `databricks bundle destroy -t test --auto-approve` | Deletes the deployed resources (CI needs `--auto-approve`) |
| `databricks bundle generate job --existing-job-id 123` | Writes YAML for a job created in the UI |
| `databricks bundle deployment bind orders_job 123` | Links a resource key to an existing job, so deploy updates it instead of creating a duplicate |

- Adopting a UI job: `generate` (optionally with `--bind`) **and** bind. Deploying generated YAML without binding creates a **second job**.
- Removing a resource from the YAML **deletes it** on the next deploy, unless `lifecycle.prevent_destroy: true`.
- Jobs deployed by a bundle are marked as managed by it; edit them through the bundle. For an emergency, *Disconnect from source* in the UI, knowing the next deploy will overwrite your change.
- `--force-lock` only clears a deployment lock left by an interrupted deploy.

## Structuring a Python project

- Put business logic in a **package** under `src/` with a `pyproject.toml`; build it into a **wheel**; keep notebooks thin (parameters, calls to the package, display).
- Prefer **imports** of modules over chains of `%run`: imported functions can be unit-tested and versioned; workspace files in a Git folder can be imported directly.
- Make transformations functions that take and return DataFrames, so they can be tested and chained with `DataFrame.transform` (see *Testing*).
- Pin dependencies. Jobs install the wheel as a task library (classic) or as an environment dependency (serverless). Clusters without internet access install wheels from a volume or a private index.

## The Databricks CLI

- Use the current CLI (version 0.218 or later for bundles). The old `databricks-cli` installed with pip has different commands. In GitHub Actions, install it with `databricks/setup-cli`.
- People log in with `databricks auth login --host <workspace-url>` (OAuth user-to-machine); profiles are stored in `~/.databrickscfg`.
- **CI/CD authenticates as a service principal**, with OAuth machine-to-machine (`DATABRICKS_HOST`, `DATABRICKS_CLIENT_ID`, `DATABRICKS_CLIENT_SECRET`) or, better, workload identity federation (OIDC from the CI system, no secret stored). Never with a person's token.
- Useful groups: `bundle`, `jobs`, `pipelines`, `repos`, `workspace`, `fs`, `secrets`, `catalogs`, `api` (raw REST). `-o json` for machine-readable output.

## A complete CI/CD flow

1. Develop on a feature branch in your own Git folder or in an IDE (Databricks Connect, VS Code extension); `bundle deploy -t dev` deploys a personal, prefixed copy.
2. Open a pull request in the Git provider.
3. CI on the pull request: `bundle validate -t test`, unit tests with `pytest`, `bundle deploy -t test`, `bundle run -t test integration_tests`.
4. After the merge to `main`, CD runs `bundle deploy -t prod` as the production service principal.

```yaml
# .github/workflows/deploy.yml (extract)
on:
  push:
    branches: [main]
permissions:
  id-token: write          # for OIDC federation
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      DATABRICKS_HOST: ${{ vars.PROD_HOST }}
      DATABRICKS_CLIENT_ID: ${{ vars.SP_CLIENT_ID }}
      DATABRICKS_AUTH_TYPE: github-oidc
    steps:
      - uses: actions/checkout@v4
      - uses: databricks/setup-cli@main
      - run: databricks bundle validate -t prod
      - run: databricks bundle deploy -t prod
```

## Developer tools

- Notebooks: **one language per cell** (switch with `%python`, `%sql`, `%scala`, `%r`, `%md`); several languages per notebook. To use a Python value in SQL, use `spark.sql(...)` with parameters, a temporary view, or widgets.
- The notebook **debugger** with the **Variable Explorer** inspects values and types at breakpoints, without adding prints.
- **Databricks Connect** runs code written in a local IDE (VS Code, PyCharm, Jupyter…) on remote Databricks compute, next to the data.

## Exam traps

!!! trap "Variables resolve at deploy"
    Changing a bundle variable on `bundle run` does nothing to the deployed job. Use job parameters for per-run values.

!!! trap "Generate without bind duplicates"
    Adopting an existing job needs `bind`; otherwise the deploy creates a copy.

!!! trap "Pull requests live in the Git provider"
    Databricks Git folders commit and push; the pull request is opened in GitHub, Azure DevOps or similar.

!!! tip "Always pass the target"
    `bundle deploy` without `-t` goes to the default target, usually dev.

## Hands-on

1. Install the CLI locally and run `databricks auth login --host <your workspace>`.
2. `databricks bundle init default-python`, open `databricks.yml`, add a `catalog` variable and use it in the job's parameters.
3. `databricks bundle validate --output json`, `databricks bundle deploy`, `databricks bundle run <job key>`; find the `[dev ...]` prefixed job in the UI and notice the paused schedule.
4. Create a job in the UI, then adopt it with `bundle generate job --existing-job-id <id> --bind` and deploy.
5. `databricks bundle destroy`.
