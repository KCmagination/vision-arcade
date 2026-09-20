import assert from 'node:assert/strict';
import test from 'node:test';
import { CHALLENGES, challengeScenario, prepareChallenge, financingOffers, saleQuote, challengeOutcome, equipmentOnline } from '../lib/debtbreak-challenges.js';
import { availableFunds, startPlan, repay, settlePeriod, nextPeriod, totalDebt, sequence, requiredPayments, practiceInputs } from '../lib/debtbreak-finance.js';
import { createLoadout, createSector, stepSector, finishSector, resumeSector, ARENA_CORNERS } from '../lib/arcade-engine.js';
// Synthetic public gameplay inputs, independent of calculator calibration.
const kitFor = () => createLoadout({cashFlow:.5,capital:.5,collateral:.5,credit:.5});
const makePlan = (start, choices = { equipment: 'service', funding: 'cash' }, savings = 40000) => {
  const prepared = prepareChallenge(start, choices); assert.equal(prepared.error, null);
  return startPlan(prepared.ledger, Math.min(savings, availableFunds(prepared.ledger)), 'snowball');
};
const execute = p => { for (const d of sequence(p.ledger, 'snowball')) repay(p, d.id, p.remaining); settlePeriod(p); return p; };

test('service and cash repair conserve funds, do not mutate starts, and repeat previews are identical', () => {
  const l = challengeScenario('collateral'), before = structuredClone(l), choices = { equipment: 'service', funding: 'wait' };
  const a = prepareChallenge(l, choices), b = prepareChallenge(l, choices);
  assert.deepEqual(a,b); assert.deepEqual(l,before); assert.equal(availableFunds(a.ledger),70000);
  const p = startPlan(a.ledger,30000,'snowball'); assert.equal(p.budget+p.savings+a.ledger.challenge.costs,80000);
  assert.equal(p.ledger.challenge.asset.condition,100); assert.equal(p.ledger.reserves,90000);
  const r=makePlan(challengeScenario('credit'));
  assert.equal(r.start.reserves,20000); assert.equal(r.ledger.reserves,60000); assert.equal(totalDebt(r.ledger),300000);
  assert.equal(r.ledger.challenge.reserveUsed,60000); assert.ok(equipmentOnline(r.ledger));
});
test('loan quotes match six actual monthly payments and a loan is never income or instant score growth', () => {
  for(const funding of ['secured','unsecured']) {
    const l=challengeScenario('credit'), offer=financingOffers(l).find(o=>o.id===funding);
    const {ledger}=prepareChallenge(l,{funding,equipment:'service'});
    assert.equal(totalDebt(ledger),360000); assert.equal(ledger.reserves,l.reserves); assert.equal(availableFunds(ledger),80000);
    assert.equal(ledger.challenge.asset.pledgedTo,funding==='secured'?'RP-03':null);
    assert.equal(practiceInputs(ledger).creditScore,680);
    let d=structuredClone(ledger.debts.at(-1)), paid=0;
    for(let n=0;n<6;n++){d.balance+=Math.round(d.balance*d.apr/1200);const payment=Math.min(d.balance,d.payment);d.balance-=payment;paid+=payment;}
    assert.equal(d.balance,0);assert.equal(paid,offer.total);assert.equal(offer.cost,paid-60000);
    const p=execute(startPlan(ledger,80000,'snowball'));const next=nextPeriod(p);
    assert.equal(next.minimums,20000+offer.payment); assert.equal(next.debts.at(-1).balance,60000+Math.round(60000*offer.apr/1200)-offer.payment);
    assert.equal(practiceInputs(next).creditScore,680);
  }
});
test('capital disruption settles once; its bill and income reduction occur at the next payday once', () => {
  const p=execute(makePlan(challengeScenario('capital'),{funding:'wait',equipment:'defer'},0));
  assert.equal(p.event.cost,60000);assert.equal(p.event.covered,40000);assert.equal(p.event.shortfall,20000);
  const snapshot=structuredClone(p);settlePeriod(p);assert.deepEqual(p,snapshot);
  const next=nextPeriod(p);assert.equal(next.income,340000);assert.equal(next.repairDue,20000);assert.deepEqual(nextPeriod(p),next);
  const third=nextPeriod(execute(makePlan(next,{funding:'wait',equipment:'defer'},0)));
  assert.equal(third.income,400000);assert.equal(third.repairDue,0);
});
test('equipment sales pay liens and selling costs, release cash only next payday, and remove cover', () => {
  let l=prepareChallenge(challengeScenario('credit'),{funding:'secured',equipment:'service'}).ledger;
  const quote=saleQuote(l), total=totalDebt(l), reserves=l.reserves;
  const sold=prepareChallenge(l,{funding:'wait',equipment:'sell'}).ledger;
  assert.equal(sold.reserves,reserves);assert.equal(sold.carry,0);assert.equal(sold.challenge.salePending,quote.net);
  assert.equal(totalDebt(sold),total-quote.lien);assert.equal(quote.net+quote.fee+quote.lien,quote.gross);
  assert.equal(equipmentOnline(sold),false);assert.equal(sold.challenge.asset.pledgedTo,null);
  const p=execute(startPlan(sold,0,'snowball')), next=nextPeriod(p);
  assert.equal(next.carry,quote.net+p.remaining);assert.equal(next.challenge.salePending,0);assert.deepEqual(nextPeriod(p),next);
});
test('payment history unlocks lower offers only across periods, without repricing accepted loans', () => {
  const first=challengeScenario('credit'), normal=financingOffers(first)[0].apr;
  const p=makePlan(first,{funding:'wait',equipment:'defer'},0);
  for(let i=0;i<100;i++)repay(p,'CC-02',1);
  assert.equal(p.ledger.challenge.paymentPeriods,0);assert.equal(financingOffers(p.ledger)[0].apr,normal);
  settlePeriod(p);let next=nextPeriod(p);assert.equal(next.challenge.paymentPeriods,1);
  next=nextPeriod(execute(makePlan(next,{funding:'wait',equipment:'defer'},0)));
  assert.equal(next.challenge.paymentPeriods,2);assert.ok(financingOffers(next)[0].apr<normal);
  const accepted=makePlan(first,{funding:'unsecured',equipment:'service'},80000);
  const second=nextPeriod(execute(accepted));assert.equal(second.debts.at(-1).apr,normal);
});
test('all five missions have attainable goals and unfavorable choices have visible consequences', () => {
  for(const {id} of CHALLENGES){
    let l=challengeScenario(id);
    for(let n=1;n<=3;n++){const p=execute(makePlan(l));l=n<3?nextPeriod(p):p.ledger;}
    assert.equal(challengeOutcome(l).passed,true,id);
  }
  let l=challengeScenario('credit');
  for(let n=1;n<=3;n++){const p=execute(makePlan(l,{funding:'wait',equipment:'defer'},40000));l=n<3?nextPeriod(p):p.ledger;}
  assert.equal(challengeOutcome(l).passed,false);assert.equal(equipmentOnline(l),false);assert.equal(l.income,385000);
  let asset=challengeScenario('collateral');
  for(let n=1;n<=3;n++){const p=execute(makePlan(asset,{funding:'wait',equipment:'defer'},0));asset=n<3?nextPeriod(p):p.ledger;}
  assert.equal(asset.challenge.asset.condition,0);assert.equal(challengeOutcome(asset).passed,false);
});
test('new loan targets appear on resumed arenas and retries reproduce exact state', () => {
  const p=makePlan(challengeScenario('credit'),{funding:'wait',equipment:'defer'}),kit=kitFor(p),s=createSector(kit,p);s.phase='playing';
  finishSector(s);const checkpoint=structuredClone(s),next=nextPeriod(p);
  const q=makePlan(next,{funding:'unsecured',equipment:'service'}), start=structuredClone(q);
  const a=resumeSector(structuredClone(checkpoint),kitFor(q),q);
  assert.equal(a.enemies.filter(e=>e.accountId==='RP-03').length,1);
  stepSector(a,{x:1,z:1,fire:true,shield:false,dash:false},kitFor(q),.05);
  const b=resumeSector(structuredClone(checkpoint),kitFor(start),structuredClone(start));
  const c=resumeSector(structuredClone(checkpoint),kitFor(start),structuredClone(start));assert.deepEqual(b,c);
  assert.equal(checkpoint.plan.ledger.debts.length,2);
});
test('equipment cover requires a working owned unit and never modifies the financial ledger', () => {
  for(const equipment of ['service','sell']){
    const p=makePlan(challengeScenario('collateral'),{funding:'wait',equipment}),kit=kitFor(p),s=createSector(kit,p);s.phase='playing';s.x=0;s.z=0;
    s.shots=[{x:0,z:0,vx:0,vz:0,enemy:true,life:1}];const reserves=p.ledger.reserves,debt=totalDebt(p.ledger);
    stepSector(s,{x:0,z:0,fire:false,shield:false,dash:false},kit,.05);
    assert.equal(s.health,equipment==='service'?100:80);assert.equal(p.ledger.reserves,reserves);assert.equal(totalDebt(p.ledger),debt);
  }
});
test('moving and firing can complete every three-period mission without clearing all debt', () => {
  for(const {id} of CHALLENGES){
    let p=makePlan(challengeScenario(id)),kit=kitFor(p),s=createSector(kit,p);s.phase='playing';let waypoint=1;
    for(let frame=0;frame<4000&&!['failed','complete'].includes(s.phase);frame++){
      if(s.phase==='payday'){p=makePlan(nextPeriod(s.plan));kit=kitFor(p);resumeSector(s,kit,p);}
      const corner=ARENA_CORNERS[waypoint],x=corner.x-Math.sign(corner.x)*2,z=corner.z-Math.sign(corner.z)*2;
      if(Math.hypot(x-s.x,z-s.z)<.5)waypoint=(waypoint+1)%4;
      stepSector(s,{x:x-s.x,z:z-s.z,fire:true,shield:s.plan.remaining===0,dash:false,targetId:s.plan.targetId},kit,.05);
    }
    assert.equal(s.phase,'complete',id);assert.equal(s.plan.ledger.period,3);assert.equal(s.history.length,2);
    assert.ok(s.shotsHit>0);assert.ok(totalDebt(s.plan.ledger)>0);assert.equal(s.plan.reserveSpent,0);
    assert.equal(challengeOutcome(s.plan.ledger).passed,true,id);
  }
});
