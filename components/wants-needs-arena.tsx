"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Crosshair, Home, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CornerStrengths } from "@/components/avatar-stage";
import { createRunner, createRunnerLoadout, stepRunner, RUNNER_LEVELS, RUNNER_LENGTH, type RunnerState } from "@/lib/wants-needs-engine.js";
import { drawRunner } from "./wants-needs-renderer";

const hudFor = (s:RunnerState) => ({phase:s.phase,level:s.level,score:s.score,lives:s.lives,shields:s.shields,
  rapidFire:Math.ceil(s.rapidFire),
  boss:s.boss.active,bossHp:s.boss.hp,bossMax:s.boss.maxHp,progress:Math.min(100,Math.round(s.x/(RUNNER_LENGTH-s.viewWidth+145)*100)),cause:s.cause});

export function WantsNeedsPreview() {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current?.getContext("2d");if(!c)return;
    const l=createRunnerLoadout({cashFlow:.6,capital:.5,collateral:.5,credit:.6}),s=createRunner(l);
    s.x=220;s.boss.x=810;s.boss.active=true;s.enemies=s.enemies.slice(0,3);
    s.enemies[0].x=430;s.enemies[1].x=560;s.enemies[2].x=690;
    s.shots=[{x:345,y:416,vx:900,vy:0,life:1,enemy:false,kind:"pulse"}];
    drawRunner(c,s,l,true);
  },[]);
  return <canvas ref={ref} width={960} height={540} className="runner-card-preview" aria-hidden="true" />;
}

