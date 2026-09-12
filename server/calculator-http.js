// Public transport boundary; the injected calculator implementation stays private.
const CURRENT_KEYS = ["monthlyIncome", "monthlyDebtPayments", "monthlyLivingExpenses", "totalDebt", "assetValue", "liquidReserves", "creditScore"];
const SCENARIO_KEYS = ["upfrontCash", "newMonthlyPayment", "newDebt", "acquiredAssetValue", "monthlyIncomeChange"];
const BODY_LIMIT = 4096;
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "X-Content-Type-Options": "nosniff",
};

export class CalculatorRequestError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function validateFields(value, keys, current) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || !keys.every(k => Object.hasOwn(value, k))) {
    throw new CalculatorRequestError("Provide all required financial fields.");
  }
  for (const key of keys) {
    const n = value[key];
    if (key === "creditScore" && n === null) continue;
    if (typeof n !== "number" || !Number.isFinite(n)) throw new CalculatorRequestError("Use finite numbers for financial entries.");
    if (key === "creditScore") {
      if (!Number.isInteger(n) || n < 0 || n > 850) throw new CalculatorRequestError("Enter a whole credit score up to 850, or leave it blank.");
      continue;
    }
    const min = current && key === "liquidReserves" ? -1000 : key === "monthlyIncomeChange" ? -1e12 : 0;
    if (n < min || n > 1e12 || (n !== 0 && Math.abs(n) < 0.01)) throw new CalculatorRequestError("Use amounts of at least one cent, up to $1 trillion; current liquid reserves cannot fall below −$1,000.");
  }
}

async function readInput(request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new CalculatorRequestError("Send application/json.", 415);
  if (Number(request.headers.get("content-length")) > BODY_LIMIT) throw new CalculatorRequestError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CalculatorRequestError("Provide a calculation request.");
  let size = 0;
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BODY_LIMIT) { await reader.cancel(); throw new CalculatorRequestError("Request is too large.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let input;
  try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new CalculatorRequestError("Send valid JSON."); }
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 2 || !Object.hasOwn(input, "current") || !Object.hasOwn(input, "scenario")) throw new CalculatorRequestError("Provide current and scenario inputs.");
  validateFields(input.current, CURRENT_KEYS, true);
  validateFields(input.scenario, SCENARIO_KEYS, false);
  return input;
}

export function createCalculatorHandler(calculate) {
  return async function handleCalculator(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return Response.json({ error: "Use POST to calculate." }, { status: 405, headers: { ...headers, Allow: "POST, OPTIONS" } });
    try {
      const { current, scenario } = await readInput(request);
      const comparison = await calculate(current, scenario);
      return Response.json(comparison, { headers });
    } catch (error) {
      // Never log financial payloads, upstream bodies, stack traces or credentials.
      const known = error instanceof CalculatorRequestError;
      return Response.json({ error: known ? error.message : "Calculator unavailable. Please try again." }, { status: known ? error.status : 503, headers });
    }
  };
}
