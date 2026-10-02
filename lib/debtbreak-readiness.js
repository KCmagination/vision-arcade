import {basePlan,capitalShield,continuousOutflow} from './debtbreak-continuous.js';
import {groundAssetPlan} from './debtbreak-ground-economy.js';
export function groundReadiness(s){
 const wall=basePlan(s),outpost=groundAssetPlan(s,continuousOutflow(s)),shield=capitalShield(s);
 const make=(cost,floor,ready)=>({cost,after:s.reserves-cost,available:Math.max(0,s.reserves-floor),shortfall:Math.max(0,cost+floor-s.reserves),ready,progress:Math.min(1,Math.max(0,s.reserves-floor)/cost)});
 return {wall:{...make(wall.cost,wall.uncovered,wall.canExpand),complete:s.continuous.base.expansions>=wall.required,losesShield:shield.charged&&s.reserves-wall.cost<shield.goal},module:{...make(outpost.cost,outpost.floor,outpost.canBuy),upkeep:outpost.upkeep}};
}
