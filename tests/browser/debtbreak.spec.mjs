import { test, expect, openGame, shell, canvas, balance, tapOrClick, openPlan, closePlan, accountCheck, fullMission, renderedPoint, hold } from './helpers.mjs';

test('battlefield loads real art and keeps mouse/touch controls reachable', async ({ page }, testInfo) => {
  await openGame(page);
  await expect(shell(page).locator('.siege-lifestyle progress')).toHaveCount(7);
  const paint = await canvas(page).evaluate(el => {
    const ctx = el.getContext('2d'), data = ctx.getImageData(0, 0, el.width, el.height).data;
    const colors = new Set(); for (let i = 0; i < data.length; i += 400) colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
    return { width: el.width, height: el.height, colors: colors.size };
  });
  expect(paint.width).toBeGreaterThan(300); expect(paint.height).toBeGreaterThan(300); expect(paint.colors).toBeGreaterThan(100);
  expect(await page.evaluate(() => window.__siegeDraw.text)).toEqual(expect.arrayContaining(['SENTINEL', 'CAPITAL SHIELD', 'COLLATERAL', 'CREDIT RADAR']));
  for (const selector of ['.siege-fire', '.siege-weapons > button:nth-child(1)', '.siege-weapons > button:nth-child(2)', '.siege-weapons > button:nth-child(4)']) {
    const control = shell(page).locator(selector); await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(-1); expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  }
  const overflow = await shell(page).evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
  await testInfo.attach('battlefield.png', { body: await page.screenshot(), contentType: 'image/png' });
  if (testInfo.project.name === 'mobile-touch') {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.clock.runFor(160);
    await shell(page).locator('.siege-fire').scrollIntoViewIfNeeded();
    await expect(shell(page).locator('.siege-fire')).toBeInViewport();
    // ResizeObserver clears the bitmap when rotation changes its dimensions.
    // Advance frames after layout settles and verify that artwork repaints.
    await expect.poll(async () => {
      await page.clock.runFor(200);
      return canvas(page).evaluate(el => {
        const data = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
        const colors = new Set();
        for (let i = 0; i < data.length; i += 400) colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
        return colors.size;
      });
    }).toBeGreaterThan(100);
    await testInfo.attach('landscape.png', { body: await page.screenshot(), contentType: 'image/png' });
  }
});

test('Intercept pays once per press; Rapid Fire repeats and releases', async ({ page }, testInfo) => {
  await openGame(page);
  // Exercise rapid hits while the formation is still moving slowly. Later in
  // a sweep the player must lead a moving tank; a deliberate miss is valid.
  await tapOrClick(page, shell(page).getByRole('button', { name: /2 · RAPID FIRE/ }));
  const rapidBefore = await balance(page);
  await hold(page, await renderedPoint(page, 'living'), 900);
  await page.clock.runFor(1500);
  const rapidAfter = await balance(page);
  expect(rapidBefore - rapidAfter).toBeGreaterThan(2500);
  expect((rapidBefore - rapidAfter) % 2500).toBe(0);
  await page.clock.runFor(1000);
  expect(await balance(page)).toBe(rapidAfter);
  await tapOrClick(page, shell(page).getByRole('button', { name: /1 · INTERCEPT/ }));
  await page.clock.runFor(18_000);
  const before = await balance(page);
  await hold(page, await renderedPoint(page, 'credit'), 1000);
  expect(before - await balance(page)).toBe(10_000);
  await page.clock.runFor(1000);
  expect(before - await balance(page)).toBe(10_000);
  const pointers = await page.evaluate(() => window.__siegeDraw.pointer);
  expect(pointers.some(e => e.trusted && e.type === 'pointerdown' && e.pointerType === (testInfo.project.name === 'mobile-touch' ? 'touch' : 'mouse'))).toBe(true);
  await openPlan(page); await accountCheck(page);
});

test('a missed payment projectile returns funds to the selected wallet', async ({ page }) => {
  await openGame(page);
  await tapOrClick(page, shell(page).getByRole('button', { name: /2 · RAPID FIRE/ }));
  await tapOrClick(page, page.getByRole('group', { name: 'Shot funding', exact: true }).getByRole('button', { name: 'RESERVES', exact: true }));
  const before = await balance(page, 'reserve');
  const field = canvas(page); await field.scrollIntoViewIfNeeded(); const box = await field.boundingBox();
  await hold(page, { x: box.x + box.width * .985, y: box.y + box.height * .8 }, 50);
  expect(await balance(page, 'reserve')).toBeLessThan(before);
  await page.clock.runFor(2000);
  expect(await balance(page, 'reserve')).toBe(before);
  await openPlan(page); await accountCheck(page);
});

