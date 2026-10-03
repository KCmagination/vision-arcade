"use client";
import {Droplets,House,Moon,Shirt,HeartPulse,Users,Sparkles} from 'lucide-react';
import {CommandGuides,MoneyPicture} from './debtbreak-command-guides';
import {budgetGuide} from '@/lib/debtbreak-command-learning.js';
import {useState,useRef,useEffect} from 'react';
import type {useDebtbreakerController} from './debtbreaker-controller';
import {DebtbreakSiegeField} from './debtbreak-siege-field';
import {COMMAND_GUNS,COMMAND_PADS,COMMAND_NEEDS,NEED_COLORS,commandStats,commandUpgrade,commandCoverage} from '@/lib/debtbreak-command.js';
import {capitalShield,continuousSummary,type LedgerAction} from '@/lib/debtbreak-continuous.js';
import {paydayClock,INTERRUPTION_NOTICE} from '@/lib/debtbreak-clock.js';
const cash=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n%100?2:0}).format(n/100);
const NeedIcons=[Droplets,House,Moon,Shirt,HeartPulse,Users,Sparkles];
type Game=ReturnType<typeof useDebtbreakerController>;
export function DebtbreakBaseDefense({game,onExit,onClassic}:{game:Game;onExit:()=>void;onClassic:()=>void}){
 const {state,world}=game,c=state.continuous!,g=c.ground!,command=g.command!,summary=continuousSummary(state),shield=capitalShield(state);
 const [transfer,setTransfer]=useState('0');
 const capInput=useRef<HTMLInputElement>(null),keyboard=useRef(false),lastPeriod=useRef(state.period),focusBudget=useRef(false);
 useEffect(()=>{if(lastPeriod.current!==state.period&&command.stage==='build'){lastPeriod.current=state.period;if(keyboard.current)capInput.current?.focus();}if(focusBudget.current){focusBudget.current=false;capInput.current?.focus();}});
 const [selected,setSelected]=useState(0),[editing,setEditing]=useState(true),root=useRef<HTMLDivElement>(null);
 const emptyDraft={period:state.period,budget:'0',reserve:'0',enabled:false};
 const [draft,setDraft]=useState(emptyDraft),currentDraft=draft.period===state.period?draft:emptyDraft;
 const {budget,reserve,enabled:reserveEnabled}=currentDraft;
 const setBudget=(budget:string)=>setDraft(previous=>({...(previous.period===state.period?previous:emptyDraft),budget}));
 const setReserve=(reserve:string)=>setDraft(previous=>({...(previous.period===state.period?previous:emptyDraft),reserve}));
 const setReserveEnabled=(enabled:boolean)=>setDraft(previous=>({...(previous.period===state.period?previous:emptyDraft),enabled}));
 const tower=command.towers[selected],stats=commandStats(state,tower),coverage=commandCoverage(state),terminal=['complete','gameover'].includes(state.phase);
 const setup=command.stage!=='combat',showSetup=!terminal&&(setup||editing),allPlaced=command.towers.every(t=>t.pad!==null);
 const shortfall=Math.max(0,summary.unpaid-Math.min(command.allowance,state.incomeWallet)-Math.min(g.reserveAllowance,Math.max(0,state.reserves)));
 const condition=state.defenses.filter(d=>d.owned).reduce((n,d)=>n+d.condition,0),maximum=state.defenses.filter(d=>d.owned).reduce((n,d)=>n+(d.maxCondition??100),0);
 const repairSource=state.reserves>=1000?'reserve':'income';
 const repair=state.defenses.find(d=>d.owned&&d.condition<(d.maxCondition??100)),repairPoints=repair?Math.min(10,(repair.maxCondition??100)-repair.condition,Math.floor(Math.max(0,repairSource==='reserve'?state.reserves:state.incomeWallet)/1000)):0;
 const act=(a:LedgerAction)=>game.action({...a,seq:world.current.ledger.continuous!.ground!.actionSerial+1});
 const selectGun=(index:number)=>{setSelected(index);game.selectGun(index);};
 const amounts=[budget,reserve].map(x=>Math.round(Number(x)*100)),valid=amounts.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12);
 const preview=budgetGuide(state,amounts[0],reserveEnabled?amounts[1]:0,summary.unpaid),transferCents=Math.round(Number(transfer)*100),canTransfer=Number.isSafeInteger(transferCents)&&transferCents>0&&transferCents<=state.incomeWallet;
 const openSetup=()=>{focusBudget.current=keyboard.current;game.pause();setBudget(String(command.allowance/100));setReserve(String(g.reserveAllowance/100));setReserveEnabled(c.autoProtect);setEditing(true);};
 const start=()=>{act({type:'commandBudget',amount:amounts[0],reserve:reserveEnabled?amounts[1]:0});act({type:'commandLaunch'});setEditing(false);requestAnimationFrame(()=>{if(root.current){root.current.scrollTop=0;const controls=root.current.querySelector('.command-controls');if(controls)controls.scrollTop=0;root.current.querySelector<HTMLCanvasElement>('canvas.siege-canvas')?.focus({preventScroll:true});}});};
 return <div ref={root} onKeyDownCapture={()=>{keyboard.current=true;}} onPointerDownCapture={()=>{keyboard.current=false;}} className="command-shell" data-stage={command.stage} data-phase={state.phase}>
  <header className="command-header"><div><b>DEBTBREAK</b><span>Automated base defense · wave {Math.min(3,state.period)}/3</span></div><nav><button onClick={game.toggleSound}>{game.sound?'Mute':'Sound'}</button><button onClick={()=>{game.pause();onExit();}}>Exit to hangar</button></nav></header>
  <section className="command-hud" aria-label="Live defense accounts">
   <span><MoneyPicture kind="wallet"/>Cash available now <b data-testid="command-income">{cash(state.incomeWallet)}</b><small>Spendable cash, including carryover</small></span><span><MoneyPicture kind="paycheck"/>Income per cycle <b>{cash(state.startingIncome)}</b><small>Each 30-day game cycle</small></span><span><MoneyPicture kind="savings"/>Saved reserves <b data-testid="command-reserve">{cash(state.reserves)}</b></span>
   <span>Authorized spending cap <b data-testid="command-budget">{cash(command.allowance)}</b></span><span><MoneyPicture kind="bill"/>Bills left this wave <b data-testid="command-unpaid">{cash(summary.unpaid)}</b></span>
   <span>Base <b data-testid="command-condition">{Math.round(condition/Math.max(1,maximum)*100)}%</b></span><span>Wave clock <b data-testid="command-clock">{paydayClock(state).time}</b></span>
  </section>
  <div className="command-main"><section className="command-view">
   <div className="command-field"><DebtbreakSiegeField key={game.sceneKey} world={world} onReady={game.onReady} onFailure={game.onFailure} onGesture={game.gesture} reduced={game.reduced} onPad={pad=>act({type:'commandPlace',tower:selected,pad})}/>
    {(setup||state.paused||terminal)&&<div className="command-banner">{terminal?state.phase==='complete'?'THREE WAVES SECURED':'DEFENSE ENDED':setup?command.stage==='build'?'BUILD & REBALANCE':'PLACE YOUR FOUR DEFENSES':'PAUSED'}</div>}
   </div>
   <ol className="command-needs" aria-label="Seven needs protected by one shared base">{COMMAND_NEEDS.map((need,i)=><li key={need} style={{borderColor:NEED_COLORS[i]}}><b style={{color:NEED_COLORS[i]}}>{i+1}</b> {(() => {const Icon=NeedIcons[i];return <Icon aria-hidden="true" size={16}/>;})()} {need}</li>)}</ol>
   <div className="command-status" aria-live="polite">{terminal?state.gameOverReason??'All issued obligations covered. No kill-bounty income.':state.paused&&state.notice===INTERRUPTION_NOTICE?INTERRUPTION_NOTICE:c.rescue?`Base down: ${Math.ceil(c.rescue.remainingSeconds)} active seconds to repair the base. Pause to recover.`:summary.unpaid===0?'Bills covered. Finishing the quiet calendar at 8×; the build window pauses automatically.':shortfall>0?command.allowance===0&&state.incomeWallet>0?`${cash(state.incomeWallet)} cash is available. Authorize a spending cap in Budget / setup to defend bills.`:`${cash(shortfall)} payment shortfall against authorized funds. Armor damage cannot erase an unfunded bill.`:state.paused?'Time is frozen. Configure, then launch or resume.':'Automatic combat active. Hit durability and dollars owed are separate.'}</div>
   {command.lastImpact&&<p className="command-impact-receipt" role="status" data-testid="command-impact-receipt">Impact: {command.lastImpact.label}. Cash paid {cash(command.lastImpact.incomePaid)}; reserves paid {cash(command.lastImpact.reservePaid)}. After impact: cash available {cash(command.lastImpact.income)}, reserves {cash(command.lastImpact.reserves)}; this obligation still owes {cash(command.lastImpact.remaining)}. Base condition −{command.lastImpact.damage} (repairable).</p>}
    <div className="command-live-actions">{!terminal&&<><button onClick={openSetup}>Budget / setup</button><button disabled={setup} onClick={()=>{setEditing(false);game.toggle();}}>{state.paused?'Resume':'Pause'}</button><button aria-pressed={!!command.manualAssist} onClick={()=>act({type:'commandAssist',enabled:!command.manualAssist})}>Manual assist {command.manualAssist?'ON':'OFF'}</button></>}{terminal&&<button onClick={game.reset}>Retry / new setup</button>}</div>
   <small>Ground: armored debt transports. Air: bill drones. Bars count armor hits; dollars show unpaid packets. All guns share the authorized cash cap. Seven sections share one base health pool.</small>
  </section><aside className="command-controls" aria-label="Defense controls">
   {showSetup&&<section className="command-budget-editor">
    <h3>Your money → your defense</h3>
    {setup&&<button onClick={()=>act({type:'commandPreset'})}>Use recommended pads</button>}
    <div className="command-money-step"><b>1 · Two places for your cash</b>
     <div className="command-wallet-pictures"><span><MoneyPicture kind="wallet"/>Cash available now<strong>{cash(state.incomeWallet)}</strong><small>Spendable balance</small></span><span><MoneyPicture kind="savings"/>Saved reserves<strong>{cash(state.reserves)}</strong><small>Backup stays separate</small></span></div>
     <div className="command-paycheck"><MoneyPicture kind="paycheck"/><span>Income per cycle <b>{cash(state.startingIncome)}</b><small>Cycle opened with {cash(state.carriedIncome)} carryover + {cash(state.startingIncome)} income.</small></span></div>
    </div>
    <div className="command-money-step"><b>2 · Set a spending limit</b>
     <div className="command-cap-row"><label>Cash defense may spend ($)<input ref={capInput} aria-label="Cash defense may spend" type="number" min="0" step="0.01" value={budget} onChange={e=>setBudget(e.target.value)}/></label><button onClick={()=>{const n=Math.min(summary.unpaid,Math.max(0,state.incomeWallet));setBudget(String(n/100));act({type:'commandBudget',amount:n,reserve:g.reserveAllowance});}}>Use cash for bills</button></div>
     <small>A cap on the wallet above, not another account.</small>
     <label className="command-check"><input type="checkbox" checked={reserveEnabled} disabled={state.reserves<=0} onChange={e=>{setReserveEnabled(e.target.checked);if(!e.target.checked)act({type:'commandBudget',amount:command.allowance,reserve:0});}}/>Use savings as impact backup</label>
     {reserveEnabled&&<label>Savings backup limit ($)<input aria-label="Reserve impact cap" type="number" min="0" step="0.01" disabled={state.reserves<=0} value={reserve} onChange={e=>setReserve(e.target.value)}/></label>}
    </div>
    <div className="command-money-step command-budget-result" data-testid="budget-preview"><b>3 · See what would remain</b>
     <div><MoneyPicture kind="wallet"/><span>Cash left <strong>{cash(preview.spendingLeft)}</strong></span><MoneyPicture kind="savings"/><span>Savings left <strong>{cash(preview.savingsLeft)}</strong></span></div>
     <p><MoneyPicture kind="bill"/>{cash(preview.incomeSpend)} cash + {cash(preview.reserveSpend)} savings toward {cash(summary.unpaid)} bills.</p>
     <small>{preview.shortfall>0?cash(preview.shortfall)+' in bills remains outside this plan.':'Current bills fit this plan.'} Repairs and upgrades are extra.</small>
    </div>
    <div className="command-plan-actions"><button disabled={!valid} onClick={()=>act({type:'commandBudget',amount:amounts[0],reserve:reserveEnabled?amounts[1]:0})} aria-label="Apply explicit budgets">Apply cap</button><button className="command-launch" disabled={!game.ready||!allPlaced||!valid||!(Math.min(amounts[0],state.incomeWallet)>0||reserveEnabled&&Math.min(amounts[1],state.reserves)>0||summary.unpaid===0)} onClick={start}>{setup?'Launch automatic wave':'Resume with this budget'}</button></div>
    {!allPlaced&&<p>Use the recommended pads, or place four guns.</p>}
    <details><summary>How these amounts relate</summary><p>Cash available now includes money carried over from earlier cycles. Income per cycle is the recurring payday amount, not a second wallet. Saved reserves carry forward separately. Launch applies the limits above; authorization does not move money. No reserves are needed to play.</p><p>The preview covers current bills only. A repair, upgrade or newly issued cost changes what remains. Passive goal shield: {shield.charged?'ON':'OFF'} at {cash(shield.goal)}; it spends no cash. Spending permission resets each wave.</p></details>
    <details className="command-save-transfer"><summary>Move cash into savings</summary><label>Transfer to savings ($)<input aria-label="Transfer to savings" type="number" min="0" step="0.01" value={transfer} onChange={e=>setTransfer(e.target.value)}/></label><p>{canTransfer?`Cash −${cash(transferCents)} → savings +${cash(transferCents)}. Total cash stays ${cash(state.incomeWallet+state.reserves)}.`:"Choose an amount within available spending cash."}</p><button disabled={!canTransfer} onClick={()=>{act({type:'deposit',amount:transferCents});setTransfer('0');}}>Move to savings</button><small>Moving money is not income. It reduces spending cash.</small></details>
   </section>}
   <CommandGuides key={game.sceneKey} state={state} reduced={game.reduced}/>
   <div className="command-guns">{COMMAND_GUNS.map((gun,index)=>{const t=command.towers[index],quote=commandUpgrade(state,index),loses=shield.charged&&quote.after<shield.goal;return <article key={gun.key} style={{borderColor:gun.color}}>
    <button className="command-select" aria-pressed={selected===index} onClick={()=>selectGun(index)}><span className="command-gun-art" aria-hidden="true" style={{backgroundPosition:`${index%2*100}% ${Math.floor(index/2)*100}%`}}/><b style={{color:gun.color}}>{gun.label}</b><span>Level {t.level} · {t.pad===null?'Unplaced':`Pad ${t.pad+1}`}</span></button>
    <progress aria-label={`${gun.label} upgrade affordability`} value={quote.progress} max={1}/><button data-testid={`upgrade-${gun.key}`} disabled={terminal||!quote.ready} onClick={()=>act({type:'commandUpgrade',tower:index})}>{terminal?'Run ended':quote.maxed?'MAX LEVEL':quote.ready?`Upgrade · ${cash(quote.cost)}`:`Need ${cash(Math.max(0,quote.cost-state.reserves))}`}</button>
    <small>{gun.benefit}{!quote.maxed&&` · after ${cash(quote.after)} reserves`}{loses&&!quote.maxed?' · GOAL SHIELD OFF':''}</small>
   </article>;})}</div>
   {!terminal&&<details className="command-tactics"><summary>Placement and targeting</summary><section className="command-selected"><h3>{COMMAND_GUNS[selected].label} · {COMMAND_GUNS[selected].role}</h3><p>{stats.damage} armor damage · {stats.cooldown.toFixed(2)}s reload · {Math.round(stats.range)} range. Dashed ring previews coverage.</p>
    <label>Place {COMMAND_GUNS[selected].label}<select aria-label={`Place ${COMMAND_GUNS[selected].label}`} value={tower.pad??''} disabled={!setup} onChange={e=>act({type:'commandPlace',tower:selected,pad:Number(e.target.value)})}><option value="" disabled>Choose a build pad</option>{COMMAND_PADS.map((pad,i)=><option key={i} value={i} disabled={command.towers.some((t,j)=>j!==selected&&t.pad===i)}>{pad.label}</option>)}</select></label>
    <label>Target priority<select aria-label="Gun target priority" value={tower.priority} onChange={e=>act({type:'commandPriority',tower:selected,strategy:e.target.value})}><option value="nearest">Nearest impact</option><option value="due">Earliest due date</option><option value="largest">Largest unpaid packet</option></select></label>

    {allPlaced&&(!coverage.ground.every(Boolean)||!coverage.air.every(Boolean))&&<p className="command-warning">Coverage gap: {coverage.ground.map((covered,i)=>covered?'':`ground ${i+1}`).filter(Boolean).join(', ')} {!coverage.air.every(Boolean)&&'air approach'}. You may launch, but those paths are exposed.</p>}
   </section></details>}
   {!terminal&&<div className="command-recovery"><button disabled={!repairPoints} onClick={()=>act({type:'repair',source:repairSource,points:repairPoints})}>Repair +{repairPoints} · {cash(repairPoints*1000)} {repairSource==='income'?'spending cash':'saved reserves'}</button><button onClick={game.saveCheckpoint}>Save local checkpoint</button></div>}
   {command.lastWave&&<p>Wave {command.lastWave.cycle}: {cash(command.lastWave.paid)} cash payments; {cash(command.lastWave.unpaid)} unpaid at close.</p>}
   <details><summary>Accounting & arcade rules</summary><p>Cash Flow changes reload speed; Capital changes heavy-hit damage; Collateral changes ground armor damage; Credit changes air coverage. These read your existing corner strengths. Unknown uses a neutral arcade setting. No gun predicts a credit-score change. Gun upgrades are fictional equipment costs.</p><p>Missed or armor-only manual shots return unused funds. Shared obligations are paid once; unpaid packets return. Due dates, interest and fees follow the existing calendar. Three waves form this mission.</p><p>Cash reconciliation: <b data-testid="command-reconciliation">{cash(summary.cashDifference)}</b>. Last event: {state.notice}</p><button onClick={()=>{game.pause();onClassic();}}>Open classic game</button></details>
  </aside></div>
 </div>;
}

