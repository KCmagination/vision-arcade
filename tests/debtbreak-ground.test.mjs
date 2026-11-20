import test from 'node:test';
import assert from 'node:assert/strict';
import {createHangarCampaign,beginCampaign,createCampaign} from '../lib/debtbreaker-engine.js';
import {enableContinuous,continuousAction as action,tickContinuous as tick,holdBlast,settleBlast,finishShot,impactGroundPacket,checkContinuous as check,continuousSummary as summary,continuousOutflow} from '../lib/debtbreak-continuous.js';
import {groundFunds,groundTarget,groundAssetPlan} from '../lib/debtbreak-ground-economy.js';
import {createCombat,advanceCombat,combatActors,setAim,setTrigger,hitGroundPacket} from '../lib/debtbreak-siege.js';
import {groundReadiness} from '../lib/debtbreak-readiness.js';
import {paydayClock} from '../lib/debtbreak-clock.js';
import {serializeGroundRun,parseGroundRun} from '../lib/debtbreak-ground-save.js';
const picture=(inputs={})=>({kind:'current',inputs:{monthlyIncome:4000,monthlyLivingExpenses:1000,monthlyDebtPayments:100,totalDebt:1000,assetValue:20000,liquidReserves:20000,creditScore:700,...inputs},corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(key=>[key,{strength:.5,raw:{}}]))});
function scenario(opts={}){const accounts=opts.accounts??[{id:'a',name:'Loan',type:'personal',balance:100000,payment:10000,rate:12,otherPayment:0,modeled:true,method:'daily-v1',interestCarry:0,periodInterest:0,lateFeeCents:2500,dueDay:15}];return beginCampaign(enableContinuous(createHangarCampaign(picture(opts.inputs),'C',{accounts,expenses:opts.expenses??[{id:'living',name:'Living',amount:100000}],issues:[],date:null,estimates:true}),{mode:'ground',seed:opts.seed??20260930,touch:opts.touch}));}
const requirements=s=>s.threats.filter(t=>['living','credit'].includes(t.lane)&&t.remaining>0);
const advance=(w,seconds)=>{for(let n=0;n<Math.round(seconds*60);n++)advanceCombat(w,1/60);return w;};

