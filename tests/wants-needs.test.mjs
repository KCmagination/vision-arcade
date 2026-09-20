import assert from "node:assert/strict";
import test from "node:test";
import {createRunner,createRunnerLoadout,stepRunner,RUNNER_LEVELS,RUNNER_GROUND} from "../lib/wants-needs-engine.js";
const corners=n=>({cashFlow:n,capital:n,collateral:n,credit:n});
const idle={move:0,jump:false,fire:false};
const run=(l,level=1)=>{const s=createRunner(l,level);s.phase="playing";return s;};

test("each corner changes only its requested gameplay property; unknown is neutral and inputs stay intact",()=>{
  const inputs=Object.freeze(corners(0)),low=createRunnerLoadout(inputs),high=createRunnerLoadout(corners(1));
  for(const [corner,property] of [["cashFlow","fireRate"],["capital","shieldsMax"],["collateral","jumpVelocity"],["credit","speed"]]){
    assert.ok(high[property]>low[property]);
    const change=createRunnerLoadout({...inputs,[corner]:1});
    for(const key of Object.keys(low))if(key!==property)assert.deepEqual(change[key],low[key]);
  }
  const unknown=createRunnerLoadout({...corners(.5),credit:null});
  assert.equal(unknown.speed,createRunnerLoadout(corners(.5)).speed);assert.deepEqual(unknown.unknown,["credit"]);
  assert.deepEqual(inputs,corners(0));
});

test("fire rate, speed and jump height change actual simulation, and held jump does not repeat",()=>{
  const measurements=[];
  for(const n of [0,1]){
    const l=createRunnerLoadout(corners(n)),s=run(l);s.enemies=[];
    let apex=s.y;
    for(let i=0;i<240;i++){stepRunner(s,{move:1,jump:true,fire:true},l,1/120);apex=Math.min(apex,s.y);}
    measurements.push({shots:s.shotsFired,distance:s.x-120,height:RUNNER_GROUND-apex});
    assert.equal(s.grounded,true);assert.equal(s.y,RUNNER_GROUND);
  }
  assert.ok(measurements[1].shots>measurements[0].shots*2);
  assert.ok(measurements[1].distance>measurements[0].distance);
  assert.ok(measurements[1].height>measurements[0].height*2);
});

test("minimum equity can land on the low route and high equity can reach upper platforms",()=>{
  for(const [n,x,platformY] of [[0,670,380],[1,1400,306]]){
    const l=createRunnerLoadout(corners(n)),s=run(l);s.enemies=[];s.x=x;
    for(let i=0;i<220;i++)stepRunner(s,{...idle,jump:i<2},l,1/120);
    assert.equal(s.grounded,true);assert.equal(s.y,platformY);
  }
});

test("the exact bosses and dialogue appear in order, lock the end arena and require a defeat",()=>{
  assert.deepEqual(RUNNER_LEVELS.map(l=>[l.name,l.line]),[
    ["Land Lord","Time to pay the rent!"],["Car Magedon","More maintenance!"],["Mortgage Maniac","Own your home!"]]);
  const l=createRunnerLoadout(corners(.5));
  for(let level=1;level<=3;level++){
    const s=run(l,level);s.enemies=[];s.x=2600;
    stepRunner(s,idle,l,.01);assert.equal(s.phase,"bossIntro");assert.ok(s.boss.active);
    const before=structuredClone(s);stepRunner(s,{move:1,fire:true,jump:true},l,10);assert.deepEqual(s,before);
    s.phase="playing";s.boss.hp=1;s.x=2800;
    s.shots=[{x:s.boss.x-100,y:s.boss.y-35,vx:3000,vy:0,enemy:false,life:1,kind:"pulse"}];
    stepRunner(s,idle,l,.04);
    assert.equal(s.phase,level===3?"complete":"levelClear");assert.equal(s.score,level*500);
  }
});

test("coffee and burger enemies shoot and can be cleared, and shots hit just the nearest target",()=>{
  const l=createRunnerLoadout(corners(0)),s=run(l);s.x=400;
  for(const e of s.enemies.slice(0,2)){e.cooldown=0;e.active=true;}
  stepRunner(s,idle,l,.01);assert.ok(s.shots.some(b=>b.enemy&&b.kind==="coffee"));assert.ok(s.shots.some(b=>b.enemy&&b.kind==="burger"));
  const first=s.enemies[0],second=s.enemies[1];second.x=first.x+45;second.y=RUNNER_GROUND;second.tick=0;
  s.shots=[{x:first.x-80,y:420,vx:4000,vy:0,enemy:false,life:1,kind:"pulse"}];
  stepRunner(s,idle,l,.04);assert.ok(!s.enemies.includes(first));assert.equal(second.hp,2);assert.equal(s.wantsCleared,1);
});

