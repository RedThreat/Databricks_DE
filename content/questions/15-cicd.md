<!-- Practice questions for the topic 'cicd'. Format: see README.md. -->

## site-034
exam: A5 P8
topic: cicd
level: A
source: site

A developer finished work in a Databricks Git folder and wants it reviewed and merged into `main`. Where is the pull request created?

- [ ] In the Git folder dialog in Databricks :: Git folders branch, commit, push, pull, merge and rebase, but do not open pull requests.
- [x] In the Git provider (for example GitHub or Azure DevOps) :: Correct. Review and merge happen in the provider.
- [ ] With `databricks bundle deploy` :: Deploys resources; it has nothing to do with code review.
- [ ] In Catalog Explorer :: Catalog Explorer manages data objects.

> Pull requests live in the Git provider.

## site-124
exam: A5
topic: cicd
level: A
source: site

A user has CAN EDIT on a colleague's Git folder. Editing works, but switching branches, pull and commit and push fail. Why?

- [ ] The Git credential expired :: Editing would still work, and the error would mention authentication.
- [x] Those operations require CAN MANAGE on the Git folder :: Correct. Better still, each person works in their own Git folder.
- [ ] Git folders do not support branches :: They do.
- [ ] The repository must be public :: Private repositories work with linked credentials.

> Git operations need CAN MANAGE; a Git folder's branch is shared by everyone who uses that folder.

## sp-48
exam: A5 P8
topic: cicd
level: A
source: sp

How should a team organise its work with Databricks Git folders so that nobody overwrites anyone else?

- [x] Each person clones the repository into their own Git folder and works on their own branch :: Correct. Work is isolated and integrated through pull requests.
- [ ] Everyone uses one shared Git folder :: Switching branches changes the files for everyone, and changes get lost.
- [ ] Edit notebooks in a shared folder and copy them to Git later :: Manual, with no version control while developing.
- [ ] Run Git from a cluster's terminal :: Possible, but loses the native integration with notebooks and jobs.

> One Git folder per person; one feature branch per change.

## new-cicd-01
exam: P8 A5
topic: cicd
level: P
source: new

Production jobs currently run notebooks from a Git folder that engineers sometimes edit directly in the workspace. How should production code be kept consistent with the reviewed `main` branch?

- [ ] Ask engineers to be careful when editing the production folder :: Relies on discipline, with no audit trail.
- [x] Never edit production by hand: deploy with a bundle from CI, or have tasks run from the remote Git reference, or let CI update the production Git folder as a service principal :: Correct. Production then always matches a reviewed commit.
- [ ] Give everyone CAN MANAGE on the production folder :: Makes manual edits easier, which is the problem.
- [ ] Copy notebooks to `/Shared` after each merge by hand :: Manual and error-prone.

> Production code comes from Git through automation, never from manual edits.

## sa-41
exam: A5 P8
topic: cicd
level: A
source: sa

A team keeps its pipeline code in a Git repository connected to Databricks and wants to promote it to production as a job, reproducibly and with version control. What is the recommended approach?

- [x] Declarative Automation Bundles with Git integration :: Correct. YAML next to the code declares resources and per-environment targets, and plugs into CI/CD.
- [ ] Create and manage the job manually in the UI :: Not versioned, not reproducible across environments.
- [ ] A JSON configuration file applied by a custom script :: Rebuilds by hand what bundles already do.
- [ ] Export the notebook and import it into the production workspace after each change :: Manual and untraceable.

> Code in Git + promotion to production = bundles.

## sa-42
exam: A5
topic: cicd
level: A
source: sa

In a discussion about bundles, there is doubt about what defines the project. What is a bundle made of?

- [x] YAML configuration (`databricks.yml` plus included files) that declares the resources, artifacts and per-environment settings, next to the code :: Correct. It declares what to deploy (jobs, pipelines, dashboards) and how each environment differs.
- [ ] A Docker image with the runtime and the source code :: Bundles are not containers.
- [ ] A compressed file of artifacts without metadata :: Could not define resources or environments.
- [ ] A text file listing the artifacts to migrate :: A bundle defines deployment behaviour, not just a list.

> A bundle is declarative YAML plus code: infrastructure as code for Databricks.

## site-075
exam: A5
topic: cicd
level: A
source: site

Where must the main bundle configuration file be?

- [x] One `databricks.yml` at the root of the bundle project :: Correct. Other YAML files can be included from it (for example `resources/*.yml`).
- [ ] One `databricks.yml` in every folder :: Only one root file.
- [ ] Inside `resources/` only :: Resources can live there, but the root file is required.
- [ ] Anywhere, as long as it is called `bundle.json` :: Wrong name and format.

> One root `databricks.yml`; resource files are included from it.

## site-030
exam: A5
topic: cicd
level: A
source: site

