"use client";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CharacterModel, type CharacterMotion } from "./character-model";
import { StudioEnvironment, PillarLabel, PillarRelic, type AvatarKind, type CornerStrengths } from "./avatar-stage";
import { SceneEffects } from "./scene-effects";
import { fitDebtbreakCamera } from "@/lib/debtbreak-arena-view.js";
import { stepSector, ARENA, ARENA_CORNERS, withinCorner, type Sector, type Loadout } from "@/lib/arcade-engine.js";
import { equipmentOnline, hasEquipment } from "@/lib/debtbreak-challenges.js";
export type InputState = {
  keys: Set<string>;
  pointer: THREE.Vector2;
  aiming: boolean;
  firing: boolean;
  autoFire: boolean;
  targetId: string | null;
};
export type Hud = { phase: Sector["phase"]; time: number; health: number; energy: number; accuracy: number; hit: boolean; revision: number };
export function readHud(s: Sector): Hud { return { phase: s.phase, time: Math.floor(s.elapsed), health: s.health, energy: s.energy,
 accuracy: s.shotsFired ? Math.round(s.shotsHit / s.shotsFired * 100) : 0, hit: s.hitFlash > .55, revision: s.elapsed }; }

function AccountLabel({ world, index }: { world: MutableRefObject<Sector>; index: number }) {
  const sprite = useRef<THREE.Sprite>(null);
  const marker = useRef<THREE.Mesh>(null);
  const last = useRef("");
  const texture = useMemo(() => { const c = document.createElement("canvas"); c.width = 768; c.height = 192; return new THREE.CanvasTexture(c); }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(() => {
    const e = world.current.enemies[index]; if (!e || !sprite.current) return;
    const d = world.current.plan.ledger.debts.find(d => d.id === e.accountId)!;
    const priority = world.current.plan.targetId === d.id;
    const text = `${d.id}|${d.balance}|${priority}`;
    sprite.current.scale.set(3.9 / e.size, 1 / e.size, 1);
    sprite.current.position.y = .8 + .6 / e.size;
    if (marker.current) { marker.current.visible = priority; marker.current.rotation.z = -world.current.elapsed; }
    if (text === last.current) return; last.current = text;
    const c = texture.image as HTMLCanvasElement, ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height); ctx.fillStyle = "#07131bf0"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = priority ? "#8af4d0" : "#8aa9c0"; ctx.lineWidth = priority ? 12 : 4; ctx.strokeRect(6, 6, 756, 180);
    ctx.textAlign = "center"; ctx.fillStyle = "#f0fafc"; ctx.font = "bold 42px Arial";
    ctx.fillText(`${priority ? '★ ' : ''}${d.id} ${d.name} · $${(d.balance / 100).toFixed(2)}`, 384, 72);
    ctx.font = "bold 38px Arial"; ctx.fillStyle = "#ffcf8d";
    ctx.fillText(`${d.apr >= 20 ? '▲▲▲' : '▲'} ${d.apr}% APR · $${d.payment / 100}/mo`, 384, 132);
    texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
  });
  return <><sprite ref={sprite}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>
    <mesh ref={marker} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.9,1.02,4]} /><meshBasicMaterial color="#8af4d0" side={THREE.DoubleSide} /></mesh></>;
}
export const ARENA_PILLARS = [
 {name:"CASH FLOW",node:"cash_emitter",color:"#5de4ff",location:"far left",arrow:"↖"},
 {name:"CAPITAL",node:"reserve_shield",color:"#62edb9",location:"far right",arrow:"↗"},
 {name:"COLLATERAL",node:"torso",color:"#ffbc62",location:"near right",arrow:"↘"},
 {name:"CREDIT",node:"head",color:"#b3a0ff",location:"near left",arrow:"↙"},
].map((pillar,i)=>({...pillar,...ARENA_CORNERS[i]}));
const QUARTER_START = [Math.PI*1.5,Math.PI,Math.PI*.5,0];
function CornerAssist({ world, index, reduced }: { world: MutableRefObject<Sector>; index: number; reduced: boolean }) {
 const p=ARENA_PILLARS[index], theta=QUARTER_START[index];
 const fill=useRef<THREE.Mesh>(null), edge=useRef<THREE.Mesh>(null), timer=useRef<THREE.Mesh>(null);
 const pulse=useRef<THREE.Mesh>(null), dome=useRef<THREE.Mesh>(null), tether=useRef<THREE.Mesh>(null);
 const beams=useRef<Array<THREE.Mesh|null>>([]), motes=useRef<Array<THREE.Mesh|null>>([]);
 const vectors=useMemo(()=>({from:new THREE.Vector3(p.x,4.2,p.z),to:new THREE.Vector3(),delta:new THREE.Vector3(),up:new THREE.Vector3(0,1,0)}),[p.x,p.z]);
 useFrame(()=>{
  const s=world.current, field=s.assist?.pillar===index?s.assist:null;
  const ready=s.assistQueue.includes(index), active=!!field, inside=active&&withinCorner(s.x,s.z,index);
  const elapsed=field?ARENA.assistSeconds-field.remaining:0;
  const wave=reduced?1:(Math.sin(s.totalElapsed*3)*.5+.5);
  if(fill.current) (fill.current.material as THREE.MeshBasicMaterial).opacity=active ? .2+(inside ? .06:0) : ready ? .1+wave*.055 : .025;
  if(edge.current) (edge.current.material as THREE.MeshBasicMaterial).opacity=active ? 1 : ready ? .7+wave*.25 : .2;
  if(timer.current){timer.current.visible=active;timer.current.geometry.setDrawRange(0,Math.ceil(40*(field?.remaining??0)/ARENA.assistSeconds)*6);}
  if(pulse.current){
   pulse.current.visible=active;
   const radius=index===3?((elapsed%1)*ARENA.cornerRadius):index===1?((elapsed%.8)/.8*ARENA.cornerRadius):Math.min(1,elapsed/.5)*ARENA.cornerRadius;
   pulse.current.scale.setScalar(reduced?ARENA.cornerRadius:Math.max(.1,radius));
   (pulse.current.material as THREE.MeshBasicMaterial).opacity=inside ? .85 : .3;
  }
  if(dome.current){dome.current.visible=active&&index===2;const unfold=reduced?1:Math.min(1,elapsed/.4);dome.current.scale.set(unfold,.28*unfold,unfold);}
  const connect=(mesh:THREE.Mesh,x:number,y:number,z:number)=>{
   vectors.to.set(x,y,z);vectors.delta.subVectors(vectors.to,vectors.from);
   mesh.position.copy(vectors.from).add(vectors.to).multiplyScalar(.5);
   mesh.quaternion.setFromUnitVectors(vectors.up,vectors.delta.clone().normalize());mesh.scale.y=vectors.delta.length();
  };
  if(tether.current){
   tether.current.visible=active&&((index===1&&inside)||index===2);
   if(tether.current.visible)connect(tether.current,index===1?s.x:p.x-Math.sign(p.x)*ARENA.cornerRadius*.6,index===1?1:.2,index===1?s.z:p.z-Math.sign(p.z)*ARENA.cornerRadius*.6);
   (tether.current.material as THREE.MeshBasicMaterial).opacity=inside ? .65 : .12;
  }
  beams.current.forEach((beam,i)=>{if(!beam)return;const ray=field?.rays[i];beam.visible=active&&index===0&&!!ray;if(ray)connect(beam,ray.x,.8,ray.z);});
  motes.current.forEach((mote,i)=>{
   if(!mote)return;mote.visible=inside&&index===1;
   if(mote.visible){const fraction=reduced ? .5 : ((elapsed*1.3+i/3)%1);mote.position.set(p.x+(s.x-p.x)*fraction,4.2+(1-4.2)*fraction,p.z+(s.z-p.z)*fraction);}
  });
 });
 return <>
  <group position={[p.x,.045,p.z]} rotation={[-Math.PI/2,0,0]}>
   <mesh ref={fill}><circleGeometry args={[ARENA.cornerRadius,40,theta,Math.PI/2]}/><meshBasicMaterial color={p.color} transparent opacity={.025} depthWrite={false}/></mesh>
   <mesh ref={edge} position={[0,0,.01]}><ringGeometry args={[ARENA.cornerRadius-.065,ARENA.cornerRadius,40,1,theta,Math.PI/2]}/><meshBasicMaterial color={p.color} transparent opacity={.2} depthWrite={false}/></mesh>
   <mesh ref={timer} position={[0,0,.02]} visible={false}><ringGeometry args={[ARENA.cornerRadius-.22,ARENA.cornerRadius-.13,40,1,theta,Math.PI/2]}/><meshBasicMaterial color="#ecfff7" transparent opacity={.95} depthWrite={false}/></mesh>
   <mesh ref={pulse} position={[0,0,.035]} visible={false}><ringGeometry args={[.94,1,40,1,theta,Math.PI/2]}/><meshBasicMaterial color={p.color} transparent opacity={.8} depthWrite={false}/></mesh>
  </group>
  {index===2&&<mesh ref={dome} position={[p.x,.06,p.z]} visible={false}><sphereGeometry args={[ARENA.cornerRadius,24,10,Math.PI*1.5,Math.PI/2,0,Math.PI/2]}/><meshBasicMaterial color={p.color} transparent opacity={.16} side={THREE.DoubleSide} wireframe depthWrite={false}/></mesh>}
  <mesh ref={tether} visible={false}><cylinderGeometry args={[.055,.055,1,8]}/><meshBasicMaterial color={p.color} transparent opacity={.65} depthWrite={false}/></mesh>
  {Array.from({length:8},(_,i)=><mesh key={`ray-${i}`} ref={mesh=>{beams.current[i]=mesh;}} visible={false}><cylinderGeometry args={[.065,.065,1,6]}/><meshBasicMaterial color={p.color} transparent opacity={.95} depthWrite={false}/></mesh>)}
  {[0,1,2].map(i=><mesh key={`mote-${i}`} ref={mesh=>{motes.current[i]=mesh;}} visible={false}><sphereGeometry args={[.11,8,6]}/><meshBasicMaterial color="#d6ffea"/></mesh>)}
 </>;
}
function ArenaPillars({ world, reduced }: { world: MutableRefObject<Sector>; reduced: boolean }) {
 const lights=useRef<Array<THREE.PointLight|null>>([]);
 useFrame(()=>{
  const s=world.current;
  lights.current.forEach((light,i)=>{if(light)light.intensity=s.phase==='victory'||s.assist?.pillar===i?55:s.assistQueue.includes(i)?20:3;});
 });
 return <>{ARENA_PILLARS.map((p,i)=><group key={p.name}>
  <group position={[p.x,0,p.z]} scale={.67}>
   <mesh position={[0,2.55,0]}><boxGeometry args={[.7,5.1,.7]}/><meshStandardMaterial color="#112936" metalness={.78} roughness={.27}/></mesh>
   <mesh position={[0,5.14,0]}><boxGeometry args={[.94,.18,.94]}/><meshStandardMaterial color={p.color}/></mesh>
   <PillarLabel label={p.name} color={p.color}/><PillarRelic nodeName={p.node} color={p.color} strength={.5} reduced={reduced}/>
   <pointLight ref={light=>{lights.current[i]=light;}} position={[0,4,0]} color={p.color} distance={10} intensity={3}/>
  </group>
  <CornerAssist world={world} index={i} reduced={reduced}/>
 </group>)}</>;
}

