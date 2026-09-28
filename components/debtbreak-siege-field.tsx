"use client";
import {useEffect,useRef,type MutableRefObject} from 'react';
import {drawSiege} from '@/lib/debtbreak-siege-render.js';
import {setAim,setTrigger,type SiegeWorld} from '@/lib/debtbreak-siege.js';
const paths={space:'/debtbreak/space.png',atlas:'/debtbreak/atlas.png',sentinel:'/debtbreak/sentinel.png'};
type Props={world:MutableRefObject<SiegeWorld>;onReady:()=>void;onFailure:()=>void;onGesture:()=>void;reduced:boolean};
export function DebtbreakSiegeField({world,onReady,onFailure,onGesture,reduced}:Props){
 const canvas=useRef<HTMLCanvasElement>(null),images=useRef<Partial<Record<keyof typeof paths,HTMLImageElement>>>({});
 useEffect(()=>{
  let cancelled=false,frame=0;const element=canvas.current,ctx=element?.getContext('2d');if(!element||!ctx){onFailure();return;}
  const load=Object.entries(paths).map(([key,path])=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>{images.current[key as keyof typeof paths]=img;resolve();};img.onerror=reject;img.src=path;}));
  Promise.all(load).then(()=>{if(!cancelled)onReady();}).catch(()=>{if(!cancelled)onFailure();});
  let width=1,height=1;const resize=()=>{const rect=element.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);const dpr=Math.min(1.5,window.devicePixelRatio||1);element.width=Math.round(width*dpr);element.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
  const observer=new ResizeObserver(resize);observer.observe(element);resize();
  const draw=()=>{drawSiege(ctx,world.current,width,height,images.current,reduced);frame=requestAnimationFrame(draw);};draw();
  return()=>{cancelled=true;cancelAnimationFrame(frame);observer.disconnect();};
 },[world,onReady,onFailure,reduced]);
 const aim=(e:React.PointerEvent<HTMLCanvasElement>)=>{const rect=e.currentTarget.getBoundingClientRect();setAim(world.current,(e.clientX-rect.left)/rect.width*1000,(e.clientY-rect.top)/rect.height*1000);};
 const release=()=>setTrigger(world.current,'pointer',false);
 return <canvas ref={canvas} className="siege-canvas" tabIndex={0} aria-label="Debtbreak battlefield. Aim with mouse or touch; click for an intercept or hold for rapid fire. Keyboard: arrows aim, Space fires, 1 and 2 choose weapons, P pauses."
  onPointerMove={aim} onPointerDown={e=>{if(e.button!==0)return;aim(e);onGesture();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);if(world.current.ledger.phase==='playing'&&!world.current.ledger.paused)setTrigger(world.current,'pointer',true);}}
  onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onContextMenu={e=>e.preventDefault()}/>;
}
