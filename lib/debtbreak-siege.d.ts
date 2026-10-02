import type {DebtbreakerState,Threat} from './debtbreaker-engine.js';
import type {CombatEvent,Drone} from './debtbreaker-combat.js';
export type SiegeActor={extra?:boolean;hp?:number;maxHp?:number;id:string;target:Threat;slot:number;remaining:number;original:number;x:number;z:number;radius:number;angle:number;visible:boolean;warning:boolean;highRate:boolean;entryIn:number;impactAt:number;rate:number|null};
export type GroundFlight={id:string;x:number;z:number;tx:number;tz:number;born:number;source:string};
export type GroundBlast={id:string;x:number;z:number;born:number;radius:number;hitIds:string[];source:string};
export type SiegeWorld={selectedGun?:number;ground?:{towerCooldowns?:number[];streamVersion?:number;nextEntry?:number;laneSerial?:number;streamSerial?:number;extraKey?:string|null;extraTarget?:Threat|null;projectiles:GroundFlight[];blasts:GroundBlast[];beams:{tower:number;x:number;z:number;born:number;paid:number}[];towerCursor:number;autoCooldown:number};ledger:DebtbreakerState;sentinel:{x:number;z:number;facing:number;mode:string;targetId:string|null;cooldown:number;swingLeft:number;struck:boolean;cleared:number;charges:number;powerActive:boolean;queuedId:string|null;powerStrikes:number};pace:string;formationSerial:number;time:number;accumulator:number;settleUntil:number;angle:number;aim:{x:number;z:number};source:'auto'|'income'|'reserve';weapon:'intercept'|'rapid';autoFire:boolean;assist:boolean;lockedId:string|null;hoveredId:string|null;triggers:Record<string,boolean>;pendingShot:boolean;firing:boolean;cooldown:number;bullets:{id:number;x:number;z:number;dx:number;dz:number;source:'income'|'reserve';rejection:boolean;weapon:string;travel:number}[];effects:CombatEvent[];events:CombatEvent[];serial:number;shots:number;hits:number;misses:number;drones:(Drone & {original:number;formationSlot:number;extra?:boolean;hp?:number;maxHp?:number;enteredAt?:number|null;entryAt?:number;impactAt?:number;z?:number;lane?:number})[];formationPeriod:number};
export const TURRET:{x:number;z:number};
export function radarSeconds(s:DebtbreakerState):number;
export function createCombat(s:DebtbreakerState,pace?:string):SiegeWorld;
export function invaderPosition(progress:number,slot?:number):{x:number;z:number;radius:number;angle:number};
export function combatActors(w:SiegeWorld,time?:number):SiegeActor[];
export function setAim(w:SiegeWorld,x:number,z:number):void;
export function aimAtTarget(w:SiegeWorld,id:string):void;
export function setWeapon(w:SiegeWorld,weapon:'intercept'|'rapid'):void;
export function setTrigger(w:SiegeWorld,source:string,active:boolean):void;
export function clearTriggers(w:SiegeWorld):void;
export function advanceCombat(w:SiegeWorld,seconds:number):SiegeWorld;
export function reserveDepositBlocked(w?:SiegeWorld):boolean;

export function commandSword(w:SiegeWorld,id?:string):boolean;
export function commandSwordAt(w:SiegeWorld,x:number,z:number):boolean;

export const UTILITANK_SPEED:number;
export const DEBTONATOR_SPEED:number;
export const SWORD_CLEARS_PER_POWER:number;
export const SWORD_POWER_RADIUS:number;

export const TOTEMS:{x:number;z:number;label:string;color:string}[];

export function quietCommandTail(w:SiegeWorld):boolean;
