import {combatActors} from './debtbreak-siege.js';
import {livingPressure} from './debtbreak-command-learning.js';
import {placeCommandLabel} from './debtbreak-command-view.js';
import {commandStats,NEED_COLORS} from './debtbreak-command.js';
import {GRID_ASSETS,GRID_ROUTES,assetPoint,capitalCovers,creditSupports,CAPITAL_RADIUS,CREDIT_RADIUS,canPlace} from './debtbreak-command-grid.js';
// Deliberately simple prototype symbols: placement, paths and payments are the visual priority.
export function drawGridCommandField(ctx,w,width,height,assets={},reduced=false){
 const s=w.ledger,c=s.continuous.ground.command,sx=width/1000,sy=height/1000,u=Math.min(sx,sy),selected=w.selectedAsset??'cashFlow';
 const occupied=[];
 const line=(points,color,weight=2,dash=[])=>{ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.setLineDash(dash);ctx.beginPath();points.forEach(([x,z],i)=>{if(i)ctx.lineTo(x*sx,z*sy);else ctx.moveTo(x*sx,z*sy);});ctx.stroke();ctx.setLineDash([]);};
 const label=(text,x,z,color='#e4edf5',size=12)=>{ctx.font=`600 ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,x*sx,z*sy);occupied.push({x:x*sx,y:z*sy,w:ctx.measureText(text).width+10});};
 const ring=(id,r,color,fill)=>{const p=assetPoint(c,id);if(!p)return;ctx.beginPath();ctx.ellipse(p.x*sx,p.z*sy,r*sx,r*sy,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);};
 ctx.clearRect(0,0,width,height);ctx.fillStyle='#101d29';ctx.fillRect(0,0,width,height);
 for(const path of GRID_ROUTES){line(path,'#061019',Math.max(14,70*u));line(path,'#475568',Math.max(10,56*u));line(path,'#b2bccc',1,[6,9]);}
 label('GROUND ENTRY',500,975,'#d4be8a',10);label('ATTACK COLLATERAL',500,110,'#d4be8a',10);
 label('AIR APPROACH',500,38,'#9ddafa',10);
 for(let col=2;col<=7;col++)for(let row=2;row<=7;row++){ctx.fillStyle=(col+row)%2?'#1a2e3f':'#1d3345';ctx.fillRect(col*100*sx+1,row*100*sy+1,100*sx-2,100*sy-2);}
 for(let i=2;i<=7;i++){label(String(i-1),(i+.5)*100,785,'#acc4d7',10);label(String(i-1),215,(i+.5)*100,'#acc4d7',10);}
 ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
 ring('capital',CAPITAL_RADIUS,'#66dba5','#66dba514');
 if(selected==='credit')ring('credit',CREDIT_RADIUS,'#c2a1ff','#c2a1ff0b');
 if(selected==='cashFlow'||selected==='credit')ring('cashFlow',commandStats(s,c.towers[0]).range,'#64dfff','#64dfff08');
 ctx.restore();
 const actors=combatActors(w).filter(a=>a.visible);
 const pressure=livingPressure(s),pressureLabel=pressure.ratio!==null?'LIVING COSTS '+Math.round(pressure.ratio*100)+'%':pressure.position!==null?'COSTS / NO INCOME':'LIVING COSTS: NO RATIO';
 line([[60,200],[60,800]],'#8b805e',1);
 if(pressure.position!==null)line([[30,200+pressure.position*600],[100,200+pressure.position*600]],'#f5c575',2,[8,5]);
 ctx.save();ctx.translate(width-12,height*.5);ctx.rotate(-Math.PI/2);ctx.font='600 10px system-ui';ctx.fillStyle='#ffe0a0';ctx.textAlign='center';ctx.fillText(pressureLabel,0,0);ctx.restore();
 const anchorTarget=assetPoint(c,'collateral');if(anchorTarget)line([[500,150],[anchorTarget.x,anchorTarget.z]],'#e69e9e66',1,[4,5]);
 for(const a of actors.filter(a=>a.target.lane==='living').slice(0,8)){const p=assetPoint(c,a.targetAssetId);if(p)line([[a.x,a.z],[p.x,p.z]],'#7298ba55',1,[3,6]);}
 for(let i=0;i<GRID_ASSETS.length;i++){
  const id=GRID_ASSETS[i],p=assetPoint(c,id);if(!p)continue;
  const color=i<4?['#62dfff','#70e4ad','#ffc16a','#c5a2ff'][i]:NEED_COLORS[i-4],size=Math.max(14,62*u),x=p.x*sx,y=p.z*sy;
  ctx.fillStyle='#08121e';ctx.fillRect(x-size/2,y-size/2,size,size);ctx.strokeStyle=selected===id?'#ffffff':color;ctx.lineWidth=selected===id?3:2;ctx.strokeRect(x-size/2,y-size/2,size,size);
  label(i<4?['CF','SH','HP','R'][i]:String(i-3),p.x,p.z,color,Math.max(10,Math.min(16,22*u)));
  if(i===0){ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y-size/2);ctx.lineTo(x,y-size*.8);ctx.stroke();}
  if(i>=4){ctx.fillStyle=capitalCovers(c,id)?'#70e4ad':'#ffae72';ctx.beginPath();ctx.arc(x+size*.36,y-size*.36,3,0,Math.PI*2);ctx.fill();}
  if(width>=600)label(i<4?['Cash Flow','Capital','Collateral','Credit'][i]:`Need ${i-3}`,p.x,p.z+43,color,10);
 }
 if(c.stage!=='combat'&&w.gridCursor){const {col,row}=w.gridCursor,valid=canPlace(c,selected,col,row);ctx.fillStyle=valid?'#8bf4c449':'#ff926b55';ctx.fillRect(col*100*sx,row*100*sy,100*sx,100*sy);ctx.strokeStyle=valid?'#a7f5ce':'#ffa385';ctx.lineWidth=2;ctx.strokeRect(col*100*sx+2,row*100*sy+2,100*sx-4,100*sy-4);}
 const receipts=w.effects.slice(-24).filter(e=>e.amount>0&&['hit','impact'].includes(e.type)).slice(-2).map((e,i)=>{
  const text=(e.type==='hit'?'Paid $':'Savings paid $')+(e.amount/100).toFixed(2);ctx.font='600 11px system-ui';
  const box=placeCommandLabel(width*.78,height-30+i*18,width-25,height,ctx.measureText(text).width+10,occupied);occupied.push(box);return {text,box,color:e.type==='hit'?'#9ef1be':'#ffd28b'};
 });
 let packetLabels=0;const captions=occupied;
 for(const a of actors.slice(0,20)){
  const air=a.target.lane==='living',x=a.x*sx,y=a.z*sy,r=Math.max(4,(air?15:20)*u);ctx.fillStyle=air?'#ffca7f':'#e69e9e';ctx.beginPath();if(air){ctx.moveTo(x,y-r);ctx.lineTo(x+r,y+r);ctx.lineTo(x-r,y+r);ctx.closePath();}else ctx.rect(x-r,y-r*.65,r*2,r*1.3);ctx.fill();
  ctx.fillStyle='#07121d';ctx.fillRect(x-r,y+r+3,r*2,3);ctx.fillStyle='#ffc779';ctx.fillRect(x-r,y+r+3,r*2*Math.max(0,a.hp/a.maxHp),3);
  if(packetLabels++<5){const text='$'+(a.remaining/100).toFixed(2);ctx.font='600 10px system-ui';const b=placeCommandLabel(x,y-r-12,width-25,height,ctx.measureText(text).width+6,captions);captions.push(b);ctx.fillStyle='#07121dee';ctx.fillRect(b.x-b.w/2,b.y-8,b.w,16);ctx.fillStyle='#f8dfb6';ctx.textAlign='center';ctx.fillText(text,b.x,b.y);}
 }
 for(const {text,box:b,color} of receipts){ctx.font='600 11px system-ui';ctx.fillStyle='#07121dee';ctx.fillRect(b.x-b.w/2,b.y-9,b.w,18);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,b.x,b.y);}
 const gun=assetPoint(c,'cashFlow');
 for(const p of w.ground.projectiles.slice(-8)){line([[p.sx??500,p.sz??935],[p.x,p.z]],'#ffd893',1);ctx.fillStyle='#ffe4ab';ctx.beginPath();ctx.arc(p.x*sx,p.z*sy,4,0,Math.PI*2);ctx.fill();}
 for(const b of w.ground.blasts.slice(-8)){ctx.beginPath();ctx.ellipse(b.x*sx,b.z*sy,b.radius*sx,b.radius*sy,0,0,Math.PI*2);ctx.fillStyle='#ffce7320';ctx.fill();ctx.strokeStyle='#ffdc91';ctx.lineWidth=1.5;ctx.stroke();}
 if(c.manualAssist&&!s.paused&&s.phase==='playing'){line([[w.aim.x-12,w.aim.z],[w.aim.x+12,w.aim.z]],'#ffdc91',1);line([[w.aim.x,w.aim.z-12],[w.aim.x,w.aim.z+12]],'#ffdc91',1);}
 if(gun)for(const beam of w.ground.beams.slice(-8)){line([[gun.x,gun.z],[beam.x,beam.z]],'#b8f4ff',reduced?1:2);if(!reduced){ctx.fillStyle='#d9faff';ctx.beginPath();ctx.arc(gun.x*sx,gun.z*sy,3,0,Math.PI*2);ctx.fill();}}
 for(const e of w.effects.slice(-24)){const age=w.time-e.born;if(age>1||age<0)continue;const color=e.type==='hit'?'#9ef1be':e.type==='impact'?'#ffd28b':'#f29b98';ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x*sx,e.z*sy,reduced?5:5+age*14,0,Math.PI*2);ctx.stroke();}
 label(creditSupports(c)?'RANGE LINK +20%':'RANGE LINK OFF',500,80,'#c5a2ff',10);
 ctx.canvas.__debtbreakPresentation={shots:w.ground.beams.slice(-8).map(b=>({tower:b.tower,born:b.born})),aims:[],deaths:0};
 ctx.canvas.__debtbreakView={cycle:s.period,phase:s.phase,time:w.time,stage:c.stage,allowance:c.allowance,autoPaid:s.continuous.ground.autoPaid,held:Object.values(s.continuous.holds).reduce((n,h)=>n+h.amount,0),actors:actors.map(a=>({id:a.id,targetId:a.target.id,targetAssetId:a.targetAssetId,role:a.target.lane==='living'?'expense':'debt',x:a.x,z:a.z,amount:a.remaining,hp:a.hp,maxHp:a.maxHp,impactAt:a.impactAt})),layout:structuredClone(c.layout),blasts:w.ground.blasts.map(b=>({x:b.x,z:b.z,radius:b.radius})),shots:w.shots,hits:w.hits};
 const anchor=assetPoint(c,'collateral');if(anchor&&assets.sentinel){const size=Math.max(18,45*u);ctx.drawImage(assets.sentinel,anchor.x*sx+8,anchor.z*sy-size-10,size,size);}
}
