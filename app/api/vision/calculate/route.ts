import { handleCalculator } from "@/server/calculator-service.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = handleCalculator;
export const OPTIONS = handleCalculator;