export function SectorWorld({
  avatar,
  strengths,
  world,
  input,
  loadout,
  compact,
  reduced,
  onHud,
  onEvent,
}: {
  avatar: AvatarKind;
  strengths: CornerStrengths;
  world: MutableRefObject<Sector>;
  input: MutableRefObject<InputState>;
  loadout: Loadout;
  compact: boolean;
  reduced: boolean;
  onHud: (hud: Hud) => void;
  onEvent: (event: string) => void;
}) {
  const player = useRef<THREE.Group>(null),
    radar = useRef<THREE.Mesh>(null),
    shield = useRef<THREE.Mesh>(null),
    reticle = useRef<THREE.Group>(null);
  const drones = useRef<Array<THREE.Group | null>>([]),
    bullets = useRef<THREE.InstancedMesh>(null),
    sparks = useRef<THREE.InstancedMesh>(null);
  const motion = useRef<CharacterMotion>({
    moving: 0,
    firing: false,
    shield: false,
    dash: false,
  });
  const { camera, scene, size } = useThree();
  const utility = useMemo(
    () => ({
      dummy: new THREE.Object3D(),
      ray: new THREE.Raycaster(),
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      point: new THREE.Vector3(),
      color: new THREE.Color(),
    }),
    [],
  );
  const hudTime = useRef(0);
  useEffect(() => {
    fitDebtbreakCamera(camera as THREE.PerspectiveCamera,size.width,size.height);
    scene.fog=new THREE.FogExp2("#081522",.006);
    return ()=>{scene.fog=null;};
  }, [camera, scene, size]);
  useFrame((state, delta) => {
    const s = world.current,
      control = input.current,
      active = s.phase === "playing";
    const has = (a: string, b?: string) =>
      control.keys.has(a) || (!!b && control.keys.has(b));
    const horizontal =
        Number(has("d", "arrowright")) - Number(has("a", "arrowleft")),
      vertical = Number(has("s", "arrowdown")) - Number(has("w", "arrowup"));
    // Keep movement aligned with the screen in both portrait and landscape.
    const cameraLength = Math.hypot(camera.position.x, camera.position.z) || 1;
    const backX = camera.position.x / cameraLength,
      backZ = camera.position.z / cameraLength;
    const x = horizontal * backZ + vertical * backX,
      z = -horizontal * backX + vertical * backZ;
    let aim: { x: number; z: number } | null = null;
    if (control.aiming) {
      utility.ray.setFromCamera(control.pointer, camera);
      if (utility.ray.ray.intersectPlane(utility.plane, utility.point))
        aim = { x: utility.point.x, z: utility.point.z };
    }
    stepSector(
      s,
      {
        x,
        z,
        fire: control.firing || control.keys.has(" ") || control.autoFire,
        shield: control.keys.has("e"),
        dash: control.keys.has("shift"),
        ram: control.keys.has("r"),
        targetId: control.targetId,
        aim,
      },
      loadout,
      delta,
    );
    s.events.forEach(onEvent);
    if (player.current) {
      player.current.position.set(s.x, 0, s.z);
      player.current.rotation.y = s.angle;
    }
    motion.current = {
      moving: active ? Math.min(1, Math.hypot(x, z)) : 0,
      firing: active && s.cooldown > 0,
      shield: active && s.shield,
      dash: s.dash > 0 || s.ramTime > 0,
    };
    if (radar.current) {
      radar.current.position.set(s.x, 0.015, s.z);
      radar.current.scale.setScalar(loadout.radar);
    }
    if (shield.current) {
      shield.current.visible = s.shield;
      shield.current.position.set(s.x, 0.8, s.z);
      shield.current.scale.setScalar(loadout.shieldRadius * (.6 + .4 * Math.sqrt(Math.min(1, s.plan.ledger.reserves / Math.max(1,s.plan.start.reserves+s.plan.savings)))));
      (shield.current.material as THREE.MeshBasicMaterial).opacity =
        0.11 + Math.sin(state.clock.elapsedTime * 8) * 0.025;
    }
    if (reticle.current) {
      reticle.current.visible = !!aim && active;
      if (aim) reticle.current.position.set(aim.x, 0.04, aim.z);
      reticle.current.rotation.y = state.clock.elapsedTime;
    }
    for (let i = 0; i < 8; i++) {
      const group = drones.current[i],
        e = s.enemies[i];
      if (!group) continue;
      group.visible = !!e;
      if (!e) continue;
      group.position.set(
        e.x,
        e.boss ? 1.72 : 0.72 * e.size + Math.sin(s.elapsed * 2 + e.id) * 0.12,
        e.z,
      );
      group.rotation.y = s.elapsed * (e.boss ? -0.45 : e.collector ? -1.8 : 1);
      const hit = e.hit > 0 ? 1.12 : 1;
      group.scale.setScalar((e.boss ? 2.35 : e.size) * hit);

    }
    if (bullets.current) {
      bullets.current.count = Math.min(s.shots.length, 160);
      s.shots.slice(0, 160).forEach((b, i) => {
        utility.dummy.position.set(b.x, 0.8, b.z);
        utility.dummy.rotation.set(0, Math.atan2(b.vx, b.vz), 0);
        utility.dummy.scale.set(
          b.enemy ? 0.12 : b.avalanche ? 0.13 : 0.07,
          b.enemy ? 0.12 : b.avalanche ? 0.13 : 0.07,
          b.enemy ? 0.3 : b.avalanche ? 0.58 : 0.4,
        );
        utility.dummy.updateMatrix();
        bullets.current!.setMatrixAt(i, utility.dummy.matrix);
        bullets.current!.setColorAt(
          i,
          utility.color.set(
            b.enemy
              ? "#ff533d"
              : b.avalanche
                ? "#ffd369"
                : avatar === "mech"
                  ? "#73f3ff"
                  : "#9bf98a",
          ),
        );
      });
      bullets.current.instanceMatrix.needsUpdate = true;
      if (bullets.current.instanceColor)
        bullets.current.instanceColor.needsUpdate = true;
    }
    if (sparks.current) {
      sparks.current.count = Math.min(s.sparks.length, 160);
      s.sparks.slice(0, 160).forEach((p, i) => {
        utility.dummy.position.set(p.x, Math.max(0.05, p.y), p.z);
        utility.dummy.rotation.set(0, 0, 0);
        utility.dummy.scale.setScalar(
          Math.max(
            0.01,
            p.life *
              (p.color === "playerHit" || p.color === "collector" ? 0.22 : 0.13),
          ),
        );
        utility.dummy.updateMatrix();
        sparks.current!.setMatrixAt(i, utility.dummy.matrix);
        sparks.current!.setColorAt(
          i,
          utility.color.set(
            p.color === "shield"
              ? "#81ffd3"
              : p.color === "boss"
                ? "#ffbe73"
                : p.color === "merge"
                  ? "#ff5b62"
                  : p.color === "collector"
                    ? "#ce8cff"
                    : p.color === "collectorKill"
                      ? "#f2a8ff"
                      : p.color === "playerHit"
                        ? "#ff7a35"
                        : "#83c4ff",
          ),
        );
      });
      sparks.current.instanceMatrix.needsUpdate = true;
      if (sparks.current.instanceColor)
        sparks.current.instanceColor.needsUpdate = true;
    }
    hudTime.current += delta;
    if (hudTime.current > 0.1) {
      onHud(readHud(s));
      hudTime.current = 0;
    }
  });
  return (
    <>
      <color attach="background" args={["#081522"]} />
      <StudioEnvironment />
      {!compact && <SceneEffects strength={0.58} />}
      <hemisphereLight args={["#addfea", "#152539", 1.45]} />
      <directionalLight
        position={[7, 13, 5]}
        intensity={2.8}
        color="#d9eaf6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.001}
      />
      <pointLight position={[-7, 3, -8]} intensity={48} color="#3ef1dd" />
      <pointLight position={[6, 3, 2]} intensity={36} color="#ff9659" />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.03, 0]}
        receiveShadow
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#102332"
          metalness={0.5}
          roughness={0.48}
        />
      </mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.012,0]} receiveShadow><planeGeometry args={[ARENA.halfWidth*2,ARENA.halfDepth*2]}/><meshStandardMaterial color="#15303d" metalness={.45} roughness={.55}/></mesh>
      <gridHelper args={[ARENA.halfWidth*2,32,"#28667a","#193f53"]} scale={[1,1,ARENA.halfDepth/ARENA.halfWidth]}/>
      {[-1,1].map(side=><group key={side}>
       <mesh position={[0,.02,side*ARENA.halfDepth]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[ARENA.halfWidth*2,.06]}/><meshBasicMaterial color="#4bb9c4"/></mesh>
       <mesh position={[side*ARENA.halfWidth,.02,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.06,ARENA.halfDepth*2]}/><meshBasicMaterial color="#4bb9c4"/></mesh>
      </group>)}
      <ArenaPillars world={world} reduced={reduced}/>
      <group ref={player}>
        <group scale={0.54}>
          <CharacterModel
            avatar={avatar}
            strengths={strengths}
            motion={motion}
            reducedMotion={reduced}
          />
        </group>
      </group>
      <mesh ref={radar} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.994, 1, 90]} />
        <meshBasicMaterial
          color="#b0a3fb"
          transparent
          opacity={0.21}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={shield} visible={false}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial
          color="#79fbc7"
          wireframe
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      <group ref={reticle}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.32, 24]} />
          <meshBasicMaterial color="#99ffff" />
        </mesh>
      </group>
      {Array.from({ length: 8 }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            drones.current[i] = g;
          }}
          visible={false}
        >
          <mesh castShadow>
            <icosahedronGeometry args={[0.58, 0]} />
            <meshStandardMaterial
              color="#314861"
              metalness={0.8}
              roughness={0.25}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.73, 0.04, 6, 24]} />
            <meshStandardMaterial
              color="#fe9570"
              emissive="#ff563a"
              emissiveIntensity={2.4}
            />
          </mesh>
          <mesh position={[0, 0, 0.5]}>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial
              color="#ffe4a5"
              emissive="#ffbd7c"
              emissiveIntensity={2.6}
            />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * 0.75, 0, 0]}
              rotation={[0, 0, side * 0.25]}
            >
              <boxGeometry args={[0.5, 0.13, 0.35]} />
              <meshStandardMaterial
                color="#587080"
                metalness={0.7}
                roughness={0.4}
              />
            </mesh>
          ))}
          <AccountLabel world={world} index={i} />
        </group>
      ))}
      {world.current.plan.ledger.challenge && hasEquipment(world.current.plan.ledger.challenge.id) && <group position={[0,.06,0]}>
        <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[2.9,3,48]}/><meshBasicMaterial color={equipmentOnline(world.current.plan.ledger)?'#ffbc62':'#526477'} transparent opacity={.8}/></mesh>
        {equipmentOnline(world.current.plan.ledger) && <mesh><sphereGeometry args={[3,24,12,0,Math.PI*2,0,Math.PI/2]}/><meshBasicMaterial color="#ffbc62" wireframe transparent opacity={.12} depthWrite={false}/></mesh>}
      </group>}
      <instancedMesh
        ref={bullets}
        args={[undefined, undefined, 160]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={sparks}
        args={[undefined, undefined, 160]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}
