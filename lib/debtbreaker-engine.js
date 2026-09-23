// Debtbreaker simulates a captured hangar picture. All money is integer cents.
// It is deliberately separate from Vi$ion's private calculator and scoring model.
import { createLoadout } from './arcade-engine.js';
import { prepareAccountPeriod, settleAccount } from './advanced-finances.js';
export const MILESTONES = [1, 3, 6, 9, 12];
export const SHOT = 10000;
export const INTERCEPTION_LINE = 72;
export const DUE_LINE = 86;
export const IMPACT_LINE = 100;
export const MAX_PERIODS = 4;
export const shotValue = state => state.hangar ? SHOT / 4 : SHOT;
export const firingRate = state => state.hangar ? state.hangar.loadout.fireRate * 4 : 1 / .32;

const clone = value => structuredClone(value);
const grades = ['F', 'D−', 'D', 'D+', 'C−', 'C', 'C+', 'B−', 'B', 'B+', 'A−', 'A', 'A+'];

export const recurringOutflow = state =>
  state.baseLiving +
  (state.hangar?.monthlyDebtPayments ?? 0) +
  state.defenses.filter(d => d.owned).reduce((sum, d) => sum + d.upkeep, 0) +
  state.debts.filter(d => d.balance > 0).reduce((sum, d) => sum + d.payment, 0) +
  state.loans.filter(d => d.balance > 0).reduce((sum, d) => sum + d.payment, 0);

export const reserveCoverage = state => {
  const outflow = recurringOutflow(state);
  return outflow > 0 ? state.reserves / outflow : 0;
};

export const replacementPrice = (state, tier) =>
  Math.round(state.startingIncome * .5 * Math.pow(1.2, tier - 1));

export const resaleQuote = defense => {
  if (!defense?.owned) return { gross: 0, fee: 0, payoff: 0, net: 0 };
  const gross = Math.round(defense.baseValue * defense.condition / 100);
  const fee = Math.round(gross * .08);
  const payoff = Math.max(0, defense.securedBalance || 0);
  return { gross, fee, payoff, net: gross - fee - payoff };
};

const threat = (id, lane, label, amount, speed, eligible = false) => ({
  id, lane, label, original: amount, remaining: amount, progress: 5,
  speed, eligible, intercepted: false, overdue: false, impacted: false,
  paidAt: null, incomePaid: 0, reservePaid: 0,
});

function makeThreats(state) {
  if(state.hangar?.details && !state.hangar.details.issues.length){
    const details=state.hangar.details;
    const living=details.expenses.filter(e=>e.amount>0).map((e,i)=>({...threat(`cost:${e.id}:${state.period}`,'living',e.name,e.amount,.75),accountId:e.id,formation:i}));
    const credit=details.accounts.map((a,i)=>{
      const amount=prepareAccountPeriod(a);
      const costsOnly=a.modeled&&a.balance===0&&a.interestCarry===0;
      return {...threat(`account:${a.id}:${state.period}`,costsOnly?'living':'credit',costsOnly?`${a.name} · ongoing costs`:a.name,amount,costsOnly?.75:.9,!costsOnly),accountId:a.id,formation:i};
    }).filter(t=>t.original>0);
    state.hangar.monthlyDebtPayments=credit.filter(t=>t.lane==='credit').reduce((s,t)=>s+t.original,0);
    state.baseLiving=[...living,...credit.filter(t=>t.lane==='living')].reduce((s,t)=>s+t.original,0);
    return [...living,...credit,threat(`reserve-${state.period}`,'reserve','Reserve deposit',Math.max(SHOT,Math.round(state.startingIncome*.15)),0)];
  }
  const living = state.baseLiving + state.defenses.filter(d => d.owned).reduce((s,d) => s + d.upkeep, 0);
  const credit = [
    ...state.debts.filter(d => d.balance > 0),
    ...state.loans.filter(d => d.balance > 0),
  ];
  return [
    threat(`living-${state.period}`, 'living', state.hangar ? 'Unspecified living costs' : 'Living + upkeep', living, .75),
    ...(state.hangar?.monthlyDebtPayments > 0 ? [threat(`payments-${state.period}`, 'credit', 'Unspecified debt', state.hangar.monthlyDebtPayments, .9, true)] : []),
    ...credit.map((d, i) => threat(`${d.id}-${state.period}`, 'credit', d.name, Math.min(d.balance, d.payment), .9 + i * .06, true)),
    threat(`reserve-${state.period}`, 'reserve', 'Reserve deposit', Math.max(SHOT, Math.round(state.startingIncome * .15)), 0),
  ];
}

