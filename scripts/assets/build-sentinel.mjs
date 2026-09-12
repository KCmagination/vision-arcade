import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Original hard-surface character, authored in metres, +Y up and facing +Z.
// Every moving assembly has a local joint pivot. Static parts are consolidated
// within each assembly after authoring, retaining PBR material separation.
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
  async readAsDataURL(blob) { this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.(); }
};
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/models');
await fs.mkdir(outDir, { recursive: true });
const PI = Math.PI;
const V = (x,y,z) => new THREE.Vector3(x,y,z);
const scene = new THREE.Scene();
const root = new THREE.Group(); root.name = 'sentinel'; scene.add(root);
root.userData = { title:'Sentinel / Crownwing chassis', author:'Original procedural asset', forward:'+Z', units:'metres', attributeVersion:3, design:'Original athletic graphite and gold crownwing energy knight' };
const mats = {
  silver: new THREE.MeshStandardMaterial({name:'Silver ceramic blade tips',color:0xdfebef,metalness:.50,roughness:.31}),
  blade: new THREE.MeshStandardMaterial({name:'cash_core energy blade',color:0xc6ffff,emissive:0x54f7ff,emissiveIntensity:4.0,metalness:.1,roughness:.17}),
  ivory: new THREE.MeshStandardMaterial({name:'Graphite armored ceramic',color:0x252735,metalness:.56,roughness:.38}),
  white: new THREE.MeshStandardMaterial({name:'Raised graphite facets',color:0x454b5e,metalness:.62,roughness:.32}),
  steel: new THREE.MeshStandardMaterial({name:'Pale gunmetal joints',color:0x8993aa,metalness:.75,roughness:.32}),
  dark: new THREE.MeshStandardMaterial({name:'Near black mechanisms',color:0x0e1623,metalness:.62,roughness:.38}),
  rubber: new THREE.MeshStandardMaterial({name:'Joint bellows',color:0x101719,metalness:.12,roughness:.59}),
  gold: new THREE.MeshStandardMaterial({name:'Warm gold armor edges',color:0xe3b95c,metalness:.70,roughness:.28}),
  cyan: new THREE.MeshStandardMaterial({name:'Cyan circuit light',color:0x78f7ff,emissive:0x25eaff,emissiveIntensity:2.2,metalness:.35,roughness:.2}),
  amber: new THREE.MeshStandardMaterial({name:'Amber cell plasma',color:0xffb444,emissive:0xff930d,emissiveIntensity:2.6,metalness:.35,roughness:.23}),
  violet: new THREE.MeshStandardMaterial({name:'Violet aerial beacon',color:0x9c60ff,emissive:0xc071ff,emissiveIntensity:3.2,metalness:.2,roughness:.18}),
  green: new THREE.MeshStandardMaterial({name:'Reserve cyan edge',color:0x88fbff,emissive:0x30f3ff,emissiveIntensity:2.8,metalness:.2,roughness:.17}),
  shield: new THREE.MeshPhysicalMaterial({name:'Cyan force field',color:0x62f3ff,emissive:0x16c9ec,emissiveIntensity:.50,metalness:.15,roughness:.13,transparent:true,opacity:.19,side:THREE.DoubleSide,depthWrite:false}),
  amberGlass: new THREE.MeshPhysicalMaterial({name:'Amber battery glass',color:0xe99c34,metalness:.2,roughness:.15,transparent:true,opacity:.38,side:THREE.DoubleSide}),
};

function group(parent,name,position=[0,0,0]) { const o=new THREE.Group();o.name=name;o.position.set(...position);parent.add(o);return o; }
function mesh(parent,geometry,material,position=[0,0,0],rotation=[0,0,0],name='') {
  const m=new THREE.Mesh(geometry,typeof material==='string'?mats[material]:material);
  m.position.set(...position);m.rotation.set(...rotation);m.name=name;
  m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function plate(parent,points,depth,material,position=[0,0,0],rotation=[0,0,0],bevel=.018,name='') {
  const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1,curveSegments:8});
  g.translate(0,0,-depth/2);return mesh(parent,g,material,position,rotation,name);
}
function cyl(parent,radiusTop,radiusBottom,height,material,pos=[0,0,0],rot=[0,0,0],segments=20,name='') {
  return mesh(parent,new THREE.CylinderGeometry(radiusTop,radiusBottom,height,segments,1),material,pos,rot,name);
}
function sphere(parent,r,material,pos,scale=[1,1,1]) {const m=mesh(parent,new THREE.SphereGeometry(r,20,12),material,pos);m.scale.set(...scale);return m;}
function ring(parent,r,t,material,pos,rot=[0,0,0],arc=2*PI) {return mesh(parent,new THREE.TorusGeometry(r,t,6,32,arc),material,pos,rot);}
function rod(parent,a,b,r,material,r2=r,segments=10) {
  const start=V(...a),end=V(...b),delta=end.clone().sub(start);
  const m=cyl(parent,r2,r,delta.length(),material,start.clone().add(end).multiplyScalar(.5).toArray(),[0,0,0],segments);
  m.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return m;
}
function cable(parent,pts,r,material) {return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>V(...p))),12,r,6,false),material);}
function line(parent,pts,r,material) {for(let i=1;i<pts.length;i++)rod(parent,pts[i-1],pts[i],r,material);}