test('packet shield contacts obey consent, remaining claim, cap, depleted reserves and duplicate receipts',()=>{
 let s=scenario({inputs:{liquidReserves:60}}),target=requirements(s).find(t=>t.lane==='living');
 const before=s.reserves;
 s=impactGroundPacket(s,target.id,'no-consent',1000);assert.equal(s.reserves,before);
 s=action(s,{type:'allocations',extra:0,savings:0,reserve:10000});
 s=impactGroundPacket(s,target.id,'packet-a',10000);assert.equal(s.reserves,0);assert.equal(s.continuous.ground.reserveSpent,6000);
 assert.equal(s.threats.find(t=>t.id===target.id).remaining,94000);
 assert.equal(impactGroundPacket(s,target.id,'packet-a',10000),s);
 s=impactGroundPacket(s,target.id,'packet-b',10000);assert.equal(s.reserves,0);assert.equal(s.continuous.ground.reserveSpent,6000);check(s);
 let tiny=scenario({accounts:[],expenses:[{id:'small',name:'Bill',amount:150}]});const id=requirements(tiny)[0].id;
 tiny=action(tiny,{type:'allocations',extra:0,savings:0,reserve:10000});const reserve=tiny.reserves;
 tiny=impactGroundPacket(tiny,id,'first-body',100);tiny=impactGroundPacket(tiny,id,'second-body',100);
 assert.equal(tiny.reserves,reserve-150);assert.equal(requirements(tiny).length,0);
 assert.equal(impactGroundPacket(tiny,id,'third-body',100),tiny);assert.equal(summary(tiny).cashDifference,0);check(tiny);
});
test('missile armor hits refund held money until defeat; partial payment preserves the visual and ledger remainder',()=>{
 const w=createCombat(scenario()),packet=w.drones.find(d=>w.ledger.threats.find(t=>t.id===d.targetId)?.lane==='living');
 const original=packet.remaining,cash=w.ledger.incomeWallet;
 w.ledger=holdBlast(w.ledger,'armor','income',500);assert.equal(hitGroundPacket(w,packet.id,'armor'),0);
 assert.equal(packet.hp,1);w.ledger=finishShot(w.ledger,'armor');assert.equal(w.ledger.incomeWallet,cash);
 assert.equal(w.ledger.continuous.ground.learning.missRefunds,0);
 w.ledger=holdBlast(w.ledger,'pay','income',500);assert.equal(hitGroundPacket(w,packet.id,'pay'),500);
 w.ledger=finishShot(w.ledger,'pay');w.ledger=finishShot(w.ledger,'pay');assert.equal(packet.hp,2);
 assert.equal(packet.remaining,original-500);assert.equal(w.ledger.incomeWallet,cash-500);
 const target=w.ledger.threats.find(t=>t.id===packet.targetId);
 assert.equal(w.drones.filter(d=>d.targetId===target.id).reduce((n,d)=>n+d.remaining,0),target.remaining);check(w.ledger);
});
test('shield and an in-flight interceptor share one claim without duplicate billing across resume',()=>{
 let s=scenario({accounts:[],expenses:[{id:'one',name:'One bill',amount:1000}]}),id=requirements(s)[0].id;
 s=action(s,{type:'allocations',extra:0,savings:0,reserve:900});s=holdBlast(s,'flying','income',1000);
 const income=s.incomeWallet+1000,reserves=s.reserves;
 s=impactGroundPacket(s,id,'shield-contact',900);
 s=settleBlast(s,'flying',id,1000);s=finishShot(s,'flying');
 assert.equal(s.incomeWallet,income-100);assert.equal(s.reserves,reserves-900);assert.equal(s.continuous.livingPaid,1000);check(s);
 const w=parseGroundRun(serializeGroundRun(createCombat(s)));w.ledger.paused=false;
 assert.equal(impactGroundPacket(w.ledger,id,'shield-contact',900),w.ledger);assert.equal(summary(w.ledger).cashDifference,0);
});
test('both streams deliver staggered packets throughout a long due window with bounded live actors and conserved bills',()=>{
 const accounts=[{id:'long',name:'Loan',balance:100000,payment:10000,rate:0,otherPayment:0,modeled:true,method:'daily-v1',dueDay:30}];
 const w=createCombat(scenario({accounts}));w.ledger=action(w.ledger,{type:'autoTotems',enabled:false});
 for(let n=0;n<10;n++)w.ledger=action(w.ledger,{type:'expand',source:'reserve'});
 const planned=w.ledger.continuous.cyclePlan[1],seen=new Set(),arrivals={living:[],credit:[]};
 for(let n=0;n<59*30;n++){
  advanceCombat(w,1/30);
  const actors=combatActors(w).filter(a=>a.visible&&['living','credit'].includes(a.target.lane));
  assert.ok(actors.filter(a=>a.target.lane==='credit').length<=12);assert.ok(actors.filter(a=>a.target.lane==='living').length<=8);assert.ok(w.drones.length<=60);
  for(const a of actors){const key=a.id+':'+a.enteredAt;if(!seen.has(key)){seen.add(key);arrivals[a.target.lane].push(w.time);}}
  if(n%30===0)check(w.ledger);
 }
 for(const lane of ['living','credit']){assert.ok(arrivals[lane].length>=6);assert.ok(arrivals[lane].some(t=>t>40),`${lane} late entries: ${arrivals[lane]}`);}
 assert.equal(w.ledger.continuous.cyclePlan[1],planned);assert.equal(w.ledger.continuous.debtPaid,0);assert.equal(w.ledger.continuous.livingPaid,0);assert.equal(summary(w.ledger).cashDifference,0);
});
test('readiness follows actual affordability and warns when a wall removes the reserve-goal shield',()=>{
 let s=scenario({inputs:{liquidReserves:3300}}),q=groundReadiness(s);
 assert.equal(q.wall.ready,true);assert.equal(q.wall.losesShield,true);assert.ok(q.module.shortfall>0);assert.equal(q.module.ready,false);
 const wallet=s.incomeWallet;s=action(s,{type:'expand',source:'reserve'});assert.equal(s.incomeWallet,wallet);assert.equal(groundReadiness(s).wall.losesShield,false);check(s);
});

