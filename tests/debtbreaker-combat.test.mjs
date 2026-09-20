import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { beginCampaign, createCampaign, incomeFire, reserveFire, startNextPeriod, tickCampaign, missionSummary, repairDefense, buyUpgrade, sellDefense, financeReplacement } from '../lib/debtbreaker-engine.js';
import { createCombat, advanceCombat, setAim, aimAtTarget, setTrigger, clearTriggers, targetPosition, TURRET, segmentHit, wrapAngle } from '../lib/debtbreaker-combat.js';

const playing=options=>beginCampaign(createCampaign(options));
const tank=s=>s.threats.find(t=>t.lane==='reserve');
const seconds=(w,n,aim)=>{for(let t=0;t<n;t+=1/60){aim?.(w);advanceCombat(w,1/60);}return w;};
const track=(w,id)=>{const i=w.ledger.threats.findIndex(t=>t.id===id),p=targetPosition(w.ledger.threats[i],w.time,i);setAim(w,p.x,p.z);};
const finish=s=>tickCampaign(s,100);

test('v31: manual is the default; neither aiming nor selecting pays',()=>{
  const w=createCombat(playing());const original=w.ledger.incomeWallet;
  assert.equal(w.autoFire,false);assert.equal(w.assist,false);assert.equal(w.firing,false);
  aimAtTarget(w,tank(w.ledger).id);seconds(w,1);
  assert.equal(w.shots,0);assert.equal(w.ledger.incomeWallet,original);
});

for(const lane of ['living','credit','reserve'])test(`v31: real projectiles hit the moving ${lane} stream`,()=>{
  const w=createCombat(playing());const target=w.ledger.threats.find(t=>t.lane===lane),before=w.ledger.incomeWallet;
  setTrigger(w,'pointer',true);track(w,target.id);
  advanceCombat(w,.05);assert.equal(w.ledger.incomeWallet,before,'no instant payment on fire');
  seconds(w,2,w=>track(w,target.id));
  assert.ok(w.hits>0);assert.ok(w.ledger.incomeWallet<before);
  assert.equal(missionSummary(w.ledger).cashDifference,0);
  assert.ok(w.effects.some(e=>e.type===(lane==='reserve'?'deposit':lane==='credit'?'clear':'hit'))||w.ledger.threats.find(t=>t.id===target.id).remaining===0);
});

test('v31: misses travel to the edge without moving any money',()=>{
  const w=createCombat(playing());setAim(w,10,7);setTrigger(w,'button',true);
  const total=w.ledger.incomeWallet+w.ledger.reserves;
  seconds(w,2);assert.ok(w.shots>0);assert.ok(w.misses>0);assert.equal(w.hits,0);
  assert.equal(w.ledger.incomeWallet+w.ledger.reserves,total);assert.equal(w.ledger.totals.incomeSpent,0);
});

test('v31: full-field traversal is responsive and not lane restricted',()=>{
  const w=createCombat(playing());
  for(const [x,z] of [[-10,-6],[10,-6],[-10,4],[10,4],[0,9],[-2,8],[0,-7]]){
    setAim(w,x,z);seconds(w,.4);
    const desired=Math.atan2(x-TURRET.x,TURRET.z-z);
    assert.ok(Math.abs(wrapAngle(w.angle-desired))<.001,`barrel reaches ${x},${z}`);
  }
});

test('v31: moving tank reverses smoothly while hostiles advance',()=>{
  const w=createCombat(playing()),id=tank(w.ledger).id;
  const positions=[0,Math.PI/(2*.53),Math.PI/.53,3*Math.PI/(2*.53)].map(t=>targetPosition(tank(w.ledger),t).x);
  assert.deepEqual(positions.map(x=>Math.round(x)),[0,7,0,-7]);
  seconds(w,2);assert.ok(w.ledger.threats[0].progress>5);assert.equal(tank(w.ledger).id,id);
});

