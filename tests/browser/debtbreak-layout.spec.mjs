import {test,expect,openGame,shell,openPlan,accountCheck} from './helpers.mjs';

for(const size of [{width:1180,height:750},{width:390,height:844},{width:844,height:390}]){
 test(`playfield and controls remain visible at ${size.width}x${size.height}`,async({page})=>{
  await page.setViewportSize(size);
  await openGame(page,{mode:'ground',income:4250,living:1300,debt:400,reserves:5250});
  const bounds=await shell(page).evaluate(el=>{
   const box=s=>{const r=el.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height};};
   return {field:box('.siege-battlefield'),controls:box('.siege-weapons'),income:box('.siege-balances'),payday:box('.siege-payday'),scroll:el.scrollTop,height:innerHeight,width:innerWidth};
  });
  expect(bounds.scroll).toBe(0);
  for(const b of [bounds.field,bounds.controls,bounds.income,bounds.payday]){
   expect(b.top).toBeGreaterThanOrEqual(0);expect(b.bottom).toBeLessThanOrEqual(bounds.height);
   expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(bounds.width);
  }
  expect(bounds.field.height).toBeGreaterThan(180);
  expect(bounds.controls.top).toBeGreaterThanOrEqual(bounds.field.bottom);
  await expect(shell(page).locator('.siege-protection')).toContainText('Goal shield: ON');
  await expect(shell(page).locator('.siege-protection')).toContainText('Auto bill payments: OFF');
  await page.screenshot({path:test.info().outputPath('playfield.png')});
  await openPlan(page);
  await expect(page.getByText('Investable surplus:',{exact:false})).toHaveCount(0);
  const expand=page.getByRole('button',{name:'Expand wall · $150',exact:true});
  await expand.click();
  await expect(page.getByText('This turns OFF the goal shield',{exact:false})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Tactical Pause/})).toBeInViewport();
  await expect(page.getByRole('button',{name:'Close',exact:true}).last()).toBeInViewport();
  await page.screenshot({path:test.info().outputPath('wall-tradeoff.png')});
  await expand.click();
  await accountCheck(page);
  await expect(page.locator('.dbc-log')).toContainText('Goal shield OFF');
 });
}
