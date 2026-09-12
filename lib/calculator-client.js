const CORNERS = ["cashFlow", "capital", "collateral", "credit"];

export function isComparison(value) {
  if (!value || typeof value !== "object") return false;
  for (const kind of ["current", "scenario"]) {
    const snapshot = value[kind];
    if (!snapshot || snapshot.kind !== kind || typeof snapshot.scoringVersion !== "string" || !snapshot.inputs || !snapshot.corners) return false;
    for (const key of CORNERS) {
      const corner = snapshot.corners[key];
      if (!corner || !["known", "unknown", "notApplicable"].includes(corner.status) || !corner.raw || typeof corner.raw !== "object") return false;
      if (corner.strength !== null && (typeof corner.strength !== "number" || !Number.isFinite(corner.strength) || corner.strength < 0 || corner.strength > 1)) return false;
      if (corner.status === "known" && corner.strength === null) return false;
      if (corner.status !== "known" && corner.strength !== null) return false;
    }
  }
  return value.deltas && CORNERS.every(key => value.deltas[key] === null || (typeof value.deltas[key] === "number" && Number.isFinite(value.deltas[key]) && Math.abs(value.deltas[key]) <= 1));
}

export async function requestComparison(current, scenario, { signal, endpoint = "/api/vision/calculate", fetcher = fetch } = {}) {
  const response = await fetcher(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current, scenario }), signal, credentials: "omit", cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 400) {
      const problem = await response.json().catch(() => null);
      if (typeof problem?.error === "string") throw new Error(problem.error);
    }
    throw new Error("Calculator unavailable. Please try again.");
  }
  const value = await response.json();
  if (!isComparison(value)) throw new Error("Calculator returned an incomplete result. Please try again.");
  return value;
}
