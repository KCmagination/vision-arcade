import {livingPressure,creditGuide} from './debtbreak-command-learning.js';
import {combatActors} from './debtbreak-siege.js';
import {COMMAND_PADS,COMMAND_GUNS,NEED_COLORS,commandStats} from './debtbreak-command.js';
import {capitalShield} from './debtbreak-continuous.js';
import {commandPoint,placeCommandLabel} from './debtbreak-command-view.js';
import {drawCommandVfx} from './debtbreak-command-vfx.js';
import {commandPresentation} from './debtbreak-command-presentation.js';
const format=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});
export function drawCommandField(ctx,w,width,height,assets={},reduced=false){
 const sx=width/1000,sy=height/1000,s=w.ledger,command=s.continuous.ground.command,actors=combatActors(w).filter(a=>a.visible);
 const unit=Math.max(.42,Math.min(width/1000,height/620)),visual=commandPresentation(ctx,w,actors),labels=[];
 const point=(x,z)=>{const p=commandPoint(x,z);return [p.x*sx,p.z*sy];};
 const occupied=[];
 const text=(label,x,z,color='#d9eaf0',size=12,avoid=false)=>{
  const [px,py]=point(x,z);ctx.font=`600 ${size}px system-ui`;const tw=ctx.measureText(label).width+10;
  const b=avoid?placeCommandLabel(px,py,width,height,tw,occupied):{x:Math.max(tw/2+3,Math.min(width-tw/2-3,px)),y:py,w:tw};
  if(avoid&&Math.hypot(b.x-px,b.y-py)>9){ctx.strokeStyle=color+'88';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(px,py-9);ctx.lineTo(b.x,b.y);ctx.stroke();}
  ctx.fillStyle='#06131ce8';ctx.fillRect(b.x-tw/2,b.y-9,tw,18);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,b.x,b.y);occupied.push(b);
 };
 const path=(points,color,weight=2)=>{ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.beginPath();points.forEach(([x,z],i)=>{const p=point(x,z);if(i)ctx.lineTo(...p);else ctx.moveTo(...p);});ctx.stroke();};
 const sprite=(image,index,columns,rows,x,z,size)=>{if(!image)return;const cw=image.width/columns,ch=image.height/rows,dw=size*unit,dh=dw*ch/cw,[px,py]=point(x,z);ctx.drawImage(image,index%columns*cw,Math.floor(index/columns)*ch,cw,ch,px-dw/2,py-dh*.83,dw,dh);};
 ctx.clearRect(0,0,width,height);ctx.fillStyle='#07131d';ctx.fillRect(0,0,width,height);
 if(assets.landscape)ctx.drawImage(assets.landscape,0,0,width,height);
 ctx.fillStyle='#04101c44';ctx.fillRect(0,0,width,height);
 // Raised alloy causeways: offset contact shadow, exposed deck edge, inset lanes and rail lights.
 ctx.lineJoin='round';
 for(const x of [200,400,600,800]){
  const road=Array.from({length:41},(_,i)=>[x,i*20]);
  ctx.save();ctx.translate(4*unit,9*unit);path(road,'#02070bad',39*unit);ctx.restore();
  path(road,'#101a21',36*unit);path(road,'#778380',32*unit);path(road,'#25343b',28*unit);path(road,'#35454a',23*unit);
  for(let z=20;z<800;z+=42){const [px,py]=point(x,z);ctx.strokeStyle='#0c1b2670';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px-12*unit,py);ctx.lineTo(px+12*unit,py);ctx.stroke();
   for(const side of [-1,1]){ctx.fillStyle='#171f24';ctx.fillRect(px+side*16*unit-2*unit,py-2*unit,4*unit,5*unit);ctx.fillStyle=z>390&&z<550?'#a9eced':'#d5b77a';ctx.fillRect(px+side*16*unit-unit,py-unit,2*unit,2*unit);}}
  ctx.setLineDash([4*unit,19*unit]);path(road,'#b4c0b84a',1);ctx.setLineDash([]);
 }
 ctx.setLineDash([5,9]);path(Array.from({length:33},(_,i)=>[100+300*i/32,-30+830*i/32]),'#8bc4f288',1.5);path(Array.from({length:33},(_,i)=>[900-300*i/32,-30+830*i/32]),'#bda0ed88',1.5);ctx.setLineDash([]);
 const pressure=livingPressure(s),boundary=pressure.position===null?null:pressure.position*800;
 if(boundary!==null){ctx.setLineDash([8,5]);path([[0,boundary],[1000,boundary]],'#f5c575',2);ctx.setLineDash([]);}
 text('GROUND APPROACH',500,-40,'#b4c3cc');text('AIR',85,70,'#b5dcff');text('AIR',915,70,'#d9c4ff');
 const selected=command.towers[w.selectedGun??0],selectedPad=COMMAND_PADS[selected?.pad];
 if(selectedPad){const range=commandStats(s,selected).range;ctx.save();ctx.globalAlpha=.55;ctx.setLineDash([3,6]);path(Array.from({length:65},(_,i)=>[selectedPad.x+Math.cos(i*Math.PI/32)*range,selectedPad.z+Math.sin(i*Math.PI/32)*range]),COMMAND_GUNS[w.selectedGun??0].color,1);ctx.restore();}
 for(const [i,pad] of COMMAND_PADS.entries()){
  const index=command.towers.findIndex(t=>t.pad===i),gun=COMMAND_GUNS[index],[px,py]=point(pad.x,pad.z);
  ctx.fillStyle='#01071199';ctx.beginPath();ctx.ellipse(px+5*unit,py+8*unit,43*unit,18*unit,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#122b38';ctx.strokeStyle=gun?.color??'#73939b';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(px,py,35*unit,15*unit,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  if(gun){
   if(assets.modules){
    const im=assets.modules,cw=im.width/4,ratio=90*unit/cw;
    ctx.drawImage(im,index*cw,0,cw,440,px-45*unit,py-50*unit,90*unit,440*ratio);
    const a=visual.aims[index]??0,[ax,ay]=point(pad.x+Math.sin(a)*100,pad.z-Math.cos(a)*100),angle=Math.atan2(ax-px,-(ay-py));
    const shot=visual.shots.findLast(b=>b.tower===index),age=shot?w.time-shot.born:2,recoil=reduced?0:Math.max(0,1-age/.16)*3*unit;
    ctx.save();ctx.translate(px,py-22*unit);ctx.rotate(angle);const r=48*unit/cw;ctx.drawImage(im,index*cw,440,cw,510,-24*unit,-390*r+recoil,48*unit,510*r);ctx.restore();
   }else sprite(assets.guns,index,2,2,pad.x,pad.z,108);
   labels.push([gun.label.toUpperCase()+' · '+command.towers[index].level,pad.x,pad.z+47,gun.color,12]);
  }
  else text('PAD '+(i+1),pad.x,pad.z,'#a5b8c1',12);
 }
 for(const a of actors){
  const [x,y]=point(a.x,a.z),air=a.target.lane==='living',color=air?'#ffdf93':'#ffc0a1';
  ctx.fillStyle='#02071177';ctx.beginPath();ctx.ellipse(x,y+5,18*unit,6*unit,0,0,Math.PI*2);ctx.fill();
  if(!reduced){ctx.fillStyle=air?'#93d9ff80':'#b09a6945';const pulse=1+Math.sin(w.time*12+a.z)*.15;ctx.beginPath();ctx.ellipse(x,y+(air?3:1)*unit,(air?8:12)*unit,(air?3:4)*unit*pulse,0,0,Math.PI*2);ctx.fill();}
  sprite(assets.enemies,air?1:0,2,1,a.x,a.z,air?57:49);
  if(!assets.enemies){ctx.fillStyle=color;ctx.fillRect(x-6,y-5,12,10);}
  const bw=width<500?29:43;ctx.fillStyle='#151d27';ctx.fillRect(x-bw/2,y-30*unit,bw,4);ctx.fillStyle=color;ctx.fillRect(x-bw/2,y-30*unit,bw*a.hp/a.maxHp,4);
  labels.push([format.format(a.remaining/100),a.x,a.z+29,color,12,true]);if(a.hp===0)labels.push(['UNFUNDED',a.x,a.z+62,'#ff9e86',12,true]);
 }
 for(const b of w.ground.blasts){const [x,y]=point(b.x,b.z);ctx.strokeStyle='#b1f8ff';ctx.beginPath();ctx.ellipse(x,y,b.radius*sx*.86,b.radius*sy*.84,0,0,Math.PI*2);ctx.stroke();}
 const defenses=s.defenses.filter(d=>d.owned),condition=defenses.reduce((n,d)=>n+d.condition,0),maximum=defenses.reduce((n,d)=>n+(d.maxCondition??100),0),health=maximum?condition/maximum:0;
 const shield=capitalShield(s),credit=creditGuide(s);
 path([[15,815],[985,815]],shield.charged?'#70ffb455':'#5f7d9166',2);
 for(let i=0;i<8;i++){const [x,y]=point(15+i*138,815);ctx.fillStyle='#213b49';ctx.fillRect(x-2*unit,y-5*unit,4*unit,10*unit);ctx.fillStyle=shield.charged?'#88ffd1':'#7894a4';ctx.fillRect(x-unit,y-5*unit,2*unit,3*unit);}
 for(let i=0;i<7;i++){const x=i*142+71;sprite(assets.districts,i,4,2,x,975,width<500?106:128);text(String(i+1),x,985,NEED_COLORS[i],12);}
 sprite(assets.districts,7,4,2,500,847,139);
 const [vx,vy]=point(500,790);
 if(shield.charged){ctx.save();ctx.fillStyle='#39bbff15';ctx.strokeStyle='#70e0ff99';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(vx,vy-15*unit,70*unit,70*unit,0,Math.PI,Math.PI*2);ctx.lineTo(vx+70*unit,vy);ctx.ellipse(vx,vy,70*unit,17*unit,0,0,Math.PI);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
 if(credit.unlocked){ctx.strokeStyle='#d5a5ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(vx,vy,77*unit,21*unit,0,0,Math.PI*2);ctx.stroke();}
 if(assets.sentinel){const h=74*unit,im=assets.sentinel,[x,y]=point(565,863);ctx.drawImage(im,x-h*im.width/im.height/2,y-h,h*im.width/im.height,h);}
 text('SENTINEL',565,884,'#e7f7ff',12);
 if(health<.7){for(let i=0;i<7;i++)path([[i*142+35,937],[i*142+62,948],[i*142+53,966]],'#ff8c65',2);text('BASE '+Math.round(health*100)+'% · REPAIRABLE',500,996,'#ffb993',12);}
 for(const label of labels.filter(label=>!label[5]))text(...label);

 const pressureLabel=pressure.ratio!==null?'LIVING COSTS '+Math.round(pressure.ratio*100)+'%':pressure.position!==null?'COSTS / NO INCOME':'LIVING COSTS: NO RATIO';
 let captionZ=boundary===null?25:Math.max(25,Math.min(760,boundary-25));
 const caption=point(820,captionZ);ctx.font='600 12px system-ui';const captionHalf=ctx.measureText(pressureLabel).width/2+8;
 for(const pad of COMMAND_PADS){const [px,py]=point(pad.x,pad.z);if(Math.abs(caption[0]-px)<captionHalf+44*unit && Math.abs(caption[1]-py)<10+23*unit+8)caption[1]=py+(10+23*unit+9);}
 captionZ=(caption[1]/sy-65)/.84;text(pressureLabel,820,captionZ,'#ffe0a0',12);
 occupied.push(...drawCommandVfx(ctx,w,width,height,assets,reduced,visual,occupied));
 for(const label of labels)text(...label);
 ctx.canvas.__debtbreakPresentation={shots:visual.shots.map(b=>({tower:b.tower,born:b.born})),aims:[...visual.aims],deaths:visual.deaths.length};
 ctx.canvas.__debtbreakView={cycle:s.period,phase:s.phase,time:w.time,stage:command.stage,allowance:command.allowance,autoPaid:s.continuous.ground.autoPaid,held:Object.values(s.continuous.holds).reduce((n,h)=>n+h.amount,0),actors:actors.map(a=>({id:a.id,targetId:a.target.id,role:a.target.lane==='living'?'expense':'debt',x:a.x,z:a.z,amount:a.remaining,hp:a.hp,maxHp:a.maxHp,impactAt:a.impactAt})),blasts:w.ground.blasts.map(b=>({x:b.x,z:b.z,radius:b.radius})),shots:w.shots,hits:w.hits};
}
