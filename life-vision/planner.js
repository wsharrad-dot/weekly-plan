// ================= Life planner pages =================
// Runs after the ledger script: it shares its helpers ($, state, db, esc, toast, fail, render, setTab, dates).
const LIFE_COLS=["tasks","habits","habit_log","life_goals","vision","wellness","journal","trips","learning","study","assignments","notes","bill_paid","reflections"];
const LF=Object.fromEntries(LIFE_COLS.map(c=>[c,[]]));
Object.assign(state,{areas:null,profile:null,wcfg:null,pday:todayISO(),pmonth:{y:now.getFullYear(),m:now.getMonth()},pweek:weekStartOf(todayISO()),
  hweek:weekStartOf(todayISO()),wday:todayISO(),jday:todayISO(),jtag:"",trip:null,lgF:"active",lgArea:"",visView:"area",
  noteId:null,noteChecks:[],notePinned:false,noteQ:"",noteCat:""});

const DEFAULT_AREAS=[{id:"health",name:"Health",color:"var(--c2)"},{id:"career",name:"Career",color:"var(--c7)"},{id:"finances",name:"Finances",color:"var(--c3)"},
  {id:"relationships",name:"Relationships",color:"var(--c8)"},{id:"growth",name:"Personal growth",color:"var(--c4)"},{id:"travel",name:"Travel",color:"var(--c1)"},{id:"learning",name:"Learning",color:"var(--c6)"}];