// Longitudinal shells with a beveled octagonal cross section and organically
// tapered successive rings: silhouette is sculpted in all three dimensions.
function shell(parent,rows,material,pos=[0,0,0],rot=[0,0,0],name='') {
  const profile=[[-.64,1],[.64,1],[1,.56],[1,-.48],[.58,-1],[-.58,-1],[-1,-.48],[-1,.56]];
  const verts=[],indices=[];
  for(const row of rows) for(const [x,z] of profile)verts.push(x*row[1],row[0],z*row[2]+(row[3]||0));
  for(let j=0;j<rows.length-1;j++)for(let i=0;i<8;i++){const a=j*8+i,b=j*8+(i+1)%8,c=(j+1)*8+(i+1)%8,d=(j+1)*8+i;indices.push(a,b,d,b,c,d);}
  const n=rows.length;for(let i=1;i<7;i++){indices.push(0,i+1,i);indices.push((n-1)*8,(n-1)*8+i,(n-1)*8+i+1);}
  if(rows[rows.length-1][0]<rows[0][0])for(let i=0;i<indices.length;i+=3){const t=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=t;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();
  return mesh(parent,g,material,pos,rot,name);
}
function mirror(points,s){return points.map(([x,y])=>[x*s,y]);}
function screw(parent,x,y,z,r=.024){cyl(parent,r,r,.016,'gold',[x,y,z],[PI/2,0,0],12);rod(parent,[x-r*.5,y,z+.010],[x+r*.5,y,z+.010],r*.09,'dark');}
function transverseJoint(parent,pos,r=.16,width=.40){
  cyl(parent,r,r,width,'rubber',pos,[0,0,PI/2],24);
  for(const s of [-1,1]){
    const x=pos[0]+s*(width/2+.006);
    cyl(parent,r*.92,r*.92,.035,'steel',[x,pos[1],pos[2]],[0,0,PI/2],24);
    cyl(parent,r*.64,r*.64,.042,'dark',[x+s*.02,pos[1],pos[2]],[0,0,PI/2],20);
    ring(parent,r*.71,.010,'gold',[x+s*.043,pos[1],pos[2]],[0,PI/2,0]);
  }
}

const pelvis=group(root,'pelvis',[0,2.25,0]);
shell(pelvis,[[.22,.31,.22],[.1,.46,.28],[-.14,.40,.25],[-.34,.20,.19]],'dark');
plate(pelvis,[[-.34,.17],[-.22,.27],[0,.16],[.22,.27],[.34,.17],[.26,-.08],[0,-.38],[-.26,-.08]],.12,'ivory',[0,0,.26], [0,0,0],.035);
plate(pelvis,[[-.18,.11],[0,.06],[.18,.11],[.11,-.13],[0,-.23],[-.11,-.13]],.03,'steel',[0,0,.34]);
plate(pelvis,[[-.095,.15],[.095,.15],[.07,.10],[-.07,.10]],.02,'amber',[0,0,.35], [0,0,0],.006);
for(const s of [-1,1]) {
  plate(pelvis,mirror([[.32,.13],[.56,.27],[.70,.07],[.67,-.22],[.47,-.42],[.38,-.12]],s),.14,'ivory',[0,0,.05],[0,s*.19,0],.034);
  plate(pelvis,mirror([[.49,.10],[.56,.15],[.60,.04],[.56,-.12],[.51,-.08]],s),.027,'steel',[0,0,.16]);
  sphere(pelvis,.22,'dark',[s*.42,-.02,0],[1,.94,1]);
}

const torso=group(pelvis,'torso',[0,.18,0]);
// Narrow segmented spinal core and floating abdominal lamellae.
cyl(torso,.22,.21,.66,'rubber',[0,.22,0], [0,0,0],16);
for(let i=0;i<4;i++){
  shell(torso,[[.08+i*.105,.23+i*.020,.215],[.145+i*.105,.26+i*.023,.25]],'steel');
  plate(torso,[[-.22-i*.021,.10+i*.10],[-.13-i*.013,.17+i*.10],[.13+i*.013,.17+i*.10],[.22+i*.021,.10+i*.10],[.13+i*.013,.06+i*.10],[-.13-i*.013,.06+i*.10]],.05,'silver',[0,0,.245+i*.004],[0,0,0],.013);
}
shell(torso,[[.43,.32,.25],[.63,.49,.31],[1.07,.65,.33],[1.26,.61,.28],[1.31,.32,.24]],'dark');
// Rear armor and four spine conduits ensure the character works in orbit view.
shell(torso,[[.63,.39,.12],[1.06,.52,.14],[1.28,.35,.10]],'ivory',[0,0,-.29]);
plate(torso,[[-.21,1.24],[.21,1.24],[.28,1.04],[.18,.73],[0,.62],[-.18,.73],[-.28,1.04]],.04,'steel',[0,0,-.435]);
for(const s of [-1,1]){
  for(let k=0;k<3;k++)rod(torso,[s*(.20+k*.065),.68,-.405],[s*(.30+k*.065),1.10,-.405],.016,'dark');
  shell(torso,[[.80,.15,.10],[1.15,.18,.12],[1.27,.10,.08]],'dark',[s*.39,0,-.36]);
  for(let k=0;k<4;k++)plate(torso,[[-.085,0],[.085,0],[.07,.018],[-.07,.018]],.02,'steel',[s*.39,.86+k*.075,-.49]);
  cable(torso,[[s*.44,.47,.05],[s*.56,.61,.17],[s*.48,.82,.27]],.023,'steel');
  cable(torso,[[s*.36,.38,-.11],[s*.49,.68,-.07],[s*.57,.91,-.15]],.031,'rubber');
}
// Paired angular chest panels, warm gold collar and a visible amber abdominal cell.
function insetPoly(points,k=.84) {
  const cx=points.reduce((s,p)=>s+p[0],0)/points.length,cy=points.reduce((s,p)=>s+p[1],0)/points.length;
  return points.map(([x,y])=>[cx+(x-cx)*k,cy+(y-cy)*k]);
}
for(const s of [-1,1]){
  const chest=mirror([[.07,1.10],[.49,1.22],[.61,.77],[.17,.64]],s);
  plate(torso,chest,.12,'gold',[0,0,.327],[0,s*.1,0],.018);
  plate(torso,insetPoly(chest,.87),.14,'ivory',[0,0,.351],[0,s*.1,0],.02);
  const panel=mirror([[.155,.99],[.422,1.06],[.479,.832],[.205,.737]],s);
  plate(torso,panel,.025,'gold',[0,0,.450],[0,s*.1,0],.008);
  plate(torso,insetPoly(panel,.88),.028,'dark',[0,0,.471],[0,s*.1,0],.006);
  const trace=mirror([[.191,.956],[.397,1.004],[.435,.859],[.229,.787],[.191,.956]],s).map(([x,y])=>[x,y,.499]);
  line(torso,trace,.009,'cyan');
  plate(torso,mirror([[.22,.935],[.366,.911],[.403,.865],[.25,.892]],s),.013,'cyan',[0,0,.513],[0,0,0],.003);
  plate(torso,mirror([[.45,1.24],[.59,1.32],[.77,1.15],[.69,1.065],[.56,1.16]],s),.15,'ivory',[0,0,.22],[0,s*.17,0],.027);
  line(torso,[[s*.46,1.255,.326],[s*.585,1.305,.326],[s*.71,1.18,.33]],.022,'gold');
  plate(torso,mirror([[.35,.66],[.53,.74],[.55,.64],[.41,.52],[.33,.53]],s),.10,'gold',[0,0,.29],[0,s*.1,0],.012);
  screw(torso,s*.527,1.145,.394,.021);
}
plate(torso,[[-.49,1.37],[-.35,1.20],[0,1.12],[.35,1.20],[.49,1.37],[.34,1.405],[.245,1.31],[0,1.265],[-.245,1.31],[-.34,1.405]],.11,'gold',[0,0,.27],[0,0,0],.026);
line(torso,[[-.42,1.35,.345],[-.30,1.245,.35],[0,1.184,.35],[.30,1.245,.35],[.42,1.35,.345]],.015,'silver');
plate(torso,[[-.22,.53],[-.14,.40],[.14,.40],[.22,.53],[.15,.58],[-.15,.58]],.09,'gold',[0,0,.32],[0,0,0],.019);
const battery=group(torso,'equity_battery',[0,.40,.38]);
battery.userData={attribute:'equity',scaleAxis:'y',mountDescription:'installed abdominal power cell',recommendedRange:[.65,1.12]};
cyl(battery,.10,.10,.26,'amberGlass',[0,.145,0]);
cyl(battery,.058,.058,.23,'amber',[0,.145,.022],[0,0,0],16,'equity_core');
for(const y of [.025,.265])cyl(battery,.115,.115,.043,'steel',[0,y,0]);
for(const s of [-1,1])rod(battery,[s*.091,.05,.075],[s*.091,.24,.075],.012,'gold');
for(let i=0;i<3;i++)ring(battery,.07,.007,'amber',[0,.075+i*.07,.015],[PI/2,0,0]);

// A sharp crown helmet with separate narrow cyan eyes and a silver face mask.
cyl(torso,.13,.16,.24,'rubber',[0,1.32,0]);
for(let y=1.24;y<1.45;y+=.055)ring(torso,.142,.010,'steel',[0,y,0],[PI/2,0,0]);
const head=group(torso,'head',[0,1.38,0]);
shell(head,[[.02,.13,.15],[.15,.225,.235],[.38,.258,.245],[.54,.211,.217],[.67,.10,.14]],'ivory');
plate(head,[[-.23,.43],[-.14,.48],[0,.42],[.14,.48],[.23,.43],[.215,.18],[.11,.055],[0,.018],[-.11,.055],[-.215,.18]],.054,'dark',[0,0,.237],[0,0,0],.010);
for(const s of [-1,1]){
  plate(head,mirror([[.027,.404],[.215,.438],[.189,.359],[.051,.341]],s),.022,'cyan',[0,0,.290],[0,0,0],.005, s===1?'accent_visor':'accent_eye_r');
  plate(head,mirror([[.007,.447],[.10,.495],[.243,.475],[.246,.435],[.182,.428],[.028,.393]],s),.060,'ivory',[0,0,.280],[0,s*.06,0],.01);
  plate(head,mirror([[.039,.306],[.151,.330],[.183,.248],[.105,.081],[.026,.040]],s),.072,'silver',[0,0,.268],[0,s*.13,0],.012);
  plate(head,mirror([[.205,.395],[.263,.354],[.234,.151],[.137,.069],[.12,.121],[.185,.247]],s),.087,'ivory',[0,0,.213],[0,s*.23,0],.011);
  rod(head,[s*.199,.323,.293],[s*.177,.172,.306],.010,'gold');
  shell(head,[[.12,.044,.079],[.36,.065,.092],[.49,.043,.062]],'steel',[s*.252,0,-.019]);
  cyl(head,.080,.080,.055,'dark',[s*.275,.28,-.020],[0,0,PI/2],16);
  cyl(head,.054,.054,.059,'gold',[s*.284,.28,-.020],[0,0,PI/2],16);
}
plate(head,[[-.037,.317],[0,.366],[.037,.317],[.029,.072],[0,.040],[-.029,.072]],.075,'ivory',[0,0,.301],[0,0,0],.006);
plate(head,[[-.038,.488],[-.048,.598],[0,.687],[.048,.598],[.038,.488],[0,.445]],.035,'gold',[0,0,.204],[0,0,0],.006);
plate(head,[[-.014,.51],[-.019,.595],[0,.639],[.019,.595],[.014,.51],[0,.484]],.016,'silver',[0,0,.23],[0,0,0],.003);
const antenna=group(head,'credit_antenna',[0,.51,-.075]);
antenna.userData={attribute:'credit',scaleAxis:'y',mountDescription:'gold helmet crown',recommendedRange:[.65,1.25]};
for(const s of [-1,1]){
  plate(antenna,mirror([[.191,-.145],[.258,-.082],[.289,.537],[.260,.469],[.227,.051]],s),.036,'dark',[0,0,0],[0,0,0],.005);
  plate(antenna,mirror([[.246,-.033],[.261,.405],[.287,.556],[.284,.10],[.271,-.062]],s),.021,'gold',[0,0,.025],[0,0,0],.003);
  rod(antenna,[s*.231,-.086,.05],[s*.24,.118,.05],.008,'cyan');
}
shell(antenna,[[.10,.028,.026],[.16,.035,.025],[.33,.015,.012]],'gold',[0,0,-.09]);

// Three segmented shoulder blades sweep outward and up on each side.
for(const s of [-1,1]){
  const wing=group(torso,`shoulder_wing_${s===1?'l':'r'}`,[s*.84,1.16,-.20]);
  wing.rotation.y=s*.12;
  const fins=[
    [[-.12,-.05],[.10,.34],[.60,.70],[1.08,1.31],[.94,.85],[.46,.30],[.10,-.04]],
    [[.04,-.17],[.15,.095],[.63,.43],[.94,.84],[.85,.45],[.54,.09],[.19,-.17]],
    [[.08,-.31],[.20,-.11],[.52,.055],[.78,.40],[.72,.12],[.43,-.22],[.16,-.34]]
  ];
  fins.forEach((poly,i)=>{
    const z=-i*.035;
    plate(wing,mirror(poly,s),.075,'dark',[0,0,z],[0,0,0],.012);
    plate(wing,mirror(insetPoly(poly,.88),s),.065,i===0?'gold':'silver',[0,0,z+.055],[0,0,0],.009);
  });
  plate(wing,mirror([[.50,.665],[.67,.819],[1.08,1.31],[.954,.947],[.738,.723]],s),.073,'silver',[0,0,.065],[0,0,0],.004);
  plate(wing,mirror([[.17,.291],[.365,.431],[.542,.492],[.624,.685],[.417,.481]],s),.026,'ivory',[0,0,.112],[0,0,0],.006);
  plate(wing,mirror([[.187,.068],[.439,.192],[.763,.582],[.579,.228],[.300,.023]],s),.025,'cyan',[0,0,.081],[0,0,0],.004);
  plate(wing,mirror([[.190,-.199],[.399,-.107],[.617,.146],[.481,-.091],[.287,-.226]],s),.018,'cyan',[0,0,.044],[0,0,0],.004);
  line(wing,[[s*.016,-.075,.106],[s*.12,.12,.106],[s*.30,.252,.106]],.021,'steel');
}

// Shoulder, arm, elbow, forearm and hand have independent joint pivots.
for(const side of ['l','r']){
  const s=side==='l'?1:-1;
  const arm=group(torso,`arm_${side}`,[s*.79,1.075,0]);
  arm.rotation.z=s*.13;
  transverseJoint(arm,[s*.025,0,0],.225,.32);
  // Angular graphite pauldrons with raised gold edges.
  shell(arm,[[.28,.12,.15],[.23,.29,.26],[.08,.35,.315],[-.15,.34,.29],[-.35,.24,.22]],'ivory',[s*.10,0,0]);
  plate(arm,mirror([[.02,.20],[.21,.245],[.42,.11],[.43,-.12],[.32,-.29],[.19,-.16],[.18,.07]],s),.065,'white',[0,0,.25],[0,s*.18,0],.022);
  line(arm,[[s*.025,.232,.29],[s*.22,.266,.29],[s*.395,.115,.30],[s*.40,-.10,.30]],.027,'gold');
  line(arm,[[s*.030,.091,.331],[s*.072,-.156,.330],[s*.23,-.236,.30]],.012,'cyan');
  plate(arm,mirror([[.18,-.16],[.32,-.28],[.42,-.13],[.395,-.32],[.285,-.43],[.17,-.31]],s),.09,'steel',[0,0,.16],[0,s*.25,0],.02);
  plate(arm,mirror([[.025,.135],[.21,.19],[.32,.09],[.285,.055],[.17,.125],[.027,.084]],s),.018,'dark',[0,0,.319],[0,s*.10,0],.006);
  plate(arm,mirror([[.078,.123],[.19,.155],[.247,.124],[.204,.126],[.087,.095]],s),.012,'cyan',[0,0,.333],[0,s*.10,0],.003);
  cyl(arm,.145,.145,.044,'dark',[s*.382,-.028,-.006],[0,0,PI/2],24);
  ring(arm,.112,.013,'gold',[s*.410,-.028,-.006],[0,PI/2,0]);
  cyl(arm,.082,.082,.049,'steel',[s*.394,-.028,-.006],[0,0,PI/2],20);
  shell(arm,[[-.20,.15,.16],[-.38,.17,.16],[-.66,.115,.13]],'dark',[0,0,0]);
  shell(arm,[[-.26,.17,.105],[-.40,.21,.13],[-.61,.145,.105]],'ivory',[s*.015,0,.135],[0,0,s*.055]);
  plate(arm,[[-.12,-.31],[.11,-.30],[.135,-.43],[.075,-.57],[0,-.62],[-.09,-.54]],.055,'ivory',[0,0,.253],[0,0,0],.016);
  rod(arm,[s*.13,-.25,-.06],[s*.12,-.63,-.07],.035,'steel');
  cable(arm,[[-s*.08,-.20,-.12],[-s*.18,-.40,-.17],[-s*.09,-.66,-.12]],.032,'rubber');
  const forearm=group(arm,`forearm_${side}`,[0,-.72,0]);
  forearm.rotation.x=-.065;
  transverseJoint(forearm,[0,0,0],.155,.30);
  shell(forearm,[[-.08,.15,.15],[-.22,.19,.19],[-.49,.145,.15],[-.66,.105,.12]],'dark');
  shell(forearm,[[-.10,.17,.095],[-.22,.22,.13],[-.49,.17,.10],[-.60,.105,.075]],'ivory',[0,0,.13]);
  plate(forearm,[[-.095,-.14],[.095,-.14],[.14,-.30],[.095,-.51],[0,-.60],[-.095,-.51],[-.14,-.30]],.046,'white',[0,0,.244],[0,0,0],.015);
  plate(forearm,[[-.043,-.23],[.043,-.23],[.065,-.30],[.026,-.48],[-.026,-.48],[-.065,-.30]],.026,'dark',[0,0,.282],[0,0,0],.008);
  rod(forearm,[0,-.275,.300],[0,-.415,.300],.012,'cyan');
  shell(forearm,[[-.19,.075,.115],[-.36,.09,.13],[-.52,.06,.085]],'steel',[s*.17,0,-.045]);
  rod(forearm,[-s*.115,-.12,-.10],[-s*.10,-.57,-.075],.025,'gold');
  cyl(forearm,.125,.12,.125,'gold',[0,-.647,0]);
  const hand=group(forearm,`hand_${side}`,[0,-.715,.014]);
  shell(hand,[[.055,.102,.073],[-.055,.125,.079],[-.145,.109,.065]],'dark');
  plate(hand,[[-.104,.025],[.095,.025],[.122,-.07],[.068,-.13],[-.073,-.13],[-.12,-.063]],.035,'ivory',[0,0,.075],[0,0,0],.012);
  // Four knuckled, segmented curled digits plus an opposed thumb.
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.058;
    const len=[.12,.15,.145,.112][i];
    sphere(hand,.033,'steel',[x,-.14,.015],[.83,1,1]);
    rod(hand,[x,-.142,.02],[x,-.142-len*.63,.042],.025,'dark',.022,8);
    rod(hand,[x,-.142-len*.63,.042],[x,-.142-len,.08],.023,'steel',.019,8);
    rod(hand,[x,-.142-len,.08],[x,-.13-len,.12],.020,'dark',.014,8);
    plate(hand,[[-.02,.022],[.02,.022],[.023,-.018],[-.023,-.018]],.022,'ivory',[x,-.159,.06],[.12,0,0],.004);
  }
  const tx=-s*.12;
  sphere(hand,.041,'steel',[tx,-.042,.014]);
  rod(hand,[tx,-.042,.014],[tx-s*.054,-.109,.037],.033,'dark',.028,8);
  rod(hand,[tx-s*.054,-.109,.037],[tx-s*.033,-.169,.09],.028,'steel',.019,8);
}

