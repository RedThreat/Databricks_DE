(function(){
"use strict";
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d){ try{ const v = localStorage.getItem("dea:"+k); return v===null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("dea:"+k, JSON.stringify(v)); }catch(e){} }
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// texto com `código` inline e quebras de linha
const fmt = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\n/g, "<br>");
const SEC = window.SECTIONS;
const SHORT = {1:"Plataforma",2:"Ingestão",3:"Transformação",4:"Lakeflow Jobs",5:"CI/CD",6:"Troubleshooting",7:"Governança"};
const SRC = { site:"Banco do site", sa:"Simulado Associate", sp:"Simulado Professional" };
const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const sameSet = (a,b) => a.length===b.length && a.every(x=>b.includes(x));

/* ── Banco unificado ── */
const Q = [];
window.QUESTIONS.forEach((q,i) => Q.push({ key:"m"+i, src:"site", s:q.s, m:q.m, q:q.q, code:q.code, o:q.o, ok:[q.a], w:null, e:q.e }));
let nsa = 0, nsp = 0;
(window.EXTRA_QUESTIONS||[]).forEach(q => Q.push({ ...q, key: q.src==="sa" ? "sa"+(nsa++) : "sp"+(nsp++) }));
const BYKEY = Object.fromEntries(Q.map(q=>[q.key,q]));
const ASSOC = Q.filter(q=>q.src!=="sp"), PROQ = Q.filter(q=>q.src==="sp");
const tagFor = q => q.src==="sp" ? `<span class="pill">${esc(q.t)}</span>` : `<span class="pill">S${q.s} · ${esc(SEC[q.s].name)}</span>`;
const groupOf = q => q.src==="sp" ? q.t : "S"+q.s;

/* ── Router ── */
const pages = ["inicio","plano","estudo","armadilhas","flashcards","labs","mocks","recursos","pro","exame"];
function route(){
  let h = location.hash.slice(1) || "inicio";
  let sub = null;
  if(h.startsWith("estudo-")){ sub = h.split("-")[1]; h = "estudo"; }
  if(!pages.includes(h)) h = "inicio";
  $$(".page").forEach(p => p.classList.toggle("active", p.id === "p-"+h));
  $$("nav.side a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#"+h));
  $("nav.side").classList.remove("open");
  if(h==="estudo") showStudy(sub || store.get("studyTab","1"));
  if(h==="mocks" && !runState) renderMockHome();
  if(h==="inicio") renderHome();
  if(h==="pro") renderProPractice();
  window.scrollTo(0,0);
}
window.addEventListener("hashchange", route);
// clicar no menu na página onde já estás (ex.: Simulados durante um simulado) volta ao início dessa página
document.addEventListener("click", e => {
  const a = e.target.closest("nav.side a"); if(!a || a.getAttribute("href") !== (location.hash || "#inicio")) return;
  e.preventDefault();
  if(runState){ clearInterval(timerId); if(!runState.finished) saveRun(); runState = null; }
  route();
});

/* ── Contagem ── */
function countdown(){
  const exam = new Date("2026-12-11T09:00:00");
  const now = new Date();
  const d = Math.ceil((exam - new Date(now.getFullYear(),now.getMonth(),now.getDate())) / 864e5);
  $("#cd").textContent = d > 0 ? d + (d===1?" dia":" dias") : (d===0 ? "Hoje" : "Concluído");
}

/* ── Início ── */
function renderHome(){
  $("#weights").innerHTML = Object.entries(SEC).sort((a,b)=>b[1].w-a[1].w).map(([k,v]) =>
    `<div class="row"><div><b>S${k}</b> ${v.name}</div><div class="bar"><span style="width:${v.w*4}%"></span></div><div><b>${v.w}%</b></div></div>`).join("");
  const hist = store.get("history", []).filter(h => h.full);
  if(hist.length){
    const best = hist.reduce((a,b)=> b.pct>a.pct?b:a);
    $("#best-mock").textContent = best.pct + "%";
    $("#best-mock-d").textContent = `${best.label}, ${new Date(best.date).toLocaleDateString("pt-PT")}`;
  }
  const qc = $("#q-count"); if(qc) qc.textContent = ASSOC.length;
}

