import {test,expect,openGame,canvas,money,tapOrClick} from './helpers.mjs';
const command=page=>page.locator('.command-shell');
const view=page=>canvas(page).evaluate(el=>el.__debtbreakView);
async function launch(page){await page.getByRole('button',{name:'Use cash for bills',exact:true}).click();await page.getByRole('button',{name:'Launch automatic wave',exact:true}).click();await page.clock.runFor(200);}

test('new commander places, funds, survives three waves, upgrades, pauses and retries',async({page})=>{
 test.setTimeout(360000);await openGame(page,{mode:'base'});
 await expect(command(page)).toHaveAttribute('data-stage','setup');
 await expect(page.getByRole('button',{name:'Launch automatic wave',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Use recommended pads',exact:true}).click();
 await expect(page.getByLabel('Place Cash Flow',{exact:true})).toHaveValue('0');
 await expect(page.getByRole('checkbox',{name:'Use savings as impact backup'})).not.toBeChecked();
 await expect(page.getByRole('list',{name:'Seven needs protected by one shared base'}).locator('li')).toHaveCount(7);
 await page.getByRole('checkbox',{name:'Use savings as impact backup'}).check();await page.getByRole('spinbutton',{name:'Reserve impact cap',exact:true}).fill('100');await page.getByRole('button',{name:'Apply explicit budgets',exact:true}).click();
 await launch(page);await page.clock.runFor(6100);
 const early=await view(page);expect(early.autoPaid).toBeGreaterThan(0);expect(early.actors.some(a=>a.role==='debt')).toBe(true);
 await page.getByRole('button',{name:'Pause',exact:true}).click();const frozen=await view(page),income=await page.getByTestId('command-income').innerText();await page.clock.runFor(3000);expect((await view(page)).time).toBe(frozen.time);await expect(page.getByTestId('command-income')).toHaveText(income);
 await canvas(page).scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('command-combat.png')});
 await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.runFor(200);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();const backgroundTime=(await view(page)).time;await page.clock.runFor(1000);expect((await view(page)).time).toBe(backgroundTime);await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.runFor(54000);
 await expect(command(page)).toHaveAttribute('data-stage','build');await expect(page.getByTestId('command-budget')).toHaveText('$0');
 await expect(command(page)).toContainText('$0 unpaid at close');await expect(page.getByRole('checkbox',{name:'Use savings as impact backup'})).not.toBeChecked();
 const reserves=money(await page.getByTestId('command-reserve').innerText());await page.getByTestId('upgrade-cashFlow').click();await expect(page.getByTestId('command-reserve')).toHaveText(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format((reserves-15000)/100));
 await launch(page);await page.clock.runFor(60200);await expect(command(page)).toHaveAttribute('data-stage','build');
 await launch(page);await page.clock.runFor(60200);await expect(command(page)).toHaveAttribute('data-stage','victory');await expect(command(page)).toHaveAttribute('data-phase','complete');await expect(page.getByTestId('upgrade-cashFlow')).toHaveText('Run ended');await expect(page.getByTestId('command-unpaid')).toHaveText('$0');
 await page.getByText('Accounting & arcade rules',{exact:true}).click();await expect(page.getByTestId('command-reconciliation')).toHaveText('$0');
 await page.screenshot({path:test.info().outputPath('command-victory.png')});
 await page.getByRole('button',{name:'Retry / new setup',exact:true}).click();await expect(page.getByRole('button',{name:'SET UP BASE',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'SET UP BASE',exact:true}).dblclick();await expect(command(page)).toHaveAttribute('data-stage','setup');await expect(page.getByTestId('command-budget')).toHaveText('$0');await expect(page.getByTestId('command-income')).toHaveText('$4,000');
});

test('reserve coverage is explicit, can be revoked before impact and only pays its remaining cap',async({page})=>{
 await openGame(page,{mode:'base',income:100,reserves:60});await page.getByRole('button',{name:'Use recommended pads',exact:true}).click();
 await page.getByRole('button',{name:'Use cash for bills',exact:true}).click();await page.getByRole('checkbox',{name:'Use savings as impact backup'}).check();await page.getByRole('spinbutton',{name:'Reserve impact cap',exact:true}).fill('60');await page.getByRole('button',{name:'Apply explicit budgets',exact:true}).click();await page.getByRole('button',{name:'Launch automatic wave',exact:true}).click();await page.clock.runFor(4500);
 await page.getByRole('button',{name:'Budget / setup',exact:true}).click();await page.getByRole('checkbox',{name:'Use savings as impact backup'}).uncheck();await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.runFor(15000);await expect(page.getByTestId('command-reserve')).toHaveText('$60');
 await page.getByRole('button',{name:'Budget / setup',exact:true}).click();await page.getByRole('checkbox',{name:'Use savings as impact backup'}).check();await page.getByRole('spinbutton',{name:'Reserve impact cap',exact:true}).fill('60');await page.getByRole('button',{name:'Apply explicit budgets',exact:true}).click();await page.getByRole('button',{name:'Resume with this budget',exact:true}).click();await page.clock.runFor(15000);
 await expect(page.getByTestId('command-reserve')).toHaveText('$0');await expect(page.getByTestId('command-unpaid')).toHaveText('$1,040');await page.clock.runFor(2000);await expect(page.getByTestId('command-reserve')).toHaveText('$0');await page.getByText('Accounting & arcade rules',{exact:true}).click();await expect(page.getByTestId('command-reconciliation')).toHaveText('$0');
});

test('touch or mouse placement, disabled upgrade feedback and underfunded defeat remain usable',async({page},info)=>{
 test.setTimeout(360000);await openGame(page,{mode:'base',income:100,reserves:0});
 const box=await canvas(page).boundingBox(),x=box.x+box.width*.08,y=box.y+box.height*.34;
 if(info.project.name==='mobile-touch')await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
 await expect(page.getByLabel('Place Cash Flow',{exact:true})).toHaveValue('0');await expect(page.getByTestId('upgrade-cashFlow')).toBeDisabled();await expect(page.getByTestId('upgrade-cashFlow')).toContainText('Need $150');
 await page.getByRole('button',{name:'Use recommended pads',exact:true}).click();await launch(page);await page.clock.runFor(20000);
 await expect(command(page)).toContainText('payment shortfall');await expect(page.getByTestId('command-reserve')).toHaveText('$0');
 const v=await view(page);expect(v.actors.length).toBeLessThanOrEqual(20);expect(v.actors.some(a=>a.hp===0)).toBe(true);
 for(let n=0;n<4;n++){if(await command(page).getAttribute('data-phase')==='gameover')break;await page.clock.runFor(61000);if(await command(page).getAttribute('data-stage')==='build')await launch(page);}
 await expect(command(page)).toHaveAttribute('data-phase','gameover');await expect(page.getByRole('button',{name:'Retry / new setup',exact:true})).toBeVisible();
 await page.getByText('Accounting & arcade rules',{exact:true}).click();await expect(page.getByTestId('command-reconciliation')).toHaveText('$0');
 await page.getByRole('button',{name:'Retry / new setup',exact:true}).click();await page.getByRole('button',{name:'SET UP BASE',exact:true}).click();await expect(command(page)).toHaveAttribute('data-stage','setup');await expect(page.getByTestId('command-income')).toHaveText('$100');await expect(page.getByTestId('command-reserve')).toHaveText('$0');
});

for(const size of [{width:390,height:844},{width:844,height:390}])test(`automated setup and live field fit ${size.width}x${size.height}`,async({page})=>{
 await page.setViewportSize(size);await openGame(page,{mode:'base'});await page.getByRole('button',{name:'Use recommended pads',exact:true}).click();await launch(page);await page.clock.runFor(4100);expect(await command(page).evaluate(el=>el.scrollTop)).toBe(0);expect(await page.locator('.command-controls').evaluate(el=>el.scrollTop)).toBe(0);
 await canvas(page).scrollIntoViewIfNeeded();const bounds=await page.locator('.command-field').boundingBox();expect(bounds.height).toBeGreaterThanOrEqual(150);expect(bounds.width).toBeLessThanOrEqual(size.width);expect(bounds.x).toBeGreaterThanOrEqual(0);
 expect(await command(page).evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.screenshot({path:test.info().outputPath(`command-${size.width}x${size.height}.png`)});
 await tapOrClick(page,page.getByRole('button',{name:'Budget / setup',exact:true}));await expect(page.getByRole('button',{name:'Apply explicit budgets',exact:true})).toBeVisible();
});
