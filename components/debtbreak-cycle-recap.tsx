"use client";
import {useState} from 'react';
import type {DebtbreakerState} from '@/lib/debtbreaker-engine.js';
import {radarSeconds} from '@/lib/debtbreak-siege.js';
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n%100?2:0}).format(n/100);
export function DebtbreakCycleRecap({state}:{state:DebtbreakerState}){
 const [previous,setPrevious]=useState(false),c=state.continuous!;
 const last=c.summaries.at(-1),recap=previous?last?.learning:c.ground?.learning;
 return <section className="cycle-recap" aria-label="Cycle action recap">
  <div className="cycle-recap-tabs" role="group" aria-label="Recap cycle"><button aria-pressed={!previous} onClick={()=>setPrevious(false)}>This cycle</button><button disabled={!last} aria-pressed={previous} onClick={()=>setPrevious(true)}>Last closed cycle</button></div>
  {!recap?<p>No action breakdown was recorded for this cycle in this checkpoint.</p>:<>
   <p><b>Cycle {recap.cycle}</b> · {recap.complete?'Recorded actions':'Partial record since this checkpoint resumed'}. Payments here include older bills paid during this cycle.</p>
   <dl className="db31-facts"><div><dt>Your payments</dt><dd data-testid="recap-player">{money(recap.playerPaid)}</dd></div><div><dt>Automatic totem debt payments</dt><dd data-testid="recap-totems">{money(recap.totemPaid)}</dd></div><div><dt>Automatic reserve payments</dt><dd>{money(recap.reservePaid)}</dd></div><div><dt>Missed-shot refunds</dt><dd data-testid="recap-refunds">{money(recap.missRefunds)}</dd></div></dl>
   <p className="cycle-recap-note">Your payments include interceptors and manual bill / extra payments. Refunds return to the original wallet; they are not earnings or bill payments.{recap.unusedRefunds>0&&` Unspent funds from connected shots returned ${money(recap.unusedRefunds)}.`}{recap.cancelledReturns>0&&` Ending the run returned ${money(recap.cancelledReturns)} of unused in-flight funds.`}</p>
   <ul className="cycle-recap-corners"><li><b>Cash flow</b> Totems used {money(recap.totemPaid)} of shared income; player payments stayed separate.</li><li><b>Capital</b> You moved {money(recap.deposits)} into reserves.{recap.shieldLosses>0?` Wall spending switched off the goal shield ${recap.shieldLosses} time${recap.shieldLosses===1?'':'s'}.`:' No wall purchase switched off the goal shield in this record.'}</li><li><b>Collateral</b> Walls cost {money(recap.wallSpend)} and added {recap.conditionAdded} game condition; breaches removed {recap.conditionLost}.</li><li><b>Credit</b> This loadout gives {radarSeconds(state).toFixed(1)} seconds of radar warning. These actions do not change the credit score.</li></ul>
  </>}
 </section>;
}
