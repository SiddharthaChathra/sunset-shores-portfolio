"use client";

import { useRef, useState } from "react";

/**
 * Touch photo stage for the Photos app on phones/tablets: swipe between photos, pinch-zoom (and pan while
 * zoomed), double-tap to zoom in/out, swipe down to close. Pointer events only; `touch-action: none`.
 */
/** Remount (key) per photo to reset the zoom. */
export function PhotoGestures({ src, alt, onStep, onClose }: { src: string; alt: string; onStep: (dir: 1 | -1) => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ s: 1, x: 0, y: 0, drop: 0, anim: true });
  const st = useRef(t);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<{ start: { x: number; y: number; time: number }; base: typeof t; pinch?: { d: number; cx: number; cy: number } } | null>(null);
  const lastTap = useRef<{ x: number; y: number; time: number } | null>(null);

  const set = (n: typeof t) => {
    st.current = n;
    setT(n);
  };

  const clampPan = (s: number, x: number, y: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return { x, y };
    const mx = (r.width * (s - 1)) / 2;
    const my = (r.height * (s - 1)) / 2;
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  };

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const base = { ...st.current, anim: false };
    if (pts.length === 2) {
      const [a, b] = pts;
      g.current = { start: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, time: performance.now() }, base, pinch: { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 } };
    } else {
      g.current = { start: { x: e.clientX, y: e.clientY, time: performance.now() }, base };
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !g.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const { base, start, pinch } = g.current;
    if (pinch && pts.length >= 2) {
      const [a, b] = pts;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s = Math.max(1, Math.min(4, (base.s * d) / pinch.d));
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const p = clampPan(s, base.x + (cx - pinch.cx), base.y + (cy - pinch.cy));
      set({ s, x: p.x, y: p.y, drop: 0, anim: false });
      return;
    }
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (base.s > 1.01) {
      const p = clampPan(base.s, base.x + dx, base.y + dy);
      set({ ...st.current, x: p.x, y: p.y, anim: false });
    } else if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
      set({ ...st.current, drop: dy, anim: false }); // swipe down to close: the photo follows the finger
    } else {
      set({ ...st.current, x: dx * 0.6, drop: 0, anim: false }); // horizontal swipe preview
    }
  };

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const gs = g.current;
    if (!gs) return;
    if (pointers.current.size > 0) {
      // one finger lifted from a pinch: keep panning with the other
      const [p] = [...pointers.current.values()];
      g.current = { start: { x: p.x, y: p.y, time: performance.now() }, base: { ...st.current } };
      return;
    }
    g.current = null;
    const dx = e.clientX - gs.start.x;
    const dy = e.clientY - gs.start.y;
    const quick = performance.now() - gs.start.time < 260 && Math.hypot(dx, dy) < 10;
    if (quick && !gs.pinch) {
      const now = performance.now();
      const lt = lastTap.current;
      if (lt && now - lt.time < 320 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 30) {
        lastTap.current = null;
        // double tap: zoom to 2.5× at the tap point, or back out
        if (st.current.s > 1.01) set({ s: 1, x: 0, y: 0, drop: 0, anim: true });
        else {
          const r = box.current!.getBoundingClientRect();
          const s = 2.5;
          const p = clampPan(s, (r.left + r.width / 2 - e.clientX) * (s - 1), (r.top + r.height / 2 - e.clientY) * (s - 1));
          set({ s, x: p.x, y: p.y, drop: 0, anim: true });
        }
        return;
      }
      lastTap.current = { x: e.clientX, y: e.clientY, time: now };
      return;
    }
    if (gs.pinch || st.current.s > 1.01) {
      if (st.current.s < 1.05) set({ s: 1, x: 0, y: 0, drop: 0, anim: true });
      return;
    }
    if (st.current.drop > 110 || (dy > 60 && performance.now() - gs.start.time < 300)) {
      onClose();
      return;
    }
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1);
    set({ s: 1, x: 0, y: 0, drop: 0, anim: true });
  };

  const fade = Math.max(0.35, 1 - t.drop / 400);
  return (
    <div
      ref={box}
      data-testid="photo-stage"
      data-scale={t.s.toFixed(2)}
      className="relative h-full w-full touch-none overflow-hidden select-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ opacity: fade }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="pointer-events-none h-full w-full object-contain p-3"
        style={{
          transform: `translate3d(${t.x}px, ${t.y + t.drop}px, 0) scale(${t.s * (1 - Math.min(0.15, t.drop / 1200))})`,
          transition: t.anim ? "transform 0.3s cubic-bezier(0.22,1,0.36,1)" : "none",
        }}
      />
    </div>
  );
}
