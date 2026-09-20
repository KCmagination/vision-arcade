import { Vector3 } from "three";
import { ARENA } from "./arcade-engine.js";

export function fitDebtbreakCamera(camera, width, height) {
    const perspective=camera;
    perspective.aspect=width/Math.max(1,height);perspective.fov=48;
    perspective.updateProjectionMatrix();
    // Fit the real arena and pillar tops, keeping both near corners above the HUD.
    const points=[-1,1].flatMap(x=>[-1,1].flatMap(z=>[0,5].map(y=>new Vector3(x*(ARENA.halfWidth+1.2),y,z*(ARENA.halfDepth+1.2)))));
    let low=12,high=200;
    for(let i=0;i<24;i++){
      const distance=(low+high)/2;camera.position.set(0,distance*.78,distance*.625);camera.lookAt(0,0,0);camera.updateMatrixWorld();
      const fits=points.every(point=>{const ndc=point.clone().project(camera);return Math.abs(ndc.x)<.94&&ndc.y>-.91&&ndc.y<.83;});
      if(fits)high=distance;else low=distance;
    }
    camera.position.set(0,high*.78,high*.625);camera.lookAt(0,0,0);camera.updateMatrixWorld();
}
