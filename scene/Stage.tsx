"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";
import { useApp, type Tier } from "@/lib/store";
import { TIER_SETTINGS, forcedTier, tierDpr } from "@/lib/quality";
import { rig } from "@/lib/rig";
import { FOV, STOPS } from "./layout";
import { World } from "./World";
import { compileState } from "./SceneRoot";
import { composerHandle } from "./fx/Effects";
import { off } from "./debug";

/** Reports drei loader progress into the app store (the loading screen lives outside the canvas). */
function LoadProgress() {
  const progress = useProgress((s) => s.progress);
  const setLoadProgress = useApp((s) => s.setLoadProgress);
  useEffect(() => setLoadProgress(progress), [progress, setLoadProgress]);
  return null;
}

/**
 * Before the first frame: make every scene visible, upload textures, then compile all shader
 * programs asynchronously in small batches. Compiling inside the first render was a single ~2 s
 * main-thread task on a cold GPU shader cache.
 * Compiles against an offscreen half-float target so variants match what the post-processing
 * composer renders (no tone mapping, linear output).
 */
function Precompile({ onDone, post }: { onDone: () => void; post: boolean }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let cancelled = false;
    const roots: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (o.userData.sceneRoot) roots.push(o);
    });
    compileState.all = true;
    roots.forEach((r) => (r.visible = true));
    performance.mark("sc:precompile:start");

    const seen = new Set<THREE.Material>();
    const jobs: THREE.Object3D[] = [];
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      const mats = Array.isArray(m) ? m : m ? [m] : [];
      if (!mats.some((x) => !seen.has(x))) return;
      mats.forEach((x) => {
        seen.add(x);
        for (const v of Object.values(x)) if (v instanceof THREE.Texture) gl.initTexture(v);
      });
      jobs.push(o);
    });

    // Compile into the same target the composer renders the scene into, so program variants match.
    const own = post && !composerHandle.current ? new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType }) : null;
    const rt = post ? (composerHandle.current?.inputBuffer ?? own) : null;
    const yieldTask = () => new Promise<void>((r) => setTimeout(r, 0));
    (async () => {
      // Small batches: the JS side of program setup stays in short tasks; with
      // KHR_parallel_shader_compile the GPU process compiles/links in parallel off the main thread.
      const pending: Promise<unknown>[] = [];
      for (let i = 0; i < jobs.length; i += 6) {
        if (cancelled) return;
        const prev = gl.getRenderTarget();
        gl.setRenderTarget(rt);
        for (const o of jobs.slice(i, i + 6)) {
          try {
            pending.push(gl.compileAsync(o, camera, scene).catch(() => undefined));
          } catch {
            // compiles on first render instead
          }
        }
        gl.setRenderTarget(prev);
        await yieldTask();
      }
      // Post-processing materials (bloom kernels, effect pass, DOF, outline masks) compile the same way.
      const comp = composerHandle.current;
      if (comp) {
        const mats = new Set<THREE.Material>();
        const visited = new Set<unknown>();
        const visit = (o: unknown, depth: number) => {
          if (!o || typeof o !== "object" || depth > 4 || visited.has(o)) return;
          visited.add(o);
          if (o instanceof THREE.Material) return void mats.add(o);
          if (o instanceof THREE.Texture || o instanceof THREE.WebGLRenderTarget || o instanceof THREE.Camera) return;
          for (const v of Array.isArray(o) ? o : Object.values(o)) visit(v, depth + 1);
        };
        comp.passes.forEach((p) => visit(p, 0));
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        quad.frustumCulled = false;
        const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        for (const m of mats) {
          quad.material = m;
          try {
            pending.push(gl.compileAsync(quad, cam).catch(() => undefined));
          } catch {
            // compiles on first composer render instead
          }
        }
        await yieldTask();
      }
      performance.mark("sc:precompile:queued");
      await Promise.all(pending);
      performance.mark("sc:precompile:end");
      own?.dispose();
      compileState.all = false;
      if (!cancelled) onDone();
    })();
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, onDone, post]);
  return null;
}

/** Marks the scene ready a couple of frames after rendering starts. */
function ReadySignal() {
  const setSceneReady = useApp((s) => s.setSceneReady);
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 3) {
      setSceneReady(true);
      (window as unknown as { __sceneReady?: boolean }).__sceneReady = true;
    }
  });
  return null;
}

/**
 * Live quality guard: dynamic resolution first, tier changes last.
 * - Below the target frame rate, the drawing buffer shrinks in 15 % steps (down to DPR 0.6); with
 *   headroom it grows back. The scene stays 3D: no section ever flips to the postcard stills mid-visit.
 * - Only at the resolution floor: high → medium below 40 fps for 3 s; medium → low below 15 fps for 8 s
 *   (a device that cannot render at all). A forced tier (?tier=) is never changed, but its resolution
 *   still adapts, exactly as for a visitor.
 * Windows that contain a single long hitch (texture upload, GC) are ignored: they say nothing about steady FPS.
 */
