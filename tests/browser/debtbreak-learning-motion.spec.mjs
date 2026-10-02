import {test,expect,openGame} from './helpers.mjs';
test('credit max effect occurs once and respects reduced motion',async({page},info)=>{
 test.setTimeout(240000);
 const reduced=info.project.name==='mobile-touch';
 await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
 await page.addInitScript(()=>{
  window.__creditEffects=0;const animate=Element.prototype.animate;
  Element.prototype.animate=function(...args){if(this.classList.contains('command-credit'))window.__creditEffects++;return animate.apply(this,args);};
 });
 await openGame(page,{mode:'base',income:2000,living:1000});
 await page.getByRole('button',{name:'Use recommended pads',exact:true}).click();
 for(let wave=1;wave<=3;wave++){
  await page.getByRole('button',{name:'Use cash for bills',exact:true}).click();
  await page.getByRole('button',{name:'Launch automatic wave',exact:true}).click();
  await page.clock.runFor(61000);
 }
 await expect(page.getByTestId('credit-learning')).toHaveText('VISUAL UPGRADE EARNED');
 expect(await page.evaluate(()=>window.__creditEffects)).toBe(reduced?0:1);
 await page.clock.runFor(10000);
 await page.getByText('Accounting & arcade rules',{exact:true}).click();
 expect(await page.evaluate(()=>window.__creditEffects)).toBe(reduced?0:1);
 await expect(page.getByTestId('command-reconciliation')).toHaveText('$0');
});