test('cycle recap attributes payments, partial returns and misses without double counting',()=>{
 let s=scenario();const living=requirements(s).find(t=>t.lane==='living');
 s=holdBlast(s,'partial','income',5000);s=settleBlast(s,'partial',living.id,2000);s=finishShot(s,'partial');s=finishShot(s,'partial');
 s=holdBlast(s,'miss','reserve',3000);s=finishShot(s,'miss');
 s=action(s,{type:'pay',targetId:living.id,amount:1000,source:'income',id:'manual'});s=action(s,{type:'pay',targetId:living.id,amount:1000,source:'income',id:'manual'});
 assert.equal(s.continuous.ground.learning.playerPaid,3000);
 assert.equal(s.continuous.ground.learning.missRefunds,3000);
 assert.equal(s.continuous.ground.learning.unusedRefunds,3000);
 const w=createCombat(s);advance(w,28);s=w.ledger;
 assert.equal(s.continuous.ground.learning.totemPaid,s.continuous.ground.autoPaid);
 assert.ok(s.continuous.ground.learning.totemPaid>0);
 assert.equal(s.continuous.ground.learning.playerPaid,3000);
 assert.equal(summary(s).cashDifference,0);check(s);
});
test('cycle recap survives checkpoints, closes once and marks legacy records partial',()=>{
 let s=scenario();for(const t of requirements(s))s=action(s,{type:'pay',targetId:t.id,amount:t.remaining,source:'income'});
 s=holdBlast(s,'late-miss','reserve',1234);const w=parseGroundRun(serializeGroundRun(createCombat(s)));
 s=w.ledger;s.paused=false;s=tick(s,60);
 assert.equal(s.continuous.summaries[0].learning.playerPaid,110000);
 assert.equal(s.continuous.ground.learning.cycle,2);assert.equal(s.continuous.ground.learning.playerPaid,0);
 s=finishShot(s,'late-miss');assert.equal(s.continuous.ground.learning.missRefunds,1234);
 assert.equal(s.continuous.summaries[0].learning.missRefunds,0);
 delete s.continuous.ground.learning;s=holdBlast(s,'old','income',400);delete s.continuous.holds.old.settled;s=finishShot(s,'old');
 assert.equal(s.continuous.ground.learning.complete,false);assert.equal(s.continuous.ground.learning.missRefunds,0);assert.equal(s.continuous.ground.learning.unusedRefunds,400);check(s);
});
test('ending a run refunds in-flight money as a cancellation, not a missed shot',()=>{
 let s=holdBlast(scenario(),'pending','income',1234);s=action(s,{type:'endRun'});
 assert.equal(s.continuous.ground.learning.cancelledReturns,1234);assert.equal(s.continuous.ground.learning.missRefunds,0);check(s);
});

