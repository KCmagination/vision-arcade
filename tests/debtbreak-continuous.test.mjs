import test from 'node:test';
import assert from 'node:assert/strict';
import {createHangarCampaign,createCampaign,beginCampaign} from '../lib/debtbreaker-engine.js';
import {enableContinuous,continuousAction as action,tickContinuous as tick,holdShot,finishShot,checkContinuous as check,continuousSummary as summary,accountDebt,continuousOutflow} from '../lib/debtbreak-continuous.js';
import {createCombat,advanceCombat,combatActors,setTrigger,setAim} from '../lib/debtbreaker-combat.js';
const picture=(inputs={})=>({kind:'current',inputs:{monthlyIncome:4000,monthlyLivingExpenses:0,monthlyDebtPayments:100,totalDebt:1000,assetValue:1000,liquidReserves:0,creditScore:null,...inputs},corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(key=>[key,{strength:.5,raw:key==='collateral'?{debtToValue:1}:{}}]))});
function scenario(opts={}){
 const account={id:'a',name:'Loan',type:'personal',balance:100000,payment:10000,rate:12,otherPayment:0,modeled:true,method:'daily-v1',interestCarry:0,periodInterest:0,lateFeeCents:null,...opts.account};
 const s=beginCampaign(enableContinuous(createHangarCampaign(picture(opts.inputs),'C',{accounts:[account],expenses:opts.expenses??[],issues:[],date:null,estimates:true}),{wants:opts.wants}));s.continuous.autoProtect=false;return s;
}
const debt=s=>s.continuous.accounts[0];
const target=s=>s.threats.find(t=>t.kind==='debt');
function pay(s,n,source='income'){return action(s,{type:'pay',targetId:target(s).id,source,amount:n});}
test('required $300 paid $200 + $40 leaves $60, account debt $760, one breach',()=>{
 let s=scenario({inputs:{monthlyIncome:200,liquidReserves:40},account:{payment:30000,rate:0}});s.continuous.autoProtect=true;s=pay(s,20000);s=tick(s,46);
 assert.equal(target(s).remaining,6000);assert.equal(accountDebt(debt(s)),76000);assert.equal(s.arrears,6000);assert.equal(s.continuous.log.filter(l=>l.type==='breach').length,1);check(s);
});
test('same-time split payments give identical balances and no credit bonus',()=>{
 let a=scenario(),b=scenario();a=pay(a,10000);for(let i=0;i<4;i++)b=pay(b,2500);a=tick(a,60);b=tick(b,60);assert.equal(accountDebt(debt(a)),90900);assert.deepEqual(debt(a),debt(b));assert.equal(a.hangar.grade,'C');check(a);check(b);
});
test('interest accrues once per day, before-vs-after payment gives $909 vs $910',()=>{
 let early=pay(scenario(),10000),late=scenario();early=tick(early,60);late=tick(late,60);late=pay(late,10000);assert.equal(accountDebt(debt(early)),90900);assert.equal(accountDebt(debt(late)),91000);check(early);check(late);
});
test('frame-independent time, paused time, and zero interest',()=>{
 let a=scenario({account:{rate:0}}),b=structuredClone(a);a=tick(a,60);for(let i=0;i<3600;i++)b=tick(b,1/60);assert.deepEqual(debt(a),debt(b));assert.equal(b.continuous.day,30);assert.equal(debt(b).interest,0);b.paused=true;assert.deepEqual(tick(b,10000),b);check(b);
});
test('fee is assessed once after day 20 and day 50 is 30 days late; cure keeps history',()=>{
 let s=scenario({account:{rate:0,lateFeeCents:2500}});s=tick(s,40);assert.equal(debt(s).fees,0);s=tick(s,2);assert.equal(debt(s).fees,2500);s=tick(s,56);assert.equal(s.continuous.day,49);assert.equal(debt(s).lateHistory,false);s=tick(s,2);assert.equal(debt(s).lateHistory,true);s=pay(s,10000);assert.equal(target(s).remaining,0);assert.equal(s.arrears,0);assert.equal(debt(s).lateHistory,true);assert.equal(debt(s).feesPosted,2500);check(s);
});
test('fee delay and fee billing do not change previously issued requirements',()=>{
 let s=scenario({account:{rate:0,lateFeeCents:2500,feeDelayDays:5}});s=tick(s,50);assert.equal(debt(s).fees,0);s=tick(s,2);assert.equal(debt(s).fees,2500);assert.equal(target(s).original,10000);s=tick(s,8);assert.equal(s.threats.find(t=>t.cycle===2&&t.kind==='debt').original,12500);check(s);
});
test('holds isolate funds from repair and interception, duplicates and misses refund once',()=>{
 let s=scenario({inputs:{monthlyIncome:10,liquidReserves:40},account:{rate:0}});s=holdShot(s,'1','auto',2500,target(s).id);assert.equal(s.incomeWallet,0);assert.equal(s.continuous.holds['1'].source,'income');assert.equal(summary(s).held,1000);s=holdShot(s,'2','auto',2500,target(s).id);assert.equal(s.reserves,1500);s.defenses[0].condition=0;s=action(s,{type:'repair',source:'reserve',points:10});assert.equal(s.reserves,500);check(s);s=finishShot(s,'1');assert.equal(s.incomeWallet,1000);s=finishShot(s,'1');assert.equal(s.incomeWallet,1000);s=finishShot(s,'2',target(s).id);assert.equal(target(s).remaining,7500);check(s);
});
test('overpayment returns unused hold to original wallet; deposit is an internal transfer',()=>{
 let s=scenario({account:{rate:0,payment:1000}});s=holdShot(s,'x','income',2500,target(s).id);s=finishShot(s,'x',target(s).id);assert.equal(s.incomeWallet,399000);s=holdShot(s,'y','income',2500);s=finishShot(s,'y',s.threats.find(t=>t.lane==='reserve').id);assert.equal(s.reserves,2500);check(s);
});
test('repair caps at captured condition and supports negative reserves and partial packets',()=>{
 let s=scenario({inputs:{liquidReserves:500}});s.defenses[0].maxCondition=60;s.defenses[0].condition=55;s=action(s,{type:'repair',source:'reserve',points:10,id:'press'});assert.equal(s.defenses[0].condition,60);assert.equal(s.reserves,45000);s=action(s,{type:'repair',source:'reserve',points:10,id:'press'});assert.equal(s.reserves,45000);check(s);
 s=scenario({inputs:{liquidReserves:-50}});s=action(s,{type:'deposit',amount:4000});assert.equal(s.reserves,-1000);s=holdShot(s,'x','reserve');assert.equal(summary(s).held,0);check(s);
});
test('Want-bot arrival and timeout never charge; buy and rejection are deliberate and idempotent',()=>{
 let s=scenario();s=tick(s,20);assert.equal(s.continuous.purchases,0);assert.equal(s.continuous.offers[0].status,'declined');const o=s.continuous.offers.find(o=>o.status==='offered'),before=s.incomeWallet;s=action(s,{type:'buy',offerId:o.id,source:'income'});assert.equal(s.incomeWallet,before-o.cost);s=action(s,{type:'buy',offerId:o.id,source:'income'});assert.equal(s.incomeWallet,before-o.cost);s=tick(s,20);s=holdShot(s,'x','income');const balance=s.incomeWallet,rejected=s.continuous.offers.find(o=>o.status==='offered');s=finishShot(s,'x',rejected.id);assert.equal(s.incomeWallet,balance+2500);assert.equal(s.continuous.offers.find(o=>o.id===rejected.id).status,'declined');check(s);
});
test('4 fixed cycles credit only four paychecks, no early closure and terminal hold refunds',()=>{
 let s=scenario({account:{rate:0}});s=pay(s,10000);assert.equal(s.period,1);s=tick(s,59);assert.equal(s.period,1);s=holdShot(s,'flight','income',2500);s=tick(s,1);assert.equal(s.period,2);assert.ok(s.continuous.holds.flight);s=tick(s,180);assert.equal(s.phase,'complete');assert.equal(s.incomeReceived,1600000);assert.equal(s.continuous.summaries.length,4);assert.equal(summary(s).held,0);check(s);
});
test('old arrears stay collectible, extra payments are not permanently blocked',()=>{
 let s=scenario({account:{rate:0}});s=tick(s,60);assert.equal(s.threats.filter(t=>t.kind==='debt').length,2);s=action(s,{type:'pay',targetId:s.threats.find(t=>t.cycle===2&&t.kind==='debt').id,source:'income',amount:10000});assert.equal(target(s).remaining,0);assert.equal(s.arrears,0);s=action(s,{type:'pay',targetId:s.threats.find(t=>t.cycle===2&&t.kind==='debt').id,source:'income',amount:10000});s=action(s,{type:'extra',accountId:'a',source:'income',amount:10000});assert.equal(accountDebt(debt(s)),70000);check(s);
});
test('linked ongoing costs continue after payoff; no duplicated claims',()=>{
 let s=scenario({account:{balance:5000,payment:10000,otherPayment:2000,rate:0}});assert.equal(summary(s).planned,7000);s=pay(s,5000);assert.equal(s.continuous.livingPaid,2000);s=pay(s,5000);assert.equal(accountDebt(debt(s)),0);s=tick(s,60);assert.equal(s.continuous.cyclePlan[2],2000);assert.equal(continuousOutflow(s),2000);check(s);
});
test('monthly method charges opening principal once, daily engine never also charges',()=>{
 let s=scenario({account:{method:'monthly-v1'}});assert.equal(debt(s).interest,1000);s=pay(s,10000);s=tick(s,58);assert.equal(debt(s).interestPosted,1000);s=tick(s,2);assert.equal(debt(s).interestPosted,1910);check(s);
});
test('payments-only accounts never calculate a balance, interest, fees, or payoff',()=>{
 let s=scenario({account:{modeled:false,rate:null,lateFeeCents:2500}});s=tick(s,60);s=pay(s,10000);assert.equal(accountDebt(debt(s)),null);assert.equal(debt(s).interest,0);assert.equal(debt(s).fees,0);assert.equal(debt(s).payoffDay,null);check(s);
});
test('terminal failure resolves committed protection then refunds remaining holds',()=>{
 let s=scenario({inputs:{monthlyIncome:0,liquidReserves:0},account:{rate:0}});s.defenses.forEach(d=>{d.condition=0;d.maxCondition=0;});s=tick(s,46);assert.equal(s.phase,'gameover');assert.match(s.gameOverReason,/Loan breached/);check(s);
 s=scenario({inputs:{monthlyIncome:100},account:{rate:0}});s.defenses.forEach(d=>{d.condition=0;d.maxCondition=0;});s=holdShot(s,'protection','income',10000,target(s).id);s=tick(s,46);assert.equal(target(s).remaining,0);assert.equal(s.phase,'playing');check(s);
});
test('combat pays actual moving targets, held money reconciles each frame, merges conserve claims',()=>{
 const w=createCombat(scenario());w.assist=true;w.autoFire=true;
 for(let i=0;i<600;i++){const a=combatActors(w).find(a=>a.target.kind==='debt');if(a){w.lockedId=a.id;w.aim={x:a.x,z:a.z};}advanceCombat(w,1/60);check(w.ledger);}
 assert.ok(w.hits>0);assert.ok(debt(w.ledger).paid>0);assert.ok(w.drones.length<=60);
 for(const t of w.ledger.threats.filter(t=>t.kind==='debt'))assert.equal(w.drones.filter(d=>d.targetId===t.id).reduce((s,d)=>s+d.remaining,0),t.remaining);
});
test('frame rates produce the same ledger given the same held firing stream',()=>{
 const run=fps=>{const w=createCombat(scenario());w.assist=true;w.autoFire=true;const a=combatActors(w).find(a=>a.target.kind==='debt');w.lockedId=a.id;w.aim={x:a.x,z:a.z};for(let i=0;i<fps*5;i++)advanceCombat(w,1/fps);return w.ledger;};
 const a=run(30),b=run(60),c=run(120);assert.deepEqual(a,b);assert.deepEqual(b,c);check(a);
});
test('fractional payoff is rounded once, including a residual cent',()=>{
 let s=scenario({account:{balance:100,rate:100,payment:100}});s=tick(s,4);s=pay(s,100);assert.equal(debt(s).principal,0);assert.equal(debt(s).interest,1);s=action(s,{type:'extra',accountId:'a',source:'income',amount:1});assert.equal(accountDebt(debt(s)),0);assert.equal(debt(s).remainder,'0');check(s);
});
test('full fictional mission reconciles after mixed live actions and wants',()=>{
 let s=beginCampaign(enableContinuous(createCampaign({baseLiving:290000}),{fictional:true}));for(let day=0;day<120&&s.phase==='playing';day++){
   for(const t of s.threats.filter(t=>t.lane!=='reserve'&&t.lane!=='want'&&t.remaining>0))s=action(s,{type:'pay',targetId:t.id,source:'income',amount:t.remaining});
   if(day%30===12){const o=s.continuous.offers.find(o=>o.status==='offered');if(o)s=action(s,{type:'buy',offerId:o.id,source:'income'});}
   s=tick(s,2);check(s);
 }assert.equal(s.phase,'complete');assert.equal(summary(s).cashDifference,0);assert.equal(s.continuous.summaries.length,4);
});

