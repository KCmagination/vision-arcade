"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const WELCOME_SEEN_KEY = "vision:welcome:v1";
let seenInThisSession = false;

function hasSeenWelcome() {
  if (seenInThisSession) return true;
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try {
      if (window[name].getItem(WELCOME_SEEN_KEY) === "seen") return true;
    } catch { /* The in-memory preference still works if storage is unavailable. */ }
  }
  return false;
}

export function markWelcomeSeen() {
  seenInThisSession = true;
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try {
      window[name].setItem(WELCOME_SEEN_KEY, "seen");
      return;
    } catch { /* Try session storage, then retain only the in-memory preference. */ }
  }
}

export function focusWelcomeSection(id: string) {
  const target = document.getElementById(id);
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: "start", behavior: "instant" });
}

/** Landing links acknowledge the introduction before entering the input form. */
export function BuildVisionLink({ children, ...props }: Omit<ComponentProps<"a">, "href" | "onClick">) {
  return <a {...props} href="/#picture" onClick={markWelcomeSeen}>{children}</a>;
}

export function LandingHowLink({ className, children }: { className?: string; children: ReactNode }) {
  return <a className={className} href="#how-it-works" onClick={(event) => {
    event.preventDefault();
    markWelcomeSeen();
    focusWelcomeSection("how-it-works");
  }}>{children}</a>;
}

/** One shared, versioned welcome for both /welcome and the hangar. */
export function VisionWelcome({ onBuild, onHow, landing = false }: { onBuild?: () => void; onHow?: () => void; landing?: boolean }) {
  const [open, setOpen] = useState(false);
  const destination = useRef<"inputs" | "how" | null>(null);
  useEffect(() => {
    // A direct input link is an explicit choice to start, including with storage blocked.
    if (hasSeenWelcome() || (!landing && window.location.hash === "#picture")) return;
    const timer = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [landing]);

  const dismiss = () => { markWelcomeSeen(); setOpen(false); };
  const choose = (target: "inputs" | "how") => { destination.current = target; dismiss(); };
  return <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
    <DialogContent className="welcome-dialog" onCloseAutoFocus={(event) => {
      event.preventDefault();
      const target = destination.current;
      destination.current = null;
      // Wait for the dialog's focus trap and scroll lock to release.
      requestAnimationFrame(() => {
        if (target === "inputs") {
          if (onBuild) onBuild();
          else window.location.assign("/#picture");
        } else if (target === "how") {
          if (onHow) onHow();
          else focusWelcomeSection("how-it-works");
        } else document.querySelector<HTMLElement>(landing ? ".vl-hero .vl-button" : "#picture")?.focus({ preventScroll: true });
      });
    }}>
      <DialogHeader>
        <p className="eyebrow">Welcome to Vi$ion Games</p>
        <DialogTitle>See your finances differently. Then learn what changing them actually does.</DialogTitle>
        <DialogDescription>Vi$ion turns four basic financial concepts — <strong>Cash Flow, Capital, Collateral, and Credit</strong> — into something you can see, experiment with, and eventually play.</DialogDescription>
      </DialogHeader>
      <div className="welcome-copy">
        <p>Enter a few numbers about your current situation and Vi$ion builds a financial picture around your avatar. Change the numbers, try a purchase, compare scenarios, and watch the avatar change with them.</p>
        <p><strong>This isn’t about getting a financial “grade.” It’s about learning to see how the pieces work together.</strong></p>
      </div>
      <div className="welcome-actions">
        <Button className="primary-action" onClick={() => choose("inputs")}>Build My Vi$ion <ArrowRight size={17} aria-hidden="true" /></Button>
        <Button variant="outline" onClick={() => choose("how")}>How It Works <ArrowDown size={17} aria-hidden="true" /></Button>
      </div>
    </DialogContent>
  </Dialog>;
}
