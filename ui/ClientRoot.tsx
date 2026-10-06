"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { ScrollDriver } from "@/lib/scroll";
import { detectTier } from "@/lib/quality";
import { useApp } from "@/lib/store";
import { rig } from "@/lib/rig";
import { Hud } from "./hud/Hud";
import { LoadingScreen } from "./LoadingScreen";
import { Toast } from "./Toast";
import { StillBackdrop } from "./StillBackdrop";

// The 3D world and the companion are code-split; neither is in the first-route bundle.
const Stage = dynamic(() => import("@/scene/Stage"), { ssr: false });
const Companion = dynamic(() => import("./companion/Companion"), { ssr: false });
// the Photos viewer: its own chunk, loaded after first paint
const Lightbox = dynamic(() => import("./Lightbox").then((m) => m.Lightbox), { ssr: false });

export function ClientRoot({ children }: { children: React.ReactNode }) {
  const tier = useApp((s) => s.tier);
  const setTier = useApp((s) => s.setTier);
  const live = tier === "high" || tier === "medium";
  // Mount the 3D world once the browser is idle, so hydration and the HTML hero paint first.
  const [stageOk, setStageOk] = useState(false);
  useEffect(() => {
    if (!live || stageOk) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const go = () => setStageOk(true);
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(go, { timeout: 900 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(go, 200);
    return () => clearTimeout(t);
  }, [live, stageOk]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("capture")) {
      document.documentElement.classList.add("capture");
    }
    let cancelled = false;
    detectTier().then(({ tier, reason }) => {
      if (cancelled) return;
      setTier(tier, reason);
      document.documentElement.dataset.tier = tier;
      console.info(`[quality] ${tier} (${reason})`);
    });
    return () => {
      cancelled = true;
    };
  }, [setTier]);

  // Pointer (desktop) and gyroscope (touch) feed the scene's ±3° parallax.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      rig.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      rig.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    // Touch devices: the gyroscope replaces cursor parallax (±3°).
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      rig.tilt.active = true;
      rig.tilt.x = Math.max(-1, Math.min(1, e.gamma / 30));
      rig.tilt.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    };
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    // iOS: permission comes from the Hero's "Enable tilt" chip (never asked on load).
    const listen = () => window.addEventListener("deviceorientation", onTilt);
    let granted = false;
    try {
      granted = localStorage.getItem("sc-tilt") === "granted";
    } catch {}
    if (coarse && !reduced) {
      if (!DOE?.requestPermission || granted) listen();
      else window.addEventListener("sc-tilt-granted", listen, { once: true });
    }
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onTilt);
      window.removeEventListener("sc-tilt-granted", listen);
    };
  }, []);

  useEffect(() => {
    if (tier) document.documentElement.dataset.tier = tier;
  }, [tier]);

  const sceneReady = useApp((s) => s.sceneReady);
  // Server-rendered poster (the Hero still) paints with the HTML, so the largest paint never waits for
  // hydration or GPU detection. The live canvas or the low-tier backdrop covers it once ready.
  const poster = !(live && sceneReady);

  return (
    <MotionConfig reducedMotion="user">
      {poster && (
        <div className="stage-layer pointer-events-none" aria-hidden>
          <picture>
            {/* phones / tablets in portrait: stills framed for their scene window */}
            <source media="(max-width: 767.98px) and (orientation: portrait)" srcSet="/stills/hero-phone-sm.webp 720w, /stills/hero-phone.webp 1080w" sizes="100vw" />
            <source media="(min-width: 768px) and (max-width: 1023.98px) and (orientation: portrait)" srcSet="/stills/hero-tab.webp" />
            <img src="/stills/hero.webp" srcSet="/stills/hero-sm.webp 960w, /stills/hero.webp 1920w" sizes="100vw" alt="" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
          </picture>
        </div>
      )}
      <ScrollDriver />
      {live && stageOk ? <Stage tier={tier} /> : null}
      {tier === "low" ? <StillBackdrop /> : null}
      <Hud />
      <main id="main" className="content-layer">
        {children}
      </main>
      <LoadingScreen />
      <Lightbox />
      <Toast />
      {tier ? <Companion /> : null}
    </MotionConfig>
  );
}
