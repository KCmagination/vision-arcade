// Public inputs and output contract. No financial scoring implementation.

export const DEFAULT_CURRENT = Object.freeze({
  monthlyIncome: 4250,
  monthlyDebtPayments: 400,
  monthlyLivingExpenses: 1300,
  totalDebt: 98000,
  assetValue: 140000,
  liquidReserves: 5250,
  creditScore: 760,
});

export const DEFAULT_SCENARIO = Object.freeze({
  upfrontCash: 3000,
  newMonthlyPayment: 350,
  newDebt: 25000,
  acquiredAssetValue: 32000,
  monthlyIncomeChange: 0,
});

