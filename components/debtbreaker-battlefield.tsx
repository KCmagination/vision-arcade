"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, memo, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import * as THREE from "three";
import { TURRET, VAULT, targetPosition, defenseContact, combatActors, setAim, setTrigger, type CombatWorld, type CombatActor } from "@/lib/debtbreaker-combat.js";
import type { DebtbreakerState } from "@/lib/debtbreaker-engine.js";
import { DebtbreakerCompatibility } from "./debtbreaker-compatibility";
import { CharacterModel, type CharacterMotion } from "./character-model";
import type { AvatarKind, AvatarVisualState, CornerStrengths } from "./avatar-stage";

export type BattlefieldProps={avatar:AvatarKind;strengths:CornerStrengths;visualState:AvatarVisualState;world:MutableRefObject<CombatWorld>;ledger:DebtbreakerState;onReady:()=>void;onFailure:()=>void;onGesture:()=>void;reduced:boolean};
type Props=BattlefieldProps;
const COLORS={credit:"#ac91ff",living:"#ffad5a",reserve:"#56efb6"};
const cash=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n/100);
const steel="#536875";

class RenderBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}

function Block({at,size,color=steel,glow=0}:{at:[number,number,number];size:[number,number,number];color?:string;glow?:number}){
 return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} metalness={.45} roughness={.46} emissive={color} emissiveIntensity={glow}/></mesh>;
}

function Label({text,sub="",at,width=3,color="#bdebdc"}:{text:string;sub?:string;at:[number,number,number];width?:number;color?:string}){
 const map=useMemo(()=>{
   const canvas=document.createElement("canvas");canvas.width=640;canvas.height=sub?176:96;
   const ctx=canvas.getContext("2d")!;ctx.fillStyle="#07121eea";ctx.fillRect(0,0,640,canvas.height);
   ctx.fillStyle=color;ctx.fillRect(0,0,6,canvas.height);
   ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="700 43px system-ui";
   ctx.fillStyle="#f0f7fa";ctx.fillText(text,320,sub?52:48,610);
   if(sub){ctx.font="600 43px ui-monospace";ctx.fillStyle=color;ctx.fillText(sub,320,129,610);}
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
 },[text,sub,color]);
 useEffect(()=>()=>map.dispose(),[map]);
 return <sprite position={at} scale={[width,width*(sub?176:96)/640,1]} renderOrder={5}><spriteMaterial map={map} depthTest={false} transparent/></sprite>;
}

function FitCamera(){
 const {camera,size}=useThree();
 useEffect(()=>{
   const c=camera as THREE.OrthographicCamera;
   c.position.set(0,23,15);c.lookAt(0,0,0.5);
   const aspect=size.width/Math.max(1,size.height),halfHeight=Math.max(8.4,12.2/aspect);
   // Three owns this imperative camera, not React state.
   Object.assign(c,{left:-halfHeight*aspect,right:halfHeight*aspect,top:halfHeight,bottom:-halfHeight,near:.1,far:100});c.updateProjectionMatrix();
 },[camera,size.width,size.height]);
 return null;
}

function FloorPath({lane,index=0}:{lane:"credit"|"living";index?:number}){
 const curve=useMemo(()=>new THREE.CatmullRomCurve3(Array.from({length:41},(_,i)=>{
   const p=targetPosition({lane,progress:i*2.5},0,index);return new THREE.Vector3(p.x,.045,p.z);
 })),[lane,index]);
 return <mesh><tubeGeometry args={[curve,56,.047,5,false]}/><meshBasicMaterial color={COLORS[lane]} transparent opacity={.65}/></mesh>;
}

