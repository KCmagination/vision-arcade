import {needsCombatRefresh} from '../lib/debtbreak-clock.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHangarCampaign,beginCampaign} from '../lib/debtbreaker-engine.js';
import {enableContinuous,continuousAction as act,continuousSummary as summary,checkContinuous,tickContinuous,impactGroundPacket,holdBlast,finishShot} from '../lib/debtbreak-continuous.js';
import {createCombat,advanceCombat,quietCommandTail,combatActors,hitGroundPacket} from '../lib/debtbreak-siege.js';
import {commandStats,commandCoverage,commandTargets} from '../lib/debtbreak-command.js';
import {serializeGroundRun,parseGroundRun} from '../lib/debtbreak-ground-save.js';
const picture=(inputs={},strengths={})=>({kind:'current',inputs:{monthlyIncome:4000,monthlyLivingExpenses:1000,monthlyDebtPayments:200,totalDebt:10000,assetValue:20000,liquidReserves:5000,creditScore:700,...inputs},corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(key=>[key,{strength:strengths[key]??.5,raw:{}}]))});
const scenario=(inputs={},strengths={})=>beginCampaign(enableContinuous(createHangarCampaign(picture(inputs,strengths),'C'),{mode:'base'}));
const step=(w,seconds,fps=60)=>{for(let n=0;n<Math.round(seconds*fps);n++)advanceCombat(w,1/fps);return w;};
function launch(w,budget=summary(w.ledger).unpaid,reserve=0){w.ledger=act(w.ledger,{type:'commandPreset'});w.ledger=act(w.ledger,{type:'commandBudget',amount:budget,reserve});w.ledger=act(w.ledger,{type:'commandLaunch'});return w;}

test('final packet has a due-boundary margin; removing that margin reproduces the one-tick-late defect',()=>{
 for(const fps of [30,120]){
  function run(removeMargin){const w=launch(createCombat(scenario({monthlyLivingExpenses:0})));w.ground.towerCooldowns=[Infinity,Infinity,Infinity,Infinity];
   const debt=w.ledger.threats.find(t=>t.lane==='credit'),last=w.drones.filter(d=>d.targetId===debt.id).sort((a,b)=>b.entryAt-a.entryAt)[0];
   if(removeMargin)last.entryAt+=.25;
   step(w,43,fps);const settled=w.ledger.threats.find(t=>t.id===debt.id);checkContinuous(w.ledger);return {paidAt:settled.paidAt,late:settled.wasOverdue,remaining:settled.remaining,cutoff:(debt.dueDay+1)*w.ledger.continuous.secondsPerDay};
  }
  const fixed=run(false),old=run(true);assert.equal(fixed.remaining,0);assert.equal(fixed.late,false);assert.ok(fixed.paidAt<fixed.cutoff);assert.equal(old.late,true);assert.ok(old.paidAt>=old.cutoff);
 }
});

