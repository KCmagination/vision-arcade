export const MAX_ACTIVE_FRAME_SECONDS:number;
export const INTERRUPTION_NOTICE:string;
export function createFrameClock():{last:number|null};
export function readFrameClock(clock:{last:number|null},now:number,active:boolean):{seconds:number;interrupted:boolean};
