import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Vector3, CircleGeometry } from 'three';
import { ARENA, ARENA_CORNERS, withinCorner } from '../lib/arcade-engine.js';
import { fitDebtbreakCamera } from '../lib/debtbreak-arena-view.js';

test('camera keeps all four corner refuges and pillar tops visible on wide and narrow stages',()=>{
 for(const [width,height] of [[1778,620],[1320,480],[390,280],[360,260],[844,330]]){
  const camera=new PerspectiveCamera(48,width/height,.1,250);fitDebtbreakCamera(camera,width,height);
  for(const c of ARENA_CORNERS)for(const y of [0,4.8]){
   const point=new Vector3(c.x,y,c.z).project(camera);
   assert.ok(Math.abs(point.x)<.94&&point.y>-.91&&point.y<.83,`${width}×${height}: corner clipped`);
   assert.ok(point.z>-1&&point.z<1);
  }
 }
});
test('visible quarter-circle geometry faces inward and matches the protection footprint',()=>{
 const starts=[Math.PI*1.5,Math.PI,Math.PI*.5,0];
 for(const [i,c] of ARENA_CORNERS.entries()){
  const geometry=new CircleGeometry(ARENA.cornerRadius,40,starts[i],Math.PI/2);
  geometry.rotateX(-Math.PI/2);geometry.translate(c.x,.045,c.z);
  const vertices=geometry.getAttribute('position');
  for(let n=0;n<vertices.count;n++){
   const x=vertices.getX(n),z=vertices.getZ(n);
   assert.ok(Math.abs(x)<=ARENA.halfWidth+.00001&&Math.abs(z)<=ARENA.halfDepth+.00001);
   const insetX=c.x+(x-c.x)*.999,insetZ=c.z+(z-c.z)*.999;
   assert.ok(withinCorner(insetX,insetZ,i));
  }
  geometry.dispose();
 }
});
