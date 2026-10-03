"use client";
import {useEffect,useRef} from 'react';
import type {DebtbreakerState} from '@/lib/debtbreaker-engine.js';
import {reserveCoverage,recurringOutflow} from '@/lib/debtbreaker-engine.js';
import {livingPressure,savingsGuide,collateralGuide,creditGuide} from '@/lib/debtbreak-command-learning.js';
const dollars=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export function MoneyPicture({kind}:{kind:'wallet'|'savings'|'shield'|'home'|'paycheck'|'bill'}){
 const paths={paycheck:'M3 3h18v12H3z M7 7h3 M14 11h3 M12 16v6 M9 19l3 3 3-3',bill:'M5 2l2 2 2-2 3 2 3-2 2 2 2-2v20l-3-2-4 2-4-2-3 2z M8 8h8 M8 12h8 M8 16h5',wallet:'M3 7h18v13H3z M3 7V4h15v3 M16 12h5v4h-5z',savings:'M3 10l9-7 9 7 M5 11v8 M10 11v8 M15 11v8 M20 11v8 M2 21h20',shield:'M12 2l9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6z M7 12l3 3 7-7',home:'M2 11L12 2l10 9 M5 9v12h14V9 M10 21v-7h4v7'};
 return <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]}/></svg>;
}
export function CommandGuides({state,reduced}:{state:DebtbreakerState;reduced:boolean}){
 const pressure=livingPressure(state),savings=savingsGuide(reserveCoverage(state),recurringOutflow(state)),collateral=collateralGuide(state),credit=creditGuide(state);
 const creditElement=useRef<HTMLElement>(null),wasUnlocked=useRef(credit.unlocked);
 useEffect(()=>{
  if(credit.unlocked&&!wasUnlocked.current&&!reduced)creditElement.current?.animate?.([{boxShadow:'0 0 0 0 #c5a1ff00'},{boxShadow:'0 0 22px 4px #c5a1ff99'},{boxShadow:'0 0 0 0 #c5a1ff00'}],{duration:1100,iterations:1});
  wasUnlocked.current=credit.unlocked;
 },[credit.unlocked,reduced]);
 const angle=Math.PI*(1-(collateral.heat??0)),pressureLabel=pressure.ratio!==null?`${Math.round(pressure.ratio*100)}%`:pressure.kind==='no-income'?'No income':pressure.kind==='neutral'?'No costs or income':'Not entered';
 return <section className="command-guides" aria-label="Four financial learning guides">
  <article><h3><MoneyPicture kind="home"/> Living-cost pressure</h3><strong data-testid="living-pressure">{pressureLabel}</strong><p>Entered monthly living costs ÷ monthly income.</p><small>The dotted field line is a ruler, not a wall. Debt payments are excluded; this is not DTI.</small></article>
  <article><h3><MoneyPicture kind="savings"/> Savings runway</h3><strong data-testid="savings-runway">{savings.months===null?'No monthly cost basis':`${(Math.floor(savings.months*10)/10).toFixed(1)} months`}</strong><ol className="command-milestones" aria-label="Savings milestones">{savings.markers.map(marker=><li key={marker.value} data-reached={marker.reached} aria-label={`${marker.value} months ${marker.reached?'reached':'not reached'}`}><span>{marker.reached?'✓':'○'}</span>{marker.value}<small>mo</small></li>)}</ol><small>Current game savings ÷ recurring living costs, debt payments and upkeep. Milestones are markers, not advice.</small></article>
  <article ref={creditElement} data-unlocked={credit.unlocked} className="command-credit"><h3><MoneyPicture kind="shield"/> Credit habits</h3><strong data-testid="credit-learning">{credit.unlocked?'VISUAL UPGRADE EARNED':credit.hasDebt?`${credit.periods} on-time billing cycles`:'No debt payments to track'}</strong><progress aria-label="Credit learning progress" max={1} value={credit.progress}/><small>Three segments: one per on-time credit billing cycle; up to one for net reduction of tracked opening debt. {credit.balanceKnown?`${Math.round(credit.reduction*100)}% best net reduction.`:'Balance reduction is unavailable in payment-only mode.'} Game progress only; your credit score and APR stay unchanged.</small></article>
  <article><h3><MoneyPicture kind="home"/> Collateral heat</h3><div className="command-heat"><svg role="img" aria-label={collateral.heat===null?'Collateral gauge unavailable':`Debt-to-asset exposure ${Math.round(collateral.heat*100)}% of gauge`} viewBox="0 0 100 55"><path d="M10 46a40 40 0 0 1 80 0" fill="none" stroke="#ffbe6c" strokeWidth="7"/><path d="M78 18a40 40 0 0 1 12 28" fill="none" stroke="#ff807e" strokeWidth="7"/>{collateral.heat!==null&&<line x1="50" y1="46" x2={50+34*Math.cos(angle)} y2={46-34*Math.sin(angle)} stroke="#fff" strokeWidth="3"/>}<circle cx="50" cy="46" r="4" fill="#fff"/></svg><strong data-testid="collateral-heat">{collateral.kind==='negative'?'MAX · Negative equity':collateral.kind==='zero'?'No equity':collateral.kind==='positive'?`${Math.round((collateral.ratio??0)*100)}% debt / assets`:collateral.kind==='no-assets'?'No equity · no asset-value basis':'Not entered'}</strong></div><small>{collateral.equity!==null?`${dollars(collateral.equity)} captured equity. `:''}Total debt ÷ entered asset resale value; not a property LTV or damage meter. Base hits never change this picture.</small></article>
 </section>;
}
