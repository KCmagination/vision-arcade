import assert from 'node:assert/strict';
import test from 'node:test';
import {createLoadout,createSector,stepSector,hitAccount,finishSector,resumeSector,strikeAccount,PERIOD_SECONDS,ARENA,ARENA_CORNERS,withinCorner,enemyMoveSpeed,summarizeSector} from '../lib/arcade-engine.js';
import {practiceScenario,startPlan,projection,repay,settlePeriod,nextPeriod,totalDebt,availableFunds,requiredPayments,interestEstimate,reserveMilestone,sequence,practiceInputs} from '../lib/debtbreak-finance.js';
const loadout=createLoadout({cashFlow:0,capital:.5,collateral:.5,credit:.5});
const idle={x:0,z:0,fire:false,shield:false,dash:false};
const playing = (savings=40000,strategy='snowball') => {const s=createSector(loadout,startPlan(practiceScenario(),savings,strategy));s.phase='playing';return s;};

test('all cent-level allocations reconcile, including clamp edges',()=>{
 const start=practiceScenario();
 for(let n=-1;n<=80001;n+=137){const p=startPlan(start,n,'snowball');assert.equal(p.savings+p.budget,80000);assert.ok(p.savings>=0&&p.budget>=0);}
 for(const n of [0,1,40000,79999,80000,NaN,Infinity]){const p=startPlan(start,n,'avalanche');assert.equal(p.savings+p.budget,availableFunds(start));}
});
test('given Snowball example, released payment, $600 repair and next period interest',()=>{
 const p=startPlan(practiceScenario(),40000,'snowball');assert.equal(p.ledger.reserves,80000);
 const hit=repay(p,'LN-01',40000);assert.ok(hit.bonus);assert.equal(hit.freed,4000);assert.equal(totalDebt(p.ledger),260000);
 const projected=projection(p.start,40000,'snowball');assert.equal(projected.nextSurplus,84000);assert.equal(projected.interest,5200);
 settlePeriod(p);assert.equal(p.ledger.reserves,20000);assert.equal(p.event.shortfall,0);
 const next=nextPeriod(p);assert.equal(next.minimums,16000);assert.equal(next.interestPosted,5200);assert.equal(next.debts[1].balance,249200);assert.equal(availableFunds(next),84000);
 const again=nextPeriod(p);assert.deepEqual(again,next);assert.deepEqual(settlePeriod(p).ledger,p.ledger);
});
test('Avalanche works with one cent and yields lower interest in supplied example',()=>{
 const p=startPlan(practiceScenario(),40000,'avalanche');assert.equal(p.targetId,'CC-02');repay(p,'CC-02',40000);
 assert.equal(p.ledger.debts[0].balance,40000);assert.equal(p.ledger.debts[1].balance,220000);assert.equal(requiredPayments(p.ledger),20000);
 assert.equal(interestEstimate(p.ledger),4667);assert.ok(interestEstimate(p.ledger)<projection(p.start,40000,'snowball').interest);
 const tiny=playing(79999,'avalanche');hitAccount(tiny,tiny.enemies[1],99999);assert.equal(tiny.plan.executed,1);assert.equal(tiny.plan.remaining,0);
});
test('budget and account caps hold across many impacts, and paused/settled ledgers cannot pay',()=>{
 const s=playing(12345);const before=totalDebt(s.plan.ledger);
 for(let i=0;i<1000;i++)hitAccount(s,s.enemies[i%2],997);
 assert.equal(s.plan.executed,s.plan.budget);assert.equal(before-totalDebt(s.plan.ledger),s.plan.budget);assert.equal(s.plan.remaining,0);
 finishSector(s);const snapshot=structuredClone(s.plan);hitAccount(s,s.enemies[0],100);assert.deepEqual(s.plan,snapshot);
});
test('misses, contacts, shields and assist fields never erase money or repay debt',()=>{
 const s=playing();const before=structuredClone(s.plan);s.enemies.forEach(e=>{e.x=-8;e.z=-7;});
 for(let i=0;i<100;i++)stepSector(s,{...idle,fire:true,aim:{x:8,z:7}},loadout,.05);
 assert.deepEqual(s.plan,before);assert.ok(s.shotsFired>0);
 s.enemies[0].x=s.x;s.enemies[0].z=s.z;s.hitFlash=0;stepSector(s,idle,loadout,.05);assert.equal(s.health,80);assert.deepEqual(s.plan,before);
 s.x=14;s.z=-10;s.enemies.forEach(e=>{e.x=0;e.z=0;});s.assist={pillar:1,remaining:5,...ARENA_CORNERS[1],tick:0,rays:[]};s.health=50;stepSector(s,idle,loadout,.05);assert.ok(s.health>50);assert.deepEqual(s.plan,before);
 for(const pillar of [0,2,3]){s.assist={pillar,remaining:5,x:s.x,z:s.z,tick:0};stepSector(s,{...idle,shield:true},loadout,.05);assert.deepEqual(s.plan,before);}
});
test('correct target locks until clear; out-of-order payments are valid but get no clear bonus',()=>{
 const p=startPlan(practiceScenario(),0,'snowball');repay(p,'CC-02',10000);assert.equal(p.outOfOrderPaid,10000);assert.equal(p.targetId,'LN-01');assert.equal(p.bonuses.length,0);
 const ledger=practiceScenario();ledger.debts[0].balance=10000;ledger.debts[1].balance=20000;
 const q=startPlan(ledger,0,'snowball');repay(q,'CC-02',20000);assert.equal(q.cleared.length,1);assert.equal(q.bonuses.length,0);assert.equal(q.targetId,'LN-01');
 repay(q,'LN-01',10000);assert.equal(q.bonuses.length,1);assert.equal(q.targetId,null);
});
test('Avalanche equal-rate ties use smaller balance, not income or weapon strength',()=>{
 const l=practiceScenario();l.debts[0].apr=24;assert.equal(sequence(l,'avalanche')[0].id,'LN-01');
 const p=startPlan(l,0,'avalanche');repay(p,'LN-01',40000);assert.equal(p.targetId,'CC-02');
});
test('strategy bonus scales with campaign debt share and remains capped',()=>{
 const base=practiceScenario();base.income=10000000;
 const big=structuredClone(base);big.campaignDebt*=10;big.debts.forEach(d=>{d.balance*=10;d.payment*=10;});
 const a=startPlan(base,0,'snowball'), b=startPlan(big,0,'snowball');
 assert.equal(repay(a,'LN-01',40000).bonus.multiplier,repay(b,'LN-01',400000).bonus.multiplier);
 for(let i=0;i<8;i++){const l=practiceScenario();l.assistIndex=i;const p=startPlan(l,0,'snowball');const bonus=repay(p,'LN-01',40000).bonus;assert.equal(bonus.pillar,i%4);assert.ok(bonus.multiplier<=1.75&&bonus.seconds<=8);}
});
test('time-limited partial progress carries unused funds without applying them',()=>{
 const s=playing();hitAccount(s,s.enemies[0],10000);s.elapsed=PERIOD_SECONDS-.01;stepSector(s,idle,loadout,.05);
 assert.equal(s.phase,'payday');assert.equal(s.plan.executed,10000);assert.equal(s.plan.ledger.carry,30000);assert.equal(s.plan.ledger.debts[0].balance,30000);
 const next=nextPeriod(s.plan);assert.equal(next.carry,30000);assert.equal(availableFunds(next),110000);
});
test('no merging or duplicate-balance bosses, even at identical positions',()=>{
 const s=playing();s.enemies.forEach(e=>{e.x=5;e.z=-5;});const initial=totalDebt(s.plan.ledger);
 for(let i=0;i<40;i++)stepSector(s,idle,loadout,.05);
 assert.equal(s.enemies.length,2);assert.equal(s.merges,0);assert.equal(s.enemies.filter(e=>e.boss).length,0);assert.equal(totalDebt(s.plan.ledger),initial);
});
test('Game Over and retries restore deposits and snapshots exactly',()=>{
 const s=playing();hitAccount(s,s.enemies[0],10000);
 for(let i=0;i<5;i++){s.enemies[0].x=s.x;s.enemies[0].z=s.z;s.hitFlash=0;stepSector(s,idle,loadout,.02);}
 assert.equal(s.phase,'failed');assert.equal(s.health,0);assert.equal(s.plan.settled,false);assert.equal(s.plan.event,null);
 const retried=startPlan(s.plan.start,s.plan.savings,s.plan.strategy);assert.deepEqual(retried,startPlan(practiceScenario(),40000,'snowball'));assert.equal(retried.ledger.reserves,80000);
});
test('insufficient reserves disclose exact repair shortfall and deduct next period',()=>{
 const p=startPlan(practiceScenario(),0,'avalanche');settlePeriod(p);assert.equal(p.event.covered,40000);assert.equal(p.event.shortfall,20000);assert.equal(p.ledger.reserves,0);
 const next=nextPeriod(p);assert.equal(next.repairDue,20000);assert.equal(availableFunds(next),140000); // $600 surplus + $800 unused
 const p2=startPlan(next,0,'snowball');settlePeriod(p2);assert.equal(p2.event,null);assert.equal(nextPeriod(p2).repairDue,0);
});
test('reserve milestones recalculate on payment release at 1,3,6,9,12 months',()=>{
 const l=practiceScenario();for(const months of [0,1,3,6,9,12]){l.reserves=months*320000;const m=reserveMilestone(l);assert.equal(m.months,months);assert.equal(m.next,[1,3,6,9,12].find(n=>n>months)??null);}
 l.reserves=316000;l.debts[0].balance=0;assert.equal(reserveMilestone(l).months,1);assert.equal(reserveMilestone(l).next,3);
});
test('released payments reduce the practice input obligation; API strengths control fire rate',()=>{
 const p=startPlan(practiceScenario(),40000,'snowball');
 const before=practiceInputs(p.start).monthlyDebtPayments;
 repay(p,'LN-01',40000);
 assert.ok(practiceInputs(p.ledger).monthlyDebtPayments<before);
 // Test public gameplay consumption, not the proprietary input-to-strength calculation.
 assert.ok(createLoadout({cashFlow:.8}).fireRate>createLoadout({cashFlow:.2}).fireRate);
});
test('pause and frame-gap bounds preserve combat and ledger state',()=>{
 const s=playing();stepSector(s,{...idle,x:1,dash:true},loadout,1000);assert.equal(s.elapsed,.05);s.phase='paused';s.events=[];
 const before=structuredClone(s);stepSector(s,{...idle,fire:true},loadout,10);assert.deepEqual(s,before);
});
test('actual moving projectiles execute the budget and reach payday with remaining debt',()=>{
 for(const strategy of ['snowball','avalanche']){
  const s=playing(40000,strategy), targetId=s.plan.targetId;
  for(let frame=0;frame<1200&&s.phase==='playing';frame++){
   const tx=Math.sin(s.elapsed*.6)*6, tz=Math.cos(s.elapsed*.6)*5;
   stepSector(s,{...idle,x:tx-s.x,z:tz-s.z,fire:true,targetId},loadout,.05);
  }
  assert.equal(s.phase,'payday',strategy);assert.equal(s.plan.executed,40000);assert.ok(s.shotsHit>0);assert.ok(s.enemies.length>0);assert.equal(totalDebt(s.plan.ledger),260000);
 }
});
test('savings-only survival, then one settled event; all remaining funds stay reserves',()=>{
 const s=playing(80000);s.elapsed=PERIOD_SECONDS-.01;stepSector(s,idle,loadout,.05);
 assert.equal(s.phase,'payday');assert.equal(s.plan.executed,0);assert.equal(totalDebt(s.plan.ledger),300000);assert.equal(s.plan.ledger.reserves,60000);
});

