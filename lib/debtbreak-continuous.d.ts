import type {CommandState} from './debtbreak-command.js';
import type {CycleLearning} from './debtbreak-learning.js';
import type {DebtbreakerState} from './debtbreaker-engine.js';
export type GameAccount={id:string;name:string;type:string;method:'payments'|'monthly-v1'|'daily-v1';principal:number;opening:number;interest:number;fees:number;remainder:string;rateBps:number|null;payment:number;otherPayment:number;dueDay:number;feeDelay:number;lateFee:number|null;timingKnown:boolean;interestPosted:number;feesPosted:number;paid:number;principalPaid:number;unbilledFees:number;lateHistory:boolean;payoffDay:number|null};
export type Offer={id:string;label:string;cost:number;reward:number;laneSlot?:number;spawnDay:number;arrivalDay:number;expiryDay:number;status:string;source:string|null;drift:number};
export type GroundState={command?:CommandState;packetDefense?:boolean;impactReceipts?:string[];learning?:CycleLearning;version:number;seed:number;touch:boolean;autoTotems:boolean;strategy:'snowball'|'avalanche'|'snowflake';baseStrategy:string;targetId:string|null;extraBudget:number;savingsEarmark:number;reserveAllowance:number;reserveSpent:number;autoPaid:number;actionSerial:number;assets:{id:string;name:string;value:number;upkeep:number;upkeepFrom:number}[];assetSerial:number;assetSpent:number;soldValue:number;salesNet:number;saleFees:number;incidentCycle:number;incidentCount:number;bestSector:number;archivedCycles:number;ended:boolean;limitReached:boolean};
export type ContinuousState={version:number;ground?:GroundState|null;lifestyle:{tier:number;adjustable:number;baseline:{id:string;name:string;amount:number}[];pending:{tier:number;adjustable:number}|null;history:{cycle:number;tier:number;outflow:number}[]};mission:{success:boolean;unpaid:number;active:number;required:number;tier:number}|null;base:{goalMonths:number;expansions:number;spent:number};issues:string[];day:number;dayFraction:number;secondsPerDay:number;fictional:boolean;accounts:GameAccount[];living:{id:string;name:string;amount:number}[];holds:Record<string,{source:'income'|'reserve';amount:number;targetId:string|null;scope?:string;settled?:number;contact?:boolean}>;serial:number;processed:string[];log:{id:number;day:number;type:string;text:string;amount:number}[];cyclePlan:Record<number,number>;cycleAdjustment:Record<number,number>;summaries:{learning?:CycleLearning|null;cycle:number;planned:number;adjustment:number;paid:number;unpaid:number;income:number;reserves:number;day:number;onTime:boolean}[];autoProtect:boolean;wantsEnabled:boolean;wantSerial:number;nextWantDay:number;wantRush:boolean;offers:Offer[];enjoyment:number;purchases:number;livingPaid:number;debtPaid:number;repairPaid:number;banner:string;bannerUntil:number;repairSerial:number;rescue:{targetId:string;label:string;remainingSeconds:number}|null;lastRepair:{serial:number;defenseId:string;points:number;source:string}|null};
export type LedgerAction={type:string;tower?:number;pad?:number;col?:number;row?:number;seq?:number;strategy?:string;extra?:number;savings?:number;reserve?:number;assetId?:string;tier?:number;id?:string;source?:'income'|'reserve';amount?:number;points?:number;targetId?:string;defenseId?:string;accountId?:string;offerId?:string;enabled?:boolean};
export const MAX_ACTIVE_WANTS:number;
export const RESCUE_SECONDS:number;
export const DAY_SECONDS:Record<string,number>;
export function enableContinuous(s:DebtbreakerState,options?:{mode?:string;seed?:number;touch?:boolean;pace?:string;wants?:boolean;fictional?:boolean;goalMonths?:number}):DebtbreakerState;
export function accountDebt(a:GameAccount):number|null;
export function heldMoney(s:DebtbreakerState):number;
export function continuousOutflow(s:DebtbreakerState):number;
export function continuousAction(s:DebtbreakerState,action:LedgerAction):DebtbreakerState;
export function holdShot(s:DebtbreakerState,id:string,source?:string,amount?:number,targetId?:string|null):DebtbreakerState;
export function finishShot(s:DebtbreakerState,id:string,targetId?:string|null):DebtbreakerState;
export function tickContinuous(s:DebtbreakerState,seconds:number):DebtbreakerState;
export function refreshContinuous(s:DebtbreakerState):DebtbreakerState;
export function continuousSummary(s:DebtbreakerState):{held:number;spent:number;livingPaid:number;debtPaid:number;repairs:number;purchases:number;expansions:number;enjoyment:number;cashDifference:number;unpaid:number;debt:number;planned:number;adjustment:number;paid:number};
export function checkContinuous(s:DebtbreakerState):boolean;

export const EXPANSION_COST:number;
export const EXPANSION_CONDITION:number;
export const MAX_EXPANSIONS:number;
export function basePlan(s:DebtbreakerState):{goal:number;uncovered:number;surplus:number;cost:number;required:number;canExpand:boolean};

export const LIFESTYLE_TIERS:Record<number,string>;
export function lifestyleRequirements(tier:number):number[];
export function lifestyleCoverage(s:DebtbreakerState):{areas:{required:number;built:number;active:number;condition:number;maximum:number}[];required:number;active:number;complete:boolean;percent:number};
export function lifestyleOutflow(s:DebtbreakerState,tier?:number,adjustable?:number):number;
export function capitalShield(s:DebtbreakerState):{goal:number;charged:boolean;damageReduction:number};

export function impactThreat(s:DebtbreakerState,targetId:string):DebtbreakerState;

export function holdBlast(s:DebtbreakerState,id:string,source:string,amount:number):DebtbreakerState;
export function settleBlast(s:DebtbreakerState,id:string,targetId:string,packetRemaining:number):DebtbreakerState;

export function impactGroundPacket(s:DebtbreakerState,targetId:string,receipt:string,amount:number,targetAssetId?:string|null):DebtbreakerState;
export function markBlastContact(s:DebtbreakerState,id:string):DebtbreakerState;
