"use client";

import { ArrowDown, ArrowRight, BatteryCharging, Check, ChevronRight, Crosshair, Expand, Gamepad2, Orbit, Radio, RotateCcw, Shield, SlidersHorizontal, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FieldHelp } from "@/components/field-help";
import type { AvatarKind, CornerStrengths } from "@/components/avatar-stage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEFAULT_CURRENT, DEFAULT_SCENARIO, type CurrentInputs, type ScenarioInputs, type CornerSignal } from "@/lib/vision-contract.js";
import { useCalculator } from "@/hooks/use-calculator";

const AvatarStage = dynamic(() => import("@/components/avatar-stage").then(m => m.AvatarStage), { ssr: false, loading: () => <div className="avatar-fallback">Loading live avatar…</div> });
const TrainingArena = dynamic(() => import("@/components/training-arena").then(m => m.TrainingArena), { ssr: false, loading: () => <p>Preparing the range…</p> });
const DebtbreakArena = dynamic(() => import("@/components/debtbreak-arena").then(m => m.DebtbreakArena), { ssr: false, loading: () => <div className="avatar-fallback">Opening the sector…</div> });
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
type CornerKey = keyof CornerStrengths;
const CORNERS = [
  { key: "credit", title: "Credit", part: "Antenna", treePart: "Height", color: "#b2a0ff", icon: Radio },
  { key: "collateral", title: "Equity", part: "Battery", treePart: "Roots", color: "#ffc16e", icon: BatteryCharging },
  { key: "cashFlow", title: "Cash flow", part: "Weapon", treePart: "Leaves", color: "#64e1f5", icon: Zap },
  { key: "capital", title: "Liquid reserves", part: "Shield", treePart: "Trunk", color: "#69e3b2", icon: Shield },
] as const;
const CHARACTERS = {
  mech: { name: "Sentinel", class: "Mech", subtitle: "Steel resolve. Your four forces, equipped.", image: "/characters/sentinel.png" },
  tree: { name: "Verdant", class: "Tree", subtitle: "Deep roots. Room to grow in every direction.", image: "/characters/verdant.png" },
};
function rawLabel(key: CornerKey, signal: CornerSignal) {
  if (signal.status === "unknown") return "Not entered";
  if (key === "cashFlow") return `${money.format(Number(signal.raw.net))} / mo remaining`;
  if (key === "capital") return signal.raw.runway === "unbounded" ? "No monthly outflow" : `${number.format(Number(signal.raw.months ?? 0))} months of reserves`;
  if (key === "collateral") return `${money.format(Number(signal.raw.equity))} equity`;
  return `${signal.raw.score} credit score`;
}
const percent = (value: number | null) => value === null ? "—" : Math.round(value * 100);
function InputField({ id, label, value, onChange, hint, signed, credit, min, help }: {
  id: string; label: string; value: number | null; onChange: (value: number | null) => void; hint?: string; signed?: boolean; credit?: boolean; min?: number; help?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  useEffect(() => setDraft(value === null ? "" : String(value)), [value]);
  const rangeMax = credit ? 850 : Math.max(Math.abs(value ?? 0), /Income|Payment|Expenses|Cost/.test(id) ? 10000 : /Debt|Value/.test(id) ? 250000 : 120000);
  const rangeMin = credit ? 450 : min ?? (signed ? -rangeMax : 0);
  const bound = (n: number) => Math.max(min ?? (signed ? -Infinity : 0), credit ? Math.min(850, n) : n);
  return <div className="input-control"><div className="input-row"><div className="input-label"><label htmlFor={id}>{label}{hint && <span className="field-hint">{hint}</span>}</label>{help && <FieldHelp label={label} text={help} />}</div><div className="input-value">{!credit && <span>$</span>}{signed && <button type="button" className="input-sign" aria-label={`Change sign of ${label.toLowerCase()}`} onPointerDown={e => e.preventDefault()} onClick={() => {
    if (["", "-", ".", "-."].includes(draft) || Number(draft) === 0) setDraft(draft.startsWith("-") ? "0" : "-");
    else { const next = bound(-Number(draft)); setDraft(String(next)); onChange(next); }
    input.current?.focus({ preventScroll: true });
  }}>±</button>}<Input ref={input} id={id} aria-label={label} aria-describedby={help ? `${id}-explanation` : undefined} type="text" inputMode={credit ? "numeric" : "decimal"} value={draft} placeholder={credit ? "Optional" : "0"} onBlur={() => {
    if (draft === "" || draft === "-" || draft === "." || draft === "-.") { setDraft(credit ? "" : "0"); onChange(credit ? null : 0); }
  }} onChange={e => {
    const raw = e.target.value;
    if (!(signed ? /^-?\d*(\.\d*)?$/ : credit ? /^\d*$/ : /^\d*(\.\d*)?$/).test(raw)) return;
    setDraft(raw);
    if (raw === "") { if (credit) onChange(null); return; }
    if (raw === "-" || raw === "." || raw === "-.") return;
    const next = Number(raw);
    if (Number.isFinite(next)) { const bounded = bound(next); if (bounded !== next) setDraft(String(bounded)); onChange(bounded); }
  }} /></div></div>{help && <span id={`${id}-explanation`} className="sr-only">{help}</span>}<Slider className="finance-slider" min={rangeMin} max={rangeMax} step={credit ? 1 : 50} value={[Math.max(rangeMin, value ?? (credit ? 650 : 0))]} onValueChange={([v]) => { const next = bound(v); setDraft(String(next)); onChange(next); }} aria-label={`Adjust ${label.toLowerCase()}`} /></div>;
}

export function VisionWorkspace() {
  const [current, setCurrent] = useState<CurrentInputs>({ ...DEFAULT_CURRENT });
  const [scenario, setScenario] = useState<ScenarioInputs>({ ...DEFAULT_SCENARIO });
  const [avatar, setAvatar] = useState<AvatarKind>("mech");
  const [snapshot, setSnapshot] = useState<"current" | "scenario">("current");
  const [view, setView] = useState<"art" | "live">("live");
  const [spin, setSpin] = useState(true);
  const [cameraView, setCameraView] = useState<"full" | "detail">("full");
  const [action, setAction] = useState<"idle" | "fire" | "shield">("idle");
  const [tint, setTint] = useState("#6ee6d0");
  const [sectorOpen, setSectorOpen] = useState(false);
  const [selectedCorner, setSelectedCorner] = useState<CornerKey>("cashFlow");
  const [arenaOpen, setArenaOpen] = useState(false);
  const [concept, setConcept] = useState<"canopy" | null>(null);
  const [edited, setEdited] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => { try { const saved = localStorage.getItem("vision-avatar"); if (saved === "mech" || saved === "tree") setAvatar(saved); } catch {} }, []);
  const chooseAvatar = (next: AvatarKind) => { setAvatar(next); try { localStorage.setItem("vision-avatar", next); } catch {} };
  const { comparison, pending, error, ready, hasResult, retry } = useCalculator(current, scenario);
  const active = comparison[snapshot];
  const strengths = useMemo(() => Object.fromEntries(CORNERS.map(c => [c.key, active.corners[c.key].strength])) as CornerStrengths, [active]);
  const character = CHARACTERS[avatar];
  const selected = CORNERS.find(c => c.key === selectedCorner)!;
  useEffect(() => { if (action === "idle") return; const t = setTimeout(() => setAction("idle"), 1800); return () => clearTimeout(t); }, [action]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setAnnouncement(`${character.name}, ${snapshot} picture. ${CORNERS.map(c => `${c.title}: ${rawLabel(c.key, active.corners[c.key])}, attribute ${percent(active.corners[c.key].strength)} out of 100`).join(". ")}`), 600);
    return () => clearTimeout(timer);
  }, [active, character.name, snapshot, ready]);
  const updateCurrent = (key: keyof CurrentInputs, value: number | null) => { setEdited(true); setCurrent(p => ({ ...p, [key]: value ?? (key === "creditScore" ? null : 0) })); };
  const updateScenario = (key: keyof ScenarioInputs, value: number | null) => setScenario(p => ({ ...p, [key]: value ?? 0 }));
  const reset = () => { setCurrent({ ...DEFAULT_CURRENT }); setScenario({ ...DEFAULT_SCENARIO }); setEdited(false); };

  return <main className={`vision-shell theme-${avatar}`}>
    <a href="#hangar" className="skip-link">Skip to avatar setup</a>
    <header className="topbar"><a href="#" className="brand" aria-label="Vi$ion home">VI<span>$</span>ION<span className="brand-cross" aria-hidden="true">✦</span></a><nav aria-label="Main navigation"><a href="#hangar" className="nav-current">Avatar hangar</a><a href="#arcade">The arcade</a><a href="#engine">The engine</a></nav><span className="prototype-label">AVATAR LAB <span>03</span></span></header>
    <section className="intro" id="hangar"><div><p className="eyebrow"><span className="tiny-line" /> VI$ION / AVATAR LAB</p><h1>Your next form<span>.</span></h1><p>Build it. Find your balance. Take it into the world.</p></div><a className="arcade-link" href="#arcade"><Gamepad2 aria-hidden="true" /><span>Same avatar. Same four forces.<br /><strong>A whole new way to play.</strong></span><ArrowDown aria-hidden="true" /></a></section>
    <div className={`calculator-status ${error ? "has-error" : ""}`} role="status" aria-live="polite">{error ? <><span>{error}{hasResult ? " Showing the last calculated picture." : " Your entries are still here."}</span><Button variant="outline" size="sm" onClick={retry}>Try again</Button></> : pending ? <span>{hasResult ? "Updating your four forces… Showing the last calculated picture." : "Connecting your four forces…"}</span> : <span><Check size={14} aria-hidden="true" /> Your loadout is up to date.</span>}</div>
    <div className="hangar-grid" aria-busy={pending}>
      <aside className="setup-panel" id="picture">
        <div className="section-heading"><span className="step-number">01</span><h2>Choose your form</h2></div>
        <div className="character-picker" aria-label="Choose your avatar">{(["mech", "tree"] as const).map(kind => <button key={kind} type="button" aria-pressed={avatar === kind} onClick={() => chooseAvatar(kind)} className={avatar === kind ? "chosen" : ""}><img src={CHARACTERS[kind].image} alt="" width="1024" height="1536" /><span>{CHARACTERS[kind].class}</span>{avatar === kind && <Check size={14} aria-hidden="true" />}</button>)}</div>
        <div className="section-heading input-heading"><span className="step-number">02</span><h2>Power your avatar</h2><Button onClick={reset} variant="ghost" size="icon-sm" aria-label="Reset example values" title="Reset example values"><RotateCcw size={15} /></Button></div>
        <Tabs value={snapshot} onValueChange={v => setSnapshot(v as "current" | "scenario")} className="input-tabs"><TabsList className="mode-tabs"><TabsTrigger value="current">My picture</TabsTrigger><TabsTrigger value="scenario">What if?</TabsTrigger></TabsList>
          <TabsContent value="current" className="input-fields"><p className="data-label">{edited ? "Your entries · this session" : "Example data · make it yours"}</p>
            <InputField id="monthlyIncome" label="Take-home income" hint="per month" value={current.monthlyIncome} onChange={v => updateCurrent("monthlyIncome", v)} />
            <InputField id="monthlyDebtPayments" label="Debt payments" hint="per month" value={current.monthlyDebtPayments} onChange={v => updateCurrent("monthlyDebtPayments", v)} />
            <InputField id="monthlyLivingExpenses" label="Living expenses" hint="per month" value={current.monthlyLivingExpenses} onChange={v => updateCurrent("monthlyLivingExpenses", v)} />
            <InputField id="liquidReserves" label="Liquid reserves" signed min={-1000} value={current.liquidReserves} onChange={v => updateCurrent("liquidReserves", v)} />
            <InputField id="totalDebt" label="Total debt" help="add the total amount of debt" value={current.totalDebt} onChange={v => updateCurrent("totalDebt", v)} />
            <InputField id="assetValue" label="Asset resale value" help="the value of your material items" value={current.assetValue} onChange={v => updateCurrent("assetValue", v)} />
            <InputField id="creditScore" label="Credit score" value={current.creditScore} credit onChange={v => updateCurrent("creditScore", v)} />
          </TabsContent>
          <TabsContent value="scenario" className="input-fields"><p className="data-label">A possible change to your picture</p>
            <InputField id="upfrontCash" label="Cash used upfront" value={scenario.upfrontCash} onChange={v => updateScenario("upfrontCash", v)} />
            <InputField id="newMonthlyPayment" label="Added monthly cost" value={scenario.newMonthlyPayment} onChange={v => updateScenario("newMonthlyPayment", v)} />
            <InputField id="newDebt" label="Added debt" value={scenario.newDebt} onChange={v => updateScenario("newDebt", v)} />
            <InputField id="acquiredAssetValue" label="Added asset value" value={scenario.acquiredAssetValue} onChange={v => updateScenario("acquiredAssetValue", v)} />
            <InputField id="monthlyIncomeChange" label="Income change" hint="per month · + or −" value={scenario.monthlyIncomeChange} signed onChange={v => updateScenario("monthlyIncomeChange", v)} />
            <p className="scenario-help">See the tradeoff before you make a move. Credit stays unchanged; Vi$ion doesn’t predict a future score.</p>
          </TabsContent>
        </Tabs><p className="input-footnote">Entries are sent to Vi$ion’s calculator to update your avatar. This app does not save them. Entries reset on refresh. No bank connection.</p>
      </aside>
      <section className="character-stage" id="avatar" aria-label={`${character.name} avatar preview`}>
        <div className="stage-toolbar"><span><span className="status-pip" />{!ready ? "AWAITING CALCULATION" : snapshot === "current" ? "CURRENT LOADOUT" : "WHAT-IF LOADOUT"}</span><div className="view-switch" aria-label="Avatar display"><button aria-pressed={view === "live"} onClick={() => setView("live")}>Live avatar</button><button aria-pressed={view === "art"} onClick={() => setView("art")}>Concept</button></div></div>
        <div className="avatar-display"><div className="orbit orbit-one" aria-hidden="true" /><div className="orbit orbit-two" aria-hidden="true" /><span className="stage-coordinate coord-left" aria-hidden="true">V / 001<br />FOUR CORNERS</span><span className="stage-coordinate coord-right" aria-hidden="true">{avatar === "mech" ? "M-01" : "T-02"}<br />{character.class.toUpperCase()}</span>
          {view === "art" ? <div className="character-art"><img key={avatar} className="main-character" src={character.image} alt={`${character.name}: ${avatar === "mech" ? "an armored mech with a head antenna, amber battery, energy weapon and shield" : "a healthy tree guardian with a high canopy, lush leaves, thick trunk and branching roots"}`} width="1024" height="1536" fetchPriority="high" /><div className="art-caption">CHARACTER CONCEPT</div></div> : <div className="live-model"><AvatarStage avatar={avatar} strengths={strengths} selected={selectedCorner} action={action} spin={spin} cameraView={cameraView} tint={tint} paused={sectorOpen || arenaOpen || concept !== null} /></div>}
          <div className="stage-platform" aria-hidden="true" /><div className="live-attribute" style={{ "--corner": selected.color } as CSSProperties}><selected.icon size={17} /><span>{avatar === "mech" ? selected.part : selected.treePart}</span><strong>{percent(strengths[selected.key])}<small>/100</small></strong></div>
        </div>
        <div className="model-controls"><button aria-pressed={spin} onClick={() => { setView("live"); setSpin(v => !v); }} title="Toggle turntable"><Orbit size={16} />Rotate</button><button aria-pressed={cameraView === "detail"} onClick={() => { setView("live"); setCameraView(v => v === "full" ? "detail" : "full"); }}><Expand size={16} />Inspect</button><button onClick={() => { setView("live"); setAction("fire"); }}><Zap size={16} />Pulse</button><button onClick={() => { setView("live"); setAction("shield"); }}><Shield size={16} />Shield</button></div>
        <div className="character-title"><p>{character.class.toUpperCase()} / AVATAR {avatar === "mech" ? "01" : "02"}</p><h2>{character.name}</h2><span>{character.subtitle}</span></div><div className="stage-actions"><Button className="primary-action" disabled={!ready} onClick={() => setSectorOpen(true)}><Gamepad2 size={20} />Enter Debtbreak<ArrowRight size={18} /></Button><span className="model-help"><span className="keyboard-instructions">Drag to orbit · Scroll or pinch to zoom</span><span className="touch-instructions">Tap Move avatar to rotate or zoom.</span></span></div>
      </section>
      <aside id="forces" className="attributes-panel"><div className="section-heading"><span className="step-number">03</span><h2>Your four forces</h2></div><p className="attribute-intro">Different strengths. One complete avatar.</p>
        <div className="attribute-list">{CORNERS.map(c => { const signal = active.corners[c.key]; const delta = comparison.deltas[c.key]; return <button key={c.key} className={`attribute-card ${selectedCorner === c.key ? "selected" : ""}`} style={{ "--corner": c.color } as CSSProperties} onClick={() => { setSelectedCorner(c.key); setView("live"); }} aria-pressed={selectedCorner === c.key}>
          <div className="attribute-top"><span className="attribute-icon"><c.icon size={19} /></span><div><span>{c.title}</span><h3>{avatar === "mech" ? c.part : c.treePart}</h3></div><strong>{percent(signal.strength)}<small>/100</small></strong></div><div className="attribute-meter" aria-hidden="true"><span style={{ width: `${(signal.strength ?? 0) * 100}%` }} /></div><div className="attribute-reading"><span>{rawLabel(c.key, signal)}</span>{snapshot === "scenario" && <span className="delta">{delta === null ? "—" : `${delta > 0 ? "+" : ""}${Math.round(delta * 100)}`}<small> pts</small></span>}</div>
        </button>; })}</div><div className="force-focus" style={{ "--corner": selected.color } as CSSProperties}><selected.icon size={17} /><div><strong>{avatar === "mech" ? selected.part : selected.treePart} selected</strong><p>Move an input slider to watch this force respond.</p></div></div><div className="lighting-picker"><span>Hangar lighting</span><div>{["#6ee6d0", "#84aaff", "#f2b56c"].map((color, i) => <button key={color} aria-label={["Aurora lighting", "Ion lighting", "Solar lighting"][i]} aria-pressed={tint === color} style={{ background: color }} onClick={() => setTint(color)} />)}</div></div><a className="text-link" href="#engine">How the four corners work <ArrowRight size={15} /></a>
      </aside>
    </div>
    <section className="comparison-section" aria-labelledby="comparison-title"><div className="comparison-label"><p className="eyebrow">THE RIPPLE EFFECT</p><h2 id="comparison-title">What changes?</h2><p>Current picture → your what-if.</p></div><div className="comparison-values">{CORNERS.map(c => <div key={c.key} style={{ "--corner": c.color } as CSSProperties}><p>{c.title}</p><strong>{percent(comparison.current.corners[c.key].strength)} <ArrowRight size={17} /> {percent(comparison.scenario.corners[c.key].strength)}</strong><span>{rawLabel(c.key, comparison.scenario.corners[c.key])}</span></div>)}</div></section>
    <section id="arcade" className="arcade-section"><div className="arcade-heading"><div><p className="eyebrow">NEXT STOP / THE ARCADE</p><h2>One avatar. New worlds.</h2><p>Take your four forces out for a spin.</p></div><span className="outline-label">2 PLAYABLE EXPERIENCES · 1 CONCEPT</span></div><div className="game-grid">
      <article className="game-card range-card"><div className="game-visual"><div className="range-grid" /><Crosshair className="range-reticle" strokeWidth={0.8} /><img src={character.image} alt="" width="1024" height="1536" loading="lazy" /><span className="game-status available">PLAYABLE DEMO</span></div><div className="game-info"><p>QUICK PLAY / 45 SECONDS</p><h3>Pulse Range</h3><span>Move. Aim. Fire. Feel your loadout respond in a no-fail training arena.</span><Button className="game-play" disabled={!ready} onClick={() => setArenaOpen(true)}>Launch training <ArrowRight size={17} /></Button></div></article>
      <article className="game-card debt-card"><div className="game-visual"><img src={CHARACTERS.mech.image} alt="" width="1024" height="1536" loading="lazy" /><span className="game-status available">PLAYABLE 3D PROTOTYPE</span><span className="game-word" aria-hidden="true">BREAK<br />THROUGH.</span></div><div className="game-info"><p>ARENA ACTION / THREE WAVES</p><h3>Debtbreak</h3><span>Pilot your avatar through drone waves, use your shield and dash, then face the Core.</span><Button className="game-play" disabled={!ready} onClick={() => setSectorOpen(true)}>Enter the sector <ArrowRight size={17} /></Button></div></article>
      <article className="game-card canopy-card"><div className="game-visual"><img src={CHARACTERS.tree.image} alt="" width="1024" height="1536" loading="lazy" /><span className="game-status">GAME CONCEPT</span><span className="game-word" aria-hidden="true">ROOM<br />TO GROW.</span></div><div className="game-info"><p>WORLD BUILDING / FUTURE WORLD</p><h3>Canopy</h3><span>Build a living world around your avatar. Small actions create room to grow.</span><Button variant="ghost" className="concept-button" onClick={() => setConcept("canopy")}>Explore the concept <ArrowRight size={17} /></Button></div></article>
    </div></section>
    <section id="engine" className="engine-section"><div><p className="eyebrow">THE VI$ION ENGINE</p><h2>A complicated life.<br /><span>Four simple forces.</span></h2><p>Cash flow, capital, collateral and credit turn a financial picture into an avatar. See what changes. Keep the decision yours.</p></div><div className="engine-details"><details><summary>Understand your four forces <span>+</span></summary><div className="math-copy"><p><strong>Cash flow:</strong> the breathing room in your monthly income and spending.</p><p><strong>Capital:</strong> the liquid reserves available to meet expenses.</p><p><strong>Collateral:</strong> your equity position across assets and debt.</p><p><strong>Credit:</strong> borrowing access represented by the score you enter. A blank score stays unknown.</p><p>The attributes use a 0–100 display scale. Negative dollar values stay visible. There is no combined financial grade or recommended decision.</p></div></details><details><summary>How does this become a game? <span>+</span></summary><div className="math-copy"><p>Your four forces become a game loadout. In Debtbreak and Pulse Range, cash flow changes firing speed, equity changes stored energy, reserves change shield reach, and credit changes signal reach.</p><p>Every starting point is playable. The game cannot spend money, pay debt, or change your actual financial picture.</p><p>Sentinel and Verdant are original articulated 3D characters. The same model responds to inputs in the hangar and moves, fires and shields inside Debtbreak. Concept illustrations remain available as a separate view.</p></div></details></div></section>
    <nav className="mobile-dock" aria-label="Quick navigation"><a href="#avatar"><Orbit size={20} aria-hidden="true" /><span>Avatar</span></a><a href="#picture"><SlidersHorizontal size={20} aria-hidden="true" /><span>Inputs</span></a><a href="#forces"><Shield size={20} aria-hidden="true" /><span>Forces</span></a><a href="#arcade"><Gamepad2 size={20} aria-hidden="true" /><span>Play</span></a></nav>
    <footer><a className="brand" href="#">VI<span>$</span>ION</a><p>Financial awareness. Built for play.</p><span>PROTOTYPE / MANUAL INPUTS</span></footer><div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    <Dialog open={sectorOpen} onOpenChange={setSectorOpen}><DialogContent className="sector-dialog"><DialogHeader className="sr-only"><DialogTitle>Debtbreak — Sector 01</DialogTitle><DialogDescription>Three waves, one avatar. Move with WASD or arrow keys, hold Space to fire, E for shield, Shift to dash. The sector uses your selected four-corner loadout.</DialogDescription></DialogHeader>{sectorOpen && <DebtbreakArena avatar={avatar} strengths={strengths} picture={snapshot} onExit={() => setSectorOpen(false)} />}</DialogContent></Dialog>
    <Dialog open={arenaOpen} onOpenChange={setArenaOpen}><DialogContent className="arena-dialog"><DialogHeader><DialogTitle>Pulse Range <span className="dialog-tag">TRAINING DEMO</span></DialogTitle><DialogDescription>{character.name} · {snapshot === "current" ? "Current" : "What-if"} loadout. Move, aim and hit the targets. Every loadout is playable.</DialogDescription></DialogHeader>{arenaOpen && <TrainingArena avatar={avatar} strengths={strengths} />}</DialogContent></Dialog>
    <Dialog open={concept !== null} onOpenChange={open => { if (!open) setConcept(null); }}><DialogContent className="concept-dialog"><DialogHeader><DialogTitle>Canopy</DialogTitle><DialogDescription>A future game concept. This world is not playable yet.</DialogDescription></DialogHeader><img src={CHARACTERS.tree.image} alt="" className="concept-image" /><p>A living world that grows alongside your avatar. Roots, canopy, leaves and trunk make the four corners visible. Small, repeatable actions create room to grow, while the tree remains healthy and complete at every starting point.</p><Button disabled={!ready} onClick={() => { setConcept(null); setArenaOpen(true); }}>Try the training demo <ArrowRight size={16} /></Button></DialogContent></Dialog>
  </main>;
}
