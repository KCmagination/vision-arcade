import {test,expect,openGame,canvas} from './helpers.mjs';
const view=page=>canvas(page).evaluate(e=>e.__debtbreakView);
test('grid drag/tap and keyboard placement reject roads and occupied cells without spending money',async({page},info)=>{
 await openGame(page,{mode:'base'});await page.getByRole('button',{name:'Use recommended layout',exact:true}).click();await page.clock.runFor(100);
 const before=await page.getByTestId('command-income').innerText(),field=canvas(page),box=await field.boundingBox();
 if(info.project.name==='desktop-mouse')await page.locator('.grid-asset-tray button').first().dragTo(field,{targetPosition:{x:box.width*.25,y:box.height*.25}});
 else{await page.locator('.grid-asset-tray button').first().tap();await field.tap({position:{x:box.width*.25,y:box.height*.25}});}
 await page.clock.runFor(100);expect((await view(page)).layout.cashFlow).toEqual({col:2,row:2});
 await field.click({position:{x:box.width*.15,y:box.height*.45}});await page.clock.runFor(100);expect((await view(page)).layout.cashFlow).toEqual({col:2,row:2});
 await page.getByRole('spinbutton',{name:'Build column',exact:true}).fill('4');await page.getByRole('spinbutton',{name:'Build row',exact:true}).fill('3');await expect(page.getByRole('button',{name:'Place selected asset',exact:true})).toBeDisabled();
 await field.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.clock.runFor(100);
 expect((await view(page)).layout.cashFlow).toEqual({col:2,row:2}); // occupied by need4: placement is rejected
 await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await page.clock.runFor(100);expect((await view(page)).layout.cashFlow).toEqual({col:3,row:4});
 await expect(page.getByTestId('command-income')).toHaveText(before);
 // A cancelled pointer drag must not place on the release cell.
 await field.scrollIntoViewIfNeeded();const bounds=await field.boundingBox(),layout=(await view(page)).layout;
 await page.mouse.move(bounds.x+bounds.width*.35,bounds.y+bounds.height*.45);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.75,bounds.y+bounds.height*.75);
 await field.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await page.clock.runFor(100);expect((await view(page)).layout).toEqual(layout);
 // Escape outside placement retains the enclosing game's normal close behaviour.
 await page.getByRole('button',{name:'Exit to hangar',exact:true}).focus();await page.keyboard.press('Escape');await expect(field).toHaveCount(0);
});