const Room=memo(function Room(){
 return <group>
   <Block at={[0,-.28,.5]} size={[23,.5,19]} color="#283e4b"/>
   {Array.from({length:10},(_,i)=><group key={i}>
     <Block at={[-10+i*2.2,.005,.5]} size={[.025,.014,18]} color="#547383"/>
     <Block at={[0,.005,-7.6+i*1.9]} size={[22,.014,.025]} color="#547383"/>
   </group>)}
   <Block at={[0,1.5,-8.4]} size={[23,3,.7]} color="#233846"/>
   {[-1,1].map(side=><group key={side}>
     <Block at={[side*11.2,1,.4]} size={[.55,2,18]} color="#233846"/>
     {[-6,-2,2,6].map(z=><group key={z}><Block at={[side*10.8,1.5,z]} size={[.6,3,.5]} color="#506773"/><Block at={[side*10.44,1.6,z]} size={[.08,1.5,.2]} color="#56b6d2" glow={1}/></group>)}
   </group>)}
   {([-1,1] as const).map(side=><group key={side} position={[side*8.6,0,-5.25]}>
     <Block at={[-1.35,1.55,0]} size={[.6,3.1,1.1]}/><Block at={[1.35,1.55,0]} size={[.6,3.1,1.1]}/>
     <Block at={[0,3.12,0]} size={[3.25,.65,1.1]}/><Block at={[0,1.5,-.46]} size={[2.12,2.9,.15]} color="#0d1a26"/>
     {[-1.04,1.04].map(x=><Block key={x} at={[x,1.5,.59]} size={[.12,2.9,.08]} color={side<0?COLORS.credit:COLORS.living} glow={1}/>)}
     <Label text={side<0?"CREDIT":"LIVING COST"} at={[0,3.85,0]} width={3.9} color={side<0?COLORS.credit:COLORS.living}/>
   </group>)}
   <Block at={[0,.06,-6.3]} size={[17,.05,.13]} color={COLORS.reserve} glow={.7}/>
   <Label text="RESERVE • DEPOSIT LANE" at={[0,2.1,-8]} width={5} color={COLORS.reserve}/>
   <FloorPath lane="credit" index={1}/><FloorPath lane="credit" index={2}/><FloorPath lane="living"/>
   {Array.from({length:19},(_,i)=>{
     const a=-Math.PI*.44+i/18*Math.PI*.88;
     return <mesh key={i} position={[Math.sin(a)*5.2,.1,TURRET.z-Math.cos(a)*5.2]} rotation={[0,-a,0]}>
       <boxGeometry args={[.32,.055,.12]}/><meshBasicMaterial color="#78eccd"/>
     </mesh>;
   })}
 </group>;
});

function Pillar({at,name,color,kind,active}:{at:[number,number,number];name:string;color:string;kind:number;active:boolean}){
 return <group position={at}>
   <Block at={[0,.12,0]} size={[1.2,.24,1.2]} color="#1d2d3a"/>
   <Block at={[0,.96,0]} size={[.65,1.7,.7]} color="#445c6c"/>
   <Block at={[0,1,.38]} size={[.16,1.5,.055]} color={color} glow={active?1.1:.2}/>
   <mesh position={[0,1.92,0]} rotation={[0,Math.PI/4,0]}>
     {kind===0?<boxGeometry args={[.12,.9,.15]}/>:kind===1?<cylinderGeometry args={[.45,.45,.18,8]}/>:kind===2?<boxGeometry args={[.72,.65,.27]}/>:<octahedronGeometry args={[.47,0]}/>}
     <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.38} metalness={.6}/>
   </mesh>
   <Label text={name} at={[at[2]===5?(at[0]<0?-1.7:1.7):0,-.02,.9]} width={2.9} color={color}/>
 </group>;
}

function DefensePanel({world,at,angle,condition,owned,reduced}:{world:MutableRefObject<CombatWorld>;at:{x:number;z:number};angle:number;condition:number;owned:boolean;reduced:boolean}){
 const panel=useRef<THREE.Group>(null),light=useRef<THREE.Mesh>(null);
 useFrame(()=>{
   const w=world.current,hit=w.effects.findLast(e=>["breach","impact"].includes(e.type)&&Math.hypot(e.x-at.x,e.z-at.z)<.8),age=hit?w.time-hit.born:2;
   if(panel.current)panel.current.position.y=.1+(!reduced&&age<.4?Math.sin(age*55)*.07*(1-age/.4):0);
   if(light.current)(light.current.material as THREE.MeshBasicMaterial).color.set(age<.35?"#ffb24f":condition>0&&owned?"#83dfca":"#a95540");
 });
 return <group ref={panel} position={[at.x,.1,at.z]} rotation={[0,-angle,0]}>
   <Block at={[0,.42,0]} size={[.72,owned?.2+condition/130:.13,.54]} color={condition>0&&owned?steel:"#3b2524"}/>
   <Block at={[-.24,.44,.29]} size={[.055,.42,.04]} color="#a5b2aa"/><Block at={[.24,.44,.29]} size={[.055,.42,.04]} color="#a5b2aa"/>
   <mesh ref={light} position={[0,.8,.29]}><boxGeometry args={[.45,.07,.04]}/><meshBasicMaterial color="#83dfca"/></mesh>
   {condition<100&&<mesh position={[0,.5,-.285]} rotation={[0,0,.6]}><boxGeometry args={[.05,.45,.02]}/><meshBasicMaterial color="#171e23"/></mesh>}
 </group>;
}

