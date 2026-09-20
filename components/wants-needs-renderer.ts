import { RUNNER_GROUND as G, RUNNER_LEVELS, type RunnerLoadout, type RunnerState } from "@/lib/wants-needs-engine.js";

type Ctx = CanvasRenderingContext2D;
function rect(c:Ctx,x:number,y:number,w:number,h:number,color:string) { c.fillStyle=color; c.fillRect(x,y,w,h); }
function line(c:Ctx,x:number,y:number,xx:number,yy:number,color:string,width=2) {
  c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();
}
function round(c:Ctx,x:number,y:number,w:number,h:number,r:number,fill:string,stroke?:string) {
  c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
}
function circle(c:Ctx,x:number,y:number,r:number,fill:string) {c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function text(c:Ctx,label:string,x:number,y:number,color:string,size=16) {
  c.fillStyle=color;c.font=`700 ${size}px monospace`;c.textAlign="center";c.textBaseline="middle";c.fillText(label,x,y);
}
function coffee(c:Ctx) {
  c.fillStyle="#fff0d8";c.beginPath();c.moveTo(-18,-42);c.lineTo(18,-42);c.lineTo(13,-2);c.lineTo(-12,-2);c.closePath();c.fill();
  rect(c,-16,-31,31,19,"#ff8d79");round(c,-20,-48,40,7,3,"#a07167");rect(c,-15,-52,30,5,"#f8d3b4");
  line(c,-6,-57,-9,-65,"#bce3e5",3);line(c,5,-57,8,-67,"#bce3e5",3);
  rect(c,-9,-26,5,5,"#33213d");rect(c,5,-26,5,5,"#33213d");line(c,-3,-15,6,-15,"#642e34",2);
  rect(c,-15,-2,10,5,"#b67859");rect(c,6,-2,10,5,"#b67859");
}
function burger(c:Ctx) {
  c.fillStyle="#f7b44f";c.beginPath();c.ellipse(0,-27,25,17,0,Math.PI,Math.PI*2);c.fill();
  for(const [x,y] of [[-12,-34],[0,-38],[10,-32]]) line(c,x,y,x+3,y-1,"#ffeab0",2);
  round(c,-25,-28,50,6,3,"#65dba0");round(c,-23,-22,46,11,4,"#713b43");
  c.fillStyle="#ffdd62";c.beginPath();c.moveTo(-23,-22);c.lineTo(21,-22);c.lineTo(9,-14);c.lineTo(-3,-20);c.lineTo(-15,-14);c.closePath();c.fill();
  round(c,-23,-10,46,9,4,"#ed9d42");rect(c,-12,-35,5,5,"#452c38");rect(c,6,-35,5,5,"#452c38");
}
function utility(c:Ctx) {
  round(c,-22,-54,44,52,5,"#315b68","#82efc1");
  round(c,-15,-46,30,16,3,"#102b3a");text(c,"kWh",0,-38,"#a9f5d5",12);
  line(c,4,-25,-5,-16,"#ffdb7c",5);line(c,-5,-16,5,-16,"#ffdb7c",4);line(c,5,-16,-3,-6,"#ffdb7c",5);
  rect(c,-18,-2,12,5,"#78a5ae");rect(c,7,-2,12,5,"#78a5ae");
  text(c,"UTILITIES",0,-70,"#acffda",14);
}
function plane(c:Ctx,direction:number) {
  c.save();c.scale(direction,1);
  c.fillStyle="#a8a8cd";c.beginPath();
  c.moveTo(-40,-10);c.lineTo(-30,-26);c.lineTo(-23,-26);c.lineTo(-19,-15);
  c.lineTo(-4,-15);c.lineTo(6,-37);c.lineTo(17,-37);c.lineTo(12,-15);
  c.lineTo(33,-15);c.lineTo(44,-6);c.lineTo(33,0);c.lineTo(11,0);
  c.lineTo(17,14);c.lineTo(6,14);c.lineTo(-5,0);c.lineTo(-35,0);c.closePath();c.fill();
  round(c,17,-15,15,8,3,"#65e7f3");rect(c,-35,-10,50,5,"#c8658c");
  c.restore();text(c,"AD PLANE",0,-54,"#ffd5e4",14);
}
function boss(c:Ctx,s:RunnerState,reduced:boolean) {
  const b=s.boss,accent=RUNNER_LEVELS[s.level-1].color;
  c.save();c.translate(b.x,b.y);
  if(b.flash>0&&!reduced){c.shadowColor="#fff";c.shadowBlur=20;}
  if(s.level===1) {
    round(c,-37,-28,25,29,5,"#414d67");round(c,13,-28,25,29,5,"#414d67");
    round(c,-46,-98,92,76,10,"#2f3a57",accent);rect(c,-4,-96,9,56,accent);
    round(c,-31,-137,62,40,7,"#bcbcc5");rect(c,-35,-144,70,10,"#ffd387");rect(c,-22,-165,44,23,"#4c4259");
    rect(c,-23,-126,16,8,"#54e4e5");rect(c,7,-126,16,8,"#54e4e5");
    round(c,-65,-92,25,43,6,"#6e6780");round(c,41,-92,25,43,6,"#6e6780");
    line(c,-51,-63,-84,-63,accent,9);circle(c,-91,-63,13,accent);circle(c,-91,-63,6,"#112031");
    line(c,-55,-63,-55,-48,accent,5);line(c,-64,-63,-64,-52,accent,5);
    text(c,"RENT",0,-60,"#ffdea9",15);
  } else if(s.level===2) {
    for(const x of [-50,50]) {circle(c,x,-12,25,"#182438");circle(c,x,-12,15,"#838da4");circle(c,x,-12,7,"#243249");
      const a=reduced?0:s.elapsed*3;line(c,x+Math.cos(a)*13,-12+Math.sin(a)*13,x-Math.cos(a)*13,-12-Math.sin(a)*13,"#dbe4f4",3);}
    round(c,-78,-64,155,43,9,"#8f3e55",accent);round(c,-44,-98,98,43,7,"#ad5764",accent);
    round(c,-35,-88,78,25,3,"#163b51");line(c,-26,-77,-5,-70,"#91f5ef",4);line(c,31,-77,10,-70,"#91f5ef",4);
    rect(c,-61,-52,42,8,"#ffc791");rect(c,31,-52,30,8,"#ffc791");rect(c,-12,-38,40,8,"#222840");
    line(c,-21,-106,-58,-126,"#d7dce9",11);circle(c,-65,-130,16,"#d7dce9");circle(c,-67,-136,10,"#163044");
    text(c,"REPAIR",5,-52,"#ffe0d1",12);
  } else {
    round(c,-46,-25,28,28,5,"#736284");round(c,18,-25,28,28,5,"#736284");
    round(c,-59,-129,118,110,5,"#82729a",accent);
    c.fillStyle="#b2a0ff";c.beginPath();c.moveTo(-75,-129);c.lineTo(0,-182);c.lineTo(75,-129);c.closePath();c.fill();
    c.fillStyle="#463b6e";c.beginPath();c.moveTo(-54,-137);c.lineTo(0,-175);c.lineTo(54,-137);c.closePath();c.fill();
    rect(c,31,-171,16,29,"#9d83af");round(c,-44,-110,30,28,3,"#16354b");round(c,14,-110,30,28,3,"#16354b");
    line(c,-38,-101,-20,-95,"#75eee7",4);line(c,38,-101,20,-95,"#75eee7",4);
    round(c,-13,-66,27,46,5,"#243b50");circle(c,0,-47,9,"#ffc16e");
    round(c,-73,-96,15,54,4,"#ada2c8");round(c,59,-96,15,54,4,"#ada2c8");
    text(c,"HOME",0,-77,"#ffdfb3",15);
  }
  if(b.warning>0){c.shadowBlur=0;circle(c,0,-b.h-25,13,"#ff777e");text(c,"!",0,-b.h-25,"#1b182b",19);}
  c.restore();
}
function runner(c:Ctx,s:RunnerState,reduced:boolean) {
  c.save();c.translate(s.x,s.y);c.scale(s.facing,1);
  if(s.invulnerable>0&&!reduced)c.globalAlpha=.5+.5*Math.abs(Math.cos(s.elapsed*16));
  if(s.shields>0){c.strokeStyle="#69e3b2";c.lineWidth=2;c.beginPath();c.ellipse(0,-28,30,37,0,0,Math.PI*2);c.stroke();}
  const stride=s.moving&&s.grounded&&!reduced?Math.sin(s.elapsed*17)*9:0;
  line(c,-5,-20,-9+stride,-4,"#7793ab",8);line(c,6,-20,11-stride,-4,"#d1e5eb",8);
  round(c,-15+stride,-5,15,6,2,"#a0b9ce");round(c,3-stride,-5,17,6,2,"#d8e9ed");
  round(c,-12,-40,25,23,4,"#b2cbd6","#74b9ca");rect(c,-6,-35,12,9,"#ffc16e");
  round(c,-10,-57,23,18,5,"#d3e7ea");round(c,-2,-53,17,7,2,"#54e9f3");
  c.save();c.translate(0,-32);c.rotate(-s.aim*Math.PI/180);
  line(c,-8,-5,7,2,"#a8c4d5",8);round(c,6,-4,25,9,2,"#4e6c84");rect(c,27,-3,9,7,s.rapidFire>0?"#a5ffad":"#64e1f5");
  if(s.cooldown>.05&&!reduced){c.globalAlpha=.8;rect(c,37,-2,9,5,"#d5ffff");}
  c.restore();
  c.restore();
}
export function drawRunner(c:Ctx,s:RunnerState,l:RunnerLoadout,reduced:boolean) {
  const ratio=c.canvas.width/s.viewWidth;
  c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,s.viewWidth,540);
  const config=RUNNER_LEVELS[s.level-1],sky=c.createLinearGradient(0,0,0,G);
  sky.addColorStop(0,s.level===1?"#121c35":s.level===2?"#251b30":"#1c2145");sky.addColorStop(1,"#214052");c.fillStyle=sky;c.fillRect(0,0,s.viewWidth,540);
  circle(c,s.viewWidth-150-s.camera*.025,94,40,s.level===3?"#a69bc95a":"#ffbd8850");
  for(let i=0;i<40;i++)rect(c,(i*137+23)%s.viewWidth,(i*37+13)%170,2,2,"#d1dded60");
  for(let layer=0;layer<2;layer++) {
    const parallax=layer===0?.15:.35,step=layer===0?105:165;
    for(let i=-2;i<Math.ceil((s.camera*parallax+s.viewWidth)/step)+2;i++) {
      const x=i*step-s.camera*parallax,h=layer===0?85+(Math.abs(i)*57)%160:95+(Math.abs(i)*37)%90;
      rect(c,x,G-h-15,step-9,h+15,layer===0?"#15293f":"#1a3045");
      for(let row=0;row<Math.floor(h/25)-1;row++)for(let col=0;col<3;col++)if((i+row+col)%3!==0)
        rect(c,x+14+col*(step-30)/3,G-h+row*25,10,12,layer===0?"#476472":"#6e87875e");
      if(layer===1&&i%3===1) {
        round(c,x+18,G-h+14,step-45,31,3,"#102334",config.color);
        text(c,s.level===1?"COFFEE":s.level===2?"SERVICE":"FOR SALE",x+step/2-5,G-h+30,config.color,15);
      }
    }
  }
  c.save();c.translate(-s.camera,0);
  rect(c,s.camera,G,s.viewWidth,92,"#112030");rect(c,s.camera,G,s.viewWidth,5,"#90b4b4");
  for(let x=Math.floor(s.camera/64)*64;x<s.camera+s.viewWidth+64;x+=64) {
    rect(c,x,G+9,61,28,"#1c3242");rect(c,x+20,G+43,61,30,"#182d3d");rect(c,x+23,G+58,22,3,"#48677a");
  }
  for(const p of s.platforms) {
    if(p.x>s.camera+s.viewWidth||p.x+p.w<s.camera)continue;
    round(c,p.x,p.y,p.w,13,3,"#345165","#ffc16e");
    for(let x=p.x+10;x<p.x+p.w-10;x+=23)line(c,x,p.y+3,x-6,p.y+10,"#ffc16e",3);
    line(c,p.x+13,p.y+15,p.x+13,G,"#2f4655",5);line(c,p.x+p.w-13,p.y+15,p.x+p.w-13,G,"#2f4655",5);
    if(s.powerups.some(boost=>s.platforms[boost.platform]===p))text(c,"JUMP FOR BOOST",p.x+p.w/2,p.y+32,"#abffd5",14);
  }
  for(const e of s.enemies)if(e.x>s.camera-60&&e.x<s.camera+s.viewWidth+60) {
    c.save();c.translate(e.x,e.y);if(e.flash>0&&!reduced){c.shadowColor="#fff";c.shadowBlur=20;}
    if(e.kind==="coffee")coffee(c);else if(e.kind==="burger")burger(c);else if(e.kind==="utility")utility(c);
    else plane(c,Math.cos(e.tick*.85)>=0?1:-1);
    c.restore();
  }
  for(const p of s.powerups) {
    const y=p.y+(reduced?0:Math.sin(s.elapsed*4)*3);
    circle(c,p.x,y,17,"#102d35");c.strokeStyle="#8df7b8";c.lineWidth=2;c.beginPath();c.arc(p.x,y,17,0,Math.PI*2);c.stroke();
    line(c,p.x+4,y-10,p.x-5,y+1,"#abffc8",4);line(c,p.x-5,y+1,p.x+5,y+1,"#abffc8",4);line(c,p.x+5,y+1,p.x-3,y+10,"#abffc8",4);
  }
  if(s.boss.hp>0&&s.boss.x-s.boss.w<s.camera+s.viewWidth)boss(c,s,reduced);
  if(s.lives>0)runner(c,s,reduced);
  for(const b of s.shots) {
    if(!b.enemy){const angle=Math.atan2(b.vy,b.vx);line(c,b.x-Math.cos(angle)*8,b.y-Math.sin(angle)*8,b.x+Math.cos(angle)*8,b.y+Math.sin(angle)*8,"#a6ffff",4);continue;}
    c.save();c.translate(b.x,b.y);
    if(b.kind==="key"){circle(c,0,0,6,"#ffc16e");circle(c,0,0,3,"#1b3042");line(c,5,0,15,0,"#ffc16e",4);line(c,13,0,13,5,"#ffc16e",3);}
    else if(b.kind==="bolt"){circle(c,0,0,8,"#ff9aad");circle(c,0,0,3,"#1e3447");}
    else if(b.kind==="mortgage"){rect(c,-8,-6,16,12,"#b2a0ff");text(c,"$",0,0,"#241c44",12);}
    else if(b.kind==="adBomb"){
      line(c,-7,-26,0,-12,"#ffb895",3);line(c,7,-26,0,-12,"#ffb895",3);
      round(c,-16,-12,32,26,5,"#c24d78","#ffbac9");text(c,"AD",0,1,"#fff0dc",14);
    }
    else if(b.kind==="utility"){round(c,-7,-7,14,14,2,"#82efc1");text(c,"$",0,0,"#17333b",12);}
    else {circle(c,0,0,5,b.kind==="coffee"?"#ffa08d":"#ffd674");}
    c.restore();
  }
  if(!reduced)for(const p of s.particles){c.globalAlpha=Math.max(0,p.life/.4);rect(c,p.x-2,p.y-2,4,4,p.color);}
  c.globalAlpha=1;c.restore();
  // On-field status is secondary to the readable HTML HUD.
  round(c,18,18,225,36,4,"#0b192cd9");text(c,config.place,130,37,config.color,16);
  if(!s.boss.active) {text(c,"BOSS →",s.viewWidth-74,37,"#c5d5e6",15);}
}
