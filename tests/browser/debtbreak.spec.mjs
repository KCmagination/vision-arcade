import { test, expect, openGame, shell, canvas, balance, tapOrClick, openPlan, closePlan, accountCheck, fullMission, payCycle, renderedPoint, hold } from './helpers.mjs';

test('battlefield loads real art and keeps mouse/touch controls reachable', async ({ page }, testInfo) => {
  await openGame(page);
  await expect(shell(page).locator('.siege-lifestyle progress')).toHaveCount(7);
  const paint = await canvas(page).evaluate(el => {
    const ctx = el.getContext('2d'), data = ctx.getImageData(0, 0, el.width, el.height).data;
    const colors = new Set(); for (let i = 0; i < data.length; i += 400) colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
    return { width: el.width, height: el.height, colors: colors.size };
  });
  expect(paint.width).toBeGreaterThan(300); expect(paint.height).toBeGreaterThan(300); expect(paint.colors).toBeGreaterThan(100);
  expect(await page.evaluate(() => window.__siegeDraw.text)).toEqual(expect.arrayContaining(['SENTINEL', 'CAPITAL SHIELD · CHARGED', 'COLLATERAL', 'CREDIT RADAR']));
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
  await shell(page).getByRole('button',{name:'Reserve protection ON',exact:true}).click();
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
  await openGame(page, { reserves: 0 });
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
  await expect(shell(page).locator('.siege-coverage')).toContainText('1/10 sections protected');
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

test('@acceptance four cycles without a complete base must not declare mission success', async ({ page }, testInfo) => {
  await openGame(page, { reserves: 3000 });
  await fullMission(page);
  expect(await balance(page, 'reserve')).toBe(300_000);
  await testInfo.attach('reserve-goal-shortfall.json', { body: JSON.stringify({ cyclesCompleted: 4, goalCents: 360000, reservesCents: 300000, shortfallCents: 60000, success: false }), contentType: 'application/json' });
  // Paying bills alone cannot satisfy the new base coverage objective.
  await expect(shell(page).locator('.siege-ending .eyebrow')).not.toHaveText('MISSION COMPLETE');
});


test('Sentinel follows an actual ad tap and slashes without spending either wallet', async ({page},testInfo)=>{
 await openGame(page);const income=await balance(page),reserve=await balance(page,'reserve');
 await hold(page,await renderedPoint(page,'want'),100);await expect(shell(page).locator('.siege-sentinel')).toContainText('Target locked');
 await page.clock.runFor(6500);await expect(shell(page).locator('.siege-sentinel')).toContainText('1 cleared');
 expect(await balance(page)).toBe(income);expect(await balance(page,'reserve')).toBe(reserve);
 await testInfo.attach('sentinel-sword.png',{body:await page.screenshot(),contentType:'image/png'});await openPlan(page);await accountCheck(page);
});

test('building early below the reserve goal wins only after defending all four cycles',async({page},testInfo)=>{
 await openGame(page,{reserves:3000});await openPlan(page);
 for(let i=0;i<10;i++)await page.getByRole('button',{name:/^Expand wall/}).click();
 await expect(shell(page).locator('.siege-objective')).toContainText('DEFEND YOUR LIFESTYLE');
 await expect(shell(page).locator('.siege-coverage')).toContainText('10/10 sections protected');
 await closePlan(page);await expect(shell(page)).toHaveAttribute('data-phase','playing');
 await canvas(page).scrollIntoViewIfNeeded();await page.clock.runFor(200);
 await testInfo.attach('complete-base.png',{body:await page.screenshot(),contentType:'image/png'});
 for(let cycle=1;cycle<=4;cycle++){await payCycle(page);await page.clock.runFor(60000);}
 await expect(shell(page)).toHaveAttribute('data-phase','complete');await expect(shell(page).locator('.siege-ending .eyebrow')).toHaveText('MISSION COMPLETE');
 expect(await balance(page,'reserve')).toBe(150000);await expect(page.getByRole('heading',{name:'Lifestyle protected.'})).toBeVisible();
 await testInfo.attach('successful-mission.png',{body:await page.screenshot(),contentType:'image/png'});
});

test('lifestyle change waits for the next cycle and reduces the footprint and bills together',async({page})=>{
 await openGame(page);const income=await balance(page),reserve=await balance(page,'reserve');await openPlan(page);
 await page.getByRole('combobox',{name:'Lifestyle tier',exact:true}).click();await page.getByRole('option',{name:'Essential · 7 sections',exact:true}).click();
 await page.getByRole('spinbutton',{name:'Adjustable living costs',exact:true}).fill('200');
 await page.getByRole('button',{name:'Apply from cycle 2',exact:true}).click();
 await expect(page.locator('.siege-lifestyle-plan')).toContainText('Queued: Essential for cycle 2');
 expect(await balance(page)).toBe(income);expect(await balance(page,'reserve')).toBe(reserve);await expect(shell(page).locator('.siege-coverage')).toContainText('0/10');
 await closePlan(page);await payCycle(page);await page.clock.runFor(60000);
 await expect(shell(page).locator('.siege-coverage')).toContainText('Essential lifestyle');await expect(shell(page).locator('.siege-coverage')).toContainText('0/7');
 await expect(shell(page).locator('.siege-progress')).toContainText('$1,000');await openPlan(page);await accountCheck(page);
});


test('three Utilitank rows and double Want-bots render at mission start',async({page},testInfo)=>{
 await openGame(page);
 const actors=await page.evaluate(()=>window.__siegeDraw.actors),tanks=actors.filter(a=>a.lane==='living');
 expect(tanks).toHaveLength(12);expect(new Set(tanks.map(a=>Math.round(a.y))).size).toBe(3);
 expect(actors.filter(a=>a.lane==='want')).toHaveLength(2);
 await canvas(page).scrollIntoViewIfNeeded();await page.clock.runFor(200);
 await testInfo.attach('three-row-battlefield.png',{body:await page.screenshot(),contentType:'image/png'});
});

test('five sword clears charge a real multi-ad power sweep on mouse and touch',async({page},testInfo)=>{
 await openGame(page,{income:0,living:0,debt:0,reserves:0});
 for(let n=1;n<=5;n++){
  await tapOrClick(page,shell(page).getByRole('button',{name:'E · SLASH AD',exact:true}));await page.clock.runFor(4000);
  if(n<5)await expect(shell(page).locator('.siege-sentinel')).toContainText(`${n} cleared`);
 }
 await expect(shell(page).locator('.siege-sentinel')).toHaveAttribute('data-power-ready','true');
 await testInfo.attach('power-sweep-ready.png',{body:await page.screenshot(),contentType:'image/png'});
 await tapOrClick(page,shell(page).getByRole('button',{name:'E · POWER SWEEP',exact:true}));await page.clock.runFor(3000);
 const status=await shell(page).locator('.siege-footer [role="status"]').innerText();expect(Number(status.match(/Power sweep cleared (\d+) ads/)?.[1]??0)).toBeGreaterThanOrEqual(2);
 expect(Number((await shell(page).locator('.siege-sentinel').innerText()).match(/(\d+) cleared/)?.[1]??0)).toBeGreaterThanOrEqual(7);
 expect(await balance(page)).toBe(0);expect(await balance(page,'reserve')).toBe(0);await openPlan(page);await accountCheck(page);
});
