"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { deviceMode } from "@/lib/device";
import { useSectionFrame } from "@/lib/useSectionProgress";

/**
 * Phone screen content that scrolls with the page: as the (sticky, taller) section is scrolled,
 * the screen glides from top to bottom. No inner scroll container, so the wheel never gets trapped.
 * `lead`/`trail` keep the first and last screenfuls on screen for a moment.
 */
export function ScrollLinked({
  section,
  children,
  lead = 0.08,
  trail = 0.12,
  map,
}: {
  section: string;
  children: ReactNode;
  lead?: number;
  trail?: number;
  /** Optional remap of section progress, e.g. per-item progress inside a multi-item section. */
  map?: (p: number) => number;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const onFrame = useCallback(
    (raw: number) => {
      const p = map ? map(raw) : raw;
      const el = inner.current;
      const box = el?.closest<HTMLElement>("[data-phone-screen]");
      if (!el || !box) return;
      if (deviceMode() !== "frame") {
        el.style.transform = "";
        return;
      }
      const max = Math.max(0, el.scrollHeight - box.clientHeight);
      const k = Math.min(1, Math.max(0, (p - lead) / Math.max(0.01, 1 - lead - trail)));
      const eased = k * k * (3 - 2 * k);
      el.style.transform = `translate3d(0, ${-max * eased}px, 0)`;
    },
    [lead, trail, map],
  );
  useSectionFrame(section, onFrame);
  return (
    <div ref={inner} className="will-change-transform">
      {children}
    </div>
  );
}
