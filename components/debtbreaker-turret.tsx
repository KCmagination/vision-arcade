"use client";

import { Suspense, useState } from "react";
import { Crosshair, Home, Pause, Play, RotateCcw, Shield, Volume2, VolumeX, Vault } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DebtbreakerBattlefield } from "./debtbreaker-battlefield";
import { useDebtbreakerController } from "./debtbreaker-controller";
import type { AvatarKind, AvatarVisualState, CornerStrengths } from "./avatar-stage";
import type { Snapshot } from "@/lib/vision-contract.js";
import type { ResolvedDetails,AccountReview } from "@/lib/advanced-finances.js";
import { shotValue, firingRate, extraDebtPayment, campaignView, missionSummary, recurringOutflow } from "@/lib/debtbreaker-engine.js";

const money=(cents:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:cents%100?2:0}).format(cents/100);
type Props={avatar:AvatarKind;strengths:CornerStrengths;hangar:Snapshot;visualState:AvatarVisualState;details?:ResolvedDetails;onExit:()=>void;onChallenges:()=>void;onClassic:()=>void};
type Confirmation={title:string;description:string;accept:()=>void};

function Facts({rows}:{rows:[string,string][]}){
  return <dl className="db31-facts">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function AccountResult({account,canPay,onPay}:{account:AccountReview;canPay:boolean;onPay:(source:'income'|'reserve',cents:number)=>void}){
  const [amount,setAmount]=useState('');
  const cents=Math.round(Number(amount)*100),valid=Number.isSafeInteger(cents)&&cents>0;
  return <article><h4>{account.name}</h4><Facts rows={[["Paid this period",money(account.paid)],["Extra paid at checkpoint",money(account.extraPaid??0)],...(account.modeled?[["Estimated interest added",money(account.interestAdded!)],["Interest paid",money(account.interestPaid!)],["Principal paid",money(account.principal!)],["Included costs paid",money(account.otherPaid!)],["Estimated balance remaining",money(account.closingBalance!)]]:[["Balance / interest","Not projected · payments only"]]) as [string,string][]]}/>
    {canPay&&account.modeled&&account.closingBalance!>0&&<div className="db31-extra"><label>Extra payment ($)<input aria-label={`Extra payment to ${account.name}`} type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label><Button variant="outline" disabled={!valid} onClick={()=>{onPay('income',cents);setAmount('');}}>Use income</Button><Button variant="outline" disabled={!valid} onClick={()=>{onPay('reserve',cents);setAmount('');}}>Use reserves</Button></div>}
  </article>;
}

export function DebtbreakerTurret({avatar,strengths,hangar,visualState,details,onExit,onChallenges,onClassic}:Props){
  const game=useDebtbreakerController(hangar,visualState.creditGrade,details),{state,world}=game;
  const SHOT=shotValue(state),rate=firingRate(state),issues=state.hangar?.details?.issues??[];
  const [pace,setPace]=useState("standard");
  const [info,setInfo]=useState<"help"|"budget"|"guide"|null>(null);
  const [confirm,setConfirm]=useState<Confirmation|null>(null);
  const view=campaignView(state),summary=missionSummary(state);
  const source=state.hangar!,loadout=source.loadout,pictureName=source.snapshot.kind==='scenario'?'What if':'My picture';
  const coverage=recurringOutflow(state)>0?`${view.months.toFixed(2)} months coverage`:'No monthly outflow';
  const hasObligations=recurringOutflow(state)>0;
  const selected=state.threats.find((t)=>t.id===state.selectedId);
  const selectedAccount=source.details?.accounts.find(a=>a.id===selected?.accountId);
  const liveTargets=state.threats.filter((t)=>!t.impacted&&(t.lane==="reserve"||t.remaining>0));
  const currentSource=world.current.source;
  const settling=world.current.time<world.current.settleUntil;
  const canFire=state.phase==="playing"&&game.ready&&!state.paused&&(currentSource==="income"?state.incomeWallet:state.reserves)>0;
  const openInfo=(kind:typeof info)=>{game.pause();game.setModal(!!kind);setInfo(kind);};
  const leave=(action:()=>void)=>{
    if(state.phase!=="briefing"&&state.phase!=="complete"&&state.phase!=="gameover"){
      game.pause();game.setModal(true);setConfirm({title:"Leave this mission?",description:"Your current mission will end. No external financial data is changed.",accept:action});
    }else action();
  };
  const closeConfirm=()=>{game.setModal(false);setConfirm(null);};

  return <div className="sector-shell debtbreaker-shell db31-shell" data-phase={state.phase}>
    <header className="db31-header">
      <div><span className="eyebrow">VI$ION / {pictureName.toUpperCase()} · HANGAR</span><h2>DEBTBREAKER <small>MANUAL TURRET</small></h2></div>
      <nav aria-label="Game navigation"><Button variant="ghost" onClick={()=>leave(onChallenges)}>Challenges</Button><Button variant="ghost" onClick={()=>leave(onClassic)}>Classic</Button><Button variant="ghost" onClick={()=>leave(onExit)}><Home size={16}/>Hangar</Button></nav>
    </header>

    {state.phase==="briefing"&&<main className="dbt-briefing db31-briefing">
      <section><span className="eyebrow">AIM. PAY. PROTECT.</span><h3>Your income.<br/><em>Your line of defense.</em></h3>
        <p>Your avatar crews the turret. Debtonators weave in from CREDIT; heavier Utilitanks advance from LIVING COST. Each named group shares one monthly obligation. More targets never create more debt. Hit the friendly green deposit tank to transfer income into your rear vault.</p>
        <div className="dbt-brief-grid"><article><Crosshair/><strong>You control every shot</strong><span>Mouse aims; hold primary button to fire. On touch, drag to aim and hold FIRE with your other thumb. No automatic targeting.</span></article>
          <article><Vault/><strong>One dollar moves once</strong><span>Each hit allocates up to {money(SHOT)}. Misses cost nothing. Deposits use income only, with no cap beyond your available income.</span></article>
          <article><Shield/><strong>Protection is finite</strong><span>The vault intercepts obligations at the existing defense line. Only the unpaid remainder breaches and damages defenses.</span></article>
          <article><Pause/><strong>Take your time to review</strong><span>Four periods, with a paused financial checkpoint between each. Unused income carries forward. Switching tabs pauses play.</span></article></div>
        <p className="db31-controls-note">Keyboard: arrows / WASD aim · Space fires · R switches funding · P pauses. Controller: stick aims · right trigger fires · A income / B reserves · Start pauses.</p>
      </section>
      <aside className="dbt-scenario"><span className="eyebrow">FROM YOUR HANGAR</span><h4>{pictureName}</h4><p>Your selected picture supplies the money and loadout for four game periods. Income repeats and unused income carries forward. Opted-in repayment estimates can reduce later debt payments; your captured pillar loadout stays fixed.</p>
        <Facts rows={[["Income per period",money(state.startingIncome)],["Living expenses",money(state.baseLiving)],["Debt payments",money(source.monthlyDebtPayments)],["Starting vault",money(state.reserves)],["Total monthly obligations",money(recurringOutflow(state))]]}/>
        <h4>Choose your pressure</h4><p>Pace changes movement. Your dollar amounts stay the same.</p>
        <div className="db31-options" role="group" aria-label="Gameplay pace">{["relaxed","standard","pressure"].map(n=><button key={n} aria-pressed={pace===n} onClick={()=>setPace(n)}>{n}</button>)}</div>
        <Facts rows={[["Cash flow · rapid firing",`${rate.toFixed(1)} shots / second · ${money(SHOT)} per hit`],["Collateral · starting armor",`${loadout.assetsMax}% each defense`],["Credit · radar reach",`${loadout.radar.toFixed(1)} field units · ${view.grade}`]]}/>
        <p>Four smaller shots replace each former $100 firing interval. Cash flow still controls your maximum allocation speed.</p>
        {source.details&&<p>{source.details.date} picture · {source.details.estimates?'Opted-in accounts use monthly estimates; other accounts stay payments-only.':'Account balances remain payments-only.'}</p>}
        {!!issues.length&&<p role="alert">{issues.join(' ')}</p>}
        {!hasObligations&&<p>No monthly obligations are entered. There is nothing to defend; return to the hangar to change your picture.</p>}
        {state.reserves<0&&<p>Your negative reserve balance is preserved. Deposits cover that shortfall before the vault can pay obligations.</p>}
        <Button className="primary-action" disabled={!hasObligations||!!issues.length} onClick={()=>game.start(pace)}><Crosshair size={18}/>Start Debtbreaker</Button>
        <Button variant="ghost" onClick={onExit}>Edit picture in hangar</Button>
        <p className="dbt-disclaimer">Simulation only. Game actions never change your hangar entries or move real money. Credit-score changes are not projected. Autofire and aim assist start off.</p>
      </aside>
    </main>}

    {(state.phase==="playing"||settling)&&<>
      <div className="db31-status" aria-label="Combat balances">
        <div><span>PERIOD / PACE</span><b>{state.period}/{state.maxPeriods} <small>{pace}</small></b><small>{world.current.drones.filter(d=>d.remaining>0&&!state.threats.find(t=>t.id===d.targetId)?.impacted).length} hostiles approaching</small></div>
        <div><span>INCOME AMMO</span><b data-testid="income-balance">{money(state.incomeWallet)}</b></div>
        <div><span>RESERVE VAULT</span><b data-testid="reserve-balance">{money(state.reserves)}</b><small>{coverage}</small></div>
        <div><span>DEFENSE CONDITION</span><b>{state.defenses.map((d)=>d.owned?`${d.condition}%`:"Sold").join(" / ")}</b></div>
        <div><span>UNPAID / ARREARS</span><b>{money(state.arrears)}</b></div>
      </div>
      <main className="db31-arena" aria-label="Interactive Debtbreaker battlefield" onContextMenu={e=>e.preventDefault()}>
        <Suspense fallback={<div className="db31-loading">Opening the defense bay…</div>}>
          <DebtbreakerBattlefield avatar={avatar} strengths={strengths} visualState={visualState} world={world} ledger={state} onReady={game.onReady} onFailure={game.onFailure} onGesture={game.gesture} reduced={game.reduced}/>
        </Suspense>
        {!game.ready&&!game.failed&&<div className="db31-loading" role="status">Preparing the battlefield. The clock has not started.</div>}
        {state.paused&&!settling&&<div className="db31-pause"><h3>{game.failed?"Battlefield unavailable":"Battle paused"}</h3><p>No movement, firing, or money changes while paused.</p><Button className="primary-action" disabled={!game.ready} onClick={game.toggle}><Play/>Resume</Button><Button variant="ghost" onClick={()=>leave(onExit)}>Return to hangar</Button></div>}
      </main>
      <div className="db31-targets" aria-label="Inspect or aim at target">
        {liveTargets.map((t)=><button key={t.id} data-lane={t.lane} aria-pressed={state.selectedId===t.id} onClick={()=>game.select(t.id)}><span>{t.lane==="reserve"?"FRIENDLY · INCOME ONLY":`${world.current.drones.filter(d=>d.targetId===t.id&&d.remaining>0).length} ${t.lane==='credit'?'DEBTONATORS':'UTILITANKS'}`}</span><b>{t.label}</b><strong>{t.lane==="reserve"?`${money(t.incomePaid)} deposited`:money(t.remaining)}</strong></button>)}
      </div>
      <div className="db31-command">
        <div className="db31-fire-group"><div className="db31-options" role="group" aria-label="Shot funding"><button aria-pressed={currentSource==="income"} onClick={()=>game.source("income")}>Income</button><button aria-pressed={currentSource==="reserve"} onClick={()=>game.source("reserve")}>Reserves</button></div>
          <Button className="db31-fire" disabled={!canFire} aria-label={`Hold to fire ${currentSource}; up to ${money(SHOT)} per hit`} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.fire(true);}} onPointerUp={()=>game.fire(false)} onPointerCancel={()=>game.fire(false)} onLostPointerCapture={()=>game.fire(false)} onClick={e=>{if(e.detail===0)game.pulse();}}><Crosshair/>FIRE <small>≤ {money(SHOT)} / hit</small></Button>
          <Button variant="outline" aria-pressed={world.current.autoFire} disabled={state.paused||!game.ready} onClick={game.auto}>Autofire {world.current.autoFire?"on":"off"}</Button>
        </div>
        <div className="db31-tools"><Button variant="ghost" aria-pressed={world.current.assist} onClick={game.assist}>Assist {world.current.assist?"on":"off"}</Button><Button variant="ghost" onClick={()=>openInfo("help")}>Controls</Button><Button variant="ghost" aria-label={game.sound?"Mute game sound":"Enable game sound"} aria-pressed={game.sound} onClick={game.toggleSound}>{game.sound?<Volume2/>:<VolumeX/>}</Button><Button variant="outline" disabled={game.failed} onClick={game.toggle}>{state.paused?<Play/>:<Pause/>}{state.paused?"Resume":"Pause"}</Button></div>
      </div>
      <div className="db31-bottomline"><span>{state.notice}</span><small>{world.current.shots} shots · {world.current.hits} paid hits · {world.current.misses} misses</small></div>
      <details className="db31-details"><summary>Target details &amp; four pillars{selected?` — ${selected.label}`:""}</summary><div>
        <section><h4>{selected?.label??"Select a target"}</h4>{selected&&<Facts rows={selected.lane==="reserve"?[["Role","Friendly deposit tank"],["Deposited this period",money(selected.incomePaid)],["Funding","Income only; no savings loop"]]:[["This period's obligation",money(selected.original)],["Remaining",money(selected.remaining)],["Income paid",money(selected.incomePaid)],["Reserve paid",money(selected.reservePaid)],["Status",selected.impacted?"Breached":selected.remaining===0?"Paid":selected.overdue?"Overdue":selected.intercepted?"Passed interception":"Advancing"]]}/>} {selectedAccount&&<Facts rows={[["Account type",selectedAccount.type.replaceAll('-',' ')],[selectedAccount.modeled?"Estimated principal entering period":"Entered outstanding balance",money(selectedAccount.balance)],["Entered monthly payment",money(selectedAccount.payment)],["Rate",selectedAccount.rate===null?'Unknown':`${selectedAccount.rate}%`],["Balance projection",selectedAccount.modeled?'Opted-in estimate':'Payments only']]}/>}</section>
        <section><h4>Your hangar loadout · {pictureName}</h4><p><b>Cash Flow:</b> {rate.toFixed(1)} shots per second; each hit uses up to {money(SHOT)}. <b>Capital:</b> your reserve balance funds protection. <b>Collateral:</b> each defense starts at {loadout.assetsMax}% armor. <b>Credit:</b> {view.grade}; the purple radar arc reaches {loadout.radar.toFixed(1)} field units. Rapid fire preserves the existing cash-flow allocation capacity.</p><p>Assist follows only a target you explicitly choose below the field. Moving your aim releases the lock. Autofire fires at your reticle; it does not choose targets.</p><Button variant="ghost" onClick={()=>openInfo("budget")}>Hangar inputs</Button><Button variant="ghost" onClick={()=>openInfo("guide")}>Vi$ion guide</Button></section>
      </div></details>
    </>}

    {!settling&&["review","complete","gameover"].includes(state.phase)&&<main className="dbt-review db31-review">
      <div className="dbt-review-heading"><span className="eyebrow">{state.phase==="review"?`PERIOD ${state.period} CHECKPOINT`:state.phase==="complete"?"MISSION COMPLETE":"GAME OVER"}</span><h3>{state.phase==="review"?"Account for every shot.":state.phase==="complete"?"Four periods survived.":"The final protection failed."}</h3><p>{state.phase==="gameover"?state.gameOverReason:state.phase==="complete"?"Survival is not debt freedom. Review the whole mission—including unpaid obligations and money still available.":"Time is paused. Review payments, preserve your cash, then choose your next move."}</p></div>
      {state.review&&<div className="dbt-review-grid">
        <section><h4>Period {state.period} · income allocation</h4><Facts rows={[["Carried into this period",money(state.review.carriedIncome)],["New income received",money(state.review.incomeReceived)],["Income paid during combat",money(state.review.incomeSpent-state.review.reserveDeposited-(state.review.extraIncomePaid??0))],["Income paid extra at checkpoint",money(state.review.extraIncomePaid??0)],["Income deposited to reserves",money(state.review.reserveDeposited)],["Unallocated income at checkpoint",money(state.review.unallocatedIncome)]]}/><p className="db31-note">Unallocated income remains yours. It carries forward; it is not lost at the next paycheck.</p></section>
        <section><h4>Period {state.period} · obligations &amp; vault</h4><Facts rows={[["Opening reserve balance",money(state.review.startingReserves)],["Reserves used for protection",money(state.review.reserveSpent-(state.review.extraReservePaid??0))],["Reserves paid extra at checkpoint",money(state.review.extraReservePaid??0)],["Ending reserve balance",money(state.review.endingReserves)],["Unpaid this period",money(state.review.arrears)],["Principal / interest split",state.review.accounts.some(a=>a.modeled)?'See opted-in estimates below':'Not projected · payments only']]}/><p className="db31-note">Clearing a squad covers its monthly obligation. It does not mean the account is paid off.</p></section>
        <section><h4>Hangar credit grade · {view.grade}</h4><p>{state.review.gradeReason}</p><Facts rows={[["Defense condition",state.defenses.map((d)=>`${d.condition}%`).join(" / ")],["Current reserve coverage",coverage],["Reserve milestones reached",state.review.earned.length?state.review.earned.map((n:number)=>`${n} mo`).join(", "):"None"]]}/><p className="db31-note">The same payment has the same financial result whether fired in one allocation or several. No accuracy bonus creates money.</p></section>
      </div>}
      {!!state.review?.accounts.length&&<section><h4>Account review · estimated balances only where enabled</h4><div className="db31-account-reviews">{state.review.accounts.map(account=><AccountResult key={account.id} account={account} canPay={state.phase==='review'&&state.arrears===0} onPay={(funding,cents)=>game.replace(extraDebtPayment(state,account.id,funding,cents))}/>)}</div><p className="db31-note">Estimates use opening principal × rate ÷ 12 once per period. Included costs are paid first, then interest, then principal. No new borrowing, rate changes, new fees, or interest on unpaid interest. Partial payments do not earn timing bonuses. Unpaid period obligations are tracked separately and are not added to principal again. Extra payments require all mission obligations to be covered.</p></section>}
      <section className="db31-mission"><h4>Whole mission · {summary.periods} completed period{summary.periods===1?"":"s"}</h4><div className="db31-mission-grid">
        <Facts rows={[["Total income received",money(summary.incomeReceived)],["Income paid to obligations",money(summary.incomePaid)],["Income transferred to reserves",money(summary.deposited)],["Reserves used for obligations",money(summary.reservePaid)],["Total unpaid obligations",money(summary.unpaid)]]}/>
        <Facts rows={[["Income still available",money(summary.incomeRemaining)],["Vault still available",money(summary.reservesRemaining)],["Starting debt · not a payoff forecast",money(source.totalDebt)],["Starting asset value · not spendable cash",money(source.assetValue)],["Cash reconciliation difference",money(summary.cashDifference)]]}/>
      </div><p className="db31-note">Cash check: starting vault + income received = current wallets + obligation payments. Deposits transfer between wallets, so they are not counted again as an expense or income.</p></section>

      {state.phase==="review"&&<>
        <section className="db31-note"><h4>Continue this picture or change it</h4><p>Living costs repeat. Payments-only accounts repeat their entered payment. Estimated accounts stop requiring debt payments after their modeled payoff; included taxes and insurance continue as living costs. Defenses keep their damage between periods.</p><Button variant="outline" onClick={()=>leave(onExit)}>Edit picture in hangar</Button></section>
        <div className="dbt-next"><span>{state.notice}<br/>{money(state.incomeWallet)} carried + {money(state.startingIncome)} next paycheck = {money(state.incomeWallet+state.startingIncome)} available income.</span><Button className="primary-action" onClick={game.next}>Start period {state.period+1}<Play size={17}/></Button></div>
      </>}
      {state.phase!=="review"&&<div className="dbt-final-actions"><Button className="primary-action" onClick={game.reset}><RotateCcw/>Replay this picture</Button><Button variant="outline" onClick={onChallenges}>Corner challenges</Button><Button variant="ghost" onClick={onExit}>Edit picture in hangar</Button></div>}
    </main>}

    <Dialog open={info!==null} onOpenChange={open=>{if(!open)openInfo(null);}}><DialogContent className="dbt-info-dialog"><DialogHeader><DialogTitle>{info==="help"?"Manual turret controls":info==="budget"?`Hangar inputs · ${pictureName}`:"Vi$ion guide · planned"}</DialogTitle><DialogDescription>The battlefield is paused while this panel is open.</DialogDescription></DialogHeader>
      {info==="help"?<div className="db31-help"><p><b>Desktop:</b> move the mouse to aim anywhere on the floor. Hold the primary button to fire.</p><p><b>Touch:</b> drag on the battlefield to aim, then tap or hold FIRE. You can aim and fire with two fingers.</p><p><b>Keyboard:</b> arrows / WASD aim, Space fires, R switches funding, P pauses. Controller: stick aims, right trigger fires, A / B select income / reserves, Start pauses.</p><p><b>Funding:</b> a hit pays up to {money(SHOT)} from the chosen wallet. The green tank accepts income only. Misses spend nothing. Reserve interception pays first; only unresolved amounts can damage defenses.</p><p><b>Accessibility:</b> enable Assist, then choose a target below the field to track it. Manual aim releases that lock. Optional autofire uses your aim, never automatic target selection.</p><p><b>Four pillars:</b> your calculated hangar loadout sets firing rate, starting armor, avatar traits and radar reach. Your entered reserves fund protection. No new financial bonuses.</p></div>:info==="budget"?<><Facts rows={[["Income per period",money(state.startingIncome)],["Monthly living expenses",money(state.baseLiving)],["Monthly debt payments",money(source.monthlyDebtPayments)],["Starting liquid reserves",money(state.initialReserves)],["Starting total debt",money(source.totalDebt)],["Starting asset value",money(source.assetValue)],["Credit score",source.snapshot.inputs.creditScore===null?'Not entered':String(source.snapshot.inputs.creditScore)]]}/><p>This mission uses the selected picture captured when you entered Debtbreaker. Return to the hangar to edit it, then launch again. Game actions do not save financial data or change those inputs.</p></>:<p>Guide chat is not available yet. Use Controls for the current gameplay instructions.</p>}
      <Button onClick={()=>openInfo(null)}>Close</Button></DialogContent></Dialog>
    <Dialog open={!!confirm} onOpenChange={open=>{if(!open)closeConfirm();}}><DialogContent className="dbt-info-dialog"><DialogHeader><DialogTitle>{confirm?.title}</DialogTitle><DialogDescription>{confirm?.description}</DialogDescription></DialogHeader><div className="db31-confirm-actions"><Button variant="outline" onClick={closeConfirm}>Cancel</Button><Button className="primary-action" onClick={()=>{confirm?.accept();closeConfirm();}}>Confirm</Button></div></DialogContent></Dialog>
  </div>;
}
