import type { Comparison, CurrentInputs, ScenarioInputs } from "./vision-contract.js";
export function isComparison(value: unknown): value is Comparison;
export function requestComparison(current: CurrentInputs, scenario: ScenarioInputs, options?: { signal?: AbortSignal; endpoint?: string; fetcher?: typeof fetch }): Promise<Comparison>;
