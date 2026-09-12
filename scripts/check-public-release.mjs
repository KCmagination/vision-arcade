import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const skip = new Set(["node_modules", ".git", ".next", "dist"]);
const failures = [];
async function scan(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (skip.has(item.name)) continue;
    const path = join(directory, item.name);
    const name = relative(root, path).replaceAll("\\", "/");
    if (/server\/private|vision-engine\.(js|d\.ts)|vision-engine\.test|calculator-private-integration|legacy-salvage|PRIVATE/i.test(name)) failures.push(name);
    if (item.isDirectory()) await scan(path);
    else if (/\.(?:js|ts|tsx|mjs|md|json|map)$/.test(name) && name !== "scripts/check-public-release.mjs" && name !== "package-lock.json") {
      const source = await readFile(path, "utf8");
      if (/RESERVE_ANCHORS|reserveStrength\s*\(|cashFlowSignal\s*\(|creditSignal\s*\(|debtToValue|equityMargin/.test(source)) failures.push(name);
    }
  }
}
await scan(root);
const composition = await readFile(join(root, "server/calculator-service.js"), "utf8");
if (composition.trim() !== 'export { handleCalculator } from "./calculator-proxy.js";') failures.push("unexpected calculator service composition");
if (failures.length) throw new Error(`Private source must not be published: ${[...new Set(failures)].join(", ")}`);
console.log("Public release boundary passed: hosted adapter only.");