test('placement is unique, invalid pads and missing budget cannot launch, and coverage is inspectable',()=>{
 let s=scenario();s=act(s,{type:'commandLaunch'});assert.equal(s.continuous.ground.command.stage,'setup');
 s=act(s,{type:'commandPlace',tower:0,pad:1});s=act(s,{type:'commandPlace',tower:1,pad:1});s=act(s,{type:'commandPlace',tower:1,pad:99});
 assert.equal(s.continuous.ground.command.towers[1].pad,null);
 s=act(s,{type:'commandPreset'});assert.equal(commandCoverage(s).ground.every(Boolean),true);assert.equal(commandCoverage(s).air.every(Boolean),true);
 s=act(s,{type:'commandLaunch'});assert.equal(s.continuous.ground.command.stage,'setup');
 s=act(s,{type:'commandBudget',amount:120000,reserve:0});s=act(s,{type:'commandLaunch'});
 assert.equal(s.continuous.ground.command.stage,'combat');assert.equal(s.continuous.autoProtect,false);
 const pad=s.continuous.ground.command.towers[0].pad;s=act(s,{type:'commandPlace',tower:0,pad:0});assert.equal(s.continuous.ground.command.towers[0].pad,pad);checkContinuous(s);
});
test('corner outputs affect distinct gun properties and air/ground targeting obeys range and priority',()=>{
 const s=scenario(),high=scenario({},Object.fromEntries(['cashFlow','capital','collateral','credit'].map(k=>[k,1]))),c=s.continuous.ground.command;
 assert.ok(commandStats(high,c.towers[0]).cooldown<commandStats(s,c.towers[0]).cooldown);
 assert.ok(commandStats(high,c.towers[1]).damage>commandStats(s,c.towers[1]).damage);
 assert.ok(commandStats(high,c.towers[2]).damage>commandStats(s,c.towers[2]).damage);
 assert.ok(commandStats(high,c.towers[3]).range>commandStats(s,c.towers[3]).range);
 const w=launch(createCombat(s));step(w,6);const actors=combatActors(w);
 assert.ok(commandTargets(w.ledger,w.ledger.continuous.ground.command.towers[3],actors).every(a=>a.target.lane==='living'));
 assert.ok(commandTargets(w.ledger,w.ledger.continuous.ground.command.towers[2],actors).every(a=>a.target.lane==='credit'));
});
test('three complete automatic waves settle real bills, freeze at build windows, and finish with a victory',()=>{
 const w=launch(createCombat(scenario())),guns=new Set();
 for(let wave=1;wave<=3;wave++){
  for(let n=0;n<60*61;n++){advanceCombat(w,1/60);for(const beam of w.ground.beams)guns.add(beam.tower);if(w.ledger.paused||w.ledger.phase!=='playing')break;}
  checkContinuous(w.ledger);assert.equal(w.ledger.continuous.ground.command.lastWave.unpaid,0,`wave ${wave}`);assert.equal(w.ledger.continuous.ground.command.creditLearning.periods.length,wave,`on-time credit cycle ${wave}`);
  if(wave<3){assert.equal(w.ledger.continuous.ground.command.stage,'build');const snapshot=structuredClone(w.ledger);step(w,5);assert.deepEqual(w.ledger,snapshot);assert.equal(w.ledger.continuous.ground.reserveAllowance,0);assert.equal(w.ledger.continuous.ground.command.allowance,0);launch(w);}
 }
 assert.equal(w.ledger.phase,'complete');assert.equal(w.ledger.continuous.ground.command.stage,'victory');assert.equal(w.ledger.continuous.ground.command.secured,3);assert.equal(guns.size,4);
 assert.equal(w.ledger.reserves,500000);assert.equal(w.ledger.incomeReceived,1200000);assert.equal(summary(w.ledger).cashDifference,0);
});
test('exhausted budget leaves visible unpaid enemies, reserve permission stays off and poor funding ends explicitly',()=>{
 const w=launch(createCombat(scenario({liquidReserves:0})),100);
 step(w,60);assert.equal(w.ledger.continuous.ground.command.paid<=100,true);assert.equal(w.ledger.continuous.ground.reserveSpent,0);
 assert.ok(summary(w.ledger).unpaid>0);assert.ok(combatActors(w).some(a=>a.hp===0)||w.ledger.phase==='gameover');
 for(let wave=0;wave<3&&w.ledger.phase==='playing';wave++){if(w.ledger.continuous.ground.command.stage==='build')launch(w,100);step(w,61);}
 assert.equal(w.ledger.phase,'gameover');assert.ok(w.ledger.gameOverReason);checkContinuous(w.ledger);
 const retry=createCombat(scenario());assert.equal(retry.time,0);assert.equal(retry.ledger.continuous.ground.command.upgradeSpent,0);
});
test('shared claims, simultaneous gun/impact calls, disabled or changed reserve caps cannot double settle',()=>{
 let s=launch(createCombat(scenario())).ledger;const target=s.threats.find(t=>t.lane==='living'),opening=s.incomeWallet,reserves=s.reserves;
 s=act(s,{type:'commandBudget',amount:1000,reserve:500});
 s=act(s,{type:'commandPay',targetId:target.id,amount:800});s=impactGroundPacket(s,target.id,'body-a',800);
 s=impactGroundPacket(s,target.id,'body-a',800);s=act(s,{type:'commandPay',targetId:target.id,amount:800});
 assert.equal(s.incomeWallet,opening-1000);assert.equal(s.reserves,reserves-500);assert.equal(s.continuous.ground.command.allowance,0);assert.equal(s.threats.find(t=>t.id===target.id).remaining,target.remaining-1500);
 s=act(s,{type:'commandBudget',amount:0,reserve:0});const before=s.reserves;s=impactGroundPacket(s,target.id,'body-b',1000);assert.equal(s.reserves,before);checkContinuous(s);
});
test('upgrades recheck current reserves, replay ids cannot spend twice, and pause/resume preserves money',()=>{
 let s=scenario({liquidReserves:150});const before=s.reserves;
 s=act(s,{type:'commandUpgrade',tower:0,seq:1});s=act(s,{type:'commandUpgrade',tower:0,seq:1});s=act(s,{type:'commandUpgrade',tower:1,seq:2});
 assert.equal(s.reserves,0);assert.equal(s.continuous.ground.command.upgradeSpent,before);assert.equal(s.continuous.ground.command.towers[0].level,2);assert.equal(s.continuous.ground.command.towers[1].level,1);checkContinuous(s);
 const w=launch(createCombat(s));step(w,5);w.ledger.paused=true;const saved=serializeGroundRun(w),restored=parseGroundRun(saved);step(restored,20);assert.deepEqual(restored.ledger,w.ledger);restored.ledger.paused=false;step(restored,1);checkContinuous(restored.ledger);
});
test('manual held shots and automatic gun payments share the explicit allowance, even when the target dies first',()=>{
 const w=launch(createCombat(scenario()),1000);w.ledger=act(w.ledger,{type:'commandAssist',enabled:true});
 const packet=w.drones.find(d=>w.ledger.threats.find(t=>t.id===d.targetId)?.lane==='living');
 w.ledger=holdBlast(w.ledger,'manual','income',1000);hitGroundPacket(w,packet.id,'manual');
 w.ledger=act(w.ledger,{type:'commandPay',targetId:packet.targetId,amount:1000});hitGroundPacket(w,packet.id,'manual');w.ledger=finishShot(w.ledger,'manual');
 assert.equal(w.ledger.continuous.ground.command.allowance,0);assert.equal(w.ledger.continuous.livingPaid,1000);assert.equal(summary(w.ledger).held,0);checkContinuous(w.ledger);
});
test('30 and 120 FPS yield the same payments, defense condition and remaining obligations',()=>{
 const result=fps=>{const w=launch(createCombat(scenario()));step(w,45,fps);checkContinuous(w.ledger);return {summary:summary(w.ledger),income:w.ledger.incomeWallet,reserves:w.ledger.reserves,conditions:w.ledger.defenses.map(d=>d.condition),allowance:w.ledger.continuous.ground.command.allowance};};
 assert.deepEqual(result(30),result(120));
});
test('already-paid obligations never respawn and gun effects/enemy pools stay bounded',()=>{
 const w=launch(createCombat(scenario()));let peak=0,effects=0;
 for(let n=0;n<55*30;n++){advanceCombat(w,1/30);peak=Math.max(peak,combatActors(w).filter(a=>a.visible).length);effects=Math.max(effects,w.effects.length);assert.ok(w.drones.length<=60);assert.ok(w.ground.beams.length<=8);}
 assert.ok(peak>0&&peak<=20);assert.ok(effects<=80);assert.equal(w.ledger.continuous.ground.command.lastWave.unpaid,0);assert.equal(w.ledger.threats.filter(t=>t.cycle===1&&['living','credit'].includes(t.lane)).every(t=>t.remaining===0),true);assert.equal(combatActors(w).filter(a=>a.visible).length,0);
 const money={income:w.ledger.incomeWallet,reserve:w.ledger.reserves,paid:w.ledger.continuous.ground.command.paid};step(w,3);
 assert.deepEqual({income:w.ledger.incomeWallet,reserve:w.ledger.reserves,paid:w.ledger.continuous.ground.command.paid},money);assert.equal(combatActors(w).filter(a=>a.visible).length,0);checkContinuous(w.ledger);
});
test('minimum corner strength remains playable with funded recommended coverage',()=>{
 const w=launch(createCombat(scenario({},Object.fromEntries(['cashFlow','capital','collateral','credit'].map(k=>[k,0])))));
 for(let wave=0;wave<3;wave++){step(w,61);checkContinuous(w.ledger);assert.equal(w.ledger.continuous.ground.command.lastWave?.unpaid,0);if(wave<2)launch(w);}
 assert.equal(w.ledger.phase,'complete');
});
test('target priorities choose different eligible packets and never shoot beyond coverage',()=>{
 let s=act(scenario(),{type:'commandPreset'});const tower=s.continuous.ground.command.towers[0];
 const actors=[{id:'soon',visible:true,remaining:100,hp:2,x:200,z:340,impactAt:4,target:{lane:'credit',dueDay:10}},{id:'large',visible:true,remaining:500,hp:2,x:220,z:340,impactAt:8,target:{lane:'credit',dueDay:4}},{id:'far',visible:true,remaining:10000,hp:2,x:999,z:999,impactAt:1,target:{lane:'credit',dueDay:1}}];
 assert.equal(commandTargets(s,tower,actors)[0].id,'soon');tower.priority='largest';assert.equal(commandTargets(s,tower,actors)[0].id,'large');tower.priority='due';assert.equal(commandTargets(s,tower,actors)[0].id,'large');
 s.hangar.snapshot.corners.credit.strength=null;assert.equal(commandStats(s,s.continuous.ground.command.towers[3]).range,490);
});
test('poor ground coverage causes real damage and build-window relocation reduces further breaches',()=>{
 const w=createCombat(scenario());for(const [tower,pad] of [0,1,4,5].entries())w.ledger=act(w.ledger,{type:'commandPlace',tower,pad});
 assert.ok(commandCoverage(w.ledger).ground.some(covered=>!covered));
 w.ledger=act(w.ledger,{type:'commandBudget',amount:summary(w.ledger).unpaid,reserve:0});w.ledger=act(w.ledger,{type:'commandLaunch'});step(w,61);
 assert.equal(w.ledger.continuous.ground.command.stage,'build');assert.ok(w.ledger.totals.damage>0);const damage=w.ledger.totals.damage;checkContinuous(w.ledger);
 launch(w);step(w,61);assert.equal(w.ledger.continuous.ground.command.lastWave.unpaid,0);assert.ok(w.ledger.totals.damage-damage<damage);checkContinuous(w.ledger);
});

