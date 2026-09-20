import type { CSSProperties } from "react";
import type { Ledger } from "@/lib/debtbreak-finance.js";
import { availableFunds } from "@/lib/debtbreak-finance.js";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

export function PeriodAllocation({ ledger, savings }: { ledger: Ledger; savings: number }) {
  const parts = [
    { name: "Living costs", amount: ledger.living, color: "#8195a6" },
    { name: "Debt minimums", amount: ledger.minimums, color: "#eeb972" },
    { name: "Repair due", amount: ledger.repairDue, color: "#f29c90" },
    { name: "To reserves", amount: savings, color: "#7ae7b2" },
    { name: "Debt ammunition", amount: availableFunds(ledger) - savings, color: "#65dcf0" },
  ];
  const total = ledger.income + ledger.carry;
  return <div className="db-allocation-map">
    <div className="db-allocation-map-title"><strong>Give each dollar a job.</strong><span>{money(total)} this period{ledger.carry ? " · includes carried cash" : ""}</span></div>
    <div className="db-allocation-bar" aria-hidden="true">{parts.map(p => <span key={p.name} style={{ width: `${total ? p.amount / total * 100 : 0}%`, background: p.color }} />)}</div>
    <dl>{parts.filter(p => p.amount > 0 || p.name === "To reserves" || p.name === "Debt ammunition").map(p => <div key={p.name} style={{ "--allocation-color": p.color } as CSSProperties}><dt>{p.name}</dt><dd>{money(p.amount)}</dd></div>)}</dl>
  </div>;
}