const finalWall=s=>{s.defenses.forEach((d,i)=>{d.condition=i===0?1:0;});return s;};
test('cash alone no longer survives an unresolved final-defense breach',()=>{
 const initial=finalWall(scenario());let s=tick(initial,46);
 assert.equal(s.phase,'playing');assert.equal(s.continuous.rescue.remainingSeconds,10);
 const cash=s.incomeWallet;s=tick(s,9);assert.equal(s.continuous.rescue.remainingSeconds,1);
 s=tick(s,1);assert.equal(s.phase,'gameover');assert.match(s.gameOverReason,/Rescue expired/);
 assert.equal(s.incomeWallet,cash);assert.equal(s.elapsed,56);assert.equal(s.continuous.repairPaid,0);check(s);
 assert.deepEqual(tick(initial,240),s,'bulk replay must stop at the same rescue deadline');
});
test('rescue freezes on pause, partial payments do not extend it, repair must spend real cash',()=>{
 let s=tick(finalWall(scenario()),46);s=tick(s,3);s.paused=true;
 assert.deepEqual(tick(s,200),s);
 s=pay(s,100);assert.equal(s.continuous.rescue.remainingSeconds,7);
 const before=s.incomeWallet;s=action(s,{type:'repair',source:'income',points:1,id:'rescue-repair'});
 assert.equal(s.incomeWallet,before-1000);assert.equal(s.continuous.rescue,null);assert.equal(s.defenses[0].condition,1);
 assert.equal(s.continuous.repairPaid,1000);check(s);
 assert.deepEqual(action(s,{type:'repair',source:'income',points:1,id:'rescue-repair'}),s);
});
test('paying the breach from two wallets or a projectile completes rescue',()=>{
 let s=tick(finalWall(scenario({inputs:{monthlyIncome:50,liquidReserves:50},account:{rate:0}})),46);
 s=pay(s,5000,'income');assert.ok(s.continuous.rescue);s=pay(s,5000,'reserve');
 assert.equal(s.continuous.rescue,null);assert.equal(target(s).remaining,0);check(s);
 s=tick(finalWall(scenario()),46);s=holdShot(s,'rescue-shot','income',10000,target(s).id);
 s=finishShot(s,'rescue-shot',target(s).id);assert.equal(s.continuous.rescue,null);check(s);
});
test('a further unpaid breach ends rescue immediately without extending the countdown',()=>{
 let s=finalWall(scenario({expenses:[{id:'power',name:'Power',amount:10000}]}));
 s.threats.find(t=>t.kind==='living').dueDay=21;s=tick(s,46);assert.ok(s.continuous.rescue);
 s=tick(s,2);assert.equal(s.phase,'gameover');assert.match(s.gameOverReason,/Another unprotected breach/);check(s);
});
test('unaffordable rescue fails immediately; funds split below one repair point do not count',()=>{
 let s=tick(finalWall(scenario({inputs:{monthlyIncome:5,liquidReserves:5}})),46);
 assert.equal(s.phase,'gameover');assert.equal(s.continuous.rescue,null);check(s);
});
test('committed payments and enabled protection settle before judging an unprotected hit',()=>{
 let s=scenario({inputs:{liquidReserves:100},account:{rate:0}});s.defenses.forEach(d=>d.condition=0);
 s=tick(s,44);s.continuous.autoProtect=true;s=tick(s,2);
 assert.equal(target(s).remaining,0);assert.equal(s.phase,'playing');assert.equal(s.continuous.rescue,null);check(s);
});
test('mission completion waits for final-day rescue, then completes or fails exactly once',()=>{
 let s=scenario({account:{rate:0}});
 for(let cycle=0;cycle<3;cycle++){
  for(const t of s.threats.filter(t=>t.kind==='debt'))s=action(s,{type:'pay',targetId:t.id,source:'income',amount:t.remaining});
  s=tick(s,60);
 }
 s.threats.find(t=>t.cycle===4&&t.kind==='debt').dueDay=117;
 s=tick(finalWall(s),60);
 assert.equal(s.continuous.day,120);assert.equal(s.continuous.summaries.length,4);assert.equal(s.phase,'playing');assert.ok(s.continuous.rescue);
 const expired=tick(s,10);assert.equal(expired.phase,'gameover');assert.equal(expired.incomeReceived,4*expired.startingIncome);check(expired);
 s.paused=true;s=action(s,{type:'repair',source:'income',points:1});
 assert.equal(s.phase,'complete');assert.equal(s.continuous.summaries.length,4);assert.equal(s.continuous.log.filter(l=>l.type==='complete').length,1);check(s);
});
