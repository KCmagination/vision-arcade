import {test,expect,openGame,canvas,shell,openPlan,closePlan,accountCheck,tapOrClick,balance} from './helpers.mjs';
const view=page=>canvas(page).evaluate(el=>el.__debtbreakView);

test('Ground Defense: shared totems, fixed-point blast and refund, planner assets and checkpoint',async({page},info)=>{
 await openGame(page,{mode:'ground',reserves:10000});
 await expect(shell(page).locator('.siege-objective')).toContainText('Cycle 1 ·');
 await expect(page.getByTestId('payday-countdown')).toHaveText('01:00');
 // Include one 100ms fixture frame after the integer-second boundary so the
 // rounded-up countdown has painted on slower local browser runners.
 await page.clock.runFor(9100);expect((await view(page)).autoPaid).toBeGreaterThan(0);
 await expect(page.getByTestId('payday-countdown')).toHaveText('00:51');
 await page.getByRole('button',{name:/TOTEMS ON/}).click();
 const point={x:500,z:900};await canvas(page).scrollIntoViewIfNeeded();const box=await canvas(page).boundingBox();
 const x=box.x+box.width*point.x/1000,y=box.y+box.height*point.z/1000,before=await balance(page);
 if(info.project.name==='mobile-touch')await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
 await page.clock.runFor(250);expect((await view(page)).held).toBeGreaterThan(0);
 await page.clock.runFor(300);const blast=(await view(page)).blasts[0];expect(blast.x).toBeCloseTo(500,0);expect(blast.z).toBeCloseTo(900,0);
 await page.clock.runFor(1500);expect((await view(page)).held).toBe(0);expect(await balance(page)).toBe(before);
 await openPlan(page);await accountCheck(page);
 const payday=await page.getByTestId('payday-countdown').textContent();await page.clock.runFor(3000);await expect(page.getByTestId('payday-countdown')).toHaveText(payday);
 const reserves=await balance(page,'reserve');await page.getByRole('button',{name:/Build outpost module/}).click();await expect(page.getByTestId('asset-value')).toHaveText('$150.00');
 expect(await balance(page,'reserve')).toBe(reserves-15000);await page.getByRole('button',{name:'Sell · $138.00 net',exact:true}).click();await expect(page.getByTestId('asset-value')).toHaveText('$0.00');expect(await balance(page,'reserve')).toBe(reserves-1200);
 await page.getByRole('spinbutton',{name:'Reserve-defense cap',exact:true}).fill('50');await page.getByRole('button',{name:'Apply allocations',exact:true}).click();
 await page.getByRole('button',{name:'Save local checkpoint',exact:true}).click();await accountCheck(page);await closePlan(page);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('vision:debtbreak:ground-run:v1')));expect(saved.world.ledger.paused).toBe(true);expect(saved.world.ledger.continuous.ground.reserveAllowance).toBe(5000);
 await canvas(page).scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('ground-defense.png')});
});

test('Ground Defense runs beyond four cycles and preserves classic selection',async({page})=>{
 await openGame(page,{mode:'ground',income:5000,living:100,debt:0,reserves:10000});
 for(let n=1;n<=5;n++){
  await openPlan(page);await page.getByRole('group',{name:'Transaction funding',exact:true}).getByRole('button',{name:'Income',exact:true}).click();await page.getByRole('spinbutton',{name:'Transaction amount',exact:true}).fill('10000');
  const payments=page.getByRole('button',{name:/^Pay up to .* · income$/});while(await payments.count())await payments.first().click();await accountCheck(page);await closePlan(page);await page.clock.runFor(60000);
 }
 await expect(shell(page)).toHaveAttribute('data-phase','playing');await expect(shell(page).locator('.siege-objective')).toContainText('Cycle 6 ·');
 await openPlan(page);await page.getByRole('button',{name:'End run and review',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).last().click();await expect(shell(page)).toHaveAttribute('data-phase','complete');
 await page.getByRole('button',{name:'Replay',exact:true}).click();await page.getByRole('combobox',{name:'Game mode',exact:true}).click();await page.getByRole('option',{name:'Four-cycle mission',exact:true}).click();await page.getByRole('button',{name:'START DEBTBREAK',exact:true}).click();await expect(shell(page).locator('.siege-objective')).toContainText('Cycle 1/4');
});