function Defenses({ledger,world,reduced}:{ledger:DebtbreakerState;world:MutableRefObject<CombatWorld>;reduced:boolean}){
 return <group>
   {ledger.defenses.map((d,i)=><group key={d.id}>
     {[-1,1].flatMap(side=>Array.from({length:5},(_,j)=><DefensePanel key={`${side}:${j}`} world={world} at={defenseContact(side<0?'credit':'living',j,i)} angle={side*(.4+j*.135)} condition={d.condition} owned={d.owned} reduced={reduced}/>))}
   </group>)}
   <Pillar at={[-4.1,0,5]} name="CASH FLOW" color="#64e5c3" kind={0} active={ledger.incomeWallet>0}/>
   <Pillar at={[4.1,0,5]} name="CAPITAL" color="#65d4ff" kind={1} active={ledger.reserves>0}/>
   <Pillar at={[-4.1,0,8]} name="COLLATERAL" color="#ffc076" kind={2} active={ledger.defenses.some((d)=>d.owned&&d.condition>0)}/>
   <Pillar at={[4.1,0,8]} name="CREDIT" color="#b8a2ff" kind={3} active/>
   <group position={[VAULT.x,0,VAULT.z]}>
     <Block at={[0,.5,0]} size={[2.6,1,1.2]} color="#4b696b"/>
     <Block at={[0,.55,.64]} size={[2.16,.78,.12]} color="#18333d"/>
     <mesh position={[0,.55,.73]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.3,.07,8,16]}/><meshStandardMaterial color="#8feec6" emissive="#53c996" emissiveIntensity={.3}/></mesh>
     <Label text="VAULT" at={[0,.06,1.0]} width={2.0} color={COLORS.reserve}/>
   </group>
 </group>;
}

function Turret({world,avatar,strengths,visualState,reduced}:Pick<Props,'world'|'avatar'|'strengths'|'visualState'|'reduced'>){
 const swivel=useRef<THREE.Group>(null),flash=useRef<THREE.Mesh>(null);
 const motion=useRef<CharacterMotion>({moving:0,firing:false,shield:false,dash:false});
 useFrame(()=>{const w=world.current;motion.current.firing=w.effects.some((e)=>e.type==="shot"&&w.time-e.born<.1);if(swivel.current)swivel.current.rotation.y=-w.angle;if(flash.current)flash.current.visible=motion.current.firing;});
 return <group position={[TURRET.x,0,TURRET.z]}>
   <mesh position={[0,.24,0]}><cylinderGeometry args={[1.08,1.3,.48,12]}/><meshStandardMaterial color="#304e61" metalness={.6} roughness={.4}/></mesh>
   <mesh position={[0,.5,0]}><torusGeometry args={[.82,.085,8,24]}/><meshStandardMaterial color="#71b5b0"/></mesh>
   <group ref={swivel} position={[0,.65,0]}>
     <group position={[0,-.52,.95]} rotation={[0,Math.PI,0]} scale={.46}><CharacterModel avatar={avatar} strengths={strengths} visualState={visualState} mounted motion={motion} reducedMotion={reduced}/></group>
     {[-.4,.4].map(x=><Block key={`grip${x}`} at={[x,.45,.72]} size={[.12,.13,.4]} color="#263e4a"/>)}
     <Block at={[0,.25,0]} size={[1.18,.65,1.3]} color="#76909a"/>
     <Block at={[-.48,.47,-.13]} size={[.17,.23,.88]} color="#a3c3c5"/><Block at={[.48,.47,-.13]} size={[.17,.23,.88]} color="#a3c3c5"/>
     {[-.24,.24].map(x=><mesh key={x} position={[x,.25,-1.18]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.12,.17,1.9,10]}/><meshStandardMaterial color="#405764" metalness={.75}/></mesh>)}
     <mesh ref={flash} position={[0,.25,-2.1]} visible={false}><octahedronGeometry args={[.48,0]}/><meshBasicMaterial color="#e4fff4"/></mesh>
   </group>
 </group>;
}