const SWATCHES=[["var(--c1)","Teal"],["var(--c2)","Green"],["var(--c3)","Amber"],["var(--c4)","Lilac"],["var(--c6)","Coral"],["var(--c7)","Blue"],["var(--c8)","Pink"],["var(--c5)","Grey"]];
const areas=()=>state.areas||DEFAULT_AREAS;
const areaOf=id=>areas().find(a=>a.id===id)||{id:id||"",name:"Other",color:"var(--c5)"};
const areaOpts=()=>areas().map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join("");
const chip=id=>{const a=areaOf(id);return `<span class="achip" style="--c:${esc(a.color)}">${esc(a.name)}</span>`};
const nowISO=()=>new Date().toISOString();
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const docAt=p=>{const[c,id]=String(p).split("/");return(LF[c]||[]).find(x=>x.id===id)};
const noDb=()=>{if(db)return false;toast("Saving isn't available in this view.");return true};
const PRI={high:3,medium:2,low:1};
const priTag=p=>PRI[p]?`<span class="ptag ${esc(p)}">${{high:"High",medium:"Medium",low:"Low"}[p]}</span>`:"";
const rmBtn=(key,lbl="Delete")=>`<button class="ghost del ${state.armed===key?"armed":""}" data-rm="${esc(key)}">${state.armed===key?"Confirm":lbl}</button>`;
const safeImg=s=>/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s||"")?s:"";
const freqLabel=h=>h.freq==="weekdays"?"Sun–Thu":h.freq==="weekly"?(+h.perWeek||1)+"× a week":"Every day";
const plainText=html=>{if(!html)return"";const d=new DOMParser().parseFromString(String(html),"text/html");return(d.body.textContent||"").replace(/\s+/g," ").trim()};
const monthLbl=(y,m)=>new Date(y,m,1).toLocaleDateString("en-GB",{month:"long",year:"numeric"});
const icon=id=>`<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
async function upsert(path,patch){const[c,id]=path.split("/");const ex=(LF[c]||[]).some(x=>x.id===id);if(ex)await db.doc(path).update(patch);else await db.doc(path).set(patch)}

// ---------- Generic forms: <form class="lform" data-col="..."> saves its named fields as one document ----------
function formData(f){const o={};for(const el of f.elements){if(!el.name||el.dataset.skip!==undefined||el.tagName==="BUTTON"||el.type==="file"||el.disabled)continue;
  if(el.type==="checkbox")o[el.name]=el.checked;else if(el.type==="number"||el.type==="range")o[el.name]=el.value===""?null:+el.value;else o[el.name]=el.value.trim()}return o}
function fillForm(f,d){for(const el of f.elements){if(!el.name||el.tagName==="BUTTON"||el.type==="file")continue;if(el.type==="checkbox")el.checked=!!d[el.name];else el.value=d[el.name]??""}}
function resetLForm(f){f.reset();delete f.dataset.editing;delete f.dataset.tpl;f.classList.remove("editing");
  f.querySelectorAll("[data-today]").forEach(i=>i.value=state[i.dataset.today]||todayISO());
  const s=f.querySelector("button[type=submit]:not([value=draft])");if(s&&s.dataset.label)s.textContent=s.dataset.label;
  const c=f.querySelector("[data-lcancel]");if(c)c.hidden=true;f.querySelectorAll(".imgPrev").forEach(p=>p.innerHTML="");if(RESET_HOOK[f.id])RESET_HOOK[f.id](f)}
const PREP={}, EDIT_HOOK={}, RESET_HOOK={};
document.querySelectorAll("form.lform button[type=submit]").forEach(s=>s.dataset.label=s.textContent);
document.addEventListener("submit",async e=>{const f=e.target;if(!f.classList.contains("lform"))return;e.preventDefault();if(noDb())return;
  const d=formData(f), ed=f.dataset.editing, btns=[...f.querySelectorAll("button")];
  btns.forEach(b=>b.disabled=true);
  try{if(PREP[f.id]&&await PREP[f.id](d,f,e.submitter,ed)===false){btns.forEach(b=>b.disabled=false);return}}
  catch(err){btns.forEach(b=>b.disabled=false);return toast(err.message||"Check the form and try again.")}
  try{if(ed)await db.doc(ed).update({...d,updatedAt:nowISO()});else await db.collection(f.dataset.col).add({...d,createdAt:nowISO()});
    toast(ed?"Changes saved":f.dataset.added||"Added");resetLForm(f);if(!f.classList.contains("flat"))openForm(f.id,false)}catch(err){fail(err)}
  btns.forEach(b=>b.disabled=false)});
document.addEventListener("click",e=>{const b=e.target.closest("button[data-dedit]");if(!b)return;const d=docAt(b.dataset.dedit),f=$(b.dataset.form);if(!d||!f)return;
  if(b.dataset.tab)setTab(b.dataset.tab);if(document.querySelector('.addToggle[data-form="'+f.id+'"]'))openForm(f.id);resetLForm(f);fillForm(f,d);
  f.dataset.editing=b.dataset.dedit;f.classList.add("editing");
  const s=f.querySelector("button[type=submit]:not([value=draft])");if(s)s.textContent="Save changes";const c=f.querySelector("[data-lcancel]");if(c)c.hidden=false;
  if(EDIT_HOOK[f.id])EDIT_HOOK[f.id](d,f);f.scrollIntoView({behavior:"smooth",block:"start"})});
document.addEventListener("click",e=>{const b=e.target.closest("button[data-lcancel]");if(b)resetLForm(b.form)});
// Toggle a true/false field: data-flip="collection/id|field"
document.addEventListener("click",async e=>{const b=e.target.closest("[data-flip]");if(!b||noDb())return;const[p,k]=b.dataset.flip.split("|"),d=docAt(p);if(!d)return;
  const v=!d[k],patch={[k]:v};if(k==="done")patch.doneOn=v?todayISO():null;state.pop='[data-flip="'+b.dataset.flip+'"]';
  try{await db.doc(p).update(patch)}catch(err){fail(err)}});
// Lists inside a document (milestones, steps, packing...): add, tick, change, remove
async function arrUpdate(p,k,fn){if(noDb())return;const d=docAt(p);if(!d)return;try{await db.doc(p).update({[k]:fn((d[k]||[]).map(x=>({...x}))),updatedAt:nowISO()})}catch(err){fail(err)}}
document.addEventListener("submit",e=>{const f=e.target;if(!f.classList.contains("apush")||!f.dataset.doc)return;e.preventDefault();const it=formData(f);
  if(!Object.values(it).some(v=>v!==""&&v!==null))return;arrUpdate(f.dataset.doc,f.dataset.arr,a=>a.concat([{id:newId(),done:false,...it}]));f.reset()});
document.addEventListener("click",e=>{const b=e.target.closest("[data-aflip],[data-adel]");if(!b)return;
  if(b.dataset.aflip){const[p,k,id,prop]=b.dataset.aflip.split("|");arrUpdate(p,k,a=>a.map(x=>x.id===id?{...x,[prop]:!x[prop]}:x))}
  else{const[p,k,id]=b.dataset.adel.split("|");arrUpdate(p,k,a=>a.filter(x=>x.id!==id))}});
document.addEventListener("change",async e=>{const t=e.target;
  if(t.dataset.setf){if(noDb())return;const[p,k]=t.dataset.setf.split("|");const v=t.type==="number"||t.type==="range"?+t.value:t.value;try{await db.doc(p).update({[k]:v,updatedAt:nowISO()})}catch(err){fail(err)}}
  if(t.dataset.aset){const[p,k,id,prop]=t.dataset.aset.split("|");const v=t.type==="number"?(t.value===""?null:+t.value):t.value;arrUpdate(p,k,a=>a.map(x=>x.id===id?{...x,[prop]:v}:x))}});
// Reflections: one text per key (e.g. habits_2026-10-04)
function syncRefl(id,key){const ta=$(id);if(ta.dataset.key!==key||document.activeElement!==ta){ta.dataset.key=key;ta.value=(LF.reflections.find(r=>r.id===key)||{}).text||""}}
document.addEventListener("click",async e=>{const b=e.target.closest("button[data-refl]");if(!b||noDb())return;const ta=$(b.dataset.refl),key=ta.dataset.key;if(!key)return;
  try{await db.doc("reflections/"+key).set({text:ta.value.trim().slice(0,5000),updatedAt:nowISO()});toast("Saved")}catch(err){fail(err)}});
// Navigation shortcuts: data-goto (from the ledger) plus data-pgo (open a day in the planner)
document.addEventListener("click",e=>{const b=e.target.closest("[data-pgo]");if(!b)return;openDay(b.dataset.pgo)});
function openDay(d){state.pday=d;state.pmonth={y:+d.slice(0,4),m:+d.slice(5,7)-1};state.pweek=weekStartOf(d);setTab("planner")}
function fillAreaSelects(){document.querySelectorAll("select.areaSel").forEach(s=>fillSelect(s,areaOpts()))}
// Shrink a picked photo to a small JPEG so it fits in the planner's storage.
function readImage(file,max=640){return new Promise((ok,no)=>{if(!file)return ok("");if(!/^image\//.test(file.type))return no(new Error("Pick an image file (JPG or PNG)."));
  const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");
    c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);ok(c.toDataURL("image/jpeg",.72))};
    im.onerror=()=>no(new Error("That image couldn't be read. Try a JPG or PNG."));im.src=r.result};r.onerror=()=>no(new Error("That file couldn't be read."));r.readAsDataURL(file)})}
function previewOn(input,box){input.addEventListener("change",async()=>{try{const u=await readImage(input.files[0],240);$(box).innerHTML=u?`<img src="${esc(u)}" alt="Selected image preview">`:""}catch(err){toast(err.message)}})}

// ================= Planner =================
const tasksOn=d=>LF.tasks.filter(t=>t.date===d&&!t.weekly).sort((a,b)=>(a.start||"99").localeCompare(b.start||"99")||(PRI[b.priority]||0)-(PRI[a.priority]||0));
const lessonItems=d=>sessions(d,d).map(x=>({time:x.time,name:x.s.name,min:x.minutes,sched:true}))
  .concat(state.lessons.filter(l=>l.date===d&&held(l)).map(l=>({time:l.time||"",name:(studentById(l.studentId)||{}).name||"Lesson",min:l.minutes})));
function taskRow(t,o={}){const late=!t.done&&t.date&&t.date<todayISO()&&!t.weekly,key="tasks/"+t.id;
  return `<div class="trow ${t.done?"done":""} ${late?"late":""}"><button class="tick" data-flip="${esc(key)}|done" aria-pressed="${!!t.done}" aria-label="${t.done?"Mark not done":"Mark done"}: ${esc(t.title)}"></button>
    <span class="tm">${t.start?fmtTime(t.start)+(t.end?"–"+fmtTime(t.end):""):(t.kind==="event"?"All day":t.weekly?"This week":"Any time")}${o.date&&t.date?"<br>"+esc(dayMon(t.date)):""}</span>
    <span class="who"><strong>${esc(t.title)}</strong><span>${t.kind==="event"?"Event · ":""}${t.area?chip(t.area):""}${t.location?" · "+esc(t.location):""}${t.notes?" · "+esc(t.notes):""}</span></span>
    ${priTag(t.priority)}<span class="acts"><button class="ghost" data-dedit="${esc(key)}" data-form="taskForm" data-tab="planner">Edit</button>${rmBtn(key)}</span></div>`}
const lessonRow=x=>`<div class="trow"><span class="tick dot" aria-hidden="true"></span><span class="tm">${x.time?fmtTime(x.time):"Lesson"}</span><span class="who"><strong>Lesson · ${esc(x.name)}</strong><span>${x.min||60} min · ${x.sched?"scheduled":"logged"} · from Tutoring</span></span><span></span><span></span></div>`;
function renderPlanner(){
  const{y,m}=state.pmonth,t=todayISO(),sel=state.pday;
  $("pMonthLbl").textContent=monthLbl(y,m);
  const first=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate();let c=DAYS.map(x=>`<span class="dn">${x}</span>`).join("")+"<span></span>".repeat(first);
  for(let i=1;i<=dim;i++){const d=iso(y,m+1,i),ts=tasksOn(d),ls=lessonItems(d).length;
    c+=`<button type="button" class="cday ${d===t?"today":""} ${d===sel?"sel":""} ${holidayOf(d)?"hol":""}" data-pday="${d}" aria-pressed="${d===sel}" aria-label="${esc(shortDate(d))}: ${ts.length+ls} item${ts.length+ls===1?"":"s"}"><b>${i}</b><span class="dots">${ts.slice(0,3).map(x=>`<i style="--c:${esc(areaOf(x.area).color)}"></i>`).join("")}${ls?'<i class="ls"></i>':""}</span></button>`}
  $("pCal").innerHTML=c;
  $("qaFor").textContent="Adds to "+(sel===t?"today":shortDate(sel));
  const items=tasksOn(sel).map(x=>({k:x.start||"99",h:taskRow(x)})).concat(lessonItems(sel).map(x=>({k:x.time||"98",h:lessonRow(x)}))).sort((a,b)=>a.k.localeCompare(b.k));
  const over=sel===t?LF.tasks.filter(x=>!x.done&&!x.weekly&&x.date&&x.date<t).sort((a,b)=>a.date.localeCompare(b.date)):[];
  $("pAgendaLbl").textContent=sel===t?"Today's agenda":shortDate(sel);
  $("pAgendaN").textContent=items.length?items.length+" item"+(items.length===1?"":"s"):"";
  $("pAgenda").innerHTML=(items.length?items.map(x=>x.h).join(""):`<div class="empty"><strong>Nothing planned</strong>Use Quick add, or + Add event or task below.</div>`)+(over.length?`<div class="sublbl">Carried over</div>`+over.map(x=>taskRow(x,{date:1})).join(""):"");
  const ws=state.pweek;$("pWeekLbl").textContent=dayMon(ws)+" – "+dayMon(addDays(ws,6));$("pwThis").hidden=ws===weekStartOf(t);
  const focus=LF.tasks.filter(x=>x.weekly&&x.date&&weekStartOf(x.date)===ws);
  $("pFocus").innerHTML=focus.length?focus.map(x=>taskRow(x)).join(""):`<div class="sub" style="padding:4px 20px 8px">Nothing yet. Tick "Weekly focus" when you add a task that has no set day.</div>`;
  $("pWeek").innerHTML=DAYS.map((dn,i)=>{const d=addDays(ws,i),ts=tasksOn(d),ls=lessonItems(d);
    return `<div class="day ${d===t?"today":""}"><button type="button" class="dh linkday" data-pday="${d}"><b>${dn}</b><span>${dayMon(d)}</span></button>${ls.map(x=>`<div class="ev plan"><span class="num">${x.time?fmtTime(x.time):"Lesson"}</span>${esc(x.name)}</div>`).join("")}${ts.map(x=>`<div class="ev ${x.done?"cx":""}" style="border-left-color:${esc(areaOf(x.area).color)}"><span class="num">${x.start?fmtTime(x.start):x.kind==="event"?"All day":"Task"}</span>${esc(x.title)}</div>`).join("")}${!ts.length&&!ls.length?`<div class="free">Free</div>`:""}</div>`}).join("");
}
document.addEventListener("click",e=>{const b=e.target.closest("button[data-pday]");if(!b)return;const d=b.dataset.pday;state.pday=d;state.pmonth={y:+d.slice(0,4),m:+d.slice(5,7)-1};
  const f=$("taskForm");if(!f.dataset.editing)f.date.value=d;renderPlanner();if(b.classList.contains("linkday"))$("pAgenda").scrollIntoView({behavior:"smooth",block:"center"})});
$("pPrev").onclick=()=>{let{y,m}=state.pmonth;m--;if(m<0){m=11;y--}state.pmonth={y,m};renderPlanner()};
$("pNext").onclick=()=>{let{y,m}=state.pmonth;m++;if(m>11){m=0;y++}state.pmonth={y,m};renderPlanner()};
$("pToday").onclick=()=>{const t=todayISO();state.pday=t;state.pmonth={y:+t.slice(0,4),m:+t.slice(5,7)-1};renderPlanner()};
$("pwPrev").onclick=()=>{state.pweek=addDays(state.pweek,-7);renderPlanner()};
$("pwNext").onclick=()=>{state.pweek=addDays(state.pweek,7);renderPlanner()};
$("pwThis").onclick=()=>{state.pweek=weekStartOf(todayISO());renderPlanner()};
PREP.taskForm=d=>{if(!d.title)throw new Error("Add a title.");if(d.start&&d.end&&d.end<d.start)throw new Error("The end time is before the start time.")};
document.addEventListener("submit",async e=>{if(e.target.id!=="qaForm")return;e.preventDefault();if(noDb())return;const text=$("qaText").value.trim();if(!text)return;
  const k=(e.submitter&&e.submitter.value)||"task",c=nowISO();
  try{if(k==="habit")await db.collection("habits").add({name:text.slice(0,60),area:"growth",freq:"daily",perWeek:3,start:todayISO(),createdAt:c});
    else if(k==="note")await db.collection("notes").add({title:text.slice(0,100),body:"",category:"Quick",tags:"",checklist:[],pinned:false,draft:false,createdAt:c,updatedAt:c});
    else await db.collection("tasks").add({kind:k,title:text.slice(0,120),date:state.pday,start:"",end:"",area:"",priority:"medium",reminder:"",createdAt:c});
    $("qaText").value="";toast({task:"Task",event:"Event",habit:"Habit",note:"Note"}[k]+" added"+(k==="task"||k==="event"?" for "+shortDate(state.pday):""))}catch(err){fail(err)}});

// ================= Habits =================
const habitsSorted=()=>LF.habits.slice().sort((a,b)=>(b.key?1:0)-(a.key?1:0)||(a.createdAt||"").localeCompare(b.createdAt||""));
const hlogSet=hid=>new Set(LF.habit_log.filter(x=>x.habitId===hid).map(x=>x.date));
async function toggleHabit(hid,d){if(noDb())return;const id=hid+"_"+d,has=LF.habit_log.some(x=>x.id===id);
  try{if(has)await db.doc("habit_log/"+id).delete();else await db.doc("habit_log/"+id).set({habitId:hid,date:d,createdAt:nowISO()})}catch(err){fail(err)}}
document.addEventListener("click",e=>{const b=e.target.closest("button[data-hcheck]");if(!b)return;const[h,d]=b.dataset.hcheck.split("|");
  if(d>todayISO())return toast("That day hasn't happened yet.");state.pop='[data-hcheck="'+b.dataset.hcheck+'"]';toggleHabit(h,d)});
function renderHabits(){
  const t=todayISO(),ws=state.hweek,hs=habitsSorted();
  $("hWeekLbl").textContent=dayMon(ws)+" – "+dayMon(addDays(ws,6));$("hwThis").hidden=ws===weekStartOf(t);
  $("hGrid").innerHTML=hs.length?`<div class="hgrid"><span></span>${DAYS.map((dn,i)=>{const d=addDays(ws,i);return `<span class="hgh ${d===t?"cur":""}">${dn}<small>${+d.slice(8)}</small></span>`}).join("")}${hs.map(h=>{const set=hlogSet(h.id);
    return `<span class="hname" style="--c:${esc(areaOf(h.area).color)}"><i></i>${esc(h.name)}${h.key?' <span class="tag">Key</span>':""}</span>`+Array.from({length:7},(_,i)=>{const d=addDays(ws,i),on=set.has(d),off=d>t||(h.start&&d<h.start);
      return `<button type="button" class="hcell ${on?"on":""} ${habitDue(h,d)?"":"off"}" data-hcheck="${esc(h.id)}|${d}" aria-pressed="${on}" ${off?"disabled":""} aria-label="${esc(h.name)}, ${esc(shortDate(d))}">${on?"✓":""}</button>`}).join("")}).join("")}</div>`
    :`<div class="empty"><strong>No habits yet</strong>Add your first habit below. Small and daily works best.</div>`;
  $("hCards").innerHTML=hs.map(h=>{const st=habitStats(h,hlogSet(h.id),t),pct=st.monthTarget?Math.min(100,st.monthDone/st.monthTarget*100):0,key="habits/"+h.id;
    return `<article class="card"><div class="head"><div><h2>${esc(h.name)}</h2><div class="meta">${chip(h.area)} · ${esc(freqLabel(h))}${h.time?" · reminder "+esc(fmtTime(h.time)):""}</div></div><div class="acts"><button class="ghost" data-dedit="${esc(key)}" data-form="habitForm">Edit</button>${rmBtn(key,"Remove")}</div></div>
      ${h.cue?`<div class="meta">${esc(h.cue)}</div>`:""}
      <div class="streaks"><div><b class="num">${st.cur}</b><small>current streak (${st.unit})</small></div><div><b class="num">${st.best}</b><small>best streak</small></div><div><b class="num">${st.monthDone}/${st.monthTarget}</b><small>this month</small></div></div>
      <div class="track big"><span class="fill" style="width:${pct}%;background:${esc(areaOf(h.area).color)}"></span></div></article>`}).join("");
  fillSelect($("hSel"),hs.map(h=>`<option value="${esc(h.id)}">${esc(h.name)}</option>`).join(""));
  const h=hs.find(x=>x.id===$("hSel").value);
  if(!h)$("hLog").innerHTML=`<div class="empty">Add a habit to see its month here.</div>`;
  else{const set=hlogSet(h.id),y=+t.slice(0,4),m=+t.slice(5,7),first=new Date(y,m-1,1).getDay(),dim=new Date(y,m,0).getDate();
    let c=DAYS.map(x=>`<span class="dn">${x}</span>`).join("")+"<span></span>".repeat(first);
    for(let i=1;i<=dim;i++){const d=iso(y,m,i),on=set.has(d),miss=!on&&d<t&&habitDue(h,d)&&h.freq!=="weekly";c+=`<span class="${on?"on":miss?"miss":d>t||!habitDue(h,d)?"na":""} ${d===t?"today":""}" title="${esc(shortDate(d))}${on?": done":miss?": missed":""}">${i}</span>`}
    $("hLog").innerHTML=`<div class="sublbl">${esc(monthLbl(y,m-1))}</div><div class="mlog">${c}</div><div class="olegend pad" style="padding-top:0"><span style="--c:var(--accent)"><i></i>Done</span><span style="--c:var(--t-coral-ink)"><i></i>Missed</span></div>`}
  syncRefl("hRefl","habits_"+ws);$("hReflLbl").textContent="Week of "+dayMon(ws);
}
$("hSel").onchange=renderHabits;
$("hwPrev").onclick=()=>{state.hweek=addDays(state.hweek,-7);renderHabits()};
$("hwNext").onclick=()=>{state.hweek=addDays(state.hweek,7);renderHabits()};
$("hwThis").onclick=()=>{state.hweek=weekStartOf(todayISO());renderHabits()};
PREP.habitForm=d=>{if(!d.name)throw new Error("Name the habit.");d.perWeek=Math.max(1,Math.min(7,Math.round(d.perWeek||3)));if(!d.start)d.start=todayISO()};

// ================= Life goals =================
const GOAL_TEMPLATES=[
  {t:"Get in shape",area:"health",why:"Build a healthier, stronger me.",ms:["Work out 3 times a week for a month","Walk 8,000 steps a day","Run 5K comfortably"]},
  {t:"Advance my career",area:"career",why:"Grow professionally and learn new skills.",ms:["Finish a certificate course","Update my CV","Apply for a new role"]},
  {t:"Improve my finances",area:"finances",why:"Build savings and financial freedom.",ms:["Build a 3-month emergency fund","Pay off what I owe","Save 20% of every pay month"]},
  {t:"Read more books",area:"learning",why:"Learn something new every month.",ms:["Read one book a month","Keep a reading log"]},
  {t:"Strengthen my relationships",area:"relationships",why:"Deeper connections with the people I love.",ms:["Weekly family call","Monthly meetup with friends"]}];
function renderLGoals(){
  const t=todayISO();
  fillSelect($("lgArea"),`<option value="">All life areas</option>`+areaOpts());$("lgArea").value=state.lgArea;
  $("lgTpl").innerHTML=GOAL_TEMPLATES.map((x,i)=>`<div class="tplrow"><span class="who"><strong>${esc(x.t)}</strong><span>${esc(x.why)} · ${x.ms.length} milestones</span></span><button type="button" data-tpl="${i}">Use</button></div>`).join("");
  let gs=LF.life_goals.slice().sort((a,b)=>(PRI[b.priority]||0)-(PRI[a.priority]||0)||(a.target||"9").localeCompare(b.target||"9"));
  const F=state.lgF;gs=gs.filter(g=>F==="all"||(F==="draft"?g.draft:F==="reached"?lifeGoalProgress(g)>=100:!g.draft&&lifeGoalProgress(g)<100));
  if(state.lgArea)gs=gs.filter(g=>g.area===state.lgArea);
  $("lgCards").innerHTML=gs.length?gs.map(g=>{const p=lifeGoalProgress(g),key="life_goals/"+g.id,ms=g.milestones||[],st=g.steps||[],hs=(g.habitIds||[]).map(id=>LF.habits.find(h=>h.id===id)).filter(Boolean);
    const left=g.target?Math.round((parse(g.target)-parse(t))/864e5):null, free=LF.habits.filter(h=>!(g.habitIds||[]).includes(h.id));
    return `<article class="card lgoal" style="--c:${esc(areaOf(g.area).color)}">
      <div class="head"><div><h2>${esc(g.title)}${g.draft?' <span class="tag">Draft</span>':""}${p>=100?' <span class="tag">Reached</span>':""}</h2><div class="meta">${chip(g.area)} ${priTag(g.priority)}${g.target?" · by "+esc(monthYear(g.target))+(p<100?` · ${left>=0?left+" days left":"past target date"}`:""):""}</div></div>
        <div class="acts"><button class="ghost" data-dedit="${esc(key)}" data-form="lgoalForm">Edit</button>${rmBtn(key,"Remove")}</div></div>
      <div class="prow"><div class="track big"><span class="fill" style="width:${p}%;background:var(--c)"></span></div><b class="num">${p}%</b></div>
      ${ms.length?"":`<label class="rng">Progress<input type="range" min="0" max="100" step="5" value="${+g.progress||0}" data-setf="${esc(key)}|progress" aria-label="Progress for ${esc(g.title)}"></label>`}
      ${g.why?`<p class="why">${esc(g.why)}</p>`:""}
      <details class="sec" open><summary>Milestones <span>${ms.filter(x=>x.done).length} of ${ms.length}</span></summary>
        ${ms.map(x=>`<div class="ck ${x.done?"done":""}"><button class="tick" data-aflip="${esc(key)}|milestones|${esc(x.id)}|done" aria-pressed="${!!x.done}" aria-label="Milestone done: ${esc(x.t)}"></button><span>${esc(x.t)}</span><small>${x.date?esc(dayMon(x.date)):""}</small><button class="ghost icon" data-adel="${esc(key)}|milestones|${esc(x.id)}" aria-label="Remove milestone">×</button></div>`).join("")}
        <form class="apush" data-doc="${esc(key)}" data-arr="milestones"><input name="t" maxlength="80" required placeholder="Add a milestone" aria-label="New milestone"><input type="date" name="date" aria-label="Milestone date"><button>Add</button></form></details>
      <details class="sec"><summary>Action steps <span>${st.filter(x=>x.status==="done").length} of ${st.length}</span></summary>
        ${st.map(x=>`<div class="ck step ${x.status==="done"?"done":""}"><span>${esc(x.t)}</span><small>${x.date?esc(dayMon(x.date)):""}</small><select data-aset="${esc(key)}|steps|${esc(x.id)}|status" aria-label="Status of ${esc(x.t)}">${[["todo","To do"],["doing","In progress"],["ongoing","Ongoing"],["done","Done"]].map(([v,l])=>`<option value="${v}"${(x.status||"todo")===v?" selected":""}>${l}</option>`).join("")}</select><button class="ghost icon" data-adel="${esc(key)}|steps|${esc(x.id)}" aria-label="Remove step">×</button></div>`).join("")}
        <form class="apush" data-doc="${esc(key)}" data-arr="steps"><input name="t" maxlength="80" required placeholder="Add an action step" aria-label="New action step"><input type="date" name="date" aria-label="Due date"><input type="hidden" name="status" value="todo"><button>Add</button></form></details>
      <details class="sec"><summary>Supporting habits <span>${hs.length}</span></summary>
        ${hs.map(h=>{const set=hlogSet(h.id),ws=weekStartOf(t),n=Array.from({length:7},(_,i)=>set.has(addDays(ws,i))).filter(Boolean).length;return `<div class="ck step"><span>${esc(h.name)}</span><small>${n} this week</small><span></span><button class="ghost icon" data-unlink="${esc(key)}|${esc(h.id)}" aria-label="Unlink ${esc(h.name)}">×</button></div>`}).join("")}
        ${free.length?`<form class="linkh" data-doc="${esc(key)}"><select name="hid" aria-label="Habit to link">${free.map(h=>`<option value="${esc(h.id)}">${esc(h.name)}</option>`).join("")}</select><button>Link habit</button></form>`:`<p class="sub small">${LF.habits.length?"All your habits are linked.":"Add habits on the Habits page to link them here."}</p>`}</details>
      ${g.obstacles?`<details class="sec"><summary>Obstacles &amp; notes</summary><p class="why">${esc(g.obstacles)}</p></details>`:""}
    </article>`}).join("")
    :`<div class="list"><div class="empty"><strong>${LF.life_goals.length?"No goals match":"No goals yet"}</strong>Add a goal, or start from a template above.</div></div>`;
}
$("lgFilter").onclick=e=>{const b=e.target.closest("button");if(!b)return;state.lgF=b.dataset.f;[...$("lgFilter").children].forEach(x=>x.setAttribute("aria-pressed",x===b));renderLGoals()};
$("lgArea").onchange=e=>{state.lgArea=e.target.value;renderLGoals()};
document.addEventListener("click",e=>{const b=e.target.closest("button[data-tpl]");if(!b)return;const x=GOAL_TEMPLATES[+b.dataset.tpl],f=$("lgoalForm");
  openForm("lgoalForm");resetLForm(f);f.elements.title.value=x.t;f.area.value=areas().some(a=>a.id===x.area)?x.area:areas()[0].id;f.why.value=x.why;f.dataset.tpl=b.dataset.tpl;
  f.scrollIntoView({behavior:"smooth",block:"start"});f.elements.title.focus({preventScroll:true})});
PREP.lgoalForm=(d,f,sub,ed)=>{if(!d.title)throw new Error("Name your goal.");if(d.target&&d.start&&d.target<d.start)throw new Error("The target date is before the start date.");
  d.draft=!!(sub&&sub.value==="draft");d.progress=Math.max(0,Math.min(100,d.progress||0));
  if(!ed){const tp=f.dataset.tpl!==undefined?GOAL_TEMPLATES[+f.dataset.tpl]:null;d.milestones=tp?tp.ms.map(t=>({id:newId(),t,date:"",done:false})):[];d.steps=[];d.habitIds=[]}};
document.addEventListener("submit",async e=>{const f=e.target;if(!f.classList.contains("linkh"))return;e.preventDefault();if(noDb())return;const g=docAt(f.dataset.doc),hid=f.hid.value;if(!g||!hid)return;
  try{await db.doc(f.dataset.doc).update({habitIds:[...new Set([...(g.habitIds||[]),hid])]})}catch(err){fail(err)}});
document.addEventListener("click",async e=>{const b=e.target.closest("button[data-unlink]");if(!b||noDb())return;const[p,hid]=b.dataset.unlink.split("|"),g=docAt(p);if(!g)return;
  try{await db.doc(p).update({habitIds:(g.habitIds||[]).filter(x=>x!==hid)})}catch(err){fail(err)}});

// ================= Vision board =================
function renderVision(){
  const vs=LF.vision.slice().sort((a,b)=>(PRI[b.priority]||0)-(PRI[a.priority]||0)||(a.createdAt||"").localeCompare(b.createdAt||""));
  const card=v=>{const img=safeImg(v.img),key="vision/"+v.id;return `<figure class="vcard" style="--c:${esc(areaOf(v.area).color)}">${img?`<img src="${esc(img)}" alt="${esc(v.title)}">`:`<div class="vph">${esc(v.title)}</div>`}
    <figcaption><b>${esc(v.title)}${v.year?` <span class="sub">· ${esc(v.year)}</span>`:""}</b>${v.aff?`<span>“${esc(v.aff)}”</span>`:""}${v.notes?`<small class="sub">${esc(v.notes)}</small>`:""}<span class="acts"><button class="ghost" data-dedit="${esc(key)}" data-form="visionForm">Edit</button>${rmBtn(key,"Remove")}</span></figcaption></figure>`};
  if(!vs.length){$("vBoard").innerHTML=`<div class="empty"><strong>Your vision board is empty</strong>Add a card with a photo and an affirmation for each part of the life you want.</div>`;return}
  if(state.visView==="all"){$("vBoard").innerHTML=`<div class="pad vgrid">${vs.map(card).join("")}</div>`;return}
  const known=new Set(areas().map(a=>a.id)),groups=areas().map(a=>({a,its:vs.filter(v=>v.area===a.id)})),other=vs.filter(v=>!known.has(v.area));
  if(other.length)groups.push({a:{id:"",name:"Other",color:"var(--c5)"},its:other});
  $("vBoard").innerHTML=groups.map(({a,its})=>`<section class="vgroup" style="--c:${esc(a.color)}"><div class="vgh"><h3>${esc(a.name)}</h3><span>${its.length} card${its.length===1?"":"s"}</span>${a.id?`<button type="button" class="ghost" data-vadd="${esc(a.id)}">+ Add</button>`:""}</div>
    ${its.length?`<div class="vgrid">${its.map(card).join("")}</div>`:`<div class="vempty">Nothing here yet.</div>`}</section>`).join("");
}
$("vView").onclick=e=>{const b=e.target.closest("button");if(!b)return;state.visView=b.dataset.v;[...$("vView").children].forEach(x=>x.setAttribute("aria-pressed",x===b));renderVision()};
document.addEventListener("click",e=>{const b=e.target.closest("button[data-vadd]");if(!b)return;const f=$("visionForm");openForm("visionForm");resetLForm(f);f.area.value=b.dataset.vadd;f.scrollIntoView({behavior:"smooth",block:"start"});f.elements.title.focus({preventScroll:true})});
RESET_HOOK.visionForm=f=>{f.year.value=new Date().getFullYear();$("vRm").checked=false};
EDIT_HOOK.visionForm=d=>{const u=safeImg(d.img);$("vPrev").innerHTML=u?`<img src="${esc(u)}" alt="Current image">`:""};
PREP.visionForm=async(d,f,s,ed)=>{if(!d.title)throw new Error("Give the card a title.");const file=$("vImg").files[0];
  if(file)d.img=await readImage(file);else if($("vRm").checked||!ed)d.img=""};
previewOn($("vImg"),"vPrev");

// ================= Wellness =================
const MOODS=[["amazing","😄","Amazing"],["good","🙂","Good"],["okay","😐","Okay"],["tired","😴","Tired"],["low","😔","Low"],["stressed","😣","Stressed"]];
const DEFAULT_WCHECKS=[{id:"water",label:"Drink 8 glasses of water"},{id:"sleep",label:"Get quality sleep"},{id:"move",label:"Move my body"},{id:"meals",label:"Eat nutritious meals"},{id:"mind",label:"Mindfulness / quiet time"},{id:"screen",label:"Limit screen time"}];
const DEFAULT_WGOALS=[{id:"g1",label:"Exercise",field:"exercise",min:0,target:4},{id:"g2",label:"Sleep at least 7 hours",field:"sleep",min:7,target:7},{id:"g3",label:"Drink 8 glasses of water",field:"water",min:8,target:7}];
const wchecks=()=>(state.wcfg&&state.wcfg.checks)||DEFAULT_WCHECKS, wgoals=()=>(state.wcfg&&state.wcfg.goals)||DEFAULT_WGOALS;
const wlog=d=>LF.wellness.find(x=>x.id===d);
const saveWcfg=patch=>db.doc("config/wellness").set({checks:wchecks(),goals:wgoals(),...patch,updatedAt:nowISO()});
function renderWellness(){
  const d=state.wday,t=todayISO(),log=wlog(d)||{},f=$("wellForm"),ws=weekStartOf(d);
  $("wDate").value=d;$("wDate").max=t;
  if(f.dataset.for!==d||(!f.contains(document.activeElement)&&f.dataset.ver!==(log.updatedAt||""))){fillForm(f,log);f.dataset.for=d;f.dataset.ver=log.updatedAt||""}
  $("wSaved").textContent=log.updatedAt?"Saved "+new Date(log.updatedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):"Not logged yet";
  $("wMoods").innerHTML=MOODS.map(([v,e,l])=>`<button type="button" data-mood="${v}" aria-pressed="${log.mood===v}"><span aria-hidden="true">${e}</span>${l}</button>`).join("");
  $("wStrip").innerHTML=Array.from({length:7},(_,i)=>{const day=addDays(ws,i),w=wlog(day)||{},mo=MOODS.find(m=>m[0]===w.mood);
    return `<div class="${day===d?"cur":""}">${DAYS[i]}<b aria-label="${mo?mo[2]:"No mood"}">${mo?mo[1]:"·"}</b>${w.sleep!=null&&w.sleep!==""?esc(w.sleep)+" h":"–"}</div>`}).join("");
  $("wWeekLbl").textContent=dayMon(ws)+" – "+dayMon(addDays(ws,6));
  const cs=wchecks();
  $("wGrid").innerHTML=`<div class="hgrid"><span></span>${DAYS.map((dn,i)=>{const day=addDays(ws,i);return `<span class="hgh ${day===t?"cur":""}">${dn}<small>${+day.slice(8)}</small></span>`}).join("")}${cs.map(c=>`<span class="hname" style="--c:var(--c2)"><i></i>${esc(c.label)}</span>`+Array.from({length:7},(_,i)=>{const day=addDays(ws,i),on=!!((wlog(day)||{}).checks||{})[c.id];
    return `<button type="button" class="hcell ${on?"on":""}" data-wcheck="${day}|${esc(c.id)}" aria-pressed="${on}" ${day>t?"disabled":""} aria-label="${esc(c.label)}, ${esc(shortDate(day))}">${on?"✓":""}</button>`}).join("")).join("")}</div>`;
  $("wChecksEd").innerHTML=cs.map(c=>`<div class="ck step"><span>${esc(c.label)}</span><span></span><span></span><button class="ghost icon" data-wcdel="${esc(c.id)}" aria-label="Remove ${esc(c.label)}">×</button></div>`).join("")+`<form class="inl" id="wCheckForm"><input name="label" maxlength="40" required placeholder="Add a check, e.g. Stretch" aria-label="New checklist item"><button>Add</button></form>`;
  const logs=Array.from({length:7},(_,i)=>wlog(addDays(ws,i)));
  $("wGoals").innerHTML=wgoals().map(g=>{const n=logs.filter(l=>wellMet(g,l)).length,p=Math.min(100,n/(+g.target||7)*100);
    return `<div class="wgoal"><span>${esc(g.label)}</span><span class="track"><span class="fill" style="width:${p}%;background:var(--c2)"></span></span><b class="num">${n} / ${esc(g.target)}</b><button class="ghost icon" data-wgdel="${esc(g.id)}" aria-label="Remove goal ${esc(g.label)}">×</button></div>`}).join("")||`<div class="empty">No wellness goals yet.</div>`;
  syncRefl("wRefl","wellness_"+ws);$("wReflLbl").textContent="Week of "+dayMon(ws);
}
$("wDate").onchange=e=>{if(e.target.value){state.wday=e.target.value;renderWellness()}};
document.addEventListener("submit",async e=>{const f=e.target;
  if(f.id==="wellForm"){e.preventDefault();if(noDb())return;const d=formData(f);try{await upsert("wellness/"+state.wday,{...d,date:state.wday,updatedAt:nowISO()});toast("Wellness log saved")}catch(err){fail(err)}}
  else if(f.id==="wGoalForm"){e.preventDefault();if(noDb())return;const d=formData(f);if(!d.label)return;
    try{await saveWcfg({goals:wgoals().concat([{id:newId(),label:d.label.slice(0,40),field:d.field,min:d.min||0,target:Math.max(1,Math.min(7,Math.round(d.target||7)))}])});f.reset();toast("Goal added")}catch(err){fail(err)}}
  else if(f.id==="wCheckForm"){e.preventDefault();if(noDb())return;const l=f.label.value.trim();if(!l)return;try{await saveWcfg({checks:wchecks().concat([{id:newId(),label:l.slice(0,40)}])});toast("Added to your checklist")}catch(err){fail(err)}}});
document.addEventListener("click",async e=>{const b=e.target.closest("button[data-mood],button[data-wcheck],button[data-wgdel],button[data-wcdel],button[data-water]");if(!b||noDb())return;
  try{if(b.dataset.mood){const d=b.dataset.day||state.wday,cur=(wlog(d)||{}).mood;await upsert("wellness/"+d,{mood:cur===b.dataset.mood?"":b.dataset.mood,date:d,updatedAt:nowISO()})}
    else if(b.dataset.wcheck){const[d,id]=b.dataset.wcheck.split("|"),ch={...((wlog(d)||{}).checks||{})};ch[id]=!ch[id];state.pop='[data-wcheck="'+b.dataset.wcheck+'"]';await upsert("wellness/"+d,{checks:ch,date:d,updatedAt:nowISO()})}
    else if(b.dataset.water){const d=todayISO(),w=Math.max(0,(+(wlog(d)||{}).water||0)+ +b.dataset.water);await upsert("wellness/"+d,{water:w,date:d,updatedAt:nowISO()})}
    else if(b.dataset.wgdel)await saveWcfg({goals:wgoals().filter(g=>g.id!==b.dataset.wgdel)});
    else await saveWcfg({checks:wchecks().filter(c=>c.id!==b.dataset.wcdel)})}catch(err){fail(err)}});

// ================= Journal =================
const PROMPTS=["What made you smile today?","What is one thing you learned about yourself this week?","Who helped you recently, and how?","What would make tomorrow a good day?",
  "What are you avoiding, and why?","Describe a small win from today.","What drained your energy today? What gave you energy?","What do you want to remember about this season of your life?",
  "If today had a title, what would it be?","What is one thing you can let go of?"];
const jtags=j=>String(j.tags||"").split(",").map(x=>x.trim()).filter(Boolean);
function renderJournal(){
  const d=state.jday,j=LF.journal.find(x=>x.id===d)||{},f=$("journalForm");
  $("jDate").value=d;$("jDate").max=todayISO();
  if(f.dataset.for!==d||(!f.contains(document.activeElement)&&f.dataset.ver!==(j.updatedAt||""))){fillForm(f,j);f.dataset.for=d;f.dataset.ver=j.updatedAt||"";$("jDate").value=d}
  const all=LF.journal.slice().sort((a,b)=>b.id.localeCompare(a.id)),tags=[...new Set(all.flatMap(jtags))].sort();
  $("jTags").innerHTML=tags.length?[["","All"]].concat(tags.map(x=>[x,x])).map(([v,l])=>`<button type="button" data-jtag="${esc(v)}" aria-pressed="${state.jtag===v}">${esc(l)}</button>`).join(""):"";
  const list=all.filter(x=>!state.jtag||jtags(x).includes(state.jtag));
  $("jCount").textContent=all.length+" entr"+(all.length===1?"y":"ies");
  $("jList").innerHTML=list.length?list.slice(0,40).map(x=>{const mo=MOODS.find(m=>m[0]===(wlog(x.id)||{}).mood);
    return `<button type="button" class="jrow ${x.id===d?"on":""}" data-jopen="${esc(x.id)}"><strong>${mo?mo[1]+" ":""}${esc(x.title||"Untitled entry")}</strong><span>${esc(shortDate(x.id))} · ${esc((x.highlight||x.thoughts||"").slice(0,90))}</span>${jtags(x).length?`<span class="tags">${jtags(x).map(t=>`<i>${esc(t)}</i>`).join("")}</span>`:""}</button>`}).join("")
    :`<div class="empty">No entries yet. Today's page is waiting on the left.</div>`;
}
$("jDate").onchange=e=>{if(e.target.value){state.jday=e.target.value;renderJournal()}};
$("jPromptBtn").onclick=()=>{const p=PROMPTS[(PROMPTS.indexOf($("jPrompt").textContent)+1)%PROMPTS.length];$("jPrompt").textContent=p;$("jThoughts").placeholder=p;$("jThoughts").focus()};
document.addEventListener("click",e=>{const b=e.target.closest("button[data-jopen],button[data-jtag]");if(!b)return;
  if(b.dataset.jopen!==undefined){state.jday=b.dataset.jopen;renderJournal();$("journalForm").scrollIntoView({behavior:"smooth",block:"start"})}else{state.jtag=b.dataset.jtag;renderJournal()}});
