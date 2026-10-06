"use client";

import { useEffect } from "react";
import { useDeviceMode } from "./device";

/** Scroll progress (0..1) through a section's sticky span: 0 when its top reaches the viewport top. */
export function sectionProgress(id: string): number {
  const el = typeof document !== "undefined" ? document.getElementById(id) : null;
  if (!el) return 0;
  const top = el.getBoundingClientRect().top;
  const span = Math.max(1, el.offsetHeight - window.innerHeight);
  return Math.min(1, Math.max(0, -top / span));
}

/**
 * Calls `onFrame(progress)` every animation frame while mounted, without React re-renders.
 * Used to drive scroll-linked phone screens and message reveals.
 */
export function useSectionFrame(id: string, onFrame: (p: number) => void) {
  useEffect(() => {
    let raf = 0;
    let last = -1;
    const loop = () => {
      const p = sectionProgress(id);
      if (Math.abs(p - last) > 0.0005) {
        last = p;
        onFrame(p);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id, onFrame]);
}

/** True where the phone is a framed device (desktop and tablet landscape); false on the frameless app layouts. */
export function useFramedPhone() {
  return useDeviceMode() === "frame";
}
