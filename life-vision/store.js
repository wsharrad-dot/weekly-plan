// On-device storage for the Life Vision app.
// Gives the planner the same small database interface it used inside Claude
// (collection().add/onSnapshot, doc().set/update/delete/onSnapshot), kept in this
// phone's IndexedDB. Nothing leaves the device.
(function(){
const DBN="life-vision", ST="docs";
const mem=new Map();               // "collection/id" -> document
const colSubs=new Map(), docSubs=new Map();
let idbP=null;

function openIdb(){
  if(idbP)return idbP;
  idbP=new Promise((res,rej)=>{
    const r=indexedDB.open(DBN,1);
    r.onupgradeneeded=()=>r.result.createObjectStore(ST);
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  });
  return idbP;
}
async function loadAll(){
  const db=await openIdb();
  await new Promise((res,rej)=>{
    const tx=db.transaction(ST,"readonly"),st=tx.objectStore(ST),cur=st.openCursor();
    cur.onsuccess=()=>{const c=cur.result;if(c){mem.set(String(c.key),c.value);c.continue()}else res()};
    cur.onerror=()=>rej(cur.error);
  });
}
async function persist(changes){ // [[path, doc|null]]
  const db=await openIdb();
  await new Promise((res,rej)=>{
    const tx=db.transaction(ST,"readwrite"),st=tx.objectStore(ST);
    for(const[p,d]of changes){if(d===null)st.delete(p);else st.put(d,p)}
    tx.oncomplete=res; tx.onerror=()=>rej(tx.error); tx.onabort=()=>rej(tx.error);
  });
}
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const rid=()=>{const a="abcdefghijklmnopqrstuvwxyz0123456789";let s="";const b=crypto.getRandomValues(new Uint8Array(20));for(const x of b)s+=a[x%36];return s};
const colOf=p=>p.slice(0,p.indexOf("/"));
const idOf=p=>p.slice(p.indexOf("/")+1);
const check=p=>{if(!/^[^/]+\/[^/]+$/.test(p))throw new Error("Bad path "+p)};

function colSnap(c){
  const docs=[];
  for(const[p,d]of mem)if(colOf(p)===c)docs.push({id:idOf(p),exists:true,data:()=>clone(d)});
  return{docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f)};
}
function docSnap(p){const d=mem.get(p);return{id:idOf(p),exists:d!==undefined,data:()=>clone(d)}}

const pending=new Set();let flushQ=false;
function notify(p){pending.add(p);if(flushQ)return;flushQ=true;
  setTimeout(()=>{flushQ=false;const ps=[...pending];pending.clear();
    const cols=new Set(ps.map(colOf));
    for(const c of cols)for(const f of colSubs.get(c)||[])try{f(colSnap(c))}catch(e){console.error(e)}
    for(const x of ps)for(const f of docSubs.get(x)||[])try{f(docSnap(x))}catch(e){console.error(e)}
    if(window.LV&&LV.onChange)LV.onChange();
  },0)}
function sub(map,key,fn,snap){let s=map.get(key);if(!s)map.set(key,s=new Set());s.add(fn);setTimeout(()=>{try{fn(snap())}catch(e){console.error(e)}},0);return()=>s.delete(fn)}

async function write(p,d){check(p);if(d===null)mem.delete(p);else mem.set(p,d);notify(p);await persist([[p,d]])}

function docRef(p){check(p);return{
  id:idOf(p),path:p,
  async get(){return docSnap(p)},
  async set(data,opt){const base=opt&&opt.merge&&mem.has(p)?mem.get(p):{};await write(p,{...clone(base),...clone(data)})},
  async update(patch){if(!mem.has(p))throw new Error("Not found: "+p);await write(p,{...clone(mem.get(p)),...clone(patch)})},
  async delete(){if(mem.has(p))await write(p,null)},
  onSnapshot(fn){return sub(docSubs,p,fn,()=>docSnap(p))}
}}
function colRef(c){return{
  id:c,
  doc(id){return docRef(c+"/"+(id||rid()))},
  async add(data){const id=rid();await write(c+"/"+id,clone(data));return docRef(c+"/"+id)},
  async get(){return colSnap(c)},
  onSnapshot(fn){return sub(colSubs,c,fn,()=>colSnap(c))}
}}
const db={collection:colRef,doc:docRef};

// File saving: share sheet on iPhone ("Save to Files"), normal download elsewhere.
async function saveFile({filename,data}){
  const blob=data instanceof Blob?data:new Blob([data]);
  try{const f=new File([blob],filename,{type:blob.type||"application/octet-stream"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}
  catch(e){if(e&&e.name==="AbortError")return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);
}
const downloads={save:saveFile};

const ready=loadAll().catch(e=>{console.error("storage",e)});
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}

window.claude={use:async name=>{await ready;return name==="db"?db:name==="downloads"?downloads:null}};

// Backup and restore
window.LV={
  ready,
  count:()=>mem.size,
  exportJSON(){const docs={};for(const[p,d]of mem)docs[p]=d;
    return JSON.stringify({app:"life-vision",version:1,exportedAt:new Date().toISOString(),docs})},
  async importJSON(text,{replace=true}={}){
    const o=JSON.parse(text);if(!o||o.app!=="life-vision"||typeof o.docs!=="object")throw new Error("This isn't a Life Vision backup file.");
    const changes=[];
    if(replace)for(const p of mem.keys())if(!(p in o.docs))changes.push([p,null]);
    for(const[p,d]of Object.entries(o.docs)){if(!/^[^/]+\/[^/]+$/.test(p)||!d||typeof d!=="object")continue;changes.push([p,d])}
    await persist(changes);
    for(const[p,d]of changes){if(d===null)mem.delete(p);else mem.set(p,d);notify(p)}
    return changes.filter(x=>x[1]).length;
  },
  saveFile
};
})();
