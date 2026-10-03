"use client";
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {continuousOutflow,type LedgerAction} from '@/lib/debtbreak-continuous.js';
import {groundAssetPlan,groundFunds,MODULE_SALE_BPS} from '@/lib/debtbreak-ground-economy.js';
import type {DebtbreakerState} from '@/lib/debtbreaker-engine.js';
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n/100);
export function GroundDefensePlan({state,act,onSave}:{state:DebtbreakerState;act:(a:LedgerAction)=>void;onSave:()=>void}){
 const g=state.continuous!.ground!,funds=groundFunds(state),quote=groundAssetPlan(state,continuousOutflow(state)),terminal=state.phase!=='playing';
 const [extra,setExtra]=useState(String(g.extraBudget/100)),[savings,setSavings]=useState(String(g.savingsEarmark/100)),[reserve,setReserve]=useState(String(g.reserveAllowance/100)),[page,setPage]=useState(0);
 const values=[extra,savings,reserve].map(v=>Math.round(Number(v)*100)),valid=values.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12);
 const eligible=state.continuous!.accounts.filter(a=>a.method!=='payments'&&a.principal+a.interest+a.fees>0);
 return <section className="ground-plan" aria-label="Ground Defense planning">
  <h4>Four totems. One payment budget.</h4>
  {!terminal&&<div className="ground-strategy" role="group" aria-label="Debt strategy">{(['snowball','avalanche','snowflake'] as const).map(strategy=><Button key={strategy} variant="outline" disabled={strategy==='avalanche'&&!state.continuous!.accounts.some(a=>a.method!=='payments'&&a.rateBps!==null)} aria-pressed={g.strategy===strategy} onClick={()=>act({type:'strategy',strategy})}>{strategy[0].toUpperCase()+strategy.slice(1)}</Button>)}</div>}
  <p>Snowball: smallest modeled balance first. Avalanche: highest known APR first. Snowflake: small extra packets to your chosen target. Minimums come first in every strategy.</p>
  <p>Living costs stay available for your interceptors. Totems cover required debt payments before spending your extra allowance.</p>
  <dl className="db31-facts"><div><dt>Protected living costs</dt><dd>{money(funds.living)}</dd></div><div><dt>Required debt claims</dt><dd>{money(funds.required)}</dd></div><div><dt>Income available to totems</dt><dd data-testid="totem-funds">{money(funds.requiredAvailable)}</dd></div><div><dt>Allocation shortfall</dt><dd>{money(funds.shortfall)}</dd></div></dl>
  {!terminal&&<><div className="ground-plan-inputs">
   <label>Extra debt allowance ($)<Input aria-label="Extra debt allowance" type="number" min="0" step="0.01" value={extra} onChange={e=>setExtra(e.target.value)}/></label>
   <label>Savings set-aside ($)<Input aria-label="Savings set-aside" type="number" min="0" step="0.01" value={savings} onChange={e=>setSavings(e.target.value)}/></label>
   <label>Reserve-defense cap ($)<Input aria-label="Reserve-defense cap" type="number" min="0" step="0.01" value={reserve} onChange={e=>setReserve(e.target.value)}/></label>
  </div><Button disabled={!valid} onClick={()=>act({type:'allocations',extra:values[0],savings:values[1],reserve:values[2]})}>Apply allocations</Button>
  <p className="ground-note">Extra and reserve-defense allowances reset each cycle. Savings set-aside stays in your income wallet until you deposit it. Passive shielding does not spend reserves.</p>
  {g.strategy==='snowflake'&&<label>Snowflake target<Select value={g.targetId??'priority'} onValueChange={value=>act({type:'strategy',strategy:'snowflake',accountId:value==='priority'?undefined:value})}><SelectTrigger aria-label="Snowflake target"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="priority">Last strategy priority</SelectItem>{eligible.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></label>}</>}
  <h4>Grow your outpost</h4>
  <p>Secure the lifestyle footprint and reserves, then add assets. Every seven active modules grows another sector. Best secured sector: <b>{g.bestSector}</b>.</p>
  <dl className="db31-facts"><div><dt>Simulated asset value</dt><dd data-testid="asset-value">{money(quote.value)}</dd></div><div><dt>New module price / value</dt><dd>{money(quote.cost)}</dd></div><div><dt>Added upkeep next cycle</dt><dd>{money(quote.upkeep)}</dd></div><div><dt>Reserves after purchase</dt><dd>{money(quote.after)}</dd></div><div><dt>Required floor after purchase</dt><dd>{money(quote.floor)}</dd></div></dl>
  <Button disabled={terminal||!quote.canBuy} onClick={()=>act({type:'moduleBuy'})}>Build outpost module · {money(quote.cost)}</Button>
  {!quote.canBuy&&!terminal&&<p>Keep {money(quote.floor)} after the purchase to cover the reserve goal and uncovered bills.</p>}
  <p className="ground-note">Fictional game assets: +25 defense condition, fixed book value, no income yield. Repairs restore game condition. Sales cost 8% and remove this module’s defense. Your original financial picture stays separate.</p>
  {g.assets.slice(page*10,page*10+10).map(a=><article key={a.id} className="ground-asset"><div><strong>{a.name}</strong><span>{money(a.value)} value · {money(a.upkeep)} monthly upkeep</span></div><Button variant="outline" disabled={terminal} onClick={()=>act({type:'moduleSell',assetId:a.id})}>Sell · {money(a.value-Math.round(a.value*MODULE_SALE_BPS/10000))} net</Button></article>)}
  {g.assets.length>10&&<div className="ground-pagination"><Button disabled={page===0} onClick={()=>setPage(n=>n-1)}>Previous</Button><span>Assets {page*10+1}–{Math.min((page+1)*10,g.assets.length)}</span><Button disabled={(page+1)*10>=g.assets.length} onClick={()=>setPage(n=>n+1)}>Next</Button></div>}
  <p>{g.incidentCount} surprise events this run. Upkeep and unpaid incidents remain visible in Issued requirements. Sale proceeds: {money(g.salesNet)} net.</p>
  {!terminal&&<div className="ground-run-actions"><Button variant="outline" onClick={onSave}>Save local checkpoint</Button><Button variant="outline" onClick={()=>act({type:'endRun'})}>End run and review</Button></div>}
 </section>;
}
