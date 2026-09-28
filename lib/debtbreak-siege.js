// Debtbreak's spatial game. Every financial effect settles through the continuous ledger.
import {holdShot,finishShot,continuousAction,tickContinuous,impactThreat} from './debtbreak-continuous.js';
import {shotValue,firingRate} from './debtbreaker-engine.js';
import {MAX_ACTIVE_FRAME_SECONDS,INTERRUPTION_NOTICE} from './debtbreak-clock.js';
import {segmentHit} from './debtbreaker-combat.js';
export const UTILITANK_SPEED=2,DEBTONATOR_SPEED=5;
export const SWORD_CLEARS_PER_POWER=5,SWORD_POWER_RADIUS=320;
export const TURRET={x:500,z:935};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
export function radarSeconds(s){
 const strength=s.hangar?.snapshot.corners.credit.strength;
 return s.continuous.fictional?3:strength==null?1:1+clamp(strength,0,1)*5;
}
export function createCombat(ledger,pace='standard'){
 const w={ledger,pace,formationSerial:0,time:ledger.elapsed,accumulator:0,settleUntil:0,angle:0,aim:{x:500,z:300},source:'auto',weapon:'intercept',autoFire:false,assist:true,lockedId:null,hoveredId:null,triggers:{},pendingShot:false,firing:false,cooldown:0,bullets:[],effects:[],events:[],serial:0,shots:0,hits:0,misses:0,drones:[],formationPeriod:ledger.period};
 w.sentinel={x:420,z:865,facing:1,mode:'idle',targetId:null,cooldown:0,swingLeft:0,struck:false,cleared:0,charges:0,powerActive:false,queuedId:null,powerStrikes:0};
 sync(w);return w;
}
function sync(w,preferred=null){
 const targets=w.ledger.threats.filter(t=>['living','credit'].includes(t.lane)&&t.remaining>0).sort((a,b)=>a.dueDay-b.dueDay||a.id.localeCompare(b.id));
 w.drones=w.drones.filter(d=>targets.some(t=>t.id===d.targetId));
 for(const t of targets){
  let group=w.drones.filter(d=>d.targetId===t.id);
  if(!group.length&&w.drones.length<60){
   const n=Math.min(t.remaining,t.lane==='living'?12:3,60-w.drones.length);
   group=Array.from({length:n},(_,slot)=>({id:`${t.id}:siege:${slot}`,targetId:t.id,slot,formationSlot:t.lane==='living'?w.formationSerial++:slot,remaining:Math.floor(t.remaining/n)+(slot<t.remaining%n?1:0),original:Math.floor(t.remaining/n)+(slot<t.remaining%n?1:0)}));w.drones.push(...group);
  }
  let paid=group.reduce((sum,d)=>sum+d.remaining,0)-t.remaining;
  for(const d of [...group].sort((a,b)=>Number(b.id===preferred)-Number(a.id===preferred))){const n=Math.min(d.remaining,Math.max(0,paid));d.remaining-=n;paid-=n;}
 }
}
// Six accelerating horizontal traversals, with an explicit descent at each edge.
export function invaderPosition(progress,slot=0){
 const p=clamp(progress,0,1),sweep=Math.min(5,Math.floor(p*p*6)),local=p>=1?1:p*p*6-sweep;
 const crossing=Math.min(1,local/.8),down=clamp((local-.8)/.2,0,1),right=sweep%2===0;
 return {x:230+(right?crossing:1-crossing)*540+(slot%4-1.5)*120,z:90+(sweep+down)*115+Math.floor(slot%24/4)*65*(1-p),radius:30,angle:0};
}
export function combatActors(w,time=w.time){
 const c=w.ledger.continuous,seconds=c.secondsPerDay;
 return w.ledger.threats.flatMap(t=>{
  if(t.lane==='reserve'||t.remaining<=0)return [];
  if(t.lane==='want'){
   const o=c.offers.find(o=>o.id===t.id);if(!o)return [];
   const p=clamp((time/seconds-o.spawnDay)/(o.arrivalDay-o.spawnDay),0,1),seed=hash(t.id),lane=o.laneSlot??seed%6;
   return [{id:t.id,target:t,remaining:t.remaining,original:t.original,slot:0,x:100+(lane%6)*160+Math.sin(time*1.1+seed)*12,z:150+p*(540+Math.floor(lane/6)*55),radius:30,angle:0,visible:true,warning:false,highRate:false,entryIn:0,impactAt:Infinity,rate:null}];
  }
  return w.drones.filter(d=>d.targetId===t.id&&d.remaining>0).map(d=>{
   const seed=hash(d.id),scheduledImpact=(t.impacted?t.lastAttack+5:t.dueDay+3)*seconds;
   const start=t.impacted?t.lastAttack*seconds:t.issuedDay*seconds;
   const entry=t.lane==='credit'?Math.min(scheduledImpact-3,start+(t.impacted?.4:4+seed%13)):start;
   const impact=entry+(scheduledImpact-entry)/(t.lane==='credit'?DEBTONATOR_SPEED:UTILITANK_SPEED);
   const progress=clamp((time-entry)/Math.max(.1,impact-entry),0,1),entryIn=entry-time;
   let point;
   if(t.lane==='living')point=invaderPosition(clamp((time-start)/Math.max(.1,impact-start),0,1),d.formationSlot);
   else{
    const edge=seed%3,sx=edge===0?-55:edge===1?1055:150+seed%700,sz=edge===2?-45:70+seed%240;
    const ex=350+seed%300,ez=795;
    point={x:sx+(ex-sx)*progress,z:sz+(ez-sz)*progress,radius:23,angle:Math.atan2(ez-sz,ex-sx)-Math.PI/2};
   }
   const account=c.accounts.find(a=>a.id===t.accountId),rate=account?.rateBps==null?null:account.rateBps/100;
   return {...d,target:t,...point,visible:time>=entry,warning:t.lane==='credit'&&entryIn>0&&entryIn<=radarSeconds(w.ledger),entryIn,impactAt:impact,rate,highRate:rate!==null&&rate>=18};
  });
 });
}
export function setAim(w,x,z){w.aim={x:clamp(x,15,985),z:clamp(z,0,900)};w.lockedId=null;}
export function aimAtTarget(w,id){const a=combatActors(w).find(a=>a.target.id===id&&a.visible);if(a){w.aim={x:a.x,z:a.z};w.lockedId=w.assist?a.id:null;w.ledger.selectedId=id;}}
export function setWeapon(w,weapon){if(!['intercept','rapid'].includes(weapon))return;clearTriggers(w);w.weapon=weapon;w.cooldown=0;}
export function setTrigger(w,source,active){
 if(active&&!w.triggers[source]){
  if(commandSwordAt(w,w.aim.x,w.aim.z))return;
  w.pendingShot=true;
  if(w.assist){const target=combatActors(w).filter(a=>eligible(w,a)&&Math.hypot(a.x-w.aim.x,a.z-w.aim.z)<=a.radius+18).sort((a,b)=>Math.hypot(a.x-w.aim.x,a.z-w.aim.z)-Math.hypot(b.x-w.aim.x,b.z-w.aim.z))[0];if(target)w.lockedId=target.id;}
 }
 w.triggers[source]=active;w.firing=Object.values(w.triggers).some(Boolean);
}
export function clearTriggers(w){w.triggers={};w.firing=false;w.pendingShot=false;w.autoFire=false;}
// One pointer works for both combat and Sentinel. A Want tap never spends ammo.
export function commandSwordAt(w,x,z){
 const a=combatActors(w).filter(a=>a.visible&&Math.hypot(a.x-x,a.z-z)<=65).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
 if(!a||a.target.lane!=='want')return false;commandSword(w,a.target.id);return true;
}
export function commandSword(w,id){
 if(w.ledger.phase!=='playing'||w.ledger.paused)return false;
 const s=w.sentinel;
 const a=combatActors(w).filter(a=>a.visible&&a.target.lane==='want'&&(!id||a.target.id===id)).sort((a,b)=>b.z-a.z)[0];
 if(!a)return false;
 clearTriggers(w);
 if(s.targetId===a.target.id){w.ledger.notice='Target locked. One connected sword strike clears this ad.';return true;}
 if(s.mode==='dash'||s.mode==='swing'||s.cooldown>0){s.queuedId=a.target.id;w.ledger.notice='Next ad queued for Sentinel. One strike clears it.';return true;}
 s.targetId=a.target.id;s.mode='dash';s.struck=false;s.queuedId=null;
 w.ledger.notice='Target locked. Sentinel will clear this ad with one sword strike.';return true;
}
function stepSentinel(w,dt){
 const s=w.sentinel;s.cooldown=Math.max(0,s.cooldown-dt);
 if(s.queuedId&&!['dash','swing'].includes(s.mode)&&s.cooldown<=0){const id=s.queuedId;s.queuedId=null;commandSword(w,id);}
 const actors=combatActors(w),target=actors.find(a=>a.target.id===s.targetId&&a.target.lane==='want');
 if(s.mode==='dash'&&!target){s.mode='return';s.targetId=null;}
 if(s.mode==='dash'&&target){
  const dx=target.x-s.x;s.facing=dx<0?-1:1;s.x+=Math.sign(dx)*Math.min(Math.abs(dx),650*dt);
  const dz=Math.min(865,Math.max(755,target.z+65))-s.z;s.z+=Math.sign(dz)*Math.min(Math.abs(dz),500*dt);
  if(Math.abs(dx)<35&&target.z>=640){
   s.mode='swing';s.swingLeft=.5;s.struck=false;s.powerActive=s.charges>0;
   if(s.powerActive){s.charges--;s.powerStrikes++;}
  }
 }else if(s.mode==='swing'){
  s.swingLeft-=dt;
  if(s.swingLeft<=.27&&!s.struck){
   s.struck=true;
   // A normal connected strike removes its target outright. Charged sweeps also
   // clear nearby ads, never bills, and settle every offer through the same ledger.
   const hits=target&&Math.abs(target.x-s.x)<90&&target.z>=620
    ?[target,...(s.powerActive?actors.filter(a=>a.target.lane==='want'&&a.id!==target.id&&Math.hypot(a.x-target.x,a.z-target.z)<=SWORD_POWER_RADIUS):[])]:[];
   const before=s.cleared;
   for(const a of hits){
    const offer=w.ledger.continuous.offers.find(o=>o.id===a.target.id);
    if(!offer||!['flying','offered'].includes(offer.status))continue;
    w.ledger=continuousAction(w.ledger,{type:'reject',offerId:a.target.id});s.cleared++;
    event(w,'reject',a.x,a.z,0,a.target.id);
   }
   const earned=Math.floor(s.cleared/SWORD_CLEARS_PER_POWER)-Math.floor(before/SWORD_CLEARS_PER_POWER);s.charges+=earned;
   if(hits.length){
    if(s.powerActive)event(w,'power-sweep',target.x,target.z,0,target.target.id);
    w.ledger.notice=s.powerActive?`Power sweep cleared ${s.cleared-before} ads. ${earned?'POWER SWEEP READY again.':'No cash spent.'}`:earned?'POWER SWEEP READY · five ads cleared. Your next strike has a wider reach.':'Ad cleared in one strike. No cash spent.';
   }
  }
  if(s.swingLeft<=0){s.mode='return';s.targetId=null;s.cooldown=.3;s.powerActive=false;}
 }else if(s.mode==='return'){
  const dx=420-s.x;s.facing=dx<0?-1:1;s.x+=Math.sign(dx)*Math.min(Math.abs(dx),650*dt);s.z+=Math.min(865-s.z,300*dt);
  if(Math.abs(dx)<2&&s.z>=865)s.mode='idle';
 }
}
export const reserveDepositBlocked=()=>false;
function event(w,type,x,z,amount=0,targetId=null){const e={serial:++w.serial,type,x,z,amount,targetId,actorId:null,born:w.time};w.effects.push(e);w.events.push(e);}
function eligible(w,a){return a.visible&&a.target.lane===(w.weapon==='intercept'?'credit':'living');}
function settleHit(w,bullet,a){
 const before=w.ledger,key=bullet.source==='income'?'incomeWallet':'reserves';
 const held=before.continuous.holds[String(bullet.id)]?.amount??0;
 w.ledger=bullet.rejection?continuousAction(before,{type:'reject',offerId:a.target.id}):finishShot(before,String(bullet.id),a.target.id);
 const paid=bullet.rejection?0:held-(w.ledger[key]-before[key]);
 w.hits++;event(w,a.target.lane==='want'?'reject':'hit',a.x,a.z,paid,a.target.id);sync(w,a.id);
 if(!w.ledger.threats.find(t=>t.id===a.target.id)?.remaining)event(w,'clear',a.x,a.z,0,a.target.id);
}
function step(w,dt){
 sync(w);const previous=combatActors(w);w.time+=dt;stepSentinel(w,dt);
 let actors=combatActors(w),lock=actors.find(a=>a.id===w.lockedId&&eligible(w,a));
 if(w.assist&&lock)w.aim={x:lock.x,z:lock.z};
 w.angle=Math.atan2(w.aim.x-TURRET.x,TURRET.z-w.aim.z);
 const nearest=actors.filter(a=>eligible(w,a)&&Math.hypot(a.x-w.aim.x,a.z-w.aim.z)<=a.radius+18).sort((a,b)=>Math.hypot(a.x-w.aim.x,a.z-w.aim.z)-Math.hypot(b.x-w.aim.x,b.z-w.aim.z))[0];
 w.hoveredId=nearest?.target.id??null;if(nearest)w.ledger.selectedId=nearest.target.id;
 w.cooldown=Math.max(-dt,w.cooldown-dt);
 const requested=w.weapon==='intercept'?w.pendingShot:(w.pendingShot||w.firing||w.autoFire);
 if(requested&&w.cooldown<=0){
  const source=w.source==='auto'?(w.ledger.incomeWallet>0?'income':'reserve'):w.source;
  const rejection=nearest?.target.lane==='want',balance=source==='income'?w.ledger.incomeWallet:w.ledger.reserves;
  w.pendingShot=false;
  if(balance>0||rejection){
   const id=++w.serial,value=shotValue(w.ledger)*(w.weapon==='intercept'?4:1);
   if(!rejection)w.ledger=holdShot(w.ledger,String(id),source,value,nearest?.target.id??null);
   const bullet={id,x:TURRET.x,z:TURRET.z,dx:Math.sin(w.angle),dz:-Math.cos(w.angle),source,rejection:!!rejection,weapon:w.weapon,travel:0};
   w.shots++;event(w,'shot',TURRET.x,TURRET.z);
   if(w.weapon==='intercept'){
    const length=1200,bx=bullet.x+bullet.dx*length,bz=bullet.z+bullet.dz*length;
    const hit=actors.filter(a=>eligible(w,a)&&(!rejection||a.target.lane==='want')).map(a=>({a,t:segmentHit(bullet.x,bullet.z,bx,bz,a.x,a.z,a.radius+7)})).filter(p=>p.t!==null).sort((a,b)=>a.t-b.t)[0];
    if(hit){settleHit(w,bullet,hit.a);event(w,'laser',hit.a.x,hit.a.z);}else{w.ledger=finishShot(w.ledger,String(id));w.misses++;event(w,'laser',w.aim.x,w.aim.z);}
   }else w.bullets.push(bullet);
   w.cooldown+=w.weapon==='intercept'?.32:1/firingRate(w.ledger);
  }
 }
 const keep=[];
 for(const b of w.bullets){
  const nx=b.x+b.dx*1250*dt,nz=b.z+b.dz*1250*dt;
  actors=combatActors(w);
  const hit=actors.filter(a=>a.visible&&(b.rejection?a.target.lane==='want':a.target.lane==='living')).map(a=>{
   const old=previous.find(p=>p.id===a.id)??a;
   return {a,t:segmentHit(b.x-old.x,b.z-old.z,nx-a.x,nz-a.z,0,0,a.radius+5)};
  }).filter(p=>p.t!==null).sort((a,b)=>a.t-b.t)[0];
  if(hit)settleHit(w,b,hit.a);
  else if(nx< -100||nx>1100||nz< -100||nz>1050||b.travel>1500){w.ledger=finishShot(w.ledger,String(b.id));w.misses++;}
  else{b.x=nx;b.z=nz;b.travel+=1250*dt;keep.push(b);}
 }
 w.bullets=keep;
 const before=w.ledger;w.ledger=tickContinuous(before,dt);sync(w);
 // Resolve one contact per underlying obligation, not one charge per body.
 const contacts=new Set(combatActors(w).filter(a=>a.target.lane!=='want'&&a.visible&&w.time+1e-8>=a.impactAt).map(a=>a.target.id));
 for(const id of contacts){if(w.ledger.phase!=='playing')break;w.ledger=impactThreat(w.ledger,id);}sync(w);
 for(const t of w.ledger.threats){
  const old=before.threats.find(b=>b.id===t.id);if(!old)continue;
  if(t.reservePaid>old.reservePaid)event(w,'intercept',500,790,t.reservePaid-old.reservePaid,t.id);
  if(t.lastAttack!==old.lastAttack&&t.impacted)event(w,'breach',350+hash(t.id)%300,800,0,t.id);
 }
 if(w.ledger.phase!==before.phase){clearTriggers(w);w.bullets=[];w.settleUntil=w.time+1.25;event(w,w.ledger.phase==='gameover'?'defeat':'checkpoint',500,820);}
 w.effects=w.effects.filter(e=>w.time-e.born<1.1);
}
export function advanceCombat(w,seconds){
 w.events=[];if(!Number.isFinite(seconds)||seconds<=0)return w;
 if(w.ledger.phase!=='playing'){if(w.time<w.settleUntil)w.time=Math.min(w.settleUntil,w.time+Math.min(seconds,.1));return w;}
 if(w.ledger.paused)return w;
 if(seconds>MAX_ACTIVE_FRAME_SECONDS+1e-9){w.ledger={...w.ledger,paused:true,notice:INTERRUPTION_NOTICE};clearTriggers(w);return w;}
 w.accumulator+=seconds;
 while(w.accumulator+1e-9>=1/120&&w.ledger.phase==='playing'){step(w,1/120);w.accumulator-=1/120;}
 return w;
}
