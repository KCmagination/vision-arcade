"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Home, Pause, Play, RotateCcw, Shield, Volume2, VolumeX, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterModel, type CharacterMotion } from "./character-model";
import { RenderBoundary, StudioEnvironment, type AvatarKind, type CornerStrengths } from "./avatar-stage";
import { SceneEffects } from "./scene-effects";
import { useRenderProfile } from "@/hooks/use-render-profile";
import { createLoadout, createSector, stepSector, type Sector, type Loadout } from "@/lib/arcade-engine.js";

type InputState = { keys: Set<string>; pointer: THREE.Vector2; aiming: boolean; firing: boolean; autoFire: boolean };
type Hud = { phase: Sector["phase"]; wave: number; energy: number; enemies: number; kills: number; blocks: number; time: number; dash: number; integrity: number; boss: number | null; accuracy: number; recovering: boolean; hit: boolean };
function readHud(s: Sector): Hud { const boss = s.enemies.find(e => e.boss); return { phase: s.phase, wave: s.wave, energy: s.energy, enemies: s.enemies.length, kills: s.kills, blocks: s.blocks, time: Math.floor(s.elapsed), dash: s.dashCooldown, integrity: s.stability, boss: boss ? boss.hp / boss.maxHp : null, accuracy: s.shotsFired ? Math.round(s.shotsHit / s.shotsFired * 100) : 0, recovering: s.hitFlash > 1, hit: s.hitFlash > .55 }; }

