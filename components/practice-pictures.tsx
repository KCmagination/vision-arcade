"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CurrentInputs } from "@/lib/vision-contract.js";

const PICTURES = [
  { name: "Everyday paycheck", income: "$3,000", living: "$1,800", payments: "$600", reserves: "$1,200", assets: "$20,000", debt: "$12,000", credit: "660", inputs: { monthlyIncome: 3000, monthlyLivingExpenses: 1800, monthlyDebtPayments: 600, liquidReserves: 1200, assetValue: 20000, totalDebt: 12000, creditScore: 660 } },
  { name: "Bigger paycheck", income: "$9,000", living: "$6,000", payments: "$2,400", reserves: "$4,200", assets: "$200,000", debt: "$170,000", credit: "760", inputs: { monthlyIncome: 9000, monthlyLivingExpenses: 6000, monthlyDebtPayments: 2400, liquidReserves: 4200, assetValue: 200000, totalDebt: 170000, creditScore: 760 } },
] as const;

export function PracticePictures({ onChoose }: { onChoose: (inputs: CurrentInputs, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  return <>
    <Button variant="outline" className="practice-open" onClick={() => { setRevealed(false); setOpen(true); }}>Try a fictional household <ArrowRight size={15} /></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="practice-dialog">
        <DialogHeader><p className="eyebrow">LEVEL 1 / READ THE FACTS</p><DialogTitle>Different incomes. What remains?</DialogTitle><DialogDescription>Two fictional households. Read the money before judging the paycheck.</DialogDescription></DialogHeader>
        <div className="practice-table-wrap"><table className="practice-table"><caption>Monthly income and costs; current savings, assets, debt and credit.</caption><thead><tr><th scope="col">Read the picture</th>{PICTURES.map(p => <th scope="col" key={p.name}>{p.name}</th>)}</tr></thead><tbody>
          {([['Take-home income','income'],['Living costs','living'],['Required debt payments','payments'],['Accessible reserves','reserves'],['Asset value','assets'],['Total debt','debt'],['Credit score','credit']] as const).map(([label,key]) => <tr key={key}><th scope="row">{label}</th>{PICTURES.map(p => <td key={p.name}>{p[key]}</td>)}</tr>)}
        </tbody></table></div>
        {!revealed ? <div className="practice-question"><p>Which household has more dollars left after its monthly living costs and debt payments?</p><Button onClick={() => setRevealed(true)}>Reveal the picture</Button></div> : <div className="practice-reveal" role="status"><strong>Both have $600 left each month.</strong><p>Both also hold half a month of reserves against their living costs and required payments. The larger paycheck comes with larger obligations. Their equity and credit differ, so keep reading all four corners.</p></div>}
        <div className="practice-choices">{PICTURES.map(p => <Button key={p.name} variant="outline" onClick={() => { onChoose({ ...p.inputs }, p.name); setOpen(false); }}>Use {p.name.toLowerCase()} <ArrowRight size={15} /></Button>)}</div>
        <p className="practice-note">Choosing a household replaces the hangar inputs and clears the what-if amounts. Debtbreak uses its own fictional practice accounts.</p>
      </DialogContent>
    </Dialog>
  </>;
}
