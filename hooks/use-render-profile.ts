"use client";

import { useEffect, useState } from "react";

export function useRenderProfile() {
  const [profile, setProfile] = useState({ compact: false, reduced: false, touch: false });
  useEffect(() => {
    const compact = matchMedia("(max-width: 900px), (pointer: coarse)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const touch = matchMedia("(pointer: coarse)");
    const update = () => setProfile({ compact: compact.matches, reduced: reduced.matches, touch: touch.matches });
    update(); compact.addEventListener("change", update); reduced.addEventListener("change", update); touch.addEventListener("change", update);
    return () => { compact.removeEventListener("change", update); reduced.removeEventListener("change", update); touch.removeEventListener("change", update); };
  }, []);
  return profile;
}
