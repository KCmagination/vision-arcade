"use client";
import type {DebtbreakerState} from '@/lib/debtbreaker-engine.js';
import type {LedgerAction} from '@/lib/debtbreak-continuous.js';
import {groundReadiness} from '@/lib/debtbreak-readiness.js';
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n%100?2:0}).format(n/100);
export function DebtbreakReadiness({state,act}:{state:DebtbreakerState;act:(a:LedgerAction)=>void}){
 const q=groundReadiness(state);
 return <div className="ground-ready" role="group" aria-label="Reserve-funded upgrades">
  {(['wall','module'] as const).map(kind=>{const quote=q[kind],wall=kind==='wall',complete=wall&&q.wall.complete;
   return <button key={kind} data-testid={`ready-${kind}`} disabled={!quote.ready||complete} onClick={()=>act({type:wall?'expand':'moduleBuy',source:'reserve'})}>
    <span><b>{wall?'WALL':'OUTPOST'}</b> {complete?'Built':quote.ready?`READY · ${money(quote.cost)}`:`Save ${money(quote.shortfall)} more`}</span>
    <progress aria-label={`${wall?'Wall':'Outpost'} affordability`} max={1} value={complete?1:quote.progress}/>
    <small>{complete?'Lifestyle footprint complete':quote.ready?`After: ${money(quote.after)} reserves${wall&&q.wall.losesShield?' · Shield OFF':wall?'':' · +'+money(q.module.upkeep)+'/cycle'}`:wall?'Keeps uncovered bills protected':'Keeps reserve goal + bills protected'}</small>
   </button>;
  })}
 </div>;
}