test('wall feedback explains reserve-goal loss without changing cash or endless rules',()=>{
 let s=scenario({inputs:{liquidReserves:3450}});
 s=action(s,{type:'expand',source:'reserve'});
 assert.equal(s.reserves,330000);
 assert.doesNotMatch(s.notice,/Goal shield OFF|cycle four/);
 s=action(s,{type:'expand',source:'reserve'});
 assert.equal(s.reserves,315000);
 assert.match(s.notice,/Reserves \$3300.*\$3150/);
 assert.match(s.notice,/Goal shield OFF.*25% breach-damage reduction lost/);
 assert.doesNotMatch(s.notice,/cycle four/);
 assert.equal(summary(s).cashDifference,0);
 check(s);
});
test('blast settles multiple expense claims from exactly one allowance; missing and duplicate refunds are safe',()=>{
 let s=scenario({expenses:[{id:'a',name:'Food',amount:3000},{id:'b',name:'Power',amount:4000}]});const opening=s.incomeWallet,ts=requirements(s).filter(t=>t.lane==='living');
 s=holdBlast(s,'b','income',5000);s=settleBlast(s,'b',ts[0].id,3000);s=settleBlast(s,'b',ts[1].id,4000);assert.equal(s.continuous.livingPaid,5000);assert.equal(summary(s).held,0);s=finishShot(s,'b');s=finishShot(s,'b');assert.equal(s.incomeWallet,opening-5000);check(s);
 s=holdBlast(s,'miss','reserve',1234);const reserve=s.reserves;s=finishShot(s,'miss');assert.equal(s.reserves,reserve+1234);check(s);
});
test('totems share cash, protect living and earmarked savings, and require an extra allowance',()=>{
 let s=scenario();s=action(s,{type:'allocations',extra:10000,savings:290000,reserve:0});assert.equal(groundFunds(s).requiredAvailable,10000);
 const w=createCombat(s);advance(w,28);assert.equal(w.ledger.continuous.ground.autoPaid,10000);assert.equal(w.ledger.incomeWallet,390000);assert.equal(groundFunds(w.ledger).extraAvailable,0);assert.equal(w.ground.towerCursor>0,true);check(w.ledger);
});
test('required claims precede strategies; snowball, avalanche and chosen snowflake target are distinct',()=>{
 const accounts=[{id:'small',name:'Small',balance:50000,rate:5},{id:'high',name:'High',balance:100000,rate:25}].map(a=>({...a,payment:1000,otherPayment:0,modeled:true,method:'daily-v1',dueDay:15}));let s=scenario({accounts,expenses:[]});assert.equal(groundTarget(s).kind,'required');
 for(const t of requirements(s))s=action(s,{type:'pay',source:'income',targetId:t.id,amount:10000});
 assert.equal(groundTarget(s).accountId,'small');s=action(s,{type:'strategy',strategy:'avalanche'});assert.equal(groundTarget(s).accountId,'high');s=action(s,{type:'strategy',strategy:'snowflake',accountId:'small'});assert.equal(groundTarget(s).accountId,'small');check(s);
});
test('fixed point interceptor travels, grows and refunds a miss without homing',()=>{
 const w=createCombat(scenario());w.ledger=action(w.ledger,{type:'autoTotems',enabled:false});const before=w.ledger.incomeWallet;
 setAim(w,500,350);setTrigger(w,'pointer',true);setTrigger(w,'pointer',false);advance(w,.2);assert.equal(w.ground.projectiles.length,1);assert.equal(w.ground.blasts.length,0);assert.ok(summary(w.ledger).held>0);setAim(w,100,150);advance(w,.3);assert.equal(w.ground.blasts[0].x,500);assert.equal(w.ground.blasts[0].z,350);advance(w,1.2);assert.equal(w.ground.blasts.length,0);assert.equal(w.ledger.incomeWallet,before);check(w.ledger);
});
test('visible expense packets are paid by a real blast; debt packets never consume a blast',()=>{
 const w=createCombat(scenario());w.ledger=action(w.ledger,{type:'autoTotems',enabled:false});advance(w,5);const a=combatActors(w).find(a=>a.target.lane==='living'&&a.visible);assert.ok(a);for(let hit=0;hit<2;hit++){const aim=combatActors(w,w.time+.65).find(x=>x.id===a.id);setAim(w,aim.x,aim.z);setTrigger(w,'pointer',true);setTrigger(w,'pointer',false);advance(w,1.1);if(!hit){assert.equal(w.ledger.continuous.livingPaid,0);assert.equal(w.drones.find(d=>d.id===a.id).hp,1);}}assert.ok(w.ledger.continuous.livingPaid>0);assert.equal(w.ledger.continuous.debtPaid,0);check(w.ledger);
});
test('fees follow entered due date once; collision itself never assesses a fee',()=>{
 let s=scenario();s=tick(s,30);assert.equal(s.continuous.accounts[0].fees,0);s=tick(s,2);assert.equal(s.continuous.accounts[0].fees,2500);s=tick(s,2);assert.equal(s.continuous.accounts[0].feesPosted,2500);const w=createCombat(s);assert.ok(combatActors(w).filter(a=>a.target.lane==='credit').every(a=>a.fees===2500));check(s);
 const example=beginCampaign(enableContinuous(createCampaign(),{mode:'ground',fictional:true}));assert.ok(example.continuous.accounts.every(a=>a.dueDay===15));
});
test('asset purchase, delayed upkeep, sale cost, and replay guard reconcile independently',()=>{
 let s=scenario(),q=groundAssetPlan(s,continuousOutflow(s));assert.equal(q.floor,(110000+500)*3);assert.equal(q.canBuy,true);const reserve=s.reserves;
 s=action(s,{type:'moduleBuy',seq:1,id:'buy'});const id=s.continuous.ground.assets[0].id;assert.equal(s.reserves,reserve-15000);assert.equal(requirements(s).some(t=>t.kind==='upkeep'),false);assert.equal(action(s,{type:'moduleBuy',seq:1,id:'repeat'}),s);check(s);
 for(const t of requirements(s))s=action(s,{type:'pay',source:'income',targetId:t.id,amount:t.remaining});s=tick(s,60);assert.equal(requirements(s).find(t=>t.kind==='upkeep').remaining,500);
 s=action(s,{type:'moduleSell',assetId:id,seq:2});assert.equal(s.reserves,reserve-1200);assert.equal(s.continuous.ground.saleFees,1200);assert.equal(requirements(s).find(t=>t.kind==='upkeep').remaining,500);assert.equal(s.defenses.some(d=>d.id===id),false);check(s);
});
test('endless survives more than 120 days, archives paid history, and resume does not repeat payday',()=>{
 let s=scenario({accounts:[],expenses:[{id:'daily',name:'Living',amount:100}]});
 for(let cycle=0;cycle<20;cycle++){for(const t of requirements(s))s=action(s,{type:'pay',targetId:t.id,source:'income',amount:t.remaining});s=tick(s,60);check(s);}
 assert.equal(s.phase,'playing');assert.equal(s.period,21);assert.equal(s.incomeReceived,21*s.startingIncome);assert.ok(s.continuous.summaries.length<=12);assert.ok(s.continuous.log.length<=500);assert.ok(s.threats.length<80);
 const restored=parseGroundRun(serializeGroundRun(createCombat(s)));assert.equal(restored.ledger.paused,true);assert.equal(restored.ledger.incomeReceived,s.incomeReceived);assert.deepEqual(tick(restored.ledger,1000),restored.ledger);restored.ledger.paused=false;const next=tick(restored.ledger,1);assert.equal(next.incomeReceived,s.incomeReceived);check(next);
});
test('seeded life events repeat identically and terminal run refunds held money',()=>{
 const run=()=>{let s=scenario({accounts:[],expenses:[],seed:42});for(let i=0;i<12;i++){for(const t of requirements(s))s=action(s,{type:'pay',source:'income',targetId:t.id,amount:t.remaining});s=tick(s,60);}return s;};const a=run(),b=run();assert.deepEqual(a,b);assert.ok(a.continuous.ground.incidentCount>0);
 let s=holdBlast(a,'end','income',1234);s=action(s,{type:'endRun'});assert.equal(s.phase,'complete');assert.equal(summary(s).held,0);check(s);
});

