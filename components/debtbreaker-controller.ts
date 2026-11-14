"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { beginCampaign, createCampaign, createHangarCampaign, startNextPeriod, togglePause, type DebtbreakerState } from "@/lib/debtbreaker-engine.js";
import type { Snapshot } from "@/lib/vision-contract.js";
import type { ResolvedDetails } from "@/lib/advanced-finances.js";
import { advanceCombat, commandSword, aimAtTarget, clearTriggers, createCombat, setAim, setTrigger, setWeapon } from "@/lib/debtbreak-siege.js";
import { enableContinuous, continuousAction, type LedgerAction } from "@/lib/debtbreak-continuous.js";
import { DebtbreakerAudio } from "./debtbreaker-audio";
import { createFrameClock, readFrameClock, needsCombatRefresh, INTERRUPTION_NOTICE } from "@/lib/debtbreak-clock.js";

import {GROUND_SAVE_KEY,serializeGroundRun,parseGroundRun} from '@/lib/debtbreak-ground-save.js';

export function useDebtbreakerController(snapshot:Snapshot,grade:string|null,details?:ResolvedDetails){
  // Capture once when the game opens; gameplay never writes back to the hangar.
  const [startingState]=useState(()=>enableContinuous(createHangarCampaign(snapshot,grade,details),{mode:'ground'}));
  const [state,setState]=useState<DebtbreakerState>(startingState);
  const [initialWorld]=useState(()=>createCombat(startingState));
  const world=useRef(initialWorld);
  const audio=useRef<DebtbreakerAudio|null>(null);
  const readyRef=useRef(false),keys=useRef(new Set<string>()),keyboardPulse=useRef(0);
  const modal=useRef(false);
  const clock=useRef(createFrameClock());
  const setModal=useCallback((open:boolean)=>{modal.current=open;},[]);
  const [sceneKey,setSceneKey]=useState(0);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const [sound,setSound]=useState(true),[reduced,setReduced]=useState(false);
  const checkpointCycle=useRef(0),[hasSaved,setHasSaved]=useState(false);
  useEffect(()=>{try{const saved=localStorage.getItem(GROUND_SAVE_KEY);if(saved){parseGroundRun(saved);setHasSaved(true);}}catch{setHasSaved(false);}},[]);
  const refresh=useCallback(()=>{
    const w=world.current;
    if(w.ground&&w.ledger.phase==='playing'&&w.ledger.period!==checkpointCycle.current){
      checkpointCycle.current=w.ledger.period;
      try{localStorage.setItem(GROUND_SAVE_KEY,serializeGroundRun(w));setHasSaved(true);}catch{w.ledger.notice='Local checkpoint could not be saved. You can continue this run.';}
    }
    setState({...w.ledger});
  },[]);
  const gesture=useCallback(()=>{audio.current??=new DebtbreakerAudio();audio.current.unlock();},[]);
  const stop=useCallback(()=>{clearTriggers(world.current);keys.current.clear();keyboardPulse.current=0;clock.current.last=null;},[]);
  const pause=useCallback(()=>{
    stop();if(world.current.ledger.phase==="playing")world.current.ledger={...world.current.ledger,paused:true};refresh();
  },[stop,refresh]);
  const toggle=useCallback(()=>{
    if(modal.current)return;gesture();stop();world.current.ledger=togglePause(world.current.ledger);
    if(!world.current.ledger.paused&&world.current.ledger.notice===INTERRUPTION_NOTICE)world.current.ledger.notice='Play resumed.';
    refresh();
  },[gesture,stop,refresh]);
  const onReady=useCallback(()=>{readyRef.current=true;setReady(true);setFailed(false);},[]);
  const onFailure=useCallback(()=>{readyRef.current=false;setReady(false);setFailed(true);pause();},[pause]);
  const action=useCallback((action:LedgerAction)=>{const w=world.current,before=w.ledger.continuous?.repairSerial;w.ledger=continuousAction(w.ledger,action);
    if(w.ledger.phase!=='playing'){clearTriggers(w);if(w.ground){w.ground.projectiles=[];w.ground.blasts=[];}}
    if(w.ledger.continuous?.repairSerial!==before)w.effects.push({serial:++w.serial,type:'repair',x:500,z:810,amount:0,targetId:null,actorId:null,born:w.time});refresh();},[refresh]);
  const replace=useCallback((next:DebtbreakerState)=>{world.current.ledger=next;refresh();},[refresh]);
  const reset=useCallback(()=>{
    stop();setSceneKey(n=>n+1);readyRef.current=false;setReady(false);setFailed(false);
    world.current=createCombat(structuredClone(startingState),world.current.pace);refresh();
  },[stop,refresh,startingState]);
  const start=useCallback((pace:string,fictional=false,goalMonths=3,mode='campaign',seed=20260930)=>{
    gesture();stop();setSceneKey(n=>n+1);readyRef.current=false;setReady(false);setFailed(false);
    world.current=createCombat(beginCampaign(enableContinuous(fictional?{...createCampaign({baseLiving:290000}),hangar:undefined}:createHangarCampaign(snapshot,grade,details),{pace,fictional,goalMonths,mode,seed,touch:navigator.maxTouchPoints>0})),pace);checkpointCycle.current=0;refresh();
  },[gesture,stop,refresh,startingState,snapshot,grade,details]);
  const saveCheckpoint=useCallback(()=>{
    pause();try{localStorage.setItem(GROUND_SAVE_KEY,serializeGroundRun(world.current));setHasSaved(true);world.current.ledger.notice='Checkpoint saved on this device. Resume it from the start screen.';}catch(error){world.current.ledger.notice=error instanceof Error?error.message:'Checkpoint could not be saved.';}refresh();
  },[pause,refresh]);
  const resumeCheckpoint=useCallback(()=>{
    try{const restored=parseGroundRun(localStorage.getItem(GROUND_SAVE_KEY)??'');stop();world.current=restored;checkpointCycle.current=restored.ledger.period;setSceneKey(n=>n+1);readyRef.current=false;setReady(false);setFailed(false);refresh();}catch(error){setHasSaved(false);world.current.ledger.notice=error instanceof Error?error.message:'Start a new run.';refresh();}
  },[stop,refresh]);
  const next=useCallback(()=>{
    gesture();stop();setSceneKey(n=>n+1);readyRef.current=false;setReady(false);
    const w=world.current,next=startNextPeriod(w.ledger);
    w.ledger=next;w.drones=createCombat(next).drones;w.formationPeriod=next.period;w.settleUntil=0;
    w.bullets=[];w.effects=[];w.lockedId=null;refresh();
  },[gesture,stop,refresh]);
  const fire=useCallback((active:boolean)=>{
    if(active&&(world.current.ledger.phase!=="playing"||world.current.ledger.paused||!readyRef.current))return;
    if(active)gesture();setTrigger(world.current,"button",active);
  },[gesture]);
  const sword=useCallback((id?:string)=>{gesture();commandSword(world.current,id);refresh();},[gesture,refresh]);
  const pulse=useCallback(()=>{gesture();keyboardPulse.current=.01;},[gesture]);
  const select=useCallback((id:string)=>{aimAtTarget(world.current,id);refresh();},[refresh]);
  const selectGun=useCallback((index:number)=>{if(Number.isInteger(index)&&index>=0&&index<4){world.current.selectedGun=index;refresh();}},[refresh]);
  const source=useCallback((value:'auto'|'income'|'reserve')=>{world.current.source=value;refresh();},[refresh]);
  const auto=useCallback(()=>{gesture();world.current.autoFire=!world.current.autoFire;refresh();},[gesture,refresh]);
  const weapon=useCallback((mode:'intercept'|'rapid')=>{stop();setWeapon(world.current,mode);refresh();},[stop,refresh]);
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
      if(e.code==="Digit1"||e.code==="Digit2"){e.preventDefault();stop();setWeapon(world.current,e.code==="Digit1"?"intercept":"rapid");refresh();return;}
      if(e.code==="KeyP"){if(!e.repeat){e.preventDefault();toggle();}return;}
      if((e.target as HTMLElement).closest("button")||world.current.ledger.paused)return;
      if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS","Space"].includes(e.code)){
        e.preventDefault();keys.current.add(e.code);if(e.code==="Space")gesture();
      }
      if(e.code==="KeyE"&&!e.repeat){e.preventDefault();sword();}
      if(e.code==="KeyR"&&!e.repeat){source(world.current.ground?(world.current.source==="income"?"reserve":"income"):(world.current.source==="auto"?"income":world.current.source==="income"?"reserve":"auto"));}
    };
    const up=(e:KeyboardEvent)=>keys.current.delete(e.code);
    window.addEventListener("blur",pause);document.addEventListener("visibilitychange",hidden);
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);
    return()=>{window.removeEventListener("blur",pause);document.removeEventListener("visibilitychange",hidden);window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);stop();};
  },[pause,toggle,gesture,source,stop,refresh,sword]);
  useEffect(()=>{
    let frame=0,lastPaint=performance.now(),lastHud=0,padPause=false;
    const loop=(now:number)=>{
      const paintDelta=(now-lastPaint)/1000;lastPaint=now;
      const w=world.current;
      if(w.ledger.phase!=="playing"&&w.time<w.settleUntil&&!document.hidden){advanceCombat(w,paintDelta);refresh();}
      const available=w.ledger.phase==="playing"&&readyRef.current&&!document.hidden&&!modal.current;
      const pad=available?navigator.getGamepads?.().find(p=>p?.connected):undefined;
      if(available){
        const pausePressed=!!pad?.buttons[9]?.pressed;
        if(pausePressed&&!padPause)toggle();padPause=pausePressed;
      }else padPause=false;
      const timing=readFrameClock(clock.current,now,available&&!w.ledger.paused);
      if(timing.interrupted){
        stop();w.ledger={...w.ledger,paused:true,notice:INTERRUPTION_NOTICE};refresh();
      }else if(available&&!w.ledger.paused&&timing.seconds>0){
          const dt=timing.seconds;
          const k=keys.current;
          let dx=Number(k.has("ArrowRight")||k.has("KeyD"))-Number(k.has("ArrowLeft")||k.has("KeyA"));
          let dz=Number(k.has("ArrowDown")||k.has("KeyS"))-Number(k.has("ArrowUp")||k.has("KeyW"));
          if(pad){
            const axes=Math.abs(pad.axes[2]??0)+Math.abs(pad.axes[3]??0)>.2?[pad.axes[2],pad.axes[3]]:[pad.axes[0],pad.axes[1]];
            dx+=Math.abs(axes[0]??0)>.15?axes[0]:0;dz+=Math.abs(axes[1]??0)>.15?axes[1]:0;
            if(pad.buttons[0]?.pressed)w.source="income";if(pad.buttons[1]?.pressed)w.source="reserve";
            if(pad.buttons[4]?.pressed&&w.weapon!=="intercept")setWeapon(w,"intercept");if(pad.buttons[5]?.pressed&&w.weapon!=="rapid")setWeapon(w,"rapid");
          }
          if(dx||dz)setAim(w,w.aim.x+dx*620*dt,w.aim.z+dz*620*dt);
          setTrigger(w,"key",k.has("Space")||keyboardPulse.current>0);
          setTrigger(w,"pad",!!pad?.buttons[7]?.pressed);
          keyboardPulse.current=Math.max(0,keyboardPulse.current-dt);
          const before=w.ledger;
          advanceCombat(w,dt);w.events.forEach((e:{type:string})=>audio.current?.play(e.type));
          if(w.ledger.phase!==before.phase||w.ledger.paused!==before.paused)stop();
          if(needsCombatRefresh(before,w.ledger,now-lastHud)){refresh();lastHud=now;}
      }
      frame=requestAnimationFrame(loop);
    };
    frame=requestAnimationFrame(loop);return()=>cancelAnimationFrame(frame);
  },[refresh,stop,toggle]);

  return {hasSaved,saveCheckpoint,resumeCheckpoint,state,world,sceneKey,ready,failed,sound,reduced,refresh,action,gesture,pause,toggle,onReady,onFailure,replace,reset,start,next,fire,sword,pulse,select,selectGun,source,auto,assist,weapon,toggleSound,setModal};
}
