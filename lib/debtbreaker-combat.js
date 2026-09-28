import { holdShot, finishShot, continuousAction } from './debtbreak-continuous.js';
// Spatial arcade layer. Only the existing ledger functions can move money.
import { shotValue, firingRate, incomeFire, reserveFire, tickCampaign } from './debtbreaker-engine.js';
import { MAX_ACTIVE_FRAME_SECONDS, INTERRUPTION_NOTICE } from './debtbreak-clock.js';

export const TURRET = { x: 0, z: 6.4 };
export const VAULT = { x: 0, z: 8.3 };
export const CADENCE = .32;
export const BULLET_SPEED = 38;
export const PACES = { relaxed: .78, standard: 1.55, pressure: 2.1 };
export const SQUAD_SIZE = 5;
export const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

export function defenseContact(lane, slot = 0, defenseIndex = 0) {
  const angle = (lane === 'credit' ? -1 : 1) * (.4 + (slot%5) * .135);
  const radius = defenseIndex === 1 ? 3.65 : 4.6;
  return { x: Math.sin(angle) * radius, z: TURRET.z - Math.cos(angle) * radius };
}

export function targetPosition(target, time, index = 0, slot = 0, defenseIndex = 0) {
  if (target.lane === 'want') {const drift=target.drift??index;return {x:Math.sin(time*.4+drift)*6.8,z:-6+Math.min(1,target.progress/100)*8+Math.sin(drift)*.5,radius:.65};}
  if(target.impacted)return {x:Math.sin(time*.25+index)*3.2,z:2.6+Math.cos(time*.25+index)*.5,radius:.6};
  if (target.lane === 'reserve') return { x: Math.sin(time * .53) * 7.4, z: -6.3, radius: .95 };
  const t = Math.min(1, Math.max(0, target.progress / 100));
  const side = target.lane === 'credit' ? -1 : 1;
  const contact = defenseContact(target.lane, slot, defenseIndex);
  if(target.formationOffset!==undefined){
    const ordinal=target.formationOffset+slot,col=ordinal%5,row=Math.floor(ordinal/5);
    const weave=Math.sin(time*(target.lane==='living'?.85:1.8)+ordinal*1.7)*(target.lane==='living'?.38:1.05);
    const startX=side*(4.2+col*1.2),startZ=-5.4+Math.min(6,row)*.95;
    return {x:Math.max(-10.35,Math.min(10.35,startX*(1-t)+contact.x*t+weave*(1-t))),
      z:startZ*(1-t)+contact.z*t,radius:target.lane==='living'?.46:.36};
  }
  // Separate bodies share one financial obligation. Formation offsets taper at
  // contact, so a breach physically reaches the same defense the ledger damages.
  const weave = Math.sin(time * (1.65 + slot * .09) + slot * 1.7 + index * 2.1) * 1.8;
  const spread = (slot - 2) * .7;
  const creditBand=target.lane==='credit'?Math.max(0,index-1)*2.8:0;
  const x = (side * 8.2 + creditBand) * (1-t) + contact.x*t + (weave + spread) * (1-t);
  return { x: Math.max(-10.35, Math.min(10.35, x)),
    z: (-4.25 + slot*.9 + Math.max(0,index-1)*.45)*(1-t) + contact.z*t,
    radius: .48 };
}

export function createCombat(ledger, pace = 'standard') {
  const world = { ledger, pace, time: 0, angle: 0, aim: { x:0,z:-4 }, firing:false,
    source:ledger.continuous?'auto':'income', accumulator:0, lastSource:null, lastMerge:0, autoFire:false, assist:false, lockedId:null, hoveredId:null,
    drones:[], formationPeriod:0, settleUntil:0,
    triggers:{}, pendingShot:false, cooldown:0, bullets:[], effects:[], events:[], serial:0, shots:0, hits:0, misses:0 };
  syncFormation(world);return world;
}

