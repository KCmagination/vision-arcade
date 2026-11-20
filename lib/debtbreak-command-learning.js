// Educational presentation only. These readings never authorize cash or change scores.
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=n=>Math.max(0,Math.min(1,n));
export const SAVINGS_MARKERS=Object.freeze([1,3,6,9,12]);
export function livingPressure(s){
 const inputs=s.hangar?.snapshot?.inputs;
 const income=inputs?inputs.monthlyIncome:s.startingIncome/100;
 const living=inputs?inputs.monthlyLivingExpenses:s.continuous.living.reduce((n,e)=>n+e.amount,0)/100;
 if(!finite(income)||!finite(living))return {kind:'unknown',ratio:null,position:null,income,living};
 if(income<=0)return {kind:living>0?'no-income':'neutral',ratio:null,position:living>0?1:null,income,living};
 const ratio=Math.max(0,living)/income;
 return {kind:'known',ratio,position:clamp(ratio),income,living};
}
export function savingsGuide(months,outflow){
 const known=finite(months)&&finite(outflow)&&outflow>0;
 return {months:known?months:null,markers:SAVINGS_MARKERS.map(value=>({value,reached:known&&months>=value})),next:known?SAVINGS_MARKERS.find(n=>n>months)??null:null};
}
export function collateralGuide(s){
 const corner=s.hangar?.snapshot?.corners?.collateral,inputs=s.hangar?.snapshot?.inputs;
 // Reuse the returned equity, retaining the original snapshot throughout combat.
 const equity=corner?.status==='unknown'?null:corner?.raw?.equity;
 const assets=inputs?.assetValue;
 const ratio=corner?.raw?.debtToValue;
 if(!finite(equity)||!finite(assets))return {kind:'unknown',equity:null,ratio:null,heat:null};
 if(equity<0)return {kind:'negative',equity,ratio:finite(ratio)?ratio:null,heat:1};
 if(assets<=0)return {kind:'no-assets',equity,ratio:null,heat:null};
 if(!finite(ratio))return {kind:'unknown',equity,ratio:null,heat:null};
 return {kind:equity===0?'zero':'positive',equity,ratio,heat:clamp(ratio)};
}
export function makeCreditLearning(accounts){
 const known=accounts.every(a=>a.method!=='payments');
 return {version:1,openingDebt:known?accounts.reduce((n,a)=>n+a.principal+a.interest+a.fees,0):null,periods:[],bestReduction:0,unlocked:false};
}
// Once per completed billing period; individual projectiles and split payments earn nothing.
export function closeCreditLearning(s,rows){
 const command=s.continuous.ground?.command;if(!command)return;
 // An old checkpoint has no trustworthy opening baseline. Do not reconstruct rewards.
 const credit=command.creditLearning??={version:1,openingDebt:null,periods:[],bestReduction:0,unlocked:false};
 const bills=rows.filter(t=>t.lane==='credit'&&t.original>0);
 if(bills.length&&bills.every(t=>t.remaining===0&&!t.wasOverdue)&&!credit.periods.includes(s.period))credit.periods.push(s.period);
 if(credit.openingDebt>0&&s.continuous.accounts.every(a=>a.method!=='payments')){
  const remaining=s.continuous.accounts.reduce((n,a)=>n+a.principal+a.interest+a.fees,0);
  credit.bestReduction=Math.max(credit.bestReduction,clamp((credit.openingDebt-remaining)/credit.openingDebt));
 }
 credit.periods=credit.periods.slice(0,3);
 credit.unlocked=credit.unlocked||credit.periods.length+credit.bestReduction>=3;
}
export function creditGuide(s){
 const c=s.continuous.ground?.command?.creditLearning;
 return {periods:c?.periods.length??0,reduction:c?.bestReduction??0,balanceKnown:c?.openingDebt!=null&&c.openingDebt>0,progress:Math.min(1,((c?.periods.length??0)+(c?.bestReduction??0))/3),unlocked:!!c?.unlocked,hasDebt:s.continuous.accounts.some(a=>a.payment>0||a.principal>0)};
}
export function budgetGuide(s,incomeCap,reserveCap,unpaid){
 const available=Math.max(0,s.incomeWallet),savings=s.reserves;
 const authorized=finite(incomeCap)?Math.min(available,Math.max(0,incomeCap)):0;
 const backup=finite(reserveCap)?Math.min(Math.max(0,savings),Math.max(0,reserveCap)):0;
 const incomeSpend=Math.min(unpaid,authorized),reserveSpend=Math.min(Math.max(0,unpaid-incomeSpend),backup);
 return {available,savings,authorized,backup,incomeSpend,reserveSpend,spendingLeft:available-incomeSpend,savingsLeft:savings-reserveSpend,shortfall:Math.max(0,unpaid-incomeSpend-reserveSpend)};
}
