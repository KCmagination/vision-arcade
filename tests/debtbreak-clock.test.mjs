import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameClock,readFrameClock,INTERRUPTION_NOTICE} from '../lib/debtbreak-clock.js';
import {createCampaign,beginCampaign} from '../lib/debtbreaker-engine.js';
import {enableContinuous,checkContinuous} from '../lib/debtbreak-continuous.js';
import {createCombat,advanceCombat,aimAtTarget,combatActors} from '../lib/debtbreaker-combat.js';
const world=()=>createCombat(beginCampaign(enableContinuous(createCampaign(),{fictional:true})));

test('render clock and combat preserve the same firing stream at 5–120 FPS',()=>{
 const run=fps=>{
  const w=world(),clock=createFrameClock();w.assist=true;w.autoFire=true;
  aimAtTarget(w,combatActors(w).find(a=>a.target.kind==='debt').target.id);
  readFrameClock(clock,0,true);
  for(let i=1;i<=fps*8;i++){
   const frame=readFrameClock(clock,i*1000/fps,true);assert.equal(frame.interrupted,false);advanceCombat(w,frame.seconds);
  }
  assert.ok(Math.abs(w.time-8)<1e-8);assert.equal(w.ledger.continuous.day,4);checkContinuous(w.ledger);
  return {ledger:w.ledger,shots:w.shots,hits:w.hits,bullets:w.bullets};
 };
 const expected=run(120);
 for(const fps of [60,30,20,15,10,5])assert.deepEqual(run(fps),expected,`${fps} FPS diverged`);
});

test('hidden, paused, and resumed frames do not charge inactive time',()=>{
 const clock=createFrameClock();readFrameClock(clock,0,true);
 assert.equal(readFrameClock(clock,100,true).seconds,.1);
 assert.deepEqual(readFrameClock(clock,200,false),{seconds:0,interrupted:false});
 assert.equal(readFrameClock(clock,10000,true).seconds,0);
 assert.equal(readFrameClock(clock,10100,true).seconds,.1);
 // Input handlers reset the clock even if pause/resume both occur between renders.
 clock.last=null;assert.equal(readFrameClock(clock,20100,true).seconds,0);
});

test('long interruptions stop before catch-up firing or financial events',()=>{
 const clock=createFrameClock();readFrameClock(clock,0,true);
 assert.deepEqual(readFrameClock(clock,1000,true),{seconds:0,interrupted:true});
 const w=world();w.autoFire=true;const before=structuredClone(w.ledger);
 advanceCombat(w,1);
 assert.equal(w.time,0);assert.equal(w.shots,0);assert.equal(w.ledger.paused,true);
 assert.equal(w.ledger.notice,INTERRUPTION_NOTICE);
 assert.deepEqual({...w.ledger,paused:before.paused,notice:before.notice},before);
});
