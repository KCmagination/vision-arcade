// Spatial packets own no money. Only the ledger can settle a defeated packet.
import {shotValue} from './debtbreaker-engine.js';
import {groundTarget,groundFunds} from './debtbreak-ground-economy.js';
export const GROUND_ACTIVE_LIMIT=12,LIVING_ACTIVE_LIMIT=8,GROUND_LANE_GAP=125,GROUND_ENGAGE_Z=390;
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const sum=xs=>xs.reduce((n,d)=>n+d.remaining,0);
export function syncGroundStream(w,preferred=null){
 const s=w.ledger,c=s.continuous,g=w.ground;
 // Upgrade old checkpoints without touching the ledger or in-flight money.
 if(g.streamVersion!==3){w.drones=[];g.streamVersion=3;g.nextEntry=w.time;g.nextLivingEntry=w.time;g.laneSerial=0;g.extraTarget=null;g.streamSerial=0;}
 c.ground.packetDefense=true;
 const targets=s.threats.filter(t=>['living','credit'].includes(t.lane)&&t.remaining>0).sort((a,b)=>a.dueDay-b.dueDay||a.id.localeCompare(b.id));
 w.drones=w.drones.filter(d=>d.extra||targets.some(t=>t.id===d.targetId));
 const creditCount=targets.filter(t=>t.lane==='credit').length;
 for(const t of targets){
  let group=w.drones.filter(d=>d.targetId===t.id);
  if(!group.length&&w.drones.length<60){
   const absent=targets.filter(x=>!w.drones.some(d=>d.targetId===x.id)).length;
   const slots=Math.max(1,Math.floor((60-w.drones.length)/Math.max(1,absent)));
   const n=Math.min(t.remaining,slots,t.lane==='credit'?Math.max(1,Math.floor((c.ground.command?24:12)/creditCount)):Math.max(c.ground.command?12:4,Math.ceil(t.remaining/(shotValue(s)*(c.ground.command?2:4)))));
   const deadline=(t.dueDay+1)*c.secondsPerDay,issue=t.issuedDay*c.secondsPerDay;
   group=Array.from({length:n},(_,slot)=>{
    const amount=Math.floor(t.remaining/n)+(slot<t.remaining%n?1:0);
    const flight=(t.lane==='credit'?12:c.ground.touch?12:10)*c.secondsPerDay/2;
    // The calendar marks overdue at the next day's boundary. Do not schedule
    // command's final packet exactly on that boundary, then settle it a tick late.
    const latest=Math.max(issue,deadline-flight-(c.ground.command ? .25*c.secondsPerDay/2 : 0));
    const first=Math.max(w.time,Math.min(latest,issue+2*c.secondsPerDay/2));
    const hp=t.lane==='credit'?6:2;
    return {id:`${t.id}:stream:${++g.streamSerial}`,targetId:t.id,slot,formationSlot:slot,original:amount,remaining:amount,
     hp,maxHp:hp,enteredAt:null,z:85,lane:0,flight,contacts:0,entryAt:first+Math.max(0,latest-first)*slot/Math.max(1,n-1),impactAt:deadline};
   });w.drones.push(...group);
  }
  let paid=sum(group)-t.remaining;
  for(const d of [...group].sort((a,b)=>Number(b.id===preferred)-Number(a.id===preferred))){const amount=Math.min(d.remaining,Math.max(0,paid));d.remaining-=amount;paid-=amount;}
  const armor=t.lane==='credit'?(c.accounts.find(a=>a.id===t.accountId)?.fees?7:6):2;
  for(const d of group){d.hp=Math.min(armor,d.hp+Math.max(0,armor-d.maxHp));d.maxHp=armor;}
  // A newly posted fee can increase a claim; preserve its cents in the queue.
  if(paid<0&&group.length){const d=group.at(-1);d.remaining-=paid;d.original-=paid;}
 }
 // Extra troops exist only while an explicit, funded allowance and eligible
 // modeled debt remain. Strategy changes retarget uncommitted visual packets.
 const choice=groundTarget(s),funds=groundFunds(s);
 const account=choice?.kind==='extra'?c.accounts.find(a=>a.id===choice.accountId):null;
 const available=account?Math.min(funds.extraAvailable,account.principal+account.interest+account.fees):0;
 const key=account&&available>0?`${s.period}:${account.id}:${c.ground.strategy}`:null;
 if(g.extraKey!==key){w.drones=w.drones.filter(d=>!d.extra);g.extraKey=key;g.extraTarget=null;}
 if(key){
  const id=`extra:${account.id}`;
  g.extraTarget={id,accountId:account.id,label:`${account.name} · extra`,lane:'credit',kind:'extra',remaining:available,original:available,dueDay:null};
  let group=w.drones.filter(d=>d.extra),excess=sum(group)-available;
  for(const d of [...group].reverse()){const remove=Math.min(d.remaining,Math.max(0,excess));d.remaining-=remove;excess-=remove;}
  w.drones=w.drones.filter(d=>!d.extra||d.remaining>0);
  let unassigned=available-sum(w.drones.filter(d=>d.extra));
  const packet=c.ground.strategy==='snowflake'?500:Math.max(shotValue(s),Math.ceil(available/24));
  while(unassigned>0&&w.drones.length<60&&w.drones.filter(d=>d.extra).length<12){
   const amount=Math.min(unassigned,packet);unassigned-=amount;
   w.drones.push({id:`${id}:stream:${++g.streamSerial}`,targetId:id,slot:g.streamSerial,formationSlot:0,extra:true,original:amount,remaining:amount,hp:account.fees?7:6,maxHp:account.fees?7:6,enteredAt:null,z:85,lane:0,entryAt:w.time});
  }
 }
}
export function moveGroundStream(w,dt){
 const c=w.ledger.continuous,g=w.ground,scale=c.secondsPerDay/2;
 const living=w.drones.filter(d=>d.remaining>0&&w.ledger.threats.some(t=>t.id===d.targetId&&t.lane==='living'));
 const nextLiving=living.filter(d=>d.enteredAt===null&&d.entryAt<=w.time).sort((a,b)=>a.entryAt-b.entryAt)[0];
 if(nextLiving&&w.time>=g.nextLivingEntry&&living.filter(d=>d.enteredAt!==null).length<LIVING_ACTIVE_LIMIT){
  nextLiving.enteredAt=w.time;nextLiving.impactAt=w.time+nextLiving.flight;g.nextLivingEntry=w.time+1.1*scale;
 }
 const debt=w.drones.filter(d=>d.remaining>0&&(d.extra||w.ledger.threats.some(t=>t.id===d.targetId&&t.lane==='credit')));
 const active=debt.filter(d=>d.enteredAt!==null);
 // Front-to-back updates enforce separation even at the shield or while unfunded.
 for(let lane=0;lane<4;lane++){
  let ceiling=780;
  for(const d of active.filter(d=>d.lane===lane).sort((a,b)=>b.z-a.z||a.enteredAt-b.enteredAt)){
   d.z=Math.min(ceiling,d.z+60/scale*dt);ceiling=d.z-GROUND_LANE_GAP;
  }
 }
 if(w.time+1e-8<g.nextEntry||active.length>=GROUND_ACTIVE_LIMIT)return;
 const d=debt.filter(d=>d.enteredAt===null&&d.entryAt<=w.time).sort((a,b)=>a.entryAt-b.entryAt)[0];if(!d)return;
 for(let attempt=0;attempt<4;attempt++){
  const lane=(g.laneSerial+attempt)%4;
  if(active.some(a=>a.lane===lane&&a.z<85+GROUND_LANE_GAP))continue;
  d.lane=lane;d.enteredAt=w.time;d.z=85;g.laneSerial=lane+1;g.nextEntry=w.time+.72*scale;break;
 }
}
export function groundStreamActors(w,t,time,radar){
 const c=w.ledger.continuous,seconds=c.secondsPerDay,a=c.accounts.find(a=>a.id===t.accountId);
 return w.drones.filter(d=>d.targetId===t.id&&d.remaining>0).map(d=>{
  const debt=t.lane==='credit',seed=hash(d.id);
  const impactAt=d.extra?Infinity:debt?d.enteredAt===null?Infinity:d.enteredAt+12*seconds/2:d.impactAt;
  const entry=d.enteredAt;
  const entryIn=entry===null?Infinity:entry-time,visible=entry!==null&&time>=entry;
  let point;
  if(debt)point={x:200+d.lane*200,z:d.z,radius:30,angle:0};
  else{
   const progress=clamp((time-entry)/Math.max(.1,impactAt-entry),0,1),edge=seed%3;
   const sx=c.ground.command?100+(d.slot%2)*800:edge===0?-50:edge===1?1050:120+seed%760,sz=c.ground.command?-30:edge===2?-45:100+seed%120,ex=c.ground.command?400+(d.slot%2)*200:300+seed%400,ez=800;
   point={x:sx+(ex-sx)*progress,z:sz+(ez-sz)*progress,radius:22,angle:Math.atan2(ez-sz,ex-sx)-Math.PI/2};
  }
  const warningIn=entry===null?d.entryAt-time:entryIn;
  return {...d,target:t,...point,visible,warning:!debt&&warningIn>0&&warningIn<=radar,entryIn:warningIn,impactAt,rate:a?.rateBps==null?null:a.rateBps/100,highRate:a?.rateBps>=1800,visualRole:debt?'debt':'expense',fees:a?.fees??0};
 });
}
