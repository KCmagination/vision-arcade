"use client";

import { Canvas } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  Home,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { requestComparison } from "@/lib/calculator-client.js";
import { DEFAULT_SCENARIO } from "@/lib/vision-contract.js";
import { copy, practiceScenario, availableFunds, periodSurplus, startPlan, projection, sequence, totalDebt, requiredPayments, reserveMilestone, interestEstimate, nextPeriod, practiceInputs, PILLAR_NAMES, type Ledger, type Strategy } from "@/lib/debtbreak-finance.js";
import { Button } from "@/components/ui/button";
import { PeriodAllocation } from "./period-allocation";
import {
  RenderBoundary,
  type AvatarKind,
  type CornerStrengths,
} from "./avatar-stage";
import { useRenderProfile } from "@/hooks/use-render-profile";
import {
  createLoadout,
  createSector,
  resumeSector,
  summarizeSector,
  type AttemptSummary,
  PERIOD_SECONDS,
  withinCorner,
  type Sector,
} from "@/lib/arcade-engine.js";

import { SectorWorld, readHud, ARENA_PILLARS, type InputState } from "./debtbreak-world";
import { DebtbreakChallenges } from "./debtbreak-challenges";
import { DebtbreakerTurret } from "./debtbreaker-turret";
import type { Snapshot } from "@/lib/vision-contract.js";
import type { AvatarVisualState } from "./avatar-stage";