Which command checks a bundle's configuration for errors and shows the resolved configuration, without deploying anything?

- [ ] `databricks bundle init` :: Creates a new project from a template.
- [x] `databricks bundle validate` :: Correct. Nothing changes in the workspace; `--output json` prints the resolved configuration.
- [ ] `databricks bundle run` :: Runs a deployed resource.
- [ ] `databricks bundle destroy` :: Deletes deployed resources.

> Lifecycle: init → validate → (plan) → deploy → run.

## sp-44
exam: P8 A5
topic: cicd
level: P
source: sp

What is the typical sequence of CI commands run on every pull request with bundles?

- [x] `bundle validate`, `bundle deploy`, `bundle run` (to a test target) :: Correct. Validate the configuration, deploy to the test environment, run the test job.
- [ ] `bundle deploy`, `bundle run`, `bundle validate` :: Validating last lets invalid configuration get deployed.
- [ ] `bundle init`, `bundle deploy`, `bundle run` :: `init` creates a new project; it is not part of the recurring flow.
- [ ] `bundle destroy`, `bundle deploy` :: Destroying first deletes the environment without validating anything.

> CI on pull requests: validate, unit tests, deploy to test, run integration tests.

## site-031
exam: A5
topic: cicd
level: A
source: site

How do you deploy a bundle to the `prod` target?

- [ ] `databricks bundle deploy --env prod` :: There is no `--env` flag.
- [x] `databricks bundle deploy -t prod` :: Correct. `-t` (or `--target`) chooses a target from `databricks.yml`.
- [ ] `databricks deploy prod` :: Not a CLI command.
- [ ] `databricks bundle run prod` :: Runs a resource; it does not deploy.

> Always pass `-t`; without it the default target (usually dev) is used.

## site-032
exam: A5
topic: cicd
level: A
source: site

The same job must write to `dev_catalog` in dev and `prod_catalog` in prod. What is the recommended bundle approach?

- [ ] Two separate bundles :: Duplicates the code and configuration.
- [x] A custom variable with a default, overridden in `targets.<name>.variables`, referenced as `${var.catalog}` :: Correct.
- [ ] Hard-code the catalog and edit it before each deploy :: Manual and error-prone.
- [ ] A widget in the notebook :: Per-run input, not environment configuration.

> Environment differences live in target overrides of variables.

## new-cicd-02
exam: A5
topic: cicd
level: A
source: new

A bundle's `prod` target repeats the whole job definition from the top level just to change the cluster size. A reviewer says this is unnecessary. Why?

