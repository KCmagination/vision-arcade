// Game-only translations. This module never reads or writes a financial ledger.
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const strength = n => n == null || !Number.isFinite(n) ? .5 : clamp(n, 0, 1);
export function createLoadout(corners) {
  return { fireRate: 2 + strength(corners.cashFlow) * 5, energyMax: 5 + Math.round(strength(corners.collateral) * 10), shieldRadius: 1.3 + strength(corners.capital) * 1.7, radar: 5 + strength(corners.credit) * 8, unknownCredit: corners.credit == null };
}
export function createSector(loadout) {
  const state = { phase: "ready", wave: 1, elapsed: 0, x: 0, z: 5, angle: Math.PI, energy: loadout.energyMax, shield: false, dash: 0, dashCooldown: 0, cooldown: 0, hitFlash: 0, stability: 3, kills: 0, blocks: 0, shotsFired: 0, shotsHit: 0, waveDelay: 0, uid: 0, enemies: [], shots: [], sparks: [], events: [] };
  spawnWave(state, 1); return state;
}
function spawnWave(s, wave) {
  const count = wave === 1 ? 5 : wave === 2 ? 7 : 5;
  for (let i = 0; i < count; i++) {
    const boss = wave === 3 && i === 0;
    s.enemies.push({ id: s.uid++, x: boss ? 0 : Math.cos(i * 2.4 + wave) * 6, z: boss ? -5.5 : Math.sin(i * 2.4 + wave) * 5 - 2, hp: boss ? 32 : wave + 1, maxHp: boss ? 32 : wave + 1, boss, cooldown: .6 + i * .4, hit: 0 });
  }
}
function burst(s, x, z, color) {
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; s.sparks.push({ x, z, y: .8, vx: Math.cos(a) * 3, vz: Math.sin(a) * 3, vy: 1 + (i % 3), life: .65, color }); }
  if (s.sparks.length > 160) s.sparks.splice(0, s.sparks.length - 160);
}
export function stepSector(s, controls, loadout, seconds) {
  s.events.length = 0;
  if (s.phase !== "playing") return;
  const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, .05);
  s.elapsed += dt; s.cooldown = Math.max(0, s.cooldown - dt); s.hitFlash = Math.max(0, s.hitFlash - dt); s.dash = Math.max(0, s.dash - dt); s.dashCooldown = Math.max(0, s.dashCooldown - dt);
  s.energy = Math.min(loadout.energyMax, s.energy + dt * 2.5); s.stability = Math.min(3, s.stability + dt * .14);
  let dx = clamp(controls.x || 0, -1, 1), dz = clamp(controls.z || 0, -1, 1), length = Math.hypot(dx, dz);
  if (length > 1) { dx /= length; dz /= length; }
  if (controls.dash && s.dashCooldown === 0 && length > 0) { s.dash = .2; s.dashCooldown = 2.8; s.events.push("dash"); }
  const speed = s.dash > 0 ? 15 : 4.4;
  s.x = clamp(s.x + dx * speed * dt, -8.2, 8.2); s.z = clamp(s.z + dz * speed * dt, -7.5, 7.5);
  s.shield = !!controls.shield && s.energy > .3;
  if (s.shield) s.energy = Math.max(0, s.energy - dt * 3);
  const nearest = s.enemies.reduce((best, e) => { const distance = Math.hypot(e.x - s.x, e.z - s.z); return distance <= loadout.radar && (!best || distance < best.distance) ? { enemy: e, distance } : best; }, null);
  const aim = controls.aim ?? (nearest ? { x: nearest.enemy.x, z: nearest.enemy.z } : null);
  if (aim) s.angle = Math.atan2(aim.x - s.x, aim.z - s.z);
  else if (length > 0 && !controls.fire) s.angle = Math.atan2(dx, dz);
  if (controls.fire && s.cooldown <= 0 && s.energy >= 1) {
    const vx = Math.sin(s.angle), vz = Math.cos(s.angle);
    s.shots.push({ x: s.x + vx * .65, z: s.z + vz * .65, vx: vx * 18, vz: vz * 18, life: 1.5, enemy: false });
    s.energy--; s.cooldown = 1 / loadout.fireRate; s.shotsFired++; s.events.push("fire");
  }
  for (const e of s.enemies) {
    e.hit = Math.max(0, e.hit - dt); e.cooldown -= dt;
    const ex = s.x - e.x, ez = s.z - e.z, distance = Math.hypot(ex, ez) || 1;
    if (!e.boss && distance > 2) { e.x += (ex / distance * .65 + Math.sin(s.elapsed + e.id) * .3) * dt; e.z += ez / distance * .65 * dt; }
    if (e.boss) e.x = Math.sin(s.elapsed * .4) * 3;
    if (e.cooldown <= 0) {
      e.cooldown = e.boss ? 1.1 : 3.6 + (e.id % 3) * .35;
      s.shots.push({ x: e.x, z: e.z, vx: ex / distance * (e.boss ? 5 : 3.4), vz: ez / distance * (e.boss ? 5 : 3.4), life: 6, enemy: true });
    }
  }
  for (const b of s.shots) {
    b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
    if (b.enemy) {
      const distance = Math.hypot(b.x - s.x, b.z - s.z);
      if (s.shield && distance < loadout.shieldRadius) { b.life = 0; s.blocks++; burst(s, b.x, b.z, "shield"); s.events.push("block"); }
      else if (distance < .55 && s.dash <= 0) { b.life = 0; if (s.hitFlash <= 0) { s.stability = Math.max(0, s.stability - 1); s.hitFlash = .8; s.events.push("hit"); if (s.stability <= 0) { s.stability = 3; s.hitFlash = 2; s.energy = Math.min(loadout.energyMax, s.energy + 2); s.events.push("recover"); } } }
    } else {
      const e = s.enemies.find(e => e.hp > 0 && Math.hypot(e.x - b.x, e.z - b.z) < (e.boss ? 1.2 : .6));
      if (e) { e.hp--; e.hit = .14; b.life = 0; s.shotsHit++; s.events.push("impact"); if (e.hp === 0) { s.kills++; s.energy = Math.min(loadout.energyMax, s.energy + 2); burst(s, e.x, e.z, e.boss ? "boss" : "drone"); s.events.push("kill"); } }
    }
  }
  s.enemies = s.enemies.filter(e => e.hp > 0); s.shots = s.shots.filter(b => b.life > 0 && Math.abs(b.x) < 12 && Math.abs(b.z) < 12);
  for (const p of s.sparks) { p.life -= dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vy -= dt * 9; }
  s.sparks = s.sparks.filter(p => p.life > 0);
  if (!s.enemies.length) {
    if (s.wave === 3) { s.phase = "complete"; s.events.push("complete"); }
    else { s.waveDelay += dt; if (s.waveDelay > 1.8) { s.wave++; s.waveDelay = 0; s.shots = []; s.energy = loadout.energyMax; spawnWave(s, s.wave); s.events.push("wave"); } }
  }
}
