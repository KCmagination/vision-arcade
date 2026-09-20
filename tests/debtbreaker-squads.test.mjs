import test from 'node:test';
import assert from 'node:assert/strict';
import { beginCampaign, createCampaign, tickCampaign, incomeFire, missionSummary, SHOT } from '../lib/debtbreaker-engine.js';
import { createCombat, combatActors, advanceCombat, targetPosition, defenseContact, setTrigger, setAim, PACES } from '../lib/debtbreaker-combat.js';

const playing=options=>beginCampaign(createCampaign(options));
const seconds=(w,n)=>{for(let t=0;t<n;t+=1/60)advanceCombat(w,1/60);};
const finish=ledger=>{for(let n=0;n<5000&&ledger.phase==='playing';n++)ledger=tickCampaign(ledger,PACES.standard/120);return ledger;};
const conserved=w=>{
  for(const target of w.ledger.threats.filter(t=>t.lane!=='reserve'))
    assert.equal(w.drones.filter(d=>d.targetId===target.id).reduce((sum,d)=>sum+d.remaining,0),target.remaining);
  assert.equal(missionSummary(w.ledger).cashDifference,0);
};

test('v32: exactly five physical drones per obligation; one friendly tank',()=>{
  const w=createCombat(playing()),actors=combatActors(w);
  assert.equal(actors.filter(a=>a.target.lane!=='reserve').length,15);
  assert.equal(actors.filter(a=>a.target.lane==='reserve').length,1);
  assert.equal(w.ledger.threats.length,4);conserved(w);
  for(const target of w.ledger.threats.filter(t=>t.lane!=='reserve'))assert.equal(actors.filter(a=>a.target.id===target.id).length,5);
});

test('v32: a projectile can clear several small drones but charges the original shot once',()=>{
  const w=createCombat(playing()),actor=combatActors(w).find(a=>a.target.lane==='credit');
  const wallet=w.ledger.incomeWallet,original=actor.target.remaining;
  assert.ok(actor.remaining<SHOT);
  // A projectile already arriving at the selected drone exercises real collision.
  w.bullets.push({id:9000,x:actor.x,z:actor.z,dx:0,dz:-1,source:'income',travel:0});
  advanceCombat(w,1/120);
  assert.equal(w.ledger.incomeWallet,wallet-SHOT);
  assert.equal(w.ledger.threats.find(t=>t.id===actor.target.id).remaining,original-SHOT);
  assert.ok(w.effects.filter(e=>e.type==='clear').length>=4);assert.equal(w.hits,1);conserved(w);
});

test('v32: every drone strafes independently, remains visible, and reaches its actual wall panel',()=>{
  for(const lane of ['living','credit'])for(let slot=0;slot<5;slot++){
    const positions=Array.from({length:90},(_,n)=>targetPosition({lane,progress:25},n/15,1,slot));
    assert.ok(Math.max(...positions.map(p=>p.x))-Math.min(...positions.map(p=>p.x))>2);
    assert.ok(positions.every(p=>Math.abs(p.x)<=10.35&&p.z>-7.5&&p.z<9));
    for(const wall of [0,1]){
      const p=targetPosition({lane,progress:100},99,1,slot,wall),contact=defenseContact(lane,slot,wall);
      assert.equal(p.x,contact.x);assert.equal(p.z,contact.z);
    }
  }
  assert.ok(PACES.standard>1.15);assert.ok(PACES.pressure>1.5);assert.equal(PACES.relaxed,.78);
});

test('v32: swarm breaches preserve the exact existing arrears and defense consequences',()=>{
  const ledger=playing({reserveMonths:0}),expected=finish(ledger),w=createCombat(ledger);
  const impacts=[];
  for(let n=0;n<2500&&w.ledger.phase==='playing';n++){advanceCombat(w,1/60);impacts.push(...w.events.filter(e=>['breach','impact'].includes(e.type)));conserved(w);}
  assert.equal(impacts.length,15);assert.equal(impacts.filter(e=>e.type==='breach').length,3);
  assert.equal(impacts.reduce((sum,e)=>sum+e.amount,0),expected.arrears);
  assert.equal(w.ledger.arrears,expected.arrears);assert.deepEqual(w.ledger.defenses,expected.defenses);
  assert.equal(w.ledger.phase,expected.phase);assert.equal(w.ledger.totals.damage,expected.totals.damage);
  const settled=structuredClone(w.ledger),time=w.time;
  assert.ok(w.settleUntil>time);seconds(w,1.5);
  assert.equal(w.time,w.settleUntil);assert.deepEqual(w.ledger,settled);assert.equal(w.effects.length,0);
});

test('v32: fully intercepted squads never produce a collision or defense damage',()=>{
  const w=createCombat(playing({reserveMonths:3})),impacts=[];
  for(let n=0;n<2500&&w.ledger.phase==='playing';n++){advanceCombat(w,1/60);impacts.push(...w.events.filter(e=>['breach','impact'].includes(e.type)));conserved(w);}
  assert.equal(impacts.length,0);assert.equal(w.ledger.totals.damage,0);assert.ok(w.ledger.totals.reserveSpent>0);
  assert.equal(w.drones.reduce((s,d)=>s+d.remaining,0),0);
});

test('v32: a partially protected squad breaches only for its unpaid shares',()=>{
  const ledger=playing({reserveMonths:.1}),expected=finish(ledger),w=createCombat(ledger),impacts=[];
  for(let n=0;n<2500&&w.ledger.phase==='playing';n++){advanceCombat(w,1/60);impacts.push(...w.events.filter(e=>['breach','impact'].includes(e.type)));}
  assert.equal(impacts.reduce((s,e)=>s+e.amount,0),w.ledger.arrears);
  assert.equal(w.ledger.arrears,expected.arrears);assert.equal(w.ledger.totals.damage,expected.totals.damage);conserved(w);
});

test('v32: the animation tail never cancels Game Over or charges held fire',()=>{
  const ledger=playing({reserveMonths:0});ledger.incomeWallet=0;ledger.defenses.forEach(d=>d.condition=0);
  const w=createCombat(ledger);
  for(let n=0;n<2500&&w.ledger.phase==='playing';n++)advanceCombat(w,1/60);
  assert.equal(w.ledger.phase,'gameover');const final=structuredClone(w.ledger);
  setTrigger(w,'button',true);setAim(w,4,2);seconds(w,3);
  assert.deepEqual(w.ledger,final);assert.equal(w.ledger.phase,'gameover');assert.equal(w.shots,0);
});

test('v32: uneven cents are partitioned exactly without rounding money into existence',()=>{
  let ledger=playing();ledger=incomeFire(ledger,ledger.threats[0].id,3);
  const w=createCombat(ledger);conserved(w);assert.ok(w.drones.every(d=>Number.isInteger(d.remaining)));
});