function syncFormation(world, preferredId = null) {
  if(world.ledger.continuous){
    const active=world.ledger.threats.filter(t=>!['reserve','want'].includes(t.lane)&&t.remaining>0).sort((a,b)=>a.dueDay-b.dueDay||a.id.localeCompare(b.id));
    world.drones=world.drones.filter(d=>active.some(t=>t.id===d.targetId));
    // Preserve existing shares across paydays; each claim gets a bounded view.
    for(const t of active){
      let squad=world.drones.filter(d=>d.targetId===t.id);
      if(!squad.length&&world.drones.length<60){
        const count=Math.max(1,Math.min(5,Math.floor(60/Math.max(1,active.length)),60-world.drones.length,t.remaining));
        squad=Array.from({length:count},(_,slot)=>({id:`${t.id}:drone:${slot}`,targetId:t.id,slot,remaining:Math.floor(t.remaining/count)+(slot<t.remaining%count?1:0)}));world.drones.push(...squad);
      }
      let paid=squad.reduce((n,d)=>n+d.remaining,0)-t.remaining;
      for(const d of [...squad].sort((a,b)=>Number(b.id===preferredId)-Number(a.id===preferredId))){const x=Math.min(d.remaining,Math.max(0,paid));d.remaining-=x;paid-=x;}
    }
    world.formationPeriod=world.ledger.period;return;
  }
  if(world.formationPeriod!==world.ledger.period || !world.drones.length){
    world.formationPeriod=world.ledger.period;
    const hostiles=world.ledger.threats.filter(t=>t.lane!=='reserve'&&t.remaining>0),offsets={credit:0,living:0};
    const laneCounts={credit:hostiles.filter(t=>t.lane==='credit').length,living:hostiles.filter(t=>t.lane==='living').length};
    world.drones=hostiles.flatMap(t=>{
      const size=world.ledger.hangar?Math.max(1,Math.min(20,Math.floor(30/laneCounts[t.lane]))):SQUAD_SIZE;
      const count=Math.min(size,t.remaining);
      if(world.ledger.hangar){t.formationOffset=offsets[t.lane];offsets[t.lane]+=count;}
      return Array.from({length:count},(_,slot)=>({id:`${t.id}:drone:${slot}`,targetId:t.id,slot,
        remaining:Math.floor(t.remaining/count)+(slot<t.remaining%count?1:0)}));
    });
  }
  for(const target of world.ledger.threats.filter(t=>t.lane!=='reserve')){
    const squad=world.drones.filter(d=>d.targetId===target.id);
    let paid=squad.reduce((sum,d)=>sum+d.remaining,0)-target.remaining;
    for(const d of [...squad].sort((a,b)=>Number(b.id===preferredId)-Number(a.id===preferredId))){
      const amount=Math.min(d.remaining,Math.max(0,paid));d.remaining-=amount;paid-=amount;
    }
  }
}

export function combatActors(world, time = world.time) {
  const defenseIndex=Math.max(0,world.ledger.defenses.findIndex(d=>d.owned&&d.condition>0));
  return world.ledger.threats.flatMap((target,index)=>{
    if(target.lane==='reserve'||target.lane==='want')return [{id:target.id,target,slot:0,index,remaining:target.remaining,...targetPosition(target,time,index)}];
    if((target.impacted&&!world.ledger.continuous)||target.remaining<=0)return [];
    return world.drones.filter(d=>d.targetId===target.id&&d.remaining>0).map(d=>
      ({...d,target,index,...targetPosition(target,time,index,d.slot,defenseIndex)}));
  });
}

export function setTrigger(world, source, active) {
  if(active&&!world.triggers[source])world.pendingShot=true;
  world.triggers[source]=active;
  world.firing=Object.values(world.triggers).some(Boolean);
}
export function clearTriggers(world) { world.triggers={}; world.firing=false; world.autoFire=false; world.pendingShot=false; }
export function reserveDepositBlocked(world) {
  const funding=world.source==='auto'?(world.ledger.incomeWallet>0?'income':'reserve'):world.source;
  return !!world.ledger.continuous&&funding==='reserve'&&world.ledger.threats.some(t=>t.id===world.hoveredId&&t.lane==='reserve');
}
export function setAim(world, x, z) {
  world.aim={x:Math.max(-11,Math.min(11,x)),z:Math.max(-7.5,Math.min(9,z))};
  world.lockedId=null;
}
export function aimAtTarget(world, id) {
  const actor=combatActors(world).find(p=>p.target.id===id);
  if(!actor)return;
  world.aim={x:actor.x,z:actor.z}; world.lockedId=world.assist?actor.id:null;
  world.ledger.selectedId=id;
}

function event(world, type, point, amount=0, id=null, actorId=null) {
  const e={serial:++world.serial,type,x:point.x,z:point.z,amount,targetId:id,actorId,born:world.time};
  world.events.push(e); world.effects.push(e);
}

// Earliest intersection along the segment, including moving targets via relative motion.
export function segmentHit(ax,az,bx,bz,cx,cz,radius) {
  const dx=bx-ax,dz=bz-az,fx=ax-cx,fz=az-cz;
  const a=dx*dx+dz*dz,c=fx*fx+fz*fz-radius*radius;
  if(c<=0)return 0;
  if(a<1e-12)return null;
  const b=2*(fx*dx+fz*dz),d=b*b-4*a*c;
  if(d<0)return null;
  const t=(-b-Math.sqrt(d))/(2*a);return t>=0&&t<=1?t:null;
}

