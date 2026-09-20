"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, ArrowRight, Crosshair, Home, Pause, Play, RotateCcw, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CornerStrengths } from "@/components/avatar-stage";
import {
  createInvaders, createInvadersLoadout, stepInvaders, SHIP_Y,
  type InvadersLoadout, type InvadersState,
} from "@/lib/debt-invaders-engine.js";

const colors = ["#b2a0ff", "#ff8c91", "#ffc16e", "#64e1f5"];
function draw(ctx: CanvasRenderingContext2D, s: InvadersState, l: InvadersLoadout, reduced: boolean) {
  const ratio = ctx.canvas.width / 720;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, 720, 720);
  ctx.fillStyle = "#07111f";
  ctx.fillRect(0, 0, 720, 720);
  const glow = ctx.createRadialGradient(360, 260, 10, 360, 260, 450);
  glow.addColorStop(0, "#17243c"); glow.addColorStop(1, "#07111f");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 720, 720);
  for (let i = 0; i < 75; i++) {
    ctx.globalAlpha = .22 + (i % 4) * .12;
    ctx.fillStyle = "#b8daf3";
    ctx.fillRect((i * 137 + 23) % 710, (i * 83 + 17) % 700, i % 3 === 0 ? 2 : 1, 2);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#203449"; ctx.lineWidth = 1;
  for (let y = 48; y < 720; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(720, y); ctx.stroke(); }
  ctx.setLineDash([6, 10]); ctx.strokeStyle = "#ff74865c";
  ctx.beginPath(); ctx.moveTo(16, 612); ctx.lineTo(704, 612); ctx.stroke(); ctx.setLineDash([]);

  for (const e of s.enemies) {
    ctx.save(); ctx.translate(e.x, e.y);
    const c = e.flash > 0 && !reduced ? "#fff" : colors[e.row];
    ctx.shadowColor = c; ctx.shadowBlur = reduced ? 0 : 10;
    ctx.fillStyle = "#18253b"; ctx.strokeStyle = c; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-19, -6); ctx.lineTo(-9, -14); ctx.lineTo(9, -14);
    ctx.lineTo(19, -6); ctx.lineTo(16, 10); ctx.lineTo(7, 14); ctx.lineTo(-7, 14);
    ctx.lineTo(-16, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = c; ctx.font = "bold 20px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("%", 0, 1);
    if (e.maxHp > 1) { ctx.fillStyle = c; for (let i = 0; i < e.hp; i++) ctx.fillRect(-7 + i * 9, -21, 5, 3); }
    ctx.restore();
  }
  for (const b of s.barriers) {
    ctx.globalAlpha = .35 + .65 * b.hp / b.maxHp;
    ctx.fillStyle = "#ffc16e"; ctx.fillRect(b.x - 5, b.y - 5, 10, 10);
    ctx.fillStyle = "#fff0c0"; ctx.fillRect(b.x - 5, b.y - 5, 10, 2);
  }
  ctx.globalAlpha = 1;
  for (const shot of s.shots) {
    ctx.fillStyle = shot.enemy ? "#ff7d91" : "#64e1f5";
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = reduced ? 0 : 12;
    ctx.fillRect(shot.x - 2, shot.y - 5, 4, 10);
  }
  ctx.shadowBlur = 0;
  if (s.lives > 0) {
    ctx.save(); ctx.translate(s.x, SHIP_Y);
    if (s.invulnerable > 0 && !reduced) ctx.globalAlpha = .5 + .5 * Math.abs(Math.cos(s.elapsed * 18));
    const w = l.shipWidth, h = l.shipHeight;
    if (s.shields > 0) {
      ctx.strokeStyle = "#69e3b2"; ctx.lineWidth = 2;
      ctx.shadowColor = "#69e3b2"; ctx.shadowBlur = reduced ? 0 : 13;
      ctx.beginPath(); ctx.ellipse(0, 0, w / 2 + 10, h / 2 + 9, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#c0c5ff"; ctx.strokeStyle = "#b2a0ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(w * .2, -h * .05);
    ctx.lineTo(w / 2, h * .3); ctx.lineTo(w / 2, h / 2); ctx.lineTo(w * .13, h * .3);
    ctx.lineTo(0, h * .42); ctx.lineTo(-w * .13, h * .3); ctx.lineTo(-w / 2, h / 2);
    ctx.lineTo(-w / 2, h * .3); ctx.lineTo(-w * .2, -h * .05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1a2f56"; ctx.fillRect(-w * .08, -h * .1, w * .16, h * .3);
    ctx.fillStyle = "#64e1f5";
    ctx.fillRect(-3, h * .46, 6, reduced ? 7 : 7 + Math.sin(s.elapsed * 28) * 3);
    ctx.restore();
  }
  if (!reduced) for (const p of s.particles) {
    ctx.globalAlpha = Math.max(0, p.life / .45); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  if (s.waveDelay > 0) {
    ctx.fillStyle = "#d8f9f0"; ctx.font = "bold 27px monospace"; ctx.textAlign = "center";
    ctx.fillText(`WAVE ${s.wave} CLEARED`, 360, 335);
    ctx.font = "18px monospace"; ctx.fillText("Next formation incoming…", 360, 368);
  }
}

export function DebtInvadersPreview() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const loadout = createInvadersLoadout({ cashFlow: .7, capital: .7, collateral: 1, credit: .65 });
    const state = createInvaders(loadout);
    state.shots = [{ x: 360, y: 405, vy: -620, enemy: false }, { x: 258, y: 360, vy: 220, enemy: true }];
    draw(ctx, state, loadout, true);
  }, []);
  return <canvas ref={ref} width={720} height={720} aria-hidden="true" className="invaders-card-preview" />;
}

function readHud(s: InvadersState) {
  return { phase: s.phase, wave: s.wave, score: s.score, lives: s.lives, shields: s.shields,
    cover: s.barriers.reduce((sum, b) => sum + b.hp, 0), kills: s.kills, cause: s.cause };
}

export function DebtInvadersArena({ strengths, picture, onExit }: {
  strengths: CornerStrengths; picture: "current" | "scenario"; onExit: () => void;
}) {
  // A run uses one hangar snapshot; late calculator responses cannot reset an active game.
  const [loadout] = useState(() => createInvadersLoadout(strengths));
  const world = useRef(createInvaders(loadout));
  const coverMax = useMemo(() => createInvaders(loadout).barriers.reduce((sum, b) => sum + b.hp, 0), [loadout]);
  const [hud, setHud] = useState(() => readHud(world.current));
  const canvas = useRef<HTMLCanvasElement>(null);
  const inputs = useRef({ keys: new Set<string>(), touches: new Map<number, string>(), auto: true });
  const [autoFire, setAutoFire] = useState(true);
  const [canvasError, setCanvasError] = useState(false);
  const clear = () => { inputs.current.keys.clear(); inputs.current.touches.clear(); };
  const changePhase = (phase: InvadersState["phase"]) => {
    clear(); world.current.phase = phase; setHud(readHud(world.current));
    if (phase === "playing") canvas.current?.focus({ preventScroll: true });
  };
  const restart = () => { world.current = createInvaders(loadout); changePhase("playing"); };
  const touchStart = (event: PointerEvent<HTMLButtonElement>, action: string) => {
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    inputs.current.touches.set(event.pointerId, action);
  };
  const touchEnd = (event: PointerEvent<HTMLButtonElement>) => { inputs.current.touches.delete(event.pointerId); };

  useEffect(() => {
    const element = canvas.current, ctx = element?.getContext("2d");
    if (!element || !ctx) { setCanvasError(true); return; }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resize = () => {
      const pixels = Math.max(360, Math.round(element.clientWidth * Math.min(window.devicePixelRatio || 1, 2)));
      element.width = pixels; element.height = pixels;
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const pause = () => {
      inputs.current.keys.clear(); inputs.current.touches.clear();
      if (world.current.phase === "playing") { world.current.phase = "paused"; setHud(readHud(world.current)); }
    };
    const visibility = () => { if (document.hidden) pause(); };
    const down = (event: KeyboardEvent) => {
      if (event.code === "KeyP" && !event.repeat) {
        if (world.current.phase === "playing") pause();
        else if (world.current.phase === "paused") { world.current.phase = "playing"; element.focus(); setHud(readHud(world.current)); }
        event.preventDefault(); return;
      }
      if (world.current.phase !== "playing") return;
      if (event.code === "Space" && event.target instanceof HTMLElement && event.target.closest("button")) return;
      if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(event.code)) {
        event.preventDefault(); inputs.current.keys.add(event.code);
      }
    };
    const up = (event: KeyboardEvent) => inputs.current.keys.delete(event.code);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    window.addEventListener("blur", pause); document.addEventListener("visibilitychange", visibility);
    let frame = 0, previous = 0, hudTime = 0;
    const animate = (time: number) => {
      const dt = previous ? Math.min((time - previous) / 1000, .05) : 0; previous = time;
      const input = inputs.current, held = new Set(input.touches.values());
      const right = input.keys.has("ArrowRight") || input.keys.has("KeyD") || held.has("right");
      const left = input.keys.has("ArrowLeft") || input.keys.has("KeyA") || held.has("left");
      const before = world.current.phase;
      stepInvaders(world.current, { move: Number(right) - Number(left), fire: input.auto || input.keys.has("Space") || held.has("fire") }, loadout, dt);
      draw(ctx, world.current, loadout, reduced.matches);
      if (time - hudTime > 100 || world.current.phase !== before) { setHud(readHud(world.current)); hudTime = time; }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up);
      window.removeEventListener("blur", pause); document.removeEventListener("visibilitychange", visibility);
      inputs.current.keys.clear(); inputs.current.touches.clear();
    };
  }, [loadout]);

  const cover = coverMax ? Math.round(hud.cover / coverMax * 100) : 0;
  const shipLabel = loadout.shipWidth <= 34 ? "Small" : loadout.shipWidth <= 46 ? "Medium" : "Large";
  const unknownNames: Record<string, string> = { cashFlow: "Cash flow", capital: "Capital", collateral: "Collateral", credit: "Credit" };
  return (
    <div className="invaders-game">
      <header className="invaders-header">
        <div><p className="eyebrow">{picture === "current" ? "CURRENT" : "WHAT-IF"} LOADOUT</p><h2>Debt Invaders</h2></div>
        <div className="invaders-actions">
          <Button variant="ghost" aria-label={hud.phase === "paused" ? "Resume game" : "Pause game"}
            disabled={hud.phase !== "playing" && hud.phase !== "paused"}
            onClick={() => changePhase(hud.phase === "playing" ? "paused" : "playing")}>
            {hud.phase === "paused" ? <Play size={19} /> : <Pause size={19} />}
          </Button>
          <Button variant="ghost" aria-label="Return to hangar" onClick={onExit}><Home size={19} /></Button>
        </div>
      </header>
      <div className="invaders-hud" aria-label="Game status">
        <span>Wave <strong>{hud.wave} / 3</strong></span><span>Score <strong>{hud.score.toLocaleString()}</strong></span>
        <span>Hull <strong>{hud.lives} / 3</strong></span><span className="invaders-shield-stat">Shields <strong>{hud.shields} / {loadout.shieldsMax}</strong></span>
      </div>
      <div className="invaders-layout">
        <div className="invaders-play-column">
          <div className="invaders-stage">
            <canvas ref={canvas} width={720} height={720} tabIndex={0}
              aria-label="Debt Invaders playfield. Left and right arrows or A and D move. Space fires. P pauses." />
            {(hud.phase !== "playing" || canvasError) && <div className="invaders-overlay">
              <div className="invaders-overlay-panel">
                <p className="eyebrow">{hud.phase === "ready" ? "HOLD THE LINE" : hud.phase === "complete" ? "ALL THREE WAVES CLEARED" : hud.phase === "failed" ? "RUN ENDED" : "TAKE YOUR TIME"}</p>
                <h3>{canvasError ? "Playfield unavailable" : hud.phase === "ready" ? "Debt is incoming." : hud.phase === "complete" ? "Sector defended" : hud.phase === "failed" ? "Game Over" : "Paused"}</h3>
                <p>{canvasError ? "Your browser could not open the playfield. Close the game and try again." : hud.phase === "ready" ? "Clear three waves before the invaders cross your defense line. Move left and right. Auto-fire is on." : hud.phase === "failed" ? hud.cause : hud.phase === "complete" ? `${hud.kills} invaders cleared · ${hud.score.toLocaleString()} points` : "Your ship is safe while paused."}</p>
                {!canvasError && <Button className="invaders-primary" onClick={() => hud.phase === "ready" || hud.phase === "paused" ? changePhase("playing") : restart()}>
                  {hud.phase === "failed" || hud.phase === "complete" ? <RotateCcw size={18} /> : <Play size={18} />}
                  {hud.phase === "ready" ? "Launch defense" : hud.phase === "paused" ? "Resume" : "Play again"}
                </Button>}
                {(hud.phase === "failed" || hud.phase === "complete" || canvasError) && <Button variant="ghost" onClick={onExit}>Back to hangar</Button>}
              </div>
            </div>}
          </div>
          <div className="invaders-controls">
            <div className="invaders-movement">
              {(["left", "right"] as const).map(action => <Button key={action} variant="outline" aria-label={`Move ${action}`}
                disabled={hud.phase !== "playing"} onPointerDown={event => touchStart(event, action)} onPointerUp={touchEnd}
                onPointerCancel={touchEnd} onLostPointerCapture={touchEnd}>
                {action === "left" ? <ArrowLeft size={24} /> : <ArrowRight size={24} />}
              </Button>)}
            </div>
            <Button className="invaders-auto" variant="outline" aria-pressed={autoFire}
              onClick={() => { inputs.current.auto = !autoFire; setAutoFire(!autoFire); }}>
              <Zap size={17} /> Auto-fire {autoFire ? "on" : "off"}
            </Button>
            <Button className="invaders-fire" variant="outline" aria-label="Hold to fire" disabled={hud.phase !== "playing"}
              onPointerDown={event => touchStart(event, "fire")} onPointerUp={touchEnd} onPointerCancel={touchEnd} onLostPointerCapture={touchEnd}>
              <Crosshair size={21} /><span>Fire</span>
            </Button>
          </div>
          <p className="invaders-keyboard">← → or A / D move · Space fires · P pauses</p>
        </div>
        <aside className="invaders-loadout" aria-label="Your four corners in this game">
          <h3>Your four corners</h3>
          <div className="invaders-corner invaders-cash"><span>Cash flow</span><strong>{loadout.fireRate.toFixed(1)} shots / sec</strong><p>Stronger cash flow fires faster.</p></div>
          <div className="invaders-corner invaders-capital"><span>Capital</span><strong><Shield size={17} /> {hud.shields} shield hits left</strong><p>Reserves absorb hits before your hull.</p></div>
          <div className="invaders-corner invaders-collateral"><span>Collateral</span><strong>{cover}% cover remaining</strong><p>{loadout.barrierCount} barriers · stronger collateral adds more cover and tougher blocks.</p></div>
          <div className="invaders-corner invaders-credit"><span>Credit</span><strong>{shipLabel} ship</strong><p>Better credit makes your ship smaller and harder to hit.</p></div>
          {loadout.unknown.length > 0 && <p className="invaders-note">{loadout.unknown.map(key => unknownNames[key]).join(", ")}: not entered; using a neutral game setting.</p>}
          <p className="invaders-note">Both sides can chip away at barriers. Shields and cover stay depleted between waves. Return to the hangar to change your loadout.</p>
        </aside>
      </div>
      <p role="status" className="sr-only">{hud.phase === "failed" ? `Game Over. ${hud.cause}` : hud.phase === "complete" ? `Sector defended. ${hud.score} points.` : hud.phase === "paused" ? "Game paused." : `Wave ${hud.wave}.`}</p>
    </div>
  );
}
