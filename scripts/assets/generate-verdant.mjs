import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Original procedural Verdant guardian. Coordinates: metres, +Y up, +Z front.
// Run with Node 22+. No images, external assets, or browser are required.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(v => { this.result = v; this.onload?.(); this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(v => { this.result = `data:${blob.type};base64,${Buffer.from(v).toString('base64')}`; this.onload?.(); this.onloadend?.(); }); }
};
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/models');
await fs.mkdir(OUT, { recursive: true });
let seed=420613;
function rand(){ seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
const rr=(a,b)=>a+(b-a)*rand();
const v=a=>new THREE.Vector3(...a);
const C=c=>new THREE.Color(c);
const root=new THREE.Group(); root.name='VerdantGuardian';
root.userData={title:'Verdant — the living guardian',orientation:'+Y up, +Z front',attributeGroups:{credit_canopy:'scale.y 0.92–1.12',equity_roots:'scale.x/z 0.90–1.18',cash_leaves:'uniform scale 0.72–1.16',reserve_trunk:'scale.x/z 0.93–1.10'},animation:'Pose the named joints using small local rotations; default pose is healthy at every attribute value.'};
const groups={};
function group(name,world,parent=root){let g=new THREE.Group();g.name=name;parent.add(g);let p=parent.userData.origin??[0,0,0];g.position.set(world[0]-p[0],world[1]-p[1],world[2]-p[2]);g.userData.origin=world;groups[name]=g;return g;}
const torso=group('torso',[0,1.86,0]);
const reserve=group('reserve_trunk',[0,2.25,0],torso);
const head=group('head',[0,3.25,0.035],torso);
const canopy=group('credit_canopy',[0,3.58,-0.15],head);
const cash=group('cash_leaves',[0,3.98,-0.16],canopy);
const roots=group('equity_roots',[0,0.08,0]);
const arms={}, forearms={}, legs={}, shins={};
for(const s of [-1,1]) { const n=s<0?'l':'r'; arms[n]=group('arm_'+n,[s*0.56,2.98,0],torso);forearms[n]=group('forearm_'+n,[s*1.00,2.37,0.015],arms[n]);legs[n]=group('leg_'+n,[s*0.29,1.87,0],torso);shins[n]=group('shin_'+n,[s*0.41,0.94,0.01],legs[n]); }
const materials={
 bark:new THREE.MeshStandardMaterial({name:'Living chestnut bark',color:0xffffff,vertexColors:true,roughness:0.94,metalness:0.02}),
 leaf:new THREE.MeshStandardMaterial({name:'Layered emerald leaves',color:0xffffff,vertexColors:true,roughness:0.59,metalness:0,side:THREE.DoubleSide}),
 moss:new THREE.MeshStandardMaterial({name:'Soft fresh moss',color:0xffffff,vertexColors:true,roughness:1}),
 dark:new THREE.MeshStandardMaterial({name:'Woodland crevices',color:0x211e14,roughness:1}),
 amber:new THREE.MeshStandardMaterial({name:'Amber heart light',color:0xffba31,emissive:0xff860d,emissiveIntensity:2.6,roughness:0.28,metalness:0.12}),
 gold:new THREE.MeshStandardMaterial({name:'Warm heartwood',color:0xffffff,vertexColors:true,roughness:0.75,metalness:0.05}),
 cyan:new THREE.MeshStandardMaterial({name:'Cyan living sap',color:0x52ffe2,emissive:0x08dab8,emissiveIntensity:1.7,roughness:0.28,metalness:0.08}),
};
const buckets=new Map();
function add(g,geom,mat='bark',color=0x756142){
 if(!geom.attributes.color){const a=geom.attributes.position,colors=new Float32Array(a.count*3),base=C(color);for(let i=0;i<a.count;i++){let k=.94+.10*Math.sin(a.getY(i)*8+a.getX(i)*9); colors.set([base.r*k,base.g*k,base.b*k],i*3);}geom.setAttribute('color',new THREE.BufferAttribute(colors,3));}
 const origin=g.userData.origin??[0,0,0];geom.translate(-origin[0],-origin[1],-origin[2]);
 const key=g.name+'|'+mat;if(!buckets.has(key))buckets.set(key,{g,mat,geoms:[]});buckets.get(key).geoms.push(geom);
}
function tube(g,points,radius,endRadius=radius*.55,opts={}){
 const curve=new THREE.CatmullRomCurve3(points.map(v));
 const seg=opts.seg??Math.max(8,points.length*5),sides=opts.sides??8;
 const frames=curve.computeFrenetFrames(seg,false),positions=[],colors=[],indices=[];
 const base=C(opts.color??0x756044);
 for(let i=0;i<=seg;i++){const t=i/seg,p=curve.getPointAt(t),r=(radius+(endRadius-radius)*t)*(1+(opts.organic??.12)*Math.sin(t*17+points[0][1]*9));
   for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,wr=1+.11*Math.cos(a*3+t*11)+.035*Math.cos(a*7-t*19),q=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r*wr).addScaledVector(frames.binormals[i],Math.sin(a)*r*wr);positions.push(q.x,q.y,q.z);
   const shade=.83+.17*Math.cos(a*3+t*5)+.10*Math.sin(t*23+a);colors.push(base.r*shade,base.g*shade,base.b*shade);
   if(i<seg){const n=i*sides+j,m=i*sides+(j+1)%sides;indices.push(n,m,n+sides,m,m+sides,n+sides);}
   }
 }
 // End caps stop visible root/branch ends from opening when posed.
 for(const end of [0,seg]){const p=curve.getPointAt(end/seg),ix=positions.length/3;positions.push(p.x,p.y,p.z);colors.push(base.r,base.g,base.b);for(let j=0;j<sides;j++){const a=end*sides+j,b=end*sides+(j+1)%sides; if(end===0)indices.push(ix,b,a);else indices.push(ix,a,b);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();add(g,geo,opts.mat??'bark');
}
function ellipsoid(g,pos,scale,color=0x736045,mat='bark',segments=14,rings=10){const geom=new THREE.SphereGeometry(1,segments,rings);geom.scale(...scale).translate(...pos);add(g,geom,mat,color);}
function leaf(g,pos,len,width,dir,roll,color){
 const p=[],idx=[],colors=[],base=C(color),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v(dir).normalize());
 const rz=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),roll);q.multiply(rz);
 const steps=5;
 for(let i=0;i<=steps;i++){const t=i/steps,w=Math.max(.006,Math.pow(Math.sin(t*Math.PI),.75))*width,curve=Math.sin(t*Math.PI)*len*.15+t*t*len*.10;
  for(let j=-1;j<=1;j++){const pt=new THREE.Vector3(w*j,len*t,curve+(j===0?.045*len*Math.sin(t*Math.PI):0));pt.applyQuaternion(q).add(v(pos));p.push(pt.x,pt.y,pt.z);let k=.78+t*.26+(j===0?.07:0);colors.push(base.r*k,base.g*k,base.b*k);}
  if(i<steps){let a=i*3;idx.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeVertexNormals();add(g,geo,'leaf');
}
function foliage(g,center,radii,count,scale=1){
 const palette=[0x155b33,0x1e713a,0x297f3d,0x358f42,0x459b44,0x62ad4a,0x85b854,0x287b49];
 for(let i=0;i<count;i++){const phi=i*2.39996323+rand()*.4,z=rr(-.90,1),r=Math.sqrt(1-z*z),a=[Math.cos(phi)*r,z,Math.sin(phi)*r],depth=rr(.48,1),p=[center[0]+a[0]*radii[0]*depth,center[1]+a[1]*radii[1]*depth,center[2]+a[2]*radii[2]*depth];
 const dir=[a[0]*.85+rr(-.18,.18),.35+a[1]*.65,a[2]*.85+rr(-.12,.12)];const col=palette[Math.floor(rand()*palette.length)];leaf(g,p,rr(.13,.23)*scale,rr(.035,.056)*scale,dir,rr(-3.14,3.14),col); }
}
function braided(g,start,end,radius,strands=4,phase=0){
 const st=v(start),en=v(end),axis=en.clone().sub(st),up=axis.clone().normalize(),side=new THREE.Vector3(0,0,1).cross(up).normalize(),front=up.clone().cross(side).normalize();
 for(let k=0;k<strands;k++){const pts=[];for(let i=0;i<=7;i++){const t=i/7,a=k/strands*Math.PI*2+t*3.4+phase,spread=radius*.72*Math.sin(Math.PI*(.11+t*.75));let p=st.clone().lerp(en,t).addScaledVector(side,Math.cos(a)*spread).addScaledVector(front,Math.sin(a)*spread);pts.push(p.toArray());}
 tube(g,pts,radius*.54,radius*.40,{seg:25,sides:9,color:[0x756244,0x8c7651,0x675a41,0x99805a][k%4]});
 // A small parallel crest catches light like the raised grain of mature bark.
 const crest=pts.map((p,i)=>[p[0]+side.x*radius*.29,p[1]+side.y*radius*.29,p[2]+radius*.33]);tube(g,crest,radius*.10,radius*.025,{seg:20,sides:5,color:0xad9062});
 }
}

// Interwoven trunk, with a framed heart opening rather than a smooth torso shell.
ellipsoid(reserve,[0,2.18,-.055],[.30,.61,.245],0x65583a);
for(let k=0;k<8;k++){const a=k*Math.PI/4,pts=[];for(let i=0;i<=8;i++){const t=i/8,ang=a+t*2.9,waist=.22+.15*t;pts.push([Math.cos(ang)*waist,1.66+t*1.36,Math.sin(ang)*(.22+.065*t)-.035]);}tube(reserve,pts,.11,.095,{seg:30,sides:9,color:[0x746041,0x937952,0x66583d,0x846c49][k%4]});}
// Pelvis split and shoulder collar roots.
for(const s of [-1,1]){
 tube(torso,[[s*.09,1.77,.10],[s*.25,1.90,.17],[s*.38,2.11,.12]],.17,.125,{color:0x776340});
 tube(torso,[[0,2.46,.21],[s*.31,2.63,.29],[s*.57,2.93,.03],[s*.70,3.03,-.04]],.11,.13,{seg:24,color:0x9b7d51});
 tube(torso,[[0,2.31,.245],[s*.28,2.67,.33],[s*.20,2.94,.305],[0,3.04,.26]],.055,.033,{color:0xb99a63});
 tube(torso,[[s*.05,2.35,.285],[s*.31,2.63,.365],[s*.23,2.92,.315],[s*.05,3.03,.24]],.021,.013,{mat:'gold',color:0xd0ac62,sides:6});
 tube(torso,[[s*.12,1.96,.225],[s*.17,2.20,.25],[s*.12,2.36,.245]],.008,.005,{mat:'cyan',sides:5});
}
// Amber living seed enclosed by the wood filigree.
ellipsoid(torso,[0,2.72,.285],[.125,.20,.07],0xffffff,'amber',16,14);
ellipsoid(torso,[0,2.76,.348],[.046,.079,.020],0xffffff,'amber',10,8);
for(let i=0;i<7;i++){let a=i/7*Math.PI*2;tube(torso,[[Math.sin(a)*.027,2.75+Math.cos(a)*.05,.36],[Math.sin(a)*.10,2.75+Math.cos(a)*.15,.34]],.008,.003,{mat:'gold',color:0xe4ba6d,sides:5,seg:6});}
foliage(torso,[0,2.36,.27],[.19,.10,.04],28,.65);

// Long, strong root legs; both feet rest on y=0 through spreading roots.
for(const s of [-1,1]){const n=s<0?'l':'r',leg=legs[n],shin=shins[n];
 braided(leg,[s*.29,1.88,0],[s*.41,.95,.015],.215,4,s*.4);
 braided(shin,[s*.41,.98,.015],[s*.46,.22,.08],.18,4,s*.65);
 ellipsoid(shin,[s*.41,.96,.15],[.15,.145,.07],0x9b8456);
 tube(shin,[[s*.44,.77,.20],[s*.46,.60,.18],[s*.42,.44,.20]],.010,.006,{mat:'cyan',sides:5});
 for(let i=0;i<5;i++){const dx=(i-2)*.108,spread=s*.46+dx,zz=.40+(.1-Math.abs(dx))*.45;tube(shin,[[s*.46,.29,.05],[spread,.10,.22],[spread+dx*.7,.037,zz],[spread+dx*.9,.022,zz+.12]],.074,.018,{seg:15,sides:7,color:0x89714b});}
 // Extensible grounding roots remain attached at their inner ends.
 for(let i=0;i<5;i++){const a=rr(-1.4,1.4)+(s<0?Math.PI:0),st=[s*.45,.15,.02],end=[s*.46+Math.cos(a)*rr(.30,.53),.025,Math.sin(a)*rr(.32,.49)];tube(roots,[st,[st[0]+Math.cos(a)*.20,.083,st[2]+Math.sin(a)*.17],end],.059,.012,{seg:14,sides:7,color:0x766043});}
 foliage(leg,[s*.30,1.65,.16],[.16,.15,.10],23,.63);
 foliage(shin,[s*.43,.94,.12],[.19,.07,.14],31,.65);
 foliage(shin,[s*.46,.20,.09],[.21,.075,.20],24,.58);
}

// Open and relaxed branch arms with clearly articulated wrists and fingers.
for(const s of [-1,1]){const n=s<0?'l':'r',arm=arms[n],fore=forearms[n];
 braided(arm,[s*.57,2.98,-.015],[s*1.00,2.37,.015],.205,4,s*.3);
 braided(fore,[s*1.0,2.38,.015],[s*1.14,1.85,.15],.17,4,s*.8);
 ellipsoid(fore,[s*1.145,1.72,.17],[.13,.20,.095],0x7d6947);
 for(let f=0;f<4;f++){let x=s*(1.03+f*.076),len=.22+Math.sin(f/3*Math.PI)*.055;tube(fore,[[x,1.73,.20],[x+s*.015,1.56,.25],[x-s*.009,1.73-len,.305],[x-s*.035,1.56,.32]],.034,.014,{seg:12,sides:7,color:f%2?0x9c8257:0x7a6542});}
 tube(fore,[[s*1.07,1.85,.21],[s*.94,1.73,.28],[s*.96,1.64,.32]],.044,.019,{seg:14,color:0x91774c});
 tube(fore,[[s*1.05,2.29,.18],[s*1.11,2.13,.19],[s*1.10,1.98,.245]],.009,.004,{mat:'cyan',sides:5});
 // Upturned twigs give the forearms a living silhouette.
 tube(fore,[[s*1.10,2.14,-.04],[s*1.34,2.33,-.07],[s*1.40,2.57,-.065]],.050,.007,{seg:16,color:0x8e734a});
 tube(fore,[[s*1.32,2.33,-.07],[s*1.46,2.40,-.07]],.018,.003,{seg:7,color:0x9b8052});
 leaf(fore,[s*1.40,2.54,-.065],.13,.035,[s*.1,1,0],s,0x4ac996);
 ellipsoid(fore,[s*1.403,2.577,-.055],[.023,.04,.019],0xffffff,'cyan',8,6);
 foliage(arm,[s*.68,2.96,.025],[.25,.15,.24],62,.87);
 foliage(fore,[s*1.10,2.29,-.06],[.14,.12,.16],30,.7);
}

// Ancient, gentle face carved out of a small continuous piece of living wood.
tube(head,[[0,3.00,-.02],[0,3.23,0],[0,3.40,.015]],.18,.19,{seg:16,sides:12,color:0x81704c});
ellipsoid(head,[0,3.48,.01],[.232,.337,.198],0x8d7851,'bark',20,18);
// Cheek and brow grain frames the eyes without a human skin-like mask.
for(const s of [-1,1]){
 tube(head,[[s*.035,3.59,.182],[s*.106,3.62,.187],[s*.184,3.58,.139]],.040,.021,{seg:12,sides:8,color:0xb09a67});
 ellipsoid(head,[s*.099,3.557,.179],[.075,.038,.020],0xffffff,'dark',14,8);
 ellipsoid(head,[s*.099,3.559,.199],[.044,.017,.010],0xffffff,'amber',12,8);
 tube(head,[[s*.175,3.53,.13],[s*.151,3.43,.17],[s*.065,3.365,.20]],.039,.018,{seg:14,sides:7,color:0xb49a66});
 tube(head,[[s*.187,3.55,.068],[s*.222,3.66,-.015],[s*.196,3.84,-.058]],.050,.012,{seg:14,color:0x877247});
 tube(head,[[s*.18,3.40,.13],[s*.12,3.28,.12],[s*.025,3.17,.08]],.035,.006,{seg:12,sides:6,color:0x9d8455});
}
// Tapered nose bridge, quiet mouth, and root beard.
tube(head,[[0,3.60,.193],[0,3.49,.246],[0,3.445,.252]],.028,.039,{seg:10,sides:7,color:0xb09a6b});
tube(head,[[-.089,3.377,.19],[0,3.36,.22],[.088,3.38,.19]],.012,.009,{seg:13,sides:6,color:0x443f2b});
tube(head,[[-.07,3.348,.192],[0,3.329,.21],[.072,3.35,.19]],.018,.012,{seg:12,sides:6,color:0xa68e5e});
for(let i=-2;i<=2;i++)tube(head,[[i*.045,3.35,.16],[i*.038,3.21,.13],[i*.020,3.10+Math.abs(i)*.025,.10]],.022,.004,{seg:12,sides:6,color:i%2?0x9c875a:0x746343});
// Bark grain up the forehead converges into graceful crown branches.
for(let i=-2;i<=2;i++)tube(head,[[i*.042,3.60,.172],[i*.075,3.73,.118],[i*.105,3.86,.025]],.018,.007,{seg:11,sides:5,color:i%2?0xb6a273:0x74633f});
foliage(head,[-.20,3.42,-.015],[.04,.11,.10],15,.55);
foliage(head,[.20,3.40,-.015],[.04,.10,.10],15,.55);

// Main crown: sweeping branches, leaf spray clusters, and open areas around face.
const tips=[];
for(const s of [-1,1]){
 const branches=[
  [[s*.12,3.69,-.09],[s*.26,4.00,-.11],[s*.36,4.35,-.11],[s*.56,4.55,-.14]],
  [[s*.17,3.74,-.11],[s*.50,3.93,-.13],[s*.81,4.11,-.16],[s*1.12,4.14,-.16]],
  [[s*.28,3.83,-.21],[s*.68,3.84,-.24],[s*1.03,3.80,-.27],[s*1.35,3.99,-.26]],
  [[s*.24,3.89,-.23],[s*.40,4.17,-.29],[s*.75,4.40,-.32],[s*.94,4.50,-.34]],
  [[s*.30,3.96,-.26],[s*.52,4.16,-.43],[s*.89,4.24,-.50],[s*1.23,4.30,-.42]],
  [[s*.10,3.85,-.21],[s*.06,4.16,-.36],[s*.17,4.39,-.43],[s*.10,4.61,-.40]],
 ];
 branches.forEach((pts,b)=>{tube(canopy,pts,.095-b*.009,.013,{seg:22,sides:8,color:[0x91774d,0xa88b59,0x75603e][b%3]});
  for(let j=1;j<4;j++){const p=pts[j],tip=[p[0]+s*rr(.08,.21),p[1]+rr(.10,.19),p[2]+rr(-.13,.14)];tube(canopy,[p,[p[0]+s*.065,p[1]+.08,p[2]],tip],.025,.005,{seg:9,sides:6,color:0x927a4f});tips.push(tip);}
 });
}
// Central foliage behind the face bridges the crown but never masks expression.
tips.push([0,4.35,-.44],[0,4.59,-.27],[-.40,4.55,-.31],[.39,4.55,-.31]);
tips.forEach((p,i)=>{
 foliage(canopy,p,[rr(.20,.28),rr(.10,.16),rr(.18,.25)],36,.92);
 if(i%3===0)foliage(cash,[p[0],p[1]-.06,p[2]+.075],[.22,.12,.20],23,.94);
});
// Hanging necklaces of leaves make the crown organically layered.
for(const s of [-1,1]){for(let j=0;j<5;j++){let x=s*(.5+j*.15),yy=4.02-j*.025;const pp=[[x,yy,-.12],[x+s*.04,yy-.19,-.08],[x+s*.02,yy-.35,-.07]];tube(canopy,pp,.013,.003,{seg:10,sides:5,color:0x657544});for(let i=0;i<5;i++){let t=i/5;leaf(canopy,[x+s*.04*t,yy-.29*t,-.08],.15,.042,[s*.35,-.6,.22],j*.9,0x4d9845);}}}
// A few tiny cyan sap seeds in the crown, restrained so amber heart stays focal.
for(const p of [[-.74,4.1,.01],[.72,4.22,-.02],[-.34,4.52,-.20],[1.16,4.08,-.03]])ellipsoid(canopy,p,[.018,.039,.018],0xffffff,'cyan',8,6);

// Add small irregular moss pads in bark recesses: no texture maps required.
for(let i=0;i<23;i++){const y=rr(1.95,2.58),a=rr(-1.0,1.0);ellipsoid(reserve,[Math.sin(a)*.255,y,Math.cos(a)*.235-.025],[rr(.025,.054),rr(.031,.080),.018],i%2?0x527044:0x3c6635,'moss',7,5);}

// Merge by joint and material to retain articulation while minimizing draw calls.
function merge(geoms){let pc=0,ic=0;for(const g of geoms){pc+=g.attributes.position.count;ic+=g.index?.count??g.attributes.position.count;}const pos=new Float32Array(pc*3),nor=new Float32Array(pc*3),col=new Float32Array(pc*3),index=new Uint32Array(ic);let vo=0,io=0;for(const g of geoms){pos.set(g.attributes.position.array,vo*3);nor.set(g.attributes.normal.array,vo*3);col.set(g.attributes.color.array,vo*3);const ix=g.index?.array??Array.from({length:g.attributes.position.count},(_,i)=>i);for(const n of ix)index[io++]=n+vo;vo+=g.attributes.position.count;}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(new THREE.BufferAttribute(index,1));g.computeBoundingBox();return g;}
let triangles=0,vertices=0;
for(const {g,mat,geoms} of buckets.values()){const geom=merge(geoms),mesh=new THREE.Mesh(geom,materials[mat]);mesh.name=g.name+'_'+mat;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);triangles+=geom.index.count/3;vertices+=geom.attributes.position.count;}
root.updateMatrixWorld(true);
const before=new THREE.Box3().setFromObject(root);
// Keep exact root-floor contact and a complete 4.8 metre default silhouette.
const scale=4.8/(before.max.y-before.min.y);
for(const g of Object.values(groups))g.position.multiplyScalar(scale);
root.traverse(obj=>{if(obj.isMesh)obj.geometry.scale(scale,scale,scale);});
for(const child of root.children)child.position.y-=before.min.y*scale;
root.updateMatrixWorld(true);
const bounds=new THREE.Box3().setFromObject(root);
let invalidNormals=0,invalidPositions=0,minimumNormal=1;
root.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;for(let i=0;i<p.count;i++){if(!Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)))invalidPositions++;const mag=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));if(!Number.isFinite(mag)||mag<.5)invalidNormals++;minimumNormal=Math.min(minimumNormal,mag);}}});
if(invalidPositions||invalidNormals)throw new Error(`Invalid geometry: ${invalidPositions} positions, ${invalidNormals} normals`);
if(triangles>120000||buckets.size>=150)throw new Error('Geometry budget exceeded');
const exporter=new GLTFExporter();
const glb=await exporter.parseAsync(root,{binary:true,onlyVisible:true,truncateDrawRange:true});
await fs.mkdir(OUT,{recursive:true});await fs.writeFile(path.join(OUT,'verdant.glb'),Buffer.from(glb));
const report={file:path.join(OUT,'verdant.glb'),bytes:glb.byteLength,triangles,vertices,drawCalls:buckets.size,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:bounds.getSize(new THREE.Vector3()).toArray()},invalidNormals,invalidPositions,minimumNormal,groups:Object.fromEntries(Object.entries(groups).map(([n,g])=>[n,{parent:g.parent.name,pivot:g.position.toArray()}]))};
await fs.writeFile(path.join(OUT,'verdant-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
