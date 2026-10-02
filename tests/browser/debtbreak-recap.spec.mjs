import {test,expect,openGame,canvas,openPlan,balance,accountCheck,money} from './helpers.mjs';
test('cycle recap distinguishes totems, missed refunds and manual payments',async({page},info)=>{
 await openGame(page,{mode:'ground',reserves:10000});
 await page.clock.runFor(9100);
 await page.getByRole('button',{name:/TOTEMS ON/}).click();
 const box=await canvas(page).boundingBox(),before=await balance(page);
 const x=box.x+box.width*.5,y=box.y+box.height*.9;
 if(info.project.name==='mobile-touch')await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
 await page.clock.runFor(2200);expect(await balance(page)).toBe(before);
 await openPlan(page);await page.getByText('Cycle recap · your actions and the four corners',{exact:true}).click();
 await expect(page.getByTestId('recap-player')).toHaveText('$0');
 expect(money(await page.getByTestId('recap-totems').innerText())).toBeGreaterThan(0);
 expect(money(await page.getByTestId('recap-refunds').innerText())).toBeGreaterThan(0);
 await expect(page.getByRole('region',{name:'Cycle action recap'})).toContainText('not earnings or bill payments');
 await page.getByRole('group',{name:'Transaction funding',exact:true}).getByRole('button',{name:'Income',exact:true}).click();
 await page.getByRole('spinbutton',{name:'Transaction amount',exact:true}).fill('50');
 await page.getByRole('button',{name:'Pay up to $50 · income',exact:true}).first().click();
 await accountCheck(page);await expect(page.getByTestId('recap-player')).toHaveText('$50');
 await page.getByRole('region',{name:'Cycle action recap'}).scrollIntoViewIfNeeded();
 await page.screenshot({path:test.info().outputPath('cycle-recap.png')});
 await page.getByRole('button',{name:'Close',exact:true}).last().click();
 await page.getByRole('button',{name:'Hangar',exact:true}).first().click();
 await page.getByRole('button',{name:'Leave mission',exact:true}).click();
 // Public release preserves its existing hangar; Site-only avatar milestone UI is outside this game export.
 await expect(page.getByRole('region',{name:'Vi$ion avatar hangar',exact:true})).toBeVisible();
});
