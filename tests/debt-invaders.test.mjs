import assert from "node:assert/strict";
import test from "node:test";
import { createInvaders, createInvadersLoadout, stepInvaders, SHIP_Y } from "../lib/debt-invaders-engine.js";

const corners = n => ({cashFlow:n, capital:n, collateral:n, credit:n});
const idle = {move:0, fire:false};
const run = (l, edits = {}) => { const s = createInvaders(l); s.phase = "playing"; Object.assign(s, edits); return s; };
const hit = (s, l, offset = 0) => {
  s.invulnerable = 0; s.shots = [{x:s.x + offset, y:SHIP_Y - 30, vy:800, enemy:true}];
  stepInvaders(s, idle, l, .05);
};

test("each financial corner changes only its requested game mechanic, without mutating inputs", () => {
  const inputs = Object.freeze(corners(0));
  const low = createInvadersLoadout(inputs), high = createInvadersLoadout(corners(1));
  assert.ok(high.fireRate > low.fireRate);
  assert.ok(high.shieldsMax > low.shieldsMax);
  assert.ok(high.barrierCount > low.barrierCount && high.barrierHp > low.barrierHp);
  assert.ok(high.shipWidth < low.shipWidth && high.shipHeight < low.shipHeight);
  const affected = {cashFlow:["fireRate"],capital:["shieldsMax"],collateral:["barrierCount","barrierHp"],credit:["shipWidth","shipHeight"]};
  for (const [corner, keys] of Object.entries(affected)) {
    const changed = createInvadersLoadout({...inputs,[corner]:1});
    for (const key of Object.keys(low)) if (!keys.includes(key)) assert.deepEqual(changed[key],low[key]);
  }
  const unknown = createInvadersLoadout({...corners(.5),credit:null});
  assert.equal(unknown.shipWidth, createInvadersLoadout(corners(.5)).shipWidth);
  assert.deepEqual(unknown.unknown,["credit"]);
  assert.deepEqual(inputs,corners(0));
});

test("cash flow increases actual firing cadence at both high and low frame rates", () => {
  for (const dt of [1/120, 1/20]) {
    const totals = [0,1].map(cashFlow => {
      const l = createInvadersLoadout({...corners(0),cashFlow}), s = run(l);
      for (let i = 0; i < Math.ceil(2/dt); i++) stepInvaders(s,{...idle,fire:true},l,dt);
      return s.shotsFired;
    });
    assert.ok(totals[0] >= 3);
    assert.ok(totals[1] > totals[0] * 2);
  }
});

test("capital shields absorb hits, hull damage eventually causes a permanent Game Over", () => {
  const l = createInvadersLoadout({...corners(0),capital:.5}), s = run(l);
  for (let i = 0; i < l.shieldsMax; i++) hit(s,l);
  assert.equal(s.shields,0); assert.equal(s.lives,3);
  for (let i = 0; i < 3; i++) hit(s,l);
  assert.equal(s.phase,"failed"); assert.equal(s.lives,0);
  const before = structuredClone(s);
  stepInvaders(s,{move:1,fire:true},l,10);
  assert.deepEqual(s,before);
});

test("better credit reduces the real hitbox so a grazing shot misses the small ship", () => {
  for (const [credit, expectedLives] of [[0,2],[1,3]]) {
    const l = createInvadersLoadout({...corners(0),credit}), s = run(l);
    hit(s,l,22);
    assert.equal(s.lives,expectedLives);
  }
});

test("collateral creates destructible barriers; cover intercepts shots before the ship", () => {
  const l = createInvadersLoadout(corners(1)), s = run(l);
  const b = s.barriers[0], before = b.hp;
  s.x = b.x;
  for (let i = 0; i < before; i++) {
    s.shots = [{x:b.x,y:b.y - 25,vy:800,enemy:true}];
    stepInvaders(s,idle,l,.05);
    assert.equal(s.shields,l.shieldsMax); assert.equal(s.lives,3);
  }
  assert.ok(!s.barriers.includes(b));
  const own = s.barriers.find(b => b.y === 564);
  const hp = own.hp;
  s.shots = [{x:own.x,y:own.y + 25,vy:-800,enemy:false}];
  stepInvaders(s,idle,l,.05);
  assert.equal(own.hp,hp-1);
});

test("swept shots hit enemies at low frame rates, score once and finish the last wave", () => {
  const l = createInvadersLoadout(corners(0)), s = run(l,{wave:3});
  const e = s.enemies.at(-1); s.enemies = [e];
  s.shots = [{x:e.x,y:e.y+40,vy:-1500,enemy:false},{x:e.x,y:e.y+40,vy:-1500,enemy:false}];
  stepInvaders(s,idle,l,.05);
  assert.equal(s.kills,1); assert.equal(s.score,10); assert.equal(s.phase,"complete");
});

test("wave progression keeps damage, a breach loses even with full shields, pause and restart work", () => {
  const l = createInvadersLoadout(corners(1)), s = run(l);
  s.shields = 2; s.lives = 1; s.barriers = s.barriers.slice(0,4);
  for (let wave = 1; wave <= 2; wave++) {
    s.enemies = [];
    for (let i = 0; i < 34; i++) stepInvaders(s,idle,l,.05);
    assert.equal(s.wave,wave+1); assert.equal(s.shields,2); assert.equal(s.lives,1); assert.equal(s.barriers.length,4);
  }
  s.phase = "paused";
  const before = structuredClone(s); stepInvaders(s,{move:1,fire:true},l,50); assert.deepEqual(s,before);
  s.phase = "playing"; s.shields = l.shieldsMax; s.enemies[0].y = 612;
  stepInvaders(s,idle,l,.05); assert.equal(s.phase,"failed"); assert.match(s.cause,/breached/);
  const fresh = createInvaders(l); assert.equal(fresh.phase,"ready"); assert.equal(fresh.score,0); assert.equal(fresh.lives,3);
  assert.equal(fresh.shields,l.shieldsMax); assert.equal(fresh.enemies.length,32);
  assert.notEqual(fresh.barriers,s.barriers);
});

test("idle players can lose organically and simulation stays finite at every strength", () => {
  for (const n of [0,.5,1]) {
    const l = createInvadersLoadout(corners(n)), s = run(l);
    for (let frame = 0; frame < 10000 && s.phase === "playing"; frame++) stepInvaders(s,idle,l,.05);
    assert.equal(s.phase,"failed"); assert.ok(Number.isFinite(s.x));
    assert.ok(s.shots.length < 100); assert.ok(s.particles.length <= 180);
  }
});
