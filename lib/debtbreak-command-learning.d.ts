import type {DebtbreakerState} from './debtbreaker-engine.js';
export const SAVINGS_MARKERS:readonly number[];
export function livingPressure(s:DebtbreakerState):{kind:string;ratio:number|null;position:number|null;income:number|null;living:number|null};
export function savingsGuide(months:number,outflow:number):{months:number|null;markers:{value:number;reached:boolean}[];next:number|null};
export function collateralGuide(s:DebtbreakerState):{kind:string;equity:number|null;ratio:number|null;heat:number|null};
export function creditGuide(s:DebtbreakerState):{periods:number;reduction:number;balanceKnown:boolean;progress:number;unlocked:boolean;hasDebt:boolean};
export function budgetGuide(s:DebtbreakerState,incomeCap:number,reserveCap:number,unpaid:number):{available:number;savings:number;authorized:number;backup:number;incomeSpend:number;reserveSpend:number;spendingLeft:number;savingsLeft:number;shortfall:number};