export function createCampaign(options = {}) {
  const income = options.income ?? 400000;
  const baseLiving = options.baseLiving ?? 260000;
  const initialMonths = options.reserveMonths ?? .82;
  const initialOutflow = baseLiving + 10000 + 30000;
  const state = {
    period: 1, maxPeriods: MAX_PERIODS, startingIncome: income, incomeWallet: income,
    baseLiving, reserves: Math.round(initialOutflow * initialMonths), arrears: 0,
    paused: true, phase: 'briefing', selectedId: null, elapsed: 0,
    notice: 'Allocate one income wallet across all three lanes.',
    debts: [
      { id: 'loan', name: 'Installment loan', balance: 600000, apr: 8, payment: 12000, revolving: false },
      { id: 'card', name: 'Credit card', balance: 240000, apr: 24, payment: 18000, revolving: true, limit: 800000 },
    ],
    loans: [],
    defenses: [
      { id: 'wall', name: 'Starter barrier', tier: 0, owned: true, condition: 100, baseValue: 120000, upkeep: 10000, securedBalance: 0 },
      { id: 'cover', name: 'Utility cover', tier: 0, owned: true, condition: 100, baseValue: 80000, upkeep: 0, securedBalance: 0 },
    ],
    gradeIndex: 8, gradeReason: 'Starting fictional scenario grade. No score prediction.',
    unlockedTier: 0, earnedMilestones: [], latePeriods: 0,
    review: null, history: [], gameOverReason: null, periodStartReserves: Math.round(initialOutflow * initialMonths),
    openingIncome: income, carriedIncome: 0, incomeReceived: income,
    initialReserves: Math.round(initialOutflow * initialMonths),
    cashActivity: { incomeRepairs: 0, reserveRepairs: 0, equipment: 0, sales: 0 },
    totals: { incomeSpent: 0, reserveDeposited: 0, reserveSpent: 0, principalPaid: 0, interest: 0, damage: 0, repair: 0, equipment: 0 },
  };
  state.threats = makeThreats(state);
  state.selectedId = state.threats[0].id;
  return state;
}

// Consume the calculator's already-resolved selected snapshot, including What if.
// No private scoring, scenario arithmetic, or loan terms are reconstructed here.
export function createHangarCampaign(snapshot, grade = null, details = undefined) {
  if (!snapshot || !['current','scenario'].includes(snapshot.kind)) throw new Error('Choose a calculated hangar picture first.');
  const cents = (key, signed = false) => {
    const value = snapshot.inputs[key], result = Math.round(value * 100);
    if (!Number.isFinite(value) || !Number.isSafeInteger(result) || (!signed && result < 0)) throw new Error(`The hangar value for ${key} is invalid.`);
    return result;
  };
  const income = cents('monthlyIncome'), living = cents('monthlyLivingExpenses'), reserves = cents('liquidReserves',true);
  const strengths = Object.fromEntries(Object.entries(snapshot.corners).map(([key,corner])=>[key,corner.strength]));
  const loadout = createLoadout(strengths, snapshot.corners.collateral.raw.debtToValue);
  const state = createCampaign({income,baseLiving:living,reserveMonths:0});
  state.hangar = { snapshot:clone(snapshot), grade, loadout,
    monthlyDebtPayments:cents('monthlyDebtPayments'), totalDebt:cents('totalDebt'), assetValue:cents('assetValue') };
  if(details)state.hangar.details=clone(details);
  state.debts = [];state.loans = [];
  state.reserves = reserves;state.initialReserves = reserves;state.periodStartReserves = reserves;
  state.defenses = state.defenses.map(d=>({...d,condition:loadout.assetsMax,baseValue:0,upkeep:0,securedBalance:0}));
  state.gradeReason = 'Credit grade is the hangar snapshot. Game payments do not predict changes to your credit score.';
  state.notice = `${snapshot.kind==='scenario'?'What if':'My picture'} loaded from the hangar. Each period uses your entered monthly income and obligations.`;
  state.threats = makeThreats(state);state.selectedId = state.threats.find(t=>t.remaining>0)?.id ?? null;
  return state;
}