// A full cyan energy blade is held in the right hand. Emission forward is local -Y.
const rightHand=root.getObjectByName('hand_r');
const emitter=group(rightHand,'cash_emitter',[0,-.205,.145]);
emitter.rotation.z=.96;
emitter.userData={attribute:'cash',primaryMesh:'cash_core',recommendedIntensity:[.55,4],weapon:'energy sword',forward:'-Y'};
cyl(emitter,.045,.045,.38,'dark',[0,.19,0],[0,0,0],12);
for(let i=0;i<6;i++)ring(emitter,.047,.008,'gold',[0,.042+i*.056,0],[PI/2,0,0]);
cyl(emitter,.064,.052,.09,'gold',[0,.405,0],[0,0,0],12);
cyl(emitter,.034,.035,.022,'cyan',[0,.46,0],[0,0,0],12);
plate(emitter,[[-.24,.055],[-.17,.111],[-.057,.07],[.057,.07],[.17,.111],[.24,.055],[.18,-.048],[.10,-.035],[0,.003],[-.10,-.035],[-.18,-.048]],.078,'gold',[0,0,0],[0,0,0],.013);
plate(emitter,[[-.19,.050],[-.129,.072],[0,.028],[.129,.072],[.19,.050],[.158,.013],[0,-.013],[-.158,.013]],.04,'ivory',[0,0,.047],[0,0,0],.006);
shell(emitter,[[.012,.065,.051],[-.13,.077,.043],[-.215,.053,.028]],'steel');
const blade=group(emitter,'cash_blade',[0,-.147,0]);
// Translate the blade geometry so its strength scales from the hilt, not the hand.
plate(blade,[[-.057,0],[-.092,-.141],[-.069,-1.641],[0,-1.928],[.069,-1.641],[.092,-.141],[.057,0]],.026,'blade',[0,0,.008],[0,0,0],.009,'cash_core');
line(blade,[[-.078,-.139,.013],[-.061,-1.602,.013],[0,-1.928,.013],[.061,-1.602,.013],[.078,-.139,.013]],.009,'cyan');
const muzzle=group(blade,'cash_muzzle',[0,-1.928,.008]);
muzzle.userData={forward:'-Y',description:'tip of the energy blade'};

