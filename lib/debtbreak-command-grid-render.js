import {combatActors} from './debtbreak-siege.js';
import {livingPressure} from './debtbreak-command-learning.js';
import {placeCommandLabel} from './debtbreak-command-view.js';
import {gridProject,GRID_NEED_COLORS} from './debtbreak-grid-view.js';
import {commandStats,commandTargets} from './debtbreak-command.js';
import {GRID_ASSETS,GRID_LABELS,GRID_ROUTES,assetPoint,capitalCovers,creditSupports,CAPITAL_RADIUS,CREDIT_RADIUS,canPlace} from './debtbreak-command-grid.js';
// Renderer-owned history: cosmetic bursts never settle bills or modify the world.
const scenes=new WeakMap();
const COLORS=['#62dfff','#70e4ad','#ffc16a','#c5a2ff',...GRID_NEED_COLORS];
function presentation(ctx,w,actors,width,height){
 let p=scenes.get(ctx);const stage=w.ledger.continuous.ground.command.stage;
 if(!p||p.world!==w||w.time<p.time||p.stage!==stage){p={world:w,time:w.time,stage,shots:[],deaths:[],actors:[],angle:0};scenes.set(ctx,p);}
 const dt=Math.max(0,Math.min(.1,w.time-p.time));p.time=w.time;
 p.shots=p.shots.filter(b=>w.time-b.born<.55);
 for(const b of w.ground.beams.slice(-12))if(b.tower===0&&!p.shots.some(a=>a.born===b.born))p.shots.push({...b});
 p.shots=p.shots.slice(-12);p.deaths=p.deaths.filter(d=>w.time-d.born<.7);
 for(const a of p.actors)if(stage==='combat'&&!actors.some(b=>b.id===a.id)&&w.effects.some(e=>e.type==='hit'&&e.amount>0&&e.targetId===a.targetId&&Math.hypot(e.x-a.x,e.z-a.z)<65))p.deaths.push({...a,born:w.time});
 p.deaths=p.deaths.slice(-10);p.actors=actors.slice(0,20).map(a=>({id:a.id,targetId:a.target.id,x:a.x,z:a.z}));
 const c=w.ledger.continuous.ground.command,g=assetPoint(c,'cashFlow'),target=commandTargets(w.ledger,c.towers[0],actors)[0]??p.shots.at(-1);
 if(g&&target){const a=gridProject(g.x,g.z),b=gridProject(target.x,target.z),desired=Math.atan2((b.x-a.x)*width,-(b.z-a.z)*height);p.angle+=Math.atan2(Math.sin(desired-p.angle),Math.cos(desired-p.angle))*Math.min(1,dt*14);}
 return p;
}
export function drawGridCommandField(ctx,w,width,height,assets={},reduced=false){
 const s=w.ledger,c=s.continuous.ground.command,sx=width/1000,sy=height/1000,u=Math.min(width/1000,height/720),selected=w.selectedAsset??'cashFlow',editing=c.stage!=='combat';
 const actors=combatActors(w).filter(a=>a.visible),visual=presentation(ctx,w,actors,width,height),occupied=[],labels=[];
 const point=(x,z)=>{const p=gridProject(x,z);return [p.x*sx,p.z*sy];};
 const path=(points,color,weight=1,dash=[],fill)=>{ctx.beginPath();points.forEach(([x,z],i)=>{const p=point(x,z);if(i)ctx.lineTo(...p);else ctx.moveTo(...p);});if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);};
 const cell=(col,row,color,fill,weight=1)=>path([[col*100,row*100],[(col+1)*100,row*100],[(col+1)*100,(row+1)*100],[col*100,(row+1)*100]],color,weight,[],fill);
 const ring=(x,z,r,color,fill)=>path(Array.from({length:65},(_,i)=>[x+Math.cos(i*Math.PI/32)*r,z+Math.sin(i*Math.PI/32)*r]),color,1,[5,6],fill);
 const dot=(x,y,r,color)=>{ctx.beginPath();ctx.arc(x,y,Math.max(.5,r),0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
 const beam=(x,y,xx,yy,color,n=1)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.strokeStyle=color;ctx.lineWidth=n;ctx.stroke();};
 const text=(name,x,y,color='#e4edf5',size=11)=>{ctx.font=`600 ${size}px system-ui`;const tw=ctx.measureText(name).width+10,b=placeCommandLabel(x,y,width-22,height,tw,occupied);occupied.push(b);if(Math.hypot(b.x-x,b.y-y)>10)beam(x,y,b.x,b.y,color+'66',.7);ctx.fillStyle='#07131df0';ctx.fillRect(b.x-b.w/2,b.y-9,b.w,18);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,b.x,b.y);};
 const sprite=(im,index,cols,rows,x,y,dw)=>{if(!im)return;const cw=im.width/cols,ch=im.height/rows,dh=dw*ch/cw;ctx.drawImage(im,index%cols*cw,Math.floor(index/cols)*ch,cw,ch,x-dw/2,y-dh*.86,dw,dh);};
 ctx.clearRect(0,0,width,height);ctx.fillStyle='#101c27';ctx.fillRect(0,0,width,height);
 if(assets.gridLandscape)ctx.drawImage(assets.gridLandscape,0,0,width,height);
 const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'#08162555');shade.addColorStop(1,'#040b1688');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
 ctx.lineJoin='round';ctx.lineCap='round';text('DIRECT AIR APPROACH',width*.5,19,'#9ddafa',9);text(creditSupports(c)?'CREDIT LINK +20%':'CREDIT LINK OFF',width*.5,40,'#c5a2ff',9);
 // Actual canonical fork routes, with raised deck edges and inset road surfaces.
 for(const road of GRID_ROUTES){ctx.save();ctx.translate(3*u,8*u);path(road,'#02070cdc',66*u);ctx.restore();path(road,'#68777a',61*u);path(road,'#14242c',55*u);path(road,'#34434a',43*u);path(road,'#c5b17b99',1,[4,12]);}
 for(const [x,z,dx,dz] of [[320,850,-1,0],[680,850,1,0],[150,650,0,-1],[150,350,0,-1],[850,650,0,-1],[850,350,0,-1],[320,150,1,0],[680,150,-1,0]])path([[x-dx*10-dz*9,z-dz*10+dx*9],[x+dx*9,z+dz*9],[x-dx*10+dz*9,z-dz*10-dx*9]],'#d6c391aa',1.5);
 ctx.save();ctx.translate(0,8*u);path([[200,200],[800,200],[800,800],[200,800]],'#111b24',2,[],'#091019');ctx.restore();
 for(let col=2;col<=7;col++)for(let row=2;row<=7;row++)cell(col,row,'#60778366',(col+row)%2?'#1b303cde':'#223946de');
 for(let i=2;i<=7;i++){const [x,y]=point((i+.5)*100,825);text(String(i-1),x,y,'#a7bbc5',9);const [xx,yy]=point(175,(i+.5)*100);text(String(i-1),xx,yy,'#a7bbc5',9);}
 for(const [id,r,color,fill] of [['capital',CAPITAL_RADIUS,'#70e4ad88','#70e4ad08'],...(selected==='credit'?[['credit',CREDIT_RADIUS,'#c5a2ffa0','#c5a2ff08']]:[]),...(['cashFlow','credit'].includes(selected)?[['cashFlow',commandStats(s,c.towers[0]).range,'#62dfff88','#62dfff05']]:[])]){const p=assetPoint(c,id);if(p)ring(p.x,p.z,r,color,fill);}
 const gun=assetPoint(c,'cashFlow'),radar=assetPoint(c,'credit'),anchor=assetPoint(c,'collateral');
 if(gun&&radar&&creditSupports(c))path([[gun.x,gun.z],[radar.x,radar.z]],'#c5a2ff77',1,[3,5]);
 if(anchor)path([[500,150],[anchor.x,anchor.z]],'#ffb69b55',1,[3,6]);
 for(const a of actors.filter(a=>a.target.lane==='living').slice(0,8)){const p=assetPoint(c,a.targetAssetId);if(p)path([[a.x,a.z],[p.x,p.z]],'#a7c8ff50',1,[3,7]);}
 // Sort sprites by their displayed foot so tall artwork stays in front of its own tile.
 const placed=GRID_ASSETS.map((id,i)=>({id,i,p:assetPoint(c,id)})).filter(a=>a.p).sort((a,b)=>gridProject(a.p.x,a.p.z).z-gridProject(b.p.x,b.p.z).z);
 for(const {id,i,p} of placed){const [x,y]=point(p.x,p.z),color=COLORS[i],size=Math.max(21,(width<700?68:76)*u);ctx.fillStyle='#0009';ctx.beginPath();ctx.ellipse(x+3*u,y+3*u,size*.43,size*.13,0,0,Math.PI*2);ctx.fill();
  const cellPos=c.layout[id];cell(cellPos.col,cellPos.row,selected===id?'#e8fcff':color+'77',selected===id?'#62dfff12':'#00000000',selected===id?2:1);
  if(i===0&&assets.modules){const im=assets.modules,cw=im.width/4;ctx.drawImage(im,0,0,cw,440,x-size/2,y-size*.57,size,size*440/cw);ctx.save();ctx.translate(x,y-17*u);ctx.rotate(visual.angle);const r=size*.56/cw,recoil=reduced?0:Math.max(0,1-(w.time-(visual.shots.at(-1)?.born??-2))/.13)*2*u;ctx.drawImage(im,0,440,cw,510,-cw*r/2,-390*r+recoil,cw*r,510*r);ctx.restore();}
  else if((i===1||i===3)&&assets.gridSupports){const im=assets.gridSupports;const crop=i===1?[0,300,835,620]:[840,0,696,970],dw=i===1?size:size*.66,dh=i===1?size*.74:size*.93;ctx.drawImage(im,...crop,x-dw/2,y-dh*.9,dw,dh);}
  else sprite(assets.districts,i===1?2:i===2?7:i===3?6:i-4,4,2,x,y,size);
  if(i===1){ctx.strokeStyle='#70e4adbb';ctx.lineWidth=1.5;ctx.fillStyle='#70e4ad10';ctx.beginPath();ctx.ellipse(x,y-12*u,size*.46,size*.48,0,Math.PI,Math.PI*2);ctx.fill();ctx.stroke();}
  if(i===3){const a=reduced?-.8:w.time*.7;ctx.strokeStyle='#c5a2ffb0';ctx.beginPath();ctx.ellipse(x,y-16*u,21*u,9*u,0,a,a+1.4);ctx.stroke();}
  if(i>=4)dot(x+size*.35,y-size*.3,Math.max(2,3*u),capitalCovers(c,id)?'#70e4ad':'#ffae72');
  const label=width>=700?GRID_LABELS[i]:i<4?['CF','SH','HP','R'][i]:'N'+String(i-3);labels.push([label,x,y+13*u,color,width<500?9:10]);
  if(i===2&&assets.sentinel){const h=Math.max(22,43*u),im=assets.sentinel;ctx.drawImage(im,x+size*.28,y-h,h*im.width/im.height,h);}
 }
 if(editing&&w.gridCursor){const {col,row}=w.gridCursor,valid=canPlace(c,selected,col,row);if(col>=2&&col<=7&&row>=2&&row<=7)cell(col,row,valid?'#a7f5ce':'#ff9878',valid?'#8bf4c430':'#ff926b45',2);}
 let packetLabels=0;
 for(const a of actors.slice(0,20)){const air=a.target.lane==='living',[x,y]=point(a.x,a.z),size=Math.max(19,(air?44:40)*u),lift=air?10*u:0;ctx.fillStyle='#03091288';ctx.beginPath();ctx.ellipse(x,y+2*u,size*.35,size*.12,0,0,Math.PI*2);ctx.fill();sprite(assets.enemies,air?1:0,2,1,x,y-lift,size);
  const bw=Math.max(14,25*u);ctx.fillStyle='#08101a';ctx.fillRect(x-bw/2,y-size*.8-lift,bw,3);ctx.fillStyle=a.hp>0?'#ffcb84':'#ff8d71';ctx.fillRect(x-bw/2,y-size*.8-lift,bw*Math.max(0,a.hp/a.maxHp),3);
  if(packetLabels++<(width<700?3:5))labels.push([a.hp===0?'UNFUNDED':'$'+(a.remaining/100).toFixed(2),x,y+12*u,air?'#ffe1a2':'#ffbcaa',10]);
 }
 if(gun){const [gx,gy]=point(gun.x,gun.z);for(const b of visual.shots){const age=w.time-b.born;if(age<0||age>.52)continue;const [tx,ty]=point(b.x,b.z),dx=tx-gx,dy=ty-(gy-17*u),len=Math.hypot(dx,dy)||1,x=gx+dx/len*22*u,y=gy-17*u+dy/len*22*u;
   if(reduced){if(age<.18)beam(x,y,tx,ty,'#a5eefa99',1);continue;}
   for(let j=0;j<3;j++){const f=(age-j*.065)/.17;if(f<0||f>1)continue;const tail=Math.max(0,f-.16);beam(x+(tx-x)*tail,y+(ty-y)*tail,x+(tx-x)*f,y+(ty-y)*f,'#68dcff55',5*u);beam(x+(tx-x)*tail,y+(ty-y)*tail,x+(tx-x)*f,y+(ty-y)*f,'#c4f8ff',2*u);}
   if(age<.14){dot(x,y,4*u,'#62dfff44');dot(x,y,2*u,'#e0fbff');} }
 }
 for(const p of w.ground.projectiles.slice(-8)){path([[p.sx??500,p.sz??935],[p.x,p.z]],'#ffcc8977',1);const [x,y]=point(p.x,p.z);dot(x,y,3,'#ffe3a8');}
 for(const b of w.ground.blasts.slice(-8))ring(b.x,b.z,b.radius,'#ffdc91aa','#ffce7310');
 if(c.manualAssist&&!s.paused&&s.phase==='playing'){const [x,y]=point(w.aim.x,w.aim.z);beam(x-6,y,x+6,y,'#ffdc91');beam(x,y-6,x,y+6,'#ffdc91');}
 for(const d of visual.deaths){const age=w.time-d.born,[x,y]=point(d.x,d.z);ctx.save();ctx.globalAlpha=(1-age/.7)*.7;if(reduced)dot(x,y,4,'#ffd2a0');else for(let j=0;j<5;j++){const a=j*1.256;dot(x+Math.cos(a)*age*28*u,y-8*u+Math.sin(a)*age*22*u,Math.max(1,2*u),'#ffd2a0');}ctx.restore();}
 const events=w.effects.slice(-20).filter(e=>w.time-e.born>=0&&w.time-e.born<1.1);
 for(const e of events){const age=w.time-e.born,[x,y]=point(e.x,e.z),shield=e.type==='impact'&&e.amount>0,structural=e.type==='breach'||e.type==='impact'&&!e.amount;if(!['armor-hit','hit','impact','breach'].includes(e.type))continue;ctx.save();ctx.globalAlpha=(1-age/1.1)*.65;ctx.strokeStyle=shield?'#70e4ad':structural?'#ff916b':'#bcefff';ctx.lineWidth=shield?2:1;ctx.beginPath();if(shield)ctx.ellipse(x,y,Math.max(5,24*u),Math.max(4,18*u),0,Math.PI,Math.PI*2);else ctx.arc(x,y,reduced?4:3+age*15*u,0,Math.PI*2);ctx.stroke();if(structural){beam(x-5,y-5,x+5,y+5,'#ff916b',2);beam(x+5,y-5,x-5,y+5,'#ff916b',2);}ctx.restore();}
 for(const args of labels)text(...args);
 for(const e of events.filter(e=>e.amount>0&&['hit','impact'].includes(e.type)).slice(-2)){const [x,y]=point(e.x,e.z);text((e.type==='hit'?'Paid $':'Savings paid $')+(e.amount/100).toFixed(2),x,y-30, e.type==='hit'?'#b3f6d2':'#ffe0a4',11);}
 const pressure=livingPressure(s),pressureLabel=pressure.ratio!==null?'LIVING COSTS '+Math.round(pressure.ratio*100)+'%':pressure.position!==null?'COSTS / NO INCOME':'LIVING COSTS: NO RATIO';
 beam(width-13,height*.2,width-13,height*.8,'#8b805e');if(pressure.position!==null){ctx.setLineDash([8,5]);beam(width-19,height*(.2+pressure.position*.6),width-7,height*(.2+pressure.position*.6),'#f5c575',2);ctx.setLineDash([]);}
 ctx.save();ctx.translate(width-25,height*.5);ctx.rotate(-Math.PI/2);ctx.font='600 9px system-ui';ctx.fillStyle='#ffe0a0';ctx.textAlign='center';ctx.fillText(pressureLabel,0,0);ctx.restore();
 text('GROUND ENTRY',...point(500,978),'#d4be8a',9);text('GROUND CONVERGENCE',...point(500,120),'#d4be8a',9);
 ctx.canvas.__debtbreakPresentation={shots:visual.shots.map(b=>({tower:b.tower,born:b.born})),aims:[visual.angle],deaths:visual.deaths.length,events:events.length,labelBounds:occupied,projection:'grid-oblique-v1'};
 ctx.canvas.__debtbreakView={cycle:s.period,phase:s.phase,time:w.time,stage:c.stage,allowance:c.allowance,autoPaid:s.continuous.ground.autoPaid,held:Object.values(s.continuous.holds).reduce((n,h)=>n+h.amount,0),actors:actors.map(a=>({id:a.id,targetId:a.target.id,targetAssetId:a.targetAssetId,role:a.target.lane==='living'?'expense':'debt',x:a.x,z:a.z,amount:a.remaining,hp:a.hp,maxHp:a.maxHp,impactAt:a.impactAt})),layout:structuredClone(c.layout),blasts:w.ground.blasts.map(b=>({x:b.x,z:b.z,radius:b.radius})),shots:w.shots,hits:w.hits};
}
