"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { beginCampaign, createHangarCampaign, startNextPeriod, togglePause, type DebtbreakerState } from "@/lib/debtbreaker-engine.js";
import type { Snapshot } from "@/lib/vision-contract.js";
import type { ResolvedDetails } from "@/lib/advanced-finances.js";
import { advanceCombat, aimAtTarget, clearTriggers, createCombat, setAim, setTrigger } from "@/lib/debtbreaker-combat.js";
import { DebtbreakerAudio } from "./debtbreaker-audio";

export function useDebtbreakerController(snapshot:Snapshot,grade:string|null,details?:ResolvedDetails){
  // Capture once when the game opens; gameplay never writes back to the hangar.
  const [startingState]=useState(()=>createHangarCampaign(snapshot,grade,details));
  const [state,setState]=useState<DebtbreakerState>(startingState);
  const [initialWorld]=useState(()=>createCombat(startingState));
  const world=useRef(initialWorld);
  const audio=useRef<DebtbreakerAudio|null>(null);
  const readyRef=useRef(false),keys=useRef(new Set<string>()),keyboardPulse=useRef(0);
  const modal=useRef(false);
  const setModal=useCallback((open:boolean)=>{modal.current=open;},[]);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const [sound,setSound]=useState(true),[reduced,setReduced]=useState(false);
  const refresh=useCallback(()=>setState({...world.current.ledger}),[]);
  const gesture=useCallback(()=>{audio.current??=new DebtbreakerAudio();audio.current.unlock();},[]);
  const stop=useCallback(()=>{clearTriggers(world.current);keys.current.clear();keyboardPulse.current=0;},[]);
  const pause=useCallback(()=>{
    stop();if(world.current.ledger.phase==="playing")world.current.ledger={...world.current.ledger,paused:true};refresh();
  },[stop,refresh]);
  const toggle=useCallback(()=>{if(modal.current)return;gesture();stop();world.current.ledger=togglePause(world.current.ledger);refresh();},[gesture,stop,refresh]);
  const onReady=useCallback(()=>{readyRef.current=true;setReady(true);setFailed(false);},[]);
  const onFailure=useCallback(()=>{readyRef.current=false;setReady(false);setFailed(true);pause();},[pause]);
  const replace=useCallback((next:DebtbreakerState)=>{world.current.ledger=next;refresh();},[refresh]);
  const reset=useCallback(()=>{
    stop();readyRef.current=false;setReady(false);setFailed(false);
    world.current=createCombat(structuredClone(startingState),world.current.pace);refresh();
  },[stop,refresh,startingState]);
  const start=useCallback((pace:string)=>{
    gesture();stop();readyRef.current=false;setReady(false);setFailed(false);
    world.current=createCombat(beginCampaign(startingState),pace);refresh();
  },[gesture,stop,refresh,startingState]);
  const next=useCallback(()=>{
    gesture();stop();readyRef.current=false;setReady(false);
    const w=world.current,next=startNextPeriod(w.ledger);
    w.ledger=next;w.drones=createCombat(next).drones;w.formationPeriod=next.period;w.settleUntil=0;
    w.bullets=[];w.effects=[];w.lockedId=null;refresh();
  },[gesture,stop,refresh]);
  const fire=useCallback((active:boolean)=>{
    if(active&&(world.current.ledger.phase!=="playing"||world.current.ledger.paused||!readyRef.current))return;
    if(active)gesture();setTrigger(world.current,"button",active);
  },[gesture]);
  const pulse=useCallback(()=>{gesture();keyboardPulse.current=.01;},[gesture]);
  const select=useCallback((id:string)=>{aimAtTarget(world.current,id);refresh();},[refresh]);
  const source=useCallback((value:'income'|'reserve')=>{world.current.source=value;refresh();},[refresh]);
  const auto=useCallback(()=>{gesture();world.current.autoFire=!world.current.autoFire;refresh();},[gesture,refresh]);
  const assist=useCallback(()=>{world.current.assist=!world.current.assist;world.current.lockedId=null;refresh();},[refresh]);
  const toggleSound=useCallback(()=>{
    audio.current??=new DebtbreakerAudio();audio.current.enabled=!audio.current.enabled;setSound(audio.current.enabled);
    if(audio.current.enabled){audio.current.unlock();audio.current.play("deposit");}
  },[]);

  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const change=()=>setReduced(media.matches);change();media.addEventListener("change",change);
    return()=>{media.removeEventListener("change",change);audio.current?.dispose();};
  },[]);
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)pause();};
    const down=(e:KeyboardEvent)=>{
      if(modal.current||world.current.ledger.phase!=="playing"||(e.target as HTMLElement).closest("input,textarea,select"))return;
      if(e.code==="KeyP"){if(!e.repeat){e.preventDefault();toggle();}return;}
      if((e.target as HTMLElement).closest("button")||world.current.ledger.paused)return;
      if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS","Space"].includes(e.code)){
        e.preventDefault();keys.current.add(e.code);if(e.code==="Space")gesture();
      }
      if(e.code==="KeyR"&&!e.repeat){source(world.current.source==="income"?"reserve":"income");}
    };
    const up=(e:KeyboardEvent)=>keys.current.delete(e.code);
    window.addEventListener("blur",pause);document.addEventListener("visibilitychange",hidden);
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);
    return()=>{window.removeEventListener("blur",pause);document.removeEventListener("visibilitychange",hidden);window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);stop();};
  },[pause,toggle,gesture,source,stop]);
  useEffect(()=>{
    let frame=0,last=performance.now(),lastHud=0,padPause=false;
    const loop=(now:number)=>{
      const dt=Math.min(.05,(now-last)/1000);last=now;
      const w=world.current;
      if(w.ledger.phase!=="playing"&&w.time<w.settleUntil&&!document.hidden){advanceCombat(w,dt);refresh();}
      if(w.ledger.phase==="playing"&&readyRef.current&&!document.hidden&&!modal.current){
        const pad=navigator.getGamepads?.().find(p=>p?.connected);
        const pausePressed=!!pad?.buttons[9]?.pressed;
        if(pausePressed&&!padPause)toggle();padPause=pausePressed;
        if(!w.ledger.paused){
          const k=keys.current;
          let dx=Number(k.has("ArrowRight")||k.has("KeyD"))-Number(k.has("ArrowLeft")||k.has("KeyA"));
          let dz=Number(k.has("ArrowDown")||k.has("KeyS"))-Number(k.has("ArrowUp")||k.has("KeyW"));
          if(pad){
            const axes=Math.abs(pad.axes[2]??0)+Math.abs(pad.axes[3]??0)>.2?[pad.axes[2],pad.axes[3]]:[pad.axes[0],pad.axes[1]];
            dx+=Math.abs(axes[0]??0)>.15?axes[0]:0;dz+=Math.abs(axes[1]??0)>.15?axes[1]:0;
            if(pad.buttons[0]?.pressed)w.source="income";if(pad.buttons[1]?.pressed)w.source="reserve";
          }
          if(dx||dz)setAim(w,w.aim.x+dx*10*dt,w.aim.z+dz*10*dt);
          setTrigger(w,"key",k.has("Space")||keyboardPulse.current>0);
          setTrigger(w,"pad",!!pad?.buttons[7]?.pressed);
          keyboardPulse.current=Math.max(0,keyboardPulse.current-dt);
          const phase=w.ledger.phase;
          advanceCombat(w,dt);w.events.forEach((e:{type:string})=>audio.current?.play(e.type));
          if(w.ledger.phase!==phase){stop();refresh();lastHud=now;}
          else if(now-lastHud>100){refresh();lastHud=now;}
        }
      }
      frame=requestAnimationFrame(loop);
    };
    frame=requestAnimationFrame(loop);return()=>cancelAnimationFrame(frame);
  },[refresh,stop,toggle]);

  return {state,world,ready,failed,sound,reduced,refresh,gesture,pause,toggle,onReady,onFailure,replace,reset,start,next,fire,pulse,select,source,auto,assist,toggleSound,setModal};
}
