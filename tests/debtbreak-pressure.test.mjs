import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,createHangarCampaign,beginCampaign} from '../lib/debtbreaker-engine.js';
import {enableContinuous,tickContinuous,continuousSummary,checkContinuous,MAX_ACTIVE_WANTS} from '../lib/debtbreak-continuous.js';
import {createCombat,combatActors,advanceCombat,commandSword,UTILITANK_SPEED,DEBTONATOR_SPEED} from '../lib/debtbreak-siege.js';
const start=()=>beginCampaign(enableContinuous(createCampaign(),{fictional:true}));
const step=(w,n)=>{for(let i=0;i<Math.round(n*120);i++)advanceCombat(w,1/120);};
const empty=()=>{
 const inputs={monthlyIncome:0,monthlyLivingExpenses:0,monthlyDebtPayments:0,totalDebt:0,assetValue:10000,liquidReserves:0,creditScore:700};
 const p={kind:'current',inputs,corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(k=>[k,{strength:.5,raw:{}}]))};
 return createCombat(beginCampaign(enableContinuous(createHangarCampaign(p,'B'))));
};
test('one living-cost obligation starts with twelve tanks in three rows, with no duplicated dollars',()=>{
 const w=createCombat(start()),a=combatActors(w).filter(a=>a.target.lane==='living');assert.equal(a.length,12);assert.equal(new Set(a.map(a=>a.z)).size,3);
 const t=a[0].target;assert.equal(a.reduce((n,a)=>n+a.remaining,0),t.remaining);assert.equal(continuousSummary(w.ledger).cashDifference,0);
});
test('tank flight is twice as fast and missile flight five times as fast, with original due dates',()=>{
 const w=createCombat(start());for(const a of combatActors(w).filter(a=>a.target.lane!=='want')){
  const oldImpact=(a.target.dueDay+3)*w.ledger.continuous.secondsPerDay;
  const start=a.target.lane==='living'?0:a.entryIn,factor=a.target.lane==='living'?UTILITANK_SPEED:DEBTONATOR_SPEED;
  assert.ok(Math.abs((oldImpact-start)/(a.impactAt-start)-factor)<1e-10);assert.equal(a.target.dueDay,w.ledger.threats.find(t=>t.id===a.target.id).dueDay);
 }
});
test('normal and rush Want waves are doubled, arrive in half the time, and have separate lanes',()=>{
 let s=start();assert.equal(s.continuous.offers.length,2);assert.deepEqual(s.continuous.offers.map(o=>o.arrivalDay-o.spawnDay).sort(),[1,1.5]);
 s=tickContinuous(s,6);assert.equal(s.continuous.wantSerial,4);assert.equal(MAX_ACTIVE_WANTS,16);
 const w=empty();assert.equal(w.ledger.continuous.offers.length,6);assert.equal(new Set(combatActors(w).filter(a=>a.target.lane==='want').map(a=>Math.round(a.x/80))).size,6);checkContinuous(s);
});
test('accelerated contact can damage armor but cannot post an early fee or late status',()=>{
 const w=createCombat(start());w.ledger.continuous.autoProtect=false;const before=structuredClone(w.ledger);step(w,16);
 assert.ok(w.ledger.totals.damage>0);assert.equal(w.ledger.arrears,0);assert.ok(w.ledger.continuous.accounts.every(a=>a.feesPosted===0&&!a.lateHistory));
 assert.deepEqual(w.ledger.threats.filter(t=>t.lane==='credit').map(t=>t.dueDay),before.threats.filter(t=>t.lane==='credit').map(t=>t.dueDay));
 assert.equal(w.ledger.incomeWallet,before.incomeWallet);assert.equal(w.ledger.reserves,before.reserves);checkContinuous(w.ledger);
});
test('five one-hit clears charge the next strike, which clears several nearby ads without money',()=>{
 const w=empty();
 for(let n=1;n<=5;n++){
  assert.equal(commandSword(w),true);
  for(let i=0;i<600&&w.sentinel.cleared<n;i++)advanceCombat(w,1/120);
  assert.equal(w.sentinel.cleared,n);step(w,.65);
 }
 assert.equal(w.sentinel.charges,1);assert.equal(w.sentinel.powerStrikes,0);
 const before=w.sentinel.cleared;assert.equal(commandSword(w),true);
 for(let i=0;i<600&&w.sentinel.cleared===before;i++)advanceCombat(w,1/120);
 assert.equal(w.sentinel.powerStrikes,1);assert.ok(w.sentinel.cleared>=before+2);assert.equal(w.ledger.incomeWallet,0);assert.equal(w.ledger.reserves,0);assert.equal(w.ledger.continuous.purchases,0);checkContinuous(w.ledger);
 const reset=empty();assert.equal(reset.sentinel.cleared,0);assert.equal(reset.sentinel.charges,0);
});
test('a second target queues during a sword command; repeat taps do not add phantom hits',()=>{
 const w=empty(),[a,b]=combatActors(w).filter(a=>a.target.lane==='want');commandSword(w,a.id);commandSword(w,a.id);assert.equal(w.sentinel.queuedId,null);
 commandSword(w,b.id);assert.equal(w.sentinel.queuedId,b.id);w.ledger.paused=true;const frozen=structuredClone(w.sentinel);step(w,4);assert.deepEqual(w.sentinel,frozen);w.ledger.paused=false;step(w,5);
 assert.equal(w.sentinel.cleared,2);for(const id of [a.id,b.id])assert.equal(w.ledger.continuous.offers.find(o=>o.id===id).status,'declined');
});
