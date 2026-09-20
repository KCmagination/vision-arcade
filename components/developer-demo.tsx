"use client";

import { useState } from "react";
import { Check, Copy, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestComparison } from "@/lib/calculator-client.js";
import type { Comparison } from "@/lib/vision-contract";

const endpoint = "https://vision-financial-map.rettke75.chatgpt.site/api/vision/calculate";
const example = {
  current: { monthlyIncome: 4000, monthlyDebtPayments: 500, monthlyLivingExpenses: 2200, totalDebt: 12000, assetValue: 20000, liquidReserves: 3000, creditScore: 680 },
  scenario: { upfrontCash: 1000, newMonthlyPayment: 150, newDebt: 5000, acquiredAssetValue: 6000, monthlyIncomeChange: 0 },
};
const exampleCode = `const response = await fetch(\n  "${endpoint}",\n  {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify(${JSON.stringify(example, null, 2).replace(/\n/g, "\n    ")})\n  }\n);\n\nif (!response.ok) throw new Error(\`HTTP \${response.status}\`);\nconst { current, scenario, deltas } = await response.json();`;
const cornerNames = { cashFlow: "Cash flow", capital: "Capital", collateral: "Collateral", credit: "Credit" } as const;

export function DeveloperDemo() {
  const [result, setResult] = useState<Comparison | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  async function run() {
    if (pending) return;
    setPending(true); setError(""); setResult(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try { setResult(await requestComparison(example.current, example.scenario, { signal: controller.signal })); }
    catch { setError("The sample request could not complete. Try again or use the API guide."); }
    finally { clearTimeout(timer); setPending(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(exampleCode); setCopyMessage("Example copied"); }
    catch { setCopyMessage("Copy is unavailable here. Select and copy the code below."); }
  }
  const display = (n: number | null) => n === null ? "Unknown / N/A" : n.toFixed(3);
  return <div className="vl-api-demo">
    <div className="vl-api-code"><div className="vl-code-bar"><span>POST /api/vision/calculate</span><Button type="button" variant="ghost" size="sm" onClick={copy} aria-label="Copy JavaScript API example">{copyMessage === "Example copied" ? <Check size={16} /> : <Copy size={16} />} Copy</Button></div><pre tabIndex={0} aria-label="JavaScript API request example"><code>{exampleCode}</code></pre><p className="vl-copy-status" role="status">{copyMessage}</p></div>
    <div className="vl-api-response"><p className="vl-kicker">TRY A REAL REQUEST</p><h3>Four signals.<br />Your mechanics.</h3><p>The sample compares a fictional household with an illustrative new purchase. All money amounts are USD; income and payment amounts are monthly.</p><p>Take-home income excludes paycheck deductions. Living costs and debt payments are separate. Send every field, even when its value is zero.</p><Button className="vl-button" type="button" onClick={run} disabled={pending}><Play size={17} aria-hidden="true" />{pending ? "Calculating…" : "Run sample request"}</Button><p className="vl-small">Sends only the fictional numbers shown here.</p>
      <div className="vl-response-content" aria-live="polite" aria-busy={pending}>{error && <p className="vl-api-error" role="alert">{error}</p>}{result ? <><p className="vl-response-title">Live response · {result.current.scoringVersion}</p><table><caption>Corner strength, 0–1. These are game signals, not a combined financial grade.</caption><thead><tr><th scope="col">Corner</th><th scope="col">Current</th><th scope="col">Scenario</th></tr></thead><tbody>{Object.entries(cornerNames).map(([key, name]) => { const corner = key as keyof typeof cornerNames; return <tr key={key}><th scope="row">{name}</th><td>{display(result.current.corners[corner].strength)}</td><td>{display(result.scenario.corners[corner].strength)}</td></tr>; })}</tbody></table></> : !error && <div className="vl-response-waiting"><span>RESPONSE SHAPE</span><code>current · scenario · deltas</code><p>Each corner includes its status, strength and raw results.</p></div>}</div>
    </div>
  </div>;
}
