import {test,expect,openGame,canvas} from './helpers.mjs';
import {gridProject} from '../../lib/debtbreak-grid-view.js';
const pixel=(box,x,z)=>{const p=gridProject(x,z);return {x:box.width*p.x/1000,y:box.height*p.z/1000};};
const view=page=>canvas(page).evaluate(e=>e.__debtbreakView);
test('grid drag/tap and keyboard placement reject roads and occupied cells without spending money',async({page},info)=>{
 await openGame(page,{mode:'base'});await page.getByRole('button',{name:'Use recommended layout',exact:true}).click();await page.clock.runFor(100);
 const before=await page.getByTestId('command-income').innerText(),field=canvas(page),box=await field.boundingBox();
 if(info.project.name==='desktop-mouse')await page.locator('.grid-asset-tray button').first().dragTo(field,{targetPosition:pixel(box,250,250)});
 else{await page.locator('.grid-asset-tray button').first().tap();await field.tap({position:pixel(box,250,250)});}
 await page.clock.runFor(100);expect((await view(page)).layout.cashFlow).toEqual({col:2,row:2});
 await field.click({position:pixel(box,150,450)});await page.clock.runFor(100);expect((await view(page)).layout.cashFlow).toEqual({col:2,row:2});
 await page.getByRole('spinbutton',{name:'Build column',exact:true}).fill('4');await page.getByRole('spinbutton',{name:'Build row',exact:true}).fill('3');await expect(page.getByRole('button',{name:'Place selected asset',exact:true})).toBeDisabled();
 await field.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.clock.runFor(100);
 expect((await view(page)).layout.cashFlow).toEqual({col:2,row:2}); // occupied by need4: placement is rejected
 await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await page.clock.runFor(100);expect((await view(page)).layout.cashFlow).toEqual({col:3,row:4});
 await expect(page.getByTestId('command-income')).toHaveText(before);
 // A cancelled pointer drag must not place on the release cell.
 await field.scrollIntoViewIfNeeded();const bounds=await field.boundingBox(),layout=(await view(page)).layout;
 await page.mouse.move(bounds.x+pixel(bounds,350,450).x,bounds.y+pixel(bounds,350,450).y);await page.mouse.down();await page.mouse.move(bounds.x+pixel(bounds,750,750).x,bounds.y+pixel(bounds,750,750).y);
 await field.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await page.clock.runFor(100);expect((await view(page)).layout).toEqual(layout);
 // Escape outside placement retains the enclosing game's normal close behaviour.
 await page.getByRole('button',{name:'Exit to hangar',exact:true}).focus();await page.keyboard.press('Escape');await expect(field).toHaveCount(0);
});