function accountFor(state, threat) {
  const id = threat.id.split('-')[0];
  return [...state.debts, ...state.loans].find(d => d.id === id);
}

function payThreat(state, target, requested, source) {
  if (!target || target.impacted || target.remaining <= 0 || !Number.isFinite(requested) || requested <= 0) return 0;
  const available = source === 'reserve' ? state.reserves : state.incomeWallet;
  const amount = Math.min(target.remaining, available, Math.round(requested));
  if (amount <= 0) return 0;
  if (source === 'reserve') { state.reserves -= amount; state.totals.reserveSpent += amount; target.reservePaid += amount; }
  else { state.incomeWallet -= amount; state.totals.incomeSpent += amount; target.incomePaid += amount; }
  target.remaining -= amount;
  if (target.lane === 'credit') {
    const account = accountFor(state, target);
    if (account) { const principal = Math.min(account.balance, amount); account.balance -= principal; state.totals.principalPaid += principal; }
  }
  if (target.remaining === 0) target.paidAt = state.elapsed;
  return amount;
}

export function incomeFire(input, targetId, requested = SHOT) {
  const state = clone(input);
  if (state.phase !== 'playing' || state.paused) return state;
  const target = state.threats.find(t => t.id === targetId);
  if (!target || !Number.isFinite(requested)) return state;
  if (target.lane === 'reserve') {
    // The old target remains a progress goal, never a cap on voluntary deposits.
    const amount = Math.min(state.incomeWallet, Math.max(0, Math.round(requested)));
    if (amount > 0) {
      state.incomeWallet -= amount; state.reserves += amount; target.remaining = Math.max(0, target.remaining - amount);
      target.incomePaid += amount; state.totals.incomeSpent += amount; state.totals.reserveDeposited += amount;
      if (target.remaining === 0) target.paidAt = state.elapsed;
      state.notice = `$${(amount/100).toFixed(0)} moved from income to the vault.`;
    }
    return state;
  }
  const amount = payThreat(state, target, requested, 'income');
  state.notice = amount ? `Income paid $${(amount/100).toFixed(0)} toward ${target.label}.` : 'No income ammunition remains.';
  return state;
}

export function reserveFire(input, targetId, requested = SHOT) {
  const state = clone(input);
  if (state.phase !== 'playing' || state.paused) return state;
  const target = state.threats.find(t => t.id === targetId);
  if (!target || target.lane === 'reserve') { state.notice = 'Reserve fire pays an obligation; it cannot deposit into itself.'; return state; }
  const amount = payThreat(state, target, requested, 'reserve');
  state.notice = amount ? `Vault paid $${(amount/100).toFixed(0)} toward ${target.label}.` : 'The vault is empty.';
  return state;
}

function damageDefense(state, amount) {
  const defense = state.defenses.find(d => d.owned && d.condition > 0);
  if (!defense) return false;
  const damage = Math.min(35, Math.max(4, Math.ceil(amount / 15000) * 3));
  defense.condition = Math.max(0, defense.condition - damage);
  defense.baseValue = Math.max(0, defense.baseValue - Math.round(amount * .08));
  state.totals.damage += damage;
  return true;
}

