// Pure helpers for the planner pages. Dates are "YYYY-MM-DD" strings; weeks start on Sunday.
(function(root){
const P=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const T=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const add=(s,n)=>{const d=P(s);d.setDate(d.getDate()+n);return T(d)};
const weekOf=s=>add(s,-P(s).getDay());

// Daily habits are due every day, "weekdays" habits Sunday to Thursday; weekly habits can be ticked on any day.
function habitDue(h,d){if(h.start&&d<h.start)return false;if(h.freq==="weekdays")return P(d).getDay()<=4;return true}

// Streaks: daily habits count due days in a row (an unticked today doesn't break it yet);
// weekly habits count weeks that reached their target (the current week can still be finished).
function habitStats(h,done,today){
  const start=h.start&&h.start<=today?h.start:today;let run=0,best=0;
  const weekly=h.freq==="weekly", need=Math.max(1,Math.round(+h.perWeek||1));
  if(weekly){for(let ws=weekOf(start);ws<=today;ws=add(ws,7)){let n=0;for(let i=0;i<7;i++)if(done.has(add(ws,i)))n++;
      if(n>=need){run++;best=Math.max(best,run)}else if(ws!==weekOf(today))run=0}}
  else for(let d=start;d<=today;d=add(d,1)){if(!habitDue(h,d))continue;if(done.has(d)){run++;best=Math.max(best,run)}else if(d!==today)run=0}
  const mk=today.slice(0,7),[y,m]=mk.split("-").map(Number),dim=new Date(y,m,0).getDate();
  let monthDone=0,monthTarget=0;
  for(let i=1;i<=dim;i++){const d=mk+"-"+String(i).padStart(2,"0");if(done.has(d))monthDone++;if(!weekly&&habitDue(h,d))monthTarget++}
  if(weekly)monthTarget=Math.round(need*dim/7);
  return{cur:run,best,unit:weekly?"weeks":"days",monthDone,monthTarget};
}

// A goal with milestones is as far along as its ticked milestones; otherwise it uses the progress you set.
function lifeGoalProgress(g){const ms=g.milestones||[];
  if(ms.length)return Math.round(ms.filter(x=>x.done).length/ms.length*100);
  return Math.max(0,Math.min(100,Math.round(+g.progress||0)))}

// Does a day's wellness log meet a goal? "exercise" counts any entry; number fields must reach the minimum.
function wellMet(goal,log){if(!log)return false;const v=log[goal.field];
  if(goal.field==="exercise")return String(v||"").trim()!=="";
  return v!==null&&v!==undefined&&v!==""&&+v>=(+goal.min||0)&&(+goal.min>0||+v>0)}

const api={habitDue,habitStats,lifeGoalProgress,wellMet,weekOf,addDay:add};
Object.assign(root,api);
if(typeof module!=="undefined")module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
