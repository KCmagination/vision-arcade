// Arcade tuning only: consumes normalized corner strengths, never financial inputs.
export const INVADERS_WIDTH = 720;
export const INVADERS_HEIGHT = 720;
export const SHIP_Y = 652;
export const INVADERS_WAVES = 3;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const strength = v => Number.isFinite(v) ? clamp(v, 0, 1) : .5;

export function createInvadersLoadout(corners) {
  const cash = strength(corners.cashFlow), capital = strength(corners.capital);
  const collateral = strength(corners.collateral), credit = strength(corners.credit);
  return {
    fireRate: 2 + cash * 6,
    shieldsMax: Math.round(capital * 8),
    barrierCount: Math.ceil(collateral * 4),
    barrierHp: 1 + Math.floor(collateral * 2),
    shipWidth: 58 - credit * 34,
    shipHeight: (58 - credit * 34) * .65,
    unknown: Object.keys(corners).filter(key => !Number.isFinite(corners[key])),
  };
}

function formation(s) {
  s.enemies = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
    const hp = row === 0 && s.wave > 1 ? 2 : 1;
    s.enemies.push({ id: s.uid++, x: 122 + col * 68, y: 105 + row * 57,
      row, col, hp, maxHp: hp, flash: 0 });
  }
  s.direction = 1;
  s.enemyCooldown = 1.3;
  s.waveDelay = 0;
  s.shots = [];
}

export function createInvaders(loadout) {
  const s = { phase: "ready", wave: 1, score: 0, lives: 3, shields: loadout.shieldsMax,
    x: INVADERS_WIDTH / 2, elapsed: 0, cooldown: 0, invulnerable: 0,
    direction: 1, enemyCooldown: 1.3, waveDelay: 0, uid: 0, seed: 173,
    kills: 0, shotsFired: 0, blocked: 0, cause: "", enemies: [], shots: [], barriers: [], particles: [] };
  for (let i = 0; i < loadout.barrierCount; i++) {
    const center = (i + 1) * INVADERS_WIDTH / (loadout.barrierCount + 1);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 7; col++) {
      if ((row === 0 && (col === 0 || col === 6)) || (row >= 2 && col >= 2 && col <= 4)) continue;
      s.barriers.push({ x: center + (col - 3) * 12, y: 528 + row * 12,
        hp: loadout.barrierHp, maxHp: loadout.barrierHp });
    }
  }
  formation(s);
  return s;
}

function burst(s, x, y, color) {
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    s.particles.push({ x, y, vx: Math.cos(a) * (60 + i * 8), vy: Math.sin(a) * (60 + i * 8), life: .45, color });
  }
  if (s.particles.length > 180) s.particles.splice(0, s.particles.length - 180);
}

// Swept collision avoids missed hits at low frame rates. Drawing and collision share dimensions.
function crossing(shot, oldY, x, y, width, height) {
  if (Math.abs(shot.x - x) > width / 2 + 2) return Infinity;
  const top = y - height / 2 - 5, bottom = y + height / 2 + 5;
  if (Math.max(oldY, shot.y) < top || Math.min(oldY, shot.y) > bottom) return Infinity;
  return clamp((shot.vy > 0 ? top - oldY : oldY - bottom) / Math.max(.001, Math.abs(shot.y - oldY)), 0, 1);
}

