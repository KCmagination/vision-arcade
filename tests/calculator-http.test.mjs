import assert from "node:assert/strict";
import test from "node:test";
import { createCalculatorHandler } from "../server/calculator-http.js";
import { DEFAULT_CURRENT, DEFAULT_SCENARIO } from "../lib/vision-contract.js";

const input = () => ({ current: { ...DEFAULT_CURRENT }, scenario: { ...DEFAULT_SCENARIO } });
const request = (body = input(), headers = {}) => new Request("https://example.com/api/vision/calculate", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

test("calculator accepts explicit inputs without storing or echoing them in headers", async () => {
  let received;
  const handler = createCalculatorHandler((current, scenario) => { received = { current, scenario }; return { result: "fixture" }; });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(received, input());
  assert.deepEqual(await response.json(), { result: "fixture" });
  assert.match(response.headers.get("Cache-Control"), /no-store/);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(response.headers.has("Set-Cookie"), false);
});

test("invalid/missing/extra input and strings never reach calculator", async () => {
  const handler = createCalculatorHandler(() => { assert.fail("invalid request reached engine"); });
  const missing = input(); delete missing.current.assetValue;
  const string = input(); string.current.monthlyIncome = "4250";
  const extra = input(); extra.current.accountPassword = "not-a-real-password";
  const belowFloor = input(); belowFloor.current.liquidReserves = -1001;
  const huge = input(); huge.current.totalDebt = 1e13;
  const fractionalCredit = input(); fractionalCredit.current.creditScore = 600.5;
  for (const value of [null, [], {}, { ...input(), debug: true }, missing, string, extra, belowFloor, huge, fractionalCredit]) {
    assert.equal((await handler(request(value))).status, 400);
  }
});

test("streamed bodies are bounded even with no content-length", async () => {
  const handler = createCalculatorHandler(() => assert.fail("oversized request reached engine"));
  const response = await handler(request({ padding: "x".repeat(5000) }));
  assert.equal(response.status, 413);
});

test("methods, JSON and CORS preflight are handled without calling the engine", async () => {
  const handler = createCalculatorHandler(() => assert.fail("request reached engine"));
  assert.equal((await handler(new Request("https://example.com/api/vision/calculate"))).status, 405);
  const preflight = await handler(new Request("https://example.com/api/vision/calculate", { method: "OPTIONS" }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal((await handler(request(input(), { "Content-Type": "text/plain" }))).status, 415);
  assert.equal((await handler(new Request("https://example.com/api/vision/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status, 400);
});

test("private failures never expose their message or source", async () => {
  const handler = createCalculatorHandler(() => { throw new Error("PRIVATE_FORMULA_AND_INTERNAL_DETAIL"); });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /PRIVATE_FORMULA|INTERNAL_DETAIL/);
});
