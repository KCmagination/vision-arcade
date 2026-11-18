import * as THREE from 'three';

export const SPARK_LIMIT = 160;
export const TRAIL_SEGMENTS = 8;
export const TRAIL_SECONDS = .16;
const COLORS = { shield:'#81ffd3',boss:'#ffbe73',merge:'#ff5b62',collector:'#ce8cff',collectorKill:'#f2a8ff',playerHit:'#ff7a35',default:'#83c4ff' };

/** Native world-space spark ribbons. Reads existing engine particles; never changes physics. */
export function createSectorSparkTrails() {
  const capacity = SPARK_LIMIT * (TRAIL_SEGMENTS + 1);
  const geometry = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geometry.index = quad.index;
  geometry.setAttribute('position', quad.getAttribute('position'));
  geometry.setAttribute('uv', quad.getAttribute('uv'));
  const attribute = (name, size) => {
    const attr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute(name, attr); return attr;
  };
  const from=attribute('sparkFrom',3),to=attribute('sparkTo',3),colors=attribute('sparkColor',3),shape=attribute('sparkShape',3);
  const material = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, depthTest:true, blending:THREE.AdditiveBlending, toneMapped:false,
    vertexShader:`
      attribute vec3 sparkFrom, sparkTo, sparkColor, sparkShape;
      varying vec2 vUv; varying vec3 vColor; varying float vAlpha;
      void main(){
        vec4 a=modelViewMatrix*vec4(sparkFrom,1.0), b=modelViewMatrix*vec4(sparkTo,1.0);
        vec2 direction=b.xy-a.xy;
        vec2 side=length(direction)>.00001?normalize(vec2(-direction.y,direction.x)):vec2(1.0,0.0);
        vec4 point=mix(a,b,uv.x);
        point.xy+=side*position.y*sparkShape.x;
        gl_Position=projectionMatrix*point;
        vUv=uv;vColor=sparkColor;vAlpha=mix(sparkShape.y,sparkShape.z,uv.x);
      }`,
    fragmentShader:`
      varying vec2 vUv; varying vec3 vColor; varying float vAlpha;
      void main(){
        float d=abs(vUv.y-.5)*2.0;
        float halo=exp(-d*d*5.5);
        float core=exp(-d*d*95.0);
        float alpha=(halo*.24+core*.76)*vAlpha;
        if(alpha<.004)discard;
        // HDR incandescent center participates in the arena's existing bloom pass.
        gl_FragColor=vec4(vColor*1.25+vec3(1.8)*core,alpha);
      }`,
  });
  const mesh=new THREE.Mesh(geometry,material); mesh.frustumCulled=false;mesh.name='sector-spark-trails';
  geometry.instanceCount=0;
  /** @type {Map<object, Array<{x:number,y:number,z:number,life:number}>>} */
  let histories=new Map();
  const color=new THREE.Color();
  return {mesh,geometry,material,
    /** @param {Array<{x:number,y:number,z:number,vx:number,vy:number,vz:number,life:number,color:string}>} sparks */
    update(sparks,reduced=false,compact=false){
      if(reduced){geometry.instanceCount=0;histories.clear();return;}
      const live=sparks.slice(0,compact?80:SPARK_LIMIT),alive=new Set(live);
      for(const particle of histories.keys())if(!alive.has(particle))histories.delete(particle);
      let count=0;
      const put=(a,b,width,alphaA,alphaB)=>{
        from.setXYZ(count,a.x,Math.max(.05,a.y),a.z);to.setXYZ(count,b.x,Math.max(.05,b.y),b.z);
        colors.setXYZ(count,color.r,color.g,color.b);shape.setXYZ(count,width,alphaA,alphaB);count++;
      };
      for(const p of live){
        if(p.life<=0)continue;
        let history=histories.get(p);
        if(!history){history=[];histories.set(p,history);}
        // Particle life is the engine clock: pause does not grow or advance trails.
        if(!history.length || p.life < history[0].life-1/60+1e-6){
          history.unshift({x:p.x,y:p.y,z:p.z,life:p.life});
          if(history.length>TRAIL_SEGMENTS+1)history.length=TRAIL_SEGMENTS+1;
        }
        while(history.length>1&&history.at(-1).life-p.life>TRAIL_SECONDS)history.pop();
        color.set(COLORS[p.color]??COLORS.default);
        const fade=Math.min(1,p.life/.2),width=((p.color==='playerHit'||p.color==='collector') ? .17 : .12);
        // Short hot leading streak also makes brand-new sparks visible before history exists.
        const speed=Math.hypot(p.vx,p.vy,p.vz)||1,tail=.035/speed;
        put({x:p.x-p.vx*tail,y:p.y-p.vy*tail,z:p.z-p.vz*tail},p,width,fade*.7,fade);
        const maxSegments=compact?4:TRAIL_SEGMENTS;
        for(let i=1;i<history.length&&i<=maxSegments;i++){
          const a=history[i],b=history[i-1];
          const alphaA=fade*Math.max(0,1-(a.life-p.life)/TRAIL_SECONDS);
          const alphaB=fade*Math.max(0,1-(b.life-p.life)/TRAIL_SECONDS);
          put(a,b,width,alphaA,alphaB);
        }
      }
      geometry.instanceCount=count;
      for(const attr of [from,to,colors,shape])attr.needsUpdate=true;
    },
    dispose(){histories.clear();geometry.dispose();material.dispose();},
  };
}
