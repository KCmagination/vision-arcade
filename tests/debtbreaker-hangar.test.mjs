import assert from 'node:assert/strict';
import test from 'node:test';
import { createLoadout } from '../lib/arcade-engine.js';
import {
  beginCampaign, buyUpgrade, campaignView, createHangarCampaign, financeReplacement,
  incomeFire, missionSummary, recurringOutflow, repairDefense, reserveFire,
  sellDefense, startNextPeriod, tickCampaign,
} from '../lib/debtbreaker-engine.js';
import { advanceCombat, combatActors, createCombat, setAim, setTrigger } from '../lib/debtbreaker-combat.js';

// Public API-shaped fixtures. Strengths are supplied results, not recreated scores.
const picture = (inputs = {}, strengths = {}, kind = 'current') => ({
  kind, scoringVersion: 'test-public-contract',
  inputs: { monthlyIncome:4250, monthlyLivingExpenses:1300, monthlyDebtPayments:400,
    totalDebt:98000, assetValue:140000, liquidReserves:5250, creditScore:760, ...inputs },
  corners: Object.fromEntries(['cashFlow','capital','collateral','credit'].map(key=>[key,{
    status:'known',strength:strengths[key] ?? .5,pressure:null,
    raw:key==='collateral'?{debtToValue:.7}:{},
  }])),
});
const playing = (...args) => beginCampaign(createHangarCampaign(...args));
const target = (s,lane) => s.threats.find(t=>t.lane===lane);

test('hangar dollar inputs replace every static wallet, obligation and upkeep',()=>{
  const s=createHangarCampaign(picture({monthlyIncome:3150.37,monthlyLivingExpenses:1234.56,
    monthlyDebtPayments:321.09,liquidReserves:987.65}),'A');
  assert.equal(s.incomeWallet,315037);assert.equal(s.reserves,98765);
  assert.equal(s.baseLiving,123456);assert.equal(target(s,'credit').original,32109);
  assert.equal(recurringOutflow(s),155565);
  assert.deepEqual(s.debts,[]);assert.deepEqual(s.loans,[]);
  assert.ok(s.defenses.every(d=>d.upkeep===0&&d.securedBalance===0&&d.baseValue===0));
  const actors=combatActors(createCombat(s)).filter(a=>a.target.lane!=='reserve');
  assert.equal(actors.length,40);
  assert.equal(actors.reduce((sum,a)=>sum+a.remaining,0),recurringOutflow(s),'twenty bodies divide each obligation');
});

test('What if consumes resolved API inputs once and never modifies the hangar',()=>{
  const input=picture({monthlyIncome:5250,monthlyDebtPayments:750,totalDebt:112000,
    assetValue:158000,liquidReserves:3250},{cashFlow:.2,collateral:.8},'scenario');
  const original=structuredClone(input),s=createHangarCampaign(input,'B+');
  assert.equal(s.incomeWallet,525000);assert.equal(s.reserves,325000);
  assert.equal(s.hangar.monthlyDebtPayments,75000);assert.equal(campaignView(s).totalDebt,11200000);
  assert.equal(s.hangar.assetValue,15800000);assert.equal(s.hangar.snapshot.kind,'scenario');
  let run=beginCampaign(s);run=incomeFire(run,target(run,'reserve').id);
  run=tickCampaign(run,100);run=startNextPeriod(run);
  assert.equal(run.period,2);assert.equal(missionSummary(run).cashDifference,0);
  assert.deepEqual(input,original);assert.deepEqual(s.hangar.snapshot,original);
  input.inputs.monthlyIncome=1;assert.equal(s.hangar.snapshot.inputs.monthlyIncome,5250,'snapshot is detached');
  assert.equal(beginCampaign(s).incomeWallet,525000,'replay begins with the captured picture');
});

test('existing combat mappings drive armor, radar and actual firing cadence',()=>{
  const slow=picture({}, {cashFlow:0,collateral:0,credit:0});
  const fast=picture({}, {cashFlow:1,collateral:1,credit:1});
  const shots=[];
  for(const input of [slow,fast]){
    const s=playing(input),expected=createLoadout(Object.fromEntries(Object.entries(input.corners).map(([k,v])=>[k,v.strength])),.7);
    assert.deepEqual(s.hangar.loadout,expected);assert.ok(s.defenses.every(d=>d.condition===expected.assetsMax));
    const w=createCombat(s);setAim(w,10,7);setTrigger(w,'button',true);
    for(let i=0;i<120;i++)advanceCombat(w,1/60);
    shots.push(w.shots);assert.equal(w.ledger.incomeWallet,s.incomeWallet,'misses still cost nothing');
  }
  assert.ok(shots[1]>shots[0]*2,`cash-flow strengths produce ${shots.join(' vs ')} shots`);
});