export function stepInvaders(s, controls, loadout, seconds) {
  if (s.phase !== "playing") return;
  const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, .05);
  if (!dt) return;
  s.elapsed += dt;
  s.cooldown = Math.max(0, s.cooldown - dt);
  s.invulnerable = Math.max(0, s.invulnerable - dt);
  s.x = clamp(s.x + clamp(controls.move || 0, -1, 1) * 340 * dt,
    loadout.shipWidth / 2 + 12, INVADERS_WIDTH - loadout.shipWidth / 2 - 12);
  for (const p of s.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  s.particles = s.particles.filter(p => p.life > 0);

  if (!s.enemies.length) {
    s.shots = [];
    if (s.wave === INVADERS_WAVES) { s.phase = "complete"; return; }
    s.waveDelay += dt;
    if (s.waveDelay >= 1.6) { s.wave++; formation(s); }
    return;
  }
  if (controls.fire && s.cooldown <= 0) {
    s.shots.push({ x: s.x, y: SHIP_Y - loadout.shipHeight / 2 - 5, vy: -620, enemy: false });
    s.shotsFired++;
    s.cooldown = 1 / loadout.fireRate;
  }

  const speed = 21 + s.wave * 7 + (1 - s.enemies.length / 32) * 78;
  let edge = false;
  for (const e of s.enemies) {
    e.x += s.direction * speed * dt;
    e.flash = Math.max(0, e.flash - dt);
    if (e.x < 32 || e.x > INVADERS_WIDTH - 32) edge = true;
  }
  if (edge) {
    const overshoot = s.direction > 0 ? Math.max(...s.enemies.map(e => e.x)) - (INVADERS_WIDTH - 32)
      : Math.min(...s.enemies.map(e => e.x)) - 32;
    for (const e of s.enemies) { e.x -= overshoot; e.y += 23; }
    s.direction *= -1;
  }
  for (const e of s.enemies) {
    for (const b of s.barriers) if (b.hp > 0 && Math.abs(e.x - b.x) < 27 && Math.abs(e.y - b.y) < 21) {
      b.hp = 0; burst(s, b.x, b.y, "#ffc16e");
    }
    if (e.y + 15 >= 612) { s.phase = "failed"; s.cause = "The invaders breached your defense line."; return; }
  }

  s.enemyCooldown -= dt;
  if (s.enemyCooldown <= 0) {
    const bottom = new Map();
    for (const e of s.enemies) if (!bottom.has(e.col) || bottom.get(e.col).y < e.y) bottom.set(e.col, e);
    const shooters = [...bottom.values()];
    s.seed = (s.seed * 16807) % 2147483647;
    const e = shooters[s.seed % shooters.length];
    s.shots.push({ x: e.x, y: e.y + 20, vy: 185 + s.wave * 28, enemy: true });
    s.enemyCooldown = Math.max(.38, 1.0 - s.wave * .13 - (1 - s.enemies.length / 32) * .25);
  }

  for (const shot of s.shots) {
    const oldY = shot.y;
    shot.y += shot.vy * dt;
    let target = null, kind = "", nearest = Infinity;
    const consider = (item, type, x, y, width, height) => {
      const t = crossing(shot, oldY, x, y, width, height);
      if (t < nearest) { nearest = t; target = item; kind = type; }
    };
    for (const b of s.barriers) if (b.hp > 0) consider(b, "barrier", b.x, b.y, 12, 12);
    if (shot.enemy) consider(s, "player", s.x, SHIP_Y, loadout.shipWidth, loadout.shipHeight);
    else for (const e of s.enemies) if (e.hp > 0) consider(e, "enemy", e.x, e.y, 38, 28);
    if (!target) continue;
    shot.dead = true;
    if (kind === "barrier") { target.hp--; burst(s, target.x, target.y, "#ffc16e"); if (shot.enemy) s.blocked++; }
    else if (kind === "enemy") {
      target.hp--; target.flash = .12;
      burst(s, target.x, target.y, target.hp ? "#ffffff" : "#ff9e78");
      if (!target.hp) { s.kills++; s.score += (4 - target.row) * 10; }
    } else if (s.invulnerable <= 0) {
      const shielded = s.shields > 0;
      if (shielded) { s.shields--; s.blocked++; } else s.lives--;
      s.invulnerable = .8;
      burst(s, s.x, SHIP_Y, shielded ? "#69e3b2" : "#ff6d7e");
      if (s.lives <= 0) { s.phase = "failed"; s.cause = "Your ship was destroyed."; break; }
    }
  }
  s.enemies = s.enemies.filter(e => e.hp > 0);
  s.shots = s.shots.filter(b => !b.dead && b.y > -20 && b.y < INVADERS_HEIGHT + 20);
  s.barriers = s.barriers.filter(b => b.hp > 0);
  if (s.phase === "playing" && !s.enemies.length && s.wave === INVADERS_WAVES) s.phase = "complete";
}
