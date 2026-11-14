import type {DebtbreakerState} from './debtbreaker-engine.js';
export type CycleLearning={cycle:number;complete:boolean;playerPaid:number;totemPaid:number;reservePaid:number;missRefunds:number;unusedRefunds:number;cancelledReturns:number;deposits:number;wallSpend:number;conditionAdded:number;conditionLost:number;shieldLosses:number};
export function newCycleLearning(cycle:number,complete?:boolean):CycleLearning;
export function recordLearning(s:DebtbreakerState,key:Exclude<keyof CycleLearning,'cycle'|'complete'>,value:number):void;