test('v31: reserve fire cannot farm the tank',()=>{
  const w=createCombat(playing());w.source='reserve';setTrigger(w,'button',true);
  const before=structuredClone(w.ledger);seconds(w,2,w=>track(w,tank(w.ledger).id));
  assert.ok(w.shots>0);assert.equal(w.hits,0);assert.equal(w.ledger.reserves,before.reserves);
  assert.equal(w.ledger.incomeWallet,before.incomeWallet);assert.equal(w.ledger.totals.reserveDeposited,0);
});

test('v31: reserve-funded projectile pays exactly once at collision',()=>{
  const w=createCombat(playing());const target=w.ledger.threats.find(t=>t.lane==='credit');
  w.source='reserve';setTrigger(w,'button',true);seconds(w,2,w=>track(w,target.id));
  assert.equal(w.ledger.threats.find(t=>t.id===target.id).remaining,0);
  assert.equal(w.ledger.threats.find(t=>t.id===target.id).reservePaid,target.original);
  assert.equal(w.ledger.totals.reserveSpent,w.ledger.threats.reduce((sum,t)=>sum+t.reservePaid,0));assert.equal(w.ledger.totals.incomeSpent,0);
  assert.equal(w.ledger.totals.damage,0);assert.equal(missionSummary(w.ledger).cashDifference,0);
});

test('v31: paused simulation freezes projectiles, targets, ledger and all trigger sources',()=>{
  const w=createCombat(playing());setTrigger(w,'pointer',true);setTrigger(w,'button',true);
  setTrigger(w,'pointer',false);assert.equal(w.firing,true,'releasing aim finger cannot cancel fire finger');
  w.autoFire=true;clearTriggers(w);assert.equal(w.firing,false);assert.equal(w.autoFire,false);
  w.ledger.paused=true;const before=structuredClone(w);advanceCombat(w,10);assert.deepEqual(w,before);
});

test('v31: assist follows only an explicitly selected target; manual input releases it',()=>{
  const w=createCombat(playing());w.assist=true;assert.equal(w.lockedId,null);
  aimAtTarget(w,tank(w.ledger).id);assert.equal(w.lockedId,tank(w.ledger).id);
  seconds(w,1);assert.ok(w.aim.x>0);setAim(w,-3,-2);assert.equal(w.lockedId,null);
  seconds(w,.2);assert.deepEqual(w.aim,{x:-3,z:-2});
});

test('v31: swept collision cannot tunnel through a target',()=>{
  assert.ok(segmentHit(-10,0,10,0,0,0,.5)>0);assert.equal(segmentHit(-10,2,10,2,0,0,.5),null);
});

test('v31: a short click or touch tap queues one shot while the barrel traverses',()=>{
  const w=createCombat(playing());setAim(w,10,0);setTrigger(w,'button',true);setTrigger(w,'button',false);
  seconds(w,1);assert.equal(w.shots,1);assert.equal(w.pendingShot,false);
});

test('v31: large frame gaps cannot skip defense decision time',()=>{
  const w=createCombat(playing());advanceCombat(w,60);assert.ok(w.time<=.100001);assert.equal(w.ledger.phase,'playing');
});

test('v31: deposits continue beyond the old $600 goal, never beyond income',()=>{
  let s=playing();const before=s.incomeWallet+s.reserves;
  for(let i=0;i<8;i++)s=incomeFire(s,tank(s).id);
  assert.equal(tank(s).remaining,0);assert.equal(tank(s).incomePaid,80000);
  s=incomeFire(s,tank(s).id,Number.MAX_SAFE_INTEGER);
  assert.equal(s.incomeWallet,0);assert.equal(s.reserves,before);
  assert.deepEqual(incomeFire(s,tank(s).id),s);assert.equal(missionSummary(s).cashDifference,0);
});