// The opposite forearm supports an oval shield with a bright cyan field rim.
const leftForearm=root.getObjectByName('forearm_l');
const shield=group(leftForearm,'reserve_shield',[.42,-.15,.115]);
shield.rotation.y=-.40;shield.rotation.z=.29;
shield.userData={attribute:'reserve',scaleAxis:'uniform',mountDescription:'forearm-mounted oval shield',recommendedRange:[.60,1.16]};
rod(shield,[-.34,.02,-.04],[-.04,.02,-.04],.061,'steel');
const ellipse=(rx,ry,n=40)=>Array.from({length:n},(_,i)=>[Math.cos(i*2*PI/n)*rx,Math.sin(i*2*PI/n)*ry]);
plate(shield,ellipse(.42,.84),.017,'shield',[0,0,.035],[0,0,0],0,'reserve_field');
plate(shield,ellipse(.315,.713),.07,'gold',[0,0,.0],[0,0,0],.01);
plate(shield,ellipse(.282,.670),.083,'ivory',[0,0,.035],[0,0,0],.009);
const fieldRim=mesh(shield,new THREE.TorusGeometry(1,.037,6,48),'green',[0,0,.049]);fieldRim.scale.set(.429,.861,1);
const innerRim=mesh(shield,new THREE.TorusGeometry(1,.009,5,48),'cyan',[0,0,.078]);innerRim.scale.set(.351,.755,1);
plate(shield,[[-.064,.49],[0,.59],[.064,.49],[.087,.11],[.07,-.33],[0,-.55],[-.07,-.33],[-.087,.11]],.045,'dark',[0,0,.10],[0,0,0],.01);
plate(shield,[[-.039,.43],[0,.50],[.039,.43],[.038,.11],[0,.02],[-.038,.11]],.026,'gold',[0,0,.135],[0,0,0],.007);
line(shield,[[0,-.44,.151],[.039,-.32,.151],[.039,-.07,.151]],.012,'cyan');
for(const s of [-1,1]){
  plate(shield,mirror([[.115,.51],[.19,.421],[.225,.226],[.198,.177],[.161,.34]],s),.040,'steel',[0,0,.097],[0,0,0],.008);
  plate(shield,mirror([[.10,-.40],[.189,-.299],[.235,-.17],[.235,-.33],[.139,-.516]],s),.042,'gold',[0,0,.099],[0,0,0],.008);
}

