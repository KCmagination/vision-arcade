import test from 'node:test';
import assert from 'node:assert/strict';
import {livingPressure,savingsGuide,collateralGuide,makeCreditLearning,closeCreditLearning,creditGuide,budgetGuide} from '../lib/debtbreak-command-learning.js';
import {createHangarCampaign,beginCampaign,reserveCoverage,recurringOutflow} from '../lib/debtbreaker-engine.js';
import {enableContinuous,continuousAction,continuousSummary,checkContinuous,tickContinuous} from '../lib/debtbreak-continuous.js';
const snapshot=(input={})=>({kind:'current',inputs:{monthlyIncome:4000,monthlyLivingExpenses:1000,monthlyDebtPayments:200,totalDebt:10000,assetValue:20000,liquidReserves:5000,creditScore:700,...input},corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(key=>[key,{status:'known',strength:.5,raw:key==='collateral'?{equity:10000,debtToValue:.5}:{}}]))});
const state=()=>beginCampaign(enableContinuous(createHangarCampaign(snapshot(),'C'),{mode:'base'}));
test('living pressure is living-only, retains >100%, and treats zero/missing denominators honestly',()=>{
 for(const [income,living,ratio,position] of [[2000,1000,.5,.5],[1000,900,.9,.9],[1000,1500,1.5,1]]){
  const p=livingPressure({hangar:{snapshot:snapshot({monthlyIncome:income,monthlyLivingExpenses:living,monthlyDebtPayments:9999})}});assert.equal(p.ratio,ratio);assert.equal(p.position,position);
 }
 for(const [income,living,kind] of [[0,100,'no-income'],[0,0,'neutral'],[null,100,'unknown'],[100,null,'unknown'],[undefined,100,'unknown'],[100,undefined,'unknown']]){const p=livingPressure({hangar:{snapshot:snapshot({monthlyIncome:income,monthlyLivingExpenses:living})}});assert.equal(p.kind,kind);assert.equal(p.ratio,null);}
});
test('spending savings reverses current funded markers rather than leaving permanent badges',()=>{
 let s=state();s.reserves=360000;s.initialReserves=360000;s.periodStartReserves=360000;
 const read=()=>savingsGuide(reserveCoverage(s),recurringOutflow(s));
 assert.deepEqual(read().markers.filter(m=>m.reached).map(m=>m.value),[1,3]);
 s=continuousAction(s,{type:'pay',source:'reserve',targetId:s.threats.find(t=>t.lane==='living').id,amount:1});
 assert.deepEqual(read().markers.filter(m=>m.reached).map(m=>m.value),[1]);assert.equal(continuousSummary(s).cashDifference,0);checkContinuous(s);
});
test('split payments on the same obligation cannot award credit before the period or more than one period segment',()=>{
 function paid(parts){let s=state();s=continuousAction(s,{type:'commandPreset'});s=continuousAction(s,{type:'commandBudget',amount:120000});s=continuousAction(s,{type:'commandLaunch'});const id=s.threats.find(t=>t.lane==='credit').id;
  for(const amount of parts){s=continuousAction(s,{type:'commandPay',targetId:id,amount});assert.equal(creditGuide(s).progress,0);}
  s=tickContinuous(s,60);checkContinuous(s);return s;
 }
 const split=paid([5000,5000,5000,5000]),single=paid([20000]);assert.deepEqual(creditGuide(split),creditGuide(single));assert.equal(creditGuide(split).periods,1);assert.equal(split.incomeWallet,single.incomeWallet);assert.equal(continuousSummary(split).cashDifference,0);
 const prior=structuredClone(split.continuous.ground.command.creditLearning);
 // A repeated notification for the already completed period cannot mint another segment.
 split.period=1;closeCreditLearning(split,split.threats.filter(t=>t.cycle===1));assert.deepEqual(split.continuous.ground.command.creditLearning,prior);
});
test('savings markers use canonical game coverage, retain >12 months and never fill with zero outflow',()=>{
 const s=state(),g=savingsGuide(reserveCoverage(s),recurringOutflow(s));assert.equal(g.months,500000/120000);assert.deepEqual(g.markers.filter(m=>m.reached).map(m=>m.value),[1,3]);
 assert.equal(savingsGuide(13.5,100).months,13.5);assert.equal(savingsGuide(13.5,100).markers.every(m=>m.reached),true);
 for(const outflow of [0,null,NaN]){const unavailable=savingsGuide(999,outflow);assert.equal(unavailable.months,null);assert.equal(unavailable.markers.some(m=>m.reached),false);}
});
test('collateral uses captured equity/total debt-to-assets; HP loss cannot change its needle',()=>{
 const s=state(),before=collateralGuide(s);s.defenses[0].condition=0;assert.deepEqual(collateralGuide(s),before);
 s.hangar.snapshot.corners.collateral.raw.equity=-100;s.hangar.snapshot.inputs.totalDebt=20100;assert.equal(collateralGuide(s).heat,1);assert.equal(collateralGuide(s).kind,'negative');
 s.hangar.snapshot.corners.collateral.raw.equity=0;assert.equal(collateralGuide(s).kind,'zero');
 s.hangar.snapshot.inputs.assetValue=0;assert.equal(collateralGuide(s).heat,null);
 s.hangar.snapshot.corners.collateral.status='unknown';assert.equal(collateralGuide(s).kind,'unknown');
});
test('credit progress counts due periods once, excludes late/empty rows and cannot farm borrow-repay repetitions',()=>{
 const s=state();s.continuous.accounts=[{method:'monthly-v1',principal:10000,interest:0,fees:0,payment:1000}];s.continuous.ground.command.creditLearning=makeCreditLearning(s.continuous.accounts);
 const paid=[{lane:'credit',original:1000,remaining:0,wasOverdue:false}],before=structuredClone(s.continuous.accounts);
 closeCreditLearning(s,paid);closeCreditLearning(s,paid);assert.equal(creditGuide(s).periods,1);assert.deepEqual(s.continuous.accounts,before);
 s.period=2;closeCreditLearning(s,[{...paid[0],wasOverdue:true}]);assert.equal(creditGuide(s).periods,1);closeCreditLearning(s,[]);assert.equal(creditGuide(s).periods,1);
 s.continuous.accounts[0].principal=5000;closeCreditLearning(s,paid);const once=structuredClone(s.continuous.ground.command.creditLearning);
 s.continuous.accounts[0].principal=10000;closeCreditLearning(s,paid);s.continuous.accounts[0].principal=5000;closeCreditLearning(s,paid);assert.deepEqual(s.continuous.ground.command.creditLearning,once);
 s.period=3;closeCreditLearning(s,paid);assert.equal(creditGuide(s).unlocked,true);assert.equal(creditGuide(s).progress,1);
});
test('payment-only and no-debt modes do not invent balance reduction or on-time events',()=>{
 const s=state();closeCreditLearning(s,[]);assert.equal(creditGuide(s).balanceKnown,false);assert.equal(creditGuide(s).progress,0);
 s.continuous.accounts=[];s.continuous.ground.command.creditLearning=makeCreditLearning([]);closeCreditLearning(s,[]);assert.equal(creditGuide(s).hasDebt,false);assert.equal(creditGuide(s).progress,0);
});
test('budget is a cap on the wallet, reserve transfers conserve total cash, and reads leave financial state untouched',()=>{
 let s=state();s.incomeWallet+=12300;s.carriedIncome=12300;s.incomeReceived+=12300;
 const before=structuredClone(s);const p=budgetGuide(s,120000,500000,120000);assert.equal(p.spendingLeft,292300);assert.equal(p.savingsLeft,500000);assert.equal(p.reserveSpend,0);
 livingPressure(s);collateralGuide(s);creditGuide(s);savingsGuide(reserveCoverage(s),recurringOutflow(s));assert.deepEqual(s,before);
 const sum=s.incomeWallet+s.reserves;s=continuousAction(s,{type:'deposit',amount:10000});assert.equal(s.incomeWallet+s.reserves,sum);assert.equal(s.incomeWallet,before.incomeWallet-10000);assert.equal(s.reserves,before.reserves+10000);assert.equal(s.incomeReceived,before.incomeReceived);assert.equal(continuousSummary(s).cashDifference,0);checkContinuous(s);
 assert.equal(budgetGuide({...s,reserves:0},Infinity,90000,120000).backup,0);assert.equal(budgetGuide({...s,reserves:-100},0,1000,120000).savingsLeft,-100);
});
