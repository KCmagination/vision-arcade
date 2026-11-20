import {test,expect,openGame,canvas} from './helpers.mjs';
const view=page=>canvas(page).evaluate(el=>el.__debtbreakView);
test('paycheck-only launch applies entered budget, impacts explain costs, quiet tail ends early',async({page})=>{
 test.setTimeout(240000);await openGame(page,{mode:'base',income:1200,reserves:0});
 await expect(page.getByRole('checkbox',{name:'Use savings as impact backup'})).toBeDisabled();
 await page.getByRole('button',{name:'Use recommended layout',exact:true}).click();
 // Choose genuinely poor coverage so a physical paid impact is part of this scenario.
 await page.getByRole('spinbutton',{name:'Build column',exact:true}).fill('1');await page.getByRole('spinbutton',{name:'Build row',exact:true}).fill('1');await page.getByRole('button',{name:'Place selected asset',exact:true}).click();
 // Exercise the previous confusing path: entering income, without a separate Apply click.
 await page.getByRole('spinbutton',{name:'Cash defense may spend',exact:true}).fill('1200');
 await expect(page.getByRole('button',{name:'Launch automatic wave',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Launch automatic wave',exact:true}).click();
 let elapsed=0,impact=false;
 while(elapsed<60000){await page.clock.runFor(500);elapsed+=500;if(await page.getByTestId('command-impact-receipt').count()){impact=true;await expect(page.getByTestId('command-impact-receipt')).toContainText('reserves paid $0');}if((await view(page)).stage==='build')break;}
 expect(impact).toBe(true);expect(elapsed).toBeLessThan(55000);
 await expect(page.locator('.command-shell')).toHaveAttribute('data-stage','build');
 await expect(page.locator('.command-shell')).toContainText('$0 unpaid at close');
 await expect(page.getByTestId('command-reserve')).toHaveText('$0');
 await page.getByText('Accounting & arcade rules',{exact:true}).click();await expect(page.getByTestId('command-reconciliation')).toHaveText('$0');
 const frozen=await view(page);await page.clock.runFor(2000);expect(await view(page)).toEqual(frozen);
 await page.screenshot({path:test.info().outputPath('paycheck-build-receipt.png')});
});
