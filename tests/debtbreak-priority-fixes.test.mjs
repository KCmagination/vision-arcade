import test from 'node:test';
import assert from 'node:assert/strict';
import {createHangarCampaign,createCampaign,beginCampaign,shotValue} from '../lib/debtbreaker-engine.js';
import {enableContinuous,tickContinuous as tick,continuousAction as act,holdShot,finishShot,continuousSummary,checkContinuous,MAX_ACTIVE_WANTS} from '../lib/debtbreak-continuous.js';
import {createCombat,advanceCombat,combatActors,aimAtTarget,setTrigger,reserveDepositBlocked,targetPosition} from '../lib/debtbreaker-combat.js';
const picture=(inputs={})=>({kind:'current',inputs:{monthlyIncome:4250,monthlyLivingExpenses:1300,monthlyDebtPayments:400,totalDebt:98000,assetValue:140000,liquidReserves:20000,creditScore:760,...inputs},corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(key=>[key,{strength:.5,raw:key==='collateral'?{debtToValue:.7}:{}}]))});
const start=(inputs={},opts={})=>beginCampaign(enableContinuous(createHangarCampaign(picture(inputs),'A+'),opts));
const active=s=>s.continuous.offers.filter(o=>['flying','offered'].includes(o.status));

test('default, former opt-out, fictional, and replay missions all begin with Want-bots',()=>{
 const states=[start(),start({}, {wants:false}),beginCampaign(enableContinuous(createCampaign(),{fictional:true})),start()];
 for(const s of states){assert.equal(s.continuous.wantsEnabled,true);assert.ok(combatActors(createCombat(s)).some(a=>a.target.lane==='want'));checkContinuous(s);}
});

test('all 120 days retain bounded Want-bot activity, with an immediate surge after early clearance',()=>{
 let s=start();const originalPlan=s.continuous.cyclePlan[1];
 for(let day=0;day<120;day++){
   assert.equal(s.phase,'playing');assert.ok(active(s).length>0,`empty field on day ${day}`);assert.ok(active(s).length<=MAX_ACTIVE_WANTS);assert.ok(s.continuous.offers.length<=32);
   if(day===19){assert.equal(continuousSummary(s).unpaid,0);assert.equal(s.continuous.wantRush,true);assert.ok(active(s).length>=5);assert.equal(s.continuous.cyclePlan[1],originalPlan);}
   if(day===109){assert.ok(combatActors(createCombat(s)).filter(a=>a.target.lane==='want').length>=5);}
   s=tick(s,2);checkContinuous(s);
 }
 assert.equal(s.phase,'complete');assert.equal(s.incomeReceived,4*s.startingIncome);assert.equal(s.continuous.purchases,0);
 let early=start();const n=active(early).length;
 for(const t of early.threats.filter(t=>['living','credit'].includes(t.lane)))early=act(early,{type:'pay',targetId:t.id,source:'income',amount:t.remaining});
 assert.equal(early.continuous.wantRush,true);assert.equal(active(early).length,n+6);
});

test('zero-obligation, empty-wallet missions still reject Want-bots with free fire',()=>{
 const w=createCombat(start({monthlyIncome:0,monthlyLivingExpenses:0,monthlyDebtPayments:0,liquidReserves:0}));
 const want=combatActors(w).find(a=>a.target.lane==='want');w.assist=true;aimAtTarget(w,want.target.id);setTrigger(w,'key',true);
 for(let i=0;i<180&&w.ledger.continuous.offers.find(o=>o.id===want.target.id)?.status!=='declined';i++)advanceCombat(w,1/60);
 assert.equal(w.ledger.continuous.offers.find(o=>o.id===want.target.id).status,'declined');assert.ok(w.shots>0);assert.equal(w.ledger.incomeWallet,0);assert.equal(w.ledger.reserves,0);assert.equal(continuousSummary(w.ledger).held,0);checkContinuous(w.ledger);
});

test('manual and Auto reserves cannot launch at the tank through any firing trigger',()=>{
 for(const source of ['reserve','auto'])for(const trigger of ['button','pointer','key','pad','auto']){
   let s=tick(start(),38);s=act(s,{type:'deposit',amount:s.incomeWallet});const tank=s.threats.find(t=>t.lane==='reserve').id;
   const held=holdShot(s,'blocked',source,2500,tank);assert.equal(continuousSummary(held).held,0);
   const before=s.reserves,w=createCombat(s);w.source=source;w.assist=true;aimAtTarget(w,tank);
   if(trigger==='auto')w.autoFire=true;else setTrigger(w,trigger,true);
   for(let i=0;i<60;i++)advanceCombat(w,1/60);
   assert.equal(reserveDepositBlocked(w),true);assert.equal(w.shots,0);assert.equal(w.ledger.reserves,before);assert.equal(continuousSummary(w.ledger).held,0);checkContinuous(w.ledger);
 }
});

test('income deposits still work, then Auto stops when the last income shot is committed',()=>{
 const s=start({monthlyIncome:25,monthlyLivingExpenses:0,monthlyDebtPayments:0,liquidReserves:100});const tank=s.threats.find(t=>t.lane==='reserve').id;
 let held=holdShot(s,'deposit','income',2500,tank);assert.equal(continuousSummary(held).held,2500);held=finishShot(held,'deposit',tank);assert.equal(held.reserves,12500);checkContinuous(held);
 const w=createCombat(s);w.assist=true;aimAtTarget(w,tank);w.autoFire=true;
 for(let i=0;i<180&&w.ledger.reserves===s.reserves;i++)advanceCombat(w,1/60);
 assert.ok(w.shots>=Math.ceil(s.incomeWallet/shotValue(s)));assert.equal(w.ledger.reserves,12500);
 const shots=w.shots;for(let i=0;i<60;i++)advanceCombat(w,1/60);
 assert.equal(w.shots,shots);assert.equal(w.ledger.incomeWallet,0);assert.equal(reserveDepositBlocked(w),true);assert.equal(continuousSummary(w.ledger).held,0);checkContinuous(w.ledger);
});

test('pause freezes waves and clearing another bot never teleports surviving bots',()=>{
 let s=tick(start(),12);const bot=active(s).at(-1),target=s.threats.find(t=>t.id===bot.id),position=targetPosition(target,12,5);
 s=act(s,{type:'reject',offerId:active(s)[0].id});assert.deepEqual(targetPosition(s.threats.find(t=>t.id===bot.id),12,1),position);
 s.paused=true;assert.deepEqual(tick(s,240),s);
});
