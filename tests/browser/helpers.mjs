import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const errors = [], failedAssets = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && /\/(?:debtbreak|_next)\//.test(r.url())) failedAssets.push(`${r.status()} ${r.url()}`); });
    await use(page);
    await testInfo.attach('browser-errors.json', { body: JSON.stringify({ errors, failedAssets }, null, 2), contentType: 'application/json' });
    expect(errors, 'No uncaught browser exceptions').toEqual([]);
    expect(failedAssets, 'Game art and JavaScript load successfully').toEqual([]);
  },
});
export { expect };
const EPOCH = new Date('2026-09-28T12:00:00Z');

// Deliberately synthetic API outputs. No calculator implementation or network service
// is needed for game UI testing. Values are labels/fixtures, not financial scores.
function snapshot(kind, inputs, creditStrength) {
  return { kind, scoringVersion: 'browser-fixture-v1', inputs,
    corners: Object.fromEntries(['cashFlow', 'capital', 'collateral', 'credit'].map(key => [key, {
      status: key === 'credit' && creditStrength === null ? 'unknown' : 'known',
      strength: key === 'credit' ? creditStrength : .5, pressure: null,
      raw: key === 'credit' ? { score: inputs.creditScore } : key === 'cashFlow' ? { net: 2000, load: .5 } : key === 'capital' ? { months: 3 } : { equity: 10000 },
    }])) };
}
export async function openGame(page, { income = 4000, living = 1000, debt = 200, reserves = 5000, credit = .5, goal = 3 } = {}) {
  await page.clock.install({ time: EPOCH });
  await page.addInitScript(() => {
    localStorage.setItem('vision:welcome:v1', 'seen');
    // Deterministic 10 Hz render cadence keeps long missions practical in CPU-only
    // runners. The unmodified controller still receives 100 ms active frames and
    // runs its own 120 Hz simulation steps; this is not a device FPS benchmark.
    window.requestAnimationFrame = callback => window.setTimeout(() => callback(performance.now()), 100);
    window.cancelAnimationFrame = id => window.clearTimeout(id);
    // Observe actual Canvas draw calls, without changing game state or renderer output.
    // Coordinates identify rendered sprites for pointer targeting; no mirrored physics.
    window.__siegeDraw = { actors: [], text: [], pointer: [] };
    const originalClear = CanvasRenderingContext2D.prototype.clearRect;
    const originalDraw = CanvasRenderingContext2D.prototype.drawImage;
    const originalText = CanvasRenderingContext2D.prototype.fillText;
    const isField = ctx => ctx.canvas.classList.contains('siege-canvas');
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (isField(this)) { window.__siegeDraw.actors = []; window.__siegeDraw.text = []; }
      return originalClear.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      if (isField(this) && String(args[0]?.src).endsWith('/debtbreak/atlas.png') && args.length === 9) {
        const transform = this.getTransform(), scale = this.canvas.width / this.canvas.getBoundingClientRect().width;
        const lane = args[1] === 35 ? 'living' : args[1] === 835 ? 'credit' : args[1] === 75 ? 'want' : 'turret';
        window.__siegeDraw.actors.push({ lane, x: transform.e / scale, y: transform.f / scale });
      }
      return originalDraw.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      if (isField(this)) window.__siegeDraw.text.push(String(args[0]));
      return originalText.apply(this, args);
    };
    for (const type of ['pointerdown', 'pointerup', 'pointercancel']) document.addEventListener(type, e => {
      if (e.target.closest('.siege-shell')) window.__siegeDraw.pointer.push({ type, pointerType: e.pointerType, trusted: e.isTrusted });
    }, true);
  });
  await page.route('**/api/vision/calculate', route => {
    const current = { monthlyIncome: income, monthlyLivingExpenses: living, monthlyDebtPayments: debt,
      totalDebt: debt ? 10000 : 0, assetValue: 20000, liquidReserves: reserves, creditScore: credit === null ? null : 720 };
    return route.fulfill({ json: { current: snapshot('current', current, credit), scenario: snapshot('scenario', { ...current }, credit),
      deltas: { cashFlow: 0, capital: 0, collateral: 0, credit: 0 } } });
  });
  await page.goto('/#picture');
  for (const [id, value] of Object.entries({ monthlyIncome: income, monthlyLivingExpenses: living, monthlyDebtPayments: debt,
    totalDebt: debt ? 10000 : 0, assetValue: 20000, liquidReserves: reserves, creditScore: credit === null ? '' : 720 })) {
    await page.locator(`#${id}`).fill(String(value));
  }
  await expect(page.getByRole('button', { name: 'Enter Debtbreak', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Enter Debtbreak', exact: true }).click();
  await expect(page.getByRole('button', { name: 'START DEBTBREAK', exact: true })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Reserve goal', exact: true }).click();
  await page.getByRole('option', { name: `${goal} ${goal === 1 ? 'month' : 'months'} of outflow`, exact: true }).click();
  // Pause before launch, so mission starts at a known time and the real frame loop
  // advances only when runFor fires each animation frame (never a time teleport).
  await page.clock.pauseAt(new Date(EPOCH.getTime() + 60_000));
  await page.getByRole('button', { name: 'START DEBTBREAK', exact: true }).click();
  await expect(page.locator('.siege-loading')).toHaveCount(0);
  await expect(page.locator('.siege-shell')).toHaveAttribute('data-phase', 'playing');
  await page.clock.runFor(160);
}
export const shell = page => page.locator('.siege-shell');
export const canvas = page => page.locator('canvas.siege-canvas');
export const money = text => Math.round(Number(text.replace(/[^\d.-]/g, '')) * 100);
export async function balance(page, wallet = 'income') { return money(await page.getByTestId(`${wallet}-balance`).innerText()); }
export async function tapOrClick(page, locator) { if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await locator.tap(); else await locator.click(); }
export async function openPlan(page) { await tapOrClick(page, shell(page).getByRole('button', { name: /PAUSE \/ PLAN/ })); await expect(page.getByRole('heading', { name: /Tactical Pause/ })).toBeVisible(); }
export async function closePlan(page) {
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(160);
}
export async function accountCheck(page) {
  const fact = page.locator('.dbc-tactical .db31-facts > div').filter({ has: page.getByText('Cash reconciliation difference', { exact: true }) });
  await expect(fact.locator('dd')).toHaveText('$0');
}
export async function payCycle(page, deposit = 0) {
  await openPlan(page);
  await page.getByRole('group', { name: 'Transaction funding', exact: true }).getByRole('button', { name: 'Income', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Transaction amount', exact: true }).fill('10000');
  const pay = page.getByRole('button', { name: /^Pay up to .* · income$/ });
  while (await pay.count()) await pay.first().click();
  if (deposit) {
    await page.getByRole('spinbutton', { name: 'Transaction amount', exact: true }).fill(String(deposit));
    await page.getByRole('button', { name: /^Deposit up to/ }).click();
  }
  await accountCheck(page);
  await closePlan(page);
}
export async function fullMission(page, { deposit = 0 } = {}) {
  for (let cycle = 1; cycle <= 4; cycle++) {
    await expect(shell(page).locator('.siege-objective')).toContainText(`Cycle ${cycle}/4`);
    await payCycle(page, deposit);
    await page.clock.runFor(60_000);
  }
  await expect(shell(page)).toHaveAttribute('data-phase', 'complete');
  await expect(page.getByRole('heading', { name: 'Four cycles. More to build.' })).toBeVisible();
  await page.getByRole('button', { name: 'Mission ledger', exact: true }).click();
  for (let cycle = 1; cycle <= 4; cycle++) await expect(page.locator('.dbc-tactical').getByText(new RegExp(`^Cycle ${cycle}:`))).toBeVisible();
  await accountCheck(page);
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
}
export async function renderedPoint(page, lane) {
  const field = canvas(page); await field.scrollIntoViewIfNeeded();
  const box = await field.boundingBox();
  let actor;
  await expect.poll(async()=>{
    actor=await page.evaluate(lane => window.__siegeDraw.actors.find(a => a.lane === lane && a.x > (lane==='want'?20:35) && a.x < document.querySelector('.siege-canvas').clientWidth - (lane==='want'?20:35) && a.y > 35 && a.y < document.querySelector('.siege-canvas').clientHeight * .65), lane);
    if(!actor)await page.clock.runFor(100);
    return !!actor;
  },{message:`Visible ${lane} sprite available for aiming`}).toBe(true);
  return { x: box.x + actor.x, y: box.y + actor.y };
}
export async function hold(page, point, duration) {
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] });
    await page.clock.runFor(duration);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(point.x, point.y); await page.mouse.down();
    await page.clock.runFor(duration); await page.mouse.up();
  }
  await page.clock.runFor(160);
}
