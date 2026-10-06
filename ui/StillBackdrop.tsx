"use client";

import { useEffect, useRef, useState } from "react";
import { SECTION_ORDER } from "@/theme/theme";
import { useApp } from "@/lib/store";
import { rig } from "@/lib/rig";

/**
 * Low tier / reduced motion: pre-rendered stills of each 3D scene (scripts/capture-stills.mts)
 * crossfading per section with gentle CSS parallax. Falls back to a tinted landscape if a still is missing.
 */
export function StillBackdrop() {
  const active = useApp((s) => s.active);
  const wrap = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const onMove = (e: PointerEvent) => {
      rig.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      rig.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const loop = () => {
      px += (rig.pointer.x - px) * 0.06;
      py += (rig.pointer.y - py) * 0.06;
      const frac = rig.world - Math.round(rig.world);
      if (wrap.current) {
        wrap.current.style.transform = `translate3d(${-px * 12}px, ${-py * 8 - frac * 40}px, 0) scale(1.06)`;
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="stage-layer pointer-events-none overflow-hidden select-none" aria-hidden data-testid="still-backdrop">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--tint-deep)_0%,var(--tint)_55%,#fff_100%)]" />
      {/* Fallback landscape silhouette, tinted per section */}
      <svg className="absolute inset-x-0 bottom-0 h-[42%] w-full" viewBox="0 0 1440 400" preserveAspectRatio="none">
        <path d="M0 250 C 200 170, 380 230, 560 190 S 900 120, 1100 200 S 1340 170, 1440 210 V400 H0Z" fill="var(--tint-deep)" opacity="0.55" />
        <path d="M0 310 C 240 250, 420 300, 700 270 S 1150 240, 1440 290 V400 H0Z" fill="var(--tint-deep)" opacity="0.8" />
      </svg>
      <div ref={wrap} className="absolute inset-0 will-change-transform">
        {SECTION_ORDER.map((id, i) =>
          // Only the active still and its neighbours are mounted (phones on slow networks fetch ~3 images, not 7).
          failed[id] || Math.abs(i - active) > 1 ? null : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              src={`/stills/${id}.webp`}
              srcSet={`/stills/${id}-sm.webp 960w, /stills/${id}.webp 1920w`}
              sizes="100vw"
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1100ms] ease-out"
              style={{ opacity: i === active ? 1 : 0 }}
              decoding="async"
              onError={() => setFailed((f) => ({ ...f, [id]: true }))}
            />
          ),
        )}
      </div>
    </div>
  );
}
