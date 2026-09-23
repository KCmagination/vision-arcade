import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySetup,validateSetup,reconcileSetup,resolveDetails,prepareAccountPeriod,settleAccount} from '../lib/advanced-finances.js';
import {createHangarCampaign,beginCampaign,tickCampaign,startNextPeriod,incomeFire,reserveFire,extraDebtPayment,missionSummary,shotValue,firingRate} from '../lib/debtbreaker-engine.js';
import {createCombat,combatActors,advanceCombat,setAim,setTrigger} from '../lib/debtbreaker-combat.js';

const current={monthlyIncome:4250,monthlyLivingExpenses:1300,monthlyDebtPayments:400,totalDebt:98000,assetValue:140000,liquidReserves:5250,creditScore:760};
const picture=(inputs=current,kind='current')=>({kind,inputs,scoringVersion:'public-fixture',corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(key=>[key,{
  strength:.5,
  raw:key==='collateral'?{debtToValue:.7}:{},
}]))});
const row=(changes={})=>({id:'card',name:'Everyday card',type:'credit-card',balance:1000,payment:100,rate:null,rateKind:'unknown',term:null,otherPayment:null,secured:false,model:false,...changes});
const setup=(changes={})=>({...emptySetup(),date:'2026-09-22',debts:[row()],expenses:[{id:'food',name:'Food',amount:300}],...changes});
const keep={totalDebt:'keep',monthlyDebtPayments:'keep',monthlyLivingExpenses:'keep'};
const launch=(draft=setup(),inputs=current)=>beginCampaign(createHangarCampaign(picture(inputs),'A',resolveDetails(draft,inputs,picture(inputs))));
const modeled=(changes={})=>row({rate:12,rateKind:'fixed',otherPayment:0,model:true,...changes});
const exactInputs={...current,totalDebt:1000,monthlyDebtPayments:100,monthlyLivingExpenses:0};
const finishPaid=s=>{for(const t of s.threats.filter(t=>t.lane!=='reserve'))s=incomeFire(s,t.id,t.remaining);return tickCampaign(s,100);};

test('partial details reconcile exactly without inventing accounts or mortgages',()=>{
  const draft=setup(),result=reconcileSetup(current,draft,keep),d=resolveDetails(result.setup,result.inputs,picture());
  assert.deepEqual(result.inputs,current);assert.equal(d.accounts.length,2);
  assert.equal(d.accounts[1].name,'Unspecified debt');assert.equal(d.accounts[1].balance,9700000);
  assert.equal(d.accounts.reduce((n,a)=>n+a.payment,0),40000);
  assert.equal(d.expenses.reduce((n,e)=>n+e.amount,0),130000);
  const huge={...current,totalDebt:250000};
  assert.ok(resolveDetails(draft,huge,picture(huge)).accounts.every(a=>a.type!=='mortgage'));
  assert.equal(d.accounts[0].rate,null);assert.equal(d.accounts[0].modeled,false);
  result.setup.debts[0].name='Changed';assert.equal(draft.debts[0].name,'Everyday card');
});

test('negative remainders block launch; explicit reconciliation updates only chosen totals',()=>{
  const before=structuredClone(current);
  const draft=setup({debts:[row({balance:100000,payment:500})]});
  assert.throws(()=>reconcileSetup(current,draft,keep),/exceed/);
  const {inputs}=reconcileSetup(current,draft,{...keep,totalDebt:'update',monthlyDebtPayments:'update'});
  assert.equal(inputs.totalDebt,100000);assert.equal(inputs.monthlyDebtPayments,500);assert.equal(inputs.monthlyLivingExpenses,1300);
  assert.equal(launch(draft).phase,'briefing');
  assert.deepEqual(current,before);
});

test('resolved What if additions remain unassigned and are counted once',()=>{
  const inputs={...current,totalDebt:108000,monthlyDebtPayments:600,monthlyLivingExpenses:1400};
  const d=resolveDetails(setup(),current,picture(inputs,'scenario'));
  assert.equal(d.accounts.find(a=>a.id==='scenario-debt').balance,1000000);
  assert.equal(d.accounts.reduce((s,a)=>s+a.payment,0),60000);
  assert.equal(d.expenses.reduce((s,e)=>s+e.amount,0),140000);
  assert.ok(d.accounts.every(a=>!a.modeled));
});

