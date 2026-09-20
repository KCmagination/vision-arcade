import { practiceScenario, startPlan, repay, settlePeriod, totalDebt } from './debtbreak-finance.js';
import { equipmentOnline } from './debtbreak-challenges.js';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const strength = n => n == null || !Number.isFinite(n) ? .5 : clamp(n, 0, 1);
export const PERIOD_SECONDS = 30;
export const RESERVE_STRIKE_CENTS = 10000;
export const ASSIST_STEP_CENTS = 10000;
export const ARENA = Object.freeze({ halfWidth: 16, halfDepth: 12, playerInset: .6, cornerRadius: 5.4, assistSeconds: 5 });
export const ARENA_CORNERS = Object.freeze([
  { x: -16, z: -12 }, { x: 16, z: -12 }, { x: 16, z: 12 }, { x: -16, z: 12 },
].map(Object.freeze));
export function withinCorner(x, z, pillar) {
  const corner = ARENA_CORNERS[pillar];
  return !!corner && Math.abs(x) <= ARENA.halfWidth && Math.abs(z) <= ARENA.halfDepth
    && Math.hypot(x - corner.x, z - corner.z) <= ARENA.cornerRadius;
}
// Small debt targets close the gap about 25% faster than the largest targets.
export const enemyMoveSpeed = enemy => .9 + .38 * (1 - clamp((enemy.size - .7) / 1.7, 0, 1));
// Combat mappings only. Financial strengths come from the existing private API.
export function createLoadout(corners, ltv = .7) {
  const cash = strength(corners.cashFlow), reserves = strength(corners.capital), equity = strength(corners.collateral);
  return { fireRate: 2 + cash * 5, energyMax: 6 + Math.round(cash * 18), reservesMax: 25 + Math.round(reserves * 75), assetsMax: 25 + Math.round(equity * 75), shieldRadius: 1.3 + reserves * 1.7, radar: 5 + strength(corners.credit) * 8, unknownCredit: corners.credit == null, avalancheReady: true, debtPressure: clamp(Number(ltv) || 0, 0, 1.5) };
}
const enemySize = balance => .7 + Math.min(1.7, Math.sqrt(balance / 100000));
export function createSector(loadout, plan = startPlan(practiceScenario(), 40000, 'snowball')) {
  const enemies = plan.ledger.debts.filter(d => d.balance > 0).map((d, i) => ({
    id: i, accountId: d.id, x: i % 2 ? 7 : -7, z: -5,
    hp: d.balance, maxHp: d.balance, boss: false, collector: false,
    cooldown: 2 + i, hit: 0, size: enemySize(d.balance), tier: 1, rate: d.apr,
  }));
  return { phase: 'ready', wave: plan.ledger.period, plan, elapsed: 0, totalElapsed: 0, x: 0, z: 5, angle: Math.PI,
    health: 100, energy: loadout.energyMax, reserves: plan.ledger.reserves / 100, assets: 0,
    shield: false, dash: 0, dashCooldown: 0, cooldown: 0, hitFlash: 0, assetFlash: 0,
    kills: 0, merges: 0, blocks: 0, collectorsStopped: 0, shotsFired: 0, shotsHit: 0,
    waveDelay: 0, spawnedThisWave: 0, uid: enemies.length, enemies, shots: [], sparks: [], events: [],
    bonusTime: 0, bonusMultiplier: 1, assist: null, assistQueue: [], assistsEarned: 0, assistVisit: -1,
    history: [], finishDelay: 0, ramTime: 0, ramHit: false, ramHeld: false, ramCooldown: 0, ramX: 0, ramZ: 0,
    ammoNotified: false, notice: 'Clear both debts. Repay on target to charge the corner refuges.', noticeTime: 6 };
}
function burst(s, x, z, color) {
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; s.sparks.push({ x, z, y: .8, vx: Math.cos(a) * 3, vz: Math.sin(a) * 3, vy: 1 + i % 3, life: .65, color }); }
  if (s.sparks.length > 160) s.sparks.splice(0, s.sparks.length - 160);
}
function damagePlayer(s) {
  if (s.hitFlash > 0 || s.phase !== 'playing') return;
  s.health = Math.max(0, s.health - 20); s.hitFlash = .8;
  burst(s, s.x, s.z, 'playerHit'); s.events.push('hit');
  if (s.health === 0) { s.phase = 'failed'; s.shield = false; s.events.push('gameOver'); }
}
export function finishSector(s) {
  if (s.phase !== 'playing' && s.phase !== 'victory') return;
  settlePeriod(s.plan); s.reserves = s.plan.ledger.reserves / 100;
  if (s.plan.ledger.challenge ? s.plan.ledger.period >= s.plan.ledger.challenge.duration : totalDebt(s.plan.ledger) === 0) { s.phase = 'complete'; s.events.push('complete'); }
  else { s.phase = 'payday'; s.events.push('payday'); }
}
export function resumeSector(s, loadout, plan) {
  if (s.phase !== 'payday') throw new Error('Resume only from a payday checkpoint.');
  s.history.push(structuredClone(s.plan));
  s.plan = plan; s.wave = plan.ledger.period; s.elapsed = 0; s.finishDelay = 0;
  s.reserves = plan.ledger.reserves / 100; s.energy = Math.min(s.energy, loadout.energyMax);
  s.ammoNotified = false; s.assistsEarned = 0; s.ramHeld = false;
  s.enemies = s.enemies.filter(e => {
    const debt = plan.ledger.debts.find(d => d.id === e.accountId);
    if (!debt || debt.balance === 0) return false;
    e.hp = debt.balance; e.maxHp = debt.balance; e.size = enemySize(debt.balance); return true;
  });
  // A newly accepted repair loan is a new payable account, with one matching target.
  for (const debt of plan.ledger.debts.filter(d => d.balance > 0)) {
    if (!s.enemies.some(e => e.accountId === debt.id)) s.enemies.push({ id: s.uid++, accountId: debt.id, x: 0, z: -7,
      hp: debt.balance, maxHp: debt.balance, boss: false, collector: false, cooldown: 3, hit: 0, size: enemySize(debt.balance), tier: 1, rate: debt.apr });
  }
  // Keep positions, projectiles, combat health and unfinished assists across payday.
  s.phase = totalDebt(plan.ledger) === 0 && !plan.ledger.challenge ? 'victory' : 'playing';
  s.notice = 'Payday allocated. Same battle, new choices.'; s.noticeTime = 5;
  return s;
}
export function summarizeSector(s) {
  const plans = [...s.history, s.plan];
  return {
    strategy: new Set(plans.map(p => p.strategy)).size === 1 ? s.plan.strategy : 'mixed',
    periods: plans.length, seconds: s.totalElapsed,
    savings: plans.reduce((sum, p) => sum + p.savings, 0),
    executed: plans.reduce((sum, p) => sum + p.executed, 0),
    reserveSpent: plans.reduce((sum, p) => sum + p.reserveSpent, 0),
    interest: plans.reduce((sum, p) => sum + p.start.interestPosted, 0),
    debt: totalDebt(s.plan.ledger), reserves: s.plan.ledger.reserves, unallocated: s.plan.remaining,
  };
}
export function hitAccount(s, e, amount, source = 'cash') {
  if (s.phase !== 'playing') return null;
  const result = repay(s.plan, e.accountId, amount, source);
  if (!result) return null;
  const debt = s.plan.ledger.debts.find(d => d.id === e.accountId);
  e.hp = debt.balance; e.size = enemySize(debt.balance); e.hit = .14;
  s.events.push('impact'); s.reserves = s.plan.ledger.reserves / 100;
  if (source === 'reserves') {
    s.notice = `Reserve strike: savings −$${(result.amount / 100).toFixed(2)} · debt −$${(result.amount / 100).toFixed(2)}.`;
    s.noticeTime = 5; burst(s, e.x, e.z, 'shield'); s.events.push('reserveStrike');
  }
  if (!result.correct) {
    const target = s.plan.ledger.debts.find(d => d.id === s.plan.targetId);
    s.notice = `Paid ${debt.name}. ${s.plan.strategy === 'avalanche' ? 'Avalanche' : 'Snowball'} target: ${target?.name ?? 'none'}${target ? ` · ${target.apr}% APR` : ''}.`;
    s.noticeTime = 4;
  }
  if (result.correct && s.assistsEarned < 4) {
    s.plan.ledger.assistProgress += result.amount;
    while (s.plan.ledger.assistProgress >= ASSIST_STEP_CENTS && s.assistsEarned < 4) {
      s.plan.ledger.assistProgress -= ASSIST_STEP_CENTS;
      const pillar = s.plan.ledger.assistIndex % 4;
      if (!s.assistQueue.includes(pillar)) s.assistQueue.push(pillar);
      s.plan.ledger.assistIndex++; s.assistsEarned++;
    }
    if (s.assistsEarned === 4) s.plan.ledger.assistProgress = 0;
  }
  if (result.cleared) {
    s.kills++; burst(s, e.x, e.z, 'drone'); s.events.push('kill');
    s.notice = `${debt.name} cleared. Monthly payment freed: $${(result.freed / 100).toFixed(0)}.`;
    if (result.bonus) {
      s.bonusTime = Math.max(s.bonusTime, result.bonus.seconds); s.bonusMultiplier = result.bonus.multiplier;
      s.notice += ' Faster-fire bonus earned; unused bonus time waits for ammunition.';
    } else {
      const target = s.plan.ledger.debts.find(d => d.id === s.plan.targetId);
      s.notice += ` Out of strategy order. Target: ${target?.name ?? 'none'}${target ? ` · ${target.apr}% APR` : ''}.`;
    }
    s.noticeTime = 6;
  }
  return result;
}
export function strikeAccount(s, e) {
  if (s.ramTime <= 0 || s.ramHit) return null;
  const result = hitAccount(s, e, RESERVE_STRIKE_CENTS, 'reserves');
  if (result) s.ramHit = true;
  return result;
}
export function stepSector(s, controls, loadout, seconds) {
  s.events.length = 0;
  const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, .05);
  if (s.phase === 'victory') {
    s.finishDelay += dt;
    for (const p of s.sparks) { p.life -= dt; p.x += p.vx * dt; p.z += p.vz * dt; }
    s.sparks = s.sparks.filter(p => p.life > 0);
    if (s.finishDelay >= 3) finishSector(s);
    return;
  }
  if (s.phase !== 'playing') return;
  s.elapsed += dt; s.totalElapsed += dt;
  for (const key of ['cooldown', 'hitFlash', 'dash', 'dashCooldown', 'noticeTime', 'ramTime', 'ramCooldown']) s[key] = Math.max(0, s[key] - dt);
  if (s.plan.remaining > 0) s.bonusTime = Math.max(0, s.bonusTime - dt);
  s.energy = Math.min(loadout.energyMax, s.energy + dt * (1.8 + loadout.fireRate * .12));
  let dx = clamp(controls.x || 0, -1, 1), dz = clamp(controls.z || 0, -1, 1), length = Math.hypot(dx, dz);
  if (length > 1) { dx /= length; dz /= length; }
  const chosen = s.enemies.find(e => e.hp > 0 && e.accountId === controls.targetId);
  const nearest = s.enemies.filter(e => e.hp > 0).sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0];
  const target = chosen || nearest;
  const aim = controls.aim || (target ? { x: target.x, z: target.z } : null);
  if (aim) s.angle = Math.atan2(aim.x - s.x, aim.z - s.z);
  else if (length && !controls.fire) s.angle = Math.atan2(dx, dz);
  const wantsRam = !!controls.ram || (!!controls.shield && !!controls.dash);
  if (wantsRam && !s.ramHeld && s.ramCooldown <= 0) {
    if (Math.min(s.plan.reserveRemaining, s.plan.ledger.reserves) > 0) {
      s.ramTime = .35; s.ramCooldown = 3; s.ramHit = false;
      s.ramX = length ? dx : Math.sin(s.angle); s.ramZ = length ? dz : Math.cos(s.angle);
      s.events.push('dash');
    } else { s.notice = 'Reserve strike unavailable. Set a savings limit at payday.'; s.noticeTime = 4; }
  }
  s.ramHeld = wantsRam;
  if (controls.dash && !wantsRam && !s.dashCooldown && length > 0) { s.dash = .2; s.dashCooldown = 2.8; s.events.push('dash'); }
  const speed = s.dash > 0 ? 15 : 4.4;
  s.x = clamp(s.x + (s.ramTime > 0 ? s.ramX * 15 : dx * speed) * dt, -ARENA.halfWidth + ARENA.playerInset, ARENA.halfWidth - ARENA.playerInset);
  s.z = clamp(s.z + (s.ramTime > 0 ? s.ramZ * 15 : dz * speed) * dt, -ARENA.halfDepth + ARENA.playerInset, ARENA.halfDepth - ARENA.playerInset);
  const occupiedCorner = ARENA_CORNERS.findIndex((_, i) => withinCorner(s.x, s.z, i));
  if (occupiedCorner !== s.assistVisit) s.assistVisit = -1;
  if (!s.assist && occupiedCorner >= 0 && s.assistVisit !== occupiedCorner && s.assistQueue.includes(occupiedCorner)) {
    s.assistQueue.splice(s.assistQueue.indexOf(occupiedCorner), 1);
    s.assist = { pillar: occupiedCorner, remaining: ARENA.assistSeconds, ...ARENA_CORNERS[occupiedCorner], tick: 0, rays: [] };
    s.assistVisit = occupiedCorner;
    s.events.push('assist'); s.notice = 'Corner support: five seconds. Keep your escape route open.'; s.noticeTime = 5;
  }
  const field = s.assist;
  if (field) {
    field.remaining -= dt; field.tick -= dt;
    field.rays = (field.rays || []).map(ray => ({ ...ray, life: ray.life - dt })).filter(ray => ray.life > 0);
    const near = withinCorner(s.x, s.z, field.pillar);
    if (field.pillar === 1 && near) s.health = Math.min(100, s.health + dt * 7);
    if (near && (field.pillar === 0 || field.pillar === 3) && field.tick <= 0) {
      field.tick = field.pillar === 0 ? .7 : 1;
      s.shots = s.shots.filter(b => {
        if (!b.enemy || !withinCorner(b.x, b.z, field.pillar)) return true;
        if (field.rays.length < 8) field.rays.push({ x: b.x, z: b.z, life: .3 });
        burst(s, b.x, b.z, 'shield'); s.blocks++; s.events.push('block'); return false;
      });
    }
    if (field.remaining <= 0) {
      s.assist = null;
      if (occupiedCorner === field.pillar) s.assistVisit = occupiedCorner;
    }
  }
  const equipmentCover = equipmentOnline(s.plan.ledger) && Math.hypot(s.x, s.z) <= 3;
  if (equipmentCover) s.plan.ledger.challenge.supportSeconds += dt;
  const cover = (s.assist?.pillar === 2 && withinCorner(s.x, s.z, 2)) || equipmentCover;
  const creditSupport = s.assist?.pillar === 3 && withinCorner(s.x, s.z, 3);
  const personalShield = s.ramTime > 0 || (!!controls.shield && s.energy > .3);
  s.shield = cover || s.ramTime > 0 || (!!controls.shield && s.energy > .3);
  if (s.shield && !cover && s.ramTime <= 0) s.energy = Math.max(0, s.energy - dt * 3);
  if (controls.fire && s.cooldown <= 0 && s.energy >= 1 && s.plan.remaining > 0) {
    const vx = Math.sin(s.angle), vz = Math.cos(s.angle);
    s.shots.push({ x: s.x + vx * .65, z: s.z + vz * .65, vx: vx * 18, vz: vz * 18, life: 2.6, enemy: false });
    s.energy--; s.cooldown = 1 / (loadout.fireRate * (s.bonusTime > 0 ? s.bonusMultiplier : 1));
    s.shotsFired++; s.events.push('fire');
  }
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    e.hit = Math.max(0, e.hit - dt); e.cooldown -= dt;
    const ex = s.x - e.x, ez = s.z - e.z, distance = Math.hypot(ex, ez), divisor = distance || 1;
    const disrupted = creditSupport && withinCorner(e.x, e.z, 3);
    if (!disrupted) { const pursuit = enemyMoveSpeed(e); e.x += ex / divisor * pursuit * dt; e.z += ez / divisor * pursuit * dt; }
    if (e.cooldown <= 0 && distance < 10 && !disrupted) {
      s.shots.push({ x: e.x, z: e.z, vx: ex / divisor * 3.6, vz: ez / divisor * 3.6, life: 4, enemy: true });
      e.cooldown = 2.6; s.events.push('enemyFire');
    }
    if (distance < .42 + e.size * .3 + (s.ramTime > 0 ? .4 : 0)) {
      if (s.ramTime > 0) strikeAccount(s, e);
      if (s.shield) { e.x -= ex / divisor * dt * 4; e.z -= ez / divisor * dt * 4; }
      else if (s.dash <= 0) { damagePlayer(s); e.x -= ex / divisor * 1.8; e.z -= ez / divisor * 1.8; }
    }
  }
  // Keep physical targets distinct when their pursuit paths converge. Never merge balances.
  for (let i = 0; i < s.enemies.length; i++) for (let j = i + 1; j < s.enemies.length; j++) {
    const a = s.enemies[i], b = s.enemies[j]; if (a.hp <= 0 || b.hp <= 0) continue;
    const ax = b.x - a.x, az = b.z - a.z, gap = Math.hypot(ax, az), desired = .6 + (a.size + b.size) * .7;
    if (gap >= desired) continue;
    const push = Math.min((desired - gap) / 2, dt * 1.5), nx = gap > .001 ? ax / gap : 1, nz = gap > .001 ? az / gap : 0;
    if (!(creditSupport && withinCorner(a.x, a.z, 3))) { a.x -= nx * push; a.z -= nz * push; }
    if (!(creditSupport && withinCorner(b.x, b.z, 3))) { b.x += nx * push; b.z += nz * push; }
  }
  for (const e of s.enemies) {
    const inset = .42 + e.size * .3;
    e.x = clamp(e.x, -ARENA.halfWidth + inset, ARENA.halfWidth - inset);
    e.z = clamp(e.z, -ARENA.halfDepth + inset, ARENA.halfDepth - inset);
  }
  const reserveRatio = clamp(s.plan.ledger.reserves / Math.max(1, s.plan.start.reserves + s.plan.savings), 0, 1);
  const shieldRadius = loadout.shieldRadius * (.6 + .4 * Math.sqrt(reserveRatio));
  for (const b of s.shots) {
    if (s.phase !== 'playing') break;
    b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
    if (b.enemy) {
      const distance = Math.hypot(b.x - s.x, b.z - s.z);
      if ((equipmentCover && Math.hypot(b.x, b.z) <= 3) || (s.assist?.pillar === 2 && withinCorner(s.x, s.z, 2) && withinCorner(b.x, b.z, 2)) || (personalShield && distance < shieldRadius)) { b.life = 0; s.blocks++; burst(s, b.x, b.z, 'shield'); s.events.push('block'); }
      else if (distance < .58 && s.dash <= 0) { b.life = 0; damagePlayer(s); }
      continue;
    }
    const e = s.enemies.find(e => e.hp > 0 && Math.hypot(e.x - b.x, e.z - b.z) < .42 + e.size * .25);
    if (e) {
      b.life = 0;
      if (hitAccount(s, e, Math.max(1, Math.ceil(s.plan.ledger.campaignDebt / 120)))) s.shotsHit++;
    }
  }
  s.enemies = s.enemies.filter(e => e.hp > 0);
  s.shots = s.shots.filter(b => b.life > 0 && Math.abs(b.x) < ARENA.halfWidth + 4 && Math.abs(b.z) < ARENA.halfDepth + 4);
  for (const p of s.sparks) { p.life -= dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vy -= dt * 9; }
  s.sparks = s.sparks.filter(p => p.life > 0);
  if (s.phase !== 'playing') return;
  if (!s.enemies.length) {
    if (s.plan.ledger.challenge) { finishSector(s); return; }
    s.phase = 'victory'; s.finishDelay = 0; s.shots = []; s.shield = false;
    s.notice = 'LEVEL CLEAR · Every debt target eliminated.'; s.noticeTime = 4; s.events.push('victory');
  } else if (s.elapsed >= PERIOD_SECONDS) finishSector(s);
  else if (s.plan.remaining === 0 && !s.ammoNotified) {
    s.ammoNotified = true; s.notice = 'Cash-flow ammunition depleted. Use a reserve strike or defend until payday.'; s.noticeTime = 7;
  }
}
