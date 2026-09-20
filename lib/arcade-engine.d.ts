import type { CornerStrengths } from "../components/avatar-stage";
export type Loadout = { fireRate: number; energyMax: number; reservesMax: number; assetsMax: number; shieldRadius: number; radar: number; unknownCredit: boolean; avalancheReady: boolean; debtPressure: number };
export type Enemy = { id: number; accountId: string; x: number; z: number; hp: number; maxHp: number; boss: boolean; collector: boolean; cooldown: number; hit: number; size: number; tier: number; rate: number };
import type { Plan } from "./debtbreak-finance";
export type Sector = { plan: Plan; history: Plan[]; totalElapsed: number; ramTime: number; ramHit: boolean; ramHeld: boolean; ramCooldown: number; ramX: number; ramZ: number; ammoNotified: boolean; assistQueue: number[]; assistsEarned: number; assistVisit: number; health: number; bonusTime: number; bonusMultiplier: number; assist: null | { pillar: number; remaining: number; x: number; z: number; tick: number; rays: Array<{ x: number; z: number; life: number }> }; finishDelay: number; notice: string; noticeTime: number; phase: "ready" | "playing" | "paused" | "payday" | "victory" | "complete" | "failed"; wave: number; elapsed: number; x: number; z: number; angle: number; energy: number; reserves: number; assets: number; shield: boolean; dash: number; dashCooldown: number; cooldown: number; hitFlash: number; assetFlash: number; kills: number; merges: number; blocks: number; collectorsStopped: number; shotsFired: number; shotsHit: number; waveDelay: number; spawnedThisWave: number; uid: number; enemies: Enemy[]; shots: Array<{ x: number; z: number; vx: number; vz: number; life: number; enemy: boolean; damage?: number; avalanche?: boolean }>; sparks: Array<{ x: number; z: number; y: number; vx: number; vz: number; vy: number; life: number; color: string }>; events: string[] };
export type Controls = { x: number; z: number; fire: boolean; shield: boolean; dash: boolean; avalanche?: boolean; ram?: boolean; targetId?: string | null; aim?: { x: number; z: number } | null };
export function createLoadout(corners: CornerStrengths, ltv?: number | null): Loadout;
export function createSector(loadout: Loadout, plan?: Plan): Sector;
export function stepSector(state: Sector, controls: Controls, loadout: Loadout, seconds: number): void;

export function finishSector(state: Sector): void;
export function hitAccount(state: Sector, enemy: Enemy, amount: number, source?: 'cash' | 'reserves'): ReturnType<typeof import("./debtbreak-finance").repay>;

export const PERIOD_SECONDS: number;
export const RESERVE_STRIKE_CENTS: number;
export const ASSIST_STEP_CENTS: number;
export function resumeSector(state: Sector, loadout: Loadout, plan: Plan): Sector;
export function strikeAccount(state: Sector, enemy: Enemy): ReturnType<typeof import("./debtbreak-finance").repay>;

export const ARENA: Readonly<{ halfWidth: number; halfDepth: number; playerInset: number; cornerRadius: number; assistSeconds: number }>;
export const ARENA_CORNERS: ReadonlyArray<Readonly<{ x: number; z: number }>>;
export function withinCorner(x: number, z: number, pillar: number): boolean;
export function enemyMoveSpeed(enemy: Enemy): number;

export type AttemptSummary = { strategy: string; periods: number; seconds: number; savings: number; executed: number; reserveSpent: number; interest: number; debt: number; reserves: number; unallocated: number };
export function summarizeSector(state: Sector): AttemptSummary;