test('Pause / Plan freezes time, deposits once and enforces expansion surplus', async ({ page }) => {
  await openGame(page, { reserves: 3600 });
  await expect(shell(page).getByRole('button', { name: /^EXPAND WALL/ })).toBeDisabled();
  await openPlan(page);
  const cycle = await shell(page).locator('.siege-objective').innerText();
  const beforeIncome = await balance(page), beforeReserve = await balance(page, 'reserve');
  await page.clock.runFor(10_000);
  expect(await shell(page).locator('.siege-objective').innerText()).toBe(cycle);
  expect(await balance(page)).toBe(beforeIncome);
  await page.getByRole('spinbutton', { name: 'Transaction amount', exact: true }).fill('150');
  await page.getByRole('button', { name: /^Deposit up to/ }).click();
  expect(await balance(page)).toBe(beforeIncome - 15_000);
  expect(await balance(page, 'reserve')).toBe(beforeReserve + 15_000);
  await page.getByRole('button', { name: /^Expand wall/ }).click();
  expect(await balance(page, 'reserve')).toBe(beforeReserve);
  await expect(page.getByRole('button', { name: /^Expand wall/ })).toBeDisabled();
  await accountCheck(page); await closePlan(page);
  await expect(shell(page).locator('.siege-lifestyle [data-built="true"]')).toHaveCount(1);
});

test('Want-bot passing is free and radar reports the supplied credit warning', async ({ page }) => {
  await openGame(page, { credit: null });
  await expect(shell(page).getByRole('button', { name: 'Radar · 1.0s warning' })).toBeVisible();
  // Offers arrive on day 2 or 3; standard mode advances one day per 2 seconds.
  await page.clock.runFor(6500);
  await openPlan(page);
  const beforeIncome = await balance(page), beforeReserve = await balance(page, 'reserve');
  const pass = page.locator('.dbc-tactical').getByRole('button', { name: 'Pass · free', exact: true });
  await expect(pass.first()).toBeVisible(); const count = await pass.count();
  await pass.first().click();
  await expect(pass).toHaveCount(count - 1);
  expect(await balance(page)).toBe(beforeIncome); expect(await balance(page, 'reserve')).toBe(beforeReserve);
  await accountCheck(page);
});

test('long frame interruption pauses without spending or advancing the day', async ({ page }) => {
  await openGame(page);
  const before = await balance(page), cycle = await shell(page).locator('.siege-objective').innerText();
  await page.clock.fastForward(15_000);
  await expect(page.getByRole('heading', { name: 'Play interrupted' })).toBeVisible();
  expect(await balance(page)).toBe(before);
  expect(await shell(page).locator('.siege-objective').innerText()).toBe(cycle);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(2200);
  expect(await shell(page).locator('.siege-objective').innerText()).not.toBe(cycle);
});

test('four cycles record all payments and replay restores the captured picture', async ({ page }, testInfo) => {
  await openGame(page, { reserves: 1200 });
  await fullMission(page, { deposit: 600 });
  expect(await balance(page, 'reserve')).toBe(360_000);
  await testInfo.attach('four-cycle-ending.png', { body: await page.screenshot(), contentType: 'image/png' });
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(shell(page)).toHaveAttribute('data-phase', 'briefing');
  expect(await balance(page, 'reserve')).toBe(120_000);
  expect(await balance(page)).toBe(400_000);
});

test('@acceptance reserve goal reached early still requires all four cycles', async ({ page }) => {
  await openGame(page, { reserves: 3600 });
  await page.clock.runFor(3000);
  await expect(shell(page)).toHaveAttribute('data-phase', 'playing');
  await expect(shell(page).locator('.siege-ending')).toHaveCount(0);
});

test('@acceptance four cycles below the reserve goal must not declare mission success', async ({ page }, testInfo) => {
  await openGame(page, { reserves: 3000 });
  await fullMission(page);
  expect(await balance(page, 'reserve')).toBe(300_000);
  await testInfo.attach('reserve-goal-shortfall.json', { body: JSON.stringify({ cyclesCompleted: 4, goalCents: 360000, reservesCents: 300000, shortfallCents: 60000, success: false }), contentType: 'application/json' });
  // Intentionally strict: v49 currently says MISSION COMPLETE below its goal.
  // This is a product acceptance gap, not a skipped or expected-failure test.
  await expect(shell(page).locator('.siege-ending .eyebrow')).not.toHaveText('MISSION COMPLETE');
});
