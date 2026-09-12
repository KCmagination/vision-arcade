// Open-source adapter: forwards inputs to the hosted calculator, never its source.
import { createCalculatorHandler } from "./calculator-http.js";
import { requestComparison } from "../lib/calculator-client.js";

export const HOSTED_CALCULATOR_URL = "https://vision-financial-map.rettke75.chatgpt.site/api/vision/calculate";
export const handleCalculator = createCalculatorHandler((current, scenario) =>
  requestComparison(current, scenario, { endpoint: process.env.VISION_CALCULATOR_URL || HOSTED_CALCULATOR_URL, signal: AbortSignal.timeout(10000) }),
);