export function tickCampaign(input, seconds = .25) {
  const state = clone(input);
  if (state.phase !== 'playing' || state.paused) return state;
  state.elapsed += seconds;
  for (const target of state.threats.filter(t => t.lane !== 'reserve' && !t.impacted && t.remaining > 0)) {
    target.progress = Math.min(IMPACT_LINE, target.progress + target.speed * seconds * 4);
    if (!target.intercepted && target.progress >= INTERCEPTION_LINE) {
      target.intercepted = true;
      const spent = payThreat(state, target, target.remaining, 'reserve');
      if (spent) state.notice = `Pillars intercepted ${target.label} with $${(spent/100).toFixed(0)} from the vault.`;
    }
    if (!target.overdue && target.progress >= DUE_LINE && target.remaining > 0) {
      target.overdue = true; state.notice = `${target.label} is overdue. Only the unpaid remainder continues.`;
    }
    if (target.progress >= IMPACT_LINE && target.remaining > 0) {
      target.impacted = true; state.arrears += target.remaining;
      const defended = damageDefense(state, target.remaining);
      state.notice = `${target.label} breached with $${(target.remaining/100).toFixed(0)} unpaid${defended ? ' and damaged a defense' : ''}.`;
    }
  }
  const obligations = state.threats.filter(t => t.lane !== 'reserve');
  if (obligations.every(t => t.remaining === 0 || t.impacted)) return closePeriod(state);
  return state;
}

function closePeriod(state) {
  const accountReviews=state.hangar?.details?.accounts.map(account=>{
    const paid=state.threats.filter(t=>t.accountId===account.id).reduce((s,t)=>s+t.incomePaid+t.reservePaid,0);
    return settleAccount(account,paid);
  })??[];
  for(const account of accountReviews){state.totals.principalPaid+=account.principal??0;state.totals.interest+=account.interestAdded??0;}
  const startReserves = state.periodStartReserves;
  const onTime = state.threats.filter(t => t.eligible).every(t => t.remaining === 0 && !t.overdue);
  const late = state.threats.some(t => t.eligible && t.remaining > 0);
  if (state.hangar) {
    if(late)state.latePeriods++;
    state.gradeReason = `${late?'Some entered debt payments remain unpaid.':onTime?'Entered debt payments were covered on time.':'Entered debt payments were covered after the game deadline.'} Your hangar credit grade is unchanged; this is not a score forecast.`;
  }
  else if (late) { state.latePeriods++; state.gradeIndex = Math.max(0, state.gradeIndex - 2); state.gradeReason = 'A credit obligation remained unpaid for the full simulated period and became reportable.'; }
  else {
    const card = state.debts.find(d => d.revolving);
    const utilization = card ? card.balance / card.limit : 0;
    if (onTime && utilization < .3) { state.gradeIndex = Math.min(grades.length - 1, state.gradeIndex + 1); state.gradeReason = 'Required payments were on time and revolving utilization was below the scenario marker at reporting.'; }
    else state.gradeReason = onTime ? 'Payments were on time; this reporting checkpoint produced no grade movement.' : 'Payment is complete, but timing or reporting conditions produced no grade movement.';
  }
  const outflow = recurringOutflow(state), months = outflow > 0 ? state.reserves / outflow : 0;
  const earned = MILESTONES.filter(m => months >= m && !state.earnedMilestones.includes(m));
  state.earnedMilestones.push(...earned); state.unlockedTier = Math.max(state.unlockedTier, ...state.earnedMilestones.map(m=>MILESTONES.indexOf(m)+1), 0);
  const interest = [...state.debts, ...state.loans].reduce((sum, d) => {
    if (d.balance <= 0) return sum;
    const charge = Math.round(d.balance * d.apr / 1200); d.balance += charge; return sum + charge;
  }, 0);
  state.totals.interest += interest;
  const review = {
    accounts:accountReviews,
    period: state.period, startingReserves: startReserves, endingReserves: state.reserves,
    openingIncome: state.openingIncome, carriedIncome: state.carriedIncome,
    incomeReceived: state.startingIncome, unallocatedIncome: state.incomeWallet,
    endingMonths: months, incomeSpent: state.threats.reduce((s,t)=>s+t.incomePaid,0),
    reserveSpent: state.threats.reduce((s,t)=>s+t.reservePaid,0),
    reserveDeposited: state.threats.find(t=>t.lane==='reserve')?.incomePaid ?? 0,
    interest:state.hangar?null:interest, principalPaid:state.hangar?null:state.threats.filter(t=>t.lane==='credit').reduce((s,t)=>s+t.incomePaid+t.reservePaid,0),
    arrears: state.threats.filter(t=>t.impacted).reduce((s,t)=>s+t.remaining,0),
    damage: state.totals.damage, grade:state.hangar?(state.hangar.grade??'Not entered'):grades[state.gradeIndex], gradeReason: state.gradeReason,
    earned, onTime,
  };
  state.history.push(review); state.review = review; state.paused = true;
  const viableDefense = state.defenses.some(d => d.owned && d.condition > 0);
  if (!viableDefense && state.reserves <= 0 && state.incomeWallet <= 0 && state.arrears > 0) {
    state.phase = 'gameover'; state.gameOverReason = 'Reserves and defenses are exhausted with an unpaid obligation still breaching.';
  } else if (state.period >= state.maxPeriods) state.phase = 'complete';
  else state.phase = 'review';
  return state;
}

