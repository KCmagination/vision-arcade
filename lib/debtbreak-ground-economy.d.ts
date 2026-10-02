import type {DebtbreakerState} from './debtbreaker-engine.js';
import type {GroundState} from './debtbreak-continuous.js';
export const MODULE_PRICE:number,MODULE_UPKEEP:number,MODULE_CONDITION:number,MODULE_SALE_BPS:number;
export function createGroundState(seed?:number,touch?:boolean):GroundState;
export function groundUpkeep(s:DebtbreakerState):number;
export function groundAssetValue(s:DebtbreakerState):number;
export function groundFunds(s:DebtbreakerState):{living:number;required:number;savings:number;requiredAvailable:number;extraAvailable:number;shortfall:number};
export function groundAssetPlan(s:DebtbreakerState,outflow:number):{cost:number;upkeep:number;floor:number;after:number;uncovered:number;canBuy:boolean;value:number};
export function groundTarget(s:DebtbreakerState):{kind:string;targetId?:string;accountId?:string}|null;
