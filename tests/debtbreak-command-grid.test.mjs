import test from 'node:test';
import assert from 'node:assert/strict';
import {createHangarCampaign,beginCampaign} from '../lib/debtbreaker-engine.js';
import {enableContinuous,continuousAction as act,continuousSummary,checkContinuous,impactGroundPacket as rawImpactGroundPacket} from '../lib/debtbreak-continuous.js';
import {createCombat,advanceCombat,combatActors} from '../lib/debtbreak-siege.js';
import {commandStats,commandTargets} from '../lib/debtbreak-command.js';
import {GRID_ASSETS,validLayout,capitalCovers,creditSupports,routePoint} from '../lib/debtbreak-command-grid.js';
import {serializeGroundRun,parseGroundRun} from '../lib/debtbreak-ground-save.js';
const impactGroundPacket=(s,id,receipt,amount,target)=>{const packet=receipt.split(':contact:')[0];s.continuous.ground.command.packetTargets??={};s.continuous.ground.command.packetTargets[packet]??={claimId:id,assetId:'need0',remaining:amount,contact:0};return rawImpactGroundPacket(s,id,receipt,amount,target);};
const scenario=(inputs={})=>beginCampaign(enableContinuous(createHangarCampaign({kind:'current',inputs:{monthlyIncome:4000,monthlyLivingExpenses:1000,monthlyDebtPayments:200,totalDebt:10000,assetValue:20000,liquidReserves:5000,creditScore:700,...inputs},corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(key=>[key,{strength:.5,raw:{}}]))},'C'),{mode:'base'}));
const preset=s=>act(s,{type:'commandPreset'});
const launch=(s,budget=continuousSummary(s).unpaid,reserve=0)=>act(act(preset(s),{type:'commandBudget',amount:budget,reserve}),{type:'commandLaunch'});
test('grid validates all eleven footprints, rejects overlap, roads, fractions and combat moves without changing money',()=>{
 let s=scenario();assert.equal(validLayout(s.continuous.ground.command,true),false);s=preset(s);assert.equal(validLayout(s.continuous.ground.command,true),true);
 const money=continuousSummary(s),layout=structuredClone(s.continuous.ground.command.layout);
 for(const [col,row] of [[5,4],[1,4],[10,5],[2.5,2],[NaN,3]]){s=act(s,{type:'commandMove',assetId:'cashFlow',col,row});assert.deepEqual(s.continuous.ground.command.layout,layout);}
 s=act(s,{type:'commandMove',assetId:'cashFlow',col:2,row:2});assert.deepEqual(s.continuous.ground.command.layout.cashFlow,{col:2,row:2});assert.deepEqual(continuousSummary(s),money);
 s=launch(s);const before=structuredClone(s.continuous.ground.command.layout);s=act(s,{type:'commandMove',assetId:'cashFlow',col:2,row:2});assert.deepEqual(s.continuous.ground.command.layout,before);checkContinuous(s);
});
test('only Cash Flow fires; Credit gives exactly one local 20% range bonus and never changes money',()=>{
 let s=preset(scenario()),c=s.continuous.ground.command;assert.equal(creditSupports(c),true);const range=commandStats(s,c.towers[0]).range;
 for(const t of c.towers.slice(1)){assert.equal(commandStats(s,t).damage,0);assert.deepEqual(commandTargets(s,t,[]),[]);}
 const money=continuousSummary(s);s=act(s,{type:'commandMove',assetId:'credit',col:7,row:7});c=s.continuous.ground.command;assert.equal(creditSupports(c),false);assert.equal(range,commandStats(s,c.towers[0]).range*1.2);assert.deepEqual(continuousSummary(s),money);
});
test('covered impact pays income 60 plus savings 40 once, HP damage is separate; uncovered remainder stays owed',()=>{
 for(const covered of [true,false]){let s=preset(scenario());if(!covered)s=act(s,{type:'commandMove',assetId:'need0',col:2,row:7});assert.equal(capitalCovers(s.continuous.ground.command,'need0'),covered);
 s=act(act(s,{type:'commandBudget',amount:6000,reserve:4000}),{type:'commandLaunch'});const t=s.threats.find(t=>t.lane==='living'),income=s.incomeWallet,reserves=s.reserves;
 s=impactGroundPacket(s,t.id,'packet:contact:0',10000,'need0');assert.equal(s.incomeWallet,income-6000);assert.equal(s.reserves,reserves-(covered?4000:0));assert.equal(s.threats.find(x=>x.id===t.id).remaining,t.remaining-(covered?10000:6000));assert.ok(s.continuous.ground.command.lastImpact.damage>0);
 assert.equal(impactGroundPacket(s,t.id,'packet:contact:0',10000,'need0'),s);checkContinuous(s);}
});
test('missing context, zero cap and zero savings never authorize reserve debits',()=>{
 for(const [reserves,cap,target] of [[5000,4000,null],[5000,0,'need0'],[0,4000,'need0']]){let s=launch(scenario({liquidReserves:reserves}),0,cap);s.paused=false;const t=s.threats.find(t=>t.lane==='living'),before=s.reserves;s=impactGroundPacket(s,t.id,'a:contact:0',1000,target);assert.equal(s.reserves,before);checkContinuous(s);}
});
test('fixed routes stay outside build zone and meet at the same exit',()=>{
 for(const branch of [0,1])for(let n=0;n<=100;n++){const p=routePoint(branch,n/100);assert.ok(p.x<=200||p.x>=800||p.z<=200||p.z>=800);}
 assert.deepEqual(routePoint(0,0),routePoint(1,0));assert.equal(routePoint(0,1).x,500);assert.equal(routePoint(1,1).z,150);
});
test('grid save preserves permissions, packet identities, positions and replay highwater',()=>{
 const w=createCombat(launch(scenario(),6000,4000)),t=w.ledger.threats.find(t=>t.lane==='living');w.ledger=impactGroundPacket(w.ledger,t.id,'p:contact:0',100,'need0');w.ledger.paused=true;
 const restored=parseGroundRun(serializeGroundRun(w));assert.deepEqual(restored,w);restored.ledger.paused=false;assert.equal(impactGroundPacket(restored.ledger,t.id,'p:contact:0',100,'need0'),restored.ledger);
});
test('three waves: single-gun payments reconcile, packet limits hold, build pauses and zero-reserve play works',()=>{
 for(const reserves of [0,5000]){const w=createCombat(launch(scenario({liquidReserves:reserves}))),guns=new Set();
 for(let wave=1;wave<=3;wave++){for(let i=0;i<61*60;i++){advanceCombat(w,1/60);for(const b of w.ground.beams)guns.add(b.tower);assert.ok(w.drones.length<=60);const actors=combatActors(w).filter(a=>a.visible);assert.ok(actors.filter(a=>a.target.lane==='living').length<=8);assert.ok(actors.filter(a=>a.target.lane==='credit').length<=12);if(w.ledger.paused||w.ledger.phase!=='playing')break;}
 checkContinuous(w.ledger);assert.equal(w.ledger.continuous.ground.command.lastWave?.unpaid,0,`wave ${wave}, reserves ${reserves}`);if(wave<3){assert.equal(w.ledger.continuous.ground.command.stage,'build');w.ledger=launch(w.ledger);}}
 assert.equal(w.ledger.phase,'complete');assert.deepEqual([...guns],[0]);assert.equal(w.ledger.reserves,reserves*100);assert.equal(continuousSummary(w.ledger).cashDifference,0);}
});