export function startNextPeriod(input) {
  const state = clone(input);
  if (state.phase !== 'review') return state;
  state.carriedIncome = state.incomeWallet;
  state.period++; state.elapsed = 0; state.incomeWallet += state.startingIncome;
  state.openingIncome = state.incomeWallet; state.incomeReceived += state.startingIncome;
  state.periodStartReserves = state.reserves; state.paused = false; state.phase = 'playing'; state.review = null;
  state.threats = makeThreats(state); state.selectedId = state.threats[0].id;
  state.notice = `Period ${state.period}: one income wallet, three destinations.`;
  return state;
}

export function beginCampaign(input) {
  if (input.phase !== 'briefing'||input.hangar?.details?.issues.length) return clone(input);
  const state = clone(input); state.phase = 'playing'; state.paused = false; state.notice = 'Income turret online. Aim anywhere and fire to allocate.'; return state;
}

export function togglePause(input) { const state = clone(input); if (state.phase === 'playing') state.paused = !state.paused; return state; }
export function selectTarget(input, id) { const state = clone(input); if (state.threats.some(t=>t.id===id)) state.selectedId=id; return state; }

// Checkpoint extras require all obligations covered. No payment timing bonus.
export function extraDebtPayment(input,id,source,requested) {
  const state=clone(input),account=state.hangar?.details?.accounts.find(a=>a.id===id);
  if(state.phase!=='review'||state.arrears>0||!account?.modeled||!['income','reserve'].includes(source)||!Number.isSafeInteger(requested)||requested<=0)return state;
  const wallet=source==='income'?'incomeWallet':'reserves';
  const paid=Math.max(0,Math.min(requested,state[wallet],account.balance+account.interestCarry));
  if(!paid)return state;
  const interest=Math.min(paid,account.interestCarry),principal=paid-interest;
  state[wallet]-=paid;account.interestCarry-=interest;account.balance-=principal;
  state.totals[source==='income'?'incomeSpent':'reserveSpent']+=paid;state.totals.principalPaid+=principal;
  const review=state.review,record=review.accounts.find(a=>a.id===id);
  record.extraPaid=(record.extraPaid??0)+paid;record.paid+=paid;record.principal+=principal;record.interestPaid+=interest;record.closingBalance=account.balance+account.interestCarry;
  review[source==='income'?'incomeSpent':'reserveSpent']+=paid;
  const extraField=source==='income'?'extraIncomePaid':'extraReservePaid';review[extraField]=(review[extraField]??0)+paid;
  review.unallocatedIncome=state.incomeWallet;review.endingReserves=state.reserves;review.endingMonths=reserveCoverage(state);
  state.notice=`Extra payment of $${(paid/100).toFixed(2)} to ${account.name}; wallets reconcile.`;
  return state;
}

export function repairDefense(input, id, source = 'reserve') {
  if(input.hangar)return clone(input);
  const state = clone(input), defense = state.defenses.find(d=>d.id===id);
  if (state.phase !== 'review' || !defense?.owned || defense.condition >= 100) return state;
  const need = 100 - defense.condition, cost = need * 1000;
  const wallet = source === 'income' ? 'incomeWallet' : 'reserves';
  const paid = Math.min(cost, state[wallet]); const restored = Math.floor(paid / 1000);
  state[wallet] -= restored * 1000; defense.condition += restored; state.totals.repair += restored * 1000;
  state.cashActivity[source === 'income' ? 'incomeRepairs' : 'reserveRepairs'] += restored * 1000;
  state.notice = `Repair restored ${restored} condition for $${(restored*10).toFixed(0)}.`; return state;
}

