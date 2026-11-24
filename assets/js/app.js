(function () {
"use strict";

/* ---------------------------------------------------------------- basics */
const S = window.SITE;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $("#app");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem("dbx2:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("dbx2:" + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
};
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
// deterministic shuffle so that numbered mocks always contain the same questions
function seeded(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return function () { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
function seededShuffle(arr, seedStr) {
  const rnd = seeded(seedStr), a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const fmtDate = d => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const daysUntil = iso => Math.round((new Date(iso + "T00:00:00") - new Date(todayISO() + "T00:00:00")) / 864e5);

/* ---------------------------------------------------------------- data */
const EXAMS = S.exams;                       // { A: {...}, P: {...} }
const EKEYS = Object.keys(EXAMS);
const TOPICS = S.topics;
const TBYID = Object.fromEntries(TOPICS.map(t => [t.id, t]));
const Q = S.questions;
const QBYID = Object.fromEntries(Q.map(q => [q.id, q]));
const GROUPS = ["Foundations", "Ingestion", "Transformation", "Orchestration and DevOps", "Operations", "Governance"];
const SECTION = {};                          // "A2" -> {exam, ...section}
EKEYS.forEach(k => EXAMS[k].sections.forEach(s => { SECTION[k + s.id] = { exam: k, ...s }; }));
const secOf = (q, exam) => q.sec.find(s => s[0] === exam);
const poolFor = exam => Q.filter(q => secOf(q, exam));
const topicLink = id => TBYID[id] ? `<a href="#/topic/${id}">${esc(TBYID[id].title)}</a>` : esc(id);
const secBadge = tag => `<a class="badge ${tag[0] === "P" ? "p" : ""}" href="#/exam/${tag[0]}?s=${tag}" title="${esc(SECTION[tag].name)}">${tag[0] === "A" ? "Associate" : "Professional"} S${tag.slice(1)}</a>`;

/* numbered mocks: each section's questions are split into disjoint slices */
const MOCKS = {};
EKEYS.forEach(exam => {
  const E = EXAMS[exam], bySec = {};
  let n = Infinity;
  E.sections.forEach(s => {
    // each question counts once per exam: in its first (primary) section for that exam
    const tag = exam + s.id, list = Q.filter(q => secOf(q, exam) === tag);
    const own = seededShuffle(list.filter(q => q.level === exam), "own" + tag);
    const other = seededShuffle(list.filter(q => q.level !== exam), "other" + tag);
    bySec[tag] = own.concat(other).map(q => q.id);
    n = Math.min(n, Math.floor(bySec[tag].length / s.per_mock));
  });
  MOCKS[exam] = [];
  for (let i = 0; i < n; i++) {
    let ids = [];
    E.sections.forEach(s => { const tag = exam + s.id; ids = ids.concat(bySec[tag].slice(i * s.per_mock, (i + 1) * s.per_mock)); });
    MOCKS[exam].push(seededShuffle(ids, exam + "mock" + i));
  }
});
function weightedRandom(exam) {
  let ids = [];
  EXAMS[exam].sections.forEach(s => {
    const tag = exam + s.id;
    ids = ids.concat(shuffle(Q.filter(q => secOf(q, exam) === tag)).slice(0, s.per_mock).map(q => q.id));
  });
  return shuffle(ids);
}

/* ---------------------------------------------------------------- shared UI */
function addCopyButtons(root = app) {
  $$("pre", root).forEach(p => {
    if ($(".copy", p) || !$("code", p)) return;
    const b = document.createElement("button");
    b.className = "copy"; b.textContent = "copy";
    b.onclick = e => { e.stopPropagation(); navigator.clipboard.writeText($("code", p).innerText).then(() => { b.textContent = "copied"; setTimeout(() => b.textContent = "copy", 1200); }); };
    p.appendChild(b);
  });
}
const pctBar = p => `<div class="bar"><span style="width:${Math.max(0, Math.min(100, p))}%"></span></div>`;
function objectivesDone(exam) {
  const done = store.get("objectives", {});
  let n = 0, t = 0;
  EXAMS[exam].sections.forEach(s => s.objectives.forEach(o => { t++; if (done[o.id]) n++; }));
  return [n, t];
}
const historyFor = exam => store.get("history", []).filter(h => h.exam === exam);
const missedIds = () => store.get("missed", []);
function bestMock(exam) {
  const h = historyFor(exam).filter(x => x.full);
  return h.length ? h.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
}
function examDate(exam) { return store.get("examDates", { A: "2026-12-11", P: "" })[exam] || ""; }

/* ---------------------------------------------------------------- router */
let runState = null, timerId = null;
function route() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, query] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const params = new URLSearchParams(query || "");
  if (runState && parts[0] !== "run") leaveRun();
  $$("#nav a").forEach(a => {
    const href = a.getAttribute("href").slice(2);
    a.classList.toggle("active", href === path || (href && path.startsWith(href + "/")) || (href === "topics" && parts[0] === "topic"));
  });
  $("#nav").classList.remove("open");
  const view = parts[0] || "";
  if (view === "") renderDashboard();
  else if (view === "plan") renderPlan(parts[1] || "A");
  else if (view === "exam" && EXAMS[parts[1]]) renderExam(parts[1], params.get("s"));
  else if (view === "topics") renderTopics();
  else if (view === "topic" && TBYID[parts[1]]) renderTopic(parts[1]);
  else if (view === "practice" && EXAMS[parts[1]]) renderPractice(parts[1]);
  else if (view === "run" && runState) renderQuestion();
  else if (view === "flashcards") renderFlashcards(params.get("topic") || "", params.get("exam") || "");
  else if (view === "page" && S.pages[parts[1]]) renderPage(parts[1]);
  else { location.hash = "#/"; return; }
  if (!params.get("s")) window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}
window.addEventListener("hashchange", route);
$("#menu-btn").onclick = () => $("#nav").classList.toggle("open");

/* ---------------------------------------------------------------- dashboard */
function renderDashboard() {
  const today = todayISO();
  const planA = S.plans.A.days;
  const todays = planA.find(d => d.date === today);
  app.innerHTML = `
  <h1>Databricks Data Engineer certifications</h1>
  <p class="lead">One place to prepare for both exams: the official outlines with your progress, ${TOPICS.length} topics written for both exams, ${Q.length} practice questions with explanations, flashcards and study plans.</p>
  <div class="grid2">${EKEYS.map(examCard).join("")}</div>
  ${todays ? `<div class="card"><div class="muted small">Today in the Associate plan</div><h3 style="margin:4px 0 6px">${esc(todays.focus)}</h3><div>${todays.tasks}</div><div class="btns">${planLinks(todays)}<a class="btn ghost small" href="#/plan/A">Open the plan</a></div></div>` : ""}
  <h2>How to use this site</h2>
  <ol>
    <li>Open the <a href="#/exam/A">exam outline</a> and tick each objective once you can explain it without notes.</li>
    <li>Study the linked <a href="#/topics">topic</a>, run its hands-on exercise in Databricks Free Edition, then practise the topic's questions.</li>
    <li>Take the numbered mocks under exam conditions. Each mock follows the official section weights and never repeats a question from another numbered mock.</li>
    <li>Review every miss: the explanation tells you why each option is right or wrong. Missed questions are collected for a final review.</li>
    <li>On the last day, read the <a href="#/page/cheatsheet">cheat sheet</a> and the <a href="#/page/exam-day">exam-day checklist</a>.</li>
  </ol>
  <footer>Independent study material. Not affiliated with Databricks. No question on this site comes from a real exam. Progress is stored in this browser only.</footer>`;
  $$("input[data-examdate]").forEach(inp => inp.onchange = () => {
    const d = store.get("examDates", { A: "2026-12-11", P: "" }); d[inp.dataset.examdate] = inp.value; store.set("examDates", d); renderDashboard();
  });
}
function examCard(exam) {
  const E = EXAMS[exam], [n, t] = objectivesDone(exam), best = bestMock(exam), date = examDate(exam);
  const left = date ? daysUntil(date) : null;
  return `<div class="card">
    <div class="topic-head"><div><div class="muted small">${esc(E.version)}</div><h3 style="margin:2px 0 8px">${esc(E.name)}</h3></div>
    <div class="r"><div class="stat"><div class="v">${left === null ? "–" : left > 0 ? left + " days" : left === 0 ? "Today" : "Done"}</div><div class="d">${date ? "until " + fmtDate(date) : "date not set"}</div></div></div></div>
    <dl class="kv"><dt>Format</dt><dd>${E.questions} questions, ${E.minutes} minutes</dd>
      <dt>Exam date</dt><dd><input type="date" data-examdate="${exam}" value="${date}"></dd>
      <dt>Objectives</dt><dd>${n} of ${t} ticked ${pctBar(t ? n / t * 100 : 0)}</dd>
      <dt>Best full mock</dt><dd>${best ? `<b class="${best.pct >= 80 ? "pass" : best.pct < 70 ? "fail" : ""}">${best.pct}%</b> (${esc(best.label)})` : "no attempt yet"}</dd>
      <dt>Questions</dt><dd>${poolFor(exam).length} in the bank, ${MOCKS[exam].length} numbered mocks</dd></dl>
    <div class="btns"><a class="btn small" href="#/exam/${exam}">Exam outline</a><a class="btn ghost small" href="#/practice/${exam}">Practice</a><a class="btn ghost small" href="#/plan/${exam}">Study plan</a></div>
  </div>`;
}

/* ---------------------------------------------------------------- study plans */
function planLinks(d) {
  const out = (d.topics || []).map(id => `<a class="btn ghost small" href="#/topic/${id}">${esc(TBYID[id].title)}</a>`);
  if (d.practice) {
    const [kind, val] = String(d.practice).split(":");
    if (kind === "mock") out.push(`<button class="btn small" data-start="mock" data-exam="${d.exam || "A"}" data-mock="${+val - 1}">Mock ${val}</button>`);
    else if (kind === "section") out.push(`<button class="btn small" data-start="section" data-tag="${val}">Practice ${val[0] === "A" ? "Associate" : "Professional"} S${val.slice(1)}</button>`);
    else if (kind === "random") out.push(`<button class="btn small" data-start="random" data-exam="${val}">Random mock</button>`);
    else if (kind === "sprint") out.push(`<button class="btn small" data-start="sprint" data-exam="${val}">Sprint mock</button>`);
    else if (kind === "missed") out.push(`<button class="btn small" data-start="missed" data-exam="${val}">Missed questions</button>`);
    else if (kind === "topic" && TBYID[val]) out.push(`<button class="btn small" data-start="topic" data-topic="${val}" data-exam="${d.exam || "A"}">Practise: ${esc(TBYID[val].title)}</button>`);
  }
  return out.join(" ");
}
function renderPlan(exam) {
  exam = EXAMS[exam] ? exam : "A";
  const P = S.plans[exam], done = store.get("plan", {});
  let body;
  if (exam === "A") {
    const today = todayISO();
    const rows = P.days.map(d => `<tr class="${done["A" + d.date] ? "done" : ""} ${d.date === today ? "today" : ""}">
      <td><input type="checkbox" data-plan="A${d.date}" ${done["A" + d.date] ? "checked" : ""} aria-label="done"></td>
      <td>${fmtDate(d.date)}</td><td><b>${esc(d.focus)}</b><div>${d.tasks}</div><div class="btns" style="margin:6px 0 0">${planLinks(d)}</div></td><td class="r">${esc(d.hours || "")}</td></tr>`).join("");
    body = `<table class="plan"><tr><th></th><th>Day</th><th>Focus and tasks</th><th class="r">Time</th></tr>${rows}</table>`;
  } else {
    body = P.weeks.map((w, wi) => `<h2>${esc(w.title)}</h2><table class="plan"><tr><th></th><th>Day</th><th>Focus and tasks</th><th class="r">Time</th></tr>${
      w.days.map((d, di) => { const key = `P${wi}-${di}`; return `<tr class="${done[key] ? "done" : ""}"><td><input type="checkbox" data-plan="${key}" ${done[key] ? "checked" : ""} aria-label="done"></td><td>Day ${wi * 7 + di + 1}</td><td><b>${esc(d.focus)}</b><div>${d.tasks}</div><div class="btns" style="margin:6px 0 0">${planLinks({ ...d, exam: "P" })}</div></td><td class="r">${esc(d.hours || "")}</td></tr>`; }).join("")}</table>`).join("");
  }
  const keys = exam === "A" ? P.days.map(d => "A" + d.date) : P.weeks.flatMap((w, wi) => w.days.map((_, di) => `P${wi}-${di}`));
  const n = keys.filter(k => done[k]).length;
  app.innerHTML = `<h1>Study plans</h1>
    <div class="btns"><div class="seg"><a href="#/plan/A" class="${exam === "A" ? "on" : ""}">Associate</a><a href="#/plan/P" class="${exam === "P" ? "on" : ""}">Professional</a></div></div>
    <h2 style="margin-top:12px">${esc(P.title)}</h2><div class="lead">${P.intro}</div>
    <div class="muted small">${n} of ${keys.length} days done</div>${pctBar(keys.length ? n / keys.length * 100 : 0)}
    ${body}`;
  $$("[data-plan]").forEach(cb => cb.onchange = () => { const d = store.get("plan", {}); d[cb.dataset.plan] = cb.checked; store.set("plan", d); renderPlan(exam); });
}

/* ---------------------------------------------------------------- exam outline */
function renderExam(exam, focusTag) {
  const E = EXAMS[exam], done = store.get("objectives", {}), [n, t] = objectivesDone(exam);
  app.innerHTML = `<div class="crumbs"><a href="#/">Dashboard</a> / Exams</div>
    <h1>${esc(E.name)}</h1><p class="lead">${esc(E.description)}</p>
    <div class="grid2">
      <div class="card"><h3>Exam format</h3><table>${E.details.map(([k, v]) => `<tr><td class="muted">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
        <p class="small muted">Source: <a href="${E.guide_url}" target="_blank" rel="noopener">official exam guide</a> (${esc(E.version)}). Check it again two weeks before the exam.</p></div>
      <div class="card"><h3>Your coverage</h3><p>${n} of ${t} objectives ticked.</p>${pctBar(t ? n / t * 100 : 0)}
        <p class="small muted">Tick an objective when you can explain it and answer its practice questions without notes.</p>
        <div class="btns"><a class="btn small" href="#/practice/${exam}">Practice exams</a><a class="btn ghost small" href="#/plan/${exam}">Study plan</a><a class="btn ghost small" href="#/flashcards?exam=${exam}">Flashcards</a></div></div>
    </div>
    <h2>Sections and weights</h2>
    <div class="card">${E.sections.map(s => `<div class="wrow"><div><a href="#/exam/${exam}?s=${exam}${s.id}"><b>S${s.id}</b> ${esc(s.name)}</a></div>${pctBar(s.weight * 100 / 25)}<div class="r"><b>${s.weight}%</b></div></div>`).join("")}</div>
    ${E.sections.map(s => {
      const tag = exam + s.id, nq = Q.filter(q => q.sec.includes(tag)).length;
      const sn = s.objectives.filter(o => done[o.id]).length;
      return `<h2 id="sec-${tag}">S${s.id}. ${esc(s.name)} <span class="badge">${s.weight}%</span></h2>
      <p class="muted small">${sn} of ${s.objectives.length} objectives ticked · about ${s.per_mock} questions per exam · ${nq} practice questions</p>
      <div class="card">${s.objectives.map(o => `<div class="obj ${done[o.id] ? "done" : ""}"><input type="checkbox" data-obj="${o.id}" ${done[o.id] ? "checked" : ""} aria-label="I can do this">
        <div><div class="txt">${esc(o.text)}</div><div class="links small">Study: ${o.topics.map(topicLink).join(", ")}</div></div></div>`).join("")}</div>
      <div class="btns"><button class="btn small" data-start="section" data-tag="${tag}">Practise S${s.id} (${nq} questions)</button></div>`;
    }).join("")}`;
  $$("[data-obj]").forEach(cb => cb.onchange = () => {
    const d = store.get("objectives", {}); d[cb.dataset.obj] = cb.checked; store.set("objectives", d);
    cb.closest(".obj").classList.toggle("done", cb.checked);
  });
  if (focusTag && $("#sec-" + focusTag)) $("#sec-" + focusTag).scrollIntoView();
}

/* ---------------------------------------------------------------- topics */
function renderTopics() {
  app.innerHTML = `<div class="crumbs"><a href="#/">Dashboard</a> / Topics</div><h1>Topics</h1>
    <p class="lead">Each topic is written once and covers what both exams ask about it. The badges show where it appears in each exam outline.</p>
    ${GROUPS.map(g => `<div class="tgroup"><h2>${esc(g)}</h2><div class="tlist">${TOPICS.filter(t => t.group === g).map(t => `
      <a class="card" href="#/topic/${t.id}"><div class="t">${esc(t.title)}</div><div class="d">${esc(t.summary)}</div>
      <div>${t.sections.map(tag => `<span class="badge ${tag[0] === "P" ? "p" : ""}">${tag[0]}${tag.slice(1)}</span>`).join("")} <span class="muted small">${Q.filter(q => q.topic === t.id).length} questions</span></div></a>`).join("")}</div></div>`).join("")}`;
}
function renderTopic(id) {
  const t = TBYID[id], i = TOPICS.indexOf(t), prev = TOPICS[i - 1], next = TOPICS[i + 1];
  const nq = Q.filter(q => q.topic === id).length;
  app.innerHTML = `<div class="crumbs"><a href="#/topics">Topics</a> / ${esc(t.group)}</div>
    <div class="topic-head"><div><h1>${esc(t.title)}</h1><p class="lead" style="margin-bottom:8px">${esc(t.summary)}</p>
      <div>${t.sections.map(secBadge).join("")}</div></div></div>
    <div class="btns"><button class="btn small" data-start="topic" data-topic="${id}" ${nq ? "" : "disabled"}>Practise this topic (${nq})</button>
      <a class="btn ghost small" href="#/flashcards?topic=${id}">Flashcards</a></div>
    <div class="card"><div class="muted small">On this page</div><ul class="toc" id="toc"></ul></div>
    <article class="content">${t.html}</article>
    <div class="pager">${prev ? `<a href="#/topic/${prev.id}">Previous: ${esc(prev.title)}</a>` : "<span></span>"}${next ? `<a href="#/topic/${next.id}">Next: ${esc(next.title)}</a>` : ""}</div>`;
  $("#toc").innerHTML = $$(".content h2", app).map(h => `<li><a href="#/topic/${id}" data-to="${h.id}">${esc(h.textContent)}</a></li>`).join("");
  $$("#toc a").forEach(a => a.onclick = e => { e.preventDefault(); document.getElementById(a.dataset.to).scrollIntoView(); });
  addCopyButtons();
}

/* ---------------------------------------------------------------- pages */
function renderPage(name) {
  app.innerHTML = `<h1>${esc(S.pages[name].title)}</h1><article class="content">${S.pages[name].html}</article>`;
  // exam-day checklists: turn list items that start with [ ] into stored checkboxes
  const saved = store.get("check:" + name, {});
  $$(".content li", app).forEach((li, i) => {
    if (!li.innerHTML.startsWith("[ ] ")) return;
    li.innerHTML = `<label><input type="checkbox" data-ck="${i}" ${saved[i] ? "checked" : ""}> ${li.innerHTML.slice(4)}</label>`;
    li.style.listStyle = "none";
  });
  $$("[data-ck]").forEach(cb => cb.onchange = () => { const d = store.get("check:" + name, {}); d[cb.dataset.ck] = cb.checked; store.set("check:" + name, d); });
  addCopyButtons();
}

/* ---------------------------------------------------------------- practice hub */
function renderPractice(exam) {
  const E = EXAMS[exam], hist = historyFor(exam), missed = missedIds().filter(id => QBYID[id] && secOf(QBYID[id], exam));
  const bestFor = i => { const h = hist.filter(x => x.mock === i); return h.length ? Math.max(...h.map(x => x.pct)) + "%" : "–"; };
  const saved = store.get("run", null);
  const topicsHere = TOPICS.filter(t => Q.some(q => q.topic === t.id && secOf(q, exam)));
  app.innerHTML = `<div class="crumbs"><a href="#/">Dashboard</a> / Practice</div>
    <h1>${esc(E.short)} practice</h1>
    <div class="btns"><div class="seg">${EKEYS.map(k => `<a href="#/practice/${k}" class="${k === exam ? "on" : ""}">${esc(EXAMS[k].short)}</a>`).join("")}</div></div>
    <p class="lead">${poolFor(exam).length} questions tagged to this exam. Options are shuffled on every attempt. In exam mode you see the answers at the end; in study mode you see them after each question.</p>
    ${saved && saved.exam === exam && !saved.finished && saved.items.every(i => QBYID[i.id]) ? `<div class="callout">You have an unfinished <b>${esc(saved.label)}</b>. <button class="btn small" id="resume">Resume</button> <button class="btn ghost small" id="discard">Discard</button></div>` : ""}
    <h2>Full mock exams</h2>
    <table><tr><th>Mock</th><th class="r">Questions</th><th class="r">Time</th><th class="r">Best</th><th></th></tr>
      ${MOCKS[exam].map((m, i) => `<tr><td><b>Mock ${i + 1}</b><div class="muted small">Fixed set, official weights, no overlap with other numbered mocks</div></td><td class="r">${m.length}</td><td class="r">${E.minutes} min</td><td class="r">${bestFor(i)}</td><td class="r"><button class="btn small" data-start="mock" data-exam="${exam}" data-mock="${i}">Start</button></td></tr>`).join("")}
      <tr><td><b>Random mock</b><div class="muted small">New weighted draw from the whole bank each time</div></td><td class="r">${E.questions}</td><td class="r">${E.minutes} min</td><td class="r">–</td><td class="r"><button class="btn small" data-start="random" data-exam="${exam}">Start</button></td></tr>
      <tr><td><b>Sprint</b><div class="muted small">Same draw with less time, to build a time buffer</div></td><td class="r">${E.questions}</td><td class="r">${E.sprint_minutes} min</td><td class="r">–</td><td class="r"><button class="btn small" data-start="sprint" data-exam="${exam}">Start</button></td></tr>
    </table>
    <h2>Study mode</h2>
    <div class="grid">
      <div class="card"><h3>By section</h3>${E.sections.map(s => { const tag = exam + s.id; return `<button class="btn ghost small" style="margin:3px 0" data-start="section" data-tag="${tag}">S${s.id} ${esc(s.name)} (${Q.filter(q => q.sec.includes(tag)).length})</button>`; }).join("<br>")}</div>
      <div class="card"><h3>By topic</h3><p><select id="topic-pick">${topicsHere.map(t => `<option value="${t.id}">${esc(t.title)} (${Q.filter(q => q.topic === t.id && secOf(q, exam)).length})</option>`).join("")}</select></p><button class="btn small" id="topic-go">Start</button></div>
      <div class="card"><h3>Missed questions</h3><p>${missed.length ? `${missed.length} question(s) you got wrong and have not answered correctly since.` : "Nothing here yet. Questions you miss are collected here."}</p><button class="btn small" data-start="missed" data-exam="${exam}" ${missed.length ? "" : "disabled"}>Review</button></div>
    </div>
    <h2>History</h2>
    ${hist.length ? `<table><tr><th>Date</th><th>Mode</th><th class="r">Score</th>${E.sections.map(s => `<th class="r">S${s.id}</th>`).join("")}</tr>${hist.slice().reverse().map(h => `<tr><td>${new Date(h.date).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td><td>${esc(h.label)}</td><td class="r"><b class="${h.pct >= 80 ? "pass" : h.pct < 70 ? "fail" : ""}">${h.pct}%</b> <span class="muted">${h.score}/${h.total}</span></td>${E.sections.map(s => { const v = h.sec[exam + s.id]; return `<td class="r">${v ? Math.round(v[0] / v[1] * 100) + "%" : "–"}</td>`; }).join("")}</tr>`).join("")}</table>
      <button class="btn ghost small" id="clear-hist">Clear ${esc(E.short)} history</button>` : `<p class="muted">No attempts yet.</p>`}`;
  $("#topic-go").onclick = () => startRun({ kind: "topic", topic: $("#topic-pick").value, exam });
  if ($("#resume")) { $("#resume").onclick = () => { runState = saved; location.hash = "#/run"; }; $("#discard").onclick = () => { store.set("run", null); renderPractice(exam); }; }
  if ($("#clear-hist")) $("#clear-hist").onclick = () => { if (confirm("Clear the history for this exam?")) { store.set("history", store.get("history", []).filter(h => h.exam !== exam)); renderPractice(exam); } };
}

/* ---------------------------------------------------------------- practice engine */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-start]");
  if (!b || b.disabled) return;
  e.preventDefault();
  startRun({ kind: b.dataset.start, exam: b.dataset.exam, mock: b.dataset.mock, tag: b.dataset.tag, topic: b.dataset.topic });
});
function startRun(o) {
  let ids, label, exam = o.exam, timed = false, minutes = 0, mock = null;
  if (o.kind === "mock") { mock = +o.mock; ids = MOCKS[exam][mock]; label = `${EXAMS[exam].short} Mock ${mock + 1}`; timed = true; minutes = EXAMS[exam].minutes; }
  else if (o.kind === "random") { ids = weightedRandom(exam); label = `${EXAMS[exam].short} random mock`; timed = true; minutes = EXAMS[exam].minutes; }
  else if (o.kind === "sprint") { ids = weightedRandom(exam); label = `${EXAMS[exam].short} sprint`; timed = true; minutes = EXAMS[exam].sprint_minutes; }
  else if (o.kind === "section") { exam = o.tag[0]; ids = shuffle(Q.filter(q => q.sec.includes(o.tag)).map(q => q.id)); label = `${EXAMS[exam].short} S${o.tag.slice(1)}: ${SECTION[o.tag].name}`; }
  else if (o.kind === "topic") { ids = shuffle(Q.filter(q => q.topic === o.topic && (!exam || secOf(q, exam))).map(q => q.id)); label = `Topic: ${TBYID[o.topic].title}`; exam = exam || (TBYID[o.topic].sections[0] || "A")[0]; }
  else if (o.kind === "missed") { ids = shuffle(missedIds().filter(id => QBYID[id] && secOf(QBYID[id], exam))); label = `${EXAMS[exam].short} missed questions`; }
  if (!ids || !ids.length) return;
  runState = { exam, label, timed, mock, full: timed, items: ids.map(id => ({ id, order: shuffle(QBYID[id].o.map((_, i) => i)), ans: [], flag: false })),
    cur: 0, end: timed ? Date.now() + minutes * 60000 : null, finished: false };
  saveRun();
  if (location.hash === "#/run") renderQuestion(); else location.hash = "#/run";
}
function saveRun() { if (runState && runState.timed) store.set("run", runState); }
function leaveRun() { clearInterval(timerId); if (runState && !runState.finished) saveRun(); runState = null; }
const isDone = it => it.ans.length === QBYID[it.id].ok.length;
const isRight = it => sameSet(it.ans, QBYID[it.id].ok);
function tick() {
  const el = $("#timer"); if (!el || !runState) return;
  const left = runState.end - Date.now();
  if (left <= 0) { clearInterval(timerId); finishRun(true); return; }
  const m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000);
  el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  el.classList.toggle("low", left < 10 * 60000);
}
function renderQuestion() {
  const R = runState, it = R.items[R.cur], q = QBYID[it.id];
  const reveal = R.finished || (!R.timed && isDone(it)), multi = q.ok.length > 1, L = "ABCDEF";
  clearInterval(timerId);
  if (R.timed && !R.finished) timerId = setInterval(tick, 1000);
  app.innerHTML = `
  <div class="quiz-top"><div><b>${esc(R.label)}</b> · question ${R.cur + 1} of ${R.items.length} · ${R.items.filter(isDone).length} answered</div>
    <div class="btns" style="margin:0">${R.timed && !R.finished ? `<span class="timer" id="timer">--:--</span>` : ""}
    ${R.finished ? `<button class="btn small" id="to-results">Results</button>` : R.timed ? `<button class="btn small" id="submit">Submit</button>` : `<button class="btn ghost small" id="stop">Finish</button>`}</div></div>
  ${R.timed || R.finished ? `<div class="qnav">${R.items.map((x, i) => { let c = i === R.cur ? "cur " : ""; if (R.finished) c += isRight(x) ? "r-ok" : "r-bad"; else { if (isDone(x)) c += "ans "; if (x.flag) c += "flag"; } return `<button class="${c}" data-go="${i}">${i + 1}</button>`; }).join("")}</div>` : ""}
  <div class="card question">
    <div class="meta">${q.sec.map(secBadge).join("")}<a class="badge" href="#/topic/${q.topic}">${esc(TBYID[q.topic].title)}</a>${multi ? `<span class="badge warn">Choose ${q.ok.length}</span>` : ""}</div>
    <div class="qt">${q.q}</div>
    ${it.order.map((oi, k) => {
      let cls = "opt";
      if (reveal) { cls += " locked"; if (q.ok.includes(oi)) cls += " right"; else if (it.ans.includes(oi)) cls += " wrong"; }
      else if (it.ans.includes(oi)) cls += " sel";
      const why = reveal && q.w && q.w[oi] ? `<div class="why"><b>${q.ok.includes(oi) ? "Correct." : "Incorrect."}</b> ${q.w[oi]}</div>` : "";
      return `<div class="${cls}" data-opt="${oi}" role="button" tabindex="0"><span class="l">${L[k]}</span><div>${q.o[oi]}${why}</div></div>`;
    }).join("")}
    ${reveal ? `<div class="explain"><b>${isRight(it) ? "Correct." : `Answer: ${q.ok.map(o => L[it.order.indexOf(o)]).sort().join(" and ")}.`}</b> ${q.e || ""}</div>` : ""}
  </div>
  <div class="btns"><button class="btn ghost" id="prev" ${R.cur === 0 ? "disabled" : ""}>Previous</button>
    ${R.timed && !R.finished ? `<button class="btn ghost" id="flag">${it.flag ? "Unflag" : "Flag for review"}</button>` : ""}
    <button class="btn" id="next">${R.cur === R.items.length - 1 ? (R.finished ? "Results" : R.timed ? "Submit" : "Finish") : "Next"}</button></div>`;
  if (R.timed && !R.finished) tick();
  $$(".opt").forEach(o => {
    const pick = () => {
      if (R.finished || (!R.timed && isDone(it))) return;
      const oi = +o.dataset.opt;
      if (!multi) it.ans = [oi];
      else if (it.ans.includes(oi)) it.ans = it.ans.filter(x => x !== oi);
      else if (it.ans.length < q.ok.length) it.ans.push(oi);
      if (!R.timed && isDone(it)) recordAnswer(it);
      saveRun(); renderQuestion();
    };
    o.onclick = pick;
    o.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } };
  });
  $$("[data-go]").forEach(b => b.onclick = () => { R.cur = +b.dataset.go; saveRun(); renderQuestion(); });
  $("#prev").onclick = () => { R.cur--; saveRun(); renderQuestion(); };
  $("#next").onclick = () => {
    if (R.cur < R.items.length - 1) { R.cur++; saveRun(); renderQuestion(); window.scrollTo(0, 0); }
    else if (R.finished) renderResults(); else if (R.timed) confirmSubmit(); else finishRun(false);
  };
  if ($("#flag")) $("#flag").onclick = () => { it.flag = !it.flag; saveRun(); renderQuestion(); };
  if ($("#submit")) $("#submit").onclick = confirmSubmit;
  if ($("#stop")) $("#stop").onclick = () => finishRun(false);
  if ($("#to-results")) $("#to-results").onclick = renderResults;
  addCopyButtons();
}
function confirmSubmit() {
  const R = runState, un = R.items.filter(i => !isDone(i)).length, fl = R.items.filter(i => i.flag).length;
  if (confirm(`Submit now?${un ? `\n${un} unanswered.` : ""}${fl ? `\n${fl} flagged for review.` : ""}`)) finishRun(false);
}
function recordAnswer(it) {
  let m = missedIds();
  if (isRight(it)) m = m.filter(x => x !== it.id); else if (!m.includes(it.id)) m.push(it.id);
  store.set("missed", m);
}
function finishRun(timeout) {
  const R = runState; clearInterval(timerId); R.finished = true;
  const sec = {}; let score = 0;
  R.items.forEach(it => {
    const tag = secOf(QBYID[it.id], R.exam) || QBYID[it.id].sec[0];
    sec[tag] = sec[tag] || [0, 0]; sec[tag][1]++;
    if (isRight(it)) { sec[tag][0]++; score++; }
  });
  R.result = { score, total: R.items.length, pct: Math.round(score / R.items.length * 100), sec, timeout };
  if (R.timed) R.items.forEach(recordAnswer);
  if (R.items.some(isDone)) {
    const h = store.get("history", []);
    h.push({ date: Date.now(), exam: R.exam, label: R.label, mock: R.mock, full: R.full, score, total: R.items.length, pct: R.result.pct, sec });
    store.set("history", h);
  }
  store.set("run", null);
  renderResults();
}
function renderResults() {
  const R = runState, r = R.result;
  const tags = Object.keys(r.sec).sort();
  const weakTopics = {};
  R.items.filter(it => !isRight(it)).forEach(it => { const t = QBYID[it.id].topic; weakTopics[t] = (weakTopics[t] || 0) + 1; });
  const weak = Object.entries(weakTopics).sort((a, b) => b[1] - a[1]);
  app.innerHTML = `<h1>${esc(R.label)}: results</h1>
    ${r.timeout ? `<div class="callout bad">Time ran out. Unanswered questions count as wrong.</div>` : ""}
    <div class="grid">
      <div class="card stat"><div class="k">Score</div><div class="result-big ${r.pct >= 80 ? "pass" : r.pct < 70 ? "fail" : ""}">${r.pct}%</div><div class="d">${r.score} of ${r.total} correct</div></div>
      <div class="card stat"><div class="k">Target</div><div class="v">${r.pct >= 80 ? "Reached" : "80% or more"}</div><div class="d">${r.pct >= 80 ? "Keep the pace and review your misses." : "Review every explanation below."}</div></div>
    </div>
    <h2>By section</h2>
    <div class="card">${tags.map(tag => { const [c, t] = r.sec[tag], p = Math.round(c / t * 100); return `<div class="wrow"><div><b>${tag}</b> ${esc(SECTION[tag].name)} <span class="muted">${c}/${t}</span></div><div class="bar"><span style="width:${p}%;background:${p >= 70 ? "var(--ok)" : "var(--bad)"}"></span></div><div class="r"><b>${p}%</b></div></div>`; }).join("")}</div>
    ${weak.length ? `<h2>Topics to review</h2><p>${weak.map(([t, n]) => `${topicLink(t)} <span class="muted">(${n} missed)</span>`).join(" · ")}</p>` : ""}
    <div class="btns"><button class="btn" id="review">Review all questions</button><button class="btn ghost" id="review-wrong">Review only the misses</button><a class="btn ghost" href="#/practice/${R.exam}">Back to practice</a></div>`;
  $("#review").onclick = () => { R.cur = 0; renderQuestion(); window.scrollTo(0, 0); };
  $("#review-wrong").onclick = () => { const i = R.items.findIndex(x => !isRight(x)); R.cur = i < 0 ? 0 : i; renderQuestion(); window.scrollTo(0, 0); };
  window.scrollTo(0, 0);
}

/* ---------------------------------------------------------------- flashcards */
let deck = [], pos = 0;
function renderFlashcards(topic, exam) {
  const cards = S.flashcards.filter(f => (!topic || f.topic === topic) && (!exam || TBYID[f.topic].sections.some(s => s[0] === exam)));
  deck = cards; pos = 0;
  app.innerHTML = `<div class="crumbs"><a href="#/">Dashboard</a> / Flashcards</div><h1>Flashcards</h1>
    <p class="lead">Click the card or press Space to flip. Arrow keys move between cards.</p>
    <div class="btns">
      <div class="seg"><a href="#/flashcards${topic ? "?topic=" + topic : ""}" class="${!exam ? "on" : ""}">Both exams</a>${EKEYS.map(k => `<a href="#/flashcards?exam=${k}${topic ? "&topic=" + topic : ""}" class="${exam === k ? "on" : ""}">${esc(EXAMS[k].short)}</a>`).join("")}</div>
      <select id="fc-topic"><option value="">All topics</option>${TOPICS.map(t => `<option value="${t.id}" ${t.id === topic ? "selected" : ""}>${esc(t.title)}</option>`).join("")}</select>
      <button class="btn ghost small" id="fc-shuffle">Shuffle</button><span class="muted small" id="fc-pos"></span>
    </div>
    <div class="flash" id="flash"><div class="inner"><div class="face front" id="fc-front"></div><div class="face back" id="fc-back"></div></div></div>
    <div class="btns" style="justify-content:center"><button class="btn ghost" id="fc-prev">Previous</button><button class="btn" id="fc-next">Next</button></div>`;
  $("#fc-topic").onchange = e => { location.hash = `#/flashcards?${exam ? "exam=" + exam + "&" : ""}topic=${e.target.value}`; };
  $("#fc-shuffle").onclick = () => { deck = shuffle(deck); pos = 0; showCard(); };
  $("#fc-prev").onclick = () => moveCard(-1); $("#fc-next").onclick = () => moveCard(1);
  $("#flash").onclick = () => $("#flash").classList.toggle("flip");
  showCard();
}
function moveCard(d) { if (!deck.length) return; pos = (pos + d + deck.length) % deck.length; showCard(); }
function showCard() {
  const f = deck[pos];
  if (!f) { $("#fc-front").textContent = "No cards for this filter."; $("#fc-back").textContent = ""; $("#fc-pos").textContent = ""; return; }
  $("#flash").classList.remove("flip");
  setTimeout(() => { $("#fc-front").innerHTML = `<div class="tagline">${esc(TBYID[f.topic].title)}</div><div>${f.front}</div>`; $("#fc-back").innerHTML = `<div>${f.back}</div>`; }, 120);
  $("#fc-pos").textContent = `${pos + 1} / ${deck.length}`;
}
document.addEventListener("keydown", e => {
  if (!$("#flash") || ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
  if (e.key === "ArrowRight") moveCard(1);
  else if (e.key === "ArrowLeft") moveCard(-1);
  else if (e.key === " ") { e.preventDefault(); $("#flash").classList.toggle("flip"); }
});

route();
})();
