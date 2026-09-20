"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Home, Pause, Play, RotateCcw, Shield, Sword, HardHat, ScanEye, Layers, Zap, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RenderBoundary, type AvatarKind, type CornerStrengths } from './avatar-stage';
import { useRenderProfile } from '@/hooks/use-render-profile';
import { SectorWorld, readHud, ARENA_PILLARS, type InputState } from './debtbreak-world';
import { createLoadout, createSector, resumeSector, summarizeSector, PERIOD_SECONDS, type Sector } from '@/lib/arcade-engine.js';
import { availableFunds, copy, startPlan, totalDebt, requiredPayments, nextPeriod, practiceInputs, projection, reserveMilestone, type Strategy } from '@/lib/debtbreak-finance.js';
import { CHALLENGES, challengeInfo, challengeScenario, defaultChoices, prepareChallenge, financingOffers, saleQuote, hasEquipment, hasOffers, equipmentOnline, challengeOutcome, type ChallengeId, type Choices, type Outcome } from '@/lib/debtbreak-challenges.js';
import { requestComparison } from '@/lib/calculator-client.js';
import { DEFAULT_SCENARIO } from '@/lib/vision-contract.js';

const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
const ICONS = { sword: Sword, shield: Shield, armor: HardHat, helm: ScanEye, all: Layers };
type Props = { avatar: AvatarKind; strengths: CornerStrengths; onExit: () => void; renderClassic: (back: () => void) => ReactNode };

export function DebtbreakChallenges({ avatar, strengths, onExit, renderClassic }: Props) {
  const [mode, setMode] = useState<ChallengeId | 'classic' | null>(null);
  if (mode === 'classic') return <div className="db-classic-wrap">{renderClassic(() => setMode(null))}</div>;
  if (mode) return <ChallengeMission key={mode} id={mode} avatar={avatar} strengths={strengths} onBack={() => setMode(null)} onExit={onExit}/>;
  return <div className="sector-shell debtbreak-shell db-challenge-hub">
    <header className="sector-header"><div><span className="eyebrow">VI$ION / CHALLENGE SELECT</span><h2>DEBTBREAK</h2></div><Button variant="ghost" onClick={onExit}><Home size={17}/>Hangar</Button></header>
    <div className="db-board">
      <div className="db-heading"><span className="eyebrow">ONE ARENA. DIFFERENT DECISIONS.</span><h3>Choose your challenge.</h3><p>Learn one corner, then put all four to work. Each mission uses fictional finances and three short financial periods.</p></div>
      <div className="db-challenge-grid">{CHALLENGES.map((challenge, index) => {
        const Icon = ICONS[challenge.icon as keyof typeof ICONS];
        return <button key={challenge.id} className="db-challenge-card" style={{ '--corner': challenge.color } as CSSProperties} onClick={() => setMode(challenge.id)}>
          <span className="db-card-top"><Icon size={27}/><span>{index === 4 ? 'COMBINED MISSION' : `0${index + 1} / FOCUSED MISSION`}</span></span>
          <h3>{challenge.name}</h3><strong>{challenge.title}</strong><p>{challenge.lesson}</p><span className="db-card-launch">Choose {challenge.name}<ArrowRight size={18}/></span>
        </button>;
      })}</div>
      <div className="db-classic-option"><div><strong>Classic Debtbreak</strong><p>The original open-ended battle: clear both debts, with reserve strikes and corner assists.</p></div><Button variant="outline" onClick={() => setMode('classic')}>Play Classic</Button></div>
      <p className="db-note">No personal balances are changed. Replaying a mission restores the same starting finances and event schedule.</p>
    </div>
  </div>;
}

