import {emptyLayout,isGrid,assetPoint,creditSupports,CREDIT_RANGE_BONUS,routePoint} from './debtbreak-command-grid.js';
// Fictional arcade rules. Reads corner strengths; never calculates financial scores.
export const COMMAND_PADS=[
 {x:80,z:340,label:'1 · West approach'},{x:340,z:360,label:'2 · Inner west'},
 {x:660,z:360,label:'3 · Inner east'},{x:920,z:340,label:'4 · East approach'},
 {x:80,z:650,label:'5 · West core'},{x:340,z:650,label:'6 · Core west'},
 {x:660,z:650,label:'7 · Core east'},{x:920,z:650,label:'8 · East core'},
];
export const COMMAND_GUNS=[
 {key:'cashFlow',label:'Cash Flow',color:'#61eaff',role:'Rapid dual-purpose fire',benefit:'Faster reload'},
 {key:'capital',label:'Capital',color:'#70ffb4',role:'Local savings-backup shield',benefit:'Covered reserve payments'},
 {key:'collateral',label:'Collateral',color:'#ffc264',role:'Shared base-condition anchor',benefit:'Shared base condition'},
 {key:'credit',label:'Credit',color:'#c5a1ff',role:'Local radar and communications',benefit:'20% primary range bonus'},
];
export const COMMAND_NEEDS=['Air · water · food','Shelter · safety','Sleep','Clothing','Health care','Socializing','Purpose'];
export const NEED_COLORS=['#61d5ff','#ffbf69','#b5a0ed','#f09ca8','#70d9a2','#edce6c','#81bdd2'];
export function createCommand(){return {version:2,layout:emptyLayout(),stage:'setup',allowance:0,paid:0,upgradeSpent:0,secured:0,lastWave:null,towers:COMMAND_GUNS.map(g=>({key:g.key,pad:null,level:1,priority:'nearest'}))};}
export function commandStats(s,t){
 const v=s.hangar?.snapshot.corners[t.key]?.strength,strength=Number.isFinite(v)?Math.max(0,Math.min(1,v)):.5,level=t.level-1;
 if(isGrid(s.continuous?.ground?.command)){
  const command=s.continuous.ground.command,boost=creditSupports(command)?1+CREDIT_RANGE_BONUS:1;
  return {range:t.key==='cashFlow'?(360+level*35)*boost:t.key==='capital'?280:t.key==='credit'?320:0,damage:t.key==='cashFlow'?3:0,cooldown:(.18-strength*.06)/(1+level*.2),lanes:t.key==='cashFlow'?['living','credit']:[],strength};
 }
 const roles={
  cashFlow:{range:340,damage:1,cooldown:.55-strength*.2,lanes:['living','credit']},
  capital:{range:360,damage:1+Math.floor(strength)+level,cooldown:1.05,lanes:['living','credit']},
  collateral:{range:350,damage:1+Math.floor(strength)+level,cooldown:.85,lanes:['credit']},
  credit:{range:430+strength*120,damage:1,cooldown:.48,lanes:['living']},
 };
 const stats=roles[t.key];return {...stats,range:stats.range+level*35,cooldown:stats.cooldown/(1+level*.2),strength};
}
export function commandUpgrade(s,index){
 const t=s.continuous.ground.command.towers[index],cost=t.level*15000,after=s.reserves-cost;
 return {cost,after,ready:t.level<3&&s.phase==='playing'&&after>=0&&(!isGrid(s.continuous.ground.command)||index===0),progress:Math.min(1,Math.max(0,s.reserves)/cost),maxed:t.level>=3};
}
export function commandTargets(s,t,actors){
 const pad=isGrid(s.continuous.ground.command)?assetPoint(s.continuous.ground.command,t.key):COMMAND_PADS[t.pad],stats=commandStats(s,t);if(!pad)return [];
 const candidates=actors.filter(a=>!a.extra&&a.visible&&a.remaining>0&&(a.hp>0||s.continuous.ground.command.allowance>0&&s.incomeWallet>0)&&stats.lanes.includes(a.target.lane)&&Math.hypot(a.x-pad.x,a.z-pad.z)<=stats.range);
 return candidates.sort((a,b)=>t.priority==='largest'?b.remaining-a.remaining||a.impactAt-b.impactAt:t.priority==='due'?a.target.dueDay-b.target.dueDay||a.impactAt-b.impactAt:a.impactAt-b.impactAt||a.remaining-b.remaining);
}
export function commandCoverage(s){
 const command=s.continuous.ground.command,towers=command.towers;
 if(isGrid(command)){const p=assetPoint(command,'cashFlow'),r=commandStats(s,towers[0]).range,covers=(x,z)=>!!p&&Math.hypot(p.x-x,p.z-z)<=r;return {ground:[0,1].map(branch=>[.25,.5,.75].some(progress=>{const p=routePoint(branch,progress);return covers(p.x,p.z);})),air:['need0','need3'].map(id=>{const p=assetPoint(command,id);return !!p&&covers(p.x,p.z);})};}
 const covers=(lane,x,z)=>towers.some(t=>COMMAND_PADS[t.pad]&&commandStats(s,t).lanes.includes(lane)&&Math.hypot(COMMAND_PADS[t.pad].x-x,COMMAND_PADS[t.pad].z-z)<=commandStats(s,t).range);
 return {ground:[200,400,600,800].map(x=>covers('credit',x,590)),air:[350,650].map(x=>covers('living',x,530))};
}
