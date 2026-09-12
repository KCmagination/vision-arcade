export type CurrentInputs = {
  monthlyIncome: number;
  monthlyDebtPayments: number;
  monthlyLivingExpenses: number;
  totalDebt: number;
  assetValue: number;
  liquidReserves: number;
  creditScore: number | null;
};

export type ScenarioInputs = {
  upfrontCash: number;
  newMonthlyPayment: number;
  newDebt: number;
  acquiredAssetValue: number;
  monthlyIncomeChange: number;
};

export type Pressure = { amount: number; ratio: number | null } | null;

export type CornerSignal = {
  status: "known" | "unknown" | "notApplicable";
  strength: number | null;
  pressure: Pressure;
  raw: Record<string, number | string | null>;
};

export type Snapshot = {
  kind: "current" | "scenario";
  scoringVersion: string;
  inputs: CurrentInputs;
  corners: Record<"cashFlow" | "capital" | "collateral" | "credit", CornerSignal>;
};

export type Comparison = {
  current: Snapshot;
  scenario: Snapshot;
  deltas: Record<keyof Snapshot["corners"], number | null>;
};

export const DEFAULT_CURRENT: Readonly<CurrentInputs>;
export const DEFAULT_SCENARIO: Readonly<ScenarioInputs>;
