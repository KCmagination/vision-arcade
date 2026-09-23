import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ATTRIBUTE_DURATION_MS, ATTRIBUTE_SEQUENCE, sampleAttributeCycle } from "../lib/sentinel-showcase-cycle.js";

test("demo cycles shield, sword, credit, armor with matching low-high-low power", () => {
  assert.deepEqual(ATTRIBUTE_SEQUENCE.map(a => a.corner), ["capital", "cashFlow", "credit", "collateral"]);
  for (let i = 0; i < 4; i++) {
    const start = i * ATTRIBUTE_DURATION_MS;
    const corner = ATTRIBUTE_SEQUENCE[i].corner;
    for (const [offset, expected] of [[0, 0], [2000, .5], [4000, 1], [6000, .5], [7900, 0]]) {
      const frame = sampleAttributeCycle(start + offset);
      assert.equal(frame.corner, corner);
      assert.ok(Math.abs(frame.power - expected) < 1e-10);
      assert.equal(frame.strengths[corner], frame.power, "model and outline use the same power");
      for (const [key, strength] of Object.entries(frame.strengths)) {
        if (key !== corner) assert.equal(strength, 0, `${key} stays at its weakest`);
      }
    }
  }
  assert.deepEqual(sampleAttributeCycle(32000), sampleAttributeCycle(0), "loop closes without resetting other equipment");
  for (let t = 0; t < 32000; t += 17) {
    const frame = sampleAttributeCycle(t);
    assert.ok(frame.power >= 0 && frame.power <= 1);
  }
});

test("the real Sentinel model grows and glows from minimum while the full shield animates independently", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const cacheDir = await mkdtemp(path.join(tmpdir(), "vision-sentinel-test-"));
  const vite = await createServer({
    appType: "custom", configFile: false, root, cacheDir,
    resolve: { alias: { "@": root, "@react-three/fiber": path.join(root, "tests/fixtures/sentinel-fiber.mjs") } },
    server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const bytes = await readFile(path.join(root, "public/models/sentinel.glb"));
    const asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
    const fiber = await vite.ssrLoadModule("/tests/fixtures/sentinel-fiber.mjs");
    fiber.prepare(asset);
    const { CharacterModel } = await vite.ssrLoadModule("/components/character-model.tsx");
    const { createEquipmentGlow, createShieldEffects } = await vite.ssrLoadModule("/lib/sentinel-showcase-effects.ts");
    const strengths = { cashFlow: 0, capital: 0, collateral: 0, credit: 0 };
    const visualState = { creditScore: 300, creditGrade: null, dti: null, reserveMonths: null };
    let model;
    function Probe() {
      model = CharacterModel({ avatar: "mech", strengths, visualState, reducedMotion: true, selected: null }).props.object;
      return null;
    }
    renderToStaticMarkup(React.createElement(Probe));
    const readEquipment = () => ({
      capital: model.getObjectByName("reserve_shield").scale.x,
      cashFlow: model.getObjectByName("cash_blade").scale.y,
      credit: model.getObjectByName("credit_antenna").scale.y,
      wings: model.getObjectByName("shoulder_wing_l").scale.x,
      collateral: model.getObjectByName("equity_armor").children.filter(n => n.visible).length,
    });
    fiber.renderFrame();
    const weak = readEquipment();
    const updateGlow = createEquipmentGlow(model);
    const readGlow = () => Object.fromEntries(Object.entries({ capital: "reserve_shield", cashFlow: "cash_emitter", credit: "credit_antenna", wings: "shoulder_wing_l", collateral: "equity_armor" }).map(([key, name]) => {
      let intensity = 0;
      model.getObjectByName(name).traverse(node => { intensity += node.material?.emissiveIntensity ?? 0; });
      return [key, intensity];
    }));
    updateGlow(strengths);
    const dim = readGlow();
    const frontPose = ["torso", "head"].map(name => model.getObjectByName(name).rotation.toArray());
    for (let i = 0; i < 4; i++) {
      const frame = sampleAttributeCycle(i * ATTRIBUTE_DURATION_MS + 4000);
      Object.assign(strengths, frame.strengths);
      visualState.creditScore = frame.creditScore;
      fiber.renderFrame();
      updateGlow(strengths);
      const strong = readEquipment();
      const bright = readGlow();
      assert.ok(strong[frame.corner] > weak[frame.corner], `${frame.corner} visibly strengthens`);
      assert.ok(bright[frame.corner] > dim[frame.corner] + 1, `${frame.corner} glows more brightly at full power`);
      if (frame.corner === "credit") {
        assert.ok(strong.wings > weak.wings, "wings change with the helm");
        assert.ok(bright.wings > dim.wings + 1, "wings glow with the helm");
      }
      for (const key of Object.keys(strong)) {
        if (key !== frame.corner && !(frame.corner === "credit" && key === "wings")) {
          assert.equal(strong[key], weak[key], `${key} remains at minimum strength`);
          assert.equal(bright[key], dim[key], `${key} remains dim`);
        }
      }
      assert.deepEqual(["torso", "head"].map(name => model.getObjectByName(name).rotation.toArray()), frontPose);
      assert.equal(model.position.y, 0, "no idle bobbing");
      Object.assign(strengths, sampleAttributeCycle(i * ATTRIBUTE_DURATION_MS + 7900).strengths);
      visualState.creditScore = 300;
      fiber.renderFrame();
      updateGlow(strengths);
      assert.deepEqual(readEquipment(), weak, "equipment returns to minimum before the next attribute");
      assert.deepEqual(readGlow(), dim, "glow returns to minimum without accumulating");
    }

    const shield = createShieldEffects();
    try {
      const field = shield.group.getObjectByName("shield_energy_field");
      const full = shield.group.getObjectByName("full_charge_shield");
      const rings = full.children.filter(node => node.name.startsWith("shield_orbit_ring_"));
      assert.equal(rings.length, 3, "all three full-charge rings are present");
      shield.update(0, .02, true);
      assert.equal(field.visible, false);
      assert.equal(full.visible, false);
      shield.update(.5, .02, true);
      assert.equal(field.material.uniforms.uOpacity.value, .5);
      assert.equal(full.visible, false);
      shield.update(1, .02, true);
      assert.equal(full.visible, true);
      assert.ok(rings.every(ring => ring.material.opacity > .5));
      const peakRotation = full.rotation.y;
      shield.update(1, .02, true);
      assert.ok(full.rotation.y > peakRotation, "shield orbits animate while the avatar stays still");
      const paused = [full.rotation.y, full.scale.x, field.material.uniforms.uTime.value];
      shield.update(1, 1, false);
      assert.deepEqual([full.rotation.y, full.scale.x, field.material.uniforms.uTime.value], paused, "pause freezes the entire shield animation");
      shield.update(.9, .02, true);
      assert.ok(rings[0].material.opacity > 0 && rings[0].material.opacity < .78, "full charge fades smoothly on descent");
      shield.update(0, .02, true);
      assert.equal(field.visible, false);
      assert.equal(full.visible, false);
      assert.ok(rings.every(ring => ring.material.opacity === 0));
    } finally { shield.dispose(); }
  } finally {
    await vite.close();
    await rm(cacheDir, { recursive: true, force: true });
  }
});