document.addEventListener("submit",async e=>{if(e.target.id!=="journalForm")return;e.preventDefault();if(noDb())return;const d=formData(e.target);
  if(!Object.values(d).some(Boolean))return toast("Write something first.");
  try{await upsert("journal/"+state.jday,{...d,date:state.jday,updatedAt:nowISO()});toast("Journal entry saved")}catch(err){fail(err)}});

// ================= Travel =================
const PACK_DEFAULT=["Passport / ID","Phone & charger","Travel insurance","Medication","Clothes & shoes","Toiletries","Sunglasses","Cash & cards"];
function renderTravel(){
  const t=todayISO(),ts=LF.trips.slice().sort((a,b)=>{const ua=a.end>=t,ub=b.end>=t;return ua!==ub?(ua?-1:1):ua?a.start.localeCompare(b.start):b.start.localeCompare(a.start)});
  if(!ts.some(x=>x.id===state.trip))state.trip=(ts[0]||{}).id||null;
  $("tCards").innerHTML=ts.length?ts.map(x=>{const img=safeImg(x.img),days=Math.round((parse(x.start)-parse(t))/864e5),spent=sum((x.budgetLines||[]).map(l=>({amount:l.actual})));
    return `<button type="button" class="tcard" data-trip="${esc(x.id)}" aria-pressed="${x.id===state.trip}">${img?`<img src="${esc(img)}" alt="">`:`<div class="vph" style="--c:var(--c1)">${esc(x.dest)}</div>`}
      <span class="tc"><strong>${esc(x.dest)}</strong><span>${esc(dayMon(x.start))} – ${esc(dayMon(x.end))} · ${esc(x.type||"Trip")}</span><span>${days>0?"In "+days+" day"+(days===1?"":"s"):x.end>=t?"Happening now":"Past trip"}${+x.budget?" · "+money(spent)+" of "+money(x.budget)+" SAR":""}</span></span></button>`}).join("")
    :`<div class="list"><div class="empty"><strong>No trips yet</strong>Tap + Plan a trip to start your first itinerary.</div></div>`;
  const x=ts.find(v=>v.id===state.trip);$("tNotesBox").hidden=!x;
  if(!x){$("tDetail").innerHTML="";return}
  const key="trips/"+x.id,it=(x.itinerary||[]).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")),pk=x.packing||[],bl=x.budgetLines||[];
  const plan=sum(bl.map(l=>({amount:l.planned}))),act=sum(bl.map(l=>({amount:l.actual})));
  $("tDetail").innerHTML=`<div class="list"><div class="cap"><h3>${esc(x.dest)}</h3><span class="acts"><button class="ghost" data-dedit="${esc(key)}" data-form="tripForm">Edit trip</button>${rmBtn(key,"Delete trip")}</span></div>
    <div class="pad meta">${esc(shortDate(x.start))} – ${esc(shortDate(x.end))} · ${Math.round((parse(x.end)-parse(x.start))/864e5)+1} days · ${esc(x.type||"")}${x.who?" · with "+esc(x.who):""}${+x.budget?" · budget "+money(x.budget)+" SAR":""}</div></div>
   <div class="tdet">
    <div class="list"><div class="cap"><h3>Day-by-day itinerary</h3><span>${it.length} plan${it.length===1?"":"s"}</span></div><div class="tsc"><table class="ttab"><thead><tr><th>Date</th><th>Where</th><th>Plans</th><th></th></tr></thead><tbody>
      ${it.map(r=>`<tr><td>${r.date?esc(dayMon(r.date)):"–"}</td><td>${esc(r.loc||"")}</td><td>${esc(r.plan||"")}</td><td><button class="ghost icon" data-adel="${esc(key)}|itinerary|${esc(r.id)}" aria-label="Remove">×</button></td></tr>`).join("")||`<tr><td colspan="4" class="sub">Add your first day below.</td></tr>`}</tbody></table></div>
      <form class="pad apush" data-doc="${esc(key)}" data-arr="itinerary"><input type="date" name="date" min="${esc(x.start)}" max="${esc(x.end)}" aria-label="Day"><input name="loc" maxlength="40" placeholder="Where" aria-label="Location"><input name="plan" maxlength="120" required placeholder="Plans / activities" aria-label="Plans"><button>Add</button></form></div>
    <div class="list"><div class="cap"><h3>Packing checklist</h3><span>${pk.filter(p=>p.done).length} of ${pk.length} packed</span></div><div class="pad">
      ${pk.map(p=>`<div class="ck ${p.done?"done":""}"><button class="tick" data-aflip="${esc(key)}|packing|${esc(p.id)}|done" aria-pressed="${!!p.done}" aria-label="Packed: ${esc(p.t)}"></button><span>${esc(p.t)}</span><small></small><button class="ghost icon" data-adel="${esc(key)}|packing|${esc(p.id)}" aria-label="Remove">×</button></div>`).join("")}
      ${pk.length?"":`<button type="button" data-packdef="${esc(key)}">Add a basic packing list</button>`}
      <form class="apush" data-doc="${esc(key)}" data-arr="packing"><input name="t" maxlength="60" required placeholder="Add an item" aria-label="New packing item"><button>Add</button></form></div></div>
    <div class="list"><div class="cap"><h3>Travel budget</h3><span>${money(act)} of ${money(plan)} SAR spent</span></div><div class="tsc"><table class="ttab"><thead><tr><th>Category</th><th class="num">Planned</th><th class="num">Actual</th><th></th></tr></thead><tbody>
      ${bl.map(l=>`<tr><td>${esc(l.cat)}</td><td class="num">${money(l.planned)}</td><td class="num"><input type="number" min="0" step="any" value="${l.actual??""}" data-aset="${esc(key)}|budgetLines|${esc(l.id)}|actual" aria-label="Actual for ${esc(l.cat)}"></td><td><button class="ghost icon" data-adel="${esc(key)}|budgetLines|${esc(l.id)}" aria-label="Remove">×</button></td></tr>`).join("")}
      <tr><th>Total</th><th class="num">${money(plan)}</th><th class="num">${money(act)}</th><th></th></tr></tbody></table></div>
      <form class="pad apush" data-doc="${esc(key)}" data-arr="budgetLines"><input name="cat" maxlength="30" required placeholder="Flights, hotel, food…" aria-label="Category"><input type="number" name="planned" min="0" step="any" placeholder="Planned" aria-label="Planned"><input type="number" name="actual" min="0" step="any" placeholder="Actual" aria-label="Actual"><button>Add</button></form></div>
   </div>`;
  const ta=$("tNotes");if(ta.dataset.key!==x.id||document.activeElement!==ta){ta.dataset.key=x.id;ta.value=x.notes||""}
}
document.addEventListener("click",async e=>{const b=e.target.closest("button[data-trip],button[data-packdef]");if(!b)return;
  if(b.dataset.trip){state.trip=b.dataset.trip;renderTravel();return}
  arrUpdate(b.dataset.packdef,"packing",a=>a.concat(PACK_DEFAULT.map(t=>({id:newId(),t,done:false}))))});
