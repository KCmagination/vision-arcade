import {createCommandPresentation,updateCommandPresentation} from '../lib/debtbreak-command-presentation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {commandPoint,commandUnproject,placeCommandLabel} from '../lib/debtbreak-command-view.js';
import {drawCommandField} from '../lib/debtbreak-command-render.js';
import {drawCommandVfx} from '../lib/debtbreak-command-vfx.js';
import {createHangarCampaign,beginCampaign} from '../lib/debtbreaker-engine.js';
import {enableContinuous,continuousAction} from '../lib/debtbreak-continuous.js';
import {createCombat} from '../lib/debtbreak-siege.js';
function context(){let count=0;const labels=[];return {labels,get count(){return count;},ctx:new Proxy({canvas:{},measureText:t=>({width:t.length*6}),fillText:t=>labels.push(t)},{get:(o,k)=>k in o?o[k]:(...args)=>{assert.ok(args.filter(a=>typeof a==='number').every(Number.isFinite));count++;},set:(o,k,v)=>{o[k]=v;return true;}})};}
function world(){const picture={kind:'current',inputs:{monthlyIncome:4000,monthlyLivingExpenses:1000,monthlyDebtPayments:200,totalDebt:10000,assetValue:20000,liquidReserves:5000,creditScore:700},corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(key=>[key,{strength:.5,raw:{}}]))};const s=beginCampaign(enableContinuous(createHangarCampaign(picture,'C'),{mode:'base'}));return createCombat(continuousAction(s,{type:'commandPreset'}));}
test('winding presentation is invertible for pads, lanes and manual aim',()=>{for(let x=0;x<=1000;x+=20)for(let z=0;z<=1000;z+=20){const p=commandPoint(x,z),q=commandUnproject(p.x,p.z);assert.ok(Math.abs(x-q.x)<1e-8);assert.ok(Math.abs(z-q.z)<1e-8);}});
test('desktop/phone/reduced-motion rendering cannot change the ledger, holds or combat state',()=>{const w=world();w.time=1;w.effects=[{type:'hit',x:400,z:400,amount:1234,born:.6,serial:1},{type:'impact',x:500,z:790,amount:500,born:.6,serial:2}];w.ground.beams=[0,1,2,3].map(tower=>({tower,x:400,z:400,born:.9,paid:0}));const before=structuredClone(w);for(const [width,height] of [[1034,620],[374,337],[600,230]])for(const reduced of [false,true]){const c=context();drawCommandField(c.ctx,w,width,height,{},reduced);assert.deepEqual(w,before);assert.ok(c.labels.includes('Paid $12.34'));assert.ok(c.labels.includes('Savings paid $5.00'));assert.ok(!c.labels.some(t=>t.includes('NaN')));}});
test('effect work stays bounded even when a harness supplies excessive events',()=>{const w=world();w.time=1;w.effects=Array.from({length:10000},(_,serial)=>({type:'hit',x:400,z:400,amount:100,born:.9,serial}));w.ground.beams=Array.from({length:10000},(_,i)=>({tower:i%4,x:400,z:400,born:.9,paid:100}));const c=context();drawCommandVfx(c.ctx,w,1000,600,{},false);assert.ok(c.count<1600,c.count);assert.equal(c.labels.length,3);const reduced=context();drawCommandVfx(reduced.ctx,w,1000,600,{},true);assert.ok(reduced.count<c.count/3);});

test('visual shot tails survive beam pruning, freeze on pause and expire without new financial events',()=>{
 const w=world(),state=createCommandPresentation();w.time=1;w.ledger.continuous.ground.command.stage='combat';
 w.ground.beams=[0,1,2,3].map(tower=>({tower,x:400,z:450,born:.95,paid:0}));
 const before=structuredClone(w);updateCommandPresentation(state,w);assert.equal(state.shots.length,4);assert.deepEqual(w,before);
 w.time=1.3;w.ground.beams=[];updateCommandPresentation(state,w);assert.equal(state.shots.length,4);
 const paused=structuredClone(state);updateCommandPresentation(state,w);assert.deepEqual(state,paused);
 w.time=2.2;updateCommandPresentation(state,w);assert.equal(state.shots.length,0);assert.equal(state.events.length,0);
});
test('visual history remains bounded, never invents attacks, and clears when a wave ends or time rewinds',()=>{
 const w=world(),state=createCommandPresentation();w.ledger.continuous.ground.command.stage='combat';
 for(let frame=0;frame<200;frame++){w.time=frame/60;w.ground.beams=[0,1,2,3].map(tower=>({tower,x:400,z:400,born:w.time,paid:0}));updateCommandPresentation(state,w);assert.ok(state.shots.length<=12);assert.ok(state.events.length<=20);assert.ok(state.deaths.length<=10);}
 w.ground.beams=[];w.ledger.continuous.ground.command.stage='build';updateCommandPresentation(state,w);assert.equal(state.shots.length,0);
 w.time=0;updateCommandPresentation(state,w);assert.equal(state.shots.length,0);assert.equal(state.deaths.length,0);
});


test('dense mobile captions find distinct safe positions without changing their anchors',()=>{
 for(const [width,height] of [[374,338],[532,290],[1034,578]]){
  const occupied=[{x:100,y:110,w:100},{x:190,y:150,w:110},{x:75,y:70,w:90}],anchors=Array.from({length:11},(_,i)=>({x:100+i%3*7,y:105+i%2*5})),before=structuredClone(anchors);
  for(const anchor of anchors){const box=placeCommandLabel(anchor.x,anchor.y,width,height,56,occupied);assert.ok(box.x>=31&&box.x<=width-31);assert.ok(box.y>=12&&box.y<=height-12);for(const old of occupied)assert.ok(Math.abs(box.x-old.x)>=(box.w+old.w)/2+3||Math.abs(box.y-old.y)>=20);occupied.push(box);}
  assert.deepEqual(anchors,before);
 }
});
