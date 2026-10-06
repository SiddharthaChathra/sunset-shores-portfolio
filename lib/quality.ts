"use client";

import type { Tier } from "./store";

export interface TierSettings {
  dpr: [number, number];
  particles: number;
  post: "full" | "bloom" | "none";
  physics: boolean;
  nameStep: number;
}

export const TIER_SETTINGS: Record<Exclude<Tier, "low">, TierSettings> = {
  high: { dpr: [1.5, 2], particles: 4000, post: "full", physics: true, nameStep: 2 },
  medium: { dpr: [1, 1.25], particles: 1500, post: "bloom", physics: false, nameStep: 3 },
};

/**
 * Device-pixel-ratio range for a tier, capped by a pixel budget so large or high-DPI screens don't
 * become fill-rate bound (high ≈ 3.3 MP, medium ≈ 2.1 MP of drawing buffer).
 */
export function tierDpr(tier: Exclude<Tier, "low">): [number, number] {
  const [lo, hi] = TIER_SETTINGS[tier].dpr;
  if (typeof window === "undefined") return [lo, hi];
  const budget = tier === "high" ? 3.3e6 : 2.1e6;
  const fit = Math.sqrt(budget / (window.innerWidth * window.innerHeight));
  // phones and tablets: DPR never above 1.5 (battery and heat)
  const touchCap = window.matchMedia("(pointer: coarse)").matches ? 1.5 : Infinity;
  const max = Math.max(1, Math.min(hi, window.devicePixelRatio || 1, fit, touchCap));
  return [Math.min(lo, max), max];
}

export function forcedTier(): Tier | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("tier");
  return q === "high" || q === "medium" || q === "low" ? q : null;
}

function webglRendererMainThread(): string | null {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return null;
  }
}

/**
 * Renderer string probed in a Web Worker (OffscreenCanvas): creating the first WebGL context can take
 * a long time on cold GPU start-up and must not block the main thread. Falls back to the main thread.
 */
function webglRenderer(): Promise<string | null> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return Promise.resolve(webglRendererMainThread());
  return new Promise((resolve) => {
    let done = false;
    const w = new Worker(new URL("./gpu.worker.ts", import.meta.url), { type: "module" });
    const finish = (r: string | null) => {
      if (done) return;
      done = true;
      w.terminate();
      resolve(r);
    };
    w.onmessage = (e: MessageEvent<{ renderer: string | null }>) => finish(e.data.renderer ?? webglRendererMainThread());
    w.onerror = () => finish(webglRendererMainThread());
    setTimeout(() => finish(webglRendererMainThread()), 4000);
    w.postMessage(0);
  });
}

/** Pick the starting quality tier. Low tier = no live canvas (pre-rendered stills). */
export async function detectTier(): Promise<{ tier: Tier; reason: string }> {
  const forced = forcedTier();
  if (forced) return { tier: forced, reason: "forced via ?tier=" };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { tier: "low", reason: "prefers-reduced-motion" };
  }
  // Low-end mobile hints: Save-Data, or a touch device with ≤ 4 GB of memory → the postcard stills.
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (nav.connection?.saveData) return { tier: "low", reason: "Save-Data is on" };
  if (touch && typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return { tier: "low", reason: `low-memory device (${nav.deviceMemory} GB)` };
  const renderer = await webglRenderer();
  if (renderer === null) return { tier: "low", reason: "WebGL unavailable" };
  // Software rasterisers (no GPU) can't run the live world smoothly: show the stills instead.
  if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) {
    return { tier: "low", reason: `software renderer (${renderer})` };
  }
  try {
    const { getGPUTier } = await import("detect-gpu");
    const gpu = await getGPUTier({ benchmarksURL: "/benchmarks", failIfMajorPerformanceCaveat: true, override: { renderer } });
    const mobile = !!(gpu.isMobile || gpu.device);
    if (gpu.type === "BLOCKLISTED" || gpu.type === "WEBGL_UNSUPPORTED") {
      return { tier: "low", reason: `gpu ${gpu.type.toLowerCase()}` };
    }
    if (gpu.type === "FALLBACK") {
      // GPU missing from the benchmark DB (usually newer hardware). Start at medium, the FPS guard upgrades nothing but degrades if needed.
      return { tier: mobile ? "low" : "medium", reason: `unknown gpu ${gpu.gpu ?? ""}` };
    }
    // Integrated Intel GPUs benchmark as tier 3 but stall under the full post stack at 1080p+ (measured on Iris Xe):
    // start them at medium. The FPS guard still steps any tier down at runtime.
    const integrated = /intel|uhd graphics|iris/i.test(gpu.gpu ?? "");
    // Tablets (large touch screens) with a strong GPU run the high tier (DPR capped at 1.5); phones top out at medium.
    const tablet = touch && Math.min(screen.width, screen.height) >= 744;
    if (gpu.tier >= 3 && mobile && tablet) return { tier: "high", reason: `tablet, gpu tier 3 (${gpu.gpu})` };
    if (gpu.tier >= 3 && !mobile && !integrated) return { tier: "high", reason: `gpu tier 3 (${gpu.gpu})` };
    if (gpu.tier >= 2) return { tier: "medium", reason: `gpu tier ${gpu.tier} (${gpu.gpu})` };
    return { tier: "low", reason: `gpu tier ${gpu.tier} (${gpu.gpu})` };
  } catch (err) {
    return { tier: "medium", reason: `detect-gpu failed: ${(err as Error).message}` };
  }
}