// Long legs, floating thigh armor and asymmetric layers over the shin pistons.
for(const side of ['l','r']){
  const s=side==='l'?1:-1;
  const leg=group(pelvis,`leg_${side}`,[s*.43,-.015,0]);
  leg.rotation.z=s*.13;
  leg.scale.y=1.12;
  transverseJoint(leg,[0,0,0],.205,.29);
  shell(leg,[[-.13,.18,.19],[-.39,.22,.22],[-.75,.145,.16],[-.88,.12,.13]],'dark');
  // Outer thigh shell is muscular, tapered and swept slightly forward.
  shell(leg,[[-.11,.15,.105],[-.28,.245,.155],[-.53,.23,.145],[-.81,.115,.075]],'ivory',[s*.026,0,.145]);
  plate(leg,[[-.12,-.17],[.11,-.17],[.19,-.35],[.135,-.63],[.04,-.81],[-.05,-.82],[-.16,-.58],[-.19,-.36]],.046,'white',[s*.026,0,.297],[0,0,-s*.055],.018);
  plate(leg,[[-.045,-.19],[.08,-.23],[.114,-.42],[.055,-.62],[0,-.67],[-.044,-.54],[-.07,-.34]],.026,'dark',[s*.012,0,.336],[0,0,-s*.06],.012);
  plate(leg,mirror([[.17,-.27],[.25,-.35],[.24,-.64],[.15,-.75],[.12,-.62],[.18,-.45]],s),.092,'steel',[0,0,.045],[0,s*.16,0],.018);
  rod(leg,[s*.165,-.47,.281],[s*.10,-.69,.287],.011,'cyan');
  rod(leg,[-s*.145,-.21,-.045],[-s*.115,-.82,-.04],.036,'steel');
  rod(leg,[s*.11,-.20,-.12],[s*.10,-.76,-.10],.039,'rubber');
  ring(leg,.14,.02,'steel',[0,-.33,-.04],[PI/2,0,0]);
  screw(leg,s*.133,-.37,.351,.022);
  const shin=group(leg,`shin_${side}`,[0,-.955,.018]);
  transverseJoint(shin,[0,0,0],.18,.32);
  // Raised knee shield bridges the joint with a dark aperture and bevel rim.
  plate(shin,[[-.14,.14],[-.07,.21],[.08,.21],[.17,.10],[.14,-.13],[0,-.23],[-.135,-.13]],.12,'ivory',[0,0,.19],[.02,0,0],.024);
  plate(shin,[[-.073,.12],[.075,.12],[.10,.045],[.068,-.086],[0,-.145],[-.07,-.079],[-.096,.04]],.022,'dark',[0,0,.278],[0,0,0],.013);
  plate(shin,[[-.035,.097],[.042,.097],[.06,.04],[.035,-.065],[-.035,-.066],[-.052,.04]],.018,'steel',[0,0,.299],[0,0,0],.007);
  shell(shin,[[-.11,.13,.135],[-.31,.19,.185],[-.58,.15,.15],[-.95,.095,.09]],'dark',[0,0,-.035]);
  shell(shin,[[-.16,.18,.09],[-.32,.21,.14],[-.53,.17,.12],[-.83,.11,.085],[-.96,.075,.06]],'ivory',[0,0,.095]);
  plate(shin,[[-.15,-.23],[-.055,-.31],[.055,-.31],[.15,-.23],[.16,-.43],[.086,-.70],[.065,-.90],[0,-.97],[-.065,-.90],[-.086,-.70],[-.16,-.43]],.065,'white',[0,0,.215],[0,0,0],.018);
  plate(shin,[[-.036,-.38],[.036,-.38],[.041,-.51],[.018,-.79],[-.018,-.79],[-.041,-.51]],.017,'steel',[0,0,.267],[0,0,0],.007);
  rod(shin,[0,-.53,.284],[0,-.74,.265],.008,'cyan');
  for(const t of [-1,1]){
    rod(shin,[t*.124,-.29,-.108],[t*.080,-.94,-.092],.024,'steel');
    cyl(shin,.037,.037,.28,'dark',[t*.103,-.57,-.103],[0,0,-t*.064],12);
  }
  shell(shin,[[-.21,.072,.085],[-.46,.084,.11],[-.61,.068,.075]],'steel',[s*.163,0,-.045],[0,0,-s*.07]);
  screw(shin,s*.114,-.405,.280,.020);
  plate(shin,mirror([[.145,-.19],[.206,-.24],[.17,-.48],[.083,-.725],[.015,-.791],[.045,-.641],[.112,-.46]],s),.055,'gold',[0,0,.238],[0,0,0],.009);
  plate(shin,mirror([[-.161,-.23],[-.111,-.293],[-.116,-.448],[-.184,-.571],[-.204,-.493]],s),.035,'cyan',[0,0,.191],[0,0,0],.008);
  const foot=group(shin,`foot_${side}`,[0,-.965,0]);
  transverseJoint(foot,[0,0,0],.113,.23);
  // Foot sole is a long chamfered toe footprint, with an articulated instep.
  const footprint=[[-.18,-.17],[.14,-.17],[.21,-.055],[.22,.25],[.145,.40],[-.14,.40],[-.22,.285],[-.225,.025]];
  // Rotate XY polygon onto XZ. Positive source Y is the forward toe.
  plate(foot,footprint,.105,'rubber',[0,-.253,.055],[PI/2,0,0],.020);
  plate(foot,footprint.map(([x,y])=>[x*.95,y*.98]),.083,'steel',[0,-.20,.055],[PI/2,0,0],.018);
  shell(foot,[[-.183,.195,.28,.10],[-.102,.195,.285,.11],[-.025,.13,.19,.035],[.08,.10,.095,-.02]],'ivory');
  // Split toe plates introduce a central negative seam and toe marker.
  for(const t of [-1,1]){
    plate(foot,mirror([[.015,-.025],[.108,.028],[.173,-.07],[.157,-.16],[.015,-.185]],t),.055,'white',[0,0,.323],[-.33,0,t*.09],.013);
  }
  rod(foot,[0,-.18,.372],[0,-.085,.344],.012,'cyan');
  plate(foot,[[-.14,.085],[-.088,.16],[.092,.16],[.143,.065],[.11,-.045],[-.11,-.045]],.077,'ivory',[0,0,.073],[-.35,0,0],.020);
  plate(foot,[[-.068,.087],[.065,.087],[.08,.014],[.039,-.037],[-.04,-.037],[-.08,.014]],.020,'dark',[0,0,.133],[-.35,0,0],.009);
  // Sole treads are shallow cleats rather than plain slabs.
  for(let j=0;j<4;j++)for(const t of [-1,1])plate(foot,[[-.037,.024],[.037,.024],[.029,-.024],[-.03,-.024]],.018,'dark',[t*.208,-.226,-.09+j*.118],[0,PI/2,0],.003);
}