const DPR_FLOOR = 0.6;
const FIXED_DPR = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("fixeddpr");
function FpsGuard({ tier, maxDpr }: { tier: Exclude<Tier, "low">; maxDpr: number }) {
  const setTier = useApp((s) => s.setTier);
  const loadingDone = useApp((s) => s.loadingDone);
  const setDpr = useThree((s) => s.setDpr);
  const acc = useRef({ t: 0, frames: 0, worst: 0, low: 0, high: 0, floor: 0, last: 0, warm: 0, dpr: maxDpr });
  useFrame(() => {
    const a = acc.current;
    const now = performance.now();
    // Wall-clock delta (unclamped) so GPU stalls count fully against the frame rate.
    const dt = a.last ? (now - a.last) / 1000 : 0;
    a.last = now;
    if (!loadingDone || rig.capture || document.hidden || dt > 5) return;
    if (a.warm < 2) {
      a.warm += dt; // shader warm-up and first texture uploads right after the loader
      return;
    }
    a.t += dt;
    a.frames++;
    a.worst = Math.max(a.worst, dt);
    if (a.t < 0.5) return;
    const fps = a.frames / a.t;
    const hitch = a.worst > 0.25;
    a.t = 0;
    a.frames = 0;
    a.worst = 0;
    (window as unknown as { __fps?: number; __dpr?: number }).__fps = fps;
    if (hitch) return;

    if (FIXED_DPR) return; // diagnostics: ?fixeddpr measures a tier at full resolution
    const target = tier === "high" ? 52 : 48;
    if (fps < target) {
      a.high = 0;
      a.low += 0.5;
      if (a.low >= 1 && a.dpr > DPR_FLOOR + 0.01) {
        a.low = 0;
        a.dpr = Math.max(DPR_FLOOR, a.dpr * 0.85);
        setDpr(a.dpr);
      }
    } else {
      a.low = 0;
      a.high = fps > 57 ? a.high + 0.5 : 0;
      if (a.high >= 5 && a.dpr < maxDpr - 0.01) {
        a.high = 0;
        a.dpr = Math.min(maxDpr, a.dpr / 0.9);
        setDpr(a.dpr);
      }
    }
    (window as unknown as { __dpr?: number }).__dpr = a.dpr;

    // Tier changes only once resolution can't go lower.
    const atFloor = a.dpr <= DPR_FLOOR + 0.01;
    const floorFps = tier === "high" ? 40 : 15;
    const floorFor = tier === "high" ? 3 : 8;
    a.floor = atFloor && fps < floorFps && !forcedTier() ? a.floor + 0.5 : 0;
    if (a.floor >= floorFor) {
      a.floor = 0;
      const next = tier === "high" ? "medium" : "low";
      setTier(next, `fps ${fps.toFixed(0)} < ${floorFps} at DPR ${a.dpr.toFixed(2)} for ${floorFor}s`);
      console.info(`[quality] degraded to ${next} (fps ${fps.toFixed(0)})`);
    }
  });
  return null;
}

function Renderer() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);
  return null;
}

export default function Stage({ tier }: { tier: Exclude<Tier, "low"> }) {
  const settings = TIER_SETTINGS[tier];
  const dpr = useMemo(() => tierDpr(tier), [tier]);
  const [hidden, setHidden] = useState(false);
  const [compiled, setCompiled] = useState(false);
  const [staged, setStaged] = useState(false);
  const onCompiled = useCallback(() => setCompiled(true), []);
  const onStaged = useCallback(() => setStaged(true), []);
  const frameloop = compiled && !hidden ? "always" : "never";

  // Pause rendering when the tab is hidden.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div className="stage-layer" aria-hidden data-testid="stage" data-frameloop={hidden ? "never" : frameloop}>
      <Canvas
        dpr={dpr}
        frameloop={frameloop}
        shadows={tier === "high" && !off("shadows") ? "soft" : false}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          preserveDrawingBuffer: rig.capture,
        }}
        camera={{ fov: FOV, near: 0.1, far: 1400, position: STOPS[0].cam.toArray() }}
        onCreated={({ scene, gl, camera }) => {
          scene.background = new THREE.Color("#E9F1F7");
          // Shader error checks read the program info log, which blocks until each program links
          // (~1.6 s of main-thread stalls on a cold GPU cache). Keep them in development only.
          // ?shadercheck turns the checks on in production too (tests/shaders.spec.ts).
          gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production" || location.search.includes("shadercheck");
          // Test/diagnostics hooks (renderer stats + camera pose; no app state).
          const w = window as unknown as { __gl?: THREE.WebGLRenderer; __camera?: THREE.Camera; __scene?: THREE.Scene };
          w.__gl = gl;
          w.__camera = camera;
          w.__scene = scene;
          if (location.search.includes("diag")) (window as unknown as { __three?: typeof THREE }).__three = THREE;
        }}
      >
        <Renderer />
        <Suspense fallback={null}>
          <World tier={tier} settings={settings} onStaged={onStaged} />
          {staged && <Precompile onDone={onCompiled} post={settings.post !== "none"} />}
          {compiled && <ReadySignal />}
        </Suspense>
        <LoadProgress />
        <FpsGuard tier={tier} maxDpr={dpr[1]} />
      </Canvas>
    </div>
  );
}