function step(world, dt) {
  syncFormation(world);
  const previousTime=world.time; world.time+=dt;
  const targets=combatActors(world);
  if(world.assist&&world.lockedId){
    const p=targets.find(t=>t.id===world.lockedId);
    if(p)world.aim={x:p.x,z:p.z};else world.lockedId=null;
  }
  const desired=Math.atan2(world.aim.x-TURRET.x,TURRET.z-world.aim.z);
  const delta=wrapAngle(desired-world.angle);
  world.angle=wrapAngle(world.angle+Math.sign(delta)*Math.min(Math.abs(delta),dt*9));
  world.hoveredId=targets.find(p=>Math.hypot(p.x-world.aim.x,p.z-world.aim.z)<p.radius)?.target.id??null;
  if(world.hoveredId)world.ledger.selectedId=world.hoveredId;
  // Retain at most one simulation step of overshoot while firing. This keeps
  // rapid cadence independent of frame rate without banking shots while idle.
  world.cooldown=Math.max(-dt,world.cooldown-dt);
  const funding=world.source==='auto'?(world.ledger.incomeWallet>0?'income':'reserve'):world.source;
  const rejection=world.ledger.continuous&&targets.some(t=>t.target.lane==='want'&&t.target.id===world.hoveredId);
  const balance=funding==='reserve'?world.ledger.reserves:world.ledger.incomeWallet;
  const blocked=reserveDepositBlocked(world);
  if(blocked&&(world.firing||world.autoFire||world.pendingShot)){
    world.ledger.notice='Reserve tank accepts income only. Aim at a bill or Want-bot.';world.pendingShot=false;
  }
  if(!blocked&&(world.firing||world.autoFire||world.pendingShot)&&world.cooldown<=0&&(balance>0||rejection)&&Math.abs(wrapAngle(desired-world.angle))<.075){
    const dx=Math.sin(world.angle),dz=-Math.cos(world.angle);
    const id=++world.serial;
    if(world.ledger.continuous&&!rejection){world.ledger=holdShot(world.ledger,String(id),world.source,shotValue(world.ledger),world.hoveredId);
      if(world.lastSource==='income'&&funding==='reserve')world.ledger.notice='Income depleted — using reserves';world.lastSource=funding;}
    world.bullets.push({id,x:TURRET.x+dx*1.2,z:TURRET.z+dz*1.2,dx,dz,source:funding,rejection,travel:0});
    world.cooldown+=1/firingRate(world.ledger);world.pendingShot=false;world.shots++;event(world,'shot',TURRET);
  }
  const remaining=[];
  for(const bullet of world.bullets){
    const nx=bullet.x+bullet.dx*BULLET_SPEED*dt,nz=bullet.z+bullet.dz*BULLET_SPEED*dt;
    let best=null,bestT=Infinity;
    for(const p of combatActors(world)){
      if(world.ledger.continuous&&((p.target.lane==='reserve'&&bullet.source==='reserve')||(bullet.rejection&&p.target.lane!=='want')))continue;
      const old=targetPosition(p.target,previousTime,p.index,p.slot,Math.max(0,world.ledger.defenses.findIndex(d=>d.owned&&d.condition>0)));
      const hit=segmentHit(bullet.x-old.x,bullet.z-old.z,nx-p.x,nz-p.z,0,0,p.radius+.1);
      if(hit!==null&&hit<bestT){best=p;bestT=hit;}
    }
    if(best){
      const before=world.ledger;
      const value=shotValue(before);
      let after,amount;
      if(before.continuous){
        const h=before.continuous.holds[String(bullet.id)],held=h?.amount??0;
        after=bullet.rejection?(best.target.lane==='want'?continuousAction(before,{type:'reject',offerId:best.target.id}):before):finishShot(before,String(bullet.id),best.target.id);
        const key=bullet.source==='reserve'?'reserves':'incomeWallet';
        amount=held-(after[key]-before[key]);
        if(best.target.lane==='reserve'&&bullet.source==='income')amount=after.reserves-before.reserves;
        if(best.target.lane==='want')event(world,'reject',best,0,best.target.id);
      }else{
        after=bullet.source==='reserve'?reserveFire(before,best.target.id,value):incomeFire(before,best.target.id,value);
        amount=bullet.source==='reserve'?before.reserves-after.reserves:before.incomeWallet-after.incomeWallet;
      }
      after.selectedId=best.target.id;
      const oldActors=combatActors(world);
      world.ledger=after;
      syncFormation(world,best.id);
      if(amount>0){
        world.hits++; event(world,best.target.lane==='reserve'?'deposit':'hit',best,amount,best.target.id,best.id);
        if(bullet.source==='reserve')event(world,'intercept',best,amount,best.target.id);
        for(const actor of oldActors)if(!['reserve','want'].includes(actor.target.lane)&&(world.drones.find(d=>d.id===actor.id)?.remaining??0)===0)event(world,'clear',actor,0,actor.target.id,actor.id);
      }else event(world,'blocked',best,0,best.target.id);
    }else{
      bullet.x=nx;bullet.z=nz;bullet.travel+=BULLET_SPEED*dt;
      if(bullet.travel<25&&Math.abs(nx)<11.5&&nz>-8&&nz<10)remaining.push(bullet);
      else{if(world.ledger.continuous)world.ledger=finishShot(world.ledger,String(bullet.id));world.misses++;event(world,'miss',{x:nx,z:nz});}
    }
  }
  world.bullets=remaining;
  const before=world.ledger;
  const oldActors=combatActors(world);
  const defenseIndex=Math.max(0,before.defenses.findIndex(d=>d.owned&&d.condition>0));
  const pace=(PACES[world.pace]??PACES.standard)*(1+(before.period-1)*.06);
  world.ledger=tickCampaign(before,before.continuous?dt:dt*pace);
  syncFormation(world);
  world.ledger.threats.forEach((t,index)=>{
    const old=before.threats.find(old=>old.id===t.id),point=targetPosition(t,world.time,index);
    if(!old)return;
    if(t.intercepted&&!old.intercepted&&t.reservePaid>old.reservePaid){
      for(const actor of oldActors.filter(a=>a.target.id===t.id)){
        const paid=actor.remaining-(world.drones.find(d=>d.id===actor.id)?.remaining??0);
        if(paid>0)event(world,'intercept',actor,paid,t.id,actor.id);
        if(paid===actor.remaining)event(world,'clear',actor,0,t.id,actor.id);
      }
    }
    if(t.overdue&&!old.overdue)event(world,'warning',point,0,t.id);
    if(t.impacted&&(!old.impacted||t.lastAttack!==old.lastAttack)){
      const survivors=world.drones.filter(d=>d.targetId===t.id&&d.remaining>0);
      survivors.forEach((d,i)=>event(world,i===0?'breach':'impact',defenseContact(t.lane,d.slot,defenseIndex),d.remaining,t.id,d.id));
    }
  });
  if(world.ledger.continuous&&world.time-world.lastMerge>=2){
    world.lastMerge=world.time;
    const actors=combatActors(world).filter(a=>a.target.lane==='credit');
    for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++){
      const a=actors[i],b=actors[j];if(a.target.id!==b.target.id||Math.hypot(a.x-b.x,a.z-b.z)>.65)continue;
      const x=world.drones.find(d=>d.id===a.id),y=world.drones.find(d=>d.id===b.id);
      if(x?.remaining>0&&y?.remaining>0){x.remaining+=y.remaining;y.remaining=0;}
    }
  }
  if(world.ledger.phase!==before.phase){
    event(world,world.ledger.phase==='gameover'?'defeat':'checkpoint',TURRET);clearTriggers(world);world.bullets=[];world.settleUntil=world.time+1.25;
  }
  world.effects=world.effects.filter(e=>world.time-e.born<1.25);
}

