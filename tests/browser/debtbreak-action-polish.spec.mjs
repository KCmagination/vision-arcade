import {test,expect,openGame,canvas} from './helpers.mjs';
test('moving amounts avoid gun captions and one another while visual histories remain bounded',async({page})=>{
 await openGame(page,{mode:'base'});
 await page.evaluate(()=>{
  window.__amountAudit=[];const proto=CanvasRenderingContext2D.prototype,clear=proto.clearRect,text=proto.fillText;
  proto.clearRect=function(...a){if(this.canvas.classList.contains('siege-canvas'))window.__amountAudit=[];return clear.apply(this,a);};
  proto.fillText=function(...a){if(this.canvas.classList.contains('siege-canvas')){
   const m=this.getTransform(),scale=this.canvas.width/this.canvas.getBoundingClientRect().width,w=this.measureText(String(a[0])).width;
   // Audit actual canvas positions, including the rotated living-cost ruler.
   window.__amountAudit.push({text:String(a[0]),x:(m.a*a[1]+m.c*a[2]+m.e)/scale,y:(m.b*a[1]+m.d*a[2]+m.f)/scale,width:(Math.abs(m.a)*w+Math.abs(m.c)*16)/scale,height:(Math.abs(m.b)*w+Math.abs(m.d)*16)/scale});
  }return text.apply(this,a);};
 });
 await page.getByRole('button',{name:'Use recommended layout',exact:true}).click();await page.getByRole('button',{name:'Use cash for bills',exact:true}).click();await page.getByRole('button',{name:'Launch automatic wave',exact:true}).click();
 let samples=0;for(let i=0;i<16;i++){
  await page.clock.runFor(1000);const audit=await page.evaluate(()=>({labels:window.__amountAudit,presentation:document.querySelector('canvas.siege-canvas').__debtbreakPresentation}));
  expect(audit.presentation.shots.length).toBeLessThanOrEqual(12);expect(audit.presentation.deaths).toBeLessThanOrEqual(10);
  const amounts=audit.labels.filter(l=>/^(\$\d|Paid \$|Savings paid \$)/.test(l.text));samples+=audit.labels.filter(l=>/^\$\d/.test(l.text)).length;
  for(const amount of amounts)for(const other of audit.labels.filter(l=>l!==amount&&(/^(\$\d|Paid \$|Savings paid \$)/.test(l.text)||/^(CASH FLOW|CAPITAL|COLLATERAL|CREDIT|Cash Flow|Capital|Collateral|Credit|Need [1-7]|PAD \d|LIVING COSTS)/.test(l.text)))){
   const overlapX=(amount.width+other.width)/2-Math.abs(amount.x-other.x),overlapY=(amount.height+other.height)/2-Math.abs(amount.y-other.y);
   expect(overlapX<=0||overlapY<=0,`${amount.text} overlaps ${other.text}`).toBe(true);
  }
 }
 expect(samples).toBeGreaterThan(8);await canvas(page).screenshot({path:test.info().outputPath('action-label-clearance.png')});
});
