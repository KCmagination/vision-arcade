// Fictional teaching ledger. Dollar values are stored as integer cents.
// Independent of the private Vi$ion scoring formulas.
import { settleChallengePeriod, advanceChallengePeriod, assetValue } from './debtbreak-challenges.js';
export const copy = value => structuredClone(value);
export const PILLAR_NAMES = ["Cash flow / sword", "Capital / shield", "Collateral / chest plate", "Credit / helm"];
export const totalDebt = ledger => ledger.debts.reduce((sum, d) => sum + d.balance, 0);
export const requiredPayments = ledger => ledger.debts.reduce((sum, d) => sum + (d.balance > 0 ? d.payment : 0), 0);
export const periodSurplus = ledger => Math.max(0, ledger.income - ledger.living - ledger.minimums - ledger.repairDue);
export const availableFunds = ledger => Math.max(0, periodSurplus(ledger) + ledger.carry - (ledger.challenge?.costs ?? 0));
export function practiceScenario() {
  return { period: 1, income: 400000, living: 300000, minimums: 20000,
    reserves: 40000, carry: 0, repairDue: 0, interestPosted: 0, assistIndex: 0,
    campaignDebt: 300000, assistProgress: 0,
    debts: [
      { id: "LN-01", name: "Loan", balance: 40000, apr: 8, payment: 4000, due: "Day 5" },
      { id: "CC-02", name: "Card", balance: 260000, apr: 24, payment: 16000, due: "Day 12" },
    ] };
}
export function sequence(ledger, strategy, lockedId) {
  const debts = ledger.debts.filter(d => d.balance > 0).slice().sort((a, b) =>
    strategy === "avalanche" ? b.apr - a.apr || a.balance - b.balance || a.id.localeCompare(b.id)
      : a.balance - b.balance || b.apr - a.apr || a.id.localeCompare(b.id));
  const locked = debts.findIndex(d => d.id === lockedId);
  if (locked > 0) debts.unshift(...debts.splice(locked, 1));
  return debts;
}
export function interestEstimate(ledger) {
  return ledger.debts.reduce((sum, d) => sum + Math.round(d.balance * d.apr / 1200), 0);
}
export function reserveMilestone(ledger) {
  const expenses = ledger.living + requiredPayments(ledger);
  const months = expenses > 0 ? ledger.reserves / expenses : 0;
  const next = [1, 3, 6, 9, 12].find(n => n > months) ?? null;
  return { months, next, goal: next ? next * expenses : null,
    progress: next ? Math.min(1, months / next) : 1 };
}
export function startPlan(start, savings, strategy, reserveLimit = 0) {
  const available = availableFunds(start);
  savings = Math.min(available, Math.max(0, Math.round(Number.isFinite(savings) ? savings : 0)));
  const ledger = copy(start);
  ledger.reserves += savings;
  ledger.carry = 0;
  ledger.campaignDebt ??= totalDebt(start);
  ledger.assistProgress ??= 0;
  reserveLimit = Math.min(ledger.reserves, Math.max(0, Math.round(Number.isFinite(reserveLimit) ? reserveLimit : 0)));
  return { start: copy(start), ledger, strategy, savings, budget: available - savings,
    reserveLimit, reserveRemaining: reserveLimit, reserveSpent: 0,
    remaining: available - savings, executed: 0, orderedPaid: 0, outOfOrderPaid: 0,
    targetId: sequence(start, strategy)[0]?.id ?? null, cleared: [], bonuses: [],
    event: null, settled: false, nextLedger: null };
}
export function repay(plan, accountId, requested, source = 'cash') {
  if (plan.settled || !Number.isFinite(requested) || requested <= 0) return null;
  const debt = plan.ledger.debts.find(d => d.id === accountId);
  if (!debt || debt.balance <= 0) return null;
  const fromReserves = source === 'reserves';
  const allowance = fromReserves ? Math.min(plan.reserveRemaining, plan.ledger.reserves) : plan.remaining;
  const amount = Math.min(debt.balance, allowance, Math.round(requested));
  if (amount <= 0) return null;
  const correct = accountId === plan.targetId;
  debt.balance -= amount;
  if (fromReserves) { plan.reserveRemaining -= amount; plan.reserveSpent += amount; plan.ledger.reserves -= amount; }
  else { plan.remaining -= amount; plan.executed += amount; }
  if (correct) plan.orderedPaid += amount; else plan.outOfOrderPaid += amount;
  let bonus = null;
  if (debt.balance === 0) {
    plan.cleared.push(accountId);
    if (correct) {
      const original = plan.start.debts.find(d => d.id === accountId).balance;
      const share = original / Math.max(1, plan.ledger.campaignDebt ?? totalDebt(plan.start));
      bonus = { id: accountId, share, multiplier: 1 + Math.min(.75, share * 1.5),
        seconds: 4 + Math.min(4, share * 8), pillar: plan.ledger.assistIndex % 4 };
      plan.bonuses.push(bonus);
    }
    plan.targetId = sequence(plan.ledger, plan.strategy, correct ? null : plan.targetId)[0]?.id ?? null;
  }
  return { amount, source, correct, cleared: debt.balance === 0, freed: debt.balance === 0 ? debt.payment : 0, bonus };
}
export function projection(start, savings, strategy) {
  const plan = startPlan(start, savings, strategy);
  for (const debt of sequence(plan.ledger, strategy)) repay(plan, debt.id, plan.remaining);
  return { ledger: plan.ledger, unused: plan.remaining, interest: interestEstimate(plan.ledger),
    interestSaved: interestEstimate(start) - interestEstimate(plan.ledger),
    freed: requiredPayments(start) - requiredPayments(plan.ledger),
    nextSurplus: start.income - start.living - requiredPayments(plan.ledger) };
}
export function settlePeriod(plan) {
  if (plan.settled) return plan;
  if (plan.ledger.challenge) return settleChallengePeriod(plan);
  // A fixed event sequence makes every replay comparable. Only period 1 has a repair.
  if (plan.ledger.period === 1) {
    const cost = 60000, covered = Math.min(cost, plan.ledger.reserves);
    plan.ledger.reserves -= covered;
    plan.event = { name: "Essential repair", cost, covered, shortfall: cost - covered };
  }
  plan.ledger.carry = plan.remaining;
  plan.settled = true;
  return plan;
}
export function nextPeriod(plan) {
  if (!plan.settled) throw new Error("Review this period before advancing.");
  if (plan.nextLedger) return copy(plan.nextLedger);
  if (plan.ledger.challenge) {
    plan.nextLedger = advanceChallengePeriod(plan);
    return copy(plan.nextLedger);
  }
  const ledger = copy(plan.ledger);
  ledger.period++; ledger.minimums = 0; ledger.interestPosted = 0;
  ledger.repairDue = plan.event?.shortfall ?? 0;
  for (const debt of ledger.debts) {
    const interest = Math.round(debt.balance * debt.apr / 1200);
    ledger.interestPosted += interest;
    debt.balance += interest;
    const payment = Math.min(debt.balance, debt.payment);
    debt.balance -= payment; ledger.minimums += payment;
  }
  // An explicit fictional repair arrangement: the shortfall is due next period,
  // with no interest. Never finance it silently or treat it as a credit benefit.
  const deficit = Math.max(0, ledger.living + ledger.minimums + ledger.repairDue - ledger.income);
  if (deficit > 0) throw new Error("This scenario needs an explicit shortfall response.");
  plan.nextLedger = copy(ledger);
  return ledger;
}
export function practiceInputs(ledger) {
  return { monthlyIncome: ledger.income / 100, monthlyLivingExpenses: (ledger.living + (ledger.challenge?.costs ?? 0)) / 100,
    monthlyDebtPayments: requiredPayments(ledger) / 100, liquidReserves: ledger.reserves / 100,
    totalDebt: totalDebt(ledger) / 100, assetValue: ledger.challenge ? 8500 + assetValue(ledger) / 100 : 10000, creditScore: 680 };
}