function Enemy({actor,world}:{actor:CombatActor;world:MutableRefObject<CombatWorld>}){
 const {target,index}=actor;
 const group=useRef<THREE.Group>(null),body=useRef<THREE.Group>(null);
 const friendly=target.lane==="reserve",color=COLORS[target.lane as keyof typeof COLORS];
 useFrame(()=>{
   const w=world.current,t=w.ledger.threats[index],drone=w.drones.find(d=>d.id===actor.id);if(!group.current)return;
   group.current.visible=!!t&&(friendly||(!t.impacted&&(drone?.remaining??0)>0));if(!group.current.visible)return;
   const p=targetPosition(t,w.time,index,actor.slot,Math.max(0,w.ledger.defenses.findIndex(d=>d.owned&&d.condition>0)));group.current.position.set(p.x,0,p.z);
   if(body.current){const struck=w.effects.findLast((e)=>e.actorId===actor.id&&["hit","deposit"].includes(e.type));const age=struck?w.time-struck.born:2;
     body.current.position.y=age<.18?Math.sin(age*60)*.12:0;
     body.current.rotation.z=!friendly?Math.cos(w.time*1.8+actor.slot+index)*.13:0;
   }
 });
 return <group ref={group}>
   <group ref={body} scale={friendly?1:.6}>
     {friendly?<group>
       <Block at={[0,.4,0]} size={[2.1,.48,1.15]} color="#638473"/>
       {[-.84,.84].map(x=><group key={x}><Block at={[x,.2,0]} size={[.44,.43,1.65]} color="#1c3032"/>{[-.54,0,.54].map(z=><mesh key={z} position={[x,.22,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.18,.18,.47,8]}/><meshStandardMaterial color="#5b7374"/></mesh>)}</group>)}
       <mesh position={[0,.87,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.48,.48,1.15,12]}/><meshStandardMaterial color="#79cab0" metalness={.55}/></mesh>
       <Block at={[0,1.25,0]} size={[.2,.09,.7]} color="#ccffe8" glow={.5}/><Block at={[0,1.25,0]} size={[.7,.1,.2]} color="#ccffe8" glow={.5}/>
     </group>:target.lane==="living"?<group>
       <Block at={[0,.57,0]} size={[1.65,.8,1.45]} color="#8e6245"/>
       <Block at={[0,1.1,-.06]} size={[1.1,.32,1.1]} color="#a08462"/>
       {[-1,1].map(side=><group key={side}>
         <Block at={[side*.9,.32,0]} size={[.3,.55,1.7]} color="#21303a"/>
         <Block at={[side*.4,.66,.8]} size={[.17,.15,.11]} color="#ffcf8c" glow={.9}/>
         <mesh position={[side*.58,1.02,.58]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.12,.15,.75,8]}/><meshStandardMaterial color="#393e41"/></mesh>
       </group>)}
     </group>:<group>
       <mesh position={[0,.84,0]} scale={[1,.66,1.18]}><octahedronGeometry args={[.9,0]}/><meshStandardMaterial color="#6e619d" metalness={.65} roughness={.35}/></mesh>
       {[-1,1].map(side=><group key={side}><Block at={[side*.77,.65,0]} size={[.75,.14,.48]} color="#7776a1"/><mesh position={[side*.92,.56,.1]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.17,.23,.45,8]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.5}/></mesh></group>)}
       <Block at={[0,.89,.78]} size={[.6,.15,.1]} color="#dbcbff" glow={.7}/>
     </group>}
   </group>
   <Label text={friendly?"DEPOSIT":`${target.lane==='living'?'COST':world.current.ledger.hangar?'DEBT':index===1?'LOAN':'CARD'} ${actor.slot+1}`} sub={friendly?"INCOME ONLY":cash(actor.remaining)} at={[0,friendly?1.9:1.3,0]} width={friendly?2.6:1.55} color={target.overdue?"#ff7365":color}/>
 </group>;
}

