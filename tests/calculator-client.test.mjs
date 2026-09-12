import assert from "node:assert/strict";
import test from "node:test";
import { requestComparison } from "../lib/calculator-client.js";
import { DEFAULT_CURRENT, DEFAULT_SCENARIO } from "../lib/vision-contract.js";

const fixture = () => ({
  current: { kind: "current", scoringVersion: "test-only", inputs: DEFAULT_CURRENT, corners: Object.fromEntries(["cashFlow", "capital", "collateral", "credit"].map(k => [k, { status: "unknown", strength: null, pressure: null, raw: {} }])) },
  scenario: { kind: "scenario", scoringVersion: "test-only", inputs: DEFAULT_CURRENT, corners: Object.fromEntries(["cashFlow", "capital", "collateral", "credit"].map(k => [k, { status: "unknown", strength: null, pressure: null, raw: {} }])) },
  deltas: { cashFlow: null, capital: null, collateral: null, credit: null },
});

test("client posts JSON without cookies, caching or local formulas", async () => {
  const controller = new AbortController();
  const expected = fixture();
  const result = await requestComparison(DEFAULT_CURRENT, DEFAULT_SCENARIO, { signal: controller.signal, fetcher: async (url, init) => {
    assert.equal(url, "/api/vision/calculate");
    assert.equal(init.method, "POST");
    assert.equal(init.credentials, "omit");
    assert.equal(init.cache, "no-store");
    assert.equal(init.signal, controller.signal);
    assert.deepEqual(JSON.parse(init.body), { current: DEFAULT_CURRENT, scenario: DEFAULT_SCENARIO });
    return Response.json(expected);
  } });
  assert.deepEqual(result, expected);
});

test("invalid results and upstream failures never become avatar states", async () => {
  const outOfRange = fixture(); outOfRange.current.corners.cashFlow = { status: "known", strength: 50, raw: {} };
  for (const value of [{}, outOfRange]) await assert.rejects(requestComparison(DEFAULT_CURRENT, DEFAULT_SCENARIO, { fetcher: async () => Response.json(value) }), /incomplete/);
  await assert.rejects(requestComparison(DEFAULT_CURRENT, DEFAULT_SCENARIO, { fetcher: async () => new Response("private upstream detail", { status: 500 }) }), /^Error: Calculator unavailable/);
});
