import {test,expect,openGame,canvas} from './helpers.mjs';

async function observeField(page){
 await page.addInitScript(()=>{
  window.__fieldAudit={lines:[],labels:[]};let path=[];
  const p=CanvasRenderingContext2D.prototype,clear=p.clearRect,begin=p.beginPath,move=p.moveTo,line=p.lineTo,stroke=p.stroke,text=p.fillText,arc=p.arc,ellipse=p.ellipse;
  const field=c=>c.canvas.classList.contains('siege-canvas');
  p.clearRect=function(...a){if(field(this))window.__fieldAudit={lines:[],labels:[],width:a[2],height:a[3],circles:[]};return clear.apply(this,a);};
  p.beginPath=function(...a){if(field(this))path=[];return begin.apply(this,a);};
  p.moveTo=function(...a){if(field(this))path.push(a);return move.apply(this,a);};
  p.lineTo=function(...a){if(field(this))path.push(a);return line.apply(this,a);};
  p.stroke=function(...a){if(field(this)&&this.strokeStyle==='#f5c575')window.__fieldAudit.lines.push({path:[...path],dash:this.getLineDash()});return stroke.apply(this,a);};
  p.arc=function(...a){if(field(this))window.__fieldAudit.circles?.push({x:a[0],y:a[1],radius:a[2]});return arc.apply(this,a);};
  p.ellipse=function(...a){if(field(this))window.__fieldAudit.circles?.push({x:a[0],y:a[1],radius:a[3],rx:a[2]});return ellipse.apply(this,a);};
 p.fillText=function(...a){if(field(this))window.__fieldAudit.labels.push({text:a[0],x:a[1],y:a[2],width:this.measureText(String(a[0])).width});return text.apply(this,a);};
 });
}
for(const c of [
 {name:'50',income:2000,living:1000,position:.5,label:'LIVING COSTS 50%'},
 {name:'90',income:1000,living:900,position:.9,label:'LIVING COSTS 90%'},
 {name:'150',income:1000,living:1500,position:1,label:'LIVING COSTS 150%'},
 {name:'zero-income',income:0,living:1000,position:1,label:'COSTS / NO INCOME'},
 {name:'zero-cost',income:1000,living:0,position:0,label:'LIVING COSTS 0%'},
 {name:'zero-basis',income:0,living:0,position:null,label:'LIVING COSTS: NO RATIO'},
])test(`actual battlefield pressure ${c.name}`,async({page})=>{
 await observeField(page);await openGame(page,{mode:'base',income:c.income,living:c.living});
 const drawn=await page.evaluate(()=>window.__fieldAudit);
 expect(drawn.labels.some(l=>l.text===c.label)).toBe(true);
 if(c.position===null)expect(drawn.lines).toHaveLength(0);
 else{expect(drawn.lines).toHaveLength(1);expect(drawn.lines[0].dash).toEqual([8,5]);expect(drawn.lines[0].path[0][1]/drawn.height).toBeCloseTo((65+c.position*800*.84)/1000,8);}
 const label=drawn.labels.find(l=>l.text===c.label),heading=drawn.labels.find(l=>l.text==='GROUND APPROACH');expect(Math.abs(label.y-heading.y)).toBeGreaterThan(12);
 for(const pad of drawn.circles.filter(p=>p.x>drawn.width*.75&&p.radius>=7)){if(label.x+label.width/2+8>pad.x-(pad.rx??pad.radius)&&label.x-label.width/2-8<pad.x+(pad.rx??pad.radius))expect(Math.abs(label.y-pad.y)).toBeGreaterThan(pad.radius+10);}
 await canvas(page).scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`pressure-${c.name}.png`)});
});

