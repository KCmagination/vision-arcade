"use client";

import { Component, lazy, Suspense, useCallback, useEffect, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSentinelDemo } from "./sentinel-showcase-demo";

const SentinelScene = lazy(() => import("./sentinel-showcase-scene"));

class ShowcaseBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function SentinelShowcase() {
  const { active, animated, compact, reduced, status, setStatus, strengths, visualState, advance } = useSentinelDemo();
  const ready = useCallback(() => setStatus("ready"), [setStatus]);
  const unavailable = useCallback(() => setStatus("unavailable"), [setStatus]);

  useEffect(() => {
    // Test support before downloading the 3D renderer; the artwork is always available.
    try {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: false });
      setStatus(context ? "loading" : "unavailable");
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { setStatus("unavailable"); }
  }, [setStatus]);

  useEffect(() => {
    if (status !== "loading" || !active) return;
    const timeout = window.setTimeout(unavailable, 20000);
    return () => window.clearTimeout(timeout);
  }, [status, active, unavailable]);

  const renderScene = status === "ready" || (status === "loading" && active);
  return <div className="vl-sentinel" data-render-state={status}>
    <div className="vl-sentinel-visual" role="img" aria-label={status === "ready" ? reduced ? "Front-facing Sentinel with all four attributes at their lowest demonstration strength." : "Front-facing Sentinel demonstrating shield, sword, helm and wings, then armor. Each attribute rises from weakest to strongest and back, with matching equipment and concept-square glow." : "Sentinel character artwork."}>
      <img className="vl-sentinel-poster" src="/characters/sentinel.png" width="1024" height="1536" alt="" aria-hidden="true" fetchPriority="high" />
      {renderScene && <div className="vl-sentinel-canvas" aria-hidden="true"><ShowcaseBoundary onError={unavailable}><Suspense fallback={null}>
        <SentinelScene active={active} animated={animated} compact={compact} strengths={strengths} visualState={visualState} advance={advance} onReady={ready} onError={unavailable} />
      </Suspense></ShowcaseBoundary></div>}
    </div>
    <SentinelDemoControls />
  </div>;
}

export function SentinelDemoControls() {
  const { status, reduced, paused, setPaused } = useSentinelDemo();
  return <div className="vl-sentinel-controls">
      <span className="vl-sentinel-status" data-showcase-readout="">{status === "ready" ? reduced ? "SENTINEL / FRONT VIEW" : "Shield · 0%" : status === "unavailable" ? "SENTINEL / STILL VIEW" : "SENTINEL / LOADING 3D"}</span>
      {status === "ready" && !reduced && <Button className="vl-sentinel-toggle" variant="ghost" size="sm" type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? "Resume attribute demonstration" : "Pause attribute demonstration"}>
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{paused ? "Resume" : "Pause"}
      </Button>}
  </div>;
}
