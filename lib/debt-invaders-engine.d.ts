import type { CornerStrengths } from "../components/avatar-stage";
export const INVADERS_WIDTH: number;
export const INVADERS_HEIGHT: number;
export const SHIP_Y: number;
export const INVADERS_WAVES: number;
export type InvadersLoadout = { fireRate: number; shieldsMax: number; barrierCount: number; barrierHp: number; shipWidth: number; shipHeight: number; unknown: string[] };
export type InvadersState = {
  phase: "ready" | "playing" | "paused" | "complete" | "failed";
  wave: number; score: number; lives: number; shields: number; x: number; elapsed: number;
  cooldown: number; invulnerable: number; direction: number; enemyCooldown: number; waveDelay: number;
  uid: number; seed: number; kills: number; shotsFired: number; blocked: number; cause: string;
  enemies: Array<{id: number; x: number; y: number; row: number; col: number; hp: number; maxHp: number; flash: number}>;
  shots: Array<{x: number; y: number; vy: number; enemy: boolean; dead?: boolean}>;
  barriers: Array<{x: number; y: number; hp: number; maxHp: number}>;
  particles: Array<{x: number; y: number; vx: number; vy: number; life: number; color: string}>;
};
export function createInvadersLoadout(corners: CornerStrengths): InvadersLoadout;
export function createInvaders(loadout: InvadersLoadout): InvadersState;
export function stepInvaders(state: InvadersState, controls: {move: number; fire: boolean}, loadout: InvadersLoadout, seconds: number): void;