const dollars = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
function Milestone({ ledger }: { ledger: Ledger }) {
  const m = reserveMilestone(ledger);
  return <div className="db-milestone"><div><strong>{m.months.toFixed(2)} months of protection</strong><span>{m.next ? `Next: ${m.next} month${m.next === 1 ? '' : 's'} · ${dollars(m.goal!)}` : '12-month milestone reached'}</span></div>
    <progress aria-label="Progress toward next reserve milestone" max={1} value={m.progress} />
    <small>Goals: 1 · 3 · 6 · 9 · 12 months. Based on living expenses + open-account required payments. These are protection goals, not an investing rule.</small></div>;
}
function Accounts({ ledger, strategy, targetId, selected, onSelect }: { ledger: Ledger; strategy: Strategy; targetId?: string | null; selected?: string | null; onSelect?: (id: string) => void }) {
 const order = sequence(ledger, strategy, targetId);
 return <div className="db-accounts">{ledger.debts.map(d => <button type="button" key={d.id} className="db-account" data-priority={order[0]?.id === d.id} data-selected={selected === d.id} disabled={!onSelect || d.balance === 0} onClick={() => onSelect?.(d.id)} aria-label={`Aim at ${d.name}, ${d.apr}% APR`} aria-pressed={onSelect ? selected === d.id : undefined}>
   <span>{d.id} · {d.name}<b>{d.balance === 0 ? 'CLEARED' : order[0]?.id === d.id ? '★ TARGET' : 'NEXT'}</b></span>
   <strong>{dollars(d.balance)}</strong><span><b>{d.apr >= 20 ? '▲▲▲' : '▲'} {d.apr}% APR</b><span>{d.balance > 0 ? `${dollars(d.payment)}/mo · ${d.due}` : "$0 required payment"}</span></span>
 </button>)}</div>;
}
export function DebtbreakClassic({ avatar, strengths, onExit }: { avatar: AvatarKind; strengths: CornerStrengths; ltv: number | null; picture: 'current' | 'scenario'; onExit: () => void }) {
 const { compact, reduced } = useRenderProfile();
 const [start, setStart] = useState(practiceScenario);
 const [savings, setSavings] = useState(40000);
 const [strategy, setStrategy] = useState<Strategy>('snowball');
 const [view, setView] = useState<'plan' | 'play' | 'checkpoint' | 'review'>('plan');
 const [reserveLimit, setReserveLimit] = useState(20000);
 const checkpoint = useRef<Sector | null>(null);
 const checkpointHeading = useRef<HTMLHeadingElement>(null);
 useEffect(() => { if (view === 'checkpoint') checkpointHeading.current?.focus({preventScroll:true}); }, [view]);
 const [practiceStrengths, setPracticeStrengths] = useState(strengths);
 const [loadout, setLoadout] = useState(() => createLoadout(strengths));
 const world = useRef(createSector(loadout));
 const input = useRef<InputState>({keys:new Set(), pointer:new THREE.Vector2(), aiming:false, firing:false, autoFire:false, targetId:null});
 const focus = useRef<HTMLDivElement>(null);
 const audioContext = useRef<AudioContext | null>(null), soundEnabled = useRef(false);
 const loadingRequest = useRef<AbortController | null>(null);
 const [hud, setHud] = useState(() => readHud(world.current));
 const [sound, setSound] = useState(false), [autoFire, setAutoFire] = useState(false), [help, setHelp] = useState(false);
 const [busy, setBusy] = useState(false), [error, setError] = useState('');
 const [selected, setSelected] = useState<string | null>(null);
 const [lastReview, setLastReview] = useState<AttemptSummary | null>(null);
 const available = availableFunds(start), preview = projection(start,savings,strategy);
 const plan = world.current.plan;
 const clear = () => {input.current.keys.clear(); input.current.firing = false;};
 const refocus = () => requestAnimationFrame(() => focus.current?.focus({preventScroll:true}));
 const pause = () => {if(world.current.phase === 'playing') world.current.phase = 'paused'; clear(); setHud(readHud(world.current));};
 useEffect(() => {
  const hidden = () => {if(document.hidden) pause();};
  window.addEventListener('blur',pause); document.addEventListener('visibilitychange',hidden);
  return () => {window.removeEventListener('blur',pause); document.removeEventListener('visibilitychange',hidden); audioContext.current?.close(); loadingRequest.current?.abort();};
 },[]);
 const startCombat = async () => {
   if(busy) return;
   setBusy(true); setError(''); clear();
   const controller = new AbortController(); loadingRequest.current = controller;
   const timeout = window.setTimeout(() => controller.abort(), 10000);
   try {
     const probe = document.createElement('canvas');
     const gl = probe.getContext('webgl2');
     if (!gl) throw new Error('3D combat requires WebGL. This browser cannot create a graphics context. Your plan is unchanged; try a browser with hardware acceleration enabled.');
     gl.getExtension('WEBGL_lose_context')?.loseContext();
     const proposed = startPlan(start,savings,strategy,reserveLimit);
     const response = await requestComparison(practiceInputs(proposed.ledger), DEFAULT_SCENARIO, { signal: controller.signal });
     const c = response.current.corners;
     const nextStrengths: CornerStrengths = { cashFlow:c.cashFlow.strength, capital:c.capital.strength, collateral:c.collateral.strength, credit:c.credit.strength };
     const nextLoadout = createLoadout(nextStrengths);
     setPracticeStrengths(nextStrengths); setLoadout(nextLoadout);
     if (checkpoint.current) world.current = resumeSector(copy(checkpoint.current), nextLoadout, proposed);
     else { world.current = createSector(nextLoadout,proposed); world.current.phase = 'playing'; }
     input.current.autoFire = false; input.current.aiming = false;
     input.current.targetId = proposed.targetId; setSelected(proposed.targetId); setAutoFire(false);
     setHud(readHud(world.current)); setHelp(false); setView('play'); refocus();
   } catch(e) {setError(controller.signal.aborted ? 'The practice loadout took too long. Your plan is still here; try again.' : e instanceof Error ? e.message : 'Could not prepare the practice loadout. Try again.');}
   finally {window.clearTimeout(timeout); loadingRequest.current = null; setBusy(false);}
 };
 const replay = () => {
   if(plan.settled) setLastReview(summarizeSector(world.current));
   setStart(copy(plan.start)); setSavings(plan.savings); setReserveLimit(plan.reserveLimit); setStrategy(plan.strategy); setView('plan'); clear();
 };
 const restartLevel = () => {
   checkpoint.current = null; const fresh=practiceScenario(); setStart(fresh); setSavings(40000); setReserveLimit(20000); setLastReview(world.current.phase==='complete'?summarizeSector(world.current):null); setError(''); setView('plan'); clear();
 };
 const event = (kind: string) => {
   if(kind === 'payday') {
     checkpoint.current = copy(world.current);
     const next = nextPeriod(world.current.plan);
     setStart(next); setSavings(Math.round(availableFunds(next)/2)); setError(''); setView('checkpoint'); clear();
   }
   if(kind === 'victory') {clear(); setHud(readHud(world.current));}
   if(kind === 'complete' || kind === 'gameOver') {setView('review'); clear();}
   if(!soundEnabled.current || !audioContext.current || !['fire','kill','block','complete','assist','reserveStrike'].includes(kind)) return;
   const ac=audioContext.current, osc=ac.createOscillator(), gain=ac.createGain(), time=ac.currentTime;
   osc.type='sine'; osc.frequency.setValueAtTime(kind==='fire'?310:580,time); osc.frequency.exponentialRampToValueAtTime(95,time+.1);
   gain.gain.setValueAtTime(.025,time); gain.gain.exponentialRampToValueAtTime(.001,time+.14);
   osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(time+.15);
 };
 const toggleSound = async () => {try {audioContext.current ??= new AudioContext(); await audioContext.current.resume(); soundEnabled.current=!soundEnabled.current; setSound(soundEnabled.current);} catch {setSound(false);} refocus();};
 const held = (key: string) => ({
   onPointerDown:(e: React.PointerEvent<HTMLButtonElement>) => {e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); input.current.keys.add(key); if(key===' ') input.current.aiming=false;},
   onPointerUp:()=>input.current.keys.delete(key), onPointerCancel:()=>input.current.keys.delete(key), onLostPointerCapture:()=>input.current.keys.delete(key),
 });
 const resumed = () => {if(world.current.phase==='paused') {world.current.phase='playing'; setHelp(false); setHud(readHud(world.current)); refocus();}};
 const setAllocation = (amount: number) => setSavings(Math.min(available,Math.max(0,Math.round(Number.isFinite(amount)?amount:0))));
 const activeAssist = world.current.assist;
 const assistCopy = ['The sword intercepts incoming fire inside this corner.','The capital pillar restores health while you stay in its corner.','The chest plate shields this corner for five seconds.','The helm pulses stop nearby enemies and clear incoming fire.'];
 const allowedReserve = Math.min(reserveLimit,start.reserves+savings);
 const controlsLocked = view !== 'play' || hud.phase !== 'playing';
 const allPlans = [...world.current.history, plan];
 const attempt = summarizeSector(world.current);
 const protection = reserveMilestone(plan.ledger);
 const totalGun = attempt.executed;
 const totalRam = attempt.reserveSpent;
 const totalFreed = requiredPayments(allPlans[0].start)-requiredPayments(plan.ledger);
 const reserveControl = <div className="db-reserve-control"><label>Reserve Strike limit this period<input aria-label="Reserve Strike limit" type="number" inputMode="decimal" min={0} max={(start.reserves+savings)/100} step={25} value={allowedReserve/100} onChange={e=>setReserveLimit(Math.max(0,Math.round((Number(e.target.value)||0)*100)))}/></label><p>Up to {dollars(allowedReserve)} of savings can fund ramming. Each hit spends up to $100. At least <strong>{dollars(start.reserves+savings-allowedReserve)}</strong> stays protected from strikes. Set $0 to disable.</p></div>;
 const quickAllocation = <section className="db-checkpoint" role="dialog" aria-modal="true" aria-label="Payday allocation" onKeyDown={e=>e.stopPropagation()}>
   <span className="eyebrow">PAYDAY · PERIOD {start.period}</span><h3 ref={checkpointHeading} tabIndex={-1}>Reload. Resume the same battle.</h3>
   <p>{dollars(totalDebt(start))} in debt remains. Combat health and enemy positions carry forward.</p>
   {plan.event && <p className="db-event"><strong>$600 essential repair:</strong> reserves covered {dollars(plan.event.covered)}. {plan.event.shortfall ? `${dollars(plan.event.shortfall)} is due this payday.` : 'Protection worked.'}</p>}
   <div className="db-payday-funds"><span>Available after bills <strong>{dollars(available)}</strong></span><span>Current reserves <strong>{dollars(start.reserves)}</strong></span></div>
   <div className="db-allocation"><label>Add to reserves<input aria-label="Add to reserves" type="number" min={0} max={available/100} step={25} value={savings/100} onChange={e=>setAllocation(Number(e.target.value)*100)}/></label><label>Cash-flow ammunition<input aria-label="Extra debt payments" type="number" min={0} max={available/100} step={25} value={(available-savings)/100} onChange={e=>setAllocation(available-Number(e.target.value)*100)}/></label></div>
   <Slider aria-label="Allocate savings" min={0} max={available||1} step={100} value={[savings]} onValueChange={v=>setAllocation(v[0]??0)} disabled={!available}/>
   <div className="db-strategies"><Button aria-pressed={strategy==='snowball'} onClick={()=>setStrategy('snowball')}>Snowball<small>Smallest balance first</small></Button><Button aria-pressed={strategy==='avalanche'} onClick={()=>setStrategy('avalanche')}>Avalanche<small>Highest APR first</small></Button></div>
   {reserveControl}
   <p className="db-quick-prediction">If your shots land: debt {dollars(totalDebt(preview.ledger))} · reserves before strikes {dollars(start.reserves+savings)}{preview.freed>0?` · ${dollars(preview.freed)}/mo freed`:''}.</p>
   <details className="db-assumptions"><summary>Period accounting</summary><p>Income {dollars(start.income)} − living costs {dollars(start.living)} − required payments {dollars(start.minimums)} − repair due {dollars(start.repairDue)} + unused funds {dollars(start.carry)} = {dollars(available)} available.</p><p>Last period: ammunition repayments {dollars(plan.executed)}; reserve strikes {dollars(plan.reserveSpent)}. Interest posted this payday: {dollars(start.interestPosted)}.</p></details>
   {error && <p className="db-error" role="alert">{error}</p>}
   <Button className="primary-action" disabled={busy} onClick={startCombat}><Play size={18}/>{busy?'Preparing…':'Resume battle'}</Button>
 </section>;
 return <div className="sector-shell debtbreak-shell" data-combat={view==='play'||view==='checkpoint'}>
  <header className="sector-header"><div><span className="eyebrow">VI$ION / LEVEL 1 PRACTICE</span><h2>DEBTBREAK <span>LEVEL 1 · PERIOD {view==='plan'||view==='checkpoint'?start.period:plan.start.period} · ONE MONTH</span></h2></div>
    <div className="sector-header-actions"><Button variant="ghost" onClick={()=>{if(view==='play')pause();setHelp(v=>!v);}}>Controls</Button><Button variant="ghost" aria-label={sound?'Mute sound':'Enable sound'} onClick={toggleSound}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</Button><Button variant="ghost" onClick={onExit}><Home size={17}/>Hangar</Button></div>
  </header>
  <div className="db-flow" aria-label="Financial decision loop"><span data-active={view==='plan'||view==='checkpoint'}>Read</span><span>→</span><span data-active={view==='plan'||view==='checkpoint'}>Allocate</span><span>→</span><span data-active={view==='plan'||view==='checkpoint'}>Predict</span><span>→</span><span data-active={view==='play'}>Play</span><span>→</span><span data-active={view==='review'}>Review</span><b>FICTIONAL FINANCES</b></div>
  {view==='plan' && <div className="db-board">
    <div className="db-heading"><span className="eyebrow">YOUR MISSION / READ. DECIDE. EXECUTE.</span><h3>Break the debt.<br/><em>Keep your protection in view.</em></h3><p>Clear both debts to finish the level. Your decisions determine the debt you remove, the interest you carry, and the savings left to protect you.</p></div>
    <div className="db-mission-steps"><div><b>01 / PLAN</b><span>Split this payday between reserves and debt ammunition.</span></div><div><b>02 / PLAY</b><span>Move, aim at the ★ strategy target, and land your repayments.</span></div><div><b>03 / READ AGAIN</b><span>Every 30 seconds: a new payday. Both debts cleared: level complete.</span></div></div>
    <div className="db-ledger-strip"><div><span>Take-home income</span><strong>{dollars(start.income)}</strong></div><div><span>Other living expenses</span><strong>−{dollars(start.living)}</strong></div><div><span>Required debt payments</span><strong>−{dollars(start.minimums)}</strong></div><div><span>Current-period surplus</span><strong>{dollars(periodSurplus(start))}</strong></div></div>
    {start.repairDue>0 && <p className="db-callout">Repair shortfall payment: {dollars(start.repairDue)} is also deducted from this period’s income under the disclosed interest-free practice arrangement.</p>}
    {start.carry>0 && <p className="db-callout">Unused funds carried in: <strong>{dollars(start.carry)}</strong>. Total available to allocate: <strong>{dollars(available)}</strong>.</p>}
    <p className="db-note">Balances below are after this period’s minimum payments. {start.period > 1 ? `Interest posted once this period: ${dollars(start.interestPosted)}.` : "Starting example: current minimums already paid."}</p>
    {start.period===1 && <p className="db-callout">At the end of period 1: a $600 essential repair. Reserves cover it first; any shortfall is due next period under an explicit interest-free practice arrangement.</p>}
    <PeriodAllocation ledger={start} savings={savings}/>
    <div className="db-plan-grid"><section className="db-panel"><h4>Allocate <span>{dollars(available)} available</span></h4>
      <div className="db-allocation"><label>Add to reserves<input aria-label="Add to reserves" inputMode="decimal" type="number" min={0} max={available/100} step="0.01" value={savings/100} onChange={e=>setAllocation(Number(e.target.value)*100)}/></label><label>Extra debt payments<input aria-label="Extra debt payments" inputMode="decimal" type="number" min={0} max={available/100} step="0.01" value={(available-savings)/100} onChange={e=>setAllocation(available-Number(e.target.value)*100)}/></label></div>
      <Slider aria-label="Savings allocation" min={0} max={available||1} step={1} value={[savings]} onValueChange={v=>setAllocation(v[0])} disabled={!available}/>
      <div className="db-split-label"><span>More repayment</span><span>More protection</span></div>
      <p>Current emergency reserves <strong>{dollars(start.reserves)}</strong> → projected <strong>{dollars(start.reserves+savings)}</strong></p>
      <div className="db-strategies" role="group" aria-label="Repayment strategy"><Button aria-pressed={strategy==='snowball'} onClick={()=>setStrategy('snowball')}>Snowball<small>Smallest balance first</small></Button><Button aria-pressed={strategy==='avalanche'} onClick={()=>setStrategy('avalanche')}>Avalanche<small>Highest APR first</small></Button></div>
      <p className="db-first-target">First target: <strong>{sequence(start,strategy)[0]?.name ?? 'All accounts cleared'}</strong> · {strategy==='snowball'?'smallest remaining balance':'highest interest rate'}. Keep paying the other account’s minimum.</p>
      <p className="db-note">Choose either strategy with any repayment budget. Payday arrives after 30 seconds of combat. Empty ammunition does not end the battle. Each $100 repaid on target charges a corner. Enter a lit quarter-circle for five seconds of support.</p>
    </section><section className="db-panel"><h4>Predict <span>After successful execution</span></h4>
      <Accounts ledger={start} strategy={strategy}/>
      <dl className="db-facts"><div><dt>Projected balances</dt><dd>{preview.ledger.debts.map(d=>`${d.name} ${dollars(d.balance)}`).join(' · ')}</dd></div><div><dt>Next-period interest estimate</dt><dd>{dollars(preview.interest)} <small>({dollars(preview.interestSaved)} less)</small></dd></div><div><dt>Monthly payments freed</dt><dd>{dollars(preview.freed)}</dd></div><div><dt>Next-period surplus before events</dt><dd>{dollars(preview.nextSurplus)}</dd></div></dl>
      <p className="db-cause">{preview.freed>0?`Clearing an account releases ${dollars(preview.freed)} for future choices.`:strategy==='avalanche'?'Paying the higher rate first reduces the next interest charge, even when an account stays open.':'Partial repayments still reduce the debt. A payment is released only when its account is cleared.'}</p>
      {preview.unused>0 && <p>{dollars(preview.unused)} exceeds the remaining debts and will carry forward.</p>}
    </section></div>
    <p className="db-note">Projected protection from the cash allocation, before reserve strikes or repairs:</p><Milestone ledger={preview.ledger}/>
    {reserveControl}
    <details className="db-assumptions"><summary>Practice terms, events and financial health</summary><p>Financial health means sustainable obligations, protection against disruption, and room to choose—not four equally high scores. Progress and strategy execution matter; income is not a score.</p><p>These fictional account balances are shown after this period’s required payments. Rates and fixed monthly payments are simplified. Interest is estimated as remaining balance × APR ÷ 12, rounded to cents per account, then posted once when advancing to the next monthly period, before its minimum payments. No fees or new borrowing are modeled.</p><p>Period 1 ends with a $600 essential repair. Reserves cover it first. If insufficient, this practice scenario explicitly allows the remaining repair bill to be paid next period, without interest. No other repairs occur in this scenario. This is a provided scenario term, not a promise that a creditor will agree.</p><p>Practice asset value: $10,000; practice credit score: 680, held constant. Equity is separate from accessible reserves. Credit reflects borrowing and repayment history. Read terms and communicate early: “My situation changed. Here is what I can pay. What assistance or clarification is available?” Communication does not guarantee approval or a score increase.</p></details>
    {lastReview && <div className="db-callout">Previous completed attempt: {lastReview.periods} periods · {dollars(lastReview.interest)} interest charged · {dollars(lastReview.reserves)} reserves · {dollars(lastReview.unallocated)} unallocated cash. This replay restores the start of period {start.period}.</div>}
    {error && <p role="alert" className="db-error">{error}</p>}
    <div className="db-launch-brief"><span><kbd>WASD</kbd> / arrows to move</span><span><kbd>Space</kbd> fires at the selected account</span><span><kbd>E</kbd> shield · <kbd>Shift</kbd> dash</span><span>Touch controls are on the battlefield.</span></div>
    <div className="db-actions"><Button className="primary-action" disabled={busy} onClick={startCombat}><Play size={18}/>{busy?'Preparing your practice loadout…':'Execute this plan'}</Button><span>Landed shots spend debt ammunition. Reserve strikes spend savings. Empty ammunition means defend until payday.</span></div>
  </div>}
  {(view==='play'||view==='checkpoint') && <>
   <div className="db-combat-ledger"><span>Cash-flow ammunition <strong>{dollars(plan.remaining)} / {dollars(plan.budget)}</strong></span><span>Emergency reserves <strong>{dollars(plan.ledger.reserves)}</strong></span><span>Reserve strikes <strong>{dollars(Math.min(plan.reserveRemaining,plan.ledger.reserves))} available</strong></span></div>
   <Accounts ledger={plan.ledger} strategy={plan.strategy} targetId={plan.targetId} selected={selected} onSelect={controlsLocked?undefined:id=>{setSelected(id);input.current.targetId=id;input.current.aiming=false;refocus();}}/>
   <div className="sector-play-area" data-hit={hud.hit} ref={focus} tabIndex={0} role="application" aria-label="Debtbreak battlefield. Move with arrows or WASD, aim with mouse, hold Space to fire, E shield, Shift dash, R reserve strike, P pause."
     onBlur={clear} onKeyDown={e=>{const key=e.key.toLowerCase();if((e.target as HTMLElement).closest('input,button,select,textarea'))return;if(['w','a','s','d','r','arrowleft','arrowright','arrowup','arrowdown',' ','e','shift'].includes(key)){e.preventDefault();input.current.keys.add(key);if(key===' ')input.current.aiming=false;}if(key==='p'&&!e.repeat){e.preventDefault();world.current.phase==='playing'?pause():resumed();}}} onKeyUp={e=>input.current.keys.delete(e.key.toLowerCase())}
     onPointerMove={e=>{if(e.pointerType!=='mouse')return;const r=e.currentTarget.getBoundingClientRect();input.current.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);input.current.aiming=true;}}
     onPointerDown={e=>{if(world.current.phase!=='playing'||(e.target as HTMLElement).closest('button'))return;e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);input.current.firing=true;}} onPointerUp={()=>{input.current.firing=false;}} onPointerCancel={()=>{input.current.firing=false;}} onLostPointerCapture={()=>{input.current.firing=false;}}>
    <RenderBoundary fallback={<div className="sector-error"><h3>The 3D arena could not load.</h3><Button onClick={onExit}>Return to hangar</Button></div>}><Canvas shadows={!compact} dpr={compact?1:[1,1.4]} frameloop={hud.phase==='playing'||hud.phase==='victory'?'always':'demand'} camera={{position:[13,16,18],fov:43,near:.1,far:150}} gl={{antialias:true,powerPreference:'high-performance'}}><Suspense fallback={null}><SectorWorld avatar={avatar} strengths={practiceStrengths} world={world} input={input} loadout={loadout} compact={compact} reduced={reduced} onHud={setHud} onEvent={event}/></Suspense></Canvas></RenderBoundary>
    <div className="db-arena-status"><span>Next payday: {Math.max(0,PERIOD_SECONDS-hud.time)}s · {plan.strategy}</span><span>Combat health <b>{Math.round(hud.health)} / 100</b></span></div>

    {view==='checkpoint' && quickAllocation}
    {hud.phase==='victory' && <div className="db-level-victory" role="status"><span>LEVEL 1 CLEAR</span><h3>Both debts defeated.</h3><p>{dollars(totalFreed)} in monthly payments freed.</p></div>}
    {hud.phase==='paused' && <div className="sector-intro"><h3>Period paused</h3><p>Your accounts and repayment budget are unchanged.</p><Button className="primary-action" onClick={resumed}><Play size={18}/>Resume combat</Button><Button variant="ghost" onClick={replay}>Replan from the same start</Button></div>}
   </div>
   <div className="db-arena-message" aria-live="polite">{world.current.noticeTime>0&&<span>{world.current.notice}</span>}{activeAssist?<><strong>{PILLAR_NAMES[activeAssist.pillar]} · {Math.ceil(activeAssist.remaining)}s · {ARENA_PILLARS[activeAssist.pillar].location}</strong><span>{withinCorner(world.current.x,world.current.z,activeAssist.pillar)?assistCopy[activeAssist.pillar]:'Support stays in the corner. Its timer continues while you are outside.'}</span></>:world.current.noticeTime>0?null:world.current.assistQueue.length?'CORNER READY · Enter a glowing quarter-circle for five seconds of support.':plan.remaining===0?'AMMO EMPTY · Shield, dodge, or use an available reserve strike until payday.':'Repay on the ★ target to charge corner refuges. Smaller enemies move faster.'}</div>
   <div className="db-pillar-status" aria-label="Pillar assistance">{ARENA_PILLARS.map((p,i)=><span key={p.name} data-active={activeAssist?.pillar===i} data-ready={world.current.assistQueue.includes(i)} style={{borderColor:activeAssist?.pillar===i||world.current.assistQueue.includes(i)?p.color:undefined}}>{p.arrow} {PILLAR_NAMES[i].split(" / ")[0]} <b>{activeAssist?.pillar===i?`${Math.ceil(activeAssist.remaining)}s · ${p.location}`:world.current.assistQueue.includes(i)?world.current.assistVisit===i?'STEP OUT TO REARM':`READY · ${p.location}`:world.current.assistsEarned>=4?'CHARGES AT PAYDAY':plan.ledger.assistIndex%4===i?`$${Math.round(plan.ledger.assistProgress/100)} / $100`:'STANDBY'}</b></span>)}</div>
   <div className="sector-bottom" inert={controlsLocked}><div className="energy-hud"><span>COMBAT ENERGY <strong>{Math.floor(hud.energy)} / {loadout.energyMax}</strong></span><div><i style={{width:`${hud.energy/loadout.energyMax*100}%`}}/></div><small>{(loadout.fireRate*(world.current.bonusTime>0?world.current.bonusMultiplier:1)).toFixed(1)} shots/sec{world.current.bonusTime>0?(plan.remaining>0?' · bonus active':' · bonus saved for payday'):''}</small></div>
    <div className="sector-touch"><div className="dpad"><Button variant="ghost" {...held('w')} aria-label="Move forward"><ArrowUp size={17}/></Button><Button variant="ghost" {...held('a')} aria-label="Move left"><ArrowLeft size={17}/></Button><Button variant="ghost" {...held('s')} aria-label="Move backward"><ArrowDown size={17}/></Button><Button variant="ghost" {...held('d')} aria-label="Move right"><ArrowRight size={17}/></Button></div><Button variant="ghost" {...held(' ')}><Crosshair size={17}/>Fire</Button><Button variant="ghost" {...held('e')}><Shield size={17}/>Shield</Button><Button variant="ghost" {...held('shift')}><Zap size={17}/>Dash</Button><Button variant="ghost" className="db-ram-button" {...held('r')} disabled={plan.reserveRemaining<=0||plan.ledger.reserves<=0||world.current.ramCooldown>0}><Shield size={17}/>{world.current.ramCooldown>0?`${Math.ceil(world.current.ramCooldown)}s`:'Reserve strike'}</Button></div>
    <div className="sector-options"><Button variant="ghost" aria-pressed={autoFire} onClick={()=>{input.current.autoFire=!autoFire;setAutoFire(!autoFire);input.current.aiming=false;refocus();}}>Auto-fire {autoFire?'on':'off'}</Button><Button variant="ghost" aria-label={hud.phase==='playing'?'Pause mission':'Resume mission'} onClick={()=>hud.phase==='playing'?pause():resumed()}>{hud.phase==='playing'?<Pause size={17}/>:<Play size={17}/>}</Button><Button variant="ghost" aria-label="Replan round" onClick={replay}><RotateCcw size={17}/></Button></div>
   </div>
   <div className="db-credit-tip">Credit / helm: read terms before accepting an offer. Communicate early about payment problems; assistance is not guaranteed.</div>
  </>}
  {view==='review' && <div className="db-board">
   <div className="db-heading"><span className="eyebrow">{world.current.phase==='failed'?'GAME OVER':'LEVEL 1 CLEAR'}</span><h3>{world.current.phase==='failed'?'Combat health depleted.':'Both debts defeated.'}</h3><p>{world.current.phase==='failed'?'This attempt is provisional. Retry restores the exact period start, including all account balances and reserves.':'You completed the level. Review the debt you removed and the protection you kept.'}</p></div>
   {world.current.phase==='complete'&&<p className="db-callout">You freed <strong>{dollars(totalFreed)} per month</strong>. Your reserves cover <strong>{protection.months.toFixed(2)} months</strong> of modeled expenses. {protection.next?`Next protection goal: ${protection.next} month${protection.next===1?'':'s'} of reserves (${dollars(protection.goal!)}).`:'You reached the 12-month reserve goal.'}{plan.remaining>0?` Another ${dollars(plan.remaining)} remains unallocated.`:''}</p>}
   <div className="db-plan-grid"><section className="db-panel"><h4>Strategy execution <span>{plan.strategy}</span></h4><dl className="db-facts">
    <div><dt>Cash-flow repayments across the level</dt><dd>{dollars(totalGun)}</dd></div><div><dt>Savings used for reserve strikes</dt><dd>{dollars(totalRam)}</dd></div><div><dt>Unused repayment funds</dt><dd>{dollars(plan.remaining)} · {plan.settled?'carry forward':'restored on retry'}</dd></div><div><dt>Debt remaining</dt><dd>{dollars(totalDebt(plan.ledger))}</dd></div><div><dt>Accounts cleared</dt><dd>{plan.ledger.debts.filter(d=>d.balance===0).map(d=>d.id).join(', ')||'None yet'}</dd></div><div><dt>On-target / other repayments across the level</dt><dd>{dollars(allPlans.reduce((sum,p)=>sum+p.orderedPaid,0))} / {dollars(allPlans.reduce((sum,p)=>sum+p.outOfOrderPaid,0))}</dd></div><div><dt>Strategy bonuses across the level</dt><dd>{allPlans.reduce((sum,p)=>sum+p.bonuses.length,0)} temporary combat bonus{allPlans.reduce((sum,p)=>sum+p.bonuses.length,0)===1?'':'es'}</dd></div><div><dt>Monthly payments freed across the level</dt><dd>{dollars(totalFreed)}</dd></div><div><dt>Interest charged across the level</dt><dd>{dollars(allPlans.reduce((sum,p)=>sum+p.start.interestPosted,0))}</dd></div><div><dt>Next-period interest estimate</dt><dd>{dollars(interestEstimate(plan.ledger))}</dd></div>
   </dl><p className="db-cause">{world.current.phase==='complete'?`Both accounts are cleared. ${dollars(totalFreed)} in monthly payments is available for your next move.`:totalGun+totalRam?'Your successful attacks reduced debt. The remaining accounts carry into the next period.':'Unspent money is still accounted for. Try aiming at the marked target while moving.'}</p></section>
   <section className="db-panel"><h4>Reserves & protection <span>Final period accounting</span></h4><dl className="db-facts"><div><dt>Starting reserves</dt><dd>{dollars(plan.start.reserves)}</dd></div><div><dt>Allocation deposited</dt><dd>+{dollars(plan.savings)}</dd></div><div><dt>Reserves after allocation</dt><dd>{dollars(plan.start.reserves+plan.savings)}</dd></div><div><dt>Reserve strikes this period</dt><dd>−{dollars(plan.reserveSpent)}</dd></div>{plan.event && <><div><dt>{plan.event.name}</dt><dd>{dollars(plan.event.cost)}</dd></div><div><dt>Covered from reserves</dt><dd>−{dollars(plan.event.covered)}</dd></div><div><dt>Repair shortfall</dt><dd>{dollars(plan.event.shortfall)}</dd></div></>}<div><dt>Reserves after event</dt><dd>{dollars(plan.ledger.reserves)}{!plan.settled?' · event not applied':''}</dd></div></dl>
    {plan.event && <p className="db-cause">{plan.event.shortfall?`Reserves covered ${dollars(plan.event.covered)}. The ${dollars(plan.event.shortfall)} shortfall is due next period under this scenario’s explicit interest-free repair arrangement. No credit-score change.`:'Protection worked. Your reserves absorbed the repair. Replenish through a later allocation; the withdrawal was not a mistake.'}</p>}
    <Milestone ledger={plan.ledger}/>
   </section></div>
   <div className="db-combat-result"><strong>Combat performance</strong><span>{Math.round(world.current.health)} / 100 health</span><span>{Math.floor(world.current.totalElapsed)}s played across {plan.ledger.period} periods</span><span>{world.current.shotsFired?Math.round(world.current.shotsHit/world.current.shotsFired*100):0}% accuracy</span><span>{world.current.blocks} blocks</span></div>
   {lastReview&&<div className="db-comparison"><table><caption>Compare complete attempts</caption><thead><tr><th scope="col">Outcome</th><th scope="col">Previous</th><th scope="col">This attempt</th></tr></thead><tbody>{[
    ['Financial periods',String(lastReview.periods),String(attempt.periods)],
    ['Interest charged',dollars(lastReview.interest),dollars(attempt.interest)],
    ['Cash-flow repayments',dollars(lastReview.executed),dollars(attempt.executed)],
    ['Savings used for strikes',dollars(lastReview.reserveSpent),dollars(attempt.reserveSpent)],
    ['Debt remaining',dollars(lastReview.debt),dollars(attempt.debt)],
    ['Reserves remaining',dollars(lastReview.reserves),dollars(attempt.reserves)],
    ['Unallocated cash',dollars(lastReview.unallocated),dollars(attempt.unallocated)],
   ].map(([label,before,after])=><tr key={label}><th scope="row">{label}</th><td>{before}</td><td>{after}</td></tr>)}</tbody></table><p>More financial periods include more paydays. Compare time and interest alongside remaining cash.{world.current.phase==='failed'?' This attempt ended in Game Over; its current-period results are provisional.':''}</p></div>}
   <div className="db-actions">{world.current.phase==='complete' && <Button className="primary-action" onClick={restartLevel}>Play level again</Button>}<Button variant="outline" onClick={replay}><RotateCcw size={17}/>{plan.settled?'Replay final period':'Retry from period start'}</Button><Button variant="ghost" onClick={onExit}>Hangar</Button></div>
   <p className="db-note">Financial health is separate from combat health. Temporary assists never add money, turn equity into cash, or change credit scores.</p>
  </div>}
  {help && <div className="db-help" role="dialog" aria-label="Debtbreak controls"><h3>Execute your plan</h3><p>Move with WASD / arrows. Aim with the mouse and hold to fire, or select an account card and hold Space. On touch, select an account, use the movement pad, and hold Fire. E / Shield blocks; Shift / Dash evades. R / Reserve strike dashes toward your aim and uses up to $100 from the savings allowance on contact. Shield + Dash also activates a strike. P pauses.</p><p>The ★ marks the strategy target. Each $100 repaid on target charges a corner, up to four per period. Enter its glowing quarter-circle to start five seconds of support. The effect stays in that corner; leaving does not pause its timer. Unused charges carry across payday. You must leave a spent corner before using a new charge there. Clearing an account also earns faster fire. Unused bonus time waits for ammunition. Other repayments still count. Enemy size follows remaining balance; smaller enemies pursue slightly faster. APR labels and triangle counts identify rates. There is no merging.</p><p>Hits reduce combat health. Misses use combat energy. Neither changes your reserves. Landed shots spend only the finite repayment budget. Empty ammunition keeps you in combat. Payday every 30 seconds pauses the same battlefield for allocation. Only clearing both debts completes the level. Reserve strikes spend savings dollar for dollar; normal shields do not. Combat health and positions carry across payday.</p><Button onClick={()=>setHelp(false)}>Close controls</Button></div>}
 </div>;
}

export function DebtbreakArena(props: Parameters<typeof DebtbreakClassic>[0] & {hangar:Snapshot;visualState:AvatarVisualState}) {
 const [mode,setMode]=useState<'turret'|'challenges'|'classic'>('turret');
  if(mode==='turret') return <DebtbreakerTurret avatar={props.avatar} strengths={props.strengths} hangar={props.hangar} visualState={props.visualState} onExit={props.onExit} onChallenges={()=>setMode('challenges')} onClassic={()=>setMode('classic')}/>;
 if(mode==='classic') return <div className="db-classic-wrap"><Button className="db-classic-back" onClick={()=>setMode('turret')}>← Debtbreaker</Button><DebtbreakClassic {...props}/></div>;
 return <div className="db-classic-wrap"><Button className="db-classic-back" onClick={()=>setMode('turret')}>← Debtbreaker</Button><DebtbreakChallenges {...props} renderClassic={back => <><Button className="db-classic-back" onClick={back}>← Challenges</Button><DebtbreakClassic {...props}/></>}/></div>;
}