test('registered target cannot be swapped to Capital and unknown contacts are rejected',()=>{
 const w=createCombat(launch(scenario(),0,1000)),s=w.ledger,packet=w.drones.find(d=>s.threats.find(t=>t.id===d.targetId)?.lane==='living'),record=s.continuous.ground.command.packetTargets[packet.id];
 s.continuous.ground.command.layout[record.assetId]={col:2,row:7};assert.equal(capitalCovers(s.continuous.ground.command,record.assetId),false);
 const result=rawImpactGroundPacket(s,packet.targetId,packet.id+':contact:0',1000,'capital');assert.equal(result.reserves,s.reserves);checkContinuous(result);
 assert.equal(rawImpactGroundPacket(s,packet.targetId,'unknown:contact:0',1000,'capital'),s);
 assert.equal(rawImpactGroundPacket(s,packet.targetId,packet.id+':contact:8',1000,record.assetId),s);
});
test('unknown save versions fail; known v1 migration preserves money, holds and packet identities',()=>{
 const w=createCombat(launch(scenario(),1000,500));w.ledger.paused=true;const save=JSON.parse(serializeGroundRun(w));save.world.ledger.continuous.ground.command.version=99;assert.throws(()=>parseGroundRun(JSON.stringify(save)),/Invalid command/);
 save.world.ledger.continuous.ground.command.version=1;delete save.world.ledger.continuous.ground.command.layout;
 const before=continuousSummary(save.world.ledger),ids=save.world.drones.map(d=>d.id),restored=parseGroundRun(JSON.stringify(save));assert.equal(restored.ledger.continuous.ground.command.version,2);assert.deepEqual(continuousSummary(restored.ledger),before);assert.deepEqual(restored.drones.map(d=>d.id),ids);assert.equal(restored.ledger.continuous.ground.command.allowance,1000);assert.equal(restored.ledger.continuous.ground.reserveAllowance,500);
});
test('grid reducer cannot buy or liquidate legacy modules',()=>{const s=preset(scenario());for(const type of ['moduleBuy','moduleSell']){const after=act(s,{type,assetId:'module:1'});assert.deepEqual(continuousSummary(after),continuousSummary(s));assert.deepEqual(after.continuous.ground.assets,s.continuous.ground.assets);}});

test('oversized valid contact is capped by registered packet remainder',()=>{const w=createCombat(launch(scenario(),100000,100000)),s=w.ledger,p=w.drones.find(d=>s.threats.find(t=>t.id===d.targetId)?.lane==='living'),r=s.continuous.ground.command.packetTargets[p.id];const before=s.incomeWallet+s.reserves;const after=rawImpactGroundPacket(s,p.targetId,p.id+':contact:0',100000,r.assetId);assert.equal(before-after.incomeWallet-after.reserves,p.remaining);checkContinuous(after);});

test('manual assist launches from Cash Flow and a missed blast refunds its exact held cash',()=>{
 const w=createCombat(launch(scenario()));w.ledger=act(w.ledger,{type:'commandAssist',enabled:true});w.ground.towerCooldowns=[Infinity,Infinity,Infinity,Infinity];const before=w.ledger.incomeWallet;
 w.aim={x:950,z:950};w.pendingShot=true;advanceCombat(w,.1);const p=w.ground.projectiles[0];assert.ok(p);assert.equal(p.sx,450);assert.equal(p.sz,450);assert.ok(continuousSummary(w.ledger).held>0);
 for(let i=0;i<120;i++)advanceCombat(w,1/60);assert.equal(w.ground.projectiles.length,0);assert.equal(w.ground.blasts.length,0);assert.equal(continuousSummary(w.ledger).held,0);assert.equal(w.ledger.incomeWallet,before);checkContinuous(w.ledger);
});
