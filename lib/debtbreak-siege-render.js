import {combatActors,radarSeconds,TURRET,TOTEMS} from './debtbreak-siege.js';
import {basePlan,lifestyleCoverage,capitalShield} from './debtbreak-continuous.js';
import {drawCommandField} from './debtbreak-command-render.js';
const cash=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n%100?2:0}).format(n/100);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function drawSiege(ctx,w,width,height,assets={},reduced=false){
 if(w.ledger.continuous.ground?.command){drawCommandField(ctx,w,width,height,assets,reduced);return;}
 const ground=!!w.ground;
 const sx=width/1000,sy=height/1000,u=Math.max(.4,Math.min(width,height)/1000),c=w.ledger.continuous;
 const p=(x,z)=>[x*sx,z*sy];
 const line=(x1,z1,x2,z2,color,weight=1)=>{ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.beginPath();ctx.moveTo(...p(x1,z1));ctx.lineTo(...p(x2,z2));ctx.stroke();};
 const text=(s,x,z,color='#b8ecff',size=12,align='center')=>{ctx.font=`600 ${size}px system-ui`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(s,...p(x,z));};
 const label=(s,x,z,color='#77eaff')=>{ctx.font='600 12px system-ui';const tw=ctx.measureText(s).width+16,px=clamp(x*sx,tw/2+5,width-tw/2-5),py=z*sy;ctx.fillStyle='#041326e8';ctx.strokeStyle=color;ctx.lineWidth=1;ctx.fillRect(px-tw/2,py-12,tw,24);ctx.strokeRect(px-tw/2,py-12,tw,24);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s,px,py);};
 const sprite=(index,x,z,sw,sh,angle=0)=>{
  if(!assets.atlas)return;
  const im=assets.atlas,frames=[[35,160,645,390],[835,0,240,600],[75,760,515,465],[705,630,485,610]],f=frames[index];
  const fit=Math.min(sw/f[2],sh/f[3])*u,dw=f[2]*fit,dh=f[3]*fit;
  ctx.save();ctx.translate(...p(x,z));ctx.rotate(angle);ctx.drawImage(im,...f,-dw/2,-dh/2,dw,dh);ctx.restore();
 };
 ctx.clearRect(0,0,width,height);ctx.fillStyle='#020b1c';ctx.fillRect(0,0,width,height);
 const background=ground?assets.ground:assets.space;
 if(background){ctx.save();ctx.globalAlpha=ground?.95:.78;const r=Math.max(width/background.width,height/background.height),dw=background.width*r,dh=background.height*r;ctx.drawImage(background,(width-dw)/2,(height-dh)/2,dw,dh);ctx.restore();}
 const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'#01081955');shade.addColorStop(.6,'#01081900');shade.addColorStop(1,'#061c32aa');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
 // Credit radar is a functional warning-range display.
 ctx.save();ctx.strokeStyle='#19c9ff45';ctx.lineWidth=1;
 for(const r of [190,270,350+radarSeconds(w.ledger)*10]){ctx.beginPath();ctx.ellipse(...p(500,995),r*sx,r*.8*sy,0,Math.PI,Math.PI*2);ctx.stroke();}
 ctx.restore();
 const plan=basePlan(w.ledger),ratio=plan.goal?clamp(Math.max(0,w.ledger.reserves)/plan.goal,0,1):w.ledger.reserves>0?1:0;
 const coverage=lifestyleCoverage(w.ledger),shield=capitalShield(w.ledger);
 const expanded=c.base?.expansions??0,radius=290+Math.min(14,expanded)*13,condition=w.ledger.defenses.reduce((n,d)=>n+d.condition,0),maximum=w.ledger.defenses.reduce((n,d)=>n+(d.maxCondition??100),0);
 // The dome visualizes available capital; protection spends reserves through the ledger only.
 if(ratio>0){ctx.save();const g=ctx.createRadialGradient(...p(500,970),15,...p(500,970),radius*sx);g.addColorStop(0,'#16ee9404');g.addColorStop(.65,`rgba(18,205,156,${.035+ratio*.07})`);g.addColorStop(1,`rgba(80,255,172,${.08+ratio*.2})`);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(...p(500,990),radius*sx,265*sy,0,Math.PI,Math.PI*2);ctx.closePath();ctx.fill();ctx.strokeStyle=c.autoProtect?'#71ffb4':'#579d82';ctx.lineWidth=c.autoProtect?2.5:1;ctx.shadowColor='#31ffaa';ctx.shadowBlur=shield.charged&&!reduced?26:c.autoProtect&&!reduced?14:0;ctx.stroke();ctx.strokeStyle='#a4f0ff65';ctx.beginPath();ctx.ellipse(...p(500,990),(radius-5)*sx,260*sy,0,Math.PI,Math.PI*2);ctx.stroke();ctx.restore();}
 // Armor arc and each purchased segment are driven by owned defense capacity.
 const pieces=14+expanded*2,armor=maximum?condition/maximum:0;
 for(let i=0;i<pieces;i++){
  const a=Math.PI+i/pieces*Math.PI,b=Math.PI+(i+.88)/pieces*Math.PI;
  ctx.beginPath();ctx.ellipse(...p(500,995),(radius-38)*sx,205*sy,0,a,b);ctx.strokeStyle=i/pieces<armor?'#8499ac':'#412e3b';ctx.lineWidth=Math.max(9,15*u);ctx.stroke();
  ctx.beginPath();ctx.ellipse(...p(500,995),(radius-38)*sx,205*sy,0,a,b);ctx.strokeStyle=i/pieces<armor?'#fdb55e':'#a34b52';ctx.lineWidth=2;ctx.stroke();
 }
 // Every foundation column aligns with the lifestyle tile directly beneath it.
 for(let i=0;i<7;i++){
  const a=coverage.areas[i],left=i*1000/7+5,right=(i+1)*1000/7-5;
  for(let j=0;j<a.required;j++){
   const wall=w.ledger.defenses.find(d=>d.id===`expansion:${i+1+j*7}`),active=wall?.condition>0,z=995-j*19;
   ctx.fillStyle=active?'#238e79':wall?'#863e4a':'#0a2031';ctx.strokeStyle=active?'#83ffd0':'#406476';ctx.lineWidth=1;
   ctx.fillRect(left*sx,(z-14)*sy,(right-left)*sx,13*sy);ctx.strokeRect(left*sx,(z-14)*sy,(right-left)*sx,13*sy);
  }
 }
 if(ground){ctx.save();ctx.setLineDash([5,9]);line(95,390,905,390,'#6eeacc35');ctx.restore();text('TOTEM RANGE',895,378,'#7cc4bf',11);}
 const actors=combatActors(w);
 for(const a of actors.filter(a=>a.warning).sort((a,b)=>Number(b.highRate)-Number(a.highRate)).slice(0,4)){
  const x=clamp(a.x,65,935),z=clamp(a.z,55,200);
  line(x,z,x,Math.max(35,z-20),'#ffc95a',2);
  label(ground?`${a.target.kind==='incident'?'SURPRISE':'BILL'} · ${cash(a.remaining)} · ${Math.ceil(a.entryIn)}s`:`${a.rate===null?'APR ?':`${a.rate}% APR`} · ${Math.ceil(a.entryIn)}s`,x,z,a.highRate?'#ffcb57':'#84ddff');
 }
 for(const a of actors.filter(a=>a.visible).sort((a,b)=>a.z-b.z)){
  const lane=a.target.lane,color=lane==='living'?'#ffc264':lane==='want'?'#e5a1ff':'#ff6d78';
  if(ground&&lane!=='want'){
   if(lane==='credit'){
    sprite(0,a.x,a.z,105,85);const account=c.accounts.find(x=>x.id===a.target.accountId);
    if(account?.fees){ctx.strokeStyle='#ff586b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(...p(a.x,a.z),45*u,0,Math.PI*2);ctx.stroke();}
    const component=a.contacts?'UNPAID':a.extra?'EXTRA':account?.fees?'DUE + FEE':account?.interest?'DUE + INT':'DUE';
    text(component,a.x,a.z+35,account?.fees?'#ff9ba9':'#ffd187',11);
   }else{
    const angle=a.angle+Math.PI/2,dx=Math.cos(angle),dz=Math.sin(angle);
    ctx.save();ctx.shadowColor='#ffba5b';ctx.shadowBlur=reduced?0:14;line(a.x-dx*55,a.z-dz*55,a.x,a.z,'#ffc66d',4);
    ctx.fillStyle='#fff4ca';ctx.beginPath();ctx.arc(...p(a.x,a.z),8,0,Math.PI*2);ctx.fill();ctx.restore();
    text(a.contacts?'UNPAID':a.target.kind==='incident'?'!':'$',a.x+18,a.z,'#ffe5ac',a.contacts?10:14);
   }
  }else if(lane==='credit'){
   ctx.save();ctx.setLineDash([3,8]);line(a.x,a.z,500,790,'#d8416140');ctx.restore();
   const account=c.accounts.find(x=>x.id===a.target.accountId),growth=account?1+Math.min(.35,(account.interest+account.fees)/Math.max(1,account.opening)*4):1;
   sprite(1,a.x,a.z,110*growth,110*growth,a.angle);
   if(a.highRate&&a.x>35&&a.x<965&&a.z>50)text(`${a.rate}%`,a.x,a.z-36,'#ffd465',12);
  }else sprite(lane==='want'?2:0,a.x,a.z,lane==='want'?85:100,lane==='want'?85:80);
  if(lane!=='want'){
   const x=a.x*sx,y=a.z*sy-37*u,bar=64*u;
   ctx.fillStyle='#182a42';ctx.fillRect(x-bar/2,y,bar,4);ctx.fillStyle=color;ctx.fillRect(x-bar/2,y,bar*clamp(ground?a.hp/a.maxHp:a.remaining/a.original,0,1),4);
   if(ground)text(`${a.hp}/${a.maxHp} · ${cash(a.remaining)}`,a.x,a.z-58,color,11);
  }
  if(a.id===w.lockedId||a.target.id===w.hoveredId){
   ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.strokeRect(a.x*sx-42*u,a.z*sy-40*u,84*u,80*u);
   label(`${cash(a.target.remaining)} · ${lane==='want'?'optional':`due day ${a.target.dueDay}`}`,a.x,a.z-68,color);
  }
 }
 if(ground){
  // Show a bounded skyline of purchased modules; the ledger retains every asset.
  for(const [i,a] of c.ground.assets.slice(-14).entries()){
   const d=w.ledger.defenses.find(d=>d.id===a.id),x=45+(i%7)*150,z=755+Math.floor(i/7)*65,h=28+Math.min(18,(d?.condition??0));
   ctx.fillStyle=d?.condition>0?'#183f43':'#412d39';ctx.strokeStyle=d?.condition>0?'#82e6b0':'#af6772';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.moveTo(...p(x-26,z));ctx.lineTo(...p(x-26,z-h));ctx.lineTo(...p(x,z-h-14));ctx.lineTo(...p(x+26,z-h));ctx.lineTo(...p(x+26,z));ctx.closePath();ctx.fill();ctx.stroke();
   for(let row=0;row<2;row++)line(x-14,z-10-row*13,x+14,z-10-row*13,d?.condition>0?'#ffc874':'#69424d',2);
  }
  if(c.ground.assets.length)label(`OUTPOST · ${c.ground.assets.length} MODULES`,830,690,'#ffce8c');
  for(const [index,t] of TOTEMS.entries()){
   sprite(3,t.x,t.z,100,135);label(t.label,t.x,t.z+60,t.color);
  }
  for(const b of w.ground.beams){const tower=TOTEMS[b.tower];ctx.save();ctx.globalAlpha=Math.max(0,1-(w.time-b.born)/.18);line(tower.x,tower.z-35,b.x,b.z,tower.color,2);ctx.restore();}
  for(const b of w.ground.projectiles){line(500,935,b.x,b.z,'#61efff70',1);ctx.fillStyle='#bfffff';ctx.beginPath();ctx.arc(...p(b.x,b.z),4,0,Math.PI*2);ctx.fill();}
  for(const b of w.ground.blasts){const active=(c.holds[b.id]?.amount??0)>0;ctx.save();ctx.strokeStyle=active?'#7bfbff':'#688b94';ctx.fillStyle=active?'#63eaff25':'#63eaff08';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(...p(b.x,b.z),b.radius*sx,b.radius*sy,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
  for(const [i,a] of c.accounts.slice(0,width<600?2:5).entries()){const count=Math.min(c.accounts.length,width<600?2:5),x=(i+.5)*1000/Math.max(1,count),known=a.method!=='payments';text(a.name.slice(0,14),x,55,'#dae8ff',12);text(known?`P ${cash(a.principal)}`:'Balance not projected',x,80,'#ffd187',12);if(known)text(`I ${cash(a.interest)} · F ${cash(a.fees)}`,x,105,a.fees?'#ff8e9e':'#b9c8dc',12);}
 }
 for(const b of w.bullets){line(b.x-b.dx*18,b.z-b.dz*18,b.x,b.z,b.source==='reserve'?'#7affb9':'#ffc55b',3);}
 for(const e of w.effects){
  const age=w.time-e.born;if(age<0||age>1.1)continue;
  ctx.save();ctx.globalAlpha=Math.max(0,1-age/1.1);
  if(e.type==='laser'&&age<.19){ctx.shadowColor='#38e5ff';ctx.shadowBlur=reduced?0:14;line(TURRET.x,TURRET.z,e.x,e.z,'#aeffff',age<.06?4:2);}
  if(e.type==='power-sweep'){ctx.strokeStyle='#ffdb77';ctx.fillStyle='#ffd05c18';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(...p(e.x,e.z),(80+240*Math.min(1,age*3))*sx,(80+240*Math.min(1,age*3))*sy,0,0,Math.PI*2);ctx.fill();ctx.stroke();label('POWER SWEEP',e.x,e.z-80,'#ffdb77');}
  if(['hit','armor-hit','clear','reject','breach','intercept','repair'].includes(e.type)){
   const color=e.type==='breach'?'#ff7957':e.type==='reject'?'#e1b0ff':'#71ffc0';
   ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(...p(e.x,e.z),(12+age*(reduced?5:40))*u,0,Math.PI*2);ctx.stroke();
   if(e.amount>0)label(`${cash(e.amount)} paid`,e.x,e.z-25-age*30,color);
  }
  ctx.restore();
 }
 if(assets.sentinel){
  const im=assets.sentinel,s=w.sentinel,moving=['dash','return'].includes(s.mode),bob=moving&&!reduced?Math.sin(w.time*20)*3:0,h=195*u,ww=h*im.width/im.height;
  ctx.save();ctx.translate(s.x*sx,(s.z+110)*sy+bob);ctx.scale(s.facing,1);ctx.rotate(moving&&!reduced?Math.sin(w.time*20)*.045:0);ctx.drawImage(im,-ww/2,-h,ww,h);ctx.restore();
  if(s.mode==='swing'){
   const swing=1-s.swingLeft/.5,angle=-2.5+swing*2.7;
   ctx.save();ctx.translate(s.x*sx,(s.z-40)*sy);ctx.scale(s.facing,1);ctx.strokeStyle=s.powerActive?'#ffe7a3':'#d8c7ff';ctx.lineWidth=s.powerActive?7:4;ctx.shadowColor=s.powerActive?'#ffd05c':'#aa87ff';ctx.shadowBlur=reduced?0:15;
   ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(angle)*130*u,Math.sin(angle)*130*u);ctx.stroke();ctx.strokeStyle=s.powerActive?'#ffd05cbb':'#bb92ff90';ctx.lineWidth=(s.powerActive?30:14)*u;ctx.beginPath();ctx.arc(0,0,(s.powerActive?220:110)*u,-2.5,angle);ctx.stroke();ctx.restore();
  }
  if(s.targetId){const a=actors.find(a=>a.target.id===s.targetId);if(a)label(s.powerActive||s.charges?'POWER TARGET':'SWORD TARGET',a.x,a.z-65,s.powerActive||s.charges?'#ffdb77':'#d6acff');}
 }

 sprite(3,500,901,150,195,w.angle*.5);
 text('SENTINEL',500,977,'#d7f7ff',12);
 text(shield.charged?'GOAL SHIELD · ON':'GOAL SHIELD · OFF',500,705,shield.charged?'#79ffc0':'#a0baaf',12);
 text('COLLATERAL',500,770,'#daeaff',12);
 text(ground?'POINT INTERCEPT · TAP AHEAD OF THE MISSILE':'CREDIT RADAR',500,610,'#58cce5',12);
 if(ground)ctx.canvas.__debtbreakView={cycle:w.ledger.period,phase:w.ledger.phase,time:w.time,held:Object.values(c.holds).reduce((n,h)=>n+h.amount,0),actors:actors.filter(a=>a.visible).map(a=>({id:a.id,targetId:a.target.id,role:a.target.lane==='living'?'expense':a.target.lane==='credit'?'debt':'want',x:a.x,z:a.z,amount:a.remaining,hp:a.hp,maxHp:a.maxHp,extra:!!a.extra,impactAt:a.impactAt})),blasts:w.ground.blasts.map(b=>({x:b.x,z:b.z,radius:b.radius})),shots:w.shots,hits:w.hits,autoPaid:c.ground.autoPaid};
 if(w.ledger.phase==='playing'&&!w.ledger.paused){
  const color=w.weapon==='intercept'?'#53e9ff':'#ffc55b',x=w.aim.x,z=w.aim.z;
  ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(...p(x,z),13,0,Math.PI*2);ctx.stroke();line(x-24,z,x-12,z,color);line(x+12,z,x+24,z,color);line(x,z-24,x,z-12,color);line(x,z+12,x,z+24,color);
 }
}