test('unknown, variable and malformed rates cannot silently become zero-interest estimates',()=>{
  for(const changes of [{rate:null},{rateKind:'variable'},{otherPayment:null},{rate:-1}])assert.ok(validateSetup(setup({debts:[modeled(changes)]})).length);
  assert.deepEqual(validateSetup(setup({debts:[modeled({rate:0})]})),[]);
  const d=resolveDetails(setup({debts:[modeled()],estimates:false}),current,picture());
  assert.equal(d.accounts[0].modeled,false,'account opt-in also requires global opt-in');
});

test('monthly estimate pays included costs, interest then principal with no timing bonus',()=>{
  const draft=setup({debts:[modeled({otherPayment:20})],expenses:[],estimates:true});
  const original=structuredClone(draft),s=finishPaid(launch(draft,exactInputs)),r=s.review.accounts[0];
  assert.equal(r.interestAdded,1000);assert.equal(r.otherPaid,2000);assert.equal(r.interestPaid,1000);assert.equal(r.principal,7000);assert.equal(r.closingBalance,93000);
  let split=launch(draft,exactInputs);for(let i=0;i<10;i++)split=incomeFire(split,split.threats[0].id,1000);
  split=tickCampaign(split,100);assert.deepEqual(split.review.accounts,s.review.accounts);
  assert.deepEqual(draft,original);assert.equal(s.hangar.snapshot.inputs.totalDebt,1000);
  assert.equal(missionSummary(s).cashDifference,0);
});

test('unpaid interest stays separate and is not capitalized a second time',()=>{
  const a=resolveDetails(setup({debts:[modeled({payment:5})],estimates:true}),current,picture()).accounts[0];
  prepareAccountPeriod(a);const first=settleAccount(a,500);
  assert.equal(first.closingBalance,100500);assert.equal(a.balance,100000);assert.equal(a.interestCarry,500);
  prepareAccountPeriod(a);assert.equal(a.periodInterest,1000);
  const second=settleAccount(a,500);assert.equal(second.closingBalance,101000);
});

test('final modeled payment is capped; paid-off debt leaves ongoing included costs',()=>{
  const inputs={...exactInputs,totalDebt:50,monthlyDebtPayments:100};
  let s=launch(setup({debts:[modeled({balance:50,otherPayment:20,rate:0})],expenses:[],estimates:true}),inputs);
  assert.equal(s.threats[0].original,7000);s=finishPaid(s);assert.equal(s.review.accounts[0].closingBalance,0);
  s=startNextPeriod(s);const t=s.threats.find(t=>t.accountId==='card');
  assert.equal(t.lane,'living');assert.equal(t.original,2000);assert.equal(s.hangar.monthlyDebtPayments,0);assert.equal(s.baseLiving,2000);
});

test('checkpoint extra payments are bounded, labeled separately and reconcile with history',()=>{
  let s=finishPaid(launch(setup({debts:[modeled()],expenses:[],estimates:true}),exactInputs));
  s=extraDebtPayment(s,'card','income',10000);s=extraDebtPayment(s,'card','reserve',99999999);
  assert.equal(s.review.extraIncomePaid,10000);assert.equal(s.review.extraReservePaid,81000);
  assert.equal(s.review.accounts[0].closingBalance,0);assert.equal(s.review.accounts[0].extraPaid,91000);
  assert.equal(s.review.accounts[0].principal,100000);assert.equal(s.review.accounts[0].interestPaid,1000);
  assert.deepEqual(s.history[0],s.review);assert.equal(missionSummary(s).cashDifference,0);
  assert.deepEqual(extraDebtPayment(s,'card','reserve',100),s);
  assert.equal(startNextPeriod(s).threats.filter(t=>t.lane==='credit').length,0);
});

test('extra payments cannot bypass a live period, unknown balance model or unpaid obligations',()=>{
  const active=launch(setup({debts:[modeled()],expenses:[],estimates:true}),exactInputs);
  assert.deepEqual(extraDebtPayment(active,'card','income',100),active);
  const unknown=finishPaid(launch());assert.deepEqual(extraDebtPayment(unknown,'card','income',100),unknown);
  const unpaid=tickCampaign(launch(setup({debts:[modeled()],expenses:[],estimates:true}),{...exactInputs,liquidReserves:0}),100);
  assert.ok(unpaid.arrears>0);assert.deepEqual(extraDebtPayment(unpaid,'card','income',100),unpaid);
});

