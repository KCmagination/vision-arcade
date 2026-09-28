import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const skip = new Set(["node_modules", ".git", ".next", "dist", "test-results", "playwright-report"]);
const failures = [];
// Exact reads of an already-public API output, not implementations of the metric.
// New uses require review; this does not allow formulas elsewhere in these files.
const approvedOutputLines = new Map([
  ["components/vision-workspace.tsx", new Set([
    "active.corners.collateral.raw.debtToValue === null",
    ": Number(active.corners.collateral.raw.debtToValue)",
  ])],
  ["lib/debtbreaker-engine.js", new Set([
    "const loadout = createLoadout(strengths, snapshot.corners.collateral.raw.debtToValue);",
  ])],
  ["tests/debtbreaker-hangar.test.mjs", new Set([
    "raw:key==='collateral'?{debtToValue:.7}:{},",
  ])],
  ["tests/advanced-finances.test.mjs", new Set([
    "raw:key==='collateral'?{debtToValue:.7}:{},",
  ])],
]);
// Reviewed synthetic output fixtures for continuous/Sentinel gameplay.
approvedOutputLines.set("tests/debtbreak-continuous.test.mjs", new Set(["const picture=(inputs={})=>({kind:'current',inputs:{monthlyIncome:4000,monthlyLivingExpenses:0,monthlyDebtPayments:100,totalDebt:1000,assetValue:1000,liquidReserves:0,creditScore:null,...inputs},corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(key=>[key,{strength:.5,raw:key==='collateral'?{debtToValue:1}:{}}]))});"]));
approvedOutputLines.set("tests/debtbreak-priority-fixes.test.mjs", new Set(["const picture=(inputs={})=>({kind:'current',inputs:{monthlyIncome:4250,monthlyLivingExpenses:1300,monthlyDebtPayments:400,totalDebt:98000,assetValue:140000,liquidReserves:20000,creditScore:760,...inputs},corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(key=>[key,{strength:.5,raw:key==='collateral'?{debtToValue:.7}:{}}]))});"]));
approvedOutputLines.set("tests/debtbreak-siege.test.mjs", new Set(["const picture=strength=>({kind:'current',inputs:{monthlyIncome:4000,monthlyLivingExpenses:1000,monthlyDebtPayments:200,totalDebt:10000,assetValue:20000,liquidReserves:5000,creditScore:strength==null?null:700},corners:Object.fromEntries(['cashFlow','capital','collateral','credit'].map(k=>[k,{strength:k==='credit'?strength:.5,raw:{debtToValue:.5}}]))});"]));
const forbiddenSource = /RESERVE_ANCHORS|reserveStrength\s*\(|cashFlowSignal\s*\(|creditSignal\s*\(|debtToValue|equityMargin|(?:\.\.\/|\.\/)private\/|server\/private/;
function hasForbiddenSource(name, source) {
  const allowed = approvedOutputLines.get(name);
  return source.split(/\r?\n/).some(line => !allowed?.has(line.trim()) && forbiddenSource.test(line));
}
async function scan(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (skip.has(item.name)) continue;
    const path = join(directory, item.name);
    const name = relative(root, path).replaceAll("\\", "/");
    if (/server\/private|vision-engine\.(js|d\.ts)|vision-engine\.test|calculator-private-integration|legacy-salvage|PRIVATE|^\.openai\/|^worker\/|\.(?:pem|key)$|^\.env(?!\.example$)/i.test(name)) failures.push(name);
    if (item.isDirectory()) await scan(path);
    else if (/\.(?:js|ts|tsx|mjs|md|json|map)$/.test(name) && name !== "scripts/check-public-release.mjs" && name !== "package-lock.json") {
      if (hasForbiddenSource(name, await readFile(path, "utf8"))) failures.push(name);
    }
  }
}
if (process.argv.includes("--self-test")) {
  const allowed = "const loadout = createLoadout(strengths, snapshot.corners.collateral.raw.debtToValue);";
  assert.equal(hasForbiddenSource("lib/debtbreaker-engine.js", allowed), false);
  assert.equal(hasForbiddenSource("lib/other.js", allowed), true);
  assert.equal(hasForbiddenSource("lib/debtbreaker-engine.js", allowed + "\nconst debtToValue = totalDebt / assetValue;"), true);
  const fixture = "raw:key==='collateral'?{debtToValue:.7}:{},";
  assert.equal(hasForbiddenSource("tests/advanced-finances.test.mjs", fixture), false);
  assert.equal(hasForbiddenSource("tests/advanced-finances.test.mjs", fixture + "\nconst debtToValue = totalDebt / assetValue;"), true);
  assert.equal(hasForbiddenSource("tests/unreviewed.test.mjs", fixture), true);
  for (const marker of ["RESERVE_ANCHORS", "reserveStrength(", "cashFlowSignal(", "creditSignal(", "equityMargin", "../server/private/engine.js"])
    assert.equal(hasForbiddenSource("lib/debtbreaker-engine.js", marker), true);
  for (const [name, lines] of approvedOutputLines) for (const line of lines) {
    assert.equal(hasForbiddenSource(name, line), false);
    assert.equal(hasForbiddenSource("tests/unreviewed.test.mjs", line), true);
    assert.equal(hasForbiddenSource(name, line + "\nconst debtToValue = totalDebt / assetValue;"), true);
  }
  console.log("Public release guard regression checks passed.");
}
await scan(root);
const composition = await readFile(join(root, "server/calculator-service.js"), "utf8");
if (composition.trim() !== 'export { handleCalculator } from "./calculator-proxy.js";') failures.push("unexpected calculator service composition");
if (failures.length) throw new Error(`Private source must not be published: ${[...new Set(failures)].join(", ")}`);
console.log("Public release boundary passed: hosted adapter only.");
