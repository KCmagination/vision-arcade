"use client";

import { useRef, useState } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function FieldHelp({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <TooltipProvider delayDuration={200}><Tooltip open={open} onOpenChange={setOpen}>
    <TooltipTrigger asChild><button ref={trigger} type="button" className="field-help-button" aria-label={`Explain ${label.toLowerCase()}`} aria-expanded={open}
      onPointerDown={e => e.preventDefault()}
      onPointerLeave={e => { if (e.pointerType === "touch") e.preventDefault(); }}
      onClick={e => { e.preventDefault(); setOpen(v => !v); }}><Info size={16} aria-hidden="true" /></button></TooltipTrigger>
    <TooltipContent side="top" sideOffset={8} collisionPadding={16} className="field-help-popup" onPointerDownOutside={event => {
      if (trigger.current?.contains(event.detail.originalEvent.target as Node)) event.preventDefault();
    }}>{text}</TooltipContent>
  </Tooltip></TooltipProvider>;
}
