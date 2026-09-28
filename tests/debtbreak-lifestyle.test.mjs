import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,beginCampaign} from '../lib/debtbreaker-engine.js';
import {enableContinuous,continuousAction as act,tickContinuous,continuousOutflow,lifestyleOutflow,lifestyleCoverage,capitalShield,continuousSummary,checkContinuous} from '../lib/debtbreak-continuous.js';
import {createCombat,advanceCombat,commandSword,combatActors} from '../lib/debtbreak-siege.js';
const start=()=>beginCampaign(enableContinuous(createCampaign(),{fictional:true,goalMonths:6}));
const pay=s=>{for(const t of s.threats.filter(t=>['living','credit'].includes(t.lane)))for(const source of ['income','reserve'])s=act(s,{type:'pay',targetId:t.id,amount:t.remaining,source});return s;};
const build=(s,n=10)=>{s=act(s,{type:'deposit',amount:s.incomeWallet});for(let i=0;i<n;i++)s=act(s,{type:'expand',source:'reserve'});return s;};
const finish=s=>{while(s.phase==='playing'){s=pay(s);s=tickContinuous(s,60);}return s;};
const step=(w,n)=>{for(let i=0;i<n*120;i++)advanceCombat(w,1/120);};
test('early complete footprint must survive four cycles; reserves are a power-up, not a win gate',()=>{
 let s=build(pay(start()));assert.equal(lifestyleCoverage(s).complete,true);assert.equal(capitalShield(s).charged,false);assert.equal(s.phase,'playing');assert.equal(s.continuous.mission,null);
 s=finish(s);assert.equal(s.continuous.summaries.length,4);assert.equal(s.continuous.mission.success,true);assert.equal(capitalShield(s).charged,false);checkContinuous(s);
});
test('paying every bill without covering the lifestyle does not win',()=>{const s=finish(start());assert.equal(s.phase,'complete');assert.equal(s.continuous.mission.success,false);assert.equal(s.continuous.mission.unpaid,0);});
test('destroyed required section prevents victory until repaired',()=>{
 let s=build(pay(start()));s.defenses.find(d=>d.id==='expansion:1').condition=0;assert.equal(lifestyleCoverage(s).active,9);
 const ended=finish(s);assert.equal(ended.continuous.mission.success,false);
 s=act(s,{type:'repair',source:'reserve',defenseId:'expansion:1',points:1});assert.equal(finish(s).continuous.mission.success,true);
});
test('downsizing queues future costs without refunding or rewriting issued claims',()=>{
 let s=pay(start()),before=structuredClone(s),outflow=continuousOutflow(s),allowance=s.continuous.lifestyle.adjustable;
 s=act(s,{type:'lifestyle',tier:1});assert.equal(continuousOutflow(s),outflow);assert.deepEqual(s.threats,before.threats);assert.equal(s.reserves,before.reserves);assert.equal(s.incomeWallet,before.incomeWallet);assert.equal(lifestyleCoverage(s).required,10);
 s=tickContinuous(s,60);assert.equal(continuousOutflow(s),outflow-allowance);assert.equal(lifestyleCoverage(s).required,7);assert.deepEqual(s.continuous.lifestyle.baseline,before.continuous.lifestyle.baseline);checkContinuous(s);
});
test('essential, current, expanded and back are absolute baseline choices, never compound discounts',()=>{
 let s=start(),original=continuousOutflow(s);for(const tier of [1,3,2]){s=act(pay(s),{type:'lifestyle',tier});s=tickContinuous(s,60);assert.equal(continuousOutflow(s),lifestyleOutflow(s));checkContinuous(s);}assert.equal(continuousOutflow(s),original);assert.equal(lifestyleCoverage(s).required,10);
 const locked=act(s,{type:'lifestyle',tier:1});assert.equal(locked.continuous.lifestyle.pending,null);assert.equal(locked.continuous.lifestyle.tier,2);
});
test('tier cancellation and zero allowance preserve a valid scenario',()=>{
 let s=start();s=act(s,{type:'lifestyle',tier:1,amount:0});assert.equal(s.continuous.lifestyle.pending.adjustable,0);s=act(s,{type:'cancelLifestyle'});assert.equal(s.continuous.lifestyle.pending,null);
 for(const amount of [-1,1.1,Number.NaN,1e9])assert.equal(act(s,{type:'lifestyle',tier:1,amount}).continuous.lifestyle.pending,null);
 const before=continuousOutflow(s);s=tickContinuous(act(pay(s),{type:'lifestyle',tier:1,amount:0}),60);assert.equal(continuousOutflow(s),before);assert.equal(lifestyleCoverage(s).required,7);
});
test('downsizing never sells extra walls or creates money',()=>{
 let s=build(pay(start()));const reserve=s.reserves,spent=continuousSummary(s).spent;s=act(s,{type:'lifestyle',tier:1});s=tickContinuous(s,60);
 assert.equal(s.reserves,reserve);assert.equal(continuousSummary(s).spent,spent);assert.equal(s.continuous.base.expansions,10);assert.equal(lifestyleCoverage(s).required,7);assert.equal(lifestyleCoverage(s).complete,true);checkContinuous(s);
});
test('charged shield reduces only game condition loss and disables below its goal',()=>{
 const initial=start();initial.continuous.autoProtect=false;initial.continuous.base.goalMonths=1;
 const goal=capitalShield(initial).goal;
 const run=reserve=>{let s=structuredClone(initial);s.initialReserves+=reserve-s.reserves;s.reserves=reserve;return tickContinuous(s,50);};
 const charged=run(goal),uncharged=run(goal-1);assert.ok(charged.totals.damage<uncharged.totals.damage);assert.equal(continuousSummary(charged).unpaid,continuousSummary(uncharged).unpaid);assert.equal(charged.reserves,goal);assert.equal(uncharged.reserves,goal-1);checkContinuous(charged);checkContinuous(uncharged);
});
test('Sentinel runs, freezes on pause, slashes once, and awards no cash',()=>{
 const w=createCombat(start()),before=continuousSummary(w.ledger),income=w.ledger.incomeWallet,reserve=w.ledger.reserves,id=combatActors(w).find(a=>a.target.lane==='want').id;
 assert.equal(commandSword(w,id),true);step(w,.5);assert.notEqual(w.sentinel.x,420);const frozen=structuredClone(w.sentinel);w.ledger.paused=true;step(w,3);assert.deepEqual(w.sentinel,frozen);w.ledger.paused=false;step(w,6);
 assert.equal(w.sentinel.cleared,1);assert.equal(w.ledger.continuous.offers.find(o=>o.id===id).status,'declined');assert.equal(commandSword(w,id),false);assert.equal(w.ledger.incomeWallet,income);assert.equal(w.ledger.reserves,reserve);assert.equal(continuousSummary(w.ledger).spent,before.spent);assert.equal(w.shots,0);checkContinuous(w.ledger);
});
test('a complete base with unpaid issued requirements is not a successful mission',()=>{
 let s=build(start());s.continuous.autoProtect=false;
 // Keep armor standing to isolate the financial objective from physical defeat.
 s.defenses[0].condition=10000;s.defenses[0].maxCondition=10000;
 s=tickContinuous(s,240);assert.equal(s.phase,'complete');assert.equal(lifestyleCoverage(s).complete,true);assert.ok(s.continuous.mission.unpaid>0);assert.equal(s.continuous.mission.success,false);checkContinuous(s);
});