/* ── Plano ── */
function renderPlan(){
  const done = store.get("plan", {});
  const today = new Date().toISOString().slice(0,10);
  $("#plan-body").innerHTML = window.PLAN.map(([iso,day,focus,tasks,time,sec]) => {
    const link = sec ? ` <a href="#estudo-${sec}">matéria</a> · <a href="#" data-practice="${sec}">treinar S${sec}</a>` : "";
    return `<tr class="${done[iso]?"done":""} ${iso===today?"today":""}"><td><input type="checkbox" data-d="${iso}" ${done[iso]?"checked":""} aria-label="feito"></td><td>${day}</td><td>${focus}</td><td>${esc(tasks)}${link}</td><td>${time}</td></tr>`;
  }).join("");
  const n = Object.values(done).filter(Boolean).length, t = window.PLAN.length;
  $("#plan-bar").style.width = (n/t*100)+"%";
  $("#plan-pct").textContent = `${n} de ${t} dias feitos`;
}
document.addEventListener("change", e => {
  if(e.target.matches("#plan-body input")){
    const d = store.get("plan", {}); d[e.target.dataset.d] = e.target.checked; store.set("plan", d); renderPlan();
  }
  if(e.target.closest(".check")){
    const ul = e.target.closest(".check");
    store.set("check:"+ul.dataset.key, $$("input", ul).map(i => i.checked));
  }
});
function initChecks(){
  $$(".check").forEach(ul => { const v = store.get("check:"+ul.dataset.key, []); $$("input", ul).forEach((i,n)=> i.checked = !!v[n]); });
}