$("tNotesSave").onclick=async()=>{if(noDb()||!state.trip)return;try{await db.doc("trips/"+state.trip).update({notes:$("tNotes").value.trim().slice(0,3000)});toast("Trip notes saved")}catch(err){fail(err)}};
PREP.tripForm=async(d,f,s,ed)=>{if(!d.dest)throw new Error("Add a destination.");if(d.end<d.start)throw new Error("The trip ends before it starts.");
  const file=$("tImg").files[0];if(file)d.img=await readImage(file);else if(!ed)d.img="";if(!ed){d.itinerary=[];d.packing=[];d.budgetLines=[]}};
previewOn($("tImg"),"tPrev");

// ================= Learning =================
const learnName=id=>(LF.learning.find(x=>x.id===id)||{}).title||"";
function renderLearning(){
  const t=todayISO(),ws=weekStartOf(t),items=LF.learning.slice().sort((a,b)=>(a.progress>=100)-(b.progress>=100)||(a.target||"9").localeCompare(b.target||"9"));
  document.querySelectorAll("select.learnSel").forEach(s=>fillSelect(s,`<option value="">General</option>`+items.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}</option>`).join("")));
  const wk=LF.study.filter(s=>s.done&&s.date>=ws&&s.date<=addDays(ws,6)),mins=sum(wk.map(s=>({amount:s.minutes})));
  $("lStats").innerHTML=`<div class="stat"><small>Learning items</small><b>${items.length}</b></div><div class="stat"><small>Finished</small><b>${items.filter(x=>+x.progress>=100).length}</b></div>
    <div class="stat"><small>Studied this week</small><b>${fmt(mins/60)} h</b></div><div class="stat"><small>Assignments open</small><b>${LF.assignments.filter(a=>a.status!=="done").length}</b></div>`;
  $("lCount").textContent=items.length+" item"+(items.length===1?"":"s");
  $("lItems").innerHTML=items.length?items.map(x=>{const key="learning/"+x.id,p=Math.max(0,Math.min(100,+x.progress||0));
    return `<div class="lrow2"><span class="who"><strong>${esc(x.title)}</strong><span>${esc(x.type||"")}${x.cat?" · "+esc(x.cat):""}${x.goal?" · "+esc(x.goal):""}</span></span>
      <label class="rng"><input type="range" min="0" max="100" step="5" value="${p}" data-setf="${esc(key)}|progress" aria-label="Progress for ${esc(x.title)}"><b class="num">${p}%</b></label>
      <span class="sub">${x.target?"by "+esc(dayMon(x.target)):""}</span><span class="acts"><button class="ghost" data-dedit="${esc(key)}" data-form="learnForm">Edit</button>${rmBtn(key)}</span></div>`}).join("")
    :`<div class="empty"><strong>Nothing here yet</strong>Add a course, book or skill you're working on.</div>`;
  const ss=LF.study.slice().sort((a,b)=>(a.done-b.done)||(a.date+(a.start||"")).localeCompare(b.date+(b.start||""))).filter(s=>!s.done||s.date>=addDays(t,-14));
  $("lStudyN").textContent=fmt(mins/60)+" h done this week";
  $("lStudy").innerHTML=ss.map(s=>taskLike(s,"study",`${s.minutes||0} min${s.item?" · "+esc(learnName(s.item)):""}${s.focus?" · "+esc(s.focus):""}`,s.focus||learnName(s.item)||"Study session",s.start)).join("")||`<div class="empty">No study sessions planned.</div>`;
  const as=LF.assignments.slice().sort((a,b)=>(a.status==="done")-(b.status==="done")||(a.due||"9").localeCompare(b.due||"9"));
  $("lAssignN").textContent=as.filter(a=>a.status!=="done").length+" open";
  $("lAssign").innerHTML=as.map(a=>{const key="assignments/"+a.id,late=a.status!=="done"&&a.due&&a.due<t;
    return `<div class="trow ${a.status==="done"?"done":""} ${late?"late":""}"><span></span><span class="tm">${a.due?esc(dayMon(a.due)):"No date"}</span><span class="who"><strong>${esc(a.title)}</strong><span>${esc(learnName(a.item)||"General")}</span></span>
      <select data-setf="${esc(key)}|status" aria-label="Status of ${esc(a.title)}" style="width:auto">${[["pending","Pending"],["doing","In progress"],["done","Done"]].map(([v,l])=>`<option value="${v}"${a.status===v?" selected":""}>${l}</option>`).join("")}</select><span class="acts">${rmBtn(key)}</span></div>`}).join("")||`<div class="empty">No assignments.</div>`;
}
const taskLike=(s,col,sub,title,time)=>{const key=col+"/"+s.id;return `<div class="trow ${s.done?"done":""}"><button class="tick" data-flip="${esc(key)}|done" aria-pressed="${!!s.done}" aria-label="Done: ${esc(title)}"></button><span class="tm">${esc(dayMon(s.date))}${time?"<br>"+fmtTime(time):""}</span><span class="who"><strong>${esc(title)}</strong><span>${sub}</span></span><span></span><span class="acts">${rmBtn(key)}</span></div>`};
PREP.learnForm=d=>{if(!d.title)throw new Error("Add a name.");d.progress=Math.max(0,Math.min(100,d.progress||0))};
PREP.studyForm=d=>{if(!d.date)throw new Error("Pick a date.");d.done=false};
PREP.assignForm=d=>{if(!d.title)throw new Error("Name the assignment.")};

// ================= Notes =================
const NOTE_OK=new Set(["B","STRONG","I","EM","U","UL","OL","LI","P","BR","DIV","BLOCKQUOTE","H3","A","SPAN"]);
// Keep only simple formatting tags; links must be http(s). Everything else is unwrapped or dropped.
function cleanHtml(html){const doc=new DOMParser().parseFromString("<div>"+html+"</div>","text/html"),root=doc.body.firstChild;
  const walk=n=>{for(const c of [...n.childNodes]){if(c.nodeType===3)continue;if(c.nodeType!==1){c.remove();continue}
    if(!NOTE_OK.has(c.tagName)){if(["SCRIPT","STYLE","IFRAME","OBJECT","EMBED","SVG","MATH","TEMPLATE"].includes(c.tagName.toUpperCase()))c.remove();else{walk(c);c.replaceWith(...c.childNodes)}continue}
    for(const a of [...c.attributes])if(!(c.tagName==="A"&&a.name==="href"&&/^https?:\/\//i.test(a.value)))c.removeAttribute(a.name);
    if(c.tagName==="A"){c.setAttribute("target","_blank");c.setAttribute("rel","noopener")}walk(c)}};
  walk(root);return root.innerHTML.slice(0,150000)}
function noteWords(){const n=($("nBody").innerText||"").trim().split(/\s+/).filter(Boolean).length;$("nWords").textContent=n+" word"+(n===1?"":"s")}
function openNote(n){state.noteId=n?n.id:null;$("nTitle").value=n?n.title||"":"";$("nCat").value=n&&n.category?n.category:"Personal";$("nTags").value=n?n.tags||"":"";
  $("nBody").innerHTML=n?cleanHtml(n.body||""):"";state.noteChecks=n?(n.checklist||[]).map(x=>({...x})):[];state.notePinned=!!(n&&n.pinned);
  $("nDel").hidden=!n;noteWords();renderNoteChecks();renderNotes()}
function renderNoteChecks(){$("nChecks").innerHTML=state.noteChecks.map((c,i)=>`<div class="ck ${c.done?"done":""}"><button class="tick" data-nck="${i}" aria-pressed="${!!c.done}" aria-label="Done: ${esc(c.t)}"></button><span>${esc(c.t)}</span><small></small><button class="ghost icon" data-nckdel="${i}" aria-label="Remove">×</button></div>`).join("");
  $("nPin").setAttribute("aria-pressed",state.notePinned);$("nPin").textContent=state.notePinned?"Pinned":"Pin"}
function renderNotes(){
  const q=state.noteQ.toLowerCase(),cats=[...new Set(LF.notes.map(n=>n.category||"Other"))].sort();
  $("nCats").innerHTML=[["","All"]].concat(cats.map(c=>[c,c])).map(([v,l])=>`<button type="button" data-ncat="${esc(v)}" aria-pressed="${state.noteCat===v}">${esc(l)}</button>`).join("");
  const ns=LF.notes.filter(n=>(!state.noteCat||(n.category||"Other")===state.noteCat)&&(!q||[n.title,n.tags,plainText(n.body),(n.checklist||[]).map(c=>c.t).join(" ")].join(" ").toLowerCase().includes(q)))
    .sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||(b.updatedAt||b.createdAt||"").localeCompare(a.updatedAt||a.createdAt||""));
  $("nList").innerHTML=ns.length?ns.map(n=>`<button type="button" class="nrow ${n.id===state.noteId?"on":""}" data-nopen="${esc(n.id)}"><strong>${n.pinned?"📌 ":""}${esc(n.title||"Untitled")}${n.draft?' <span class="tag">Draft</span>':""}</strong><span>${esc(n.category||"Other")} · ${esc(dayMon(dayOf(n.updatedAt||n.createdAt)||todayISO()))} · ${esc(plainText(n.body).slice(0,80)||((n.checklist||[]).length?(n.checklist.length+" checklist items"):"Empty"))}</span></button>`).join("")
    :`<div class="empty">${LF.notes.length?"No notes match.":"No notes yet. Write one on the right."}</div>`;
}
async function saveNote(draft){if(noDb())return;const d={title:$("nTitle").value.trim().slice(0,100)||"Untitled",category:$("nCat").value,tags:$("nTags").value.trim().slice(0,100),
  body:cleanHtml($("nBody").innerHTML),checklist:state.noteChecks,pinned:state.notePinned,draft,updatedAt:nowISO()};
  try{if(state.noteId&&docAt("notes/"+state.noteId))await db.doc("notes/"+state.noteId).update(d);else{const r=await db.collection("notes").add({...d,createdAt:nowISO()});state.noteId=r.id;$("nDel").hidden=false}
    toast(draft?"Draft saved":"Note saved")}catch(err){fail(err)}}
$("nSave").onclick=()=>saveNote(false);$("nDraft").onclick=()=>saveNote(true);$("nNew").onclick=()=>{openNote(null);$("nTitle").focus()};
$("nPin").onclick=()=>{state.notePinned=!state.notePinned;renderNoteChecks()};
$("nDel").onclick=async()=>{if(!state.noteId)return;const key="notes/"+state.noteId;
  if(state.armed!==key){state.armed=key;$("nDel").textContent="Confirm delete";clearTimeout(state._arm);state._arm=setTimeout(()=>{state.armed=null;$("nDel").textContent="Delete"},3500);return}
  state.armed=null;$("nDel").textContent="Delete";if(noDb())return;try{await db.doc(key).delete();openNote(null);toast("Note deleted")}catch(err){fail(err)}};
$("nSearch").oninput=e=>{state.noteQ=e.target.value;renderNotes()};
$("nBody").addEventListener("input",noteWords);
$("nBody").addEventListener("paste",e=>{e.preventDefault();const t=(e.clipboardData||window.clipboardData).getData("text/plain");document.execCommand("insertText",false,t)});
document.querySelectorAll(".ntool [data-cmd]").forEach(b=>{b.onmousedown=e=>e.preventDefault();b.onclick=()=>{$("nBody").focus();document.execCommand(b.dataset.cmd,false,null);noteWords()}});
$("nBlock").onchange=e=>{$("nBody").focus();document.execCommand("formatBlock",false,e.target.value);e.target.value="p"};
let noteRange=null;
$("nLinkBtn").onmousedown=e=>{e.preventDefault();const s=getSelection();noteRange=s.rangeCount&&$("nBody").contains(s.anchorNode)?s.getRangeAt(0).cloneRange():null};
$("nLinkBtn").onclick=()=>{if(!noteRange||noteRange.collapsed)return toast("Select the words you want to link first.");$("nLinkRow").hidden=false;$("nLinkIn").focus()};
$("nLinkOk").onclick=()=>{const u=$("nLinkIn").value.trim();if(!/^https?:\/\/\S+$/i.test(u))return toast("Use a full web address starting with https://");
  $("nBody").focus();const s=getSelection();s.removeAllRanges();if(noteRange)s.addRange(noteRange);document.execCommand("createLink",false,u);$("nLinkRow").hidden=true;$("nLinkIn").value=""};
$("nCheckAdd").onclick=()=>{const v=$("nCheckIn").value.trim();if(!v)return;state.noteChecks.push({t:v.slice(0,100),done:false});$("nCheckIn").value="";renderNoteChecks()};
$("nCheckIn").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();$("nCheckAdd").click()}};
document.addEventListener("click",e=>{const b=e.target.closest("button[data-nopen],button[data-ncat],button[data-nck],button[data-nckdel]");if(!b)return;
  if(b.dataset.nopen){openNote(docAt("notes/"+b.dataset.nopen));if(innerWidth<1000)$("nTitle").scrollIntoView({behavior:"smooth",block:"start"})}
  else if(b.dataset.ncat!==undefined){state.noteCat=b.dataset.ncat;renderNotes()}
  else if(b.dataset.nck){const c=state.noteChecks[+b.dataset.nck];c.done=!c.done;renderNoteChecks()}
  else{state.noteChecks.splice(+b.dataset.nckdel,1);renderNoteChecks()}});

