import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,createHangarCampaign,beginCampaign,shotValue} from '../lib/debtbreaker-engine.js';
import {enableContinuous,continuousAction,continuousSummary,basePlan,holdShot,finishShot,checkContinuous,tickContinuous} from '../lib/debtbreak-continuous.js';
import {createCombat,advanceCombat,combatActors,invaderPosition,radarSeconds,setWeapon,setAim,setTrigger,aimAtTarget} from '../lib/debtbreak-siege.js';
const start=()=>beginCampaign(enableContinuous(createCampaign(),{fictional:true}));
const step=(w,seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)advanceCombat(w,1/120);return w;};
const fire=(w)=>{setTrigger(w,'test',true);advanceCombat(w,1/120);setTrigger(w,'test',false);};
const payAll=s=>{for(const t of s.threats.filter(t=>['living','credit'].includes(t.lane)))for(const source of ['income','reserve'])s=continuousAction(s,{type:'pay',source,targetId:t.id,amount:t.remaining});return s;};

test('marching formation reverses and descends at the edges, accelerates, and stays bounded',()=>{
 const p=x=>invaderPosition(Math.sqrt(x/6));
 assert.ok(p(.4).x>p(.1).x);assert.ok(Math.abs(p(.8).x-p(.95).x)<1e-8);assert.ok(p(.95).z>p(.8).z);
 assert.ok(p(1.5).x<p(1.1).x);
 const first=Math.sqrt(1/6),last=1-Math.sqrt(5/6);assert.ok(last<first);
 for(let i=0;i<=100;i++)for(let slot=0;slot<16;slot++){const a=invaderPosition(i/100,slot);assert.ok(a.x>=50&&a.x<=950);assert.ok(a.z<=800);}
});
test('radar gives higher-credit players more real warning and preserves unknown APR',()=>{
 const picture=strength=>({kind:'current',inputs:{monthlyIncome:4000,monthlyLivingExpenses:1000,monthlyDebtPayments:200,totalDebt:10000,assetValue:20000,liquidReserves:5000,creditScore:strength==null?null:700},corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(k=>[k,{strength:k==='credit'?strength:.5,raw:{debtToValue:.5}}]))});
 const make=strength=>createCombat(beginCampaign(enableContinuous(createHangarCampaign(picture(strength),'B'))));
 const weak=make(0),strong=make(1),unknown=make(null);assert.equal(radarSeconds(weak.ledger),1);assert.equal(radarSeconds(strong.ledger),6);assert.equal(radarSeconds(unknown.ledger),1);
 const a=combatActors(strong,0).find(a=>a.target.lane==='credit');const warningAt=a.entryIn-3;
 assert.ok(combatActors(strong,warningAt).find(x=>x.id===a.id).warning);assert.equal(combatActors(weak,warningAt).find(x=>x.id===a.id).warning,false);
 assert.equal(a.visible,false);assert.equal(a.rate,null);assert.equal(a.highRate,false);
 const f=combatActors(createCombat(start()),20).filter(a=>a.target.lane==='credit');assert.ok(f.some(a=>a.highRate&&a.rate===24));
});
test('missile trajectories are deterministic and enter from multiple edges',()=>{
 const a=createCombat(start()),b=createCombat(start());assert.deepEqual(combatActors(a,12),combatActors(b,12));
 const missiles=combatActors(a,0).filter(a=>a.target.lane==='credit');assert.ok(new Set(missiles.map(a=>a.x<0?'left':a.x>1000?'right':'top')).size>=2);
});
test('there is no reserve tank and dollars remain conserved across multiple bodies',()=>{
 const w=createCombat(start());assert.equal(combatActors(w).some(a=>a.target.lane==='reserve'),false);
 for(const t of w.ledger.threats.filter(t=>['credit','living'].includes(t.lane)))assert.equal(w.drones.filter(d=>d.targetId===t.id).reduce((n,d)=>n+d.remaining,0),t.remaining);
 checkContinuous(w.ledger);
});
test('intercept is one laser per press; it pays actual dollars and cannot farm tanks',()=>{
 const w=createCombat(start());w.ledger.continuous.autoProtect=false;step(w,18);
 const missile=combatActors(w).find(a=>a.target.lane==='credit'&&a.visible);aimAtTarget(w,missile.target.id);
 const before=continuousSummary(w.ledger).debtPaid;setTrigger(w,'test',true);step(w,1);
 assert.equal(w.shots,1);assert.ok(continuousSummary(w.ledger).debtPaid>before);assert.ok(continuousSummary(w.ledger).debtPaid-before<=shotValue(w.ledger)*4);assert.equal(continuousSummary(w.ledger).held,0);checkContinuous(w.ledger);
 setTrigger(w,'test',false);setAim(w,20,850);const funds=w.ledger.incomeWallet;fire(w);assert.equal(w.ledger.incomeWallet,funds);checkContinuous(w.ledger);
});
test('rapid fire launches repeat projectiles at Utilitanks and does not pay debt missiles',()=>{
 const w=createCombat(start());setWeapon(w,'rapid');const tank=combatActors(w).find(a=>a.target.lane==='living');aimAtTarget(w,tank.target.id);setTrigger(w,'test',true);step(w,4);
 assert.ok(w.shots>3);assert.ok(continuousSummary(w.ledger).livingPaid>0);assert.equal(continuousSummary(w.ledger).debtPaid,0);checkContinuous(w.ledger);
});
test('wants remain free to slash and never become an automatic purchase',()=>{
 let s=start();s=continuousAction(s,{type:'deposit',amount:s.incomeWallet});s.reserves=0;s.initialReserves=-s.incomeReceived;
 const w=createCombat(s);const want=combatActors(w).find(a=>a.target.lane==='want');aimAtTarget(w,want.target.id);fire(w);step(w,6);
 assert.equal(w.ledger.continuous.offers.find(o=>o.id===want.id).status,'declined');assert.equal(w.ledger.continuous.purchases,0);assert.equal(w.ledger.incomeWallet,0);assert.equal(w.ledger.reserves,0);checkContinuous(w.ledger);
});
test('ordinary low frame rates stay deterministic and long interruptions pause before firing',()=>{
 const run=fps=>{const w=createCombat(start());setWeapon(w,'rapid');aimAtTarget(w,combatActors(w).find(a=>a.target.lane==='living').target.id);setTrigger(w,'test',true);for(let n=0;n<fps*6;n++)advanceCombat(w,1/fps);return w;};
 const a=run(60),b=run(5);assert.deepEqual(a.ledger,b.ledger);assert.equal(a.shots,b.shots);assert.deepEqual(a.bullets,b.bullets);checkContinuous(a.ledger);
 const w=createCombat(start());setTrigger(w,'test',true);advanceCombat(w,1);assert.equal(w.ledger.paused,true);assert.equal(w.shots,0);assert.equal(w.time,0);
});
test('clearing a squad does not shift surviving tank slots',()=>{
 const w=createCombat(start()),tank=combatActors(w).filter(a=>a.target.lane==='living')[1],before={x:tank.x,z:tank.z};
 w.ledger=continuousAction(w.ledger,{type:'pay',source:'income',targetId:tank.target.id,amount:100});advanceCombat(w,1/120);
 const after=combatActors(w,0).find(a=>a.id===tank.id);assert.deepEqual({x:after.x,z:after.z},before);
});
test('expansion uses only reserve surplus after uncovered bills, without locking the reserve goal',()=>{
 let s=start();s.continuous.base.goalMonths=1;
 s=continuousAction(s,{type:'deposit',amount:s.incomeWallet});let p=basePlan(s);
 assert.ok(p.uncovered>0);assert.equal(p.surplus,Math.max(0,s.reserves-p.uncovered));
 const blocked=continuousAction(s,{type:'expand',source:'income'});assert.equal(blocked.reserves,s.reserves);
 s=payAll(s);p=basePlan(s);assert.ok(p.canExpand);
 const cash=s.reserves,condition=s.defenses.reduce((n,d)=>n+d.condition,0);
 s=continuousAction(s,{type:'expand',source:'reserve',id:'build-1'});assert.equal(s.reserves,cash-15000);assert.equal(s.continuous.base.spent,15000);assert.equal(s.defenses.reduce((n,d)=>n+d.condition,0),condition+25);
 assert.equal(continuousSummary(s).expansions,15000);assert.equal(basePlan(s).goal,p.goal);checkContinuous(s);
 assert.deepEqual(continuousAction(s,{type:'expand',source:'reserve',id:'build-1'}),s);
});
test('matching projectile commitments are earmarked once, and unclaimed shots do not cover bills',()=>{
 let s=start();s=continuousAction(s,{type:'deposit',amount:s.incomeWallet});const target=s.threats.find(t=>t.kind==='debt');
 const before=basePlan(s);s=holdShot(s,'bill','reserve',1000,target.id);
 assert.equal(basePlan(s).uncovered,before.uncovered-1000);assert.equal(basePlan(s).surplus,before.surplus);checkContinuous(s);
 s=finishShot(s,'bill');s=holdShot(s,'miss','reserve',1000,null);assert.equal(basePlan(s).uncovered,before.uncovered);checkContinuous(s);
});
test('ten current-tier expansions form a bounded goal and replay resets purchases',()=>{
 let s=start();s.continuous.base.goalMonths=1;
 for(let cycle=0;cycle<3;cycle++){s=payAll(s);s=continuousAction(s,{type:'deposit',amount:s.incomeWallet});s=tickContinuous(s,60);}
 s=payAll(s);s=continuousAction(s,{type:'deposit',amount:s.incomeWallet});
 for(let i=0;i<10;i++){assert.ok(basePlan(s).canExpand);s=continuousAction(s,{type:'expand',source:'reserve'});checkContinuous(s);}
 assert.equal(s.continuous.base.expansions,10);assert.equal(basePlan(s).canExpand,false);const before=s.reserves;s=continuousAction(s,{type:'expand',source:'reserve'});assert.equal(s.reserves,before);
 assert.equal(start().continuous.base.expansions,0);
});
