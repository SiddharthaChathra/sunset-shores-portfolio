"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SiriOrb } from "./SiriOrb";
import { theme } from "@/theme/theme";
import { useApp } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { Panel } from "./Panel";

/** Bubble size: smaller on phones, where it floats over the content column. (Client-only module.) */
export const ORB = typeof window !== "undefined" && window.innerWidth < 700 ? 52 : 64;
const MARGIN = 20;
const DRAG_THRESHOLD = 8;
const STORE_KEY = "sc-orb";
const SEEN_KEY = "sc-assistant-seen";

type Edge = "left" | "right" | "bottom";
interface Saved {
  edge: Edge;
  t: number;
}

function hudBottom() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--hud-h");
  return (parseFloat(v) || 76) + 12;
}

/** Areas the bubble must never cover: the minimap/HUD column (top-right) and the monogram (top-left). */
function hudBlock(): { right: number; bottom: number } {
  const map = document.querySelector<HTMLElement>('nav[aria-label="Map"]')?.parentElement;
  if (!map) return { right: 0, bottom: hudBottom() };
  const r = map.getBoundingClientRect();
  return { right: window.innerWidth - r.left, bottom: r.bottom + 12 };
}

function edgeToXY(s: Saved) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = s.edge === "right" ? Math.max(hudBottom(), hudBlock().bottom) : hudBottom();
  if (s.edge === "bottom") return { x: MARGIN + s.t * (vw - ORB - MARGIN * 2), y: vh - ORB - MARGIN - 6 };
  const y = top + s.t * (vh - ORB - MARGIN - 6 - top);
  return { x: s.edge === "left" ? MARGIN : vw - ORB - MARGIN, y };
}

function nearestEdge(x: number, y: number): Saved {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const opts = (["right", "left", "bottom"] as Edge[]).map((edge) => {
    const top = edge === "right" ? Math.max(hudBottom(), hudBlock().bottom) : hudBottom();
    const span = Math.max(1, vh - ORB - MARGIN - 6 - top);
    const d = edge === "right" ? vw - ORB - MARGIN - x : edge === "left" ? x - MARGIN : vh - ORB - MARGIN - y;
    const t = edge === "bottom" ? (x - MARGIN) / Math.max(1, vw - ORB - MARGIN * 2) : (y - top) / span;
    return { edge, d: Math.abs(d), t: Math.min(1, Math.max(0, t)) };
  });
  opts.sort((a, b) => a.d - b.d);
  return { edge: opts[0].edge, t: opts[0].t };
}

/** Particle trail behind the bubble while it moves (2D canvas overlay, active only during motion). */
function useTrail() {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const parts = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);
  const raf = useRef(0);
  const runRef = useRef<() => void>(() => {});
  const run = useCallback(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== window.innerWidth * dpr) {
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    parts.current = parts.current.filter((p) => (p.life -= 0.024) > 0);
    for (const p of parts.current) {
      p.x += p.vx;
      p.y += p.vy;
      ctx.globalAlpha = p.life * 0.8;
      ctx.fillStyle = p.life > 0.5 ? theme.color.accent : theme.color.orange;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1 + p.life * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    raf.current = parts.current.length ? requestAnimationFrame(() => runRef.current()) : 0;
  }, []);
  useEffect(() => {
    runRef.current = run;
  }, [run]);
  const emit = useCallback(
    (x: number, y: number) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      for (let i = 0; i < 2; i++)
        parts.current.push({ x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, life: 1 });
      if (!raf.current) raf.current = requestAnimationFrame(run);
    },
    [run],
  );
  return { canvas, emit };
}