// ================= Settings =================
const THEME_KEY="theme";
function applyTheme(v){if(v==="light"||v==="dark")document.documentElement.dataset.theme=v;else delete document.documentElement.dataset.theme}
try{applyTheme(localStorage.getItem(THEME_KEY))}catch(e){}
function renderSettings(){
  const p=state.profile||{},f=$("profForm");
  if(!f.contains(document.activeElement)&&f.dataset.ver!==(p.updatedAt||"x")){fillForm(f,{name:p.name||"",bio:p.bio||"",checkin:p.checkin||"",remind:p.remind!==false});f.dataset.ver=p.updatedAt||"x"}
  let th="system";try{th=localStorage.getItem(THEME_KEY)||"system"}catch(e){}
  $("themeChips").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.themeset===th));
  $("sAreas").innerHTML=areas().map(a=>`<div class="arow" style="--c:${esc(a.color)}"><i></i><input value="${esc(a.name)}" maxlength="30" data-aname="${esc(a.id)}" aria-label="Name of ${esc(a.name)}"><select data-acolor="${esc(a.id)}" aria-label="Colour of ${esc(a.name)}">${SWATCHES.map(([v,l])=>`<option value="${v}"${a.color===v?" selected":""}>${l}</option>`).join("")}</select>${areas().length>1?rmAreaBtn(a):"<span></span>"}</div>`).join("");
}
const rmAreaBtn=a=>{const key="area:"+a.id;return `<button class="ghost del ${state.armed===key?"armed":""}" data-adelarea="${esc(a.id)}">${state.armed===key?"Confirm":"Remove"}</button>`};
const saveAreas=list=>db.doc("config/areas").set({list,updatedAt:nowISO()});
document.addEventListener("submit",async e=>{const f=e.target;
  if(f.id==="profForm"){e.preventDefault();if(noDb())return;const d=formData(f);try{await db.doc("config/profile").set({...(state.profile||{}),...d,updatedAt:nowISO()});toast("Profile saved")}catch(err){fail(err)}}
  else if(f.id==="areaForm"){e.preventDefault();if(noDb())return;const n=f.elements.name.value.trim();if(!n)return;const used=new Set(areas().map(a=>a.color));
    const color=(SWATCHES.find(([v])=>!used.has(v))||SWATCHES[areas().length%SWATCHES.length])[0];
    try{await saveAreas(areas().concat([{id:"a_"+newId(),name:n.slice(0,30),color}]));f.reset();toast(n+" added")}catch(err){fail(err)}}});
