import type {DebtbreakerState} from './debtbreaker-engine.js';
type Quote={cost:number;after:number;available:number;shortfall:number;ready:boolean;progress:number};
export function groundReadiness(s:DebtbreakerState):{wall:Quote&{complete:boolean;losesShield:boolean};module:Quote&{upkeep:number}};