function Effects({world,reduced}:{world:MutableRefObject<CombatWorld>;reduced:boolean}){
 const bullets=useRef<(THREE.Mesh|null)[]>([]),fx=useRef<(THREE.Mesh|null)[]>([]),reticle=useRef<THREE.Group>(null);
 useFrame(()=>{
   const w=world.current;
   bullets.current.forEach((m,i)=>{if(!m)return;const b=w.bullets[i];m.visible=!!b;if(b){m.position.set(b.x,.75,b.z);m.rotation.y=-Math.atan2(b.dx,-b.dz);(m.material as THREE.MeshBasicMaterial).color.set(b.source==="reserve"?"#65bcff":"#f4ffe6");}});
   const visibleEffects=w.effects.filter(e=>!["shot","miss","warning","checkpoint","breach","impact","defeat"].includes(e.type)).slice(-24);
   fx.current.forEach((m,i)=>{if(!m)return;const e=visibleEffects[i];m.visible=!!e;
     if(e){const age=w.time-e.born,t=Math.min(1,age/.7);const transfer=e.type==="deposit"||e.type==="intercept";
       const from=e.type==="intercept"?VAULT:{x:e.x,z:e.z},to=e.type==="deposit"?VAULT:{x:e.x,z:e.z};
       m.position.set(transfer?THREE.MathUtils.lerp(from.x,to.x,t):e.x,transfer?1+Math.sin(t*Math.PI)*2:.8,transfer?THREE.MathUtils.lerp(from.z,to.z,t):e.z);
       const scale=transfer?.24:e.type==="clear"?.35+t*1.9:.2+t*.7;m.scale.setScalar(reduced?.3:scale);
       const mat=m.material as THREE.MeshBasicMaterial;mat.color.set(e.type==="breach"?"#ff664b":e.type==="blocked"?"#a2b4c3":e.type==="intercept"?"#60beff":"#91ffd6");mat.opacity=transfer?1:1-t;
     }
   });
   if(reticle.current){reticle.current.position.set(w.aim.x,.07,w.aim.z);reticle.current.rotation.y=w.time*.3;}
 });
 return <>
   <Collisions world={world} reduced={reduced}/>
   {Array.from({length:32},(_,i)=><mesh key={i} ref={m=>{bullets.current[i]=m;}} visible={false}><boxGeometry args={[.15,.15,.65]}/><meshBasicMaterial color="#f4ffe6"/></mesh>)}
   {Array.from({length:24},(_,i)=><mesh key={i} ref={m=>{fx.current[i]=m;}} visible={false}><octahedronGeometry args={[1,0]}/><meshBasicMaterial transparent wireframe/></mesh>)}
   <group ref={reticle}><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.32,.36,24]}/><meshBasicMaterial color="#f2fff9" side={THREE.DoubleSide}/></mesh>
     {[-1,1].map(side=><group key={side}><Block at={[side*.5,0,0]} size={[.2,.03,.04]} color="#d4fff0" glow={1}/><Block at={[0,0,side*.5]} size={[.04,.03,.2]} color="#d4fff0" glow={1}/></group>)}
   </group>
 </>;
}

function Collisions({world,reduced}:{world:MutableRefObject<CombatWorld>;reduced:boolean}){
 const groups=useRef<(THREE.Group|null)[]>([]);
 useFrame(()=>{
   const w=world.current,impacts=w.effects.filter(e=>e.type==='breach'||e.type==='impact').slice(-15);
   groups.current.forEach((group,i)=>{
     if(!group)return;const e=impacts[i];group.visible=!!e;if(!e)return;
     const age=Math.max(0,w.time-e.born),t=age/1.25;
     group.position.set(e.x,.4,e.z);
     group.children.forEach((child,j)=>{
       const mesh=child as THREE.Mesh,mat=mesh.material as THREE.MeshBasicMaterial;
       mat.opacity=Math.max(0,1-t);
       if(j===0){mesh.scale.setScalar(reduced?.7:.25+age*2.5);mat.opacity*=.7;}
       else if(j<9){
         const a=j*2.399+e.serial,v=.9+(j%3)*.5;
         mesh.position.set(reduced?Math.cos(a)*.5:Math.cos(a)*age*v,reduced?.3:Math.max(0,age*(2+j*.2)-age*age*2.8),reduced?Math.sin(a)*.5:Math.sin(a)*age*v);
         mesh.rotation.set(age*j,age*(j+1),age*j*.7);
       }else if(j===9){
         mesh.position.set(0,.25,0);mesh.scale.setScalar(.3+age*1.4);mat.opacity=reduced?(1-t)*.18:Math.max(0,.85-age*2.5);
       }else{
         mesh.position.set((j-10.5)*.3,.3+age*(j===10?1.2:.8),0);mesh.scale.setScalar(.25+age*.75);mat.opacity=(1-t)*.35;
       }
     });
   });
 });
 return <>{Array.from({length:15},(_,i)=><group key={i} ref={g=>{groups.current[i]=g;}} visible={false}>
   <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.8,1,24]}/><meshBasicMaterial color="#ffbf69" transparent side={THREE.DoubleSide} depthWrite={false}/></mesh>
   {Array.from({length:8},(_,j)=><mesh key={j}>
     <boxGeometry args={j%2?[.07,.07,.32]:[.2,.14,.14]}/><meshBasicMaterial color={j%2?'#ffd580':'#8c9c9f'} transparent/>
   </mesh>)}
   <mesh><icosahedronGeometry args={[.65,1]}/><meshBasicMaterial color="#ffcc82" transparent depthWrite={false}/></mesh>
   {[0,1].map(j=><mesh key={`smoke${j}`}><icosahedronGeometry args={[.7,1]}/><meshBasicMaterial color="#6d777f" transparent depthWrite={false}/></mesh>)}
 </group>)}</>;
}