document.addEventListener("change",async e=>{const t=e.target;if(!t.dataset.aname&&!t.dataset.acolor)return;if(noDb())return;
  const id=t.dataset.aname||t.dataset.acolor,list=areas().map(a=>a.id!==id?a:{...a,...(t.dataset.aname?{name:t.value.trim().slice(0,30)||a.name}:{color:t.value})});
  try{await saveAreas(list);toast("Life areas updated")}catch(err){fail(err)}});
document.addEventListener("click",async e=>{const b=e.target.closest("button[data-themeset],button[data-adelarea]");if(!b)return;
  if(b.dataset.themeset){const v=b.dataset.themeset;try{localStorage.setItem(THEME_KEY,v)}catch(e){}applyTheme(v);renderSettings();return}
  const key="area:"+b.dataset.adelarea;if(state.armed!==key){state.armed=key;renderSettings();clearTimeout(state._arm);state._arm=setTimeout(()=>{state.armed=null;renderSettings()},3500);return}
  state.armed=null;if(noDb())return;try{await saveAreas(areas().filter(a=>a.id!==b.dataset.adelarea));toast("Area removed. Its items now show as Other.")}catch(err){fail(err)}});
$("sExcel").onclick=()=>{if($("exportBtn").hidden)return toast("Downloads aren't available in this view.");$("exportBtn").click()};
$("sPin").onclick=()=>$("lockBtn").click();
// Full backup: every collection and setting as one JSON file (the PIN is left out).
const MONEY_COLS={students:"students",lessons:"lessons",monthly:"monthly",expenses:"expenses",income:"income",recurring:"recurring",goals:"goals",goal_contributions:"contribs",debts:"debts",debt_moves:"dmoves"};
const CFG_KEYS={budget:()=>state.budget,holidays:()=>state.holidays?{list:state.holidays}:null,skills:()=>state.skills,areas:()=>state.areas?{list:state.areas}:null,profile:()=>state.profile,wellness:()=>state.wcfg};
$("sJson").onclick=async()=>{if(!downloads)return toast("Downloads aren't available in this view.");
  const out={app:"life-vision-planner",version:1,exported:nowISO(),collections:{},config:{}};
  for(const[c,k]of Object.entries(MONEY_COLS))out.collections[c]=state[k];for(const c of LIFE_COLS)out.collections[c]=LF[c];
  for(const[k,f]of Object.entries(CFG_KEYS)){const v=f();if(v)out.config[k]=v}
  try{await downloads.save({filename:"life-planner-backup-"+todayISO()+".json",data:new Blob([JSON.stringify(out,null,1)],{type:"application/json"})});toast("Backup saved")}
  catch(err){toast(err&&err.code==="declined"?"Download cancelled":"Couldn't create the file.")}};
