"use client";

import { useState } from "react";
import { Check, Copy, Mail, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BetaFeedback() {
  const [open, setOpen] = useState(false);
  const [game, setGame] = useState("Debtbreak");
  const [experience, setExperience] = useState("");
  const [learned, setLearned] = useState("");
  const [blocked, setBlocked] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const report = `Vi$ion beta feedback\nGame: ${game}\nDevice / browser: ${experience || '(not provided)'}\n\nWhat I understood about my money:\n${learned || '(not provided)'}\n\nWhere I got stuck or what surprised me:\n${blocked || '(not provided)'}`;
  const email = `mailto:rettkecomms@gmail.com?subject=${encodeURIComponent(`Vi$ion beta feedback — ${game}`)}&body=${encodeURIComponent(report)}`;
  const copy = async () => { try { await navigator.clipboard.writeText(report); setCopyStatus("Copied. Paste it into your email or community discussion."); } catch { setCopyStatus("Copy was unavailable. Select the report below and copy it."); } };
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><MessageCircle size={17} /> Share beta feedback</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="beta-dialog"><DialogHeader><p className="eyebrow">HELP SHAPE VI$ION</p><DialogTitle>What became clearer?</DialogTitle><DialogDescription>A confusing moment is useful feedback. Use fictional examples; leave out account numbers and personal financial details.</DialogDescription></DialogHeader>
      <label>Experience<NativeSelect value={game} onChange={e => setGame(e.target.value)}>{['Debtbreak','Pulse Range','Debt Invaders','Wants vs. Needs','Hangar / website'].map(name => <NativeSelectOption key={name}>{name}</NativeSelectOption>)}</NativeSelect></label>
      <label>Device and browser <span>Optional</span><Input value={experience} maxLength={120} onChange={e => setExperience(e.target.value)} placeholder="For example: Android phone, Chrome" /></label>
      <label>What did you understand about your money?<Textarea rows={3} value={learned} maxLength={700} onChange={e => setLearned(e.target.value)} placeholder="Which fact or decision made sense?" /></label>
      <label>Where did you get stuck?<Textarea rows={3} value={blocked} maxLength={700} onChange={e => setBlocked(e.target.value)} placeholder="What were you trying to do, and what happened?" /></label>
      <div className="beta-actions"><Button asChild><a href={email}><Mail size={17} /> Open email draft</a></Button><Button variant="outline" onClick={copy}>{copyStatus.startsWith('Copied') ? <Check size={17} /> : <Copy size={17} />} Copy feedback</Button></div>
      <p className="beta-copy-status" role="status">{copyStatus}</p>
      {copyStatus.startsWith('Copy was') && <Textarea aria-label="Feedback report to copy" readOnly rows={6} value={report} />}
      <p className="practice-note">Nothing is sent until you send the email yourself. These notes stay on this page until you leave or refresh it.</p>
    </DialogContent></Dialog>
  </>;
}
