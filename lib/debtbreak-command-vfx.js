import {commandPoint,placeCommandLabel} from './debtbreak-command-view.js';
import {COMMAND_GUNS} from './debtbreak-command.js';
import {commandPresentation} from './debtbreak-command-presentation.js';
export const VFX_LIMITS=Object.freeze({beams:12,events:20,sparks:6,receipts:3});
const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function drawCommandVfx(ctx,w,width,height,assets={},reduced=false,presentation,protectedLabels=[]){
 const state=presentation??commandPresentation(ctx,w),scale=Math.max(.42,Math.min(width/1000,height/620));
 const point=(x,z)=>{const p=commandPoint(x,z);return [p.x*width/1000,p.z*height/1000];};
 const line=(x,y,xx,yy,color,size)=>{ctx.strokeStyle=color;ctx.lineWidth=size;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();};
 const ring=(x,y,r,color,size=1)=>{ctx.strokeStyle=color;ctx.lineWidth=size;ctx.beginPath();ctx.arc(x,y,Math.max(1,r),0,Math.PI*2);ctx.stroke();};
 const dot=(x,y,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(.4,r),0,Math.PI*2);ctx.fill();};
 const light=(x,y,r,color)=>{ctx.save();ctx.globalAlpha*=.14;dot(x,y,r,color);ctx.restore();};
 const receiptBounds=[];ctx.save();ctx.lineCap='round';
 for(const b of state.shots.slice(-12)){
  const age=w.time-b.born,duration=[.52,.9,.82,.65][b.tower];if(age<0||age>duration)continue;
  const [px,py]=point(b.pad.x,b.pad.z),[tx,groundY]=point(b.x,b.z),ty=groundY-12*scale;
  const dx=tx-px,dy=ty-(py-22*scale),length=Math.hypot(dx,dy)||1,muzzle=[40,25,39,40][b.tower],x=px+dx/length*muzzle*scale,y=py-22*scale+dy/length*muzzle*scale,color=COMMAND_GUNS[b.tower].color;
  if(reduced){if(age<.25){ctx.globalAlpha=.5;line(x,y,tx,ty,color,1.5);}continue;}
  ctx.globalAlpha=clamp((duration-age)/.22)*.85;
  light(x,y,13*scale,color);
  if(b.tower===0){
   // Three cosmetic slugs express one resolved kinetic attack. They never settle money.
   for(let n=0;n<3;n++){const progress=(age-n*.085)/.21;if(progress<0||progress>1)continue;const p=clamp(progress),tail=clamp(p-.12);line(x+(tx-x)*tail,y+(ty-y)*tail,x+(tx-x)*p,y+(ty-y)*p,color,3*scale);dot(x+(tx-x)*p,y+(ty-y)*p,2*scale,'#e4ffff');}
   if(age<.25){ring(x,y,(4+Math.sin(age*60)*2)*scale,color,2);}
  }else if(b.tower===1){
   // Heavy induction beam: stable core, breathing sheath, then a residual contact ring.
   const beam=age<.58; if(beam){ctx.globalAlpha*=.65+.15*Math.sin(age*25);line(x,y,tx,ty,'#70ffb433',9*scale);line(x,y,tx,ty,color,3.5*scale);line(x,y,tx,ty,'#e7ffed',Math.max(.85,1.1*scale));}
   ring(tx,ty,(5+age*15)*scale,color,1.5);light(tx,ty,15*scale,color);
  }else if(b.tower===2){
   const p=clamp(age/.2),xx=x+(tx-x)*p,yy=y+(ty-y)*p-Math.sin(p*Math.PI)*18*scale;
   if(age<.23){line(x,y,xx,yy,'#ffae4c55',4*scale);dot(xx,yy,4*scale,'#ffe4b0');}
   if(age>.16){const f=age-.16;light(tx,ty,(15+f*12)*scale,'#ff982f');ring(tx,ty,(4+f*30)*scale,'#ffc264',2*scale);for(let j=0;j<4;j++){const a=j*1.57+b.born,r=(7+f*20)*scale;line(tx+Math.cos(a)*r,ty+Math.sin(a)*r,tx+Math.cos(a)*(r+5*scale),ty+Math.sin(a)*(r+5*scale),'#ffbd62',1.5);}}
  }else{
   if(age<.48){let xx=x,yy=y;const phase=Math.floor(age*16);for(let j=1;j<=8;j++){const p=j/8,offset=j===8?0:Math.sin(j*4.2+phase*2.1+b.born)*7*scale,nx=x+(tx-x)*p-dy/length*offset,ny=y+(ty-y)*p+dx/length*offset;line(xx,yy,nx,ny,'#aa86ff55',5*scale);line(xx,yy,nx,ny,'#dbc9ff',Math.max(1.1,1.5*scale));if(j===5)line(nx,ny,nx+dy/length*13*scale,ny-dx/length*13*scale,'#a98eff',1);xx=nx;yy=ny;}}
   ring(tx,ty,(5+age*13)*scale,color);light(tx,ty,11*scale,color);
  }
  if(age<.26){dot(x,y,2.5*scale,'#f0fdff');line(x-4*scale,y,x+4*scale,y,color,1);line(x,y-4*scale,x,y+4*scale,color,1);}
 }
 for(const d of state.deaths){const age=w.time-d.born,[x,y]=point(d.x,d.z);ctx.globalAlpha=clamp(1-age/.8)*(reduced?.3:.65);if(reduced){ring(x,y,9*scale,'#8dd3d5');continue;}
  light(x,y-8*scale,(12+age*20)*scale,'#f6c07b');for(let j=0;j<5;j++){const a=j*1.256,r=age*35*scale;dot(x+Math.cos(a)*r,y-8*scale+Math.sin(a)*r-age*9*scale,(2-age)*scale,'#ffd0a1');}ctx.globalAlpha*=.25;dot(x,y-12*scale-age*24*scale,(8+age*18)*scale,'#546575');
 }
 for(const e of (reduced?state.events.slice(-2):state.events)){const age=w.time-e.born;if(age<0||age>=1.1)continue;const [x,y]=point(e.x,e.z),shield=e.type==='impact'&&e.amount>0,structural=e.type==='breach'||e.type==='impact'&&!e.amount;
  if(!['armor-hit','hit','impact','breach','clear'].includes(e.type))continue;
  const color=shield?'#70ffb4':structural?'#ff9363':'#a5edf2';ctx.globalAlpha=(reduced?.55:clamp(1-age/.8))*.7;
  if(shield){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,Math.max(1,(25+age*12)*scale),Math.max(1,(12+age*5)*scale),0,Math.PI,Math.PI*2);ctx.stroke();}
  else if(reduced)ring(x,y,5*scale,color);
  else if(age<.4){ring(x,y-12*scale,(4+age*19)*scale,color);if(assets.impact&&e.type==='armor-hit'){const size=(15+age*28)*scale;ctx.globalAlpha*=.5;ctx.drawImage(assets.impact,x-size/2,y-12*scale-size/2,size,size);}}
 }
 // Receipts are painted last, with reserved space above the contact. Amounts come only from ledger events.
 let receipts=0;for(const e of state.events){if(receipts>=3)break;const age=w.time-e.born,paid=e.type==='hit'&&e.amount>0,shield=e.type==='impact'&&e.amount>0;if(age<0||age>=1.1||!paid&&!shield)continue;
  const [x,y]=point(e.x,e.z),label=(shield?'Savings paid ':'Paid ')+money.format(e.amount/100);ctx.font='600 12px system-ui';const tw=ctx.measureText(label).width+12,box=placeCommandLabel(x,y-42*scale-(reduced?0:age*8),width,height,tw,[...protectedLabels,...receiptBounds]),xx=box.x,yy=box.y;ctx.globalAlpha=1;ctx.fillStyle='#071621f5';ctx.fillRect(xx-tw/2,yy-10,tw,20);ctx.fillStyle=shield?'#96ffc5':'#d1fff4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,xx,yy);receiptBounds.push({x:xx,y:yy,w:tw});receipts++;
 }
 ctx.restore();return receiptBounds;
}