let pendingImport=null;
const ID_OK=/^[A-Za-z0-9_\-.~:@+]{1,150}$/;
$("sImport").onchange=async e=>{const file=e.target.files[0];e.target.value="";if(!file)return;
  try{const j=JSON.parse(await file.text());if(!j||typeof j.collections!=="object")throw new Error("bad");
    const allowed=new Set([...Object.keys(MONEY_COLS),...LIFE_COLS]),docs=[];
    for(const[c,list]of Object.entries(j.collections)){if(!allowed.has(c)||!Array.isArray(list))continue;for(const d of list)if(d&&typeof d==="object"&&ID_OK.test(String(d.id||""))){const{id,...rest}=d;docs.push([c+"/"+id,rest])}}
    const cfg=Object.entries(j.config||{}).filter(([k,v])=>k in CFG_KEYS&&v&&typeof v==="object").map(([k,v])=>["config/"+k,v]);
    pendingImport=docs.concat(cfg);
    $("sImportMsg").innerHTML=`<div class="notice">This backup has <b>${docs.length}</b> items and <b>${cfg.length}</b> settings from ${esc(String(j.exported||"").slice(0,10)||"an unknown date")}. Items with the same id will be replaced; nothing is deleted. <div class="formActs" style="margin-top:8px"><button type="button" class="ghost" id="sImpNo">Cancel</button><button type="button" class="primary" id="sImpYes">Import</button></div></div>`}
  catch(err){pendingImport=null;$("sImportMsg").innerHTML=`<div class="notice">That file isn't a planner backup. Choose a .json file made with "Full backup".</div>`}};
document.addEventListener("click",async e=>{const b=e.target.closest("#sImpYes,#sImpNo");if(!b)return;if(b.id==="sImpNo"||!pendingImport){pendingImport=null;$("sImportMsg").innerHTML="";return}
  if(noDb())return;const list=pendingImport;pendingImport=null;let n=0;$("sImportMsg").innerHTML=`<div class="sub">Importing…</div>`;
  for(const[p,d]of list){try{await db.doc(p).set(d)}catch(err){if(err&&err.code==="resource_exhausted"){await new Promise(r=>setTimeout(r,1500));try{await db.doc(p).set(d)}catch(e2){continue}}else continue}n++;
    if(n%20===0)$("sImportMsg").innerHTML=`<div class="sub">Imported ${n} of ${list.length}…</div>`}
  $("sImportMsg").innerHTML=`<div class="sub">Imported ${n} of ${list.length} items.</div>`;toast("Import finished")});
$("sClear").onclick=async()=>{if($("sClearIn").value.trim()!=="CLEAR")return toast("Type CLEAR in the box to confirm.");if(noDb())return;
  $("sClear").disabled=true;let n=0;for(const c of LIFE_COLS)for(const d of LF[c].slice()){try{await db.doc(c+"/"+d.id).delete();n++}catch(err){}}
  $("sClear").disabled=false;$("sClearIn").value="";toast(n+" planner items deleted")};

// ================= Dashboard =================
function greet(){const h=new Date().getHours();return h<12?"Good morning":h<17?"Good afternoon":"Good evening"}
// Weekly habits only count as due today until the week's target is met (or if they were ticked today).
const habitsDueToday=()=>{const t=todayISO(),ws=weekStartOf(t);return habitsSorted().filter(h=>{if(!habitDue(h,t)||(h.start&&h.start>t))return false;if(h.freq!=="weekly")return true;
  const set=hlogSet(h.id);if(set.has(t))return true;let n=0;for(let i=0;i<7;i++)if(set.has(addDays(ws,i)))n++;return n<Math.max(1,+h.perWeek||1)})};
function renderHome(){
  const t=todayISO(),name=(state.profile&&state.profile.name)||"";
  $("pageTitle").textContent=greet()+(name?", "+name:"")+"!";
  $("pageSub").textContent="Here's your day, "+parse(t).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})+". Small steps add up.";
  // KPI cards
  const gs=LF.life_goals.filter(g=>!g.draft),reached=gs.filter(g=>lifeGoalProgress(g)>=100).length,avg=gs.length?Math.round(gs.reduce((a,g)=>a+lifeGoalProgress(g),0)/gs.length):0;
  const hd=habitsDueToday(),hdone=hd.filter(h=>LF.habit_log.some(x=>x.id===h.id+"_"+t)).length;
  const tt=tasksOn(t),tdone=tt.filter(x=>x.done).length;
  const kpi=(cls,ic,lbl,val,pct,note)=>`<div class="tint ${cls} kpi" style="flex-direction:column;align-items:stretch"><div class="krow"><span class="ti">${icon(ic)}</span><div style="display:flex;flex-direction:column"><span class="tl">${lbl}</span><span class="tv">${val}</span></div></div><div class="ometer"><i style="width:${pct}%"></i></div><span class="tn">${note}</span></div>`;
  $("hKpis").innerHTML=kpi("mint","i-target","Goals reached",`${reached} / ${gs.length}`,gs.length?reached/gs.length*100:0,gs.length?`${gs.length-reached} in progress`:"Set your first goal")
    +kpi("coral","i-check","Habits today",`${hdone} / ${hd.length}`,hd.length?hdone/hd.length*100:0,hd.length?(hd.length-hdone?`${hd.length-hdone} left today`:"All done today"):"No habits yet")
    +kpi("peach","i-cal","Tasks today",`${tdone} / ${tt.length}`,tt.length?tdone/tt.length*100:0,tt.length?(tt.length-tdone?`${tt.length-tdone} to go`:"Everything done"):"Nothing planned")
    +kpi("aqua","i-spark","Vision progress",`${avg}%`,avg,"Average across your active goals");
  // Top priorities: starred tasks (not done) and starred habits not yet ticked today
  const pr=LF.tasks.filter(x=>x.top&&(!x.done||x.doneOn===t)).sort((a,b)=>(a.done-b.done)||(PRI[b.priority]||0)-(PRI[a.priority]||0)||(a.date||"9").localeCompare(b.date||"9"))
    .map(x=>`<div class="prl ${x.done?"done":""}"><button class="tick" data-flip="tasks/${esc(x.id)}|done" aria-pressed="${!!x.done}" aria-label="Done: ${esc(x.title)}"></button><span>${esc(x.title)}${x.date&&x.date!==t?` <small class="sub">· ${esc(dayMon(x.date))}</small>`:""}</span>${priTag(x.priority)}</div>`)
    .concat(LF.habits.filter(h=>h.top&&habitDue(h,t)).map(h=>{const on=LF.habit_log.some(x=>x.id===h.id+"_"+t);return `<div class="prl ${on?"done":""}"><button class="tick" data-hcheck="${esc(h.id)}|${t}" aria-pressed="${on}" aria-label="Done today: ${esc(h.name)}"></button><span>${esc(h.name)} <small class="sub">· habit</small></span><span></span></div>`}));
  $("hPrio").innerHTML=pr.length?pr.slice(0,6).join(""):`<div class="oempty">No priorities yet. Add one below, or tick "Top priority" on a task.</div>`;
  // This week
  const ws=weekStartOf(t),we=addDays(ws,6),wk=LF.tasks.filter(x=>x.date&&x.date>=ws&&x.date<=we).sort((a,b)=>(a.done-b.done)||a.date.localeCompare(b.date));
  $("hWeek").innerHTML=oHead("This week",`<span class="osub">${esc(dayMon(ws))} – ${esc(dayMon(we))}</span>`)+(wk.length?wk.slice(0,7).map(x=>`<div class="prl ${x.done?"done":""}"><button class="tick" data-flip="tasks/${esc(x.id)}|done" aria-pressed="${!!x.done}" aria-label="Done: ${esc(x.title)}"></button><span>${esc(x.title)}</span><small class="sub">${x.weekly?"focus":esc(DAYS[parse(x.date).getDay()])}</small></div>`).join(""):oEmpty("Nothing planned this week yet."));
  // Month calendar
  {const y=+t.slice(0,4),m=+t.slice(5,7),first=new Date(y,m-1,1).getDay(),dim=new Date(y,m,0).getDate();
    let c=DAYS.map(x=>`<span class="dn">${x[0]}</span>`).join("")+"<span></span>".repeat(first);
    for(let i=1;i<=dim;i++){const d=iso(y,m,i),ts=tasksOn(d),dot=ts.length?areaOf(ts[0].area).color:lessonItems(d).length?"var(--ink)":"";
      c+=`<span class="${d===t?"today":""} ${holidayOf(d)?"hol":""}" data-pgo="${d}" role="button" tabindex="0" aria-label="${esc(shortDate(d))}"${dot?` data-d style="--c:${esc(dot)}"`:""}>${i}</span>`}
    $("hCal").innerHTML=oHead(esc(monthLbl(y,m-1)),`<button class="omini" data-goto="planner">Open</button>`)+`<div class="ocal">${c}</div>`}
  // Habits today
  $("hHabits").innerHTML=oHead("Today's habits",`<button class="omini" data-goto="habits">All habits</button>`)+(hd.length?hd.map(h=>{const on=LF.habit_log.some(x=>x.id===h.id+"_"+t),st=habitStats(h,hlogSet(h.id),t);
    return `<div class="prl ${on?"done":""}"><button class="tick" data-hcheck="${esc(h.id)}|${t}" aria-pressed="${on}" aria-label="Done today: ${esc(h.name)}"></button><span>${esc(h.name)}</span><small class="sub">${st.cur} ${st.unit==="weeks"?"wk":"day"} streak</small></div>`}).join(""):oEmpty("No habits due today. Add one on the Habits page."));
  // Today's agenda: tasks and lessons
  {const items=tasksOn(t).map(x=>({k:x.start||"99",h:taskRow(x)})).concat(lessonItems(t).map(x=>({k:x.time||"98",h:lessonRow(x)}))).sort((a,b)=>a.k.localeCompare(b.k));
    $("hToday").innerHTML=oHead("Today's agenda",`<button class="omini" data-goto="planner">Planner</button>`)+(items.length?items.slice(0,8).map(x=>x.h).join(""):oEmpty("A free day. Add something in the Planner if you like."))}
  // Life areas
  $("hAreas").innerHTML=oHead("Life areas",`<span class="osub">Average goal progress</span>`)+areas().map(a=>{const g=gs.filter(x=>x.area===a.id),p=g.length?Math.round(g.reduce((s,x)=>s+lifeGoalProgress(x),0)/g.length):0;
    return `<div class="areaBar" style="--c:${esc(a.color)}"><span><i></i>${esc(a.name)}</span><span class="track"><span class="fill" style="width:${p}%"></span></span><b>${g.length?p+"%":"–"}</b></div>`}).join("");
  // Vision
  const vs=LF.vision.slice(0,6);
  $("hVision").innerHTML=oHead("Vision "+new Date().getFullYear(),`<button class="omini" data-goto="vision">Vision board</button>`)+(vs.length?`<div class="vmini">${vs.map(v=>`<div style="--c:${esc(areaOf(v.area).color)}"><b>${esc(v.title)}</b><small>${esc(v.aff||areaOf(v.area).name)}</small></div>`).join("")}</div>`:oEmpty("Add cards to your vision board to see them here."));
  // Mood and water
  {const w=wlog(t)||{},water=+w.water||0,target=8;
    $("hMood").innerHTML=oHead("How are you today?")+`<div class="moods">${MOODS.slice(0,4).map(([v,e,l])=>`<button type="button" data-mood="${v}" data-day="${t}" aria-pressed="${w.mood===v}"><span aria-hidden="true">${e}</span>${l}</button>`).join("")}</div>
      <div class="water"><button type="button" class="ghost icon" data-water="-1" aria-label="One glass less">−</button><b class="num">${water}</b><button type="button" data-water="1" aria-label="One more glass of water">+1 glass</button><span class="glasses" aria-hidden="true">${Array.from({length:target},(_,i)=>`<i class="${i<water?"on":""}"></i>`).join("")}</span></div>`}
  // Money snapshot
  {const [ms,me]=payPeriodOf(t>LS()?t:LS()),bal=balanceBefore(ms)+moneyIn(ms,me)-moneyOut(ms,me),sp=sum(expensesIn(ms,me)),ow=owingList().reduce((a,x)=>a+x.amt,0);
    $("hMoney").innerHTML=oHead("Money",`<button class="omini" data-goto="finance">Finance</button>`)+`<div><span class="olbl">Free to spend this pay month</span><div class="big mid ${bal<0?"neg":""}"><s>SAR</s>${signed(bal)}</div></div>
      <div class="otwo"><div><span class="olbl">Spent</span><div class="big mid" style="font-size:1.2rem">${money(sp)}</div></div><div><span class="olbl">Owed to you</span><div class="big mid" style="font-size:1.2rem">${money(ow)}</div></div></div>`}
  // Quick notes list
  const qn=LF.notes.slice().sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||(b.updatedAt||"").localeCompare(a.updatedAt||"")).slice(0,3);
  $("hNotes").innerHTML=qn.map(n=>`<div class="prl"><span class="pnum" aria-hidden="true">✎</span><span><b style="font-weight:600">${esc(n.title||"Untitled")}</b> <small class="sub">${esc(plainText(n.body).slice(0,70))}</small></span><button class="omini" data-nopen-go="${esc(n.id)}">Open</button></div>`).join("");
}
document.addEventListener("keydown",e=>{const s=e.target.closest&&e.target.closest("[data-pgo]");if(s&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openDay(s.dataset.pgo)}});
document.addEventListener("submit",async e=>{if(e.target.id!=="hPrioForm")return;e.preventDefault();if(noDb())return;const v=$("hPrioIn").value.trim();if(!v)return;
  try{await db.collection("tasks").add({kind:"task",title:v.slice(0,120),date:todayISO(),start:"",end:"",area:"",priority:"high",top:true,reminder:"",createdAt:nowISO()});$("hPrioIn").value="";toast("Priority added")}catch(err){fail(err)}});