function ChallengeMission({ id, avatar, strengths, onBack, onExit }: { id: ChallengeId; avatar: AvatarKind; strengths: CornerStrengths; onBack: () => void; onExit: () => void }) {
  const info = challengeInfo(id)!;
  const { compact, reduced } = useRenderProfile();
  const [start, setStart] = useState(() => challengeScenario(id));
  const [choices, setChoices] = useState<Choices>(() => defaultChoices(challengeScenario(id)));
  const [savings, setSavings] = useState(40000);
  const [strategy, setStrategy] = useState<Strategy>('snowball');
  const [view, setView] = useState<'plan' | 'play' | 'review'>('plan');
  const [kit, setKit] = useState(() => createLoadout(strengths));
  const [appearance, setAppearance] = useState(strengths);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [help, setHelp] = useState(false), [autoFire, setAutoFire] = useState(false);
  const world = useRef(createSector(kit, startPlan(challengeScenario(id), 40000, 'snowball')));
  const [hud, setHud] = useState(() => readHud(world.current));
  const [selected, setSelected] = useState<string | null>(null);
  const checkpoint = useRef<Sector | null>(null);
  const input = useRef<InputState>({ keys: new Set(), pointer: new THREE.Vector2(), aiming: false, firing: false, autoFire: false, targetId: null });
  const focus = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const request = useRef<AbortController | null>(null);
  const [previous, setPrevious] = useState<Outcome | null>(null);
  const prepared = useMemo(() => prepareChallenge(start, choices), [start, choices]);
  const available = availableFunds(prepared.ledger), deposit = Math.min(savings, available);
  const forecast = useMemo(() => projection(prepared.ledger, deposit, strategy), [prepared.ledger, deposit, strategy]);
  const c = start.challenge!, plan = world.current.plan;
  const activeLedger = view === 'plan' ? prepared.ledger : plan.ledger;
  const outcome = challengeOutcome(plan.ledger);
  const initialRepair = hasOffers(id) && !c.repairComplete && c.asset.owned;
  const clear = () => { input.current.keys.clear(); input.current.firing = false; };
  const refocus = () => requestAnimationFrame(() => focus.current?.focus({ preventScroll: true }));
  const pause = () => { if (world.current.phase === 'playing') { world.current.phase = 'paused'; clear(); setHud(readHud(world.current)); } };
  const resume = () => { if (world.current.phase === 'paused') { world.current.phase = 'playing'; setHelp(false); setHud(readHud(world.current)); refocus(); } };
  useEffect(() => {
    const hidden = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', hidden); request.current?.abort(); };
  }, []);
  useEffect(() => { if (view !== 'play') heading.current?.focus({ preventScroll: true }); }, [view, start.period]);
  const begin = async () => {
    if (busy || prepared.error) return;
    setBusy(true); setError(''); clear();
    const controller = new AbortController(); request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const probe = document.createElement('canvas'); const gl = probe.getContext('webgl2');
      if (!gl) throw new Error('3D combat needs WebGL. Your choices are unchanged; use a browser with hardware acceleration to play.');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      const proposed = startPlan(prepared.ledger, deposit, strategy, 0);
      const response = await requestComparison(practiceInputs(proposed.ledger), DEFAULT_SCENARIO, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const corners = response.current.corners;
      const nextAppearance: CornerStrengths = { cashFlow: corners.cashFlow.strength, capital: corners.capital.strength, collateral: corners.collateral.strength, credit: corners.credit.strength };
      const nextKit = createLoadout(nextAppearance);
      const sector = checkpoint.current ? resumeSector(copy(checkpoint.current), nextKit, proposed) : createSector(nextKit, proposed);
      sector.phase = 'playing';
      sector.notice = `${info.name} · period ${start.period}/3. ${equipmentOnline(proposed.ledger) ? 'Support cover is active in the amber center ring.' : 'Move, aim and land your repayment shots.'}`; sector.noticeTime = 8;
      world.current = sector; setKit(nextKit); setAppearance(nextAppearance);
      input.current.autoFire = false; input.current.aiming = false; input.current.targetId = proposed.targetId;
      setSelected(proposed.targetId); setAutoFire(false); setHelp(false); setHud(readHud(sector)); setView('play'); refocus();
    } catch (e) { if (request.current === controller) setError(controller.signal.aborted ? 'Preparing the loadout took too long. Try again.' : e instanceof Error ? e.message : 'Could not prepare the mission.'); }
    finally { window.clearTimeout(timeout); if (request.current === controller) { request.current = null; setBusy(false); } }
  };
  const retry = () => { clear(); setError(''); setHelp(false); setView('plan'); };
  const restart = () => {
    if (world.current.phase === 'complete') setPrevious(challengeOutcome(world.current.plan.ledger));
    const fresh = challengeScenario(id); checkpoint.current = null;
    world.current = createSector(kit, startPlan(fresh, 40000, 'snowball'));
    setStart(fresh); setChoices(defaultChoices(fresh)); setSavings(40000); setStrategy('snowball'); setError(''); setView('plan'); clear();
  };
  const onEvent = (event: string) => {
    if (event === 'payday') {
      try {
        const next = nextPeriod(world.current.plan);
        checkpoint.current = copy(world.current); setStart(next); setChoices(defaultChoices(next));
        setSavings(Math.min(40000, availableFunds(next))); setError(''); setView('plan'); clear();
      } catch (e) { setError(e instanceof Error ? e.message : 'Unable to advance this period.'); setView('review'); clear(); }
    }
    if (event === 'complete' || event === 'gameOver') { setHud(readHud(world.current)); setView('review'); clear(); }
  };
  const held = (key: string) => ({ onPointerDown: (e: PointerEvent<HTMLButtonElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); input.current.keys.add(key); if (key === ' ') input.current.aiming = false; }, onPointerUp: () => input.current.keys.delete(key), onPointerCancel: () => input.current.keys.delete(key), onLostPointerCapture: () => input.current.keys.delete(key) });
  const setAllocation = (amount: number) => setSavings(Math.max(0, Math.min(available, Number.isFinite(amount) ? Math.round(amount) : 0)));
  const planNotes = [...start.challenge!.notes, ...prepared.ledger.challenge!.notes];
  const reserve = reserveMilestone(activeLedger);
  const completed = world.current.phase === 'complete';
  const summary = summarizeSector(world.current);

  return <div className="sector-shell debtbreak-shell db-challenge-mission" data-combat={view === 'play'} style={{ '--corner': info.color } as CSSProperties}>
    <header className="sector-header"><div><span className="eyebrow">DEBTBREAK / {info.name.toUpperCase()}</span><h2>{info.title}<span>PERIOD {start.period} / 3</span></h2></div><div className="sector-header-actions">
      <Button variant="ghost" onClick={() => { pause(); setHelp(v => !v); }}>Controls</Button>
      {view !== 'play' && <Button variant="ghost" disabled={busy} onClick={onBack}>Challenges</Button>}
    </div></header>
    <div className="db-mission-progress" aria-label={`Financial period ${start.period} of 3`}>{[1, 2, 3].map(n => <span key={n} data-current={n === start.period} data-done={n < start.period}>Period {n}</span>)}<strong>{info.name}</strong></div>

    {view === 'plan' && <div className="db-board">
      <div className="db-heading"><span className="eyebrow">{start.period > 1 ? 'PAYDAY / REVIEW & REPLAN' : 'MISSION BRIEF'}</span><h3 ref={heading} tabIndex={-1}>{start.period > 1 ? 'Your next decision.' : info.lesson}</h3><p>{info.objective}</p></div>
      {start.period > 1 && <section className="db-round-recap" aria-label="Last period results"><strong>Period {start.period - 1} → {start.period}</strong><p>Repaid {money(plan.executed)} with ammunition. Reserves now {money(start.reserves)}. This payday’s interest: {money(start.interestPosted)}.</p>{plan.event && <p>{plan.event.name}: {money(plan.event.covered)} covered by reserves; {money(plan.event.shortfall)} due this payday. {plan.event.shortfall === 0 && 'Protection worked.'}</p>}{plan.ledger.challenge!.notes.map((note, i) => <p key={i}>{note}</p>)}</section>}
      <div className="db-challenge-brief"><p><strong>In the arena:</strong> {info.mechanic}</p><p><strong>Known events:</strong> {info.event}</p></div>
      <div className="db-ledger-strip"><div><span>Income this payday</span><strong>{money(start.income)}</strong></div><div><span>Living + required payments</span><strong>−{money(start.living + start.minimums + start.repairDue)}</strong></div><div><span>Reserves before choices</span><strong>{money(start.reserves)}</strong></div><div><span>Available after choices</span><strong>{money(available)}</strong></div></div>

      {initialRepair && <section className="db-panel db-decision-panel"><h4>Restore the support unit <span>$600 repair</span></h4><p>Repairing activates cover in the amber center ring. Waiting reduces the next payday’s income by $150. These are fictional offers; the score stays at 680.</p>
        <p className="db-record">Payment periods completed: <strong>{c.paymentPeriods}</strong> / 2 · {c.paymentPeriods >= 2 ? 'Lower-rate offers available.' : 'Complete two periods to see lower rates if the repair is still needed.'} Existing loan rates stay fixed.</p>
        <div className="db-offers" role="group" aria-label="Repair funding">
          <button aria-pressed={choices.funding === 'cash'} onClick={() => setChoices(v => ({ ...v, funding: 'cash' }))}><strong>Pay from reserves</strong><b>$600 now</b><span>No new debt or payment.</span><small>Reserves after repair: {money(Math.max(0, start.reserves - 60000))}</small></button>
          {financingOffers(start).map(offer => <button key={offer.id} aria-pressed={choices.funding === offer.id} onClick={() => setChoices(v => ({ ...v, funding: offer.id }))}><strong>{offer.label}</strong><b>{offer.apr}% APR</b><span>{money(offer.payment)}/month · 6 payments</span><small>Scheduled total {money(offer.total)} · interest {money(offer.cost)} · final payment {money(offer.lastPayment)}. No fees.</small><small>{offer.secured ? 'The unit secures the loan and is at risk if the agreement is not paid.' : 'No asset pledged.'} First payment next payday.</small></button>)}
          <button aria-pressed={choices.funding === 'wait'} onClick={() => setChoices(v => ({ ...v, funding: 'wait' }))}><strong>Wait this period</strong><b>$0 now</b><span>Support stays offline.</span><small>Next income −$150. A later repair still costs $600.</small></button>
        </div>
      </section>}
      {hasEquipment(id) && !initialRepair && c.asset.owned && <section className="db-panel db-decision-panel"><h4>Support unit <span>{c.asset.condition}% condition</span></h4><p>Working at 30% condition or above. It loses 25 condition at period end. Service restores 40, up to 100. The amber center ring blocks enemy fire while you stand inside it.</p>
        {c.asset.pledgedTo && <p className="db-callout">Pledged to {c.asset.pledgedTo}. A sale pays that loan first.</p>}
        <div className="db-offers" role="group" aria-label="Equipment decision">
          <button aria-pressed={choices.equipment === 'service'} onClick={() => setChoices(v => ({ ...v, equipment: 'service' }))}><strong>Service unit</strong><b>$100 this payday</b><span>Condition before combat: {Math.min(100, c.asset.condition + 40)}%</span></button>
          <button aria-pressed={choices.equipment === 'defer'} onClick={() => setChoices(v => ({ ...v, equipment: 'defer' }))}><strong>Defer upkeep</strong><b>$0 this payday</b><span>Condition after period: {Math.max(0, c.asset.condition - 25)}%</span></button>
          <button aria-pressed={choices.equipment === 'sell'} onClick={() => setChoices(v => ({ ...v, equipment: 'sell' }))}><strong>Sell unit</strong><b>{money(saleQuote(start).net)} next payday</b><span>Lose support immediately.</span><small>{money(saleQuote(start).gross)} value − {money(saleQuote(start).fee)} selling fee − {money(saleQuote(start).lien)} secured payoff.{start.period === 3 ? ' Proceeds arrive after this mission; they do not count toward its cash goal.' : ''}</small></button>
        </div>
      </section>}
      {hasEquipment(id) && !c.asset.owned && <p className="db-callout">The support unit was sold. Its arena cover is unavailable. Net proceeds are available after the sale’s next payday.</p>}
      {planNotes.length > 0 && <div className="db-decision-notes" aria-live="polite">{[...new Set(planNotes)].map(note => <p key={note}>{note}</p>)}</div>}

      <div className="db-plan-grid"><section className="db-panel"><h4>Allocate this payday <span>{money(available)}</span></h4>
        <div className="db-allocation"><label>Add to reserves<input aria-label="Add to reserves" type="number" inputMode="decimal" min={0} max={available / 100} step={25} value={deposit / 100} onChange={e => setAllocation(Number(e.target.value) * 100)}/></label><label>Debt ammunition<input aria-label="Debt ammunition" type="number" inputMode="decimal" min={0} max={available / 100} step={25} value={(available - deposit) / 100} onChange={e => setAllocation(available - Number(e.target.value) * 100)}/></label></div>
        <Slider aria-label="Savings allocation" min={0} max={available || 1} step={100} value={[deposit]} onValueChange={v => setAllocation(v[0] ?? 0)} disabled={!available}/>
        <div className="db-split-label"><span>More debt repayment</span><span>More reserves</span></div>
        <div className="db-strategies"><Button aria-pressed={strategy === 'snowball'} onClick={() => setStrategy('snowball')}>Snowball<small>Smallest balance first</small></Button><Button aria-pressed={strategy === 'avalanche'} onClick={() => setStrategy('avalanche')}>Avalanche<small>Highest APR first</small></Button></div>
        <p className="db-note">Shots only spend money when they hit a debt target. Ordinary shields use combat energy. Reserve strikes are reserved for Classic mode.</p>
      </section><section className="db-panel"><h4>See the consequences</h4><dl className="db-facts">
        <div><dt>Reserves after your choices</dt><dd>{money(prepared.ledger.reserves + deposit)}</dd></div>
        <div><dt>Equipment expense this payday</dt><dd>{money(prepared.ledger.challenge!.costs)}</dd></div>
        <div><dt>Debt after all allocated shots land</dt><dd>{money(totalDebt(forecast.ledger))}</dd></div>
        <div><dt>Required payments after those shots</dt><dd>{money(requiredPayments(forecast.ledger))}/month</dd></div>
        <div><dt>Next interest estimate</dt><dd>{money(forecast.interest)}</dd></div>
        {hasEquipment(id) && <div><dt>Support during combat</dt><dd>{equipmentOnline(prepared.ledger) ? 'Online · center ring' : 'Offline'}</dd></div>}
      </dl><p className="db-cause">{start.period === 1 && ['capital', 'four-corners'].includes(id) ? 'The $600 disruption comes after this round. It will draw on the reserves shown above.' : 'Clearing a debt removes its future required payment. Unspent ammunition stays available next payday.'}</p></section></div>
      <details className="db-assumptions"><summary>Scenario accounting & controls</summary><p>Income {money(start.income)} − living {money(start.living)} − required payments {money(start.minimums)} − prior disruption due {money(start.repairDue)} + carried cash {money(start.carry)} − upkeep {money(prepared.ledger.challenge!.costs)} = {money(available)} to allocate. Starting balances already reflect this payday’s required payments.</p><p>Interest posts once at each following payday: remaining balance × APR ÷ 12, rounded to cents. New loans make their first payment next payday. Repaying early has no fee. Sale proceeds arrive the next payday after a 10% fictional selling fee and any secured payoff. The emergency’s uncovered amount is explicitly due next payday without interest.</p><p>Move: WASD or arrows. Select a debt and hold Space, or aim and click. E shields; Shift dashes; P pauses. Touch controls appear in combat. Each period lasts up to 30 seconds; clearing all targets advances it early. The mission ends after period 3. A combat failure can be retried from the exact period start.</p><p>Credit offers are scenario rules, not real score predictions. Payment clicks do not increase a score. The private calculator is used with fictional inputs; your own financial profile is unaffected.</p></details>
      {(error || prepared.error) && <p className="db-error" role="alert">{error || prepared.error}</p>}
      <div className="db-actions"><Button className="primary-action" disabled={busy || !!prepared.error} onClick={begin}><Play size={18}/>{busy ? 'Preparing…' : `Play period ${start.period}`}</Button><span>{start.period === 1 ? 'Three periods. Same events on every replay.' : 'Your combat health and battlefield carry forward.'}</span></div>
    </div>}

    {view === 'play' && <>
      <div className="db-combat-ledger"><span>Ammunition <strong>{money(plan.remaining)}</strong></span><span>Reserves <strong>{money(plan.ledger.reserves)}</strong></span><span>{hasEquipment(id) ? 'Support unit' : 'Protection'} <strong>{hasEquipment(id) ? equipmentOnline(plan.ledger) ? `${plan.ledger.challenge!.asset.condition}% · online` : 'Offline' : `${reserve.months.toFixed(2)} months`}</strong></span></div>
      <div className="db-accounts db-mission-accounts">{plan.ledger.debts.filter(d => d.balance > 0).map(d => <button className="db-account" key={d.id} data-selected={selected === d.id} data-priority={plan.targetId === d.id} aria-pressed={selected === d.id} aria-label={`Aim at ${d.name}`} disabled={hud.phase !== 'playing'} onClick={() => { input.current.targetId = d.id; input.current.aiming = false; setSelected(d.id); refocus(); }}><span>{plan.targetId === d.id ? '★ ' : ''}{d.name}<b>{d.apr}% APR</b></span><strong>{money(d.balance)}</strong><span>{money(d.payment)}/mo</span></button>)}</div>
      <div className="sector-play-area" ref={focus} tabIndex={0} role="application" aria-label="Challenge battlefield. WASD or arrows move, Space fires, E shields, Shift dashes, P pauses." onBlur={clear}
        onKeyDown={e => { if ((e.target as HTMLElement).closest('button,input')) return; const key = e.key.toLowerCase(); if (['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' ','e','shift'].includes(key)) { e.preventDefault(); input.current.keys.add(key); if (key === ' ') input.current.aiming = false; } if (key === 'p' && !e.repeat) { e.preventDefault(); world.current.phase === 'playing' ? pause() : resume(); } }} onKeyUp={e => input.current.keys.delete(e.key.toLowerCase())}
        onPointerMove={e => { if (e.pointerType !== 'mouse') return; const r = e.currentTarget.getBoundingClientRect(); input.current.pointer.set((e.clientX-r.left)/r.width*2-1, -(e.clientY-r.top)/r.height*2+1); input.current.aiming = true; }}
        onPointerDown={e => { if (world.current.phase !== 'playing' || (e.target as HTMLElement).closest('button')) return; e.currentTarget.focus({ preventScroll: true }); e.currentTarget.setPointerCapture(e.pointerId); input.current.firing = true; }} onPointerUp={() => { input.current.firing = false; }} onPointerCancel={() => { input.current.firing = false; }} onLostPointerCapture={() => { input.current.firing = false; }}>
        <RenderBoundary fallback={<div className="sector-error"><h3>The arena could not load.</h3><Button onClick={retry}>Return to your plan</Button></div>}><Canvas shadows={!compact} dpr={compact ? 1 : [1,1.4]} frameloop={hud.phase === 'playing' ? 'always' : 'demand'} camera={{ position: [13,16,18], fov: 43, near: .1, far: 150 }} gl={{ antialias: true, powerPreference: 'high-performance' }}><Suspense fallback={null}><SectorWorld avatar={avatar} strengths={appearance} world={world} input={input} loadout={kit} compact={compact} reduced={reduced} onHud={setHud} onEvent={onEvent}/></Suspense></Canvas></RenderBoundary>
        <div className="db-arena-status"><span>Period ends in {Math.max(0, PERIOD_SECONDS-hud.time)}s</span><span>Health {Math.round(hud.health)} / 100</span></div>
        {hud.phase === 'paused' && <div className="sector-intro"><h3>Mission paused</h3><p>Resume, or restore this period’s starting choices.</p><Button className="primary-action" onClick={resume}>Resume</Button><Button variant="outline" onClick={retry}>Replan this period</Button><Button variant="ghost" onClick={onBack}>Exit to challenges</Button></div>}
      </div>
      <div className="db-arena-message" aria-live="polite">{world.current.noticeTime > 0 ? world.current.notice : world.current.assist ? `${ARENA_PILLARS[world.current.assist.pillar].name} support · ${Math.ceil(world.current.assist.remaining)}s` : equipmentOnline(plan.ledger) ? 'Amber center ring: equipment cover. Glowing corners: temporary assists.' : plan.remaining === 0 ? 'Ammunition spent. Shield and evade until payday.' : 'Select a debt target and land your repayment shots.'}</div>
      <div className="sector-bottom"><div className="energy-hud"><span>COMBAT ENERGY <strong>{Math.floor(hud.energy)} / {kit.energyMax}</strong></span><div><i style={{ width: `${hud.energy/kit.energyMax*100}%` }}/></div></div>
        <div className="sector-touch" inert={hud.phase !== 'playing'}><div className="dpad"><Button {...held('w')} aria-label="Move forward"><ArrowUp size={17}/></Button><Button {...held('a')} aria-label="Move left"><ArrowLeft size={17}/></Button><Button {...held('s')} aria-label="Move backward"><ArrowDown size={17}/></Button><Button {...held('d')} aria-label="Move right"><ArrowRight size={17}/></Button></div><Button {...held(' ')}><Crosshair size={17}/>Fire</Button><Button {...held('e')}><Shield size={17}/>Shield</Button><Button {...held('shift')}><Zap size={17}/>Dash</Button><Button aria-pressed={autoFire} onClick={() => { input.current.autoFire = !autoFire; input.current.aiming = false; setAutoFire(!autoFire); refocus(); }}>Auto {autoFire ? 'on' : 'off'}</Button></div>
        <Button variant="ghost" aria-label={hud.phase === 'playing' ? 'Pause mission' : 'Resume mission'} onClick={() => hud.phase === 'playing' ? pause() : resume()}>{hud.phase === 'playing' ? <Pause size={18}/> : <Play size={18}/>}</Button>
      </div>
    </>}

    {view === 'review' && <div className="db-board">
      <div className="db-heading"><span className="eyebrow">{completed ? 'MISSION REVIEW' : 'GAME OVER'}</span><h3 ref={heading} tabIndex={-1}>{completed ? outcome.passed ? 'Challenge complete.' : 'Three periods. A different outcome.' : 'Retry with the same starting position.'}</h3><p>{completed ? outcome.passed ? 'Your plan met this mission’s financial goals.' : 'You survived the mission. These goals still need work; replay the same events with another plan.' : 'Combat ended before the period was settled. Its financial results below are provisional.'}</p></div>
      <div className="db-goal-checks">{outcome.checks.map(check => <div key={check.label} data-passed={completed && check.passed}>{completed && check.passed ? <Check size={20}/> : <X size={20}/>}<span>{check.label}</span></div>)}</div>
      <div className="db-ledger-strip"><div><span>Debt remaining</span><strong>{money(totalDebt(plan.ledger))}</strong></div><div><span>Reserves remaining</span><strong>{money(plan.ledger.reserves)}</strong></div><div><span>Unallocated cash</span><strong>{money(plan.ledger.carry + (plan.settled ? 0 : plan.remaining))}</strong></div><div><span>Net monthly payments freed</span><strong>{money(outcome.freed)}</strong></div></div>
      <div className="db-plan-grid"><section className="db-panel"><h4>What your choices changed</h4><dl className="db-facts"><div><dt>Extra repayments from ammunition</dt><dd>{money(summary.executed)}</dd></div><div><dt>Deposits into reserves</dt><dd>{money(summary.savings)}</dd></div><div><dt>Interest charged at paydays</dt><dd>{money(summary.interest)}</dd></div><div><dt>Ongoing surplus after upkeep</dt><dd>{money(outcome.surplus)}/month</dd></div>{hasEquipment(id) && <div><dt>Equipment at mission end</dt><dd>{outcome.online ? 'Working' : 'Offline / sold'} · {outcome.condition}%</dd></div>}<div><dt>Emergency covered by reserves</dt><dd>{money(plan.ledger.challenge!.emergencyCovered)}</dd></div><div><dt>Sale money due next payday</dt><dd>{money(plan.ledger.challenge!.salePending)}</dd></div></dl><p className="db-cause">{id === 'cash-flow' ? 'A cleared account releases a recurring payment. An extra payment on an open account reduces its balance and interest.' : id === 'capital' ? 'Spending reserves on the disruption was protection working. Your final reserve floor measures the rebuild.' : id === 'collateral' ? 'Service preserved a useful ability. Selling exchanged that ability for delayed cash after costs.' : id === 'credit' ? 'Financing preserved cash and added future commitments. Compare the cost and remaining obligations, even if you qualified.' : 'Your equipment, reserves, repayment capacity and financing choices shared the same pool of resources.'}</p></section>
      <section className="db-panel"><h4>Period record</h4>{[...world.current.history, plan].map((p, index) => <div className="db-period-record" key={index}><strong>Period {p.ledger.period}</strong><p>{money(p.executed)} extra debt paid · {money(p.ledger.reserves)} reserves at end.</p>{p.ledger.challenge!.notes.map((note, n) => <p key={n}>{note}</p>)}{p.event && <p>{p.event.name}: {money(p.event.cost)}; {money(p.event.covered)} from reserves.</p>}</div>)}</section></div>
      {previous && <div className="db-comparison"><table><caption>Same mission, different choices</caption><thead><tr><th>Outcome</th><th>Previous</th><th>This attempt</th></tr></thead><tbody>{[['Debt reduced', money(previous.debtReduced), money(outcome.debtReduced)], ['Reserves', money(previous.reserves), money(outcome.reserves)], ['Monthly payments freed', money(previous.freed), money(outcome.freed)], ['Support unit', previous.online ? 'Working' : 'Offline', outcome.online ? 'Working' : 'Offline']].map(([label, before, after]) => <tr key={label}><th scope="row">{label}</th><td>{before}</td><td>{after}</td></tr>)}</tbody></table></div>}
      {error && <p className="db-error" role="alert">{error}</p>}
      <div className="db-actions"><Button className="primary-action" onClick={completed ? restart : retry}><RotateCcw size={18}/>{completed ? 'Replay the same mission' : 'Retry this period'}</Button><Button variant="outline" onClick={onBack}>Choose another challenge</Button><Button variant="ghost" onClick={onExit}><Home size={17}/>Hangar</Button></div>
    </div>}
    {help && <div className="db-help" role="dialog" aria-label="Challenge controls"><h3>Move. Aim. Decide.</h3><p>WASD or arrows move. Select a debt account and hold Space, or aim with the mouse and hold to fire. E shields, Shift dashes, P pauses. On touch, use the movement pad and hold Fire or Shield.</p><p>Landed shots spend the allocation and reduce the target’s debt. Misses spend combat energy; enemy hits reduce combat health. Each $100 repaid on the strategy target charges a corner assist. Enter a glowing corner to use it.</p><p>Working equipment protects the amber center ring while you stand inside. Upkeep and financing are chosen at payday. Reserve strikes remain in Classic mode.</p><p>{info.objective} Financial periods last up to 30 seconds. Pausing freezes the battle; replanning restores this period’s exact starting ledger and battlefield.</p><Button onClick={() => setHelp(false)}>Close controls</Button></div>}
  </div>;
}
