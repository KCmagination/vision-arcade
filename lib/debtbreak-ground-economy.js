// Public, fictional game rules. No private avatar scoring.
export const MODULE_PRICE=15000, MODULE_UPKEEP=500, MODULE_CONDITION=25, MODULE_SALE_BPS=800;
export const groundObligations=s=>s.threats.filter(t=>['living','credit'].includes(t.lane)&&t.remaining>0);
const sum=xs=>xs.reduce((n,x)=>n+x,0);
export const groundUpkeep=s=>sum((s.continuous.ground?.assets??[]).map(a=>a.upkeep));
export const groundAssetValue=s=>sum((s.continuous.ground?.assets??[]).map(a=>a.value));
export function createGroundState(seed=20260930,touch=false){
 return {version:1,seed:seed>>>0,touch,autoTotems:true,strategy:'snowball',baseStrategy:'snowball',targetId:null,
  extraBudget:0,savingsEarmark:0,reserveAllowance:0,reserveSpent:0,autoPaid:0,actionSerial:0,
  assets:[],assetSerial:0,assetSpent:0,soldValue:0,salesNet:0,saleFees:0,incidentCycle:0,incidentCount:0,
  bestSector:0,archivedCycles:0,ended:false,limitReached:false};
}
export function groundFunds(s){
 const g=s.continuous.ground;if(!g)return {living:0,required:0,savings:0,requiredAvailable:0,extraAvailable:0,shortfall:0};
 const holds=Object.values(s.continuous.holds);
 const living=Math.max(0,sum(groundObligations(s).filter(t=>t.lane==='living').map(t=>t.remaining))-sum(holds.filter(h=>h.scope==='living'&&h.source==='income').map(h=>h.amount)));
 const required=sum(groundObligations(s).filter(t=>t.lane==='credit').map(t=>Math.max(0,t.remaining-sum(holds.filter(h=>h.targetId===t.id).map(h=>h.amount)))));
 const cash=Math.max(0,s.incomeWallet),savings=Math.min(cash,g.savingsEarmark);
 return {living,required,savings,requiredAvailable:Math.max(0,cash-living-savings),
  extraAvailable:Math.min(g.extraBudget,Math.max(0,cash-living-required-savings)),shortfall:Math.max(0,living+required+g.savingsEarmark-cash)};
}
export function groundTarget(s){
 const g=s.continuous.ground;if(!g)return null;
 const obligations=groundObligations(s);
 const required=obligations.filter(t=>t.lane==='credit').sort((a,b)=>Number(b.overdue)-Number(a.overdue)||a.dueDay-b.dueDay||a.id.localeCompare(b.id));
 if(required.length)return {kind:'required',targetId:required[0].id,accountId:required[0].accountId};
 const strategy=g.strategy==='snowflake'?g.baseStrategy:g.strategy;
 const eligible=s.continuous.accounts.filter(a=>a.method!=='payments'&&a.principal+a.interest+a.fees>0&&!obligations.some(t=>t.accountId===a.id)&&(strategy!=='avalanche'||a.rateBps!==null));
 const balance=a=>a.principal+a.interest+a.fees;
 eligible.sort((a,b)=>strategy==='avalanche'?b.rateBps-a.rateBps||balance(a)-balance(b)||a.id.localeCompare(b.id):balance(a)-balance(b)||(b.rateBps??-1)-(a.rateBps??-1)||a.id.localeCompare(b.id));
 const a=g.strategy==='snowflake'&&g.targetId?eligible.find(a=>a.id===g.targetId)??eligible[0]:eligible[0];
 return a?{kind:'extra',accountId:a.id}:null;
}
export function groundAssetPlan(s,outflow){
 const g=s.continuous.ground,owed=groundObligations(s),holds=Object.values(s.continuous.holds);
 const committed=sum(owed.map(t=>Math.min(t.remaining,sum(holds.filter(h=>h.targetId===t.id).map(h=>h.amount)))));
 const livingHeld=Math.min(sum(owed.filter(t=>t.lane==='living').map(t=>t.remaining)),sum(holds.filter(h=>h.scope==='living').map(h=>h.amount)));
 const uncovered=Math.max(0,sum(owed.map(t=>t.remaining))-committed-livingHeld-Math.max(0,s.incomeWallet));
 const floor=(outflow+MODULE_UPKEEP)*(s.continuous.base.goalMonths??3)+uncovered,after=s.reserves-MODULE_PRICE;
 return {cost:MODULE_PRICE,upkeep:MODULE_UPKEEP,floor,after,uncovered,canBuy:!!g&&s.phase==='playing'&&after>=floor,value:groundAssetValue(s)};
}
export function incidentForCycle(s){
 const g=s.continuous.ground;if(!g||g.incidentCycle>=s.period)return null;
 g.incidentCycle=s.period;
 let seed=(g.seed^Math.imul(s.period,0x9e3779b1))>>>0;
 const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 if(next()>=Math.min(.3,.05+g.assets.length*.01))return null;
 const asset=g.assets.length&&next()<.6?g.assets[Math.floor(next()*g.assets.length)]:null;
 const amounts=asset?[1000,2500,5000]:[5000,10000,15000];
 return {id:`incident:${s.period}`,label:asset?`${asset.name} · surprise repair`:'Unexpected essential expense',amount:amounts[Math.floor(next()*amounts.length)],assetId:asset?.id??null};
}
export function compactGroundHistory(s){
 const c=s.continuous,g=c.ground;if(!g)return;
 if(c.summaries.length>12){g.archivedCycles+=c.summaries.length-12;c.summaries=c.summaries.slice(-12);}
 c.log=c.log.slice(-500);c.processed=c.processed.slice(-100);
 c.lifestyle.history=c.lifestyle.history.slice(-12);
 s.threats=s.threats.filter(t=>t.remaining>0||t.cycle>=s.period-2||['want','reserve'].includes(t.lane));
 for(const key of Object.keys(c.cyclePlan))if(Number(key)<s.period-12){delete c.cyclePlan[key];delete c.cycleAdjustment[key];}
}
