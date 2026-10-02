import {test,expect,openGame,canvas,balance,openPlan,accountCheck} from './helpers.mjs';
const view=page=>canvas(page).evaluate(el=>el.__debtbreakView);
test('live upgrade bars explain shield loss and missiles take two paid-accurate hits',async({page},info)=>{
 await openGame(page,{mode:'ground',reserves:1250,goal:1});
 await expect(page.getByTestId('ready-wall')).toContainText('READY');
 await expect(page.getByTestId('ready-wall')).toContainText('Shield OFF');
 await expect(page.getByTestId('ready-module')).toBeDisabled();
 await page.getByTestId('ready-wall').click();
 expect(await balance(page,'reserve')).toBe(110000);
 await page.getByRole('button',{name:/TOTEMS ON/}).click();await page.clock.runFor(5100);
 const first=(await view(page)).actors.find(a=>a.role==='expense'&&a.x>60&&a.x<940);expect(first).toBeTruthy();
 const opening=await balance(page);
 for(let hit=0;hit<2;hit++){
  const before=await view(page),a=before.actors.find(x=>x.id===first.id);expect(a).toBeTruthy();
  await page.clock.runFor(100);const current=await view(page),b=current.actors.find(x=>x.id===first.id),box=await canvas(page).boundingBox();
  // Lead the observed movement, then avoid the visible ad hit areas: tapping
  // an ad intentionally sends Sentinel instead of spending an interceptor.
  const dt=current.time-before.time;expect(dt).toBeGreaterThan(0);
  const vx=(b.x-a.x)/dt,vz=(b.z-a.z)/dt,length=Math.hypot(vx,vz)||1;
  // The blast reaches 80 world units plus the missile's 22-unit body.
  // Wider 85-unit offsets can clear an overlapping ad while still connecting.
  const candidates=[0,60,-60,85,-85].map(offset=>({x:b.x+vx*.7-vz/length*offset,z:b.z+vz*.7+vx/length*offset}));
  const point=candidates.find(p=>p.x>15&&p.x<985&&p.z>0&&p.z<900&&current.actors.filter(a=>a.role==='want').every(a=>Math.hypot(a.x-p.x,a.z-p.z)>90));
  await info.attach(`aim-${hit}.json`,{body:JSON.stringify({dt,a,b,vx,vz,candidates,wants:current.actors.filter(a=>a.role==='want'),point}),contentType:'application/json'});
  expect(point,'A clear lead point remains within blast reach of the missile').toBeTruthy();
  const x=box.x+box.width*point.x/1000,y=box.y+box.height*point.z/1000;
  if(info.project.name==='mobile-touch')await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
  await page.clock.runFor(1600);
  expect((await view(page)).shots).toBe(current.shots+1);expect((await view(page)).held).toBe(0);
  if(hit===0){expect((await view(page)).actors.find(x=>x.id===first.id)?.hp).toBe(1);expect(await balance(page)).toBe(opening);await page.screenshot({path:test.info().outputPath('two-hit-readiness.png')});}
 }
 expect(await balance(page)).toBeLessThan(opening);
 await openPlan(page);await accountCheck(page);
});
