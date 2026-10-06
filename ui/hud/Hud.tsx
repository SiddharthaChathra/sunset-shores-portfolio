"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SECTION_ORDER, world } from "@/theme/theme";
import { profile } from "@/content/profile";
import { useApp } from "@/lib/store";
import { rig } from "@/lib/rig";
import { scrollToSection } from "@/lib/scroll";
import { setSoundEnabled, sfx } from "@/lib/audio";
import { deviceMode, useDeviceMode } from "@/lib/device";
import dynamic from "next/dynamic";

/** Waypoints along the coastal road (minimap units, 0..100). */
const WAYPOINTS: [number, number][] = [
  [17, 82],
  [37, 69],
  [22, 50],
  [44, 36],
  [66, 50],
  [70, 27],
  [87, 14],
];
const ROAD = "M" + WAYPOINTS.map(([x, y]) => `${x} ${y}`).join(" L");

/** Neon "SC" monogram that flickers on tube by tube at load. */
export function Monogram({ size = 46, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex items-center justify-center rounded-[14px] bg-ink font-display text-[22px] tracking-[0.04em] ${className}`}
      style={{ width: size, height: size, boxShadow: "0 0 0 2px rgb(255 79 139 / 0.55), 0 8px 22px rgb(255 79 139 / 0.35)" }}
    >
      <span className="neon-tube" style={{ animation: "tube-on 1.1s steps(1) 0.3s both" }}>
        S
      </span>
      <span className="neon-tube-orange" style={{ animation: "tube-on 1.1s steps(1) 0.75s both" }}>
        C
      </span>
    </span>
  );
}

/** The coastal map drawing with the live position arrow and the progress fill along the road. */
export function MapArt({ className, label }: { className: string; label?: string }) {
  const arrow = useRef<SVGGElement>(null);
  const fill = useRef<SVGPathElement>(null);

  useEffect(() => {
    let raf = 0;
    const total = WAYPOINTS.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - WAYPOINTS[i][0], p[1] - WAYPOINTS[i][1]), 0);
    const loop = () => {
      const w = Math.min(WAYPOINTS.length - 1, Math.max(0, rig.world));
      const i = Math.min(WAYPOINTS.length - 2, Math.floor(w));
      const f = w - i;
      const [ax, ay] = WAYPOINTS[i];
      const [bx, by] = WAYPOINTS[i + 1];
      const x = ax + (bx - ax) * f;
      const y = ay + (by - ay) * f;
      const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI + 90;
      arrow.current?.setAttribute("transform", `translate(${x} ${y}) rotate(${angle})`);
      if (fill.current) {
        let done = 0;
        for (let k = 0; k < i; k++) done += Math.hypot(WAYPOINTS[k + 1][0] - WAYPOINTS[k][0], WAYPOINTS[k + 1][1] - WAYPOINTS[k][1]);
        done += Math.hypot(bx - ax, by - ay) * f;
        fill.current.style.strokeDashoffset = String(total - done);
        fill.current.style.strokeDasharray = String(total);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg viewBox="0 0 100 100" className={className} role={label ? "img" : "presentation"} aria-label={label}>
        <defs>
          <clipPath id="mm-clip">
            <circle cx="50" cy="50" r="50" />
          </clipPath>
          <linearGradient id="mm-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF4F8B" />
            <stop offset="100%" stopColor="#FF9F43" />
          </linearGradient>
        </defs>
        <g clipPath="url(#mm-clip)">
          <rect width="100" height="100" fill="#F8DDBB" />
          {/* bay + open sea (east) */}
          <path d="M58 0 C 62 18, 78 22, 80 38 S 96 60, 100 64 V0Z" fill="#6FD3CB" />
          <path d="M100 64 C 92 70, 88 86, 100 100Z" fill="#6FD3CB" />
          <path d="M0 100 C 10 92, 24 96, 30 100Z" fill="#6FD3CB" opacity="0.8" />
          <path d="M8 20 h14 v10 h-14z M44 70 h12 v9 h-12z M10 50 h8 v12 h-8z" fill="#FFF1E2" />
          <path d={ROAD} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d={ROAD} fill="none" stroke="#5B5670" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path ref={fill} d={ROAD} fill="none" stroke="url(#mm-grad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <g ref={arrow}>
            <path d="M0 -7 L5 5 L0 2.5 L-5 5Z" fill="#FF4F8B" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
          </g>
        </g>
        <circle cx="50" cy="50" r="49" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export const WAYPOINT_XY = WAYPOINTS;

function Minimap() {
  const active = useApp((s) => s.active);
  const setSheet = useApp((s) => s.setSheet);
  return (
    <nav aria-label="Map" className="relative land:hidden">
      <MapArt className="h-[136px] w-[136px] rounded-full shadow-[0_14px_34px_rgb(255_79_139/0.3),0_0_0_3px_#fff,0_0_0_5px_rgb(255_79_139/0.5)] stack:h-[56px] stack:w-[56px] tabp:h-[88px] tabp:w-[88px]" />
      {/* Waypoints are real buttons positioned over the map (desktop). */}
      <ol className="absolute inset-0 app:hidden touch:hidden">
        {SECTION_ORDER.map((id, i) => {
          const [x, y] = WAYPOINTS[i];
          const on = active === i;
          return (
            <li key={id} className="group absolute" style={{ left: `${x}%`, top: `${y}%` }}>
              <button
                type="button"
                data-testid={`minimap-waypoint-${i}`}
                aria-label={`${i + 1}. Drive to ${world.labels[id]} (${world.locations[id]})${on ? ", current location" : ""}`}
                aria-current={on ? "location" : undefined}
                onClick={() => {
                  sfx("click");
                  scrollToSection(i);
                }}
                className="peer -mt-3 -ml-3 flex h-6 w-6 items-center justify-center rounded-full"
              >
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full font-mono text-[9px] font-bold transition-all duration-300 ${
                    on ? "scale-110 bg-ink text-white shadow-[0_0_0_2px_#fff,0_0_12px_#FF4F8B]" : "bg-white text-ink shadow-[0_0_0_1.5px_#23203A] hover:scale-125"
                  }`}
                >
                  {i + 1}
                </span>
              </button>
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2 rounded-full bg-ink px-2.5 py-1 font-mono text-[10.5px] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                {world.locations[id]}
              </span>
            </li>
          );
        })}
      </ol>
      {/* Phones and tablets: the minimap opens the full-screen map sheet. */}
      <button
        type="button"
        data-testid="minimap-open"
        className="absolute -inset-1 rounded-full frame:hidden touch:block"
        aria-label={`Open the map. You are at ${world.locations[SECTION_ORDER[active]]}.`}
        onClick={() => {
          sfx("click");
          setSheet("map");
        }}
      />
    </nav>
  );
}