/* ── Matéria ── */
function initStudy(){
  $("#study-tabs").innerHTML = Object.keys(SEC).map(k => `<button data-tab="${k}">S${k} ${SHORT[k]}</button>`).join("");
  $("#study-tabs").addEventListener("click", e => { const b = e.target.closest("button"); if(b) showStudy(b.dataset.tab); });
}
function showStudy(k){
  store.set("studyTab", k);
  $$("#study-tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab == k));
  $$(".study-sec").forEach(s => s.classList.toggle("on", s.dataset.sec == k));
  $("#study-practice").innerHTML = `<button class="btn" data-practice="${k}">Treinar a secção ${k} (${ASSOC.filter(q=>q.s==k).length} perguntas)</button>`;
}

function addCopy(){
  $$("pre").forEach(p => { if($(".copy",p) || !$("code",p)) return; const b=document.createElement("button"); b.className="copy"; b.textContent="copiar";
    b.onclick=()=>{ navigator.clipboard.writeText($("code",p).innerText).then(()=>{b.textContent="copiado"; setTimeout(()=>b.textContent="copiar",1200);}); }; p.appendChild(b); });
}

/* ── Flashcards ── */
let fDeck = [], fPos = 0, fSec = "all";
function initFlash(){
  $("#flash-tabs").innerHTML = `<button data-f="all" class="on">Todas</button>` + Object.keys(SEC).map(k=>`<button data-f="${k}">S${k}</button>`).join("");
  $("#flash-tabs").addEventListener("click", e => { const b=e.target.closest("button"); if(!b) return; fSec=b.dataset.f;
    $$("#flash-tabs button").forEach(x=>x.classList.toggle("on", x===b)); buildDeck(false); });
  $("#flash").addEventListener("click", ()=> $("#flash").classList.toggle("flip"));
  $("#f-next").onclick = ()=> moveFlash(1); $("#f-prev").onclick = ()=> moveFlash(-1);
  $("#f-shuffle").onclick = ()=> buildDeck(true);
  document.addEventListener("keydown", e => {
    if(!$("#p-flashcards").classList.contains("active")) return;
    if(e.key==="ArrowRight") moveFlash(1); else if(e.key==="ArrowLeft") moveFlash(-1);
    else if(e.key===" "){ e.preventDefault(); $("#flash").classList.toggle("flip"); }
  });
  buildDeck(false);
}
function buildDeck(sh){ fDeck = window.FLASH.filter(f => fSec==="all" || f[0]==fSec); if(sh) fDeck = shuffle(fDeck); fPos = 0; showFlash(); }
function moveFlash(d){ fPos = (fPos + d + fDeck.length) % fDeck.length; showFlash(); }
function showFlash(){
  const f = fDeck[fPos]; $("#flash").classList.remove("flip");
  setTimeout(()=>{ $("#f-front").innerHTML = `<div><div class="tag" style="margin-bottom:10px">S${f[0]} · ${SEC[f[0]].name}</div>${esc(f[1])}</div>`; $("#f-back").textContent = f[2]; }, 120);
  $("#f-pos").textContent = `${fPos+1} / ${fDeck.length}`;
}

/* ── Aulas, Notion, Professional ── */
const NB_URL = "https://hilarious-bath-01d.notion.site/";
function renderLectures(){
  if(!$("#lectures")) return;
  $("#lectures").innerHTML = window.LECTURES.map(([g, items]) =>
    `<h2>${esc(g)}</h2><div class="res">${items.map(([t,u]) => `<a class="card" href="${u}" target="_blank" rel="noopener"><div class="t">${esc(t)}</div><div class="d">Notas da aula · claude.ai</div></a>`).join("")}</div>`).join("");
}
function renderNotion(){
  const N = window.NOTION_ASSOC;
  $$(".notion-links").forEach(el => { const k = el.dataset.sec;
    el.innerHTML = `<div class="tag" style="margin-top:10px">Páginas do Notion desta secção</div><ul class="tight">` +
      N[k].map(([t,u]) => `<li><a href="${NB_URL}${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("") + `</ul>`; });
  const P = window.PRO;
  $("#pro-weights").innerHTML = P.sections.slice().sort((a,b)=>b[2]-a[2]).map(([n,name,w]) =>
    `<div class="row"><div><b>S${n}</b> ${esc(name)}</div><div class="bar"><span style="width:${w*4}%"></span></div><div><b>${w}%</b></div></div>`).join("");
  $("#pro-sections").innerHTML = `<p><a class="btn ghost small" href="${P.root}" target="_blank" rel="noopener">Abrir o Notion do Professional</a></p>` +
    P.sections.map(([n,name,w,slug,topics]) => `<div class="card"><div class="tag">Secção ${n} · ${w}%</div><h3 style="margin:4px 0 8px"><a href="${NB_URL}${slug}" target="_blank" rel="noopener">${esc(name)}</a></h3><ul class="tight">${topics.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`).join("");
}
function renderProPractice(){
  const topics = window.PRO_TOPICS || {};
  const wp = store.get("wrongPro", []);
  $("#pro-practice").innerHTML = `
    <div class="grid">
      <div class="card"><div class="tag">Ritmo de exame</div><h3 style="margin-top:6px">Exame Professional</h3><p>45 perguntas aleatórias, 90 minutos, correção no fim.</p><button class="btn" data-start="pro_exam">Começar</button></div>
      <div class="card"><div class="tag">Estudo</div><h3 style="margin-top:6px">Todas as perguntas</h3><p>${PROQ.length} perguntas, explicação logo a seguir a cada uma.</p><button class="btn" data-start="pro_study">Começar</button></div>
      <div class="card"><div class="tag">Revisão</div><h3 style="margin-top:6px">Só as que falhei</h3><p>${wp.length ? wp.length+" pergunta(s) por acertar." : "Ainda sem perguntas falhadas."}</p><button class="btn" data-start="pro_wrong" ${wp.length?"":"disabled"}>Começar</button></div>
    </div>
    <h3>Treino por tema</h3>
    <div class="btns">${Object.entries(topics).map(([k,t]) => `<button class="btn ghost small" data-start="proT_${k}">${esc(t)} (${PROQ.filter(q=>q.pt===k).length})</button>`).join("")}</div>`;
}

/* ═════════════ MOTOR DOS SIMULADOS ═════════════ */
let runState = null, timerId = null;
function pickWeighted(pool){ // 45 aleatórias com os pesos do exame
  const per = {1:3,2:9,3:10,4:7,5:5,6:4,7:7}; let out=[];
  for(const s in per) out = out.concat(shuffle(pool.filter(q=>q.s==s)).slice(0, per[s]));
  return shuffle(out);
}
const MODES = {
  mock1:    { label:"Mock 1", pick:()=>Q.filter(q=>q.src==="site"&&q.m===1), mins:90, exam:true, full:true },
  mock2:    { label:"Mock 2", pick:()=>Q.filter(q=>q.src==="site"&&q.m===2), mins:90, exam:true, full:true },
  mock3:    { label:"Mock 3", pick:()=>Q.filter(q=>q.src==="site"&&q.m===3), mins:90, exam:true, full:true },
  sprint:   { label:"Sprint 75 min", pick:()=>pickWeighted(ASSOC), mins:75, exam:true, full:true },
  sa_exam:  { label:"Simulado Associate (exame)", pick:()=>shuffle(Q.filter(q=>q.src==="sa")).slice(0,45), mins:90, exam:true, full:true },
  sa_study: { label:"Simulado Associate (estudo)", pick:()=>shuffle(Q.filter(q=>q.src==="sa")), exam:false },
  wrong:    { label:"Só as que falhei", pick:()=>{ const w=store.get("wrong",[]); return shuffle(ASSOC.filter(q=>w.includes(q.key))); }, exam:false },
  pro_exam: { label:"Exame Professional", pick:()=>shuffle(PROQ).slice(0,45), mins:90, exam:true, pro:true },
  pro_study:{ label:"Professional (estudo)", pick:()=>shuffle(PROQ), exam:false, pro:true },
  pro_wrong:{ label:"Professional: as que falhei", pick:()=>{ const w=store.get("wrongPro",[]); return shuffle(PROQ.filter(q=>w.includes(q.key))); }, exam:false, pro:true },
};
for(const k in SEC) MODES["sec"+k] = { label:`Treino S${k}`, pick:()=>shuffle(ASSOC.filter(q=>q.s==k)), exam:false };
for(const k in (window.PRO_TOPICS||{})) MODES["proT_"+k] = { label:`Professional: ${window.PRO_TOPICS[k]}`, pick:()=>shuffle(PROQ.filter(q=>q.pt===k)), exam:false, pro:true };

document.addEventListener("click", e => {
  const st = e.target.closest("[data-start]"); if(st && !st.disabled){ startRun(st.dataset.start); return; }
  const pr = e.target.closest("[data-practice]"); if(pr){ e.preventDefault(); startRun("sec"+pr.dataset.practice); }
});

function renderMockHome(){
  $("#mock-home").style.display=""; $("#mock-run").style.display="none";
  $("#sec-buttons").innerHTML = Object.entries(SEC).map(([k,v]) => `<button class="btn ghost small" data-start="sec${k}">S${k} ${v.name} (${ASSOC.filter(q=>q.s==k).length})</button>`).join("");
  const w = store.get("wrong", []);
  $("#wrong-count").textContent = w.length ? `${w.length} pergunta(s) que erraste e ainda não acertaste. Sem tempo.` : "Ainda não há perguntas falhadas. Faz um simulado primeiro.";
  $('[data-start="wrong"]').disabled = !w.length;
  const hist = store.get("history", []);
  $("#history").innerHTML = hist.length ? `<table class="hist"><tr><th>Data</th><th>Modo</th><th>Nota</th>${Object.keys(SEC).map(k=>`<th>S${k}</th>`).join("")}</tr>` +
    hist.slice().reverse().map(h => `<tr><td>${new Date(h.date).toLocaleString("pt-PT",{dateStyle:"short",timeStyle:"short"})}</td><td>${esc(h.label)}</td><td><b class="${h.pct>=80?"pass":h.pct<70?"fail":""}">${h.pct}%</b> (${h.score}/${h.total})</td>${Object.keys(SEC).map(k=>{const s=h.sec["S"+k]; return `<td>${s? Math.round(s[0]/s[1]*100)+"%":"–"}</td>`;}).join("")}</tr>`).join("") + `</table><button class="btn ghost small" id="clear-hist">Apagar histórico</button>` : `<p class="muted">Ainda sem tentativas.</p>`;
  const ch = $("#clear-hist"); if(ch) ch.onclick = () => { if(confirm("Apagar o histórico e as listas de perguntas falhadas?")){ store.set("history",[]); store.set("wrong",[]); store.set("wrongPro",[]); renderMockHome(); } };
  const saved = store.get("run", null);
  if(saved && saved.exam && !saved.finished && saved.items && saved.items.every(i=>BYKEY[i.key])){
    const box = document.createElement("div"); box.className="callout";
    box.innerHTML = `Tens um <b>${esc(saved.label)}</b> a meio. <button class="btn small" id="resume">Continuar</button> <button class="btn ghost small" id="discard">Descartar</button>`;
    $("#mock-home").prepend(box);
    $("#resume").onclick = () => { runState = saved; showRun(); };
    $("#discard").onclick = () => { store.set("run", null); box.remove(); };
  }
}

function startRun(mode){
  const M = MODES[mode]; if(!M) return; const qs = M.pick(); if(!qs.length) return;
  runState = { mode, label:M.label, exam:M.exam, full:!!M.full, pro:!!M.pro,
    items: qs.map(q => ({ key:q.key, order: shuffle(q.o.map((_,i)=>i)), ans:[], flag:false })),
    cur:0, end: M.mins ? Date.now() + M.mins*60000 : null, finished:false };
  saveRun(); showRun();
}
function saveRun(){ if(runState && runState.exam) store.set("run", runState); }

function showRun(){
  if(location.hash !== "#mocks"){ history.replaceState(null, "", "#mocks"); $$(".page").forEach(p => p.classList.toggle("active", p.id === "p-mocks")); $$("nav.side a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#mocks")); }
  $("#mock-home").style.display="none"; $("#mock-run").style.display="";
  clearInterval(timerId);
  if(runState.end && !runState.finished) timerId = setInterval(tick, 1000);
  renderQuestion(); window.scrollTo(0,0);
}
function tick(){
  const left = runState.end - Date.now();
  const el = $("#timer"); if(!el) return;
  if(left <= 0){ clearInterval(timerId); finishRun(true); return; }
  const m = Math.floor(left/60000), s = Math.floor(left%60000/1000);
  el.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  el.classList.toggle("low", left < 10*60000);
}
const isRight = it => sameSet(it.ans, BYKEY[it.key].ok);
const isDone = it => it.ans.length === BYKEY[it.key].ok.length;

function renderQuestion(){
  const R = runState, it = R.items[R.cur], q = BYKEY[it.key], box = $("#mock-run");
  const answered = R.items.filter(isDone).length;
  const reveal = R.finished || (!R.exam && isDone(it));
  const multi = q.ok.length > 1;
  const L = "ABCDE";
  box.innerHTML = `
  <div class="quiz-top">
    <div><b>${esc(R.label)}</b> · pergunta ${R.cur+1} de ${R.items.length} · ${answered} respondidas</div>
    <div style="display:flex;gap:10px;align-items:center">
      ${R.end && !R.finished ? `<span class="timer" id="timer">--:--</span>` : ""}
      ${R.finished ? `<button class="btn small" id="to-results">Ver resultado</button>` : (R.exam ? `<button class="btn small" id="submit">Submeter</button>` : `<button class="btn ghost small" id="stop">Terminar</button>`)}
    </div>
  </div>
  ${R.exam || R.finished ? `<div class="qnav">${R.items.map((x,i)=>{
      let c = i===R.cur?"cur ":""; if(R.finished){ c += isRight(x) ? "r-ok" : "r-bad"; } else { if(isDone(x)) c+="ans "; if(x.flag) c+="flag"; }
      return `<button class="${c}" data-go="${i}">${i+1}</button>`; }).join("")}</div>` : ""}
  <div class="card question">
    <div class="meta">${tagFor(q)} <span class="muted">${SRC[q.src]}${q.src==="site"?" · Mock "+q.m:""}</span>${multi?` <span class="pill outline">escolhe ${q.ok.length}</span>`:""}</div>
    ${q.code ? `<pre><code>${esc(q.code)}</code></pre>` : ""}
    <div class="qt">${fmt(q.q)}</div>
    ${it.order.map((oi,k) => {
      let cls = "opt";
      if(reveal){ if(q.ok.includes(oi)) cls+=" right"; else if(it.ans.includes(oi)) cls+=" wrong"; }
      else if(it.ans.includes(oi)) cls+=" sel";
      const why = reveal && q.w && q.w[oi] ? `<div class="why"><b>${q.ok.includes(oi)?"Correta.":"Incorreta."}</b> ${fmt(q.w[oi])}</div>` : "";
      return `<div class="${cls}" data-opt="${oi}"><span class="l">${L[k]}</span><span>${fmt(q.o[oi])}${why}</span></div>`; }).join("")}
    ${reveal ? `<div class="explain"><b>${isRight(it)?"Certo.":"Resposta certa: "+q.ok.map(o=>L[it.order.indexOf(o)]).sort().join(" e ")+"."}</b>${q.e ? " "+fmt(q.e) : ""}</div>` : ""}
  </div>
  <div class="btns">
    <button class="btn ghost" id="prev" ${R.cur===0?"disabled":""}>Anterior</button>
    ${R.exam && !R.finished ? `<button class="btn ghost" id="flag">${it.flag?"Desmarcar":"Marcar para rever"}</button>` : ""}
    <button class="btn" id="next">${R.cur===R.items.length-1 ? (R.finished?"Ver resultado":(R.exam?"Submeter":"Terminar")) : "Seguinte"}</button>
  </div>`;
  if(R.end && !R.finished) tick();
  $$(".opt", box).forEach(o => o.onclick = () => {
    if(R.finished || (!R.exam && isDone(it))) return;
    const oi = +o.dataset.opt;
    if(!multi) it.ans = [oi];
    else if(it.ans.includes(oi)) it.ans = it.ans.filter(x=>x!==oi);
    else if(it.ans.length < q.ok.length) it.ans.push(oi);
    if(!R.exam && isDone(it)) recordAnswer(it);
    saveRun(); renderQuestion();
  });
  $$("[data-go]", box).forEach(b => b.onclick = () => { R.cur = +b.dataset.go; saveRun(); renderQuestion(); });
  $("#prev").onclick = () => { R.cur--; saveRun(); renderQuestion(); };
  $("#next").onclick = () => {
    if(R.cur < R.items.length-1){ R.cur++; saveRun(); renderQuestion(); window.scrollTo(0,0); }
    else if(R.finished) renderResults(); else if(R.exam) confirmSubmit(); else finishRun(false);
  };
  const f = $("#flag"); if(f) f.onclick = () => { it.flag = !it.flag; saveRun(); renderQuestion(); };
  const s = $("#submit"); if(s) s.onclick = confirmSubmit;
  const st = $("#stop"); if(st) st.onclick = () => finishRun(false);
  const tr = $("#to-results"); if(tr) tr.onclick = renderResults;
  addCopy();
}
function confirmSubmit(){
  const R = runState, un = R.items.filter(i=>!isDone(i)).length, fl = R.items.filter(i=>i.flag).length;
  if(confirm(`Submeter?${un?`\n${un} sem resposta.`:""}${fl?`\n${fl} marcada(s) para rever.`:""}`)) finishRun(false);
}
function recordAnswer(it){
  const q = BYKEY[it.key], k = q.src==="sp" ? "wrongPro" : "wrong";
  let w = store.get(k, []);
  if(isRight(it)) w = w.filter(x=>x!==q.key); else if(!w.includes(q.key)) w.push(q.key);
  store.set(k, w);
}
function finishRun(timeout){
  const R = runState; clearInterval(timerId); R.finished = true;
  const sec = {}; let score = 0;
  R.items.forEach(it => { const q=BYKEY[it.key], g=groupOf(q); sec[g] = sec[g]||[0,0]; sec[g][1]++; if(isRight(it)){ sec[g][0]++; score++; } });
  R.result = { score, total:R.items.length, pct: Math.round(score/R.items.length*100), sec, timeout };
  if(R.exam) R.items.forEach(recordAnswer);
  if(R.items.some(isDone)){
    const h = store.get("history", []); h.push({ date:Date.now(), label:R.label, full:R.full, score, total:R.items.length, pct:R.result.pct, sec }); store.set("history", h);
  }
  store.set("run", null);
  renderResults();
}
function renderResults(){
  const R = runState, r = R.result, box = $("#mock-run");
  const groups = Object.keys(r.sec).sort((a,b)=> R.pro ? (r.sec[a][0]/r.sec[a][1])-(r.sec[b][0]/r.sec[b][1]) : a.localeCompare(b));
  const name = g => R.pro ? esc(g) : `<b>${g}</b> ${esc(SEC[g.slice(1)].name)}`;
  const weak = groups.filter(g=>r.sec[g][0]/r.sec[g][1] < .7);
  box.innerHTML = `
    <h1>${esc(R.label)}: resultado</h1>
    ${r.timeout ? `<div class="callout trap">O tempo acabou; as perguntas sem resposta contam como erradas.</div>`:""}
    <div class="grid">
      <div class="stat"><div class="k">Nota</div><div class="result-big ${r.pct>=80?"pass":r.pct<70?"fail":""}">${r.pct}%</div><div class="d">${r.score} de ${r.total} certas</div></div>
      <div class="stat"><div class="k">Meta</div><div class="v">${r.pct>=80?"Atingida":"80% ou mais"}</div><div class="d">${r.pct>=80?"Bom ritmo.":"Revê as explicações abaixo."}</div></div>
    </div>
    <h2>${R.pro?"Por tema":"Por secção"}</h2>
    <div class="card weights">${groups.map(g => { const [c,t]=r.sec[g], p=Math.round(c/t*100);
      return `<div class="row"><div>${name(g)} <span class="muted">${c}/${t}</span></div><div class="bar"><span style="width:${p}%;background:${p>=70?"var(--ok)":"var(--bad)"}"></span></div><div><b>${p}%</b></div></div>`; }).join("")}</div>
    ${weak.length && !R.pro ? `<div class="callout">Abaixo de 70%: ${weak.map(g=>`<a href="#estudo-${g.slice(1)}">${g} ${esc(SEC[g.slice(1)].name)}</a>`).join(", ")}. Revê a matéria e faz o treino dessas secções.</div>` : ""}
    <div class="btns">
      <button class="btn" id="review">Rever pergunta a pergunta</button>
      <button class="btn ghost" id="review-wrong">Rever só as erradas</button>
      <a class="btn ghost" href="${R.pro?"#pro":"#mocks"}" id="back">Voltar</a>
    </div>`;
  $("#review").onclick = () => { R.cur = 0; renderQuestion(); window.scrollTo(0,0); };
  $("#review-wrong").onclick = () => { const i = R.items.findIndex(x=>!isRight(x)); R.cur = i<0?0:i; renderQuestion(); window.scrollTo(0,0); };
  $("#back").onclick = (e) => { e.preventDefault(); const to = R.pro ? "#pro" : "#mocks"; runState = null; if(location.hash===to) route(); else location.hash = to; };
  window.scrollTo(0,0);
}
// ao sair da página a meio, o simulado fica guardado e aparece "Continuar"
window.addEventListener("hashchange", () => { if(location.hash !== "#mocks" && runState){ clearInterval(timerId); if(!runState.finished) saveRun(); runState = null; } });

/* ── Arranque ── */
countdown(); setInterval(countdown, 60000);
renderPlan(); initChecks(); initStudy(); initFlash(); renderLectures(); renderNotion(); addCopy();
route();
})();
