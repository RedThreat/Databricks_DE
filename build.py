#!/usr/bin/env python3
"""Build the study site.

Reads Markdown/YAML content from ./content and writes ./assets/data/site-data.js,
which index.html loads. Run after editing any content file:

    pip install markdown pyyaml
    python3 build.py
"""
import json
import pathlib
import re
import sys

import markdown
import yaml

ROOT = pathlib.Path(__file__).parent
CONTENT = ROOT / "content"
OUT = ROOT / "assets" / "data" / "site-data.js"

MD_EXT = ["tables", "fenced_code", "admonition", "sane_lists", "attr_list", "toc"]


def md(text, inline=False):
    html = markdown.markdown(text.strip(), extensions=MD_EXT, output_format="html5")
    if inline and html.startswith("<p>") and html.endswith("</p>") and html.count("<p>") == 1:
        html = html[3:-4]
    return html


def split_frontmatter(raw):
    if raw.startswith("---"):
        _, fm, body = raw.split("---", 2)
        return yaml.safe_load(fm) or {}, body
    return {}, raw


def fail(msg):
    print("ERROR:", msg)
    sys.exit(1)


# ---------------------------------------------------------------- exams
exams = yaml.safe_load((CONTENT / "exams.yml").read_text())

# ---------------------------------------------------------------- topics
topics = []
for path in sorted((CONTENT / "topics").glob("*.md")):
    fm, body = split_frontmatter(path.read_text())
    for key in ("id", "title", "group", "order", "summary"):
        if key not in fm:
            fail(f"{path.name}: missing '{key}' in front matter")
    topics.append({
        "id": fm["id"], "title": fm["title"], "group": fm["group"], "order": fm["order"],
        "summary": fm["summary"], "html": md(body),
    })
topics.sort(key=lambda t: t["order"])
topic_ids = {t["id"] for t in topics}

# derive each topic's exam mapping from the objectives in exams.yml
for t in topics:
    t["sections"] = []
for exam_key, exam in exams.items():
    for sec in exam["sections"]:
        for obj in sec["objectives"]:
            for tid in obj["topics"]:
                if tid not in topic_ids:
                    fail(f"exams.yml {obj['id']}: unknown topic '{tid}'")
                tp = next(t for t in topics if t["id"] == tid)
                tag = f"{exam_key}{sec['id']}"
                if tag not in tp["sections"]:
                    tp["sections"].append(tag)

# ---------------------------------------------------------------- pages
pages = {}
for path in sorted((CONTENT / "pages").glob("*.md")):
    fm, body = split_frontmatter(path.read_text())
    pages[path.stem] = {"title": fm.get("title", path.stem), "html": md(body)}

# ---------------------------------------------------------------- plans & flashcards
plans = yaml.safe_load((CONTENT / "plans.yml").read_text())
for key, plan in plans.items():
    plan["intro"] = md(plan.get("intro", ""))
    days = plan.get("days") or [d for w in plan.get("weeks", []) for d in w["days"]]
    for d in days:
        d["tasks"] = md(d.get("tasks", ""), inline=True)
        for tid in d.get("topics", []):
            if tid not in topic_ids:
                fail(f"plans.yml {key}: unknown topic '{tid}'")
flash = yaml.safe_load((CONTENT / "flashcards.yml").read_text())
for i, f in enumerate(flash):
    if f.get("topic") not in topic_ids:
        fail(f"flashcard {i}: unknown topic {f.get('topic')}")
    f["front"] = md(f["front"], inline=True)
    f["back"] = md(f["back"], inline=True)

# ---------------------------------------------------------------- questions
OPT_RE = re.compile(r"^- \[( |x)\] (.*)$")
valid_sections = {f"{k}{s['id']}" for k, e in exams.items() for s in e["sections"]}


def parse_questions(path):
    raw = path.read_text()
    blocks = re.split(r"^## ", raw, flags=re.M)[1:]
    out = []
    for block in blocks:
        lines = block.rstrip().split("\n")
        qid = lines[0].strip()
        i = 1
        meta = {}
        while i < len(lines) and re.match(r"^[a-z]+: ", lines[i]):
            k, v = lines[i].split(": ", 1)
            meta[k] = v.strip()
            i += 1
        body, opts, take = [], [], []
        in_code = False
        for line in lines[i:]:
            if line.startswith("```"):
                in_code = not in_code
            m = None if in_code else OPT_RE.match(line)
            if m:
                opts.append([m.group(1) == "x", m.group(2)])
            elif opts and line.startswith("> "):
                take.append(line[2:])
            elif opts and line.startswith("  ") and not take:
                opts[-1][1] += " " + line.strip()
            elif not opts:
                body.append(line)
        if len(opts) < 2:
            fail(f"{path.name} {qid}: needs at least 2 options")
        if not any(o[0] for o in opts):
            fail(f"{path.name} {qid}: no correct option")
        sections = meta.get("exam", "").split()
        for s in sections:
            if s not in valid_sections:
                fail(f"{path.name} {qid}: unknown section {s}")
        if meta.get("topic") not in topic_ids:
            fail(f"{path.name} {qid}: unknown topic {meta.get('topic')}")
        options, whys = [], []
        for ok, text in opts:
            text, _, why = text.partition(" :: ")
            if ok and why.startswith("Correct."):
                why = why[len("Correct."):].strip()   # the app already labels the right option
            options.append(md(text, inline=True))
            whys.append(md(why, inline=True) if why else "")
        out.append({
            "id": qid,
            "sec": sections,
            "topic": meta["topic"],
            "level": meta.get("level", "A"),
            "src": meta.get("source", path.stem),
            "q": md("\n".join(body)),
            "o": options,
            "ok": [n for n, (ok, _) in enumerate(opts) if ok],
            "w": whys if any(whys) else None,
            "e": md(" ".join(take), inline=True) if take else "",
        })
    return out


questions = []
for path in sorted((CONTENT / "questions").glob("*.md")):
    questions += parse_questions(path)
ids = [q["id"] for q in questions]
dupes = {x for x in ids if ids.count(x) > 1}
if dupes:
    fail(f"duplicate question ids: {sorted(dupes)}")

# ---------------------------------------------------------------- stats
print(f"topics: {len(topics)}  pages: {len(pages)}  flashcards: {len(flash)}  questions: {len(questions)}")
for k, exam in exams.items():
    counts = []
    for s in exam["sections"]:
        tag = f"{k}{s['id']}"
        n = sum(1 for q in questions if tag in q["sec"])
        prim = sum(1 for q in questions if next((x for x in q["sec"] if x[0] == k), None) == tag)
        counts.append(f"{tag}:{n}/{prim}/{s['per_mock']}")
    print(f"  {k}: " + "  ".join(counts))
for t in topics:
    n = sum(1 for q in questions if q["topic"] == t["id"])
    print(f"  topic {t['id']}: {n} questions, sections {t['sections']}")

OUT.parent.mkdir(parents=True, exist_ok=True)
data = {"exams": exams, "topics": topics, "pages": pages, "plans": plans,
        "flashcards": flash, "questions": questions}
OUT.write_text("// Generated by build.py from ./content. Do not edit by hand.\nwindow.SITE = "
               + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")