export function WantsNeedsArena({strengths,picture,onExit}:{strengths:CornerStrengths;picture:"current"|"scenario";onExit:()=>void}) {
  const [loadout]=useState(()=>createRunnerLoadout(strengths));
  const [initial]=useState(()=>createRunner(loadout));
  const world=useRef(initial),canvas=useRef<HTMLCanvasElement>(null),surface=useRef<HTMLDivElement>(null);
  const input=useRef({keys:new Set<string>(),touches:new Map<number,string>(),auto:false,aim:0 as 0|45|90});
  const [hud,setHud]=useState(()=>hudFor(initial)),[autoFire,setAutoFire]=useState(false),[aim,setAim]=useState<0|45|90>(0),[canvasError,setCanvasError]=useState(false);
  const resetInput=()=>{input.current.keys.clear();input.current.touches.clear();world.current.jumpHeld=false;world.current.jumpBuffer=0;};
  const phase=(value:RunnerState["phase"])=>{
    resetInput();world.current.phase=value;setHud(hudFor(world.current));
    if(value==="playing")canvas.current?.focus({preventScroll:true});
  };
  const startLevel=(level:number,score:number)=>{
    world.current=createRunner(loadout,level,score,world.current.viewWidth);phase("playing");
  };
  const advance=()=>{
    const s=world.current;
    if(s.phase==="levelClear")startLevel(s.level+1,s.score);
    else if(s.phase==="failed")startLevel(s.level,s.levelStartScore);
    else if(s.phase==="complete"){
      input.current.auto=false;setAutoFire(false);input.current.aim=0;setAim(0);startLevel(1,0);
    }
    else phase("playing");
  };
  const touch=(e:PointerEvent<HTMLButtonElement>,action:string)=>{
    e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);input.current.touches.set(e.pointerId,action);
  };
  const release=(e:PointerEvent<HTMLButtonElement>)=>input.current.touches.delete(e.pointerId);

  useEffect(()=>{
    const node=canvas.current,box=surface.current,ctx=node?.getContext("2d");
    if(!node||!box||!ctx){setCanvasError(true);return;}
    const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
    const resize=()=>{
      const width=box.clientWidth,view=window.innerWidth<=730?640:960;
      world.current.viewWidth=view;
      node.width=Math.max(640,Math.round(width*Math.min(window.devicePixelRatio||1,2)));
      node.height=Math.round(node.width*540/view);
      box.style.aspectRatio=`${view} / 540`;
      world.current.camera=world.current.boss.active?RUNNER_LENGTH-view:Math.max(0,Math.min(RUNNER_LENGTH-view,world.current.x-view*.3));
    };
    const observer=new ResizeObserver(resize);observer.observe(box);resize();
    const pause=()=>{
      input.current.keys.clear();input.current.touches.clear();world.current.jumpHeld=false;
      if(world.current.phase==="playing"){world.current.phase="paused";setHud(hudFor(world.current));}
    };
    const hidden=()=>{if(document.hidden)pause();};
    const down=(e:KeyboardEvent)=>{
      if(e.code==="KeyP"&&!e.repeat){
        if(world.current.phase==="playing")pause();
        else if(world.current.phase==="paused"){world.current.phase="playing";node.focus();setHud(hudFor(world.current));}
        e.preventDefault();return;
      }
      if(world.current.phase!=="playing")return;
      if(e.code==="Space"&&e.target instanceof HTMLElement&&e.target.closest("button"))return;
      if(["ArrowLeft","ArrowRight","KeyA","KeyD","ArrowUp","KeyW","Space","KeyJ","KeyK","KeyQ","KeyE"].includes(e.code)){
        e.preventDefault();input.current.keys.add(e.code);
      }
    };
    const up=(e:KeyboardEvent)=>input.current.keys.delete(e.code);
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);window.addEventListener("blur",pause);document.addEventListener("visibilitychange",hidden);
    let frame=0,last=0,lastHud=0;
    const tick=(time:number)=>{
      const elapsed=last?Math.min((time-last)/1000,.06):0;last=time;
      const i=input.current,held=new Set(i.touches.values()),key=(...keys:string[])=>keys.some(k=>i.keys.has(k));
      const controls={move:Number(key("ArrowRight","KeyD")||held.has("right"))-Number(key("ArrowLeft","KeyA")||held.has("left")),
        jump:key("Space","ArrowUp","KeyW")||held.has("jump"),fire:i.auto||key("KeyJ","KeyK")||held.has("fire"),
        aim:key("KeyE")?90 as const:key("KeyQ")?45 as const:i.aim};
      const before=world.current.phase;
      // Bounded substeps preserve jump arcs, movement and collision on slower devices.
      let remaining=elapsed;while(remaining>0){const dt=Math.min(remaining,1/120);stepRunner(world.current,controls,loadout,dt);remaining-=dt;}
      drawRunner(ctx,world.current,loadout,motion.matches);
      if(time-lastHud>100||before!==world.current.phase){setHud(hudFor(world.current));lastHud=time;}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>{
      cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);
      window.removeEventListener("blur",pause);document.removeEventListener("visibilitychange",hidden);input.current.keys.clear();input.current.touches.clear();
    };
  },[loadout]);

  const level=RUNNER_LEVELS[hud.level-1];
  const heading=canvasError?"Playfield unavailable":hud.phase==="ready"?"Wants on the street. Needs at the finish.":hud.phase==="bossIntro"?level.name:hud.phase==="paused"?"Paused":hud.phase==="failed"?"Game Over":hud.phase==="complete"?"All three bosses defeated":`${level.name} defeated`;
  const description=canvasError?"Close the game and try opening it again.":hud.phase==="ready"?"Clear coffee cups, fast food and Utilities. Aim high at planes dropping ad bombs. Each Utilities hit drops a boost: jump from its nearby platform to collect it. Auto-fire starts off.":hud.phase==="bossIntro"?`“${level.line}”`:hud.phase==="paused"?"Your run is safe while paused.":hud.phase==="failed"?`${hud.cause} Retry this level with fresh health and shields.`:hud.phase==="complete"?`Land Lord, Car Magedon and Mortgage Maniac are down. ${hud.score.toLocaleString()} points.`:`Next up: ${RUNNER_LEVELS[hud.level]?.name}. Fresh health and shields for the next level.`;
  const button=hud.phase==="ready"?"Start level one":hud.phase==="bossIntro"?`Face ${level.name}`:hud.phase==="paused"?"Resume":hud.phase==="failed"?"Retry level":hud.phase==="complete"?"Play again":"Next level";
  const names:Record<string,string>={cashFlow:"Cash flow",capital:"Capital",collateral:"Collateral",credit:"Credit"};
  return <div className="runner-game">
    <header className="runner-header">
      <div><p className="eyebrow">{picture==="current"?"CURRENT":"WHAT-IF"} LOADOUT · RUN & GUN</p><h2>Wants vs. Needs</h2></div>
      <div className="runner-header-actions"><Button variant="ghost" disabled={hud.phase!=="playing"&&hud.phase!=="paused"}
        aria-label={hud.phase==="paused"?"Resume game":"Pause game"} onClick={()=>phase(hud.phase==="playing"?"paused":"playing")}>
        {hud.phase==="paused"?<Play/>:<Pause/>}</Button><Button variant="ghost" aria-label="Return to hangar" onClick={onExit}><Home/></Button></div>
    </header>
    <div className="runner-status">
      <span>Level <strong>{hud.level} / 3</strong></span><span>Health <strong>{hud.lives} / 5</strong></span>
      <span>Shields <strong>{hud.shields} / {loadout.shieldsMax}</strong></span><span>Score <strong>{hud.score.toLocaleString()}</strong></span>
    </div>
    <div className="runner-objective">
      <div><span>{hud.boss?level.name:`Reach ${level.name}`}</span><strong>{hud.boss?`${hud.bossHp} / ${hud.bossMax}`:`${hud.progress}%`}</strong></div>
      <div className="runner-progress" role="progressbar" aria-label={hud.boss?`${level.name} health`:"Distance to boss"} aria-valuemin={0} aria-valuemax={hud.boss?hud.bossMax:100} aria-valuenow={hud.boss?hud.bossHp:hud.progress}>
        <i style={{width:`${hud.boss?hud.bossHp/hud.bossMax*100:hud.progress}%`,background:hud.boss?level.color:"#64e1f5"}}/></div>
    </div>
    <div className="runner-stage" ref={surface}>
      <canvas ref={canvas} width={960} height={540} tabIndex={0} aria-label="Wants vs. Needs playfield. A and D or left and right arrow keys move. Space, W or Up jumps. J or K fires. Hold Q to aim 45 degrees or E to aim straight up. P pauses." />
      {(hud.phase!=="playing"||canvasError)&&<div className="runner-overlay"><div className="runner-overlay-panel">
        <p className="eyebrow">{hud.phase==="bossIntro"?`LEVEL ${hud.level} BOSS`:hud.phase==="ready"?"THREE STREETS · THREE BOSSES":hud.phase==="complete"?"CAMPAIGN COMPLETE":"WANTS VS. NEEDS"}</p>
        <h3>{heading}</h3><p className={hud.phase==="bossIntro"?"runner-boss-line":""}>{description}</p>
        {!canvasError&&<Button className="runner-primary" onClick={advance}>{hud.phase==="failed"||hud.phase==="complete"?<RotateCcw size={18}/>:<Play size={18}/>} {button}</Button>}
        {(hud.phase==="failed"||hud.phase==="complete"||canvasError)&&<Button variant="ghost" onClick={onExit}>Back to hangar</Button>}
      </div></div>}
    </div>
    <div className="runner-controls">
      <div className="runner-pad">{["left","right"].map(action=><Button key={action} variant="outline" disabled={hud.phase!=="playing"} aria-label={`Move ${action}`}
        onPointerDown={e=>touch(e,action)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>{action==="left"?<ArrowLeft/>:<ArrowRight/>}</Button>)}</div>
      <Button className="runner-auto" variant="outline" aria-pressed={autoFire} onClick={()=>{input.current.auto=!autoFire;setAutoFire(!autoFire);}}><Zap/><span>Auto-fire {autoFire?"on":"off"}</span></Button>
      <div className="runner-pad"><Button className="runner-jump" variant="outline" disabled={hud.phase!=="playing"} aria-label="Jump"
        onPointerDown={e=>touch(e,"jump")} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}><ArrowUp/><span>Jump</span></Button>
        <Button variant="outline" disabled={hud.phase!=="playing"} aria-label="Hold to fire" onPointerDown={e=>touch(e,"fire")} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}><Crosshair/><span>Fire</span></Button></div>
    </div>
    <div className="runner-aim-row">
      <div className="runner-aim" role="group" aria-label="Firing angle">
        <span>Aim</span>{([0,45,90] as const).map(value=><Button key={value} variant="outline" aria-pressed={aim===value}
          aria-label={value===0?"Aim forward":value===45?"Aim diagonally up at 45 degrees":"Aim straight up"}
          onClick={()=>{input.current.aim=value;setAim(value);canvas.current?.focus({preventScroll:true});}}>
          {value===0?<ArrowRight/>:value===45?<ArrowUpRight/>:<ArrowUp/>}<span>{value===0?"Forward":value===45?"45°":"Up"}</span></Button>)}
      </div>
      {hud.rapidFire>0&&<span className="runner-boost" role="status">Rapid fire ×1.5 · {hud.rapidFire}s</span>}
    </div>
    <p className="runner-keyboard">A / D or ← → move · Space / W / ↑ jump · J / K fire · Hold Q: 45° / E: up · P pauses</p>
    <p className="runner-pickup-help">Utilities drop 6-second rapid-fire boosts. Jump from the marked platform toward the floating boost.</p>
    <div className="runner-loadout" aria-label="Your four corners">
      <div className="runner-cash"><span>Cash flow</span><strong>{loadout.fireRate.toFixed(1)} shots / sec</strong><p>Stronger flow, faster fire.</p></div>
      <div className="runner-capital"><span>Capital</span><strong>{loadout.shieldsMax} shield hits</strong><p>Absorbs hits before health.</p></div>
      <div className="runner-collateral"><span>Collateral</span><strong>{(loadout.jumpVelocity**2/460**2).toFixed(1)}× jump height</strong><p>Higher equity, bigger jump.</p></div>
      <div className="runner-credit"><span>Credit</span><strong>{(loadout.speed/190).toFixed(1)}× movement speed</strong><p>Higher score, faster movement.</p></div>
    </div>
    {loadout.unknown.length>0&&<p className="runner-neutral">{loadout.unknown.map(key=>names[key]).join(", ")}: not entered; using a neutral game setting.</p>}
    <p className="sr-only" role="status">{hud.phase==="bossIntro"?`${level.name}. ${level.line}`:hud.phase==="failed"?"Game Over":hud.phase==="complete"?"All three bosses defeated":hud.phase==="levelClear"?`${level.name} defeated`:hud.phase==="paused"?"Paused":`Level ${hud.level}`}</p>
  </div>;
}