function SectorWorld({ avatar, strengths, world, input, loadout, compact, reduced, onHud, onEvent }: {
  avatar: AvatarKind; strengths: CornerStrengths; world: MutableRefObject<Sector>; input: MutableRefObject<InputState>; loadout: Loadout; compact: boolean; reduced: boolean; onHud: (hud: Hud) => void; onEvent: (event: string) => void;
}) {
  const player = useRef<THREE.Group>(null), radar = useRef<THREE.Mesh>(null), shield = useRef<THREE.Mesh>(null), reticle = useRef<THREE.Group>(null);
  const drones = useRef<Array<THREE.Group | null>>([]), bullets = useRef<THREE.InstancedMesh>(null), sparks = useRef<THREE.InstancedMesh>(null);
  const motion = useRef<CharacterMotion>({ moving: 0, firing: false, shield: false, dash: false });
  const { camera, scene, size } = useThree();
  const utility = useMemo(() => ({ dummy: new THREE.Object3D(), ray: new THREE.Raycaster(), plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), point: new THREE.Vector3(), color: new THREE.Color() }), []);
  const hudTime = useRef(0);
  useEffect(() => { const aspect = size.width / Math.max(1, size.height), portrait = aspect < 1; const distance = Math.max(1, (portrait ? 1.05 : 1.35) / Math.max(.25, aspect)); camera.position.set((portrait ? 0 : 13) * distance, (portrait ? 20 : 16) * distance, (portrait ? 20 : 18) * distance); camera.lookAt(0, 0, 0); scene.fog = new THREE.FogExp2("#081522", .018 / distance); return () => { scene.fog = null; }; }, [camera, scene, size]);
  useFrame((state, delta) => {
    const s = world.current, control = input.current, active = s.phase === "playing";
    const has = (a: string, b?: string) => control.keys.has(a) || !!b && control.keys.has(b);
    const horizontal = Number(has("d", "arrowright")) - Number(has("a", "arrowleft")), vertical = Number(has("s", "arrowdown")) - Number(has("w", "arrowup"));
    // Keep movement aligned with the screen in both portrait and landscape.
    const cameraLength = Math.hypot(camera.position.x, camera.position.z) || 1;
    const backX = camera.position.x / cameraLength, backZ = camera.position.z / cameraLength;
    const x = horizontal * backZ + vertical * backX, z = -horizontal * backX + vertical * backZ;
    let aim: { x: number; z: number } | null = null;
    if (control.aiming) { utility.ray.setFromCamera(control.pointer, camera); if (utility.ray.ray.intersectPlane(utility.plane, utility.point)) aim = { x: utility.point.x, z: utility.point.z }; }
    stepSector(s, { x, z, fire: control.firing || control.keys.has(" ") || control.autoFire, shield: control.keys.has("e"), dash: control.keys.has("shift"), aim }, loadout, delta);
    s.events.forEach(onEvent);
    if (player.current) { player.current.position.set(s.x, 0, s.z); player.current.rotation.y = s.angle; }
    motion.current = { moving: active ? Math.min(1, Math.hypot(x, z)) : 0, firing: active && s.cooldown > 0, shield: active && s.shield, dash: s.dash > 0 };
    if (radar.current) { radar.current.position.set(s.x, .015, s.z); radar.current.scale.setScalar(loadout.radar); }
    if (shield.current) { shield.current.visible = s.shield; shield.current.position.set(s.x, .8, s.z); shield.current.scale.setScalar(loadout.shieldRadius); (shield.current.material as THREE.MeshBasicMaterial).opacity = .11 + Math.sin(state.clock.elapsedTime * 8) * .025; }
    if (reticle.current) { reticle.current.visible = !!aim && active; if (aim) reticle.current.position.set(aim.x, .04, aim.z); reticle.current.rotation.y = state.clock.elapsedTime; }
    for (let i = 0; i < 16; i++) { const group = drones.current[i], e = s.enemies[i]; if (!group) continue; group.visible = !!e; if (!e) continue; group.position.set(e.x, e.boss ? 1.6 : 1.15 + Math.sin(s.elapsed * 2 + e.id) * .18, e.z); group.rotation.y = s.elapsed * (e.boss ? -.45 : 1); group.scale.setScalar(e.boss ? 2.1 : e.hit > 0 ? 1.18 : 1); }
    if (bullets.current) {
      bullets.current.count = Math.min(s.shots.length, 160);
      s.shots.slice(0, 160).forEach((b, i) => { utility.dummy.position.set(b.x, .8, b.z); utility.dummy.rotation.set(0, Math.atan2(b.vx, b.vz), 0); utility.dummy.scale.set(b.enemy ? .16 : .07, b.enemy ? .16 : .07, b.enemy ? .16 : .4); utility.dummy.updateMatrix(); bullets.current!.setMatrixAt(i, utility.dummy.matrix); bullets.current!.setColorAt(i, utility.color.set(b.enemy ? "#ff7153" : avatar === "mech" ? "#73f3ff" : "#9bf98a")); });
      bullets.current.instanceMatrix.needsUpdate = true; if (bullets.current.instanceColor) bullets.current.instanceColor.needsUpdate = true;
    }
    if (sparks.current) {
      sparks.current.count = Math.min(s.sparks.length, 160);
      s.sparks.slice(0, 160).forEach((p, i) => { utility.dummy.position.set(p.x, Math.max(.05, p.y), p.z); utility.dummy.rotation.set(0, 0, 0); utility.dummy.scale.setScalar(Math.max(.01, p.life * .13)); utility.dummy.updateMatrix(); sparks.current!.setMatrixAt(i, utility.dummy.matrix); sparks.current!.setColorAt(i, utility.color.set(p.color === "shield" ? "#81ffd3" : p.color === "boss" ? "#ffbe73" : "#83c4ff")); });
      sparks.current.instanceMatrix.needsUpdate = true; if (sparks.current.instanceColor) sparks.current.instanceColor.needsUpdate = true;
    }
    hudTime.current += delta; if (hudTime.current > .1) { onHud(readHud(s)); hudTime.current = 0; }
  });
  return <>
    <color attach="background" args={["#081522"]} /><StudioEnvironment />{!compact && <SceneEffects strength={.58} />}
    <hemisphereLight args={["#addfea", "#152539", 1.45]} /><directionalLight position={[7, 13, 5]} intensity={2.8} color="#d9eaf6" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-.001} />
    <pointLight position={[-7, 3, -8]} intensity={48} color="#3ef1dd" /><pointLight position={[6, 3, 2]} intensity={36} color="#ff9659" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.03, 0]} receiveShadow><planeGeometry args={[60, 60]} /><meshStandardMaterial color="#102332" metalness={.5} roughness={.48} /></mesh>
    <gridHelper args={[60, 60, "#28667a", "#193f53"]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .01, 0]}><ringGeometry args={[9.5, 9.55, 100]} /><meshBasicMaterial color="#4bb9c4" /></mesh>
    {[-1, 1].flatMap(side => [-7.5, -2.5, 2.5, 7.5].map(z => <group key={`${side}-${z}`} position={[side * 10.2, 0, z]}><mesh position={[0, .9, 0]} castShadow><boxGeometry args={[1.4, 1.8, 1.4]} /><meshStandardMaterial color="#254352" metalness={.7} roughness={.3} /></mesh><mesh position={[0, 1.84, 0]}><boxGeometry args={[1.32, .035, 1.32]} /><meshBasicMaterial color={side === -1 ? "#4bd5d0" : "#e79960"} /></mesh></group>))}
    <mesh position={[0, .04, -9]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[16, .035]} /><meshBasicMaterial color="#e89d67" /></mesh>
    <group ref={player}><group scale={.42}><CharacterModel avatar={avatar} strengths={strengths} motion={motion} reducedMotion={reduced} /></group></group>
    <mesh ref={radar} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.994, 1, 90]} /><meshBasicMaterial color="#b0a3fb" transparent opacity={.21} depthWrite={false} /></mesh>
    <mesh ref={shield} visible={false}><sphereGeometry args={[1, 24, 16]} /><meshBasicMaterial color="#79fbc7" wireframe transparent opacity={.12} depthWrite={false} /></mesh>
    <group ref={reticle}><mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.28, .32, 24]} /><meshBasicMaterial color="#99ffff" /></mesh></group>
    {Array.from({ length: 16 }, (_, i) => <group key={i} ref={g => { drones.current[i] = g; }} visible={false}>
      <mesh castShadow><icosahedronGeometry args={[.58, 0]} /><meshStandardMaterial color="#314861" metalness={.8} roughness={.25} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.73, .04, 6, 24]} /><meshStandardMaterial color="#fe9570" emissive="#ff563a" emissiveIntensity={2.4} /></mesh>
      <mesh position={[0, 0, .5]}><sphereGeometry args={[.16, 10, 8]} /><meshStandardMaterial color="#ffe4a5" emissive="#ffbd7c" emissiveIntensity={2.6} /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * .75, 0, 0]} rotation={[0, 0, side * .25]}><boxGeometry args={[.5, .13, .35]} /><meshStandardMaterial color="#587080" metalness={.7} roughness={.4} /></mesh>)}
    </group>)}
    <instancedMesh ref={bullets} args={[undefined, undefined, 160]} frustumCulled={false}><sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
    <instancedMesh ref={sparks} args={[undefined, undefined, 160]} frustumCulled={false}><icosahedronGeometry args={[1, 0]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
  </>;
}

