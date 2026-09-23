"use client";

import {useState} from 'react';
import {Plus,Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {CurrentInputs} from '@/lib/vision-contract.js';
import {emptySetup,detailTotals,reconcileSetup,validateSetup,DETAIL_LIMIT,type AdvancedSetup,type DebtEntry,type ReconcileChoices} from '@/lib/advanced-finances.js';
import './advanced-financial-setup.css';

const dollars=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n/100);
const types=[['credit-card','Credit card / revolving'],['mortgage','Mortgage'],['auto','Auto loan'],['personal','Personal loan'],['student','Student loan'],['other','Other']];
const nextRowId=(draft:AdvancedSetup)=>{const used=new Set([...draft.debts,...draft.expenses].map(row=>row.id));let n=1;while(used.has(`entry-${n}`))n++;return `entry-${n}`;};
function Pick({label,value,options,onChange}:{label:string;value:string;options:string[][];onChange:(value:string)=>void}){
  return <label className="adv-field"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{options.map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></label>;
}
function Amount({label,value,onChange,optional=false,step='0.01'}:{label:string;value:number|null;onChange:(n:number|null)=>void;optional?:boolean;step?:string}){
  return <label className="adv-field"><span>{label}</span><Input type="number" min="0" step={step} inputMode="decimal" aria-label={label} placeholder={optional?'Unknown':'Required'} value={value??''} onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))}/></label>;
}
function Check({id,checked,onChange,children}:{id:string;checked:boolean;onChange:(n:boolean)=>void;children:React.ReactNode}){
  return <label className="adv-check" htmlFor={id}><Checkbox id={id} checked={checked} onCheckedChange={n=>onChange(n===true)}/><span>{children}</span></label>;
}