test("shields precede health, real failure freezes play, pause freezes play and retry restores level start",()=>{
  const l=createRunnerLoadout({...corners(0),capital:.5}),s=run(l);s.enemies=[];
  const hit=()=>{s.invulnerable=0;s.shots=[{x:s.x-20,y:s.y-25,vx:1000,vy:0,life:1,enemy:true,kind:"key"}];stepRunner(s,idle,l,.04);};
  for(let i=0;i<l.shieldsMax;i++)hit();assert.equal(s.lives,5);assert.equal(s.shields,0);
  for(let i=0;i<5;i++)hit();assert.equal(s.phase,"failed");
  const before=structuredClone(s);stepRunner(s,{move:1,jump:true,fire:true},l,20);assert.deepEqual(s,before);
  const fresh=createRunner(l,2,700);assert.equal(fresh.level,2);assert.equal(fresh.score,700);assert.equal(fresh.lives,5);assert.equal(fresh.shields,l.shieldsMax);
  fresh.phase="paused";const paused=structuredClone(fresh);stepRunner(fresh,idle,l,.01);assert.deepEqual(fresh,paused);
});

test("the original ground route and bosses remain completable at minimum, neutral and maximum strengths",()=>{
  for(const width of [640,960])for(const n of [0,.5,1]){
    const l=createRunnerLoadout(corners(n));let score=0;
    for(let level=1;level<=3;level++){
      const s=createRunner(l,level,score,width);s.phase="playing";
      // Preserve the original encounter fixture for this regression. New threats are exercised below.
      s.enemies=s.enemies.filter(e=>e.kind==="coffee"||e.kind==="burger");
      for(let frame=0;frame<14400;frame++){
        if(s.phase==="bossIntro")s.phase="playing";
        if(s.phase!=="playing")break;
        const incoming=s.shots.some(b=>b.enemy&&b.vx<0&&b.x>s.x&&b.x-s.x<95&&b.y>s.y-50);
        const contact=s.enemies.some(e=>e.x>s.x&&e.x-s.x<90);
        const target=s.boss.active?Math.max(2780,3400-width+145):3400;
        stepRunner(s,{move:s.x<target?1:0,jump:s.grounded&&(incoming||contact),fire:true},l,1/120);
      }
      assert.equal(s.phase,level===3?"complete":"levelClear",`width=${width}, strength=${n}, level=${level}, boss hp=${s.boss.hp}`);
      assert.ok(s.lives>0);assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y));assert.ok(s.shots.length<100);score=s.score;
    }
  }
});

test("each level has the rounded-up 50% increase, including Utilities and sky planes",()=>{
  for(let level=1;level<=3;level++){
    const s=createRunner(createRunnerLoadout(corners(.5)),level);
    assert.equal(s.enemies.length,17);
    assert.equal(s.enemies.filter(e=>e.kind==="utility").length,3);
    assert.equal(s.enemies.filter(e=>e.kind==="plane").length,3);
    assert.equal(new Set(s.enemies.map(e=>e.id)).size,17);
  }
});

test("every Utilities hit drops a boost and minimum-equity jumps from all marked platforms reach both drops",()=>{
  for(const platform of [0,1,3]){
    const l=createRunnerLoadout(corners(0)),s=run(l);
    const utility=s.enemies.find(e=>e.kind==="utility"&&e.platform===platform),p=s.platforms[platform];
    s.enemies=[utility];s.x=p.x+p.w-15;s.y=p.y;s.grounded=true;
    for(let hit=0;hit<2;hit++){
      s.shots=[{x:utility.x-45,y:utility.y-25,vx:1200,vy:0,life:1,enemy:false,kind:"pulse"}];
      stepRunner(s,idle,l,.04);assert.equal(s.powerups.length,hit+1);
    }
    assert.equal(s.enemies.length,0);s.shots=[];
    for(let frame=0;frame<80;frame++)stepRunner(s,{...idle,move:1,jump:frame===0},l,1/120);
    assert.equal(s.boostsCollected,2,`platform ${platform}`);assert.equal(s.powerups.length,0);assert.ok(s.rapidFire>10);
    const before=s.shotsFired;
    for(let frame=0;frame<240;frame++)stepRunner(s,{...idle,fire:true},l,1/120);
    assert.ok(s.shotsFired-before>=6&&s.shotsFired-before<=7);assert.equal(l.fireRate,2);
  }
});