for(const months of [1,3,6,9,12])test(`savings marker ${months} gains and reverses with actual transfers and upgrade spending`,async({page})=>{
 await openGame(page,{mode:'base',reserves:months*1200-.01});
 const markers=page.getByRole('list',{name:'Savings milestones'});
 await expect(markers.getByRole('listitem',{name:`${months} months not reached`,exact:true})).toBeVisible();
 await page.getByText('Move cash into savings',{exact:true}).click();await page.getByRole('spinbutton',{name:'Transfer to savings',exact:true}).fill('.01');await page.getByRole('button',{name:'Move to savings',exact:true}).click();
 await expect(markers.getByRole('listitem',{name:`${months} months reached`,exact:true})).toBeVisible();
 await page.locator('.command-guides').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`savings-${months}-gained.png`)});
 await page.getByTestId('upgrade-cashFlow').click();await expect(markers.getByRole('listitem',{name:`${months} months not reached`,exact:true})).toBeVisible();
 await page.getByText('Accounting & arcade rules',{exact:true}).click();await expect(page.getByTestId('command-reconciliation')).toHaveText('$0');
 await page.locator('.command-guides').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`savings-${months}-spent.png`)});
});

test('keyboard setup, paused planning, and next-wave budget keep a visible focus target',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await openGame(page,{mode:'base'});
 const preset=page.getByRole('button',{name:'Use recommended pads',exact:true});await preset.focus();await page.keyboard.press('Enter');
 const cap=page.getByRole('spinbutton',{name:'Cash defense may spend',exact:true});await cap.focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('1200');
 const launch=page.getByRole('button',{name:'Launch automatic wave',exact:true});await launch.focus();await page.keyboard.press('Enter');await page.clock.runFor(200);
 await expect(canvas(page)).toBeFocused();await page.keyboard.press('p');await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Budget / setup',exact:true}).focus();await page.keyboard.press('Enter');await expect(cap).toBeFocused();
 await page.getByRole('button',{name:'Resume with this budget',exact:true}).focus();await page.keyboard.press('Enter');await page.clock.runFor(61000);
 await expect(page.locator('.command-shell')).toHaveAttribute('data-stage','build');await expect(cap).toBeFocused();
 await expect(cap).toHaveValue('0');await expect(page.getByTestId('command-budget')).toHaveText('$0');await expect(page.getByTestId('command-income')).toHaveText('$6,800');
 await page.screenshot({path:test.info().outputPath('keyboard-next-wave-budget.png')});
});

test('modeled balance reduction contributes to the rendered credit meter only at period close',async({page})=>{
 await openGame(page,{mode:'base',beforeEnter:async page=>{
  await page.getByRole('button',{name:'Advanced: debts & living costs',exact:true}).click();await page.getByRole('button',{name:'Add debt',exact:true}).click();
  for(const [name,value]of [['Debt 1 nickname','Audit card'],['Debt 1 balance ($)','10000'],['Debt 1 monthly payment ($)','200']])await page.getByRole(name.includes('nickname')?'textbox':'spinbutton',{name,exact:true}).fill(value);
  await page.getByText('Optional rate, term & estimate',{exact:true}).click();
  await page.getByRole('spinbutton',{name:'Debt 1 purchase APR (%)',exact:true}).fill('0');await page.getByRole('spinbutton',{name:'Debt 1 included taxes, insurance or fees ($)',exact:true}).fill('0');
  await page.getByRole('combobox',{name:'Debt 1 rate type',exact:true}).click();await page.getByRole('option',{name:'Fixed / held constant',exact:true}).click();
  await page.getByRole('checkbox',{name:'Allow an estimate for this account',exact:true}).check();await page.getByRole('checkbox',{name:'Enable selected estimates for opted-in accounts',exact:true}).check();await page.getByRole('button',{name:'Apply to My picture',exact:true}).click();
 }});
 const bar=page.getByRole('progressbar',{name:'Credit learning progress',exact:true});await expect(bar).toHaveAttribute('value','0');
 await page.getByRole('button',{name:'Use recommended pads',exact:true}).click();await page.getByRole('button',{name:'Use cash for bills',exact:true}).click();await page.getByRole('button',{name:'Launch automatic wave',exact:true}).click();await page.clock.runFor(12000);await expect(bar).toHaveAttribute('value','0');
 await page.clock.runFor(49000);await expect(page.getByTestId('credit-learning')).toHaveText('1 on-time billing cycles');expect(Number(await bar.getAttribute('value'))).toBeCloseTo(1.02/3,8);await expect(page.locator('.command-credit')).toContainText('2% best net reduction.');
 await page.locator('.command-credit').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('modeled-credit-meter.png')});
});