// Consolidate only direct mesh children, never rig groups or semantic meshes.
// This retains all authored joint/attribute transforms while reducing draw calls.
const semanticNames=new Set(['cash_core','cash_muzzle','equity_core','reserve_field','accent_visor','accent_eye_r']);
const parents=[];root.traverse(o=>{if(o.isGroup)parents.push(o)});
for(const parent of parents){
  const byMaterial=new Map();
  for(const m of [...parent.children]){
    if(!m.isMesh || semanticNames.has(m.name))continue;
    m.updateMatrix();let g=m.geometry.clone();
    if(g.index)g=g.toNonIndexed();
    for(const attr of Object.keys(g.attributes))if(!['position','normal'].includes(attr))g.deleteAttribute(attr);
    g.applyMatrix4(m.matrix);
    const key=m.material.uuid;
    if(!byMaterial.has(key))byMaterial.set(key,{mat:m.material,geometries:[]});
    byMaterial.get(key).geometries.push(g);parent.remove(m);
  }
  for(const {mat,geometries} of byMaterial.values()){
    const g=mergeGeometries(geometries,false);g.computeBoundingBox();g.computeBoundingSphere();
    const m=mesh(parent,g,mat);m.name=`${parent.name}__${mat.name.replaceAll(' ','_').toLowerCase()}`;
  }
}

