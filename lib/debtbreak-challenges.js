// Deterministic fictional missions. No private score formulas or real lending predictions.
const clone = value => structuredClone(value);
const debtTotal = ledger => ledger.debts.reduce((sum, d) => sum + d.balance, 0);
const payments = ledger => ledger.debts.reduce((sum, d) => sum + (d.balance > 0 ? d.payment : 0), 0);
export const CHALLENGES = [
  { id: 'cash-flow', name: 'Cash Flow', title: 'Keep Moving', color: '#5de4ff', icon: 'sword', lesson: 'Free a payment. Give the next payday more room.', objective: 'Free at least $40/month and remove $600 of starting debt in three periods.', mechanic: 'Landed shots repay debt. Clearing an account releases its payment next payday.', event: 'Stable income. No emergency or equipment decisions.' },
  { id: 'capital', name: 'Capital', title: 'Hold the Line', color: '#62edb9', icon: 'shield', lesson: 'Use your protection. Then rebuild it.', objective: 'Cover the disruption, finish with $600 in reserves, and reduce debt.', mechanic: 'Split paydays between debt ammunition and reserves. Your shield reflects available protection.', event: 'A $600 repair after period 1; income falls by $600 in period 2 and returns in period 3.' },
  { id: 'collateral', name: 'Collateral', title: 'Keep It Working', color: '#ffbc62', icon: 'armor', lesson: 'Ownership brings abilities and upkeep.', objective: 'Reduce debt by $500 and finish with working equipment or $1,200 in liquid funds.', mechanic: 'Service the support unit for arena cover, defer its upkeep, or sell it for cash next payday.', event: 'The unit loses 25 condition each period. Service costs $100 and restores 40 condition.' },
  { id: 'credit', name: 'Credit', title: 'Choose Your Terms', color: '#b3a0ff', icon: 'helm', lesson: 'An available offer still needs to fit your life.', objective: 'Restore the support unit, keep $500 in reserves and retain $500/month of surplus.', mechanic: 'Pay cash, finance a $600 repair, or wait. Contracts add debt targets and future payments.', event: 'Offers show APR, scheduled payments and total repayment. Two completed payment periods unlock a lower-rate offer if you still need it.' },
  { id: 'four-corners', name: 'Four Corners', title: 'Keep Your World Running', color: '#f1e8c9', icon: 'all', lesson: 'One decision. Four connected consequences.', objective: 'Finish with working equipment, $600 in reserves, no overdue bills and less debt than you started with.', mechanic: 'Manage repayment, reserves, equipment and repair financing in one mission.', event: 'A $600 essential expense after period 1; income falls by $400 in period 2. Equipment needs upkeep.' },
];
export const challengeInfo = id => CHALLENGES.find(c => c.id === id);
export const hasEquipment = id => ['collateral', 'credit', 'four-corners'].includes(id);
export const hasOffers = id => ['credit', 'four-corners'].includes(id);
export const equipmentOnline = ledger => !!ledger.challenge?.asset.owned && ledger.challenge.asset.condition >= 30;
export const assetValue = ledger => {
  const a = ledger.challenge?.asset;
  return a?.owned ? Math.round(150000 * a.condition / 100) : 0;
};
export function challengeScenario(id) {
  if (!challengeInfo(id)) throw new Error('Unknown challenge.');
  return { period: 1, income: 400000, living: 300000, minimums: 20000, reserves: id === 'four-corners' ? 120000 : id === 'credit' ? 80000 : id === 'collateral' ? 60000 : 40000,
    carry: 0, repairDue: 0, interestPosted: 0, assistIndex: 0, campaignDebt: 300000, assistProgress: 0,
    debts: [{ id: 'LN-01', name: 'Loan', balance: 40000, apr: 8, payment: 4000, due: 'Day 5' }, { id: 'CC-02', name: 'Card', balance: 260000, apr: 24, payment: 16000, due: 'Day 12' }],
    challenge: { id, duration: 3, initialDebt: 300000, initialPayments: 20000, reserveGoal: id === 'credit' ? 50000 : 60000,
      asset: { owned: hasEquipment(id), condition: hasOffers(id) ? 0 : 60, pledgedTo: null }, repairComplete: !hasOffers(id),
      paymentPeriods: 0, overdue: 0, salePending: 0, costs: 0, reserveUsed: 0, soldFor: 0,
      notes: [], lastChoice: null, supportSeconds: 0, emergencyCovered: 0, emergencyShortfall: 0 } };
}
export const defaultChoices = ledger => ({ equipment: hasOffers(ledger.challenge.id) && !ledger.challenge.repairComplete ? 'wait' : 'service', funding: 'wait' });
export function financingOffers(ledger) {
  const improved = ledger.challenge.paymentPeriods >= 2;
  return [{ id: 'unsecured', label: 'Unsecured repair loan', apr: improved ? 12 : 18, secured: false }, { id: 'secured', label: 'Pledge support unit', apr: improved ? 6 : 10, secured: true }].map(o => {
    const r = o.apr / 1200, principal = 60000, months = 6;
    const payment = Math.ceil(principal * r / (1 - Math.pow(1 + r, -months)));
    let balance = principal, total = 0, lastPayment = 0;
    for (let n = 0; n < months; n++) { balance += Math.round(balance * r); lastPayment = Math.min(balance, payment); balance -= lastPayment; total += lastPayment; }
    return { ...o, principal, payment, months, total, lastPayment, cost: total - principal, improved };
  });
}
export function saleQuote(ledger) {
  const gross = assetValue(ledger), fee = Math.round(gross * .1);
  const lien = ledger.debts.find(d => d.id === ledger.challenge.asset.pledgedTo)?.balance ?? 0;
  return { gross, fee, lien, net: gross - fee - lien };
}
export function prepareChallenge(start, choices) {
  const ledger = clone(start), c = ledger.challenge;
  c.notes = []; c.costs = 0; c.reserveUsed = 0; c.lastChoice = clone(choices);
  const needsRepair = hasOffers(c.id) && !c.repairComplete && c.asset.owned;
  if (needsRepair) {
    if (choices.funding === 'cash') {
      if (ledger.reserves < 60000) return { ledger: clone(start), error: 'The cash repair needs $600 in existing reserves. Choose financing or wait.' };
      ledger.reserves -= 60000; c.reserveUsed = 60000; c.asset.condition = 100; c.repairComplete = true;
      c.notes.push('Paid $600 from reserves. Support restored; no new payment.');
    } else if (['unsecured', 'secured'].includes(choices.funding)) {
      const offer = financingOffers(ledger).find(o => o.id === choices.funding);
      ledger.debts.push({ id: 'RP-03', name: offer.secured ? 'Secured repair' : 'Repair loan', balance: 60000, apr: offer.apr, payment: offer.payment, due: 'Next payday' });
      c.asset.condition = 100; c.asset.pledgedTo = offer.secured ? 'RP-03' : null; c.repairComplete = true;
      c.notes.push(`Repair financed at ${offer.apr}% APR. First payment next payday; extra repayment is allowed without a fee.`);
    } else if (choices.funding !== 'wait') return { ledger: clone(start), error: 'Choose a repair option.' };
    else c.notes.push('Repair deferred. Support is offline; next period income will be $150 lower.');
  } else if (hasEquipment(c.id) && c.asset.owned) {
    if (choices.equipment === 'service') {
      const available = Math.max(0, ledger.income - ledger.living - ledger.minimums - ledger.repairDue) + ledger.carry;
      if (available < 10000) return { ledger: clone(start), error: 'Service needs $100 from this payday. Defer upkeep or sell the unit.' };
      // Separate from household costs; the current allocation deducts this once.
      c.costs = 10000; c.asset.condition = Math.min(100, c.asset.condition + 40);
      c.notes.push('Service costs $100 from this payday and restores 40 condition.');
    } else if (choices.equipment === 'sell') {
      const quote = saleQuote(ledger);
      if (quote.net < 0) return { ledger: clone(start), error: 'Sale proceeds do not cover the secured debt. This sale cannot proceed.' };
      const debt = ledger.debts.find(d => d.id === c.asset.pledgedTo);
      if (debt) debt.balance = 0;
      c.salePending += quote.net; c.soldFor = quote.net; c.asset.owned = false; c.asset.condition = 0; c.asset.pledgedTo = null;
      c.notes.push('Unit removed from service. Net sale proceeds arrive next payday after the 10% selling fee and secured payoff.');
    } else if (choices.equipment !== 'defer') return { ledger: clone(start), error: 'Choose how to handle the support unit.' };
    else c.notes.push('Upkeep deferred. No service cost; condition still falls by 25 at period end.');
  }
  return { ledger, error: null };
}
export function settleChallengePeriod(plan) {
  const l = plan.ledger, c = l.challenge;
  if (l.period === 1 && ['capital', 'four-corners'].includes(c.id)) {
    const cost = 60000, covered = Math.min(cost, l.reserves);
    l.reserves -= covered;
    plan.event = { name: c.id === 'capital' ? 'Essential repair' : 'Essential household expense', cost, covered, shortfall: cost - covered };
    c.emergencyCovered += covered; c.emergencyShortfall += cost - covered;
    c.notes.push(cost === covered ? 'Reserves absorbed the $600 disruption. Protection worked.' : 'The remaining expense is due next payday under this fictional interest-free arrangement.');
  }
  if (c.asset.owned && c.asset.condition > 0) c.asset.condition = Math.max(0, c.asset.condition - 25);
  if (c.overdue === 0) c.paymentPeriods++;
  if (c.asset.pledgedTo && !l.debts.some(d => d.id === c.asset.pledgedTo && d.balance > 0)) c.asset.pledgedTo = null;
  l.carry = plan.remaining;
  plan.settled = true;
  return plan;
}
export function advanceChallengePeriod(plan) {
  const l = clone(plan.ledger), c = l.challenge;
  l.period++; l.interestPosted = 0; l.minimums = 0;
  l.repairDue = plan.event?.shortfall ?? 0;
  c.costs = 0; c.reserveUsed = 0; c.notes = [];
  l.income = 400000 - (l.period === 2 ? c.id === 'capital' ? 60000 : c.id === 'four-corners' ? 40000 : 0 : 0);
  if (hasOffers(c.id) && c.asset.owned && !equipmentOnline(l)) { l.income -= 15000; c.notes.push('Offline equipment reduced this payday by $150.'); }
  if (c.salePending) { l.carry += c.salePending; c.notes.push(`Net sale proceeds arrived: $${(c.salePending / 100).toFixed(2)}.`); c.salePending = 0; }
  for (const d of l.debts) {
    const interest = Math.round(d.balance * d.apr / 1200); l.interestPosted += interest; d.balance += interest;
    const amount = Math.min(d.balance, d.payment); d.balance -= amount; l.minimums += amount;
  }
  // Scenario inputs bound essential outflow below income. Do not hide a deficit or invent credit.
  if (l.income - l.living - l.minimums - l.repairDue < 0) throw new Error('Obligations exceed this scenario’s income. Retry the previous period with more reserves.');
  if (c.asset.pledgedTo && !l.debts.some(d => d.id === c.asset.pledgedTo && d.balance > 0)) c.asset.pledgedTo = null;
  return l;
}
export function challengeOutcome(ledger) {
  const c = ledger.challenge, debtReduced = c.initialDebt - debtTotal(ledger), freed = c.initialPayments - payments(ledger);
  const surplus = ledger.income - ledger.living - payments(ledger) - (c.asset.owned && hasEquipment(c.id) ? 10000 : 0);
  const common = { debtReduced, freed, surplus, reserves: ledger.reserves, condition: c.asset.condition, liquid: ledger.reserves + ledger.carry, online: equipmentOnline(ledger) };
  const checks = c.id === 'cash-flow' ? [ ['At least $40/month freed', freed >= 4000], ['$600 less starting debt', debtReduced >= 60000] ]
    : c.id === 'capital' ? [ ['$600 reserve floor restored', ledger.reserves >= 60000], ['Debt reduced', debtReduced > 0], ['Disruption bill resolved', ledger.period >= 2 && c.overdue === 0] ]
    : c.id === 'collateral' ? [ ['$500 less debt', debtReduced >= 50000], ['Working unit or $1,200 liquid funds', equipmentOnline(ledger) || common.liquid >= 120000] ]
    : c.id === 'credit' ? [ ['Support unit working', equipmentOnline(ledger)], ['$500 reserves retained', ledger.reserves >= 50000], ['$500/month available after upkeep', surplus >= 50000] ]
    : [ ['Support unit working', equipmentOnline(ledger)], ['$600 reserves retained', ledger.reserves >= 60000], ['No overdue bills', c.overdue === 0], ['Less debt than the start', debtReduced > 0] ];
  return { ...common, checks: checks.map(([label, passed]) => ({ label, passed })), passed: checks.every(([, pass]) => pass) };
}