test('deposits and protection reconcile across four periods without payoff or score forecasts',()=>{
  let s=playing(picture(),'A');const originalGrade=s.gradeIndex;
  for(let period=1;period<=4;period++){
    s=incomeFire(s,target(s,'reserve').id);
    s=incomeFire(s,target(s,'living').id,20000);
    s=incomeFire(s,target(s,'credit').id,10000);
    s=tickCampaign(s,100);
    assert.equal(s.review.incomeSpent-s.review.reserveDeposited,30000);
    assert.equal(s.review.reserveDeposited,10000);assert.equal(s.review.reserveSpent,140000);
    assert.equal(s.review.arrears,0);assert.equal(s.review.damage,0);
    assert.equal(s.review.principalPaid,null);assert.equal(s.review.interest,null);
    assert.equal(s.review.grade,'A');assert.equal(s.gradeIndex,originalGrade);
    assert.equal(campaignView(s).totalDebt,9800000);assert.equal(missionSummary(s).cashDifference,0);
    if(period<4)s=startNextPeriod(s);
  }
  assert.equal(s.phase,'complete');assert.equal(missionSummary(s).deposited,40000);
  assert.equal(missionSummary(s).incomePaid,120000);assert.equal(missionSummary(s).interest,null);
});

test('only unpaid hangar amounts breach after partial reserve interception',()=>{
  let s=playing(picture({monthlyLivingExpenses:300,monthlyDebtPayments:0,liquidReserves:40}));
  s=incomeFire(s,target(s,'living').id,20000);s=tickCampaign(s,100);
  assert.equal(s.review.arrears,6000);assert.equal(s.review.reserveSpent,4000);
  assert.equal(s.review.damage,4,'damage uses the $60 remainder, not the original $300');
  assert.equal(target(s,'living').incomePaid+target(s,'living').reservePaid+target(s,'living').remaining,30000);
  assert.equal(missionSummary(s).cashDifference,0);
});

test('negative What if reserves retain the shortfall and cannot create reserve ammo',()=>{
  let s=playing(picture({liquidReserves:-150}, {}, 'scenario'));
  const r=target(s,'reserve').id,c=target(s,'credit').id;
  const before=s.reserves;s=reserveFire(s,c);assert.equal(s.reserves,before);
  s=incomeFire(s,r);assert.equal(s.reserves,-5000);
  s=reserveFire(s,c);assert.equal(target(s,'credit').reservePaid,0);
  s=incomeFire(s,r);assert.equal(s.reserves,5000);
  s=reserveFire(s,r);assert.equal(s.reserves,5000,'no reserve-to-reserve loop');
  s=reserveFire(s,c);assert.equal(s.reserves,0);assert.equal(target(s,'credit').reservePaid,5000);
  assert.equal(missionSummary(s).cashDifference,0);
});

test('hangar totals cannot be sold or turned into fictional equipment loans',()=>{
  let s=playing(picture());s=tickCampaign(s,100);
  s.defenses[0].condition=0;s.unlockedTier=5;
  assert.deepEqual(sellDefense(s,'wall'),s);assert.deepEqual(repairDefense(s,'wall'),s);
  assert.deepEqual(buyUpgrade(s,2),s);assert.deepEqual(financeReplacement(s),s);
});

test('exhausted hangar picture reaches persistent Game Over with existing failure thresholds',()=>{
  let s=playing(picture({monthlyIncome:0,liquidReserves:0,monthlyDebtPayments:2000,monthlyLivingExpenses:2000},{collateral:0}));
  s=tickCampaign(s,100);
  assert.equal(s.phase,'gameover');assert.ok(s.gameOverReason);assert.equal(s.arrears,400000);
  assert.ok(s.defenses.every(d=>d.condition===0));assert.deepEqual(startNextPeriod(s),s);
  assert.deepEqual(tickCampaign(s,100),s);assert.equal(missionSummary(s).cashDifference,0);
});

test('zero obligations create no invented enemy balances',()=>{
  const s=createHangarCampaign(picture({monthlyDebtPayments:0,monthlyLivingExpenses:0,totalDebt:0}));
  assert.equal(recurringOutflow(s),0);assert.equal(combatActors(createCombat(s)).filter(a=>a.target.lane!=='reserve').length,0);
  assert.equal(s.reserves,525000);assert.equal(campaignView(s).totalDebt,0);
});

test('invalid money is rejected instead of silently replaced by static defaults',()=>{
  for(const value of [NaN,Infinity,'4250',-1,Number.MAX_SAFE_INTEGER]){
    assert.throws(()=>createHangarCampaign(picture({monthlyIncome:value})),/invalid/);
  }
  assert.throws(()=>createHangarCampaign({...picture(),kind:'unknown'}),/Choose a calculated/);
});
