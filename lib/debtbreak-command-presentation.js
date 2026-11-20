import {COMMAND_PADS,commandTargets} from './debtbreak-command.js';

// A renderer-owned, bounded history. Never attached to or written into combat/ledger.
export const PRESENTATION_LIMITS=Object.freeze({shots:12,events:20,deaths:10,seconds:1.15});
const contexts=new WeakMap();
export function createCommandPresentation(){return {time:null,stage:null,shots:[],events:[],deaths:[],actors:[],aims:[null,null,null,null]};}
export function updateCommandPresentation(state,w,actors=[]){
 const stage=w.ledger.continuous.ground.command.stage,t=w.time;
 if(state.time===null||t<state.time||state.stage!==stage){Object.assign(state,createCommandPresentation(),{time:t,stage});}
 const dt=Math.max(0,Math.min(.1,t-state.time));state.time=t;
 state.shots=state.shots.filter(b=>t-b.born>=0&&t-b.born<1.02);
 for(const b of w.ground.beams.slice(-12))if(t-b.born>=0&&t-b.born<1.02&&!state.shots.some(s=>s.tower===b.tower&&s.born===b.born)){
  const pad=COMMAND_PADS[w.ledger.continuous.ground.command.towers[b.tower]?.pad];
  if(pad)state.shots.push({...b,pad:{x:pad.x,z:pad.z}});
 }
 state.shots=state.shots.slice(-PRESENTATION_LIMITS.shots);
 state.events=w.effects.slice(-PRESENTATION_LIMITS.events).filter(e=>t-e.born>=0&&t-e.born<PRESENTATION_LIMITS.seconds).map(e=>({...e}));
 state.deaths=state.deaths.filter(e=>t-e.born>=0&&t-e.born<.8);
 if(stage==='combat')for(const old of state.actors){
  if(!actors.some(a=>a.id===old.id)&&state.events.some(e=>e.type==='hit'&&e.amount>0&&e.targetId===old.targetId&&Math.hypot(e.x-old.x,e.z-old.z)<65)&&!state.deaths.some(e=>e.id===old.id))state.deaths.push({...old,born:t});
 }
 state.deaths=state.deaths.slice(-PRESENTATION_LIMITS.deaths);
 state.actors=actors.slice(0,60).map(a=>({id:a.id,targetId:a.target.id,x:a.x,z:a.z,air:a.target.lane==='living'}));
 w.ledger.continuous.ground.command.towers.forEach((tower,i)=>{
  const pad=COMMAND_PADS[tower.pad];if(!pad){state.aims[i]=null;return;}
  const target=commandTargets(w.ledger,tower,actors)[0],last=state.shots.findLast(b=>b.tower===i);
  const point=target??last??{x:pad.x,z:pad.z-180};
  const desired=Math.atan2(point.x-pad.x,-(point.z-pad.z));
  if(state.aims[i]===null)state.aims[i]=desired;
  else{const delta=Math.atan2(Math.sin(desired-state.aims[i]),Math.cos(desired-state.aims[i]));state.aims[i]+=delta*Math.min(1,dt*12);}
 });
 return state;
}
export function commandPresentation(ctx,w,actors=[]){
 let entry=contexts.get(ctx);if(!entry||entry.world!==w){entry={world:w,state:createCommandPresentation()};contexts.set(ctx,entry);}
 return updateCommandPresentation(entry.state,w,actors);
}