// Set exactly grounded feet while preserving every local articulation pivot.
scene.updateMatrixWorld(true);
let bounds=new THREE.Box3().setFromObject(root);
pelvis.position.y-=bounds.min.y;
scene.updateMatrixWorld(true);
for(const side of ['l','r']){
  const foot=root.getObjectByName(`foot_${side}`);
  const footBox=new THREE.Box3().setFromObject(foot);
  foot.position.y-=footBox.min.y/foot.parent.matrixWorld.elements[5];
}
scene.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(root);
let triangles=0,vertices=0,draws=0,invalid=0;
const nodes=[];
root.traverse(o=>{
  if(o.isGroup)nodes.push({name:o.name,parent:o.parent?.name||'scene',position:o.position.toArray(),rotation:o.rotation.toArray().slice(0,3),scale:o.scale.toArray()});
  if(o.isMesh){draws++;const g=o.geometry;vertices+=g.attributes.position.count;triangles+=(g.index?g.index.count:g.attributes.position.count)/3;for(const key of ['position','normal'])for(const value of g.attributes[key].array)if(!Number.isFinite(value))invalid++;}
});
const exporter=new GLTFExporter();
const glb=await exporter.parseAsync(scene,{binary:true,trs:true,onlyVisible:true});
await fs.writeFile(path.join(outDir,'sentinel.glb'),Buffer.from(glb));
const report={file:'sentinel.glb',bytes:glb.byteLength,vertices,triangles,draws,invalidValues:invalid,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:bounds.getSize(new THREE.Vector3()).toArray()},nodes};
await fs.writeFile(path.join(outDir,'sentinel-inspection.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(invalid || triangles>150000 || draws>150 || glb.byteLength>8_000_000)throw new Error('Asset budget or geometry validation failed');
