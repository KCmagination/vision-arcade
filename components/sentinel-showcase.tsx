"use client";

import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRenderProfile } from "@/hooks/use-render-profile";

const SentinelScene = lazy(() => import("./sentinel-showcase-scene"));

class ShowcaseBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function SentinelShowcase() {
  const host = useRef<HTMLDivElement>(null);
  const { compact, reduced } = useRenderProfile();
  const [status, setStatus] = useState<"checking" | "loading" | "ready" | "unavailable">("checking");
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const ready = useCallback(() => setStatus("ready"), []);
  const unavailable = useCallback(() => setStatus("unavailable"), []);

  useEffect(() => {
    // Test support before downloading the 3D renderer; the artwork is always available.
    try {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: false });
      setStatus(context ? "loading" : "unavailable");
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { setStatus("unavailable"); }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "80px" });
    if (host.current) observer.observe(host.current);
    const visibility = () => setVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => {
    if (status !== "loading" || !inView || !visible) return;
    const timeout = window.setTimeout(unavailable, 20000);
    return () => window.clearTimeout(timeout);
  }, [status, inView, visible, unavailable]);

  const animated = !paused && !reduced;
  const renderScene = status === "ready" || (status === "loading" && inView && visible);
  return <div ref={host} className="vl-sentinel" data-render-state={status}>
    <div className="vl-sentinel-visual" role="img" aria-label={status === "ready" ? "Sentinel, the Vi$ion game avatar, with all four corners at 50 percent power." : "Sentinel character artwork."}>
      <img className="vl-sentinel-poster" src="/characters/sentinel.png" width="1024" height="1536" alt="" aria-hidden="true" fetchPriority="high" />
      {renderScene && <div className="vl-sentinel-canvas" aria-hidden="true"><ShowcaseBoundary onError={unavailable}><Suspense fallback={null}>
        <SentinelScene active={inView && visible} animated={animated} compact={compact} onReady={ready} onError={unavailable} />
      </Suspense></ShowcaseBoundary></div>}
    </div>
    <div className="vl-sentinel-controls">
      <span className="vl-sentinel-status">{status === "ready" ? "SENTINEL / 50% POWER" : status === "unavailable" ? "SENTINEL / STILL VIEW" : "SENTINEL / LOADING 3D"}</span>
      {status === "ready" && !reduced && <Button className="vl-sentinel-toggle" variant="ghost" size="sm" type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? "Resume Sentinel rotation" : "Pause Sentinel rotation"}>
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{paused ? "Rotate" : "Pause"}
      </Button>}
    </div>
  </div>;
}