- [ ] Targets cannot change clusters :: They can.
- [x] Target settings are merged with the top-level definition, so the target only needs the values that differ (for example the job cluster's worker count) :: Correct. Less duplication, fewer drift bugs.
- [ ] Each target must be in a separate bundle :: One bundle has many targets.
- [ ] Variables cannot be used in targets :: They can, and are often the cleaner way.

> Override only what changes per target.

## site-076
exam: A5
topic: cicd
level: A
source: site

A variable is set in `targets.prod.variables`, in the environment variable `BUNDLE_VAR_catalog`, and with `--var` on the CLI. Which value wins?

- [ ] The target value :: Lower precedence than environment variables and the CLI.
- [ ] The `BUNDLE_VAR_` environment variable :: Lower than `--var`.
- [x] The `--var` CLI flag :: Correct. Order: `--var` > `BUNDLE_VAR_x` > overrides file > target > default.
- [ ] The default :: The lowest precedence.

> Variable precedence: CLI flag, environment, overrides file, target, default.

## site-120
exam: A5
topic: cicd
level: A
source: site

An engineer runs `databricks bundle run orders_job -t test --var="catalog=other"`, but the job still writes to `test_catalog`. Why, and what should be done?

- [ ] `--var` is only valid on `validate` :: It is accepted by several commands, but variables are fixed at deploy.
- [x] Bundle variables are resolved at deploy time; expose the value as a job parameter and pass it with `--params`, or redeploy :: Correct.
- [ ] The variable needs a default :: The issue is when it is resolved.
- [ ] The test target is in production mode :: Unrelated.

> Deploy-time variables versus run-time job parameters.

## new-cicd-03
exam: A5 P8
topic: cicd
level: A
source: new

A bundle needs a database password for one task. Where should the value come from?

- [ ] The variable's `default` in `databricks.yml` :: Committed to Git for everyone to read.
- [ ] The `prod` target's `variables` block :: Also committed to Git.
- [x] At runtime from a secret scope (`dbutils.secrets.get`), or, if it must be a variable, from `BUNDLE_VAR_<name>` set from the CI system's secret store :: Correct. Secrets never live in YAML.
- [ ] A comment in the YAML with instructions :: Not a mechanism.

> Secrets: secret scopes at runtime; CI secret store at deploy time; never YAML.

## site-033
exam: A5 P8
topic: cicd
level: A
source: site

How should a CI/CD pipeline (for example GitHub Actions) authenticate to deploy bundles to production?

- [ ] With the lead engineer's personal access token :: Ties production to a person and a long-lived secret.
- [x] As a service principal using OAuth (machine-to-machine, or OIDC workload identity federation) :: Correct.
- [ ] With a username and password in the YAML :: Exposes credentials in Git.
- [ ] Anonymously :: Not possible.

> CI/CD = service principal; prefer federation so no secret is stored.

## new-cicd-04
exam: A5 P8
topic: cicd
level: P
source: new

A security team wants the GitHub Actions deployment to Databricks to work without any long-lived Databricks secret stored in GitHub. What should be configured?

- [ ] A personal access token stored as a GitHub secret :: Long-lived and personal.
- [ ] OAuth M2M with the client secret stored in GitHub :: A service principal, but still a stored secret.
- [x] Workload identity federation: a federation policy for the service principal that trusts GitHub's OIDC tokens (for example `DATABRICKS_AUTH_TYPE=github-oidc`) :: Correct. GitHub issues a short-lived token per run; nothing is stored.
- [ ] Disable authentication for the CI runner's IP :: Not possible and unsafe.

> Best CI authentication: service principal with OIDC federation.

## site-121
exam: A5 P8
topic: cicd
level: A
source: site

A developer runs `databricks bundle deploy -t prod` from a feature branch. The `prod` target has `mode: production` and `git.branch: main`, and validation fails. What is the right response?

- [ ] Add `--force` :: Bypasses exactly the protection that prevented a bad deploy.
- [x] Merge the change to `main` and let CI deploy from `main` as the production service principal :: Correct.
- [ ] Switch the target to development mode :: Turns production into a personal deployment.
- [ ] Delete `git.branch` from the target :: Removes the safety check.

> Production mode checks the branch; the fix is the process, not `--force`.

## site-122
exam: A5 P8
topic: cicd
level: A
source: site

A team generates YAML for a job created in the UI and deploys it without binding. What happens?

- [ ] The existing job is updated :: Only a bound job is updated.
- [x] A second, duplicate job is created :: Correct. To adopt the existing job, bind it (`bundle deployment bind`, or `generate ... --bind`).
- [ ] The deploy fails :: It succeeds, which is the problem.
- [ ] The UI job is deleted :: Deploy does not touch unbound jobs.

> Generate + bind adopts; generate alone duplicates.

## sp-45
exam: P8 A5
topic: cicd
level: P
source: sp

To bring an existing production job under a bundle without creating a duplicate, which steps do you follow?

- [x] `bundle generate job --existing-job-id <id>`, then `bundle deployment bind <key> <id>` (or use `--bind` on generate) :: Correct. Generate writes the YAML and downloads the files; bind links the resource key to the existing job.
- [ ] Only `bundle deploy` after generating :: Without binding, deploy creates a new job.
- [ ] Export the job's JSON and run `bundle deploy` :: Still no link to the existing job.
- [ ] `bundle init` with the job's name :: Creates a new project; adopts nothing.

> Adopt existing resources with bind.

## new-cicd-06
exam: P8
topic: cicd
level: P
source: new

An engineer deletes an old job's YAML file from a bundle and deploys to prod. What happens to the job in the workspace, and how can critical resources be protected from this?

- [ ] Nothing; deleted YAML is ignored :: Bundles reconcile the workspace with the configuration.
- [x] The job is deleted on that deploy; set `lifecycle.prevent_destroy: true` on resources that must never be destroyed by a deploy :: Correct.
- [ ] The job is paused :: It is removed.
- [ ] The deploy fails because the job still exists :: It succeeds and deletes it.

> Bundles own their resources: removing them from YAML removes them from the workspace.

## sp-46
exam: P8
topic: cicd
level: P
source: sp

In `databricks.yml`, an app is declared as `resources.apps.sales_app` with `name: 'app-sales'`. How do you reference its ID in another resource?

- [x] `${resources.apps.sales_app.id}` :: Correct. References use the resource key in YAML.
- [ ] `${resources.apps.app-sales.id}` :: `name` is the display name, not the key.
- [ ] `${apps.sales_app}` :: Missing the `resources` prefix and the attribute.
- [ ] `${bundle.apps.sales_app.id}` :: No such path.

> `${resources.<type>.<key>.<field>}` uses the YAML key.

## new-cicd-07
exam: P8 A5
topic: cicd
level: P
source: new

A job in a bundle must use the SQL warehouse called "Reporting" in every workspace, but its ID differs per workspace. How do you avoid hard-coding IDs?

- [ ] Put each workspace's ID in a comment :: Comments do nothing.
- [x] A `lookup` variable that resolves the warehouse ID from its name at deploy time :: Correct. `variables: warehouse_id: lookup: warehouse: "Reporting"`.
- [ ] A job parameter the operator types on each run :: Manual and error-prone.
- [ ] One bundle per workspace :: Duplicates everything.

> `lookup` variables resolve IDs of warehouses, clusters, service principals and more by name.

## site-123
exam: A5
topic: cicd
level: A
source: site

A CI step runs `databricks bundle destroy -t test` and never finishes. What is missing?

- [ ] `--force-lock` :: Only for a lock left by an interrupted deploy.
- [x] `--auto-approve` :: Correct. `destroy` asks for confirmation; non-interactive runs must approve it explicitly.
- [ ] `-o json` :: Changes the output format only.
- [ ] `--select` :: Not used for this.

> Destructive commands in CI need `--auto-approve`.

## new-cicd-08
exam: P1 P8
topic: cicd
level: P
source: new

A team's transformation logic lives in notebooks chained with `%run`, and nobody can unit-test it. Which restructuring best supports modular development and CI/CD?

- [ ] Merge all notebooks into one large notebook :: Even harder to test and review.
- [x] Move the logic into a Python package (functions that take and return DataFrames) built as a wheel, with pytest tests; keep notebooks as thin entry points :: Correct. Packages can be imported, tested in CI and deployed with bundles.
- [ ] Keep `%run` but add more comments :: Comments do not make code testable.
- [ ] Rewrite everything in SQL files :: Changes the language, not the structure.

> Testable projects: package + wheel + tests; notebooks orchestrate.

## sp-49
exam: P1 P8
topic: cicd
level: P
source: sp

A cluster without internet access must install internal Python libraries for automated jobs. What should you do?

- [x] Package them as a wheel, publish it to a volume, and declare it as a library of the job or bundle :: Correct. Reproducible, versioned and independent of internet access.
- [ ] `%pip install` from PyPI in each notebook :: Fails without internet and does not standardise jobs.
- [ ] Install them by hand on the driver of an interactive cluster :: Manual and not reproducible.
- [ ] An init script reading from the DBFS root :: An obsolete practice, restricted on shared compute.

> Private code: wheels in volumes (or a private index), declared as job or environment dependencies.

## sa-38
exam: A5
topic: cicd
level: A
source: sa

An engineer defines a variable in Python and, in the same cell, tries to use it directly inside a `SELECT` statement. The cell fails. Why?

- [x] Each notebook cell runs in one language :: Correct. The cell's language is the notebook default or the magic command at its top; mixing Python and SQL in one cell does not work.
- [ ] A notebook supports only one language :: Notebooks support several languages, one per cell.
- [ ] Interoperability only exists between Scala and SQL :: No such rule.
- [ ] A special interpolation character is missing :: There is none that makes two languages share a cell.

> One language per cell. Pass Python values to SQL with `spark.sql(...)` parameters, temporary views or widgets.

## sa-39
exam: A5
topic: cicd
level: A
source: sa

A transformation function returns odd results, and one argument may arrive with the wrong type. The engineer wants to confirm it quickly without changing the code. Which tool?

- [x] The notebook debugger with the Variable Explorer :: Correct. Breakpoints and the explorer show values and types in memory without editing code.
- [ ] Add `print()` calls around the code :: Works, but changes the code and must be cleaned up.
- [ ] The cluster logs :: Show driver and executor logs, not notebook variables.
- [ ] The SQL tab of the Spark UI :: Shows query plans and metrics, not Python variables.

> Values and types at runtime: debugger and Variable Explorer.

## sa-40
exam: A5 P1
topic: cicd
level: A
source: sa

A developer wants to write and debug pipeline code in her usual IDE, with its extensions and Git integration, while execution happens on Databricks compute next to the data. What enables this?

- [x] Databricks Connect :: Correct. Code is written and debugged locally; Spark execution happens on the remote cluster or serverless compute.
- [ ] Databricks Connect, but only with VS Code :: It works with VS Code, PyCharm, IntelliJ, Jupyter and others.
- [ ] Export notebooks and work offline :: Execution is remote, so a connection is required.
- [ ] Nothing; development must happen in the web UI :: The opposite of what Databricks Connect is for.

> Databricks Connect separates where you write code from where it runs.

## site-079
exam: A5
topic: cicd
level: A
source: site

A bundle target uses `mode: development`. Which behaviour applies?

- [x] Resources are prefixed with `[dev <user>]`, and schedules and triggers are paused :: Correct. Personal deployments do not collide and do not run on their own.
- [ ] Resources are deployed as the service principal :: That is a production setting (`run_as`).
- [ ] Deployment requires approval :: No approval step is involved.
- [ ] All variables are ignored :: Variables work in every mode.

> Development mode: prefixed names, paused triggers, concurrent runs allowed, pipelines in development mode.
