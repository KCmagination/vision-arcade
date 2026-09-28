import {combatActors,radarSeconds,TURRET} from './debtbreak-siege.js';
import {basePlan} from './debtbreak-continuous.js';
const cash=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n%100?2:0}).format(n/100);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function drawSiege(ctx,w,width,height,assets={},reduced=false){
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
 if(assets.space){ctx.save();ctx.globalAlpha=.78;const r=Math.max(width/assets.space.width,height/assets.space.height),dw=assets.space.width*r,dh=assets.space.height*r;ctx.drawImage(assets.space,(width-dw)/2,(height-dh)/2,dw,dh);ctx.restore();}
 const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'#01081955');shade.addColorStop(.6,'#01081900');shade.addColorStop(1,'#061c32aa');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
 // Credit radar is a functional warning-range display.
 ctx.save();ctx.strokeStyle='#19c9ff45';ctx.lineWidth=1;
 for(const r of [190,270,350+radarSeconds(w.ledger)*10]){ctx.beginPath();ctx.ellipse(...p(500,995),r*sx,r*.8*sy,0,Math.PI,Math.PI*2);ctx.stroke();}
 ctx.restore();
 const plan=basePlan(w.ledger),ratio=plan.goal?clamp(Math.max(0,w.ledger.reserves)/plan.goal,0,1):w.ledger.reserves>0?1:0;
 const expanded=c.base?.expansions??0,radius=290+expanded*15,condition=w.ledger.defenses.reduce((n,d)=>n+d.condition,0),maximum=w.ledger.defenses.reduce((n,d)=>n+(d.maxCondition??100),0);
 // The dome visualizes available capital; protection spends reserves through the ledger only.
 if(ratio>0){ctx.save();const g=ctx.createRadialGradient(...p(500,970),15,...p(500,970),radius*sx);g.addColorStop(0,'#16ee9404');g.addColorStop(.65,`rgba(18,205,156,${.035+ratio*.07})`);g.addColorStop(1,`rgba(80,255,172,${.08+ratio*.2})`);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(...p(500,990),radius*sx,265*sy,0,Math.PI,Math.PI*2);ctx.closePath();ctx.fill();ctx.strokeStyle=c.autoProtect?'#71ffb4':'#579d82';ctx.lineWidth=c.autoProtect?2.5:1;ctx.shadowColor='#31ffaa';ctx.shadowBlur=c.autoProtect&&!reduced?14:0;ctx.stroke();ctx.strokeStyle='#a4f0ff65';ctx.beginPath();ctx.ellipse(...p(500,990),(radius-5)*sx,260*sy,0,Math.PI,Math.PI*2);ctx.stroke();ctx.restore();}
 // Armor arc and each purchased segment are driven by owned defense capacity.
 const pieces=14+expanded*2,armor=maximum?condition/maximum:0;
 for(let i=0;i<pieces;i++){
  const a=Math.PI+i/pieces*Math.PI,b=Math.PI+(i+.88)/pieces*Math.PI;
  ctx.beginPath();ctx.ellipse(...p(500,995),(radius-38)*sx,205*sy,0,a,b);ctx.strokeStyle=i/pieces<armor?'#8499ac':'#412e3b';ctx.lineWidth=Math.max(9,15*u);ctx.stroke();
  ctx.beginPath();ctx.ellipse(...p(500,995),(radius-38)*sx,205*sy,0,a,b);ctx.strokeStyle=i/pieces<armor?'#fdb55e':'#a34b52';ctx.lineWidth=2;ctx.stroke();
 }
 const actors=combatActors(w);
 for(const a of actors.filter(a=>a.warning).sort((a,b)=>Number(b.highRate)-Number(a.highRate)).slice(0,4)){
  const x=clamp(a.x,65,935),z=clamp(a.z,55,200);
  line(x,z,x,Math.max(35,z-20),'#ffc95a',2);
  label(`${a.rate===null?'APR ?':`${a.rate}% APR`} · ${Math.ceil(a.entryIn)}s`,x,z,a.highRate?'#ffcb57':'#84ddff');
 }
 for(const a of actors.filter(a=>a.visible).sort((a,b)=>a.z-b.z)){
  const lane=a.target.lane,color=lane==='living'?'#ffc264':lane==='want'?'#e5a1ff':'#ff6d78';
  if(lane==='credit'){
   ctx.save();ctx.setLineDash([3,8]);line(a.x,a.z,500,790,'#d8416140');ctx.restore();
   const account=c.accounts.find(x=>x.id===a.target.accountId),growth=account?1+Math.min(.35,(account.interest+account.fees)/Math.max(1,account.opening)*4):1;
   sprite(1,a.x,a.z,110*growth,110*growth,a.angle);
   if(a.highRate&&a.x>35&&a.x<965&&a.z>50)text(`${a.rate}%`,a.x,a.z-36,'#ffd465',12);
  }else sprite(lane==='want'?2:0,a.x,a.z,lane==='want'?85:100,lane==='want'?85:80);
  if(lane!=='want'){
   const x=a.x*sx,y=a.z*sy-37*u,bar=64*u;
   ctx.fillStyle='#182a42';ctx.fillRect(x-bar/2,y,bar,4);ctx.fillStyle=color;ctx.fillRect(x-bar/2,y,bar*clamp(a.remaining/a.original,0,1),4);
  }
  if(a.id===w.lockedId||a.target.id===w.hoveredId){
   ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.strokeRect(a.x*sx-42*u,a.z*sy-40*u,84*u,80*u);
   label(`${cash(a.target.remaining)} · ${lane==='want'?'optional':`due day ${a.target.dueDay}`}`,a.x,a.z-68,color);
  }
 }
 for(const b of w.bullets){line(b.x-b.dx*18,b.z-b.dz*18,b.x,b.z,b.source==='reserve'?'#7affb9':'#ffc55b',3);}
 for(const e of w.effects){
  const age=w.time-e.born;if(age<0||age>1.1)continue;
  ctx.save();ctx.globalAlpha=Math.max(0,1-age/1.1);
  if(e.type==='laser'&&age<.19){ctx.shadowColor='#38e5ff';ctx.shadowBlur=reduced?0:14;line(TURRET.x,TURRET.z,e.x,e.z,'#aeffff',age<.06?4:2);}
  if(['hit','clear','reject','breach','intercept','repair'].includes(e.type)){
   const color=e.type==='breach'?'#ff7957':e.type==='reject'?'#e1b0ff':'#71ffc0';
   ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(...p(e.x,e.z),(12+age*(reduced?5:40))*u,0,Math.PI*2);ctx.stroke();
   if(e.amount>0)label(`${cash(e.amount)} paid`,e.x,e.z-25-age*30,color);
  }
  ctx.restore();
 }
 if(assets.sentinel){const im=assets.sentinel,h=195*u,ww=h*im.width/im.height;ctx.drawImage(im,500*sx-ww*1.05,980*sy-h,ww,h);}
 sprite(3,500,901,150,195,w.angle*.5);
 text('SENTINEL',500,977,'#d7f7ff',12);
 text('CAPITAL SHIELD',500,705,c.autoProtect?'#79ffc0':'#a0baaf',12);
 text('COLLATERAL',500,770,'#daeaff',12);
 text('CREDIT RADAR',500,610,'#58cce5',12);
 if(w.ledger.phase==='playing'&&!w.ledger.paused){
  const color=w.weapon==='intercept'?'#53e9ff':'#ffc55b',x=w.aim.x,z=w.aim.z;
  ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(...p(x,z),13,0,Math.PI*2);ctx.stroke();line(x-24,z,x-12,z,color);line(x+12,z,x+24,z,color);line(x,z-24,x,z-12,color);line(x,z+12,x,z+24,color);
 }
}
