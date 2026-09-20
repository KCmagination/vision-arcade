import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MILESTONES, beginCampaign, buyUpgrade, createCampaign, incomeFire, recurringOutflow,
  replacementPrice, reserveFire, resaleQuote, sellDefense, tickCampaign,
} from '../lib/debtbreaker-engine.js';

const playing = options => beginCampaign(createCampaign(options));
const living = s => s.threats.find(t => t.lane === 'living');
const reserveTarget = s => s.threats.find(t => t.lane === 'reserve');

test('income-to-reserve deposits conserve money exactly', () => {
  const before = playing(), target = reserveTarget(before), total = before.incomeWallet + before.reserves;
  const after = incomeFire(before, target.id, 10000);
  assert.equal(after.incomeWallet, before.incomeWallet - 10000);
  assert.equal(after.reserves, before.reserves + 10000);
  assert.equal(after.incomeWallet + after.reserves, total);
  assert.equal(after.totals.reserveDeposited, 10000);
});

test('$300 less $200 income and $100 reserve settles once without damage', () => {
  let s = playing(); const id = living(s).id;
  living(s).remaining = living(s).original = 30000;
  s = incomeFire(s, id, 20000);
  s.reserves = 10000; living(s).progress = 71.99;
  s = tickCampaign(s, .01);
  assert.equal(living(s).remaining, 0);
  assert.equal(s.reserves, 0);
  assert.equal(s.arrears, 0);
  assert.equal(s.totals.damage, 0);
  assert.equal(living(s).incomePaid + living(s).reservePaid, 30000);
});

test('$300 less $200 income and $40 reserve leaves only $60 to damage and arrears', () => {
  let s = playing(); const id = living(s).id;
  living(s).remaining = living(s).original = 30000;
  s = incomeFire(s, id, 20000);
  s.reserves = 4000; living(s).progress = 71.99;
  s = tickCampaign(s, .01);
  assert.equal(living(s).remaining, 6000);
  assert.equal(s.reserves, 0);
  s = tickCampaign(s, 10);
  assert.equal(s.arrears, 6000);
  assert.ok(s.totals.damage > 0);
  assert.equal(living(s).incomePaid + living(s).reservePaid + living(s).remaining, 30000);
});

test('manual reserve fire and automatic interception cannot overpay or overspend', () => {
  let s = playing(); const id = living(s).id;
  living(s).remaining = living(s).original = 15000; s.reserves = 15000;
  s = reserveFire(s, id, 10000); living(s).progress = 71.99;
  s = tickCampaign(s, .01);
  assert.equal(living(s).remaining, 0); assert.equal(s.reserves, 0);
  assert.equal(living(s).reservePaid, 15000); assert.equal(s.totals.reserveSpent, 15000);
});

test('one $300 payment and three $100 shots have identical balance and credit treatment', () => {
  let one = playing(), split = playing();
  const a = one.threats.find(t => t.lane === 'credit'), b = split.threats.find(t => t.lane === 'credit');
  a.remaining = a.original = b.remaining = b.original = 30000;
  const aBalance = one.debts.find(d => d.id === a.id.split('-')[0]).balance;
  one = incomeFire(one, a.id, 30000);
  split = incomeFire(split, b.id, 10000); split = incomeFire(split, b.id, 10000); split = incomeFire(split, b.id, 10000);
  const da = one.debts.find(d => d.id === a.id.split('-')[0]), db = split.debts.find(d => d.id === b.id.split('-')[0]);
  assert.equal(da.balance, aBalance - 30000); assert.equal(db.balance, da.balance);
  assert.equal(one.gradeIndex, split.gradeIndex); assert.equal(one.latePeriods, split.latePeriods);
});

test('milestones and replacement prices use the disclosed schedule', () => {
  const s = createCampaign();
  assert.deepEqual(MILESTONES, [1,3,6,9,12]);
  assert.deepEqual(MILESTONES.map((_,i)=>replacementPrice(s,i+1)), [200000,240000,288000,345600,414720]);
});

test('sale proceeds are credited once and upkeep stops', () => {
  let s = createCampaign(); s.phase = 'review';
  const defense = s.defenses[1], quote = resaleQuote(defense), before = s.reserves, outflow = recurringOutflow(s);
  s = sellDefense(s, defense.id);
  assert.equal(s.reserves, before + quote.net);
  assert.equal(s.defenses[1].owned, false);
  assert.equal(recurringOutflow(s), outflow - defense.upkeep);
  const again = sellDefense(s, defense.id); assert.deepEqual(again, s);
});

test('unlocked upgrade charges net trade cost and adds future upkeep', () => {
  let s = createCampaign({reserveMonths:12}); s.phase = 'review'; s.unlockedTier = 5;
  const quote = resaleQuote(s.defenses[0]), price = replacementPrice(s,2), before = s.reserves;
  s = buyUpgrade(s,2);
  assert.equal(s.reserves, before - (price - quote.net));
  assert.equal(s.defenses[0].tier, 2); assert.equal(s.defenses[0].upkeep, 17000);
});
