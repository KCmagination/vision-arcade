export const MAX_ACTIVE_FRAME_SECONDS:number;
export const INTERRUPTION_NOTICE:string;
export function createFrameClock():{last:number|null};
export function readFrameClock(clock:{last:number|null},now:number,active:boolean):{seconds:number;interrupted:boolean};
export function paydayClock(s:import('./debtbreaker-engine.js').DebtbreakerState):{seconds:number;label:string;time:string;amount:number;paused:boolean};

export function needsCombatRefresh(before:import('./debtbreaker-engine.js').DebtbreakerState,after:import('./debtbreaker-engine.js').DebtbreakerState,sinceHud:number):boolean;