$("hNoteSave").onclick=async()=>{if(noDb())return;const v=$("hNoteIn").value.trim();if(!v)return;const c=nowISO();
  try{await db.collection("notes").add({title:v.split("\n")[0].slice(0,60),body:esc(v).replace(/\n/g,"<br>"),category:"Quick",tags:"",checklist:[],pinned:false,draft:false,createdAt:c,updatedAt:c});$("hNoteIn").value="";toast("Note saved")}catch(err){fail(err)}};
document.addEventListener("click",e=>{const b=e.target.closest("button[data-nopen-go]");if(!b)return;setTab("notes");openNote(docAt("notes/"+b.dataset.nopenGo))});

// ================= Header: search, reminders bell, avatar =================
function searchAll(q){q=q.toLowerCase();const out=[],has=(...s)=>s.some(x=>String(x||"").toLowerCase().includes(q));
  for(const x of LF.tasks)if(has(x.title,x.notes,x.location))out.push(["Task",x.title,x.date?shortDate(x.date):"",()=>x.date?openDay(x.date):setTab("planner")]);
  for(const x of LF.life_goals)if(has(x.title,x.why))out.push(["Goal",x.title,areaOf(x.area).name,()=>{state.lgF="all";setTab("lgoals")}]);
  for(const x of LF.habits)if(has(x.name,x.cue))out.push(["Habit",x.name,freqLabel(x),()=>setTab("habits")]);
  for(const x of LF.notes)if(has(x.title,x.tags,plainText(x.body)))out.push(["Note",x.title||"Untitled",x.category||"",()=>{setTab("notes");openNote(x)}]);
  for(const x of LF.journal)if(has(x.title,x.thoughts,x.highlight,x.tags))out.push(["Journal",x.title||"Entry",shortDate(x.id),()=>{state.jday=x.id;setTab("journal")}]);
  for(const x of LF.vision)if(has(x.title,x.aff))out.push(["Vision",x.title,areaOf(x.area).name,()=>setTab("vision")]);
  for(const x of LF.trips)if(has(x.dest,x.notes))out.push(["Trip",x.dest,dayMon(x.start),()=>{state.trip=x.id;setTab("travel")}]);
  for(const x of LF.learning)if(has(x.title,x.cat,x.goal))out.push(["Learning",x.title,x.type||"",()=>setTab("learning")]);
  for(const x of state.students)if(has(x.name,x.parent))out.push(["Student",x.name,x.grade||"",()=>setTab("students")]);
  for(const x of state.expenses)if(has(x.note))out.push(["Spending",x.note,shortDate(x.date)+" · "+money(x.amount)+" SAR",()=>setTab("budget")]);
  return out.slice(0,14)}
let sres=[];
function closePops(except){for(const[b,p]of [["searchBtn","searchPop"],["bellBtn","bellPop"]])if(p!==except){$(p).hidden=true;$(b).setAttribute("aria-expanded","false")}}
$("searchBtn").onclick=()=>{const open=$("searchPop").hidden;closePops("searchPop");$("searchPop").hidden=!open;$("searchBtn").setAttribute("aria-expanded",open);if(open){$("gSearch").focus();runSearch()}};
function runSearch(){const q=$("gSearch").value.trim();sres=q.length>1?searchAll(q):[];
  $("gResults").innerHTML=q.length<2?`<div class="pe">Type at least 2 letters.</div>`:sres.length?sres.map((r,i)=>`<button type="button" class="hit" data-sr="${i}"><small>${esc(r[0])}</small><span>${esc(r[1])}${r[2]?` <small>· ${esc(r[2])}</small>`:""}</span></button>`).join(""):`<div class="pe">Nothing found for "${esc(q)}".</div>`}
$("gSearch").oninput=runSearch;
$("gSearch").onkeydown=e=>{if(e.key==="Enter"&&sres[0]){e.preventDefault();sres[0][3]();closePops()}else if(e.key==="Escape"){closePops();$("searchBtn").focus()}};
document.addEventListener("click",e=>{const b=e.target.closest("button[data-sr]");if(b){const r=sres[+b.dataset.sr];closePops();if(r)r[3]();return}
  if(!e.target.closest(".popWrap"))closePops()});
function alertsNow(){const t=todayISO(),out=[];
  const over=LF.tasks.filter(x=>!x.done&&!x.weekly&&x.date&&x.date<t);if(over.length)out.push(["Overdue",over.length+" unfinished task"+(over.length>1?"s":""),()=>openDay(t)]);
  for(const x of tasksOn(t).filter(x=>!x.done))out.push(["Today",(x.start?fmtTime(x.start)+" · ":"")+x.title,()=>openDay(t)]);
  const hl=habitsDueToday().filter(h=>!LF.habit_log.some(x=>x.id===h.id+"_"+t));if(hl.length)out.push(["Habits",hl.length+" habit"+(hl.length>1?"s":"")+" left today",()=>setTab("habits")]);
  const bills=billItems().filter(b=>!b.paid&&b.date<=addDays(t,3));if(bills.length)out.push(["Bills",bills.length+" bill"+(bills.length>1?"s":"")+" due by "+dayMon(addDays(t,3)),()=>setTab("budget")]);
  const ow=owingList();if(ow.length)out.push(["Tutoring",ow.length+" student"+(ow.length>1?"s":"")+" to remind · "+money(ow.reduce((a,x)=>a+x.amt,0))+" SAR",()=>setTab("today")]);
  const late=sessions(addDays(t,-7),addDays(t,-1));if(late.length)out.push(["Lessons",late.length+" past lesson"+(late.length>1?"s":"")+" not logged",()=>setTab("today")]);
  if(!LF.journal.some(j=>j.id===t)&&new Date().getHours()>=18)out.push(["Journal","Write today's entry",()=>{state.jday=t;setTab("journal")}]);
  return out}
let alerts=[];
function updateBell(){alerts=alertsNow();$("bellN").hidden=!alerts.length;$("bellBtn").setAttribute("aria-label",alerts.length?alerts.length+" reminders":"Reminders");
  if(!$("bellPop").hidden)renderBell()}
function renderBell(){$("bellPop").innerHTML=alerts.length?alerts.map((a,i)=>`<button type="button" class="hit" data-al="${i}"><small>${esc(a[0])}</small><span>${esc(a[1])}</span></button>`).join(""):`<div class="pe">You're all caught up.</div>`}
$("bellBtn").onclick=()=>{const open=$("bellPop").hidden;closePops("bellPop");$("bellPop").hidden=!open;$("bellBtn").setAttribute("aria-expanded",open);if(open)renderBell()};
document.addEventListener("click",e=>{const b=e.target.closest("button[data-al]");if(!b)return;const a=alerts[+b.dataset.al];closePops();if(a)a[2]()});
$("avatarBtn").onclick=()=>setTab("settings");
// In-page reminders: tasks with a reminder, habits with a time, and the daily check-in.
const remFired=new Set();
function reminderTick(){const p=state.profile||{};if(p.remind===false)return;const n=Date.now(),t=todayISO();
  const fire=(key,at,msg)=>{if(n>=at&&n-at<5*60*1000&&!remFired.has(key)){remFired.add(key);toast(msg)}};
  const atOn=(d,hm,minus=0)=>{const[h,m]=hm.split(":").map(Number),x=parse(d);x.setHours(h,m-minus,0,0);return x.getTime()};
  for(const x of LF.tasks)if(!x.done&&x.date&&x.start&&x.reminder!==""&&x.reminder!=null)fire("t"+x.id+x.date+x.start,atOn(x.date,x.start,+x.reminder||0),"Reminder: "+x.title+" at "+fmtTime(x.start));
  for(const h of habitsDueToday())if(h.time&&!LF.habit_log.some(x=>x.id===h.id+"_"+t))fire("h"+h.id+t,atOn(t,h.time),"Habit time: "+h.name);
  if(p.checkin)fire("c"+t,atOn(t,p.checkin),"Daily check-in: tick your habits and log how you feel")}
setInterval(reminderTick,30000);

// ================= Spending: bills & reminders =================
function billItems(){const t=todayISO(),paid=new Set(LF.bill_paid.map(x=>x.id));
  return expensesIn(addDays(t,-14),addDays(t,30)).filter(e=>e.rec||e.date>t).map(e=>{const key=(e.rec?e.ruleId:e.id)+"_"+e.date;return{...e,key,paid:paid.has(key)}})
    .filter(b=>b.date>=t||!b.paid).sort((a,b)=>a.date.localeCompare(b.date))}
function renderBills(){const t=todayISO(),bs=billItems(),due=bs.filter(b=>!b.paid);
  $("bBills").innerHTML=`<div class="cap"><h3>Bills &amp; reminders</h3><span>${due.length} to pay · ${money(sum(due))} SAR · next 30 days</span></div>`+(bs.length?bs.map(b=>{const late=!b.paid&&b.date<t;
    return `<div class="erow"><span class="date" style="${late?"color:var(--owed);font-weight:600":""}">${esc(shortDate(b.date))}</span><span class="who"><strong>${esc(b.note||catName(b.categoryId))}</strong><span>${esc(catName(b.categoryId))} · ${b.rec?"repeats":"one-off"}${late?" · overdue":""}${b.paid?" · paid":""}</span></span><span class="num">${money(b.amount)}</span><button class="tick" data-bill="${esc(b.key)}" aria-pressed="${b.paid}" aria-label="${b.paid?"Mark not paid":"Mark paid"}: ${esc(b.note||catName(b.categoryId))}"></button></div>`}).join("")
    :`<div class="empty">No bills coming up. Add spending with "Repeats" (rent, phone, subscriptions) and it shows up here.</div>`)}
document.addEventListener("click",async e=>{const b=e.target.closest("button[data-bill]");if(!b||noDb())return;const id=b.dataset.bill,has=LF.bill_paid.some(x=>x.id===id);
  try{if(has)await db.doc("bill_paid/"+id).delete();else await db.doc("bill_paid/"+id).set({paidOn:todayISO(),createdAt:nowISO()});toast(has?"Marked not paid":"Bill marked paid")}catch(err){fail(err)}});

// ================= Page dispatch =================
const LIFE_RENDER={home:renderHome,planner:renderPlanner,habits:renderHabits,lgoals:renderLGoals,vision:renderVision,wellness:renderWellness,journal:renderJournal,travel:renderTravel,learning:renderLearning,notes:renderNotes,settings:renderSettings};
function renderLife(){
  fillAreaSelects();
  const p=state.profile||{},nm=p.name||"You";$("avatarI").textContent=initials(nm)||"?";$("avatarName").textContent=nm;
  if(LIFE_RENDER[state.tab])LIFE_RENDER[state.tab]();
  updateBell();
}
$("logoYear").textContent=new Date().getFullYear();
document.querySelectorAll("form.lform").forEach(resetLForm);