/** Location card bottom-left on section entry: slides in, holds 1.6 s, fades. */
function LocationCard() {
  const active = useApp((s) => s.active);
  const loadingDone = useApp((s) => s.loadingDone);
  const mode = useDeviceMode();
  const [shown, setShown] = useState<number | null>(null);
  const hold = mode === "frame" ? 1600 : 1200;
  // desktop layout under 1280 px or on a touch tablet: the compact pill, tucked under the HUD
  const [compactFrame, setCompactFrame] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 1279.98px), (pointer: coarse)");
    const on = () => setCompactFrame(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    if (!loadingDone) return;
    const settle = setTimeout(() => setShown(active), 350);
    const hide = setTimeout(() => setShown((s) => (s === active ? null : s)), 350 + 450 + hold);
    return () => {
      clearTimeout(settle);
      clearTimeout(hide);
    };
  }, [active, loadingDone, hold]);
  const id = shown === null ? null : SECTION_ORDER[shown];
  if (mode !== "frame" || compactFrame)
    return (
      // Mobile: a compact pill on the bottom edge of the scene window, never over the app content.
      // Narrow desktop / touch tablet: the same pill, top centre in the HUD row (between name and minimap).
      <div
        data-hud-overlay
        className={`pointer-events-none fixed z-30 ${mode === "frame" ? "top-[26px] left-1/2 -translate-x-1/2" : "top-[calc(var(--scene-h)-50px)] left-[calc(var(--gutter)+var(--safe-l))] land:top-auto land:bottom-4"}`}
        aria-live="polite"
      >
        <AnimatePresence>
          {id && (
            <motion.p
              key={id}
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-2 rounded-full bg-ink/85 py-1.5 pr-3.5 pl-3 text-white shadow-[0_8px_20px_rgb(35_32_58/0.3)] backdrop-blur"
            >
              <span className="display skew text-[clamp(1.1rem,5vw,1.5rem)] text-[#FFD7A8] italic">{world.labels[id]}</span>
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase">{world.locations[id]}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  return (
    <div data-hud-overlay className="pointer-events-none fixed bottom-7 left-[clamp(16px,3vw,44px)] z-30" aria-live="polite">
      <AnimatePresence>
        {id && (
          <motion.div
            key={id}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="leading-none"
          >
            <p className="display grad-text skew text-[clamp(26px,3.2vw,46px)] italic">
              {world.name} — {world.labels[id]}
            </p>
            <p className="mt-2 inline-block rounded-full bg-ink px-3 py-1 font-mono text-[11px] tracking-[0.18em] text-white uppercase">
              {world.locations[id]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "ABOUT ✓" banner the first time a section is fully viewed (once per session; never under reduced motion). */
function SectionToasts() {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let done: string[] = [];
    try {
      done = JSON.parse(sessionStorage.getItem("ss-done") ?? "[]");
    } catch {}
    let raf = 0;
    let t: ReturnType<typeof setTimeout> | undefined;
    const loop = () => {
      const vh = window.innerHeight;
      rig.sections.forEach((s, i) => {
        const id = SECTION_ORDER[i];
        if (i === 0 || done.includes(id)) return;
        if (rig.scrollY + vh >= s.top + s.height - 4 && rig.scrollY >= s.top - 2) {
          done.push(id);
          try {
            sessionStorage.setItem("ss-done", JSON.stringify(done));
          } catch {}
          setToast(world.labels[id]);
          clearTimeout(t);
          t = setTimeout(() => setToast(null), deviceMode() === "frame" ? 900 : 800);
        }
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);
  return (
    <div data-hud-overlay className="pointer-events-none fixed top-[calc(var(--hud-h)+6px)] left-1/2 z-30 -translate-x-1/2 app:top-[calc(var(--safe-t)+16px)]" role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast}
            initial={{ y: -12, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="wipe-in rounded-full bg-ink px-5 py-1.5 font-display text-[18px] tracking-[0.08em] text-white uppercase shadow-[0_10px_26px_rgb(255_79_139/0.35)] app:px-4 app:py-1 app:text-[15px]"
          >
            {toast} <span className="text-[#FF9F43]">✓</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Speed lines at the screen edges when driving fast between sections (+ throttled whoosh). */
function SpeedLines() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const lines = Array.from({ length: 46 }, () => ({ a: Math.random() * Math.PI * 2, r: 0.55 + Math.random() * 0.4, l: 0.08 + Math.random() * 0.14, w: 1 + Math.random() * 2 }));
    let raf = 0;
    let level = 0;
    const loop = () => {
      const target = Math.min(1, Math.max(0, (Math.abs(rig.velocity) - 18) / 40));
      level += (target - level) * 0.15;
      if (level > 0.6) sfx("whoosh");
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      if (level > 0.02) {
        const cx = w / 2;
        const cy = h / 2;
        const R = Math.hypot(cx, cy);
        for (const ln of lines) {
          ln.r += 0.02 * level;
          if (ln.r > 1.05) ln.r = 0.55;
          const x0 = cx + Math.cos(ln.a) * R * ln.r;
          const y0 = cy + Math.sin(ln.a) * R * ln.r;
          const x1 = cx + Math.cos(ln.a) * R * (ln.r + ln.l);
          const y1 = cy + Math.sin(ln.a) * R * (ln.r + ln.l);
          ctx.strokeStyle = `rgba(255,255,255,${0.55 * level})`;
          ctx.lineWidth = ln.w;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvas} data-hud-overlay aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[5] h-[100svh] w-full stack:z-[21] stack:h-[var(--scene-h)]" />;
}

/** Thin gradient progress line along the bottom edge, with speedometer ticks. */
function ProgressLine() {
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${rig.world / (SECTION_ORDER.length - 1)})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div data-hud-overlay aria-hidden className="pointer-events-none fixed inset-x-0 bottom-[var(--safe-b)] z-[45] h-[4px] bg-ink/10 app:h-[3px]">
      <span ref={bar} className="block h-full origin-left" style={{ background: "var(--grad)", transform: "scaleX(0)" }} />
      <div className="absolute inset-0 flex justify-between px-[1px]">
        {SECTION_ORDER.map((id) => (
          <span key={id} className="h-full w-[2px] bg-white/80" />
        ))}
      </div>
    </div>
  );
}

// phones/tablets only: dock, map and "More" sheets (loaded after first paint)
const MobileNav = dynamic(() => import("./MobileNav").then((m) => m.MobileNav), { ssr: false });

export function Hud() {
  const sound = useApp((s) => s.sound);

  // Restore the radio preference only after a user gesture (autoplay policy).
  useEffect(() => {
    let wanted = false;
    try {
      wanted = localStorage.getItem("sc-sound") === "1";
    } catch {}
    if (!wanted) return;
    const resume = () => setSoundEnabled(true);
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, []);

  return (
    <>
      <header className="hud-layer pointer-events-none fixed inset-x-0 top-0 z-40">
        <a href="#about" className="sr-only-focusable pointer-events-auto absolute top-2 left-2 z-50 rounded-lg bg-white px-3 py-2 text-sm font-bold text-ink">
          Skip to content
        </a>
        <div className="flex items-start justify-between px-[clamp(14px,2.4vw,32px)] pt-4 app:px-[calc(14px+var(--safe-l))] app:pt-[calc(var(--safe-t)+10px)]">
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              sfx("click");
              scrollToSection(0);
            }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl"
          >
            <span className="sr-only">Back to top: </span>
            <Monogram className="app:!h-[44px] app:!w-[44px] app:!rounded-[12px] app:!text-[17px]" />
            <span className="hidden flex-col leading-tight lg:flex">
              <span className="text-[15px] font-extrabold text-ink">{profile.name}</span>
              <span className="font-mono text-[11px] tracking-[0.12em] text-ink-soft uppercase">{world.name} · Portfolio</span>
            </span>
          </a>
          <div className="pointer-events-auto flex flex-col items-end gap-2.5">
            <Minimap />
            {/* Résumé + radio: in the HUD on desktop; in the "More" sheet / cinematic bar on mobile */}
            <div className="flex items-center gap-2 app:hidden">
              <a href={profile.links.resume} download="Siddhartha_Chathra_BS_Resume.pdf" className="btn btn-primary btn-sm !h-[34px] !px-4 !text-[13px] touch:!h-11" onClick={() => sfx("click")}>
                Résumé
              </a>
              <button
                type="button"
                className="btn btn-ghost btn-sm !h-[34px] !px-3 !text-[12px] touch:!h-11"
                aria-pressed={sound}
                aria-label={sound ? "Turn the radio off" : "Turn the radio on"}
                onClick={() => setSoundEnabled(!sound)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="8" width="18" height="12" rx="3" />
                  <path d="M7 8l10-5" />
                  <circle cx="15.5" cy="14" r="2.5" />
                  {!sound && <path d="M4 4l16 16" />}
                </svg>
                <span className="font-mono">{sound ? "ON" : "OFF"}</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <SpeedLines />
      <LocationCard />
      <SectionToasts />
      <ProgressLine />
      <MobileNav />
    </>
  );
}
