# Databricks Data Engineer study hub

A static study site for the **Databricks Certified Data Engineer Associate** and **Professional** exams:

- the official exam outlines (paraphrased) with objectives you can tick,
- 20 topic pages that cover both exams, each with exam traps and a hands-on exercise,
- 365 practice questions with an explanation for every option: numbered mocks with the official section weights (4 Associate, 3 Professional, no question repeated across them), random and sprint mocks, practice by section or topic, and a list of missed questions,
- flashcards, a cheat sheet, an exam-day checklist and two study plans.

Progress is stored in the browser (`localStorage`); nothing is sent anywhere.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

On GitHub, enable **Settings → Pages → Deploy from a branch → `main` / root**. The site needs no build step on GitHub because the generated data file is committed.

## Edit content

All content lives in `content/`. After changing anything there, rebuild the data file:

```bash
pip install markdown pyyaml
python3 build.py
```

`build.py` validates the content (unknown topics or sections, questions without a correct answer, duplicate IDs) and writes `assets/data/site-data.js`. Commit both the content change and the regenerated file.

| Path | Contains |
|---|---|
| `content/exams.yml` | Both exams: format, sections, weights, questions per mock, objectives and the topics that cover them |
| `content/topics/NN-<id>.md` | One page per topic (front matter: `id`, `title`, `group`, `order`, `summary`) |
| `content/questions/NN-<topic>.md` | Practice questions, grouped by topic |
| `content/flashcards.yml` | Flashcards (`topic`, `front`, `back`) |
| `content/plans.yml` | The Associate (dated) and Professional (weekly) study plans |
| `content/pages/*.md` | Cheat sheet, exam day, resources |
| `assets/js/app.js`, `assets/css/site.css`, `index.html` | The application |

### Question format

```markdown
## new-delta-05
exam: A3 P3
topic: delta
level: A
source: new

Question text in Markdown (code blocks allowed).

- [ ] Wrong option :: Why it is wrong.
- [x] Right option :: Why it is right.
- [ ] Another wrong option :: Why it is wrong.

> One-line takeaway shown after answering.
```

- `exam`: sections the question belongs to (`A1`–`A7`, `P1`–`P9`). The first section of each exam is the one used for mocks.
- `level`: `A` or `P`; numbered mocks use questions of their own level first.
- Mark several options with `[x]` for "choose two" questions.
- IDs must be unique. Adding or removing questions changes how the numbered mocks are drawn.

### Topic pages

Topic pages are Markdown with tables, fenced code and admonitions:

```markdown
!!! trap "Short title"
    Indented text of the trap.
```

Admonition types used: `trap`, `tip`, `note`. Every `##` heading appears in the page's table of contents.

## Sources

Objectives are paraphrased from the official exam guides (Associate, August 2026; Professional, 9 October 2026). Check the current guides before the exam; links are on the Resources page. This is independent study material, not affiliated with Databricks, and no question comes from a real exam.
