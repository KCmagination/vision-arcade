"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AvatarKind, CornerStrengths } from "@/components/avatar-stage";

type Target = { x: number; y: number; radius: number; speed: number; phase: number };
type Shot = { x: number; y: number; vx: number; vy: number; life: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
const BASE_W = 900, H = 440, DURATION = 45;
const capacity = (n: number | null) => n === null ? .5 : Math.min(1, Math.max(0, n));

export function TrainingArena({ avatar, strengths }: { avatar: AvatarKind; strengths: CornerStrengths }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [W, setFieldWidth] = useState(BASE_W);
  const width = useRef(BASE_W);
  const keys = useRef(new Set<string>());
  const pointer = useRef({ x: 450, y: 100, firing: false, aiming: false });
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const [hud, setHud] = useState({ time: DURATION, hits: 0, caught: 0, energy: 0 });
  const loadout = useMemo(() => ({ fireRate: 1.5 + capacity(strengths.cashFlow) * 4, maxEnergy: 3 + Math.round(capacity(strengths.collateral) * 5), shield: 35 + capacity(strengths.capital) * 40, radar: 90 + capacity(strengths.credit) * 140 }), [strengths]);
  const world = useRef({ time: 0, x: BASE_W / 2, y: H - 67, hits: 0, caught: 0, energy: loadout.maxEnergy, cooldown: 0, spawn: 0, targets: [] as Target[], shots: [] as Shot[], particles: [] as Particle[] });

  useEffect(() => {
    world.current = { time: 0, x: width.current / 2, y: H - 67, hits: 0, caught: 0, energy: loadout.maxEnergy, cooldown: 0, spawn: 0, targets: [.18, .5, .82].map((fraction, i) => ({ x: fraction * width.current, y: 75 + i * 23, radius: 16, speed: 22 + i * 5, phase: i })), shots: [], particles: [] };
    setHud({ time: DURATION, hits: 0, caught: 0, energy: loadout.maxEnergy });
    keys.current.clear(); pointer.current.firing = false; pointer.current.aiming = false;
  }, [round, loadout]);

  useEffect(() => {
    const portrait = matchMedia("(max-width: 600px) and (orientation: portrait)");
    const resize = () => setFieldWidth(portrait.matches ? 540 : BASE_W);
    resize(); portrait.addEventListener("change", resize);
    return () => portrait.removeEventListener("change", resize);
  }, []);

  useEffect(() => {
    if (W === width.current) return;
    const ratio = W / width.current;
    width.current = W;
    world.current.x *= ratio;
    [...world.current.targets, ...world.current.shots, ...world.current.particles].forEach(item => { item.x *= ratio; });
    pointer.current.x *= ratio; pointer.current.firing = false;
    keys.current.clear(); setRunning(false);
  }, [W]);

  useEffect(() => {
    const pause = () => { setRunning(false); keys.current.clear(); pointer.current.firing = false; };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener("blur", pause); document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("blur", pause); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => {
    const el = canvas.current, ctx = el?.getContext("2d");
    if (!ctx || !el) { setUnavailable(true); return; }
    const sprite = new Image();
    sprite.src = avatar === "mech" ? "/characters/sentinel.png" : "/characters/verdant.png";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let request = 0, previous = 0, lastHud = 0;
    const burst = (x: number, y: number, color: string) => { if (!reduced) for (let i = 0; i < 9; i++) { const a = Math.PI * 2 * i / 9; world.current.particles.push({ x, y, vx: Math.cos(a) * 75, vy: Math.sin(a) * 75, life: .5, color }); } };
    function frame(now: number) {
      if (!ctx) return;
      const dt = previous ? Math.min((now - previous) / 1000, .04) : 0; previous = now;
      const s = world.current;
      if (running && s.time < DURATION) {
        s.time = Math.min(DURATION, s.time + dt); s.cooldown = Math.max(0, s.cooldown - dt); s.spawn += dt;
        s.energy = Math.min(loadout.maxEnergy, s.energy + dt * 2);
        const move = (keys.current.has("arrowright") || keys.current.has("d") ? 1 : 0) - (keys.current.has("arrowleft") || keys.current.has("a") ? 1 : 0);
        s.x = Math.max(50, Math.min(W - 50, s.x + move * dt * 310 * (W / BASE_W)));
        if (s.spawn >= 1.05) { s.spawn = 0; s.targets.push({ x: 70 + Math.random() * (W - 140), y: -20, radius: 14 + Math.random() * 7, speed: 23 + Math.random() * 19, phase: Math.random() * 6 }); }
        if ((keys.current.has(" ") || pointer.current.firing) && s.cooldown <= 0 && s.energy >= 1) {
          const nearest = s.targets.reduce<Target | undefined>((a, b) => !a || Math.hypot(b.x - s.x, b.y - s.y) < Math.hypot(a.x - s.x, a.y - s.y) ? b : a, undefined);
          const aim = pointer.current.aiming ? pointer.current : nearest ?? { x: s.x, y: 0 };
          const dx = aim.x - s.x, dy = aim.y - (s.y - 42), length = Math.hypot(dx, dy) || 1;
          s.shots.push({ x: s.x, y: s.y - 42, vx: dx / length * 560, vy: dy / length * 560, life: 2 });
          s.energy -= 1; s.cooldown = 1 / loadout.fireRate;
        }
        s.targets.forEach(t => { t.y += t.speed * dt; t.x += Math.sin(s.time + t.phase) * dt * 14; });
        s.shots.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; });
        for (let i = s.targets.length - 1; i >= 0; i--) {
          const t = s.targets[i]; const hit = s.shots.find(b => b.life > 0 && Math.hypot(b.x - t.x, b.y - t.y) < t.radius + 6);
          if (hit) { hit.life = 0; s.hits++; burst(t.x, t.y, "#6fe7d0"); s.targets.splice(i, 1); }
          else if (Math.hypot(t.x - s.x, t.y - s.y) < loadout.shield + t.radius) { s.caught++; burst(t.x, t.y, "#88baff"); s.targets.splice(i, 1); }
          else if (t.y > H + 30) s.targets.splice(i, 1);
        }
        s.shots = s.shots.filter(b => b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
        s.particles.forEach(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }); s.particles = s.particles.filter(p => p.life > 0);
        if (s.time >= DURATION) { setRunning(false); keys.current.clear(); pointer.current.firing = false; }
      }
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#07141e"; ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1; ctx.strokeStyle = "#153443";
      for (let x = 0; x < W; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      const glow = ctx.createRadialGradient(s.x, s.y, 15, s.x, s.y, loadout.radar); glow.addColorStop(0, "#38536440"); glow.addColorStop(1, "#07141e00"); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#b3a0ff45"; ctx.setLineDash([5, 9]); ctx.beginPath(); ctx.arc(s.x, s.y, loadout.radar, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = "#67e0b99c"; ctx.fillStyle = "#67e0b90a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, loadout.shield, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      s.targets.forEach(t => {
        const inSignal = Math.hypot(t.x - s.x, t.y - s.y) <= loadout.radar;
        ctx.strokeStyle = inSignal ? "#d5baff" : "#6d9fb5"; ctx.fillStyle = inSignal ? "#564874" : "#183542";
        ctx.beginPath(); ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(t.x - 5, t.y); ctx.lineTo(t.x + 5, t.y); ctx.moveTo(t.x, t.y - 5); ctx.lineTo(t.x, t.y + 5); ctx.stroke();
      });
      s.shots.forEach(b => { ctx.strokeStyle = avatar === "mech" ? "#74e9ff" : "#aff985"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .022, b.y - b.vy * .022); ctx.stroke(); });
      s.particles.forEach(p => { ctx.globalAlpha = p.life * 2; ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }); ctx.globalAlpha = 1;
      if (sprite.complete && sprite.naturalWidth > 0) ctx.drawImage(sprite, s.x - 39, s.y - 67, 78, 117);
      else { ctx.fillStyle = "#74e9ff"; ctx.beginPath(); ctx.arc(s.x, s.y, 15, 0, Math.PI * 2); ctx.fill(); }
      if (pointer.current.aiming && running) { ctx.strokeStyle = "#b7dde9"; ctx.lineWidth = 1; const { x, y } = pointer.current; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.moveTo(x - 15, y); ctx.lineTo(x + 15, y); ctx.moveTo(x, y - 15); ctx.lineTo(x, y + 15); ctx.stroke(); }
      if (now - lastHud > 100) { setHud({ time: Math.max(0, Math.ceil(DURATION - s.time)), hits: s.hits, caught: s.caught, energy: s.energy }); lastHud = now; }
      if (running) request = requestAnimationFrame(frame);
    }
    sprite.onload = () => { if (!running) { cancelAnimationFrame(request); request = requestAnimationFrame(frame); } };
    request = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(request); sprite.onload = null; };
  }, [avatar, loadout, running, round, W]);

  const start = () => { if (hud.time === 0) setRound(r => r + 1); setStarted(true); setRunning(true); requestAnimationFrame(() => canvas.current?.focus({ preventScroll: true })); };
  const restart = () => { setRound(r => r + 1); setStarted(true); setRunning(true); requestAnimationFrame(() => canvas.current?.focus({ preventScroll: true })); };
  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => { const rect = e.currentTarget.getBoundingClientRect(); pointer.current.x = (e.clientX - rect.left) / rect.width * W; pointer.current.y = (e.clientY - rect.top) / rect.height * H; pointer.current.aiming = true; };
  const hold = (key: string) => ({ onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); keys.current.add(key); if (key === " ") pointer.current.aiming = false; }, onPointerUp: () => keys.current.delete(key), onPointerCancel: () => keys.current.delete(key), onLostPointerCapture: () => keys.current.delete(key) });

  if (unavailable) return <p>This browser cannot open the training canvas. Your avatar setup and four-corner comparison are still available.</p>;
  return <div>
    <div className="arena-stats"><span>TIME <strong>{hud.time}s</strong></span><span>HITS <strong>{hud.hits}</strong></span><span>SHIELD CATCHES <strong>{hud.caught}</strong></span><span className="energy-display">ENERGY <strong>{Math.floor(hud.energy)} / {loadout.maxEnergy}</strong></span></div>
    <div className="arena-canvas-wrap"><canvas ref={canvas} width={W} height={H} style={{ aspectRatio: `${W} / ${H}` }} className="arena-canvas" tabIndex={0} aria-label="Pulse Range. Left and right arrows or A and D to move. Hold Space to auto-aim and fire. Mouse or touch to aim and fire." onKeyDown={e => { const key = e.key.toLowerCase(); if (["arrowleft", "arrowright", "a", "d", " "].includes(key)) { e.preventDefault(); keys.current.add(key); if (key === " ") pointer.current.aiming = false; } }} onKeyUp={e => keys.current.delete(e.key.toLowerCase())} onBlur={() => { keys.current.clear(); pointer.current.firing = false; }} onPointerMove={aim} onPointerDown={e => { if (!running) return; e.currentTarget.focus({ preventScroll: true }); e.currentTarget.setPointerCapture(e.pointerId); aim(e); pointer.current.firing = true; }} onPointerUp={() => { pointer.current.firing = false; }} onPointerCancel={() => { pointer.current.firing = false; }} onLostPointerCapture={() => { pointer.current.firing = false; }}>
      Your browser needs Canvas support to run Pulse Range.
    </canvas>{!running && <div className="arena-overlay"><h3>{hud.time === 0 ? "Training complete." : started ? "Take your time." : "Meet your loadout."}</h3><p>{hud.time === 0 ? `${hud.hits} targets hit. ${hud.caught} caught by your shield. Change your inputs and feel the difference in another round.` : "45 seconds. No lives to lose. Try your weapon, shield, energy and signal."}</p><Button onClick={start}><Play size={17} />{hud.time === 0 ? "Play again" : started ? "Resume training" : "Start training"}</Button></div>}</div>
    <div className="arena-controls"><p className="keyboard-instructions">← → or A / D: move · Space: auto-aim + fire<br />Mouse / touch: aim and hold to fire</p><p className="touch-instructions">Hold arrows to move. Hold Fire to auto-aim, or touch the arena to aim.</p><div className="touch-controls" aria-label="Touch controls"><Button variant="ghost" aria-label="Move left" {...hold("arrowleft")}><ArrowLeft size={17} /></Button><Button variant="ghost" aria-label="Move right" {...hold("arrowright")}><ArrowRight size={17} /></Button><Button variant="ghost" {...hold(" ")}><Zap size={16} />Fire</Button></div><Button variant="ghost" onClick={() => { keys.current.clear(); pointer.current.firing = false; if (running) setRunning(false); else start(); }} aria-label={running ? "Pause training" : "Resume training"}>{running ? <Pause size={17} /> : <Play size={17} />}</Button><Button variant="ghost" onClick={restart} aria-label="Restart training"><RotateCcw size={17} /></Button></div>
    <div className="arena-loadout"><span>Cash flow → firing speed<strong>{loadout.fireRate.toFixed(1)} pulses / second</strong></span><span>Equity → energy storage<strong>{loadout.maxEnergy} charges</strong></span><span>Reserves → shield reach<strong>{Math.round(loadout.shield)} units</strong></span><span>Credit → signal reach<strong>{Math.round(loadout.radar)} units{strengths.credit === null ? " · neutral default" : ""}</strong></span></div><p className="input-footnote">Training targets are fictional. Playing doesn’t change your financial inputs.</p>
  </div>;
}
