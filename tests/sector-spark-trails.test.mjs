import test from 'node:test';
import assert from 'node:assert/strict';
import {createSectorSparkTrails,SPARK_LIMIT,TRAIL_SEGMENTS} from '../lib/sector-spark-trails.js';
const spark=(i=0)=>({x:i,y:.8,z:0,vx:3,vy:2,vz:1,life:.65,color:'shield'});
const move=(p,dt)=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=9*dt;p.life-=dt;};
test('reads existing particles without mutating any engine state',()=>{
 const effect=createSectorSparkTrails(),p=spark(),before=structuredClone(p);effect.update([p]);assert.deepEqual(p,before);assert.equal(effect.geometry.instanceCount,1);effect.dispose();
});
test('world-space ribbon history follows the existing gravity trajectory',()=>{
 const effect=createSectorSparkTrails(),p=spark();effect.update([p]);for(let i=0;i<7;i++){move(p,1/60);effect.update([p]);}
 const from=effect.geometry.getAttribute('sparkFrom'),to=effect.geometry.getAttribute('sparkTo');assert.ok(effect.geometry.instanceCount>2);
 assert.ok(Math.abs(to.getY(0)-p.y)<1e-6);assert.ok(Math.abs(to.getZ(0)-p.z)<1e-6);assert.ok(from.getY(2)!==to.getY(2));effect.dispose();
});
test('pause leaves trails unchanged and resume continues existing history',()=>{
 const effect=createSectorSparkTrails(),p=spark();for(let i=0;i<6;i++){move(p,.02);effect.update([p]);}
 const count=effect.geometry.instanceCount,positions=Array.from(effect.geometry.getAttribute('sparkFrom').array);for(let i=0;i<100;i++)effect.update([p]);
 assert.equal(effect.geometry.instanceCount,count);assert.deepEqual(Array.from(effect.geometry.getAttribute('sparkFrom').array),positions);move(p,.02);effect.update([p]);assert.ok(effect.geometry.instanceCount>=count);effect.dispose();
});
test('reduced motion clears effect and old histories do not return',()=>{
 const effect=createSectorSparkTrails(),p=spark();effect.update([p]);move(p,.02);effect.update([p]);assert.equal(effect.geometry.instanceCount,2);
 effect.update([p],true);assert.equal(effect.geometry.instanceCount,0);effect.update([p]);assert.equal(effect.geometry.instanceCount,1);effect.dispose();
});
test('particle and segment capacities are bounded; compact budget is lower',()=>{
 const effect=createSectorSparkTrails(),ps=Array.from({length:300},(_,i)=>spark(i));for(let i=0;i<20;i++){ps.forEach(p=>move(p,1/60));effect.update(ps);}
 assert.ok(effect.geometry.instanceCount<=SPARK_LIMIT*(TRAIL_SEGMENTS+1));effect.update(ps,false,true);assert.ok(effect.geometry.instanceCount<=80*5);effect.dispose();
});
test('new object after restart never inherits expired trail slots',()=>{
 const effect=createSectorSparkTrails(),p=spark();effect.update([p]);move(p,.03);effect.update([p]);effect.update([]);assert.equal(effect.geometry.instanceCount,0);
 effect.update([spark()]);assert.equal(effect.geometry.instanceCount,1);effect.dispose();
});
test('single draw uses additive transparency and depth testing without depth writes',()=>{
 const effect=createSectorSparkTrails();assert.equal(effect.material.depthTest,true);assert.equal(effect.material.depthWrite,false);assert.equal(effect.mesh.frustumCulled,false);
 assert.ok(effect.material.vertexShader.includes('projectionMatrix'));effect.dispose();
});
test('dispose permits React strict-mode resource reactivation',()=>{
 const effect=createSectorSparkTrails();effect.update([spark()]);effect.dispose();effect.update([spark()]);assert.equal(effect.geometry.instanceCount,1);effect.dispose();
});