export default function Companion() {
  const open = useApp((s) => s.assistantOpen);
  const setOpen = useApp((s) => s.setAssistantOpen);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [initial] = useState<Saved>(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const v = JSON.parse(raw) as Saved;
        if ((v.edge === "left" || v.edge === "right" || v.edge === "bottom") && typeof v.t === "number") return v;
      }
    } catch {}
    // phones: tuck into the bottom-right corner so it covers less of the content
    return window.innerWidth < 700 ? { edge: "bottom", t: 1 } : { edge: "right", t: 0.92 };
  });
  const [pos, setPos] = useState<{ x: number; y: number }>(() => edgeToXY(initial));
  const [edge, setEdge] = useState<Edge>(initial.edge);
  const [seen, setSeen] = useState(() => {
    try {
      return sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const posRef = useRef(pos);
  const vel = useRef({ x: 0, y: 0 });
  const target = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const anim = useRef(0);
  const { canvas: trail, emit } = useTrail();

  const apply = (x: number, y: number) => {
    posRef.current = { x, y };
    if (btn.current) btn.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const animateRef = useRef<() => void>(() => {});
  const animate = useCallback(() => {
    const t = target.current;
    if (!t) return;
    const p = posRef.current;
    const v = vel.current;
    const dt = 1 / 60;
    v.x += ((t.x - p.x) * 170 - v.x * 18) * dt;
    v.y += ((t.y - p.y) * 170 - v.y * 18) * dt;
    const nx = p.x + v.x * dt;
    const ny = p.y + v.y * dt;
    apply(nx, ny);
    emit(nx + ORB / 2, ny + ORB / 2);
    if (Math.hypot(t.x - nx, t.y - ny) < 0.5 && Math.hypot(v.x, v.y) < 5) {
      apply(t.x, t.y);
      setPos({ x: t.x, y: t.y });
      target.current = null;
      anim.current = 0;
      return;
    }
    anim.current = requestAnimationFrame(() => animateRef.current());
  }, [emit]);
  useEffect(() => {
    animateRef.current = animate;
  }, [animate]);

  const snap = useCallback(
    (x: number, y: number) => {
      const s = nearestEdge(x, y);
      setEdge(s.edge);
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(s));
      } catch {}
      target.current = edgeToXY(s);
      cancelAnimationFrame(anim.current);
      anim.current = requestAnimationFrame(animate);
    },
    [animate],
  );

  useEffect(() => {
    apply(posRef.current.x, posRef.current.y);
    const onResize = () => {
      const q = edgeToXY(nearestEdge(posRef.current.x, posRef.current.y));
      apply(q.x, q.y);
      setPos(q);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Cmd/Ctrl+K opens from anywhere; Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useApp.getState().assistantOpen);
      } else if (e.key === "Escape" && useApp.getState().assistantOpen) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) btn.current?.focus();
    wasOpen.current = open;
    if (open) {
      sfx("notify");
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
    }
  }, [open]);

  useFocusTrap(panel, open);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(anim.current);
    target.current = null;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: posRef.current.x, oy: posRef.current.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    const x = Math.min(Math.max(0, d.ox + dx), window.innerWidth - ORB);
    const y = Math.min(Math.max(hudBottom(), d.oy + dy), window.innerHeight - ORB);
    vel.current = { x: (x - posRef.current.x) * 60, y: (y - posRef.current.y) * 60 };
    apply(x, y);
    emit(x + ORB / 2, y + ORB / 2);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) snap(posRef.current.x, posRef.current.y);
    else {
      setSeen(true);
      setOpen(!open);
    }
  };

  const center = { x: pos.x + ORB / 2, y: pos.y + ORB / 2 };

  return (
    <div className="companion-layer">
      <canvas ref={trail} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />
      <button
        ref={btn}
        type="button"
        data-testid="companion-orb"
        aria-label={open ? `Close ${theme.companion.name}` : `Open ${theme.companion.name}, ask about Siddhartha (Ctrl+K)`}
        aria-expanded={open}
        aria-controls="echo-panel"
        aria-keyshortcuts="Control+K Meta+K"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSeen(true);
            setOpen(!open);
          }
        }}
        onClick={(e) => e.preventDefault()}
        className="group fixed top-0 left-0 z-[70] touch-none rounded-full select-none"
        style={{ width: ORB, height: ORB, cursor: "grab" }}
      >
        <span aria-hidden className="absolute -inset-2 rounded-full opacity-60 blur-md transition-opacity group-hover:opacity-100" style={{ background: "conic-gradient(from 90deg,#FF4F8B,#FF9F43,#2EC4B6,#8B6CFF,#FF4F8B)" }} />
        <SiriOrb active={open} className="transition-transform duration-300 group-hover:scale-[1.06]" />
        {!seen && !open && (
          <span aria-hidden className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#FF9F43] px-1.5 font-mono text-[11px] font-bold text-ink shadow-[0_0_0_2px_#fff]">
            <span className="pulse-ring absolute inset-0 rounded-full bg-[#FF9F43]" />
            <span className="relative">1</span>
          </span>
        )}
        <span
          aria-hidden
          className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-extrabold whitespace-nowrap text-white opacity-0 shadow transition-opacity group-hover:opacity-100 md:block ${
            edge === "left" ? "left-[76px]" : "right-[76px]"
          }`}
        >
          Ask about Sid · Ctrl K
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            ref={panel}
            id="echo-panel"
            role="dialog"
            aria-modal="false"
            aria-label={`${theme.companion.name}, portfolio assistant`}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.3 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            style={{ transformOrigin: `${center.x}px ${center.y}px` }}
            className="pointer-events-none fixed inset-0 z-[75]"
          >
            <Panel edge={edge} orb={center} onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