test('empty ammunition keeps combat and earned bonuses alive until payday',()=>{
 const s=playing();hitAccount(s,s.enemies[0],40000);const bonus=s.bonusTime;
 for(let i=0;i<100;i++)stepSector(s,{...idle,shield:true},loadout,.05);
 assert.equal(s.plan.remaining,0);assert.equal(s.phase,'playing');assert.equal(s.plan.settled,false);
 assert.equal(s.bonusTime,bonus);assert.equal(s.assist,null);assert.deepEqual(s.assistQueue,[0,1,2,3]);assert.equal(s.plan.ledger.reserves,80000);
});
test('both strategies activate every pillar without needing four account kills',()=>{
 for(const strategy of ['snowball','avalanche']){
  const s=playing(40000,strategy);hitAccount(s,s.enemies.find(e=>e.accountId===s.plan.targetId),40000);
  assert.deepEqual(s.assistQueue,[0,1,2,3]);assert.equal(s.kills,strategy==='snowball'?1:0);
  const seen=new Set();
  for(const i of [0,1,2,3]){
   const corner=ARENA_CORNERS[i];s.x=corner.x-Math.sign(corner.x)*2;s.z=corner.z-Math.sign(corner.z)*2;
   stepSector(s,{...idle,shield:true},loadout,.01);if(s.assist)seen.add(s.assist.pillar);
   for(let frame=0;frame<101;frame++)stepSector(s,{...idle,shield:true},loadout,.05);
  }
  assert.deepEqual([...seen],[0,1,2,3]);assert.equal(s.plan.executed,40000);
 }
 const wrong=playing(40000,'snowball');hitAccount(wrong,wrong.enemies[1],40000);assert.deepEqual(wrong.assistQueue,[]);
});
test('payday resumes the same battlefield and retries do not compound accounting',()=>{
 const s=playing();hitAccount(s,s.enemies[0],40000);s.health=63;s.x=3;s.z=2;
 s.shots=[{x:0,z:0,vx:1,vz:1,life:2,enemy:true}];finishSector(s);
 const checkpoint=structuredClone(s), next=nextPeriod(s.plan);
 const begin=()=>resumeSector(structuredClone(checkpoint),loadout,startPlan(next,30000,'avalanche',15000));
 const first=begin();assert.equal(first.health,63);assert.equal(first.x,3);assert.equal(first.z,2);
 assert.deepEqual(first.shots,checkpoint.shots);assert.equal(first.enemies.length,1);
 assert.equal(first.enemies[0].x,checkpoint.enemies[1].x);assert.equal(first.enemies[0].hp,249200);
 assert.equal(first.plan.ledger.reserves,50000);assert.equal(first.history.length,1);assert.equal(first.bonusTime,checkpoint.bonusTime);
 hitAccount(first,first.enemies[0],10000,'reserves');assert.deepEqual(begin(),begin());
 assert.equal(begin().plan.ledger.reserves,50000);assert.equal(checkpoint.plan.ledger.reserves,20000);
});
test('intentional ram contact spends savings once, respects all caps, and leaves ammunition alone',()=>{
 const s=createSector(loadout,startPlan(practiceScenario(),40000,'snowball',15000));s.phase='playing';
 const e=s.enemies[0];s.x=e.x;s.z=e.z+.4;
 stepSector(s,{...idle,ram:true},loadout,.01);
 assert.equal(s.plan.reserveSpent,10000);assert.equal(s.plan.ledger.reserves,70000);
 assert.equal(e.hp,30000);assert.equal(s.plan.executed,0);assert.equal(s.plan.remaining,40000);assert.equal(s.health,100);
 assert.equal(strikeAccount(s,e),null);assert.equal(s.plan.reserveSpent,10000);
 s.ramTime=.3;s.ramHit=false;strikeAccount(s,e);
 assert.equal(s.plan.reserveSpent,15000);assert.equal(s.plan.reserveRemaining,0);assert.equal(e.hp,25000);
 const capped=startPlan(practiceScenario(),40000,'snowball',999999);capped.ledger.reserves=33;
 assert.equal(repay(capped,'LN-01',10000,'reserves').amount,33);assert.equal(capped.ledger.reserves,0);
 const almost=startPlan(practiceScenario(),40000,'snowball',10000);almost.ledger.debts[0].balance=17;
 assert.equal(repay(almost,'LN-01',10000,'reserves').amount,17);assert.equal(almost.reserveSpent,17);
});
test('missed reserve strikes, ordinary shields, and held ram controls never drain extra savings',()=>{
 const s=createSector(loadout,startPlan(practiceScenario(),40000,'snowball',20000));s.phase='playing';
 stepSector(s,{...idle,ram:true,x:1},loadout,.05);assert.equal(s.plan.reserveSpent,0);
 s.ramTime=0;s.ramCooldown=0;s.x=s.enemies[0].x;s.z=s.enemies[0].z;
 stepSector(s,{...idle,ram:true},loadout,.01);assert.equal(s.ramTime,0);assert.equal(s.plan.reserveSpent,0);
 stepSector(s,{...idle,shield:true},loadout,.01);assert.equal(s.plan.reserveSpent,0);
 const off=playing();off.x=off.enemies[0].x;off.z=off.enemies[0].z;
 stepSector(off,{...idle,ram:true},loadout,.01);assert.equal(off.plan.reserveSpent,0);
});
test('reserve spending changes repair coverage and is restored by a period retry',()=>{
 const start=practiceScenario(), p=startPlan(start,40000,'snowball',40000);
 repay(p,'LN-01',30000,'reserves');settlePeriod(p);
 assert.equal(p.event.covered,50000);assert.equal(p.event.shortfall,10000);assert.equal(nextPeriod(p).repairDue,10000);
 const retry=startPlan(p.start,p.savings,p.strategy,p.reserveLimit);assert.equal(retry.ledger.reserves,80000);assert.equal(retry.reserveSpent,0);
});
test('projectile payment amount remains constant as campaign debt falls',()=>{
 const s=playing();hitAccount(s,s.enemies[0],40000);finishSector(s);
 resumeSector(s,loadout,startPlan(nextPeriod(s.plan),0,'avalanche'));
 const e=s.enemies[0],before=e.hp;s.shots=[{x:e.x,z:e.z,vx:0,vz:0,life:1,enemy:false}];
 stepSector(s,idle,loadout,.01);assert.equal(before-e.hp,2500);
});
test('only clearing all debts produces the victory animation and resolved level',()=>{
 const l=practiceScenario();l.income=1000000;
 const s=createSector(loadout,startPlan(l,0,'snowball'));s.phase='playing';
 hitAccount(s,s.enemies[0],40000);hitAccount(s,s.enemies[1],260000);stepSector(s,idle,loadout,.01);
 assert.equal(s.phase,'victory');assert.equal(s.plan.settled,false);assert.equal(s.enemies.length,0);
 for(let frame=0;frame<61;frame++)stepSector(s,idle,loadout,.05);
 assert.equal(s.phase,'complete');assert.equal(s.plan.settled,true);assert.equal(totalDebt(s.plan.ledger),0);
});
test('final minimum payment at payday can also resolve the level',()=>{
 const s=playing();s.plan.ledger.debts.forEach(d=>{d.balance=10;});finishSector(s);
 const next=nextPeriod(s.plan);assert.equal(totalDebt(next),0);
 resumeSector(s,loadout,startPlan(next,0,'snowball'));assert.equal(s.phase,'victory');assert.equal(s.enemies.length,0);
 for(let frame=0;frame<61;frame++)stepSector(s,idle,loadout,.05);assert.equal(s.phase,'complete');
});
test('full moving and shooting campaigns resolve across paydays with all four assists',()=>{
 const getLoadout=()=>createLoadout({cashFlow:.5,capital:.5,collateral:.5,credit:.5});
 for(const strategy of ['snowball','avalanche']){
  let p=startPlan(practiceScenario(),40000,strategy,20000), kit=getLoadout(p);
  const s=createSector(kit,p);s.phase='playing';const pillars=new Set();let waypoint=1;
  for(let frame=0;frame<5000&&!['failed','complete'].includes(s.phase);frame++){
   if(s.phase==='payday'){
    const next=nextPeriod(s.plan);p=startPlan(next,Math.round(availableFunds(next)/2),strategy,20000);kit=getLoadout(p);resumeSector(s,kit,p);
   }
   const corner=ARENA_CORNERS[waypoint],tx=corner.x-Math.sign(corner.x)*2,tz=corner.z-Math.sign(corner.z)*2;
   if(Math.hypot(tx-s.x,tz-s.z)<.5)waypoint=(waypoint+1)%4;
   stepSector(s,{...idle,x:tx-s.x,z:tz-s.z,fire:true,shield:s.plan.remaining===0,targetId:s.plan.targetId},kit,.05);
   if(s.assist)pillars.add(s.assist.pillar);
  }
  assert.equal(s.phase,'complete',strategy);assert.equal(totalDebt(s.plan.ledger),0);
  assert.ok(s.plan.ledger.period>1);assert.ok(s.shotsHit>80);assert.deepEqual([...pillars].sort(),[0,1,2,3]);
  assert.equal(s.history.length,s.plan.ledger.period-1);assert.ok(s.plan.ledger.reserves>0);
 }
});
test('the larger arena has reachable corners and bounds normal movement and reserve dashes',()=>{
 const s=playing();s.enemies.forEach(e=>{e.cooldown=100;});
 for(let frame=0;frame<120;frame++)stepSector(s,{...idle,x:1,z:1,shield:true},loadout,.05);
 assert.ok(s.x>8.2&&s.z>7.5);assert.equal(s.z,ARENA.halfDepth-ARENA.playerInset);
 assert.ok(withinCorner(s.x,s.z,2));
 for(let frame=0;frame<120;frame++)stepSector(s,{...idle,x:1,z:1,dash:true},loadout,.05);
 assert.equal(s.x,ARENA.halfWidth-ARENA.playerInset);assert.equal(s.z,ARENA.halfDepth-ARENA.playerInset);
});
test('smaller enemies pursue faster and converging targets remain separate without money changes',()=>{
 const s=playing(),[small,large]=s.enemies;
 assert.ok(enemyMoveSpeed(small)>enemyMoveSpeed(large)*1.15);
 assert.ok(enemyMoveSpeed(small)<enemyMoveSpeed(large)*1.4);
 const before=structuredClone(s.plan);small.x=large.x=0;small.z=large.z=-6;
 for(let frame=0;frame<50;frame++)stepSector(s,{...idle,z:1,shield:true},loadout,.05);
 assert.ok(Math.hypot(small.x-large.x,small.z-large.z)>2);assert.deepEqual(s.plan,before);
});
test('corner charges wait for entry, expire after five seconds, and require leaving before reuse',()=>{
 const s=playing(40000,'avalanche');hitAccount(s,s.enemies[1],40000);s.health=50;s.enemies.forEach(e=>{e.cooldown=100;});
 for(let frame=0;frame<140;frame++)stepSector(s,idle,loadout,.05);
 assert.equal(s.assist,null);assert.equal(s.assistQueue.length,4);assert.equal(s.health,50);
 s.x=14;s.z=-10;stepSector(s,idle,loadout,.05);
 assert.equal(s.assist.pillar,1);assert.equal(s.assist.x,16);assert.equal(s.assist.z,-12);assert.ok(s.health>50);
 // A charge earned in a later period cannot extend a single visit indefinitely.
 s.assistQueue.push(1);for(let frame=0;frame<110;frame++)stepSector(s,idle,loadout,.05);
 assert.equal(s.assist,null);const stopped=s.health;stepSector(s,idle,loadout,.05);assert.equal(s.health,stopped);
 s.x=0;s.z=0;stepSector(s,idle,loadout,.05);s.x=14;s.z=-10;stepSector(s,idle,loadout,.05);assert.equal(s.assist.pillar,1);
});
test('quarter-circle protection matches the arena boundary and has no remote healing',()=>{
 for(const [i,c] of ARENA_CORNERS.entries()){
  assert.ok(withinCorner(c.x-Math.sign(c.x)*2,c.z-Math.sign(c.z)*2,i));
  assert.equal(withinCorner(c.x+Math.sign(c.x),c.z,i),false);
  assert.equal(withinCorner(0,0,i),false);
 }
 const s=playing();s.assistQueue=[1];s.health=50;s.x=14;s.z=-10;stepSector(s,idle,loadout,.05);
 const before=s.health;s.x=0;s.z=5;stepSector(s,idle,loadout,.05);assert.equal(s.health,before);assert.ok(s.assist.remaining<5);
 finishSector(s);const paused=s.assist.remaining;resumeSector(s,loadout,startPlan(nextPeriod(s.plan),0,'snowball'));
 assert.equal(s.assist.remaining,paused);assert.deepEqual(s.assistQueue,[]);
});
test('sword, shield and credit support act only in their corners and never repay accounts',()=>{
 for(const pillar of [0,2,3]){
  const s=playing(),c=ARENA_CORNERS[pillar];s.x=c.x-Math.sign(c.x)*2;s.z=c.z-Math.sign(c.z)*2;
  s.assistQueue=[pillar];s.enemies.forEach(e=>{e.cooldown=100;e.x=0;e.z=0;});
  const before=structuredClone(s.plan);
  s.shots=[{x:s.x,z:s.z,vx:0,vz:0,life:2,enemy:true},{x:0,z:0,vx:0,vz:0,life:2,enemy:true}];
  stepSector(s,idle,loadout,.05);assert.equal(s.health,100);assert.equal(s.shots.length,1);assert.equal(s.shots[0].x,0);assert.deepEqual(s.plan,before);
  if(pillar===0)assert.equal(s.assist.rays.length,1);
  if(pillar===3){
   const near=s.enemies[0],far=s.enemies[1];near.x=s.x+2;near.z=s.z;far.x=0;far.z=0;
   const prior={x:near.x,z:near.z};stepSector(s,idle,loadout,.05);assert.equal(near.x,prior.x);assert.equal(near.z,prior.z);assert.notEqual(far.x,0);
  }
 }
});
test('an out-of-order hit identifies the account actually paid and the selected strategy target',()=>{
 const s=playing(40000,'avalanche');hitAccount(s,s.enemies[0],2500);
 assert.match(s.notice,/Paid Loan/);assert.match(s.notice,/Avalanche target: Card · 24% APR/);
 assert.equal(s.plan.outOfOrderPaid,2500);assert.equal(s.plan.targetId,'CC-02');
});
test('attempt comparisons aggregate every period and retain charged interest rather than an estimate',()=>{
 const s=playing();hitAccount(s,s.enemies[0],40000);finishSector(s);
 const earlier=summarizeSector(s);
 resumeSector(s,loadout,startPlan(nextPeriod(s.plan),40000,'avalanche',5000));
 hitAccount(s,s.enemies[0],10000);hitAccount(s,s.enemies[0],5000,'reserves');
 const now=summarizeSector(s);
 assert.equal(now.periods,2);assert.equal(now.executed,50000);assert.equal(now.reserveSpent,5000);
 assert.equal(now.interest,5200);assert.equal(now.reserves,55000);assert.equal(now.unallocated,34000);
 assert.equal(now.strategy,'mixed');assert.equal(earlier.periods,1);assert.equal(earlier.executed,40000);assert.equal(earlier.interest,0);
});
