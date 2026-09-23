// Presentation-only values. No calculator, account data, or financial storage.
export const ATTRIBUTE_DURATION_MS = 8000;
export const ATTRIBUTE_SEQUENCE = Object.freeze([
  { corner: "capital", id: "capital", label: "Shield" },
  { corner: "cashFlow", id: "cash-flow", label: "Sword" },
  { corner: "credit", id: "credit", label: "Helm & wings" },
  { corner: "collateral", id: "collateral", label: "Armor / collateral" },
]);

export function sampleAttributeCycle(elapsedMs) {
  const time = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const index = Math.floor(time / ATTRIBUTE_DURATION_MS) % ATTRIBUTE_SEQUENCE.length;
  const within = time % ATTRIBUTE_DURATION_MS;
  // Brief holds at each extreme make the equipment changes easy to compare.
  let power = 0;
  if (within >= 500 && within < 3500) power = (1 - Math.cos(Math.PI * (within - 500) / 3000)) / 2;
  else if (within >= 3500 && within < 4500) power = 1;
  else if (within >= 4500 && within < 7500) power = (1 + Math.cos(Math.PI * (within - 4500) / 3000)) / 2;
  const attribute = ATTRIBUTE_SEQUENCE[index];
  const strengths = { cashFlow: 0, capital: 0, collateral: 0, credit: 0 };
  strengths[attribute.corner] = power;
  return { ...attribute, power, strengths, creditScore: 300 + 550 * strengths.credit };
}