test('build-window transition refreshes controls even on a throttled HUD frame',()=>{
 const w=launch(createCombat(scenario()));let transitions=0;
 for(let wave=0;wave<3;wave++){
  let displayed=w.ledger;
  for(let frame=0;frame<610;frame++){
   const before=w.ledger;advanceCombat(w,.1);
   // Force the wave-ending frame inside the ordinary 100 ms HUD throttle.
   if(needsCombatRefresh(before,w.ledger,0))displayed=w.ledger;
   if(w.ledger.paused||w.ledger.phase!=='playing'){transitions++;break;}
  }
  assert.equal(displayed,w.ledger);assert.equal(displayed.continuous.ground.command.stage,wave===2?'victory':'build');
  assert.ok(Math.abs(w.time-w.ledger.elapsed)<1e-7);assert.equal(w.accumulator,0);assert.equal(summary(displayed).held,0);assert.equal(w.ground.projectiles.length,0);assert.equal(w.ground.blasts.length,0);
  if(wave<2)launch(w);
 }
 assert.equal(transitions,3);
});


test('zero reserves and paycheck-only income launch and complete three waves',()=>{
 const w=launch(createCombat(scenario({monthlyIncome:1200,liquidReserves:0})));
 assert.equal(w.ledger.continuous.ground.command.stage,'combat');
 for(let wave=0;wave<3;wave++){step(w,61);checkContinuous(w.ledger);assert.equal(w.ledger.continuous.ground.command.lastWave?.unpaid,0);assert.equal(w.ledger.reserves,0);if(wave<2)launch(w);}
 assert.equal(w.ledger.phase,'complete');assert.equal(summary(w.ledger).cashDifference,0);
});
test('impact spends authorized income then capped reserves, damages even paid packets, and leaves unfunded balance',()=>{
 let s=launch(createCombat(scenario()),300,200).ledger;const t=s.threats.find(t=>t.lane==='living');
 const opening=t.remaining,before=s;
 s=impactGroundPacket(s,t.id,'receipt-paid',500);
 assert.equal(s.continuous.ground.command.lastImpact.incomePaid,300);assert.equal(s.continuous.ground.command.lastImpact.reservePaid,200);
 assert.equal(s.continuous.ground.command.lastImpact.remaining,opening-500);assert.ok(s.continuous.ground.command.lastImpact.damage>0);
 assert.ok(needsCombatRefresh(before,s,0));assert.equal(impactGroundPacket(s,t.id,'receipt-paid',500),s);
 const income=s.incomeWallet,reserve=s.reserves;s=impactGroundPacket(s,t.id,'receipt-unfunded',500);
 assert.equal(s.incomeWallet,income);assert.equal(s.reserves,reserve);assert.equal(s.threats.find(x=>x.id===t.id).remaining,opening-500);
 s=act(s,{type:'repair',source:'income',points:1});checkContinuous(s);
});
test('quiet acceleration preserves calendar settlements and stops for queued threats, holds, rescue and build',()=>{
 const w=launch(createCombat(scenario()));assert.equal(quietCommandTail(w),false);
 for(const t of [...w.ledger.threats].filter(t=>['living','credit'].includes(t.lane)))w.ledger=act(w.ledger,{type:'commandPay',targetId:t.id,amount:t.remaining});
 assert.equal(quietCommandTail(w),true);
 w.pendingShot=true;assert.equal(quietCommandTail(w),false);w.pendingShot=false;
 w.ledger=holdBlast(w.ledger,'quiet-hold','income',100);assert.equal(quietCommandTail(w),false);w.ledger=finishShot(w.ledger,'quiet-hold');
 w.ledger.continuous.rescue={targetId:'test',label:'Base',remainingSeconds:10};assert.equal(quietCommandTail(w),false);w.ledger.continuous.rescue=null;
 const normal=tickContinuous(structuredClone(w.ledger),60);
 step(w,8);assert.equal(w.ledger.continuous.ground.command.stage,'build');
 assert.deepEqual(summary(w.ledger),summary(normal));assert.equal(w.ledger.incomeReceived,normal.incomeReceived);assert.equal(w.ledger.totals.interest,normal.totals.interest);
 const frozen=structuredClone(w.ledger);step(w,2);assert.deepEqual(w.ledger,frozen);
});