test('v31: unused income carries across payday without being earned twice',()=>{
  let s=finish(playing());const carry=s.incomeWallet;
  assert.equal(s.review.unallocatedIncome,carry);s=startNextPeriod(s);
  assert.equal(s.incomeWallet,carry+s.startingIncome);assert.equal(s.carriedIncome,carry);
  assert.equal(s.incomeReceived,800000);assert.equal(missionSummary(s).cashDifference,0);
});

test('v31: whole-mission totals include all four periods and reconcile',()=>{
  let s=playing();
  for(let i=0;i<4;i++){
    s=incomeFire(s,tank(s).id,70000);
    for(const t of s.threats.filter(t=>t.lane!=='reserve'))s=incomeFire(s,t.id,t.remaining);
    s=finish(s);assert.equal(missionSummary(s).cashDifference,0);
    if(i<3)s=startNextPeriod(s);
  }
  const m=missionSummary(s);assert.equal(s.phase,'complete');assert.equal(m.periods,4);
  assert.equal(m.incomeReceived,1600000);assert.equal(m.deposited,280000);
  assert.equal(m.incomePaid,s.history.reduce((sum,r)=>sum+r.incomeSpent-r.reserveDeposited,0));
  assert.ok(m.incomePaid>s.review.incomeSpent-s.review.reserveDeposited);assert.equal(m.unpaid,0);assert.equal(m.cashDifference,0);
});

test('v31: cash reconciliation includes repairs, equipment and net sale proceeds',()=>{
  let s=createCampaign({reserveMonths:12});s.phase='review';s.defenses[0].condition=60;s.unlockedTier=5;
  s=repairDefense(s,'wall','income');s.defenses[1].condition=70;s=repairDefense(s,'cover');
  s=buyUpgrade(s,2);s=sellDefense(s,'cover');const m=missionSummary(s);
  assert.equal(m.incomeRepairs,40000);assert.equal(m.reserveRepairs,30000);assert.ok(m.sales>0);assert.ok(m.equipment>0);assert.equal(m.cashDifference,0);
});

test('v31: existing defeat threshold remains terminal, with no automatic financing or restart',()=>{
  let s=playing({reserveMonths:0});s.incomeWallet=0;s.defenses.forEach(d=>{d.condition=0;});
  s=finish(s);assert.equal(s.phase,'gameover');assert.ok(s.arrears>0);assert.ok(s.gameOverReason);
  for(const action of [beginCampaign,startNextPeriod,financeReplacement,x=>tickCampaign(x,100),x=>incomeFire(x,tank(x).id),x=>reserveFire(x,x.threats[0].id)])assert.deepEqual(action(s),s);
});

test('v31: invalid shot values cannot contaminate the ledger',()=>{
  const s=playing();for(const amount of [NaN,Infinity,-100]){
    assert.equal(incomeFire(s,tank(s).id,amount).incomeWallet,s.incomeWallet);
    assert.equal(reserveFire(s,s.threats[0].id,amount).reserves,s.reserves);
  }
});

test('v31: all four pillars, turret, vault, gates and deposit sweep fit wide and narrow cameras',()=>{
  for(const aspect of [3,2,1.5,1,.6,.4]){
    const h=Math.max(8.4,12.2/aspect),camera=new THREE.OrthographicCamera(-h*aspect,h*aspect,h,-h,.1,100);
    camera.position.set(0,23,15);camera.lookAt(0,0,.5);camera.updateMatrixWorld();
    for(const p of [[-4.1,2.4,5],[4.1,2.4,5],[-4.1,2.4,8],[4.1,2.4,8],[0,0,9.3],[0,1,6.4],[-10.5,3.85,-5.25],[10.5,3.85,-5.25],[-8.5,2,-6.3],[8.5,2,-6.3]]){
      const v=new THREE.Vector3(...p).project(camera);assert.ok(Math.abs(v.x)<1&&Math.abs(v.y)<1,`${p} visible at aspect ${aspect}`);
    }
  }
});
