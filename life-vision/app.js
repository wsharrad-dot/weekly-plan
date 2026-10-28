// App shell for Life Vision on iPhone: offline support, backup/restore, first-run import.
(function(){
const $id=id=>document.getElementById(id);
const say=m=>{try{toast(m)}catch(e){alert(m)}};

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));

// Hidden file picker shared by the restore button and the welcome card
const pick=document.createElement("input");pick.type="file";pick.accept=".json,application/json";pick.hidden=true;document.body.appendChild(pick);
let afterPick=null;
pick.onchange=async()=>{const f=pick.files&&pick.files[0];pick.value="";if(!f)return;
  try{const n=await LV.importJSON(await f.text());try{localStorage.setItem("lvBackupAt",new Date().toISOString())}catch(e){}
    say(n+" entries loaded");setTimeout(()=>location.reload(),700)}
  catch(e){say(e&&e.message?e.message:"Couldn't read that file.")}
  if(afterPick)afterPick()};
const choose=()=>pick.click();

async function backup(){
  const d=new Date(),s=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  await LV.saveFile({filename:"life-vision-backup-"+s+".json",data:new Blob([LV.exportJSON()],{type:"application/json"})});
  try{localStorage.setItem("lvBackupAt",d.toISOString())}catch(e){}
}

// Sidebar buttons
const tools=document.querySelector(".side .tools");
if(tools){
  const b1=document.createElement("button");b1.className="ghost small";b1.textContent="Back up data";b1.onclick=backup;
  const b2=document.createElement("button");b2.className="ghost small";b2.textContent="Restore backup";
  b2.onclick=()=>{if(LV.count()&&!confirm("Restoring replaces everything in the app with the backup file. Continue?"))return;choose()};
  tools.append(b1,b2);
}

// Saving now happens on the phone, so the "sign in to Claude" notice no longer applies
const ns=$id("noStore");if(ns)ns.textContent="Couldn't open storage on this device. Close the app fully and open it again.";

// First run: offer to load the planner data
LV.ready.then(()=>{
  if(LV.count())return;
  const w=document.createElement("div");w.className="lock";w.style.zIndex=130;
  w.innerHTML=`<div class="lockCard" role="dialog" aria-labelledby="lvWelcomeH">
    <div class="lockIcon" aria-hidden="true">🌱</div>
    <h2 id="lvWelcomeH">Welcome to Life Vision</h2>
    <p class="sub">Load your planner file to bring in your goals, budget, habits and trips. Everything stays on this iPhone.</p>
    <button class="primary" id="lvImport">Load my planner file</button>
    <button class="ghost" id="lvFresh">Start empty</button></div>`;
  document.body.appendChild(w);
  $id("lvImport").onclick=choose;
  $id("lvFresh").onclick=()=>w.remove();
  afterPick=()=>{};
});
})();
