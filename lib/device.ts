"use client";

import { useSyncExternalStore } from "react";

/**
 * Device modes, mirroring the CSS custom variants in app/globals.css.
 * - frame: desktop and tablet landscape (≥1024 wide, not a short landscape screen)
 * - phone / tabp: stacked layouts (scene window on top, Sunset OS apps below)
 * - land: short landscape ("cinematic": full-bleed scene, app sheet on the right)
 */
export type DeviceMode = "frame" | "phone" | "tabp" | "land";

export const MQ = {
  land: "(max-height: 500px) and (orientation: landscape)",
  phone: "(max-width: 767.98px) and (min-height: 500.02px), (max-width: 767.98px) and (orientation: portrait)",
  tabp: "(min-width: 768px) and (max-width: 1023.98px) and (min-height: 500.02px), (min-width: 768px) and (max-width: 1023.98px) and (orientation: portrait)",
} as const;

export function deviceMode(): DeviceMode {
  if (typeof window === "undefined") return "frame";
  if (window.matchMedia(MQ.land).matches) return "land";
  if (window.matchMedia(MQ.phone).matches) return "phone";
  if (window.matchMedia(MQ.tabp).matches) return "tabp";
  return "frame";
}

const subscribe = (cb: () => void) => {
  const lists = Object.values(MQ).map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener("change", cb));
  return () => lists.forEach((l) => l.removeEventListener("change", cb));
};

/** Current device mode; re-renders on rotation / resize across a breakpoint. Server render assumes desktop. */
export function useDeviceMode(): DeviceMode {
  return useSyncExternalStore(subscribe, deviceMode, () => "frame");
}

/** Stacked = phone or tablet portrait (scene window + apps). */
export const isStacked = (m: DeviceMode) => m === "phone" || m === "tabp";
