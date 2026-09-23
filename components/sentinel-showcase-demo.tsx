"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useRenderProfile } from "@/hooks/use-render-profile";
import { sampleAttributeCycle } from "@/lib/sentinel-showcase-cycle.js";
import type { AvatarVisualState, CornerStrengths } from "./avatar-stage";

type RenderStatus = "checking" | "loading" | "ready" | "unavailable";
type DemoContextValue = {
  active: boolean; animated: boolean; compact: boolean; reduced: boolean;
  paused: boolean; setPaused: Dispatch<SetStateAction<boolean>>;
  status: RenderStatus; setStatus: Dispatch<SetStateAction<RenderStatus>>;
  strengths: CornerStrengths; visualState: AvatarVisualState;
  advance: (delta: number) => void;
};
const DemoContext = createContext<DemoContextValue | null>(null);

export function useSentinelDemo() {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error("Sentinel showcase requires its landing-page demo provider.");
  return demo;
}

/** A single render clock drives the model and its four explanatory cards. */
export function SentinelDemo({ children }: { children: ReactNode }) {
  const host = useRef<HTMLElement>(null);
  const cards = useRef<HTMLElement[]>([]);
  const readout = useRef<HTMLElement | null>(null);
  const elapsed = useRef(0);
  const strengths = useRef<CornerStrengths>({ cashFlow: 0, capital: 0, collateral: 0, credit: 0 });
  const visualState = useRef<AvatarVisualState>({ creditGrade: null, creditScore: 300, dti: null, reserveMonths: null });
  const { compact, reduced } = useRenderProfile();
  const [status, setStatus] = useState<RenderStatus>("checking");
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    cards.current = Array.from(host.current?.querySelectorAll<HTMLElement>("[data-showcase-corner]") ?? []);
    readout.current = host.current?.querySelector<HTMLElement>("[data-showcase-readout]") ?? null;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "80px" });
    if (host.current) observer.observe(host.current);
    const visibility = () => setVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => {
    if (status !== "ready" || reduced) {
      for (const card of cards.current) {
        card.style.setProperty("--attribute-glow", "0");
        delete card.dataset.showcaseActive;
      }
    }
    if (reduced) {
      elapsed.current = 0;
      Object.assign(strengths.current, sampleAttributeCycle(0).strengths);
      visualState.current.creditScore = 300;
    }
  }, [status, reduced]);

  const advance = useCallback((delta: number) => {
    // Clamp resume gaps so hidden tabs and off-screen previews never skip phases.
    elapsed.current += Math.min(Math.max(delta, 0), .05) * 1000;
    const frame = sampleAttributeCycle(elapsed.current);
    Object.assign(strengths.current, frame.strengths);
    visualState.current.creditScore = frame.creditScore;
    for (const card of cards.current) {
      const selected = card.dataset.showcaseCorner === frame.id;
      card.style.setProperty("--attribute-glow", selected ? String(frame.power) : "0");
      card.dataset.showcaseActive = String(selected);
    }
    // Visual readout only; do not announce every animation frame to screen readers.
    if (readout.current) {
      const text = `${frame.label} · ${Math.round(frame.power * 100)}%`;
      if (readout.current.textContent !== text) readout.current.textContent = text;
    }
  }, []);

  const active = inView && visible;
  return <DemoContext.Provider value={{ active, animated: status === "ready" && !paused && !reduced, compact, reduced, paused, setPaused, status, setStatus, strengths: strengths.current, visualState: visualState.current, advance }}>
    <section ref={host} className="vl-hero vl-wrap" aria-labelledby="vl-title">{children}</section>
  </DemoContext.Provider>;
}
