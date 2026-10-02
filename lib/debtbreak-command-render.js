import {livingPressure,creditGuide} from './debtbreak-command-learning.js';
import {combatActors} from './debtbreak-siege.js';
import {COMMAND_PADS,COMMAND_GUNS,NEED_COLORS,commandStats} from './debtbreak-command.js';
import {capitalShield} from './debtbreak-continuous.js';
const format=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});
export function drawCommandField(ctx,w,width,height,assets={},reduced=false){
 const sx=width/1000,sy=height/1000,s=w.ledger,command=s.continuous.ground.command,actors=combatActors(w).filter(a=>a.visible);
 const text=(label,x,z,color='#d9eaf0',size=11)=>{ctx.fillStyle=color;ctx.font=`600 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x*sx,z*sy);};
 const line=(x,z,xx,zz,color,weight=2)=>{ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.beginPath();ctx.moveTo(x*sx,z*sy);ctx.lineTo(xx*sx,zz*sy);ctx.stroke();};
 ctx.clearRect(0,0,width,height);ctx.fillStyle='#07131d';ctx.fillRect(0,0,width,height);
 for(const x of [200,400,600,800]){line(x,0,x,790,'#334656',Math.max(14,24*sx));line(x,0,x,790,'#728089',1);text('↓',x,90,'#afb6bb',18);}
 ctx.setLineDash([5,7]);line(100,-30,400,800,'#4b9caf');line(900,-30,600,800,'#4b9caf');ctx.setLineDash([]);
 const pressure=livingPressure(s);
 let pressureLabel='LIVING COSTS: NO RATIO',pressureY=44;
 if(pressure.position!==null){
  const boundary=pressure.position*800;ctx.fillStyle='#e5ad4c10';ctx.fillRect(0,0,width,boundary*sy);
  ctx.setLineDash([8,5]);line(12,boundary,988,boundary,'#f5c575',2);ctx.setLineDash([]);
  pressureLabel=pressure.ratio!==null?'LIVING COSTS '+Math.round(pressure.ratio*100)+'%':'COSTS / NO INCOME';
  pressureY=Math.max(44,boundary*sy-10);
  const clearance=Math.max(9,19*sx)+12;
  for(const row of [340,650])if(Math.abs(pressureY-row*sy)<clearance)pressureY=row*sy+clearance;
  if(pressureY>height*.8-10)pressureY=650*sy-clearance;
 }
 const credit=creditGuide(s);if(credit.unlocked){ctx.strokeStyle='#dab8ff';ctx.lineWidth=3;ctx.strokeRect(3,height*.83,width-6,height*.14);}
 text('GROUND LANES',500,14/sy,'#c2c9ce');text('AIR ↘',95,110,'#7adced');text('↙ AIR',905,110,'#7adced');
 const selected=command.towers[w.selectedGun??0],selectedPad=COMMAND_PADS[selected?.pad];
 if(selectedPad){const range=commandStats(s,selected).range;ctx.fillStyle='#67dbe610';ctx.strokeStyle=COMMAND_GUNS[w.selectedGun??0].color;ctx.setLineDash([3,5]);ctx.beginPath();ctx.ellipse(selectedPad.x*sx,selectedPad.z*sy,range*sx,range*sy,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);}
 for(const [i,pad] of COMMAND_PADS.entries()){
  const index=command.towers.findIndex(t=>t.pad===i),gun=COMMAND_GUNS[index];
  ctx.fillStyle=gun?'#203a46':'#101e29';ctx.strokeStyle=gun?.color??'#5a7182';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pad.x*sx,pad.z*sy,Math.max(9,19*sx),0,Math.PI*2);ctx.fill();ctx.stroke();
  text(String(i+1),pad.x,pad.z,gun?.color??'#b5c3cc',12);
  if(gun){const target=w.ground.beams.find(b=>b.tower===index),dx=target?target.x-pad.x:0,dz=target?target.z-pad.z:-1,length=Math.hypot(dx,dz)||1;line(pad.x,pad.z,pad.x+dx/length*45,pad.z+dz/length*45,gun.color,4);text(gun.label.toUpperCase(),pad.x,pad.z+57,gun.color,width<500?9:11);text(`L${command.towers[index].level}`,pad.x,pad.z-55,gun.color,10);}
 }
 for(const a of actors){
  const x=a.x*sx,y=a.z*sy,air=a.target.lane==='living',color=air?'#ffcf70':'#f09588';
  ctx.fillStyle=color;ctx.strokeStyle='#18252d';ctx.lineWidth=1;
  if(air){ctx.beginPath();ctx.moveTo(x,y+8);ctx.lineTo(x-6,y-6);ctx.lineTo(x+6,y-6);ctx.closePath();ctx.fill();}
  else{ctx.fillRect(x-8,y-6,16,12);ctx.strokeRect(x-8,y-6,16,12);}
  const bw=width<500?38:52;ctx.fillStyle='#2c3444';ctx.fillRect(x-bw/2,y-17,bw,4);ctx.fillStyle=color;ctx.fillRect(x-bw/2,y-17,bw*a.hp/a.maxHp,4);
  text(`${a.hp}/${a.maxHp}`,a.x,a.z-72,color,10);
  text(format.format(a.remaining/100),a.x,a.z+59,color,10);
  if(a.hp===0)text('UNFUNDED',a.x,a.z+96,'#ff9e86',9);
 }
 for(const b of w.ground.beams){const tower=command.towers[b.tower],pad=COMMAND_PADS[tower.pad];if(!pad)continue;ctx.save();ctx.globalAlpha=Math.max(0,1-(w.time-b.born)/.18);line(pad.x,pad.z,b.x,b.z,COMMAND_GUNS[b.tower].color,2);ctx.restore();}
 for(const b of w.ground.blasts){ctx.strokeStyle='#b1f8ff';ctx.beginPath();ctx.ellipse(b.x*sx,b.z*sy,b.radius*sx,b.radius*sy,0,0,Math.PI*2);ctx.stroke();}
 const defenses=s.defenses.filter(d=>d.owned),condition=defenses.reduce((n,d)=>n+d.condition,0),maximum=defenses.reduce((n,d)=>n+(d.maxCondition??100),0),health=maximum?condition/maximum:0;
 for(let i=0;i<7;i++){ctx.fillStyle='#421f29';ctx.fillRect((i*142+5)*sx,840*sy,132*sx,130*sy);ctx.fillStyle=NEED_COLORS[i]+'88';ctx.fillRect((i*142+5)*sx,(970-130*health)*sy,132*sx,130*health*sy);ctx.strokeStyle=NEED_COLORS[i];ctx.strokeRect((i*142+5)*sx,840*sy,132*sx,130*sy);text(String(i+1),i*142+71,940,NEED_COLORS[i],13);}
 for(const e of w.effects.filter(e=>e.type==='impact').slice(-20)){
  const age=w.time-e.born;if(age<0||age>1.1)continue;
  ctx.save();ctx.globalAlpha=1-age/1.1;ctx.strokeStyle='#ffb778';ctx.fillStyle='#ffe5a9';ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(e.x*sx,e.z*sy,(reduced?28:15+age*90)*sx,(reduced?28:15+age*90)*sy,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(e.x*sx,e.z*sy,Math.max(2,12*(1-age/1.1)),0,Math.PI*2);ctx.fill();ctx.restore();
 }
 const shield=capitalShield(s);line(45,814,955,814,shield.charged?'#70ffb4':'#58737d',4);
 if(assets.sentinel){const h=Math.min(94,height*.25),im=assets.sentinel,ww=h*im.width/im.height;ctx.drawImage(im,width/2-ww/2,height*.91-h,ww,h);}
 text('SENTINEL · COMMAND',500,988,'#d1ecec',10);
 // Keep the ruler caption above sprites and beside the central Sentinel at high pressure.
 ctx.font='600 10px system-ui';const labelWidth=ctx.measureText(pressureLabel).width+16,labelX=width-labelWidth/2-10;
 ctx.fillStyle='#172530f5';ctx.fillRect(labelX-labelWidth/2,pressureY-10,labelWidth,20);
 ctx.fillStyle='#ffe0a0';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pressureLabel,labelX,pressureY);
 ctx.canvas.__debtbreakView={cycle:s.period,phase:s.phase,time:w.time,stage:command.stage,allowance:command.allowance,autoPaid:s.continuous.ground.autoPaid,held:Object.values(s.continuous.holds).reduce((n,h)=>n+h.amount,0),actors:actors.map(a=>({id:a.id,targetId:a.target.id,role:a.target.lane==='living'?'expense':'debt',x:a.x,z:a.z,amount:a.remaining,hp:a.hp,maxHp:a.maxHp,impactAt:a.impactAt})),blasts:w.ground.blasts.map(b=>({x:b.x,z:b.z,radius:b.radius})),shots:w.shots,hits:w.hits};
}