test('payments-only balances are never presented as inferred principal payoff',()=>{
  let s=finishPaid(launch());assert.equal(s.review.accounts[0].closingBalance,null);assert.equal(s.review.accounts[0].interestAdded,null);
  s=startNextPeriod(s);assert.equal(s.threats.find(t=>t.accountId==='card').original,10000);assert.equal(s.hangar.details.accounts[0].balance,100000);
});

test('more bodies share exact cents and each true obligation receives consequences once',()=>{
  let s=launch(setup({debts:[row({payment:100.01})]}));const w=createCombat(s);
  for(const t of s.threats.filter(t=>t.lane!=='reserve'))assert.equal(w.drones.filter(d=>d.targetId===t.id).reduce((n,d)=>n+d.remaining,0),t.original);
  assert.ok(w.drones.length<=60);assert.ok(w.drones.every(d=>d.remaining>0));
  s=tickCampaign(s,100);assert.equal(s.review.damage,0,'paid interception cannot damage defenses');assert.equal(s.review.arrears,0);
  assert.equal(missionSummary(s).cashDifference,0);
});

test('partially protected named obligation damages only its unresolved remainder',()=>{
  const inputs={...exactInputs,totalDebt:1000,monthlyDebtPayments:300,liquidReserves:40};
  let s=launch(setup({debts:[row({payment:300})],expenses:[]}),inputs);
  s=incomeFire(s,s.threats[0].id,20000);s=tickCampaign(s,100);
  assert.equal(s.review.reserveSpent,4000);assert.equal(s.review.arrears,6000);assert.equal(s.review.damage,4);assert.equal(missionSummary(s).cashDifference,0);
});

test('rapid smaller rounds preserve nominal dollar capacity and sustained cadence',()=>{
  const s=launch();assert.equal(shotValue(s),2500);assert.equal(firingRate(s)*shotValue(s),s.hangar.loadout.fireRate*10000);
  const w=createCombat(s);setAim(w,0,9);setTrigger(w,'button',true);
  for(let i=0;i<300;i++)advanceCombat(w,1/60);
  assert.ok(Math.abs(w.shots-firingRate(s)*(5-Math.PI/9))<3,`${w.shots} shots`);
  assert.equal(w.hits,0);assert.equal(w.ledger.incomeWallet,s.incomeWallet);
});

for(const lane of ['credit','living','reserve'])test(`manual rapid projectiles reach moving ${lane} targets and preserve cash`,()=>{
  const w=createCombat(launch());assert.equal(w.autoFire,false);assert.equal(w.assist,false);
  setTrigger(w,'pointer',true);
  for(let i=0;i<180;i++){
    const a=combatActors(w).find(a=>a.target.lane===lane);if(a)setAim(w,a.x,a.z);
    advanceCombat(w,1/60);
  }
  assert.ok(w.hits>0);assert.ok(w.ledger.threats.some(t=>t.lane===lane&&t.incomePaid>0));assert.equal(missionSummary(w.ledger).cashDifference,0);
});

test('named deposit target cannot be farmed with reserves',()=>{
  let s=launch();const id=s.threats.find(t=>t.lane==='reserve').id;
  s=incomeFire(s,id,2500);assert.equal(s.incomeWallet,422500);assert.equal(s.reserves,527500);
  assert.equal(s.totals.reserveDeposited,2500);assert.deepEqual(reserveFire(s,id,2500).totals,s.totals);
  assert.equal(missionSummary(s).cashDifference,0);
});

test('detailed mode retains terminal Game Over thresholds',()=>{
  let s=launch(setup({debts:[row({payment:2000})],expenses:[{id:'cost',name:'Home',amount:2000}]}),{...current,monthlyIncome:0,monthlyDebtPayments:2000,monthlyLivingExpenses:2000,liquidReserves:0});
  s.defenses.forEach(d=>d.condition=10);s=tickCampaign(s,100);
  assert.equal(s.phase,'gameover');assert.ok(s.gameOverReason);assert.deepEqual(startNextPeriod(s),s);assert.equal(missionSummary(s).cashDifference,0);
});