function CreditRadar({range}:{range:number}){
 const limit=Math.min(1.3,Math.asin(Math.min(1,10.2/range)));
 return <group>{Array.from({length:33},(_,i)=>{
   const a=-limit+i/32*limit*2;
   return <mesh key={i} position={[Math.sin(a)*range,.04,TURRET.z-Math.cos(a)*range]} rotation={[0,-a,0]}><boxGeometry args={[.16,.02,.035]}/><meshBasicMaterial color="#b8a2ff" transparent opacity={.5}/></mesh>;
 })}</group>;
}

function Scene({world,ledger,onReady,onGesture,onFailure,reduced,avatar,strengths,visualState}:Props){
 const {gl,camera}=useThree();const plane=useMemo(()=>new THREE.Plane(new THREE.Vector3(0,1,0),0),[]),ray=useMemo(()=>new THREE.Raycaster(),[]);
 useEffect(()=>{onReady();},[onReady]);
 useEffect(()=>{
   const canvas=gl.domElement;const pos=new THREE.Vector3(),pointer=new THREE.Vector2();
   const aim=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);if(ray.ray.intersectPlane(plane,pos))setAim(world.current,pos.x,pos.z);};
   const down=(e:PointerEvent)=>{if(e.button!==0||world.current.ledger.paused)return;e.preventDefault();onGesture();canvas.focus({preventScroll:true});aim(e);canvas.setPointerCapture(e.pointerId);if(e.pointerType!=="touch")setTrigger(world.current,"pointer",true);};
   const up=(e:PointerEvent)=>{if(e.pointerType!=="touch")setTrigger(world.current,"pointer",false);};
   canvas.setAttribute("tabindex","0");canvas.setAttribute("aria-label","Aim anywhere in the battlefield. Hold mouse button to fire. On touch, drag to aim and hold Fire.");
   canvas.addEventListener("webglcontextlost",onFailure);
   canvas.addEventListener("pointermove",aim);canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);canvas.addEventListener("lostpointercapture",up);
   return()=>{canvas.removeEventListener("webglcontextlost",onFailure);canvas.removeEventListener("pointermove",aim);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("lostpointercapture",up);};
 },[gl,camera,plane,ray,world,onGesture,onFailure]);
 return <>
   <FitCamera/><color attach="background" args={["#0d1c2a"]}/><ambientLight intensity={1.1}/><hemisphereLight args={["#bdedff","#344e50",1.4]}/>
   <directionalLight position={[-5,17,8]} intensity={2.7} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14}/>
   <pointLight position={[0,5,-5]} intensity={35} color="#69bbd0" distance={25}/>
   <Room/>{ledger.hangar&&<CreditRadar range={ledger.hangar.loadout.radar}/>}<Defenses ledger={ledger} world={world} reduced={reduced}/><Turret world={world} avatar={avatar} strengths={strengths} visualState={visualState} reduced={reduced}/>
   {combatActors(world.current).map(actor=><Enemy key={actor.id} actor={actor} world={world}/>)}
   <Effects world={world} reduced={reduced}/>
 </>;
}

export function DebtbreakerBattlefield(props:Props){
 // This scene is mounted only in the client-only arcade after Start is pressed.
 const [webgl]=useState(()=>{try{if(typeof document==='undefined')return false;const probe=document.createElement("canvas"),gl=probe.getContext("webgl2"),supported=!!gl;gl?.getExtension("WEBGL_lose_context")?.loseContext();return supported;}catch{return false;}});
 const fallback=<DebtbreakerCompatibility {...props}/>;
 if(!webgl)return fallback;
 return <RenderBoundary fallback={fallback}><Canvas orthographic shadows dpr={[1,1.5]} camera={{position:[0,23,15],zoom:1,near:.1,far:100}} gl={{antialias:true,powerPreference:"high-performance"}}><Scene {...props}/></Canvas></RenderBoundary>;
}
