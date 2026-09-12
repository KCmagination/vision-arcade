import type { CornerStrengths } from "../components/avatar-stage";
export type Loadout = { fireRate: number; energyMax: number; shieldRadius: number; radar: number; unknownCredit: boolean };
export type Enemy = { id: number; x: number; z: number; hp: number; maxHp: number; boss: boolean; cooldown: number; hit: number };
export type Sector = { phase: "ready" | "playing" | "paused" | "complete"; wave: number; elapsed: number; x: number; z: number; angle: number; energy: number; shield: boolean; dash: number; dashCooldown: number; cooldown: number; hitFlash: number; stability: number; kills: number; blocks: number; shotsFired: number; shotsHit: number; waveDelay: number; uid: number; enemies: Enemy[]; shots: Array<{ x: number; z: number; vx: number; vz: number; life: number; enemy: boolean }>; sparks: Array<{ x: number; z: number; y: number; vx: number; vz: number; vy: number; life: number; color: string }>; events: string[] };
export type Controls = { x: number; z: number; fire: boolean; shield: boolean; dash: boolean; aim?: { x: number; z: number } | null };
export function createLoadout(corners: CornerStrengths): Loadout;
export function createSector(loadout: Loadout): Sector;
export function stepSector(state: Sector, controls: Controls, loadout: Loadout, seconds: number): void;