export function advanceCombat(world, seconds) {
  world.events=[];
  if(!Number.isFinite(seconds)||seconds<=0)return world;
  if(world.ledger.phase!=='playing'){
    // Finish particles before the review opens; the financial state is terminal.
    if(world.time<world.settleUntil)world.time=Math.min(world.settleUntil,world.time+Math.max(0,Math.min(.1,seconds)));
    world.effects=world.effects.filter(e=>world.time-e.born<1.25);return world;
  }
  if(world.ledger.paused)return world;
  // Ordinary slow frames retain every fixed step; long interruptions explicitly pause.
  if(world.ledger.continuous){
    if(seconds>MAX_ACTIVE_FRAME_SECONDS+1e-9){
      world.ledger={...world.ledger,paused:true,notice:INTERRUPTION_NOTICE};clearTriggers(world);return world;
    }
    world.accumulator+=seconds;
    while(world.accumulator+1e-9>=1/120&&world.ledger.phase==='playing'){step(world,1/120);world.accumulator-=1/120;}
    return world;
  }
  let remaining=Math.max(0,Math.min(.1,seconds));
  while(remaining>1e-8&&world.ledger.phase==='playing'){
    const dt=Math.min(1/120,remaining);step(world,dt);remaining-=dt;
  }
  return world;
}
