"use client";

import { useEffect, useRef } from "react";
import { setAim, setTrigger, targetPosition, defenseContact, combatActors, TURRET, VAULT } from "@/lib/debtbreaker-combat.js";
import type { BattlefieldProps } from "./debtbreaker-battlefield";

// A live projected-canvas renderer for devices without WebGL. The simulation,
// collision volumes, controls, and accounting are shared with the 3D room.
export function DebtbreakerCompatibility({world,onReady,onFailure,onGesture,reduced,avatar}:BattlefieldProps){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");if(!ctx){onFailure();return;}
    const operator=new Image();operator.src=avatar==='mech'?'/characters/sentinel.png':'/characters/verdant.png';
    let width=0,height=0,scale=1,cx=0,cy=0,frame=0;
    const resize=()=>{
      const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
      width=r.width;height=r.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);scale=Math.min(width/24.5,height/14.3);cx=width/2;cy=height/2+.5*scale;
    };
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    const point=(x:number,z:number,h=0)=>[cx+x*scale,cy+(z*.58-h*.81)*scale];
    const polygon=(pts:number[][],fill:string,stroke="#597486")=>{
      ctx.beginPath();pts.forEach((p,i)=>{if(i===0)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);});ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();
    };
    const line=(from:number[],to:number[],color:string,weight=1)=>{ctx.beginPath();ctx.moveTo(from[0],from[1]);ctx.lineTo(to[0],to[1]);ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.stroke();};
    const box=(x:number,z:number,w:number,d:number,h:number,color:string)=>{
      const a=point(x-w/2,z-d/2,h),b=point(x+w/2,z-d/2,h),c=point(x+w/2,z+d/2,h),e=point(x-w/2,z+d/2,h);
      polygon([e,c,point(x+w/2,z+d/2),point(x-w/2,z+d/2)],"#203a49");
      polygon([b,c,point(x+w/2,z+d/2),point(x+w/2,z-d/2)],"#162f3c");polygon([a,b,c,e],color);
      line(a,b,"#b4d8df44");line(a,e,"#d7f8ff33");
    };
    const label=(text:string,x:number,z:number,h:number,color="#d6e7ed",size=11)=>{
      const p=point(x,z,h);ctx.font=`600 ${Math.max(9,Math.min(size,scale*.32))}px ui-monospace,monospace`;
      const w=ctx.measureText(text).width;ctx.fillStyle="#0a1721e6";ctx.fillRect(p[0]-w/2-6,p[1]-10,w+12,18);
      ctx.fillStyle=color;ctx.textAlign="center";ctx.fillText(text,p[0],p[1]+3);
    };
    const draw=()=>{
      ctx.clearRect(0,0,width,height);ctx.fillStyle="#0c1d2b";ctx.fillRect(0,0,width,height);
      const w=world.current;
      polygon([point(-11.5,-8.5),point(11.5,-8.5),point(11.5,10),point(-11.5,10)],"#2a4454","#78909c");
      const glow=ctx.createRadialGradient(cx,cy,scale,cx,cy,scale*12);glow.addColorStop(0,'#4d819533');glow.addColorStop(1,'#040e22aa');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
      for(let x=-10;x<=10;x+=2)line(point(x,-8),point(x,9.7),"#38586a");
      for(let z=-8;z<10;z+=2)line(point(-11.3,z),point(11.3,z),"#38586a");
      box(0,-8.6,23.3,.6,2.2,"#516b79");
      for(const side of [-1,1]){
        box(side*11.4,.5,.5,18,1.2,"#425e70");
        for(const z of [-6,-2,2,6]){box(side*11.1,z,.6,.7,2,"#68818d");line(point(side*10.76,z,1.7),point(side*10.76,z,.4),"#7acbe0",2);}
        const x=side*8.6,color=side<0?"#b39bff":"#ffb86b";
        box(x,-5.4,3.1,1,2.4,"#476172");polygon([point(x-1,-4.84),point(x+1,-4.84),point(x+1,-4.84,2),point(x-1,-4.84,2)],"#0e202d");
        line(point(x-1.1,-4.8),point(x-1.1,-4.8,2),color,3);line(point(x+1.1,-4.8),point(x+1.1,-4.8,2),color,3);
        label(side<0?"CREDIT":"LIVING COST",x,-5.1,3.1,color,15);
      }
      line(point(-8.4,-6.3),point(8.4,-6.3),"#77deb5",2);label("RESERVE • DEPOSIT LANE",0,-8.2,2.1,"#a1ffe0",13);
      for(const lane of ['credit','living']){
        ctx.beginPath();for(let n=0;n<=100;n+=2){const p=targetPosition({lane,progress:n},0,lane==='credit'?1:0),s=point(p.x,p.z);if(!n)ctx.moveTo(...s as [number,number]);else ctx.lineTo(...s as [number,number]);}
        ctx.strokeStyle=lane==='credit'?"#9374c3":"#d9924d";ctx.lineWidth=2;ctx.stroke();
      }
      ctx.setLineDash([7,6]);ctx.beginPath();for(let n=0;n<=30;n++){const a=-1.4+n/30*2.8,p=point(Math.sin(a)*5.2,TURRET.z-Math.cos(a)*5.2);if(!n)ctx.moveTo(...p as [number,number]);else ctx.lineTo(...p as [number,number]);}ctx.strokeStyle="#84e4cc";ctx.stroke();ctx.setLineDash([]);
      if(w.ledger.hangar){
        const range=w.ledger.hangar.loadout.radar,limit=Math.min(1.3,Math.asin(Math.min(1,10.2/range)));
        ctx.setLineDash([3,7]);ctx.beginPath();for(let n=0;n<=60;n++){const a=-limit+n/60*limit*2,p=point(Math.sin(a)*range,TURRET.z-Math.cos(a)*range);if(!n)ctx.moveTo(...p as [number,number]);else ctx.lineTo(...p as [number,number]);}ctx.strokeStyle='#b8a2ff99';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);
      }
      w.ledger.defenses.forEach((d,i)=>{for(const side of [-1,1])for(let j=0;j<5;j++){
        const p=defenseContact(side<0?'credit':'living',j,i),hit=w.effects.findLast(e=>['breach','impact'].includes(e.type)&&Math.hypot(e.x-p.x,e.z-p.z)<.8),age=hit?w.time-hit.born:2;
        const x=p.x,z=p.z+(!reduced&&age<.35?Math.sin(age*55)*.12*(1-age/.35):0),h=d.owned?.2+d.condition/125:.12;
        box(x,z,.72,.55,h,age<.2?'#d8ac73':d.owned&&d.condition>0?'#8a9da3':'#5e3732');
        line(point(x-.2,z-.29,h*.7),point(x+.2,z-.29,h*.7),age<.4?'#ffbf69':d.condition>0?'#99edcf':'#885345',2);
        if(d.condition<100)line(point(x-.17,z+.29,h*.9),point(x+.12,z+.29,h*.3),'#1c2029',2);
      }});
      combatActors(w).sort((a,b)=>a.z-b.z).forEach(p=>{
        const t=p.target,friendly=t.lane==='reserve',color=friendly?'#83e0b5':t.lane==='credit'?'#a597d2':'#c49362';
        const recent=w.effects.some(e=>e.actorId===p.id&&w.time-e.born<.12),z=p.z+(recent&&!reduced?.15:0);
        const hovering=.55+(!reduced?Math.sin(w.time*3+p.slot)*.07:0);
        ctx.fillStyle='#09172288';const shadow=point(p.x,z+.25);ctx.beginPath();ctx.ellipse(shadow[0],shadow[1],scale*(friendly?1.15:.62),scale*.22,0,0,Math.PI*2);ctx.fill();
        if(t.lane==='credit'){
          const bank=Math.cos(w.time*1.8+p.slot+p.index)*.1;
          polygon([point(p.x,z-.6,hovering),point(p.x+.78,z,hovering+bank),point(p.x+.3,z+.48,hovering),point(p.x-.3,z+.48,hovering),point(p.x-.78,z,hovering-bank)],t.lane==='credit'?'#646179':'#806650');
          box(p.x,z,.5,.65,hovering+.22,recent?'#e8e6c3':color);
          for(const side of [-1,1]){
            const jet=point(p.x+side*.52,z-.07,hovering+.03);ctx.fillStyle=t.lane==='credit'?'#cbbaff':'#ffbd73';ctx.beginPath();ctx.ellipse(jet[0],jet[1],scale*.13,scale*.075,0,0,Math.PI*2);ctx.fill();
            line(point(p.x+side*.44,z+.1,hovering),point(p.x+side*.5,z+.33,hovering),color,2);
          }
          line(point(p.x-.17,z+.35,hovering+.12),point(p.x+.17,z+.35,hovering+.12),t.overdue?'#ff7465':'#ffe3ba',2);
        }else if(!friendly){
          for(const side of [-1,1]){box(p.x+side*.43,z,.19,1.04,.28,'#263846');for(let n=-.4;n<.5;n+=.2)line(point(p.x+side*.35,z+n,.3),point(p.x+side*.54,z+n,.3),'#7c898d',1);}
          box(p.x,z,.75,.84,.54,recent?'#ffdf9e':color);box(p.x,z,.5,.5,.77,'#a88961');
          line(point(p.x,z+.15,.8),point(p.x,z+.65,.8),'#423d36',Math.max(3,scale*.13));
        }else{
          box(p.x-.83,z,.44,1.8,.36,"#293e48");box(p.x+.83,z,.44,1.8,.36,"#293e48");
          for(const side of [-1,1])for(let n=-.6;n<.8;n+=.4)line(point(p.x+side*.8,z+n,.39),point(p.x+side*1.04,z+n,.39),"#77959e",2);
          box(p.x,z,1.6,1.3,.8,color);box(p.x,z,.95,.92,1.14,friendly?"#abd6c2":"#a98d71");
          if(friendly){line(point(p.x-.3,z,1.2),point(p.x+.3,z,1.2),"#e6fff5",4);line(point(p.x,z-.5,1.2),point(p.x,z+.5,1.2),"#e6fff5",4);}
          else for(const side of [-1,1])line(point(p.x+side*.48,z+.3,1),point(p.x+side*.48,z+1,1),"#414d58",Math.max(3,scale*.16));
        }
        if(friendly||w.drones.find(d=>d.targetId===t.id&&d.remaining>0)?.id===p.id){
          const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:t.remaining%100?2:0}).format(t.remaining/100);
          const name=friendly?'DEPOSIT • INCOME ONLY':`${t.label.slice(0,16)} · ${amount} GROUP`;
          label(name,p.x,z,friendly?1.75:1.2,t.overdue?'#ff9e84':color,10);
        }
      });
      const pillars:[number,number,string,string][]=[[-4.1,5,"CASH FLOW","#79edc8"],[4.1,5,"CAPITAL","#83d7ff"],[-4.1,8,"COLLATERAL","#ffd099"],[4.1,8,"CREDIT","#c4acff"]];
      for(const [x,z,name,color] of pillars){box(x,z,1.3,1.2,.2,"#4b6573");box(x,z,.7,.7,1.9,"#587583");line(point(x,z+.4,.4),point(x,z+.4,1.8),color,Math.max(2,scale*.11));label(name,x+(z===5?(x<0?-1.7:1.7):0),z+.9,0,color,12);}
      box(VAULT.x,VAULT.z,2.7,1.4,1,"#729b97");const v=point(VAULT.x,VAULT.z+.72,.52);ctx.strokeStyle="#a5efce";ctx.lineWidth=2;ctx.beginPath();ctx.arc(v[0],v[1],scale*.28,0,Math.PI*2);ctx.stroke();label("VAULT",0,9.7,0,"#a1f5d3",12);
      const turret=point(TURRET.x,TURRET.z,.2);ctx.fillStyle="#547684";ctx.strokeStyle="#8fdcc8";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(turret[0],turret[1],scale*1.25,scale*.78,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      const dx=Math.sin(w.angle),dz=-Math.cos(w.angle);
      const firing=w.effects.some(e=>e.type==='shot'&&w.time-e.born<.1),ox=TURRET.x-dx*.85,oz=TURRET.z-dz*.85,kick=firing&&!reduced?.045:0;
      // Reuse the selected avatar's existing face and armor above the gun.
      const body=point(ox,oz,1.15-kick);
      if(operator.complete&&operator.naturalWidth){ctx.drawImage(operator,0,0,operator.naturalWidth,operator.naturalHeight*.48,body[0]-scale*1.2,body[1]-scale*1.8,scale*2.4,scale*1.8);}
      else box(ox,oz,.7,.5,1.65,avatar==='mech'?'#9daab6':'#758c51');
      for(const side of [-1,1]){
        const sx=ox+Math.cos(w.angle)*side*.47,sz=oz+Math.sin(w.angle)*side*.47,hand=point(TURRET.x+Math.cos(w.angle)*side*.4-dx*.4,TURRET.z+Math.sin(w.angle)*side*.4-dz*.4,1);
        line(point(sx,sz,1.35-kick),hand,avatar==='mech'?'#a9b8bd':'#a1b777',Math.max(3,scale*.2));
        line(hand,point(TURRET.x+Math.cos(w.angle)*side*.4,TURRET.z+Math.sin(w.angle)*side*.4,1),'#243e4b',Math.max(3,scale*.14));
      }
      box(TURRET.x,TURRET.z,1.25,1.1,.9,'#9bb1b7');
      for(const side of [-1,1]){
        const x=TURRET.x+Math.cos(w.angle)*side*.24,z=TURRET.z+Math.sin(w.angle)*side*.24;
        line(point(x,z,.93),point(x+dx*2,z+dz*2,.93),"#162c3a",Math.max(5,scale*.22));line(point(x,z,.98),point(x+dx*2,z+dz*2,.98),"#c3d7db",Math.max(2,scale*.09));
      }
      if(w.effects.some(e=>e.type==='shot'&&w.time-e.born<.075)){
        const p=point(TURRET.x+dx*2.1,TURRET.z+dz*2.1,.93);ctx.fillStyle="#e6ffd0";ctx.beginPath();ctx.arc(p[0],p[1],Math.max(4,scale*.22),0,Math.PI*2);ctx.fill();
      }
      for(const b of w.bullets)line(point(b.x-b.dx*.6,b.z-b.dz*.6,.75),point(b.x,b.z,.75),b.source==='reserve'?"#85c9ff":"#f5ffbf",3);
      for(const e of w.effects){
        const age=w.time-e.born;if(['shot','miss','checkpoint','defeat'].includes(e.type))continue;
        if(e.type==='breach'||e.type==='impact'){
          const life=Math.max(0,1-age/1.25),p=point(e.x,e.z,.25),spread=reduced?.65:.2+age*2;
          const flare=point(e.x,e.z,.7),radius=Math.max(1,scale*(.6+age));
          const burst=ctx.createRadialGradient(flare[0],flare[1],0,flare[0],flare[1],radius);burst.addColorStop(0,'#fff2c4');burst.addColorStop(.25,'#ffc575');burst.addColorStop(1,'#ff754000');
          ctx.globalAlpha=reduced?life*.18:Math.max(0,.85-age*2.5);ctx.fillStyle=burst;ctx.beginPath();ctx.arc(flare[0],flare[1],radius,0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=life;ctx.strokeStyle='#ffbc69';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p[0],p[1],scale*spread,scale*spread*.58,0,0,Math.PI*2);ctx.stroke();
          for(let j=0;j<10;j++){
            const a=j*2.399+e.serial,v=.9+j%3*.6,flight=reduced?.25:age;
            const q=point(e.x+Math.cos(a)*flight*v,e.z+Math.sin(a)*flight*v,.4+Math.max(0,flight*(2+j*.1)-flight*flight*2.5));
            if(j%2)line(q,[q[0]-Math.cos(a)*scale*.18,q[1]-Math.sin(a)*scale*.12],'#ffe0a1',2);
            else{ctx.fillStyle='#a9afb1';ctx.save();ctx.translate(q[0],q[1]);ctx.rotate(age*j);ctx.fillRect(-scale*.075,-scale*.055,scale*.15,scale*.11);ctx.restore();}
          }
          for(let j=0;j<3;j++){const q=point(e.x+(j-1)*.25,e.z,.5+age*(.8+j*.2));ctx.globalAlpha=life*.22;ctx.fillStyle='#a2a7aa';ctx.beginPath();ctx.arc(q[0],q[1],scale*(.2+age*.55),0,Math.PI*2);ctx.fill();}
          ctx.globalAlpha=life;ctx.fillStyle='#ffd59b';ctx.font='bold 10px ui-monospace';ctx.textAlign='center';ctx.fillText('BREACH',p[0],p[1]-scale*(.7+age));ctx.globalAlpha=1;continue;
        }
        const t=Math.min(1,age/.7),transfer=e.type==='deposit'||e.type==='intercept';
        const from=e.type==='intercept'?VAULT:e,to=e.type==='deposit'?VAULT:e;
        const p=point(from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t,transfer?1+Math.sin(t*Math.PI)*2:.6);
        ctx.globalAlpha=transfer?1:1-t;ctx.strokeStyle=e.type==='breach'?"#ff9173":"#99ffe0";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p[0],p[1],transfer?5:Math.max(1,scale*(.25+t)),0,Math.PI*2);ctx.stroke();
        if(e.amount>0){ctx.font="bold 11px ui-monospace";ctx.fillStyle=ctx.strokeStyle;ctx.fillText(`${e.type==='deposit'?'+':''}$${e.amount/100}`,p[0],p[1]-13);}
        ctx.globalAlpha=1;
      }
      const aim=point(w.aim.x,w.aim.z);ctx.strokeStyle="#edfff7";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(aim[0],aim[1],Math.max(6,scale*.32),0,Math.PI*2);ctx.stroke();for(const side of [-1,1]){line([aim[0]+side*10,aim[1]],[aim[0]+side*16,aim[1]],"#edfff7");line([aim[0],aim[1]+side*10],[aim[0],aim[1]+side*16],"#edfff7");}
      ctx.font="10px ui-monospace";ctx.textAlign="left";ctx.fillStyle="#9bb6c6";ctx.fillText("COMPATIBILITY VIEW · SAME GAMEPLAY & LEDGER",12,height-10);
      frame=requestAnimationFrame(draw);
    };
    const aim=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect();setAim(world.current,(e.clientX-r.left-cx)/scale,(e.clientY-r.top-cy)/(scale*.58));};
    const down=(e:PointerEvent)=>{if(e.button!==0||world.current.ledger.paused)return;e.preventDefault();onGesture();canvas.focus({preventScroll:true});aim(e);canvas.setPointerCapture(e.pointerId);if(e.pointerType!=='touch')setTrigger(world.current,'pointer',true);};
    const up=(e:PointerEvent)=>{if(e.pointerType!=='touch')setTrigger(world.current,'pointer',false);};
    canvas.addEventListener('pointermove',aim);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);
    frame=requestAnimationFrame(draw);onReady();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointermove',aim);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);};
  },[world,onReady,onFailure,onGesture,reduced,avatar]);
  return <canvas ref={ref} tabIndex={0} aria-label="Aim anywhere in the battlefield. Hold mouse button to fire. On touch, drag to aim and hold Fire."/>;
}