test("boosts cannot be collected by standing nearby or jumping directly from the ground, even at maximum equity",()=>{
  const l=createRunnerLoadout(corners(1)),s=run(l);s.enemies=[];s.x=830;
  s.powerups=[{x:830,y:306,platform:0}];
  for(let frame=0;frame<240;frame++)stepRunner(s,{...idle,jump:frame===0},l,1/120);
  assert.equal(s.boostsCollected,0);assert.equal(s.powerups.length,1);
  s.y=330;s.grounded=true;
  stepRunner(s,idle,l,1/120);assert.equal(s.boostsCollected,0);
});

test("horizontal, diagonal and straight-up fire preserve speed, face both directions and can destroy planes",()=>{
  const l=createRunnerLoadout(corners(1));
  for(const aim of [0,45,90])for(const facing of [-1,1]){
    const s=run(l);s.enemies=[];s.facing=facing;stepRunner(s,{...idle,fire:true,aim},l,1/120);
    const b=s.shots[0];assert.ok(Math.abs(Math.hypot(b.vx,b.vy)-900)<.001);
    if(aim===45){assert.ok(Math.abs(Math.abs(b.vx)+b.vy)<.001);assert.equal(Math.sign(b.vx),facing);}
    if(aim===90){assert.ok(Math.abs(b.vx)<.001);assert.equal(b.vy,-900);}
    if(aim===0){assert.ok(Math.abs(b.vy)<.001);assert.equal(Math.sign(b.vx),facing);}
  }
  for(const aim of [45,90]){
    const s=run(l),plane=s.enemies.find(e=>e.kind==="plane");s.enemies=[plane];s.x=600;
    for(let frame=0;frame<200&&s.enemies.length;frame++){
      // Align using the moving plane's current position, as a player tracking it would.
      s.x=aim===90?plane.x:plane.x-(s.y-32-plane.y+plane.h/2);
      stepRunner(s,{...idle,fire:true,aim},l,1/120);
    }
    assert.equal(s.enemies.length,0,`aim ${aim}`);assert.equal(s.score,75);
  }
});

test("planes drop falling ad bombs that can be shot down or damage the player on impact",()=>{
  const l=createRunnerLoadout(corners(0)),s=run(l),plane=s.enemies.find(e=>e.kind==="plane");
  s.enemies=[plane];s.x=600;plane.cooldown=0;stepRunner(s,idle,l,.01);
  const bomb=s.shots.find(b=>b.kind==="adBomb");assert.ok(bomb&&bomb.enemy);const oldY=bomb.y,oldVy=bomb.vy;
  stepRunner(s,idle,l,.04);assert.ok(bomb.y>oldY&&bomb.vy>oldVy);
  s.enemies=[];s.x=bomb.x;bomb.y=s.y-90;bomb.vx=0;bomb.vy=95;
  for(let frame=0;frame<12;frame++)stepRunner(s,{...idle,fire:true,aim:90},l,1/120);
  assert.ok(!s.shots.includes(bomb));assert.equal(s.lives,5);assert.equal(s.score,10);
  s.shots=[{x:s.x,y:RUNNER_GROUND-70,vx:0,vy:120,life:5,enemy:true,kind:"adBomb"}];
  for(let frame=0;frame<50;frame++)stepRunner(s,idle,l,1/120);
  assert.equal(s.lives,4);assert.equal(s.shots.length,0);
});

test("denser full campaigns terminate safely across loadouts and remain completable at neutral and strong settings",()=>{
  for(const width of [640,960])for(const n of [0,.5,1])for(let level=1;level<=3;level++){
    const l=createRunnerLoadout(corners(n)),s=createRunner(l,level,0,width);s.phase="playing";
    for(let frame=0;frame<14400;frame++){
      if(s.phase==="bossIntro")s.phase="playing";if(s.phase!=="playing")break;
      const incoming=s.shots.some(b=>b.enemy&&(b.kind==="adBomb"?Math.abs(b.x-s.x)<65&&b.y>RUNNER_GROUND-150:b.vx<0&&b.x>s.x&&b.x-s.x<95&&b.y>s.y-50));
      const contact=s.enemies.some(e=>e.kind!=="plane"&&e.x>s.x&&e.x-s.x<90);
      const target=s.boss.active?Math.max(2780,3400-width+145):3400;
      stepRunner(s,{move:s.x<target?1:0,jump:s.grounded&&(incoming||contact),fire:true},l,1/120);
    }
    assert.ok(["failed","levelClear","complete"].includes(s.phase));
    if(n>0)assert.equal(s.phase,level===3?"complete":"levelClear",`width ${width}, strength ${n}, level ${level}`);
    assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y));assert.ok(s.shots.length<100);assert.ok(s.powerups.length<=6);
  }
});