export function sellDefense(input, id) {
  if(input.hangar)return clone(input);
  const state=clone(input), defense=state.defenses.find(d=>d.id===id); if(state.phase!=='review'||!defense?.owned)return state;
  const q=resaleQuote(defense); if(q.net<0){state.notice='Sale cannot close until the secured payoff shortfall is covered.';return state;}
  state.reserves += q.net; defense.owned=false; defense.condition=0; defense.securedBalance=0;
  state.cashActivity.sales += q.net;
  state.notice=`${defense.name} sold. Net $${(q.net/100).toFixed(0)} reached the vault once.`;return state;
}

export function buyUpgrade(input, tier) {
  if(input.hangar)return clone(input);
  const state=clone(input); if(state.phase!=='review'||tier<1||tier>state.unlockedTier)return state;
  const defense=state.defenses[0], quote=resaleQuote(defense), price=replacementPrice(state,tier), cost=Math.max(0,price-Math.max(0,quote.net));
  if(state.reserves<cost){state.notice='The tier is unlocked, but the vault cannot fund this purchase.';return state;}
  state.reserves-=cost; defense.name=`Tier ${tier} barrier`; defense.tier=tier; defense.owned=true; defense.condition=100; defense.baseValue=price; defense.upkeep=[0,13000,17000,22000,28000,35000][tier]; defense.securedBalance=0;
  state.cashActivity.equipment += cost;
  state.totals.equipment+=cost; state.notice=`Tier ${tier} installed. Its upkeep starts next period.`;return state;
}

export function financeReplacement(input) {
  if(input.hangar)return clone(input);
  const state=clone(input); if(state.phase!=='review'||state.defenses.some(d=>d.owned&&d.condition>0))return state;
  const principal=replacementPrice(state,1), apr=12, months=12, r=apr/1200;
  const payment=Math.ceil(principal*r/(1-Math.pow(1+r,-months)));
  const capacity=state.startingIncome-recurringOutflow(state);
  if(payment>capacity){state.notice='Scenario eligibility failed: the replacement payment does not fit current capacity.';return state;}
  state.loans.push({id:`replacement${state.period}`,name:'Replacement financing',balance:principal,apr,payment,revolving:false});
  Object.assign(state.defenses[0],{name:'Financed starter barrier',tier:0,owned:true,condition:100,baseValue:principal,upkeep:10000,securedBalance:principal});
  state.notice=`Replacement funded directly. $${(payment/100).toFixed(0)} becomes a future required payment.`;return state;
}

export const campaignView = state => ({
  grade:state.hangar?(state.hangar.grade??'Not entered'):grades[state.gradeIndex], months: reserveCoverage(state), recurring: recurringOutflow(state),
  totalDebt:state.hangar?state.hangar.totalDebt:[...state.debts,...state.loans].reduce((s,d)=>s+d.balance,0),
  activeThreats: state.threats.filter(t=>t.lane!=='reserve'&&t.remaining>0&&!t.impacted).length,
});

// Balances are snapshots, not sums: deposits are internal transfers, not new income.
export const missionSummary = state => ({
  periods: state.history.length,
  incomeReceived: state.incomeReceived,
  incomePaid: state.totals.incomeSpent - state.totals.reserveDeposited,
  deposited: state.totals.reserveDeposited,
  reservePaid: state.totals.reserveSpent,
  unpaid: state.arrears,
  principalPaid:state.hangar?null:state.totals.principalPaid,
  interest:state.hangar?null:state.totals.interest,
  incomeRemaining: state.incomeWallet,
  initialReserves: state.initialReserves,
  reservesRemaining: state.reserves,
  ...state.cashActivity,
  cashDifference: state.initialReserves + state.incomeReceived + state.cashActivity.sales
    - state.incomeWallet - state.reserves
    - (state.totals.incomeSpent - state.totals.reserveDeposited) - state.totals.reserveSpent
    - state.cashActivity.incomeRepairs - state.cashActivity.reserveRepairs - state.cashActivity.equipment,
});
