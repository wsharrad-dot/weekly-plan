// Bank SMS → ledger entries (Al Rajhi English format). Each message ends with its "d/m/yy hh:mm" timestamp line.
const SMS_TS=/(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})/;
function parseBankSms(text){
  const entries=[],skipped=[],chunks=[];let cur=[];
  // A message ends at its timestamp line; a blank line also ends whatever came before it.
  const close=()=>{if(cur.length)chunks.push(cur.join("\n"));cur=[]};
  for(const raw of String(text||"").split(/\r?\n/)){const line=raw.trim();
    if(!line){close();continue}
    cur.push(line); if(SMS_TS.test(line))close()}
  close();
  const pad=n=>String(n).padStart(2,"0");
  for(const msg of chunks){
    const amt=msg.match(/Amount:\s*SAR\s*([\d,]+(?:\.\d+)?)/i), at=msg.match(/^At:\s*(.+)$/im), dt=msg.match(SMS_TS);
    // Only message types seen so far; anything else (e.g. money in) waits for a real sample rather than being guessed.
    const spend=/purchase|withdraw/i.test(msg.split("\n")[0]);
    if(spend&&amt&&dt)entries.push({kind:"expense",amount:+amt[1].replace(/,/g,""),date:"20"+dt[3]+"-"+pad(dt[2])+"-"+pad(dt[1]),time:pad(dt[4])+":"+dt[5],merchant:at?at[1].trim():""});
    else skipped.push(msg);
  }
  return{entries,skipped};
}
// Marks entries already in spending (or repeated in this paste). The SMS time tells apart two real
// purchases at the same shop on the same day; entries typed by hand have no time and match any time.
// Merchant names are compared the way they are stored: trimmed, lower-case, cut to 80 characters.
function markSmsDups(entries,expenses){
  const key=(d,a,n,t)=>d+"|"+Math.round(+a*100)/100+"|"+String(n||"").trim().slice(0,80).toLowerCase()+"|"+(t||"");
  const timed=new Set(),untimed=new Set(),seen=new Set();
  for(const x of expenses||[])(x.time?timed:untimed).add(key(x.date,x.amount,x.note,x.time||""));
  for(const x of entries){const k=key(x.date,x.amount,x.merchant,x.time);
    x.dup=timed.has(k)||untimed.has(key(x.date,x.amount,x.merchant,""))||seen.has(k);seen.add(k)}
  return entries;
}
if(typeof module!=="undefined")module.exports={parseBankSms,markSmsDups};
