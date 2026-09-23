// Public input adapter and explicitly opted-in game estimates. No avatar scoring.
export const DEBT_TYPES = ['credit-card','mortgage','auto','personal','student','other'];
export const DETAIL_LIMIT = 20;
export const moneyCents = value => Math.round(value * 100);
const clone = value => structuredClone(value);
const validMoney = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && Number.isSafeInteger(moneyCents(n)) && n <= 1e9;
export const emptySetup = () => ({date:new Date().toISOString().slice(0,10),debts:[],expenses:[],estimates:false});

export function validateSetup(setup) {
  const errors=[];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(setup.date||''))errors.push('Enter a picture date.');
  if(setup.debts.length>DETAIL_LIMIT||setup.expenses.length>DETAIL_LIMIT)errors.push(`Use up to ${DETAIL_LIMIT} rows in each list.`);
  const ids=new Set();
  for(const [i,d] of setup.debts.entries()){
    const label=d.name?.trim()||`Debt ${i+1}`;
    if(!d.id||ids.has(d.id))errors.push('Each row needs a unique identifier.');ids.add(d.id);
    if(!DEBT_TYPES.includes(d.type))errors.push(`${label}: choose an account type.`);
    if(!validMoney(d.balance)||!validMoney(d.payment))errors.push(`${label}: enter a nonnegative balance and monthly payment.`);
    if(d.rate!==null&&(!Number.isFinite(d.rate)||d.rate<0||d.rate>100))errors.push(`${label}: rate must be 0–100%, or left unknown.`);
    if(d.term!==null&&(!Number.isInteger(d.term)||d.term<1||d.term>600))errors.push(`${label}: remaining term must be 1–600 months, or left unknown.`);
    if(d.otherPayment!==null&&(!validMoney(d.otherPayment)||d.otherPayment>d.payment))errors.push(`${label}: included taxes, insurance or fees cannot exceed the payment.`);
    if(d.model&&(d.rate===null||d.rateKind!=='fixed'||d.otherPayment===null))errors.push(`${label}: an estimate needs a known fixed rate and the payment's non-debt portion (enter 0 if none).`);
  }
  for(const [i,e] of setup.expenses.entries()){
    if(!e.id||ids.has(e.id))errors.push('Each row needs a unique identifier.');ids.add(e.id);
    if(!validMoney(e.amount))errors.push(`${e.name?.trim()||`Living cost ${i+1}`}: enter a nonnegative monthly amount.`);
  }
  return errors;
}

export function detailTotals(setup) {
  return {totalDebt:setup.debts.reduce((s,d)=>s+moneyCents(d.balance??0),0),
    monthlyDebtPayments:setup.debts.reduce((s,d)=>s+moneyCents(d.payment??0),0),
    monthlyLivingExpenses:setup.expenses.reduce((s,e)=>s+moneyCents(e.amount??0),0)};
}

export function reconcileSetup(current, draft, choices) {
  const errors=validateSetup(draft),totals=detailTotals(draft),inputs={...current};
  for(const key of Object.keys(totals)){
    if(choices[key]==='update')inputs[key]=totals[key]/100;
    else if(totals[key]>moneyCents(current[key]))errors.push(`Detailed ${key==='totalDebt'?'balances':key==='monthlyDebtPayments'?'payments':'living costs'} exceed the hangar. Update that total or correct the rows.`);
  }
  if(errors.length)throw new Error(errors.join(' '));
  return {inputs,setup:clone(draft)};
}

// Used again at launch, so subsequent hangar edits cannot leave stale accounts.
export function resolveDetails(setup, current, snapshot) {
  if(!setup)return {accounts:[],expenses:[],issues:[],date:null,estimates:false};
  const errors=validateSetup(setup),totals=detailTotals(setup);
  for(const key of Object.keys(totals))if(totals[key]>moneyCents(current[key]))errors.push('Advanced details exceed My picture. Reconcile them before playing.');
  if(errors.length)return {accounts:[],expenses:[],issues:[...new Set(errors)],date:setup.date,estimates:false};
  const accounts=setup.debts.map((d,i)=>({id:d.id,name:d.name.trim()||`Debt ${i+1}`,type:d.type,
    balance:moneyCents(d.balance),payment:moneyCents(d.payment),rate:d.rate,term:d.term,secured:d.secured,
    otherPayment:d.otherPayment===null?null:moneyCents(d.otherPayment),
    modeled:!!(setup.estimates&&d.model),interestCarry:0,periodInterest:0}));
  const expenses=setup.expenses.map((e,i)=>({id:e.id,name:e.name.trim()||`Living cost ${i+1}`,amount:moneyCents(e.amount)}));
  const residualBalance=moneyCents(current.totalDebt)-totals.totalDebt;
  const residualPayment=moneyCents(current.monthlyDebtPayments)-totals.monthlyDebtPayments;
  if(residualBalance||residualPayment)accounts.push({id:'unspecified',name:'Unspecified debt',type:'other',balance:residualBalance,payment:residualPayment,rate:null,term:null,otherPayment:null,modeled:false,interestCarry:0,periodInterest:0});
  const residualLiving=moneyCents(current.monthlyLivingExpenses)-totals.monthlyLivingExpenses;
  if(residualLiving)expenses.push({id:'unspecified-costs',name:'Unspecified living costs',amount:residualLiving});
  if(snapshot.kind==='scenario'){
    const debt=moneyCents(snapshot.inputs.totalDebt)-moneyCents(current.totalDebt),payment=moneyCents(snapshot.inputs.monthlyDebtPayments)-moneyCents(current.monthlyDebtPayments),living=moneyCents(snapshot.inputs.monthlyLivingExpenses)-moneyCents(current.monthlyLivingExpenses);
    if(debt<0||payment<0||living<0)return {accounts:[],expenses:[],issues:['This What if reduces a total below its detailed picture. Reconcile the details before playing.'],date:setup.date,estimates:false};
    if(debt||payment)accounts.push({id:'scenario-debt',name:'What if · unassigned debt/payment',type:'other',balance:debt,payment,rate:null,term:null,otherPayment:null,modeled:false,interestCarry:0,periodInterest:0});
    if(living)expenses.push({id:'scenario-costs',name:'What if · added living costs',amount:living});
  }
  return {accounts,expenses,issues:[],date:setup.date,estimates:setup.estimates};
}

export function prepareAccountPeriod(account) {
  if(!account.modeled)return account.payment;
  account.periodInterest=Math.round(account.balance*account.rate/1200);
  // An entered balance is modeled as opening principal. Interest stays separate.
  return Math.min(account.payment,account.balance+account.interestCarry+account.periodInterest+account.otherPayment);
}

export function settleAccount(account, paid) {
  if(!account.modeled)return {id:account.id,name:account.name,modeled:false,paid,principal:null,interestAdded:null,interestPaid:null,otherPaid:null,closingBalance:null};
  const openingBalance=account.balance,interestAdded=account.periodInterest;
  const otherPaid=Math.min(paid,account.otherPayment),towardDebt=paid-otherPaid;
  const interestDue=account.interestCarry+interestAdded,interestPaid=Math.min(towardDebt,interestDue);
  const principal=Math.min(account.balance,towardDebt-interestPaid);
  account.balance-=principal;account.interestCarry=interestDue-interestPaid;
  account.periodInterest=0;
  if(account.term!==null)account.term=Math.max(0,account.term-1);
  return {id:account.id,name:account.name,modeled:true,paid,openingBalance,principal,interestAdded,interestPaid,otherPaid,closingBalance:account.balance+account.interestCarry};
}
