"use client";

import { useEffect, useState } from "react";
import { requestComparison } from "@/lib/calculator-client.js";
import { DEFAULT_CURRENT, type Comparison, type CurrentInputs, type ScenarioInputs, type Snapshot } from "@/lib/vision-contract.js";

const unknownCorners = Object.fromEntries(["cashFlow", "capital", "collateral", "credit"].map(key => [key, { status: "unknown", strength: null, pressure: null, raw: {} }])) as Snapshot["corners"];
const EMPTY: Comparison = {
  current: { kind: "current", scoringVersion: "pending", inputs: DEFAULT_CURRENT, corners: unknownCorners },
  scenario: { kind: "scenario", scoringVersion: "pending", inputs: DEFAULT_CURRENT, corners: unknownCorners },
  deltas: { cashFlow: null, capital: null, collateral: null, credit: null },
};

export function useCalculator(current: CurrentInputs, scenario: ScenarioInputs) {
  const requestKey = JSON.stringify({ current, scenario });
  const [result, setResult] = useState<{ key: string; data: Comparison } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [retryId, setRetryId] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    let timeout: ReturnType<typeof setTimeout>;
    const timer = setTimeout(async () => {
      timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const inputs = JSON.parse(requestKey) as { current: CurrentInputs; scenario: ScenarioInputs };
        const data = await requestComparison(inputs.current, inputs.scenario, { signal: controller.signal });
        if (live) { setResult({ key: requestKey, data }); setFailure(null); }
      } catch (error) {
        if (live) setFailure({ key: requestKey, message: controller.signal.aborted ? "Calculator took too long. Please try again." : error instanceof Error ? error.message : "Calculator unavailable. Please try again." });
      } finally { clearTimeout(timeout); }
    }, 180);
    return () => { live = false; clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [requestKey, retryId]);
  const error = failure?.key === requestKey ? failure.message : null;
  const pending = !error && result?.key !== requestKey;
  return {
    comparison: result?.data ?? EMPTY,
    pending, error, ready: !pending && !error && !!result,
    hasResult: !!result,
    retry: () => { setFailure(null); setResult(null); setRetryId(n => n + 1); },
  };
}