test('ground totems leave linked living costs for interceptors and reserve defense respects its cap',()=>{
 let s=scenario({accounts:[{id:'linked',name:'Loan + tax',balance:100000,payment:15000,otherPayment:5000,rate:0,modeled:true,method:'daily-v1',dueDay:15}]});
 const w=createCombat(s);advance(w,28);assert.equal(w.ledger.continuous.debtPaid,10000);assert.equal(w.ledger.continuous.livingPaid,0);assert.equal(requirements(w.ledger).find(t=>t.kind==='cost').remaining,5000);check(w.ledger);
 s=action(s,{type:'allocations',extra:0,savings:0,reserve:1234});const opening=s.reserves,protectedWorld=createCombat(s);advance(protectedWorld,40);s=protectedWorld.ledger;assert.equal(s.continuous.ground.reserveSpent,1234);assert.equal(s.continuous.ground.learning.reservePaid,1234);assert.equal(s.continuous.ground.reserveAllowance,0);assert.equal(s.reserves,opening-1234);check(s);
});
test('touch uses longer expense travel while the same blast and packet money rules hold',()=>{
 const desktop=createCombat(scenario()),touch=createCombat(scenario({touch:true}));advance(desktop,5);advance(touch,5);
 const da=combatActors(desktop).filter(a=>a.target.lane==='living'),ta=combatActors(touch).filter(a=>a.target.lane==='living');assert.equal(ta[0].impactAt-da[0].impactAt,2);assert.equal(ta[0].enteredAt,da[0].enteredAt);assert.equal(ta[0].maxHp,da[0].maxHp);
 const run=fps=>{const w=createCombat(scenario());for(let n=0;n<fps*3;n++)advanceCombat(w,1/fps);return w.ledger;};assert.deepEqual(run(30),run(120));
});


