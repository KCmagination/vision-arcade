import assert from "node:assert/strict";
import test from "node:test";
import { createLoadout, createSector, stepSector } from "../lib/arcade-engine.js";

const corners = n => Object.freeze({ cashFlow: n, capital: n, collateral: n, credit: n });
const idle = { x: 0, z: 0, fire: false, shield: false, dash: false };

test("minimum, maximum and unknown-credit loadouts can complete the same mission", () => {
  for (const signal of [corners(0), corners(1), { ...corners(.5), credit: null }]) {
    const before = structuredClone(signal), loadout = createLoadout(signal);
    for (const dt of [1 / 60, 1 / 20]) {
      const s = createSector(loadout); s.phase = "playing";
      for (let frame = 0; frame < 180 / dt && s.phase === "playing"; frame++) {
        const target = [...s.enemies].sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0];
        const distance = target ? Math.hypot(target.x - s.x, target.z - s.z) : 0;
        // Stay within the minimum signal ring and use the real auto-aim path.
        stepSector(s, { ...idle, x: distance > 3 ? (target.x - s.x) / distance : 0, z: distance > 3 ? (target.z - s.z) / distance : 0, fire: true }, loadout, dt);
        assert.ok(s.energy >= 0 && s.energy <= loadout.energyMax);
        assert.ok(Number.isFinite(s.x) && Number.isFinite(s.z));
      }
      assert.equal(s.phase, "complete", `loadout ${JSON.stringify(signal)}, dt ${dt}`);
      assert.equal(s.wave, 3); assert.equal(s.kills, 17); assert.equal(s.enemies.length, 0);
    }
    assert.deepEqual(signal, before, "game must leave corner signals unchanged");
  }
});

test("pause freezes the world, and a restart has independent clean state", () => {
  const l = createLoadout(corners(.5)), s = createSector(l); s.phase = "playing";
  stepSector(s, { ...idle, x: 1, fire: true }, l, .05);
  s.phase = "paused"; s.events = [];
  const before = structuredClone(s);
  stepSector(s, { ...idle, x: 1, fire: true, dash: true }, l, 60);
  assert.deepEqual(s, before);
  const fresh = createSector(l);
  assert.equal(fresh.phase, "ready"); assert.equal(fresh.kills, 0); assert.equal(fresh.energy, l.energyMax);
  assert.notEqual(fresh.enemies, s.enemies); assert.equal(fresh.elapsed, 0);
});

test("shield intercepts shots before damage; depleted stability recovers", () => {
  const l = createLoadout(corners(0)), s = createSector(l); s.phase = "playing";
  const shot = () => ({ x: s.x, z: s.z, vx: 0, vz: 0, life: 1, enemy: true });
  s.shots.push(shot()); stepSector(s, { ...idle, shield: true }, l, .02);
  assert.equal(s.blocks, 1); assert.equal(s.stability, 3);
  assert.ok(s.events.includes("block"));
  s.stability = .5; s.hitFlash = 0; s.shots.push(shot());
  stepSector(s, idle, l, .02);
  assert.equal(s.stability, 3); assert.ok(s.events.includes("recover"));
  assert.equal(s.phase, "playing");
});

test("dash has a cooldown and large frame gaps cannot move outside the sector", () => {
  const l = createLoadout(corners(.5)), s = createSector(l); s.phase = "playing";
  stepSector(s, { ...idle, x: 1, dash: true }, l, .05);
  const cooldown = s.dashCooldown;
  stepSector(s, { ...idle, x: 1, dash: true }, l, .05);
  assert.ok(s.dashCooldown < cooldown);
  const before = s.elapsed;
  stepSector(s, { ...idle, x: 1, z: 1 }, l, 1000);
  assert.ok(s.elapsed - before <= .0500001);
  for (let i = 0; i < 500; i++) stepSector(s, { ...idle, x: 1, z: 1 }, l, .05);
  assert.ok(s.x <= 8.2 && s.z <= 7.5);
});

test("unknown credit uses a labeled neutral reach and does not alter other forces", () => {
  const neutral = createLoadout(corners(.5));
  const unknown = createLoadout({ ...corners(.5), credit: null });
  assert.equal(unknown.unknownCredit, true); assert.equal(unknown.radar, neutral.radar);
  assert.deepEqual({ ...unknown, unknownCredit: false }, neutral);
});
