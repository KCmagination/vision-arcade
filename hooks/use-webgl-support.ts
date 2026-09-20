"use client";

import { useEffect, useState } from "react";

export function useWebGLSupport() {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2");
      setSupported(Boolean(context));
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { setSupported(false); }
  }, []);
  return supported;
}