export function AdvancedFinancialSetup({current,value,onApply,onClose,onClear}:{current:CurrentInputs;value:AdvancedSetup|null;onApply:(inputs:CurrentInputs,value:AdvancedSetup)=>void;onClose:()=>void;onClear:()=>void}){
  const [draft,setDraft]=useState<AdvancedSetup>(()=>structuredClone(value??emptySetup()));
  const [choices,setChoices]=useState<ReconcileChoices>({totalDebt:'keep',monthlyDebtPayments:'keep',monthlyLivingExpenses:'keep'});
  const [error,setError]=useState('');
  const totals=detailTotals(draft),errors=validateSetup(draft);
  const changeDebt=(id:string,change:Partial<DebtEntry>)=>setDraft(s=>({...s,debts:s.debts.map(d=>d.id===id?{...d,...change}:d)}));
  const addDebt=()=>setDraft(s=>({...s,debts:[...s.debts,{id:nextRowId(s),name:'',type:'credit-card',balance:null,payment:null,rate:null,rateKind:'unknown',term:null,otherPayment:null,secured:false,model:false}]}));
  const apply=()=>{try{const result=reconcileSetup(current,draft,choices);onApply(result.inputs,result.setup);}catch(e){setError((e as Error).message);}};
  const labels={totalDebt:'Total debt',monthlyDebtPayments:'Debt payments',monthlyLivingExpenses:'Living expenses'};
  const exceeds=(Object.keys(choices) as (keyof ReconcileChoices)[]).some(k=>choices[k]==='keep'&&totals[k]>Math.round(current[k]*100));
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="advanced-dialog"><DialogHeader><DialogTitle>Advanced: debts &amp; living costs</DialogTitle><DialogDescription>Add the details you know. Review totals, then apply them to My picture. Entries last for this session; refreshing clears them.</DialogDescription></DialogHeader>
    <div className="adv-scroll">
      <label className="adv-date">Picture date<Input aria-label="Picture date" type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label>
      <section className="adv-section"><div className="adv-heading"><div><h3>Debt accounts</h3><p>{draft.debts.length} entered · count each account once</p></div><Button variant="outline" onClick={addDebt} disabled={draft.debts.length>=DETAIL_LIMIT}><Plus size={16}/>Add debt</Button></div>
        {!draft.debts.length&&<p className="adv-empty">No accounts added. Your hangar debt and payment totals can stay as unspecified debt.</p>}
        {draft.debts.map((d,i)=><fieldset className="adv-row" key={d.id}><legend>Debt {i+1}{d.name?` · ${d.name}`:''}</legend><div className="adv-row-actions"><Button variant="ghost" aria-label={`Remove debt ${i+1}`} onClick={()=>setDraft({...draft,debts:draft.debts.filter(x=>x.id!==d.id)})}><Trash2 size={16}/>Remove</Button></div>
          <div className="adv-fields"><label className="adv-field"><span>Nickname</span><Input aria-label={`Debt ${i+1} nickname`} maxLength={48} placeholder={`Debt ${i+1}`} value={d.name} onChange={e=>changeDebt(d.id,{name:e.target.value})}/></label><Pick label={`Debt ${i+1} type`} value={d.type} options={types} onChange={type=>changeDebt(d.id,{type,secured:type==='mortgage'||type==='auto'?true:d.secured})}/><Amount label={`Debt ${i+1} balance ($)`} value={d.balance} onChange={balance=>changeDebt(d.id,{balance})}/><Amount label={`Debt ${i+1} monthly payment ($)`} value={d.payment} onChange={payment=>changeDebt(d.id,{payment})}/></div>
          <Check id={`secured-${d.id}`} checked={d.secured} onChange={secured=>changeDebt(d.id,{secured})}>Secured by an asset</Check>
          <details className="adv-optional"><summary>Optional rate, term &amp; estimate</summary><div className="adv-fields"><Amount label={`Debt ${i+1} ${d.type==='credit-card'?'purchase APR':'interest rate'} (%)`} optional value={d.rate} onChange={rate=>changeDebt(d.id,{rate})}/><Pick label={`Debt ${i+1} rate type`} value={d.rateKind} options={[["unknown","Unknown"],["fixed","Fixed / held constant"],["variable","Variable"]]} onChange={rateKind=>changeDebt(d.id,{rateKind:rateKind as DebtEntry['rateKind']})}/><Amount label={`Debt ${i+1} months remaining`} optional step="1" value={d.term} onChange={term=>changeDebt(d.id,{term})}/><Amount label={`Debt ${i+1} included taxes, insurance or fees ($)`} optional value={d.otherPayment} onChange={otherPayment=>changeDebt(d.id,{otherPayment})}/></div>
            <p>Use the loan interest rate, not a mortgage’s fee-inclusive APR. Included taxes, insurance and fees are part of the payment above; enter 0 if none. Do not add them again as living costs.</p>
            <Check id={`model-${d.id}`} checked={d.model} onChange={model=>changeDebt(d.id,{model})}>Allow a monthly estimate for this account</Check><p>Requires a known rate held constant and a known non-debt portion. For cards, this models an existing carried balance, without a grace period or new purchases. A blank rate is unknown; 0% means zero interest.</p>
          </details>
        </fieldset>)}
      </section>
      <section className="adv-section"><div className="adv-heading"><div><h3>Monthly living costs</h3><p>These become named Utilitank groups.</p></div><Button variant="outline" disabled={draft.expenses.length>=DETAIL_LIMIT} onClick={()=>setDraft(s=>({...s,expenses:[...s.expenses,{id:nextRowId(s),name:'',amount:null}]}))}><Plus size={16}/>Add living cost</Button></div>
        <p>Rent, utilities, food, transport, medical, childcare or other costs. Exclude the debt payments above and paycheck deductions. Do not count a card purchase and its settlement transfer as two expenses.</p>
        {!draft.expenses.length&&<p className="adv-empty">No categories added. Your existing living-cost total remains available.</p>}
        {draft.expenses.map((e,i)=><div className="adv-cost" key={e.id}><label className="adv-field"><span>Category / nickname</span><Input aria-label={`Living cost ${i+1} name`} maxLength={48} value={e.name} placeholder="e.g. Utilities" onChange={ev=>setDraft({...draft,expenses:draft.expenses.map(x=>x.id===e.id?{...x,name:ev.target.value}:x)})}/></label><Amount label={`Living cost ${i+1} monthly amount ($)`} value={e.amount} onChange={amount=>setDraft({...draft,expenses:draft.expenses.map(x=>x.id===e.id?{...x,amount}:x)})}/><Button variant="ghost" aria-label={`Remove living cost ${i+1}`} onClick={()=>setDraft({...draft,expenses:draft.expenses.filter(x=>x.id!==e.id)})}><Trash2 size={16}/></Button></div>)}
      </section>
      <section className="adv-section adv-reconcile"><h3>Review your totals</h3><p>Choose what happens to each hangar total. Only positive differences can remain unspecified.</p>
        {(Object.keys(choices) as (keyof ReconcileChoices)[]).map(key=><div className="adv-total" key={key}><div><h4>{labels[key]}</h4><p>Hangar <b>{dollars(Math.round(current[key]*100))}</b> · Details <b>{dollars(totals[key])}</b></p><p>{choices[key]==='update'?`New total: ${dollars(totals[key])}`:totals[key]<=Math.round(current[key]*100)?`${dollars(Math.round(current[key]*100)-totals[key])} stays unspecified`:'Details exceed the hangar. Update the total or correct your rows.'}</p></div><Pick label={`${labels[key]} reconciliation`} value={choices[key]} options={[["keep","Keep hangar total"],["update","Use detailed total"]]} onChange={v=>setChoices({...choices,[key]:v as 'keep'|'update'})}/></div>)}
      </section>
      <section className="adv-section"><Check id="enable-estimates" checked={draft.estimates} onChange={estimates=>setDraft({...draft,estimates})}>Enable monthly estimates for opted-in accounts</Check><p>Each period adds opening principal × annual rate ÷ 12, rounded to cents. Payments cover included costs, then accrued interest, then principal. Extra payments happen at checkpoints. No new borrowing, rate changes, fees or interest on unpaid interest are assumed. Remaining term is context, not a promise of payoff. Unsupported accounts stay payments-only.</p><p>These game estimates never change your entered balances, credit grade or the calculator’s formulas.</p></section>
      {(error||errors.length>0)&&<div role="alert" className="adv-errors">{error||errors.join(' ')}</div>}
    </div>
    <footer className="adv-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button>{value&&<Button variant="outline" onClick={onClear}>Use totals only</Button>}<Button className="primary-action" disabled={errors.length>0||exceeds} onClick={apply}>Apply to My picture</Button></footer>
  </DialogContent></Dialog>;
}
