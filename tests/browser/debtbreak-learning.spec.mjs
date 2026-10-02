import {test,expect,openGame,canvas} from './helpers.mjs';
test('visual budget separates cash, cycle income, savings and bills; transfer conserves cash',async({page})=>{
 await openGame(page,{mode:'base'});
 const hud=page.getByRole('region',{name:'Live defense accounts'});
 await expect(hud).toContainText('Cash available now');await expect(hud).toContainText('Income per cycle');await expect(hud).toContainText('Saved reserves');await expect(hud).toContainText('Bills left this wave');
 await expect(page.locator('.command-status')).toContainText('cash is available');
 await page.getByText('Move cash into savings',{exact:true}).click();await page.getByRole('spinbutton',{name:'Transfer to savings',exact:true}).fill('200');
 await expect(page.locator('.command-save-transfer')).toContainText('Total cash stays $9,000');await page.getByRole('button',{name:'Move to savings',exact:true}).click();
 await expect(page.getByTestId('command-income')).toHaveText('$3,800');await expect(page.getByTestId('command-reserve')).toHaveText('$5,200');await expect(hud).toContainText('$4,000');
 await page.getByRole('button',{name:'Use recommended pads',exact:true}).click();await page.getByRole('spinbutton',{name:'Cash defense may spend',exact:true}).fill('1200');
 await expect(page.getByTestId('budget-preview')).toContainText('$2,600');await expect(page.getByTestId('budget-preview')).toContainText('$5,200');
 await page.getByRole('button',{name:'Launch automatic wave',exact:true}).click();await page.clock.runFor(61000);
 await expect(page.locator('.command-shell')).toHaveAttribute('data-stage','build');await expect(page.getByTestId('command-income')).toHaveText('$6,600');await expect(hud).toContainText('$4,000');
 await page.getByText('Accounting & arcade rules',{exact:true}).click();await expect(page.getByTestId('command-reconciliation')).toHaveText('$0');
 await canvas(page).scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('money-and-carryover.png')});
});
test('living ruler, savings markers and credit progress remain readable through three cycles',async({page})=>{
 test.setTimeout(240000);await openGame(page,{mode:'base',income:2000,living:1000});
 await expect(page.getByTestId('living-pressure')).toHaveText('50%');await expect(page.getByRole('list',{name:'Savings milestones'}).locator('li')).toHaveCount(5);
 await page.getByRole('button',{name:'Use recommended pads',exact:true}).click();
 for(let wave=1;wave<=3;wave++){
  await page.getByRole('button',{name:'Use cash for bills',exact:true}).click();await page.getByRole('button',{name:'Launch automatic wave',exact:true}).click();await page.clock.runFor(61000);
  await expect(page.getByTestId('credit-learning')).toHaveText(wave===3?'VISUAL UPGRADE EARNED':`${wave} on-time billing cycles`);
 }
 await expect(page.getByRole('progressbar',{name:'Credit learning progress'})).toHaveAttribute('value','1');
 await page.locator('.command-credit').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('credit-and-milestones.png')});
});
test('reduced-motion learning panels and touch controls do not overflow at narrow width',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await openGame(page,{mode:'base',income:1000,living:900});
 await expect(page.getByTestId('living-pressure')).toHaveText('90%');
 expect(await page.locator('.command-shell').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.locator('.command-budget-editor').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('visual-budget-mobile.png')});
});