test('ground stream stays spaced and bounded through an entire unfunded approach',()=>{
 const w=createCombat(scenario());w.ledger=action(w.ledger,{type:'autoTotems',enabled:false});
 let peak=0,minGap=Infinity;
 for(let frame=0;frame<60*45;frame++){
  advanceCombat(w,1/60);
  const tanks=combatActors(w).filter(a=>a.target.lane==='credit'&&a.visible);peak=Math.max(peak,tanks.length);
  for(let i=0;i<tanks.length;i++)for(let j=i+1;j<tanks.length;j++)minGap=Math.min(minGap,Math.hypot(tanks[i].x-tanks[j].x,tanks[i].z-tanks[j].z));
 }
 assert.ok(peak>=6&&peak<=12);assert.ok(minGap>=124.99,`minimum separation ${minGap}`);assert.equal(w.ledger.continuous.debtPaid,0);check(w.ledger);
});
test('totems wait for range, show armor damage before paying, and sustain the required stream',()=>{
 const w=createCombat(scenario());advance(w,5);assert.equal(w.ground.towerCursor,0);assert.equal(w.ledger.continuous.debtPaid,0);
 let damagedBeforePayment=false,clearedAt=null;
 for(let frame=0;frame<60*24;frame++){
  advanceCombat(w,1/60);
  if(!w.ledger.continuous.debtPaid&&combatActors(w).some(a=>a.hp<a.maxHp))damagedBeforePayment=true;
  if(!clearedAt&&!requirements(w.ledger).some(t=>t.lane==='credit'))clearedAt=w.time;
 }
 assert.equal(damagedBeforePayment,true);assert.ok(clearedAt>20&&clearedAt<30,`required cleared at ${clearedAt}`);
 assert.equal(w.ledger.continuous.debtPaid,10000);assert.equal(w.ledger.continuous.accounts[0].feesPosted,0);check(w.ledger);
});
test('funded extras stream after minimums, obey strategy changes and cancel without spending',()=>{
 const accounts=[{id:'small',name:'Small',balance:50000,rate:5},{id:'high',name:'High',balance:150000,rate:25}].map(a=>({...a,payment:1000,otherPayment:0,modeled:true,method:'daily-v1',dueDay:15}));
 const w=createCombat(scenario({accounts,expenses:[]}));w.ledger=action(w.ledger,{type:'allocations',extra:10000,savings:0,reserve:0});advance(w,27);
 assert.ok(combatActors(w).some(a=>a.extra&&a.target.accountId==='small'));assert.equal(requirements(w.ledger).filter(t=>t.lane==='credit').length,0);
 w.ledger=action(w.ledger,{type:'strategy',strategy:'avalanche'});advance(w,.1);assert.ok(combatActors(w).filter(a=>a.extra).every(a=>a.target.accountId==='high'));
 const spent=w.ledger.continuous.debtPaid;w.ledger=action(w.ledger,{type:'allocations',extra:0,savings:0,reserve:0});advance(w,10);
 assert.equal(combatActors(w).some(a=>a.extra),false);assert.equal(w.ledger.continuous.debtPaid,spent);check(w.ledger);
});
test('external payments reconcile queued packets and expense timing remains immutable',()=>{
 const w=createCombat(scenario());w.ledger=action(w.ledger,{type:'autoTotems',enabled:false});advance(w,8);
 const living=combatActors(w).filter(a=>a.target.lane==='living'),later=living.at(-1);
 w.ledger=action(w.ledger,{type:'pay',source:'income',targetId:living[0].target.id,amount:living[0].remaining});advance(w,.1);
 const after=combatActors(w).find(a=>a.id===later.id);assert.equal(after.impactAt,later.impactAt);assert.ok(Math.abs((after.entryIn+w.time)-(later.entryIn+w.time-.1))<1e-6);
 const debt=requirements(w.ledger).find(t=>t.lane==='credit');w.ledger=action(w.ledger,{type:'pay',source:'income',targetId:debt.id,amount:debt.remaining});advance(w,.1);
 assert.equal(combatActors(w).some(a=>a.target.lane==='credit'),false);check(w.ledger);
});
test('Payday uses each pace, freezes on pause and resumes across a single income deposit',()=>{
 for(const pace of ['relaxed','standard','pressure']){
  let s=beginCampaign(enableContinuous(createCampaign(),{mode:'ground',fictional:true,pace}));
  for(const t of requirements(s))s=action(s,{type:'pay',source:'income',targetId:t.id,amount:t.remaining});
  const duration=30*s.continuous.secondsPerDay;assert.equal(paydayClock(s).seconds,duration);
  s=tick(s,duration-1);assert.equal(paydayClock(s).time,'00:01');s.paused=true;const frozen=paydayClock(s);s=tick(s,100);assert.deepEqual(paydayClock(s),frozen);
  let w=parseGroundRun(serializeGroundRun(createCombat(s)));w.ledger.paused=false;const income=w.ledger.incomeReceived;advance(w,1);
  assert.equal(w.ledger.period,2);assert.equal(w.ledger.incomeReceived,income+s.startingIncome);assert.equal(paydayClock(w.ledger).seconds,duration);check(w.ledger);
 }
 const classic=beginCampaign(enableContinuous(createCampaign(),{fictional:true}));classic.period=4;classic.continuous.day=90;
 assert.equal(paydayClock(classic).label,'MISSION ENDS');assert.equal(paydayClock(classic).amount,0);classic.phase='complete';assert.equal(paydayClock(classic).seconds,0);
});
test('old checkpoints upgrade their spatial stream without altering money or pending blasts',()=>{
 const original=createCombat(scenario());setAim(original,500,350);setTrigger(original,'pointer',true);advance(original,.2);
 delete original.ground.streamVersion;const copy=parseGroundRun(serializeGroundRun(original)),income=copy.ledger.incomeReceived,held=summary(copy.ledger).held;
 copy.ledger.paused=false;advance(copy,.1);assert.equal(copy.ground.streamVersion,3);assert.equal(copy.ledger.incomeReceived,income);assert.equal(summary(copy.ledger).held,held);
 advance(copy,2);assert.equal(summary(copy.ledger).held,0);check(copy.ledger);
});

test('a partially funded armor kill preserves every unpaid cent and stops until funded',()=>{
 const w=createCombat(scenario());w.ledger=action(w.ledger,{type:'allocations',extra:0,savings:299900,reserve:0});advance(w,12);
 assert.equal(w.ledger.continuous.debtPaid,100);assert.equal(groundFunds(w.ledger).requiredAvailable,0);
 const debt=requirements(w.ledger).find(t=>t.lane==='credit');assert.equal(debt.remaining,9900);
 assert.equal(w.drones.filter(d=>d.targetId===debt.id).reduce((n,d)=>n+d.remaining,0),9900);check(w.ledger);
 const shots=w.ground.towerCursor;advance(w,2);assert.equal(w.ground.towerCursor,shots);
 w.ledger=action(w.ledger,{type:'allocations',extra:0,savings:0,reserve:0});advance(w,20);
 assert.equal(w.ledger.continuous.debtPaid,10000);check(w.ledger);
});
