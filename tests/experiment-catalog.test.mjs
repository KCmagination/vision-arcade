import assert from "node:assert/strict";
import test from "node:test";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const catalog = JSON.parse(await readFile(path.join(root, "docs/experiments/catalog.json"), "utf8"));

test("experiment catalog has stable, unique IDs and provenance metadata", () => {
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.repository, "KCmagination/vision-arcade");
  assert.match(catalog.sourceRevision, /^[a-f0-9]{40}$/);
  assert.equal(catalog.experiments.length, 6);
  const entries = [...catalog.experiments, ...catalog.relatedBranches];
  const ids = entries.map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const entry of entries) {
    assert.match(entry.id, /^EXP-\d{3}$/);
    assert.ok(entry.title.trim());
    assert.ok(entry.labels.length > 0);
    assert.equal(new Set(entry.labels).size, entry.labels.length);
  }
});

test("public experiment source and test links resolve within this checkout", async () => {
  for (const entry of catalog.experiments) {
    assert.equal(entry.status, "public-baseline");
    assert.ok(entry.summary && entry.entryPoint && entry.limits);
    assert.ok(entry.sourcePaths.length);
    assert.ok(Array.isArray(entry.testPaths));
    if (entry.testPaths.length === 0) assert.match(entry.limits, /No dedicated automated/);
    for (const name of [...entry.sourcePaths, ...entry.testPaths]) {
      assert.ok(!path.isAbsolute(name) && !name.includes("..") && !name.includes(String.fromCharCode(92)));
      const target = path.resolve(root, name);
      const relative = path.relative(root, target);
      assert.ok(relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative));
      assert.ok((await stat(target)).isFile(), name);
    }
    for (const name of entry.testPaths) assert.match(name, /^tests\/.+\.(?:test|spec)\.mjs$/);
  }
});

test("catalog separates historical and withheld work from the public baseline", () => {
  for (const entry of catalog.relatedBranches) {
    assert.equal(entry.status, "historical-public-branch");
    assert.match(entry.revision, /^[a-f0-9]{40}$/);
    assert.ok(entry.branch && entry.note);
  }
  assert.ok(catalog.excludedFamilies.length >= 4);
  for (const entry of catalog.excludedFamilies) {
    assert.ok(["withheld", "review-required"].includes(entry.status));
    assert.ok(entry.label && entry.reason);
    assert.equal(entry.sourcePaths, undefined);
  }
});