export function DebtbreakArena({ avatar, strengths, picture, onExit }: { avatar: AvatarKind; strengths: CornerStrengths; picture: "current" | "scenario"; onExit: () => void }) {
  const { compact, reduced } = useRenderProfile();
  const loadout = useMemo(() => createLoadout(strengths), [strengths]);
  const world = useRef(createSector(loadout));
  const input = useRef<InputState>({ keys: new Set(), pointer: new THREE.Vector2(), aiming: false, firing: false, autoFire: false });
  const focus = useRef<HTMLDivElement>(null), audioContext = useRef<AudioContext | null>(null), soundEnabled = useRef(false);
  const [hud, setHud] = useState(() => readHud(world.current)), [sound, setSound] = useState(false), [autoFire, setAutoFire] = useState(false), [help, setHelp] = useState(false);
  const refocus = () => { if (world.current.phase === "playing") requestAnimationFrame(() => focus.current?.focus({ preventScroll: true })); };
  const clear = () => { input.current.keys.clear(); input.current.firing = false; };
  const pause = () => { if (world.current.phase === "playing") world.current.phase = "paused"; clear(); setHud(readHud(world.current)); };
  useEffect(() => { const hidden = () => { if (document.hidden) pause(); }; window.addEventListener("blur", pause); document.addEventListener("visibilitychange", hidden); return () => { window.removeEventListener("blur", pause); document.removeEventListener("visibilitychange", hidden); audioContext.current?.close(); }; }, []);
  const event = (kind: string) => {
    if (!soundEnabled.current || !audioContext.current || !["fire", "kill", "block", "complete"].includes(kind)) return;
    const ac = audioContext.current, osc = ac.createOscillator(), gain = ac.createGain(), time = ac.currentTime;
    osc.type = kind === "fire" ? "sine" : "triangle"; osc.frequency.setValueAtTime(kind === "fire" ? 310 : kind === "complete" ? 800 : 580, time); osc.frequency.exponentialRampToValueAtTime(kind === "fire" ? 95 : 180, time + .1); gain.gain.setValueAtTime(.025, time); gain.gain.exponentialRampToValueAtTime(.001, time + .14); osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(time + .15);
  };
  const toggleSound = async () => { try { if (!audioContext.current) audioContext.current = new AudioContext(); await audioContext.current.resume(); soundEnabled.current = !soundEnabled.current; setSound(soundEnabled.current); } catch { soundEnabled.current = false; setSound(false); } refocus(); };
  const start = () => { if (world.current.phase === "complete") world.current = createSector(loadout); world.current.phase = "playing"; setHelp(false); setHud(readHud(world.current)); refocus(); };
  const restart = () => { world.current = createSector(loadout); start(); };
  const held = (key: string) => ({ onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); input.current.keys.add(key); if (key === " ") input.current.aiming = false; }, onPointerUp: () => input.current.keys.delete(key), onPointerCancel: () => input.current.keys.delete(key), onLostPointerCapture: () => input.current.keys.delete(key) });
  const duration = `${Math.floor(hud.time / 60)}:${String(hud.time % 60).padStart(2, "0")}`;
  return <div className="sector-shell">
    <header className="sector-header"><div><span className="eyebrow">VI$ION ARCADE / SECTOR 01</span><h2>DEBTBREAK<span>3D PROTOTYPE</span></h2></div><div className="sector-header-actions"><Button variant="ghost" onClick={() => { if (!help) pause(); setHelp(v => !v); }} aria-expanded={help}>Controls</Button><Button variant="ghost" onClick={toggleSound} aria-label={sound ? "Mute sound" : "Enable sound"}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</Button><Button variant="ghost" onClick={onExit}><Home size={17} />Hangar</Button></div></header>
    <div className="sector-play-area" data-hit={hud.hit && hud.phase === "playing"} ref={focus} tabIndex={0} role="application" aria-label="Debtbreak. WASD or arrows move, hold Space to fire, E shield, Shift dash, P pause." onBlur={clear} onKeyDown={e => { const key = e.key.toLowerCase(); if (["w", "a", "s", "d", "arrowleft", "arrowright", "arrowup", "arrowdown", " ", "e", "shift"].includes(key)) { e.preventDefault(); input.current.keys.add(key); if (key === " ") input.current.aiming = false; } if (key === "p" && !e.repeat) { e.preventDefault(); if (world.current.phase === "playing") pause(); else start(); } }} onKeyUp={e => input.current.keys.delete(e.key.toLowerCase())} onPointerMove={e => { if (e.pointerType !== "mouse") return; const rect = e.currentTarget.getBoundingClientRect(); input.current.pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1); input.current.aiming = true; }} onPointerDown={e => { if (world.current.phase !== "playing" || (e.target as HTMLElement).closest("button")) return; e.currentTarget.focus({ preventScroll: true }); e.currentTarget.setPointerCapture(e.pointerId); input.current.firing = true; }} onPointerUp={() => { input.current.firing = false; }} onPointerCancel={() => { input.current.firing = false; }} onLostPointerCapture={() => { input.current.firing = false; }}>
      <RenderBoundary fallback={<div className="sector-error"><h3>The 3D sector couldn’t load.</h3><p>Try Pulse Range from the hangar; it uses a lighter renderer.</p><Button onClick={onExit}>Return to hangar</Button></div>}><Canvas shadows={!compact} dpr={compact ? 1 : [1, 1.4]} frameloop={hud.phase === "playing" ? "always" : "demand"} camera={{ position: [13, 16, 18], fov: 43, near: .1, far: 100 }} gl={{ antialias: true, powerPreference: "high-performance" }}><Suspense fallback={null}><SectorWorld avatar={avatar} strengths={strengths} world={world} input={input} loadout={loadout} compact={compact} reduced={reduced} onHud={setHud} onEvent={event} /></Suspense></Canvas></RenderBoundary>
      <div className="sector-hud"><div className="mission-status"><span>WAVE {hud.wave} / 3</span><strong>{hud.wave === 3 ? "THE CORE" : hud.wave === 2 ? "CROSSFIRE" : "FIRST CONTACT"}</strong><small>{hud.enemies} {hud.enemies === 1 ? "target" : "targets"} remaining</small></div><div className="mission-clock">{duration}<span>{hud.kills} DISABLED · {hud.blocks} BLOCKED</span></div></div>
      {hud.boss !== null && <div className="boss-health"><span>THE CORE</span><div><i style={{ width: `${hud.boss * 100}%` }} /></div></div>}
      {hud.recovering && hud.phase === "playing" && <div className="recovery-message">SYSTEMS RESTORED — KEEP MOVING</div>}
      {hud.phase !== "playing" && <div className="sector-intro"><span className="eyebrow">{hud.phase === "complete" ? "MISSION COMPLETE" : hud.phase === "paused" ? "SECTOR PAUSED" : "YOUR AVATAR. YOUR LOADOUT."}</span><h3>{hud.phase === "complete" ? "Sector cleared." : hud.phase === "paused" ? "Catch your breath." : "Break through."}</h3><p>{hud.phase === "complete" ? `${hud.kills} targets disabled. ${hud.blocks} shots blocked. Return to the hangar, change a scenario, and feel the difference.` : "Three waves of drones. One final Core. Your weapon, energy, shield and signal come from your four forces."}</p>{hud.phase === "complete" && <div className="mission-results"><span><strong>{duration}</strong>mission time</span><span><strong>{hud.accuracy}%</strong>accuracy</span><span><strong>{hud.blocks}</strong>blocked</span></div>}<div className="mission-start-actions"><Button className="primary-action" onClick={start}><Play size={18} />{hud.phase === "complete" ? "Run it again" : hud.phase === "paused" ? "Resume mission" : "Enter the sector"}</Button>{hud.phase === "complete" && <Button variant="ghost" onClick={onExit}>Return to hangar</Button>}</div><small>All loadouts are playable. Automatic recovery. No real money changes.</small></div>}
      {help && <div className="sector-help"><strong>Flight manual</strong><p className="touch-instructions">Hold the arrows to move. Hold Fire to auto-aim, Shield to block, or Dash to move quickly. Auto-fire keeps your weapon firing while you steer.</p><p className="keyboard-instructions">WASD / arrows — move<br />Space — auto-aim and fire<br />Mouse — aim, hold to fire<br />E — hold shield<br />Shift — dash<br />P — pause</p><p>Targets inside your signal ring can be auto-aimed. Energy refills continuously. Every disabled drone returns two charges.</p><Button variant="ghost" onClick={() => setHelp(false)}>Close controls</Button></div>}
    </div>
    <div className="sector-bottom"><div className="energy-hud"><span>{avatar === "mech" ? "BATTERY" : "ROOT CAPACITY"} <strong>{Math.floor(hud.energy)} / {loadout.energyMax}</strong></span><div><i style={{ width: `${hud.energy / loadout.energyMax * 100}%` }} /></div><small>{picture === "current" ? "Current" : "What-if"} loadout · {avatar === "mech" ? "Sentinel" : "Verdant"}</small><div className="frame-integrity" aria-label={`Frame stability: ${Math.ceil(hud.integrity)} of 3`}><i className={hud.integrity < 1 ? "off" : ""} /><i className={hud.integrity < 2 ? "off" : ""} /><i className={hud.integrity < 3 ? "off" : ""} /><span>AUTO-RECOVERY</span></div></div><div className="sector-touch"><div className="dpad"><Button variant="ghost" {...held("w")} aria-label="Move forward"><ArrowUp size={17} /></Button><Button variant="ghost" {...held("a")} aria-label="Move left"><ArrowLeft size={17} /></Button><Button variant="ghost" {...held("s")} aria-label="Move backward"><ArrowDown size={17} /></Button><Button variant="ghost" {...held("d")} aria-label="Move right"><ArrowRight size={17} /></Button></div><Button variant="ghost" {...held(" ")}><Crosshair size={17} />Fire</Button><Button variant="ghost" {...held("e")}><Shield size={17} />Shield</Button><Button variant="ghost" {...held("shift")}><Zap size={17} />{hud.dash > 0 ? `${hud.dash.toFixed(1)}s` : "Dash"}</Button></div><div className="sector-options"><Button variant="ghost" aria-pressed={autoFire} onClick={() => { input.current.autoFire = !autoFire; input.current.aiming = false; setAutoFire(!autoFire); refocus(); }}>Auto-fire {autoFire ? "on" : "off"}</Button><Button variant="ghost" aria-label={hud.phase === "playing" ? "Pause mission" : "Resume mission"} onClick={() => hud.phase === "playing" ? pause() : start()}>{hud.phase === "playing" ? <Pause size={17} /> : <Play size={17} />}</Button><Button variant="ghost" onClick={restart} aria-label="Restart mission"><RotateCcw size={17} /></Button></div></div>
    <div className="sector-loadout"><span><Zap size={14} />{loadout.fireRate.toFixed(1)} pulses/sec</span><span><Shield size={14} />{loadout.shieldRadius.toFixed(1)}m shield</span><span><Crosshair size={14} />{loadout.radar.toFixed(1)}m signal{loadout.unknownCredit ? " · neutral default" : ""}</span><span>Game performance is not a financial grade.</span></div>
  </div>;
}
