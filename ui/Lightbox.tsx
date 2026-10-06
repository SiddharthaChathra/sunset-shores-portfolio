"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useApp } from "@/lib/store";
import { getLenis } from "@/lib/scroll";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { Phone } from "./phone/Phone";

/** Photos app: certificate / document viewer. Swipe, tap-to-zoom, download, Esc, ←/→, focus trap. */
export function Lightbox() {
  const lb = useApp((s) => s.lightbox);
  const close = useApp((s) => s.closeLightbox);
  const step = useApp((s) => s.stepLightbox);
  const jump = useApp((s) => s.jumpLightbox);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const swipe = useRef<{ x: number; t: number } | null>(null);
  const [zoom, setZoom] = useState<{ on: boolean; x: number; y: number }>({ on: false, x: 50, y: 50 });
  const open = !!lb;
  const c = lb ? lb.list[lb.index] : null;

  useEffect(() => {
    if (open) {
      opener.current = document.activeElement as HTMLElement | null;
      getLenis()?.stop();
    } else {
      getLenis()?.start();
      opener.current?.focus?.();
    }
  }, [open]);

  useFocusTrap(dialog, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, step]);

  const resetZoom = () => setZoom({ on: false, x: 50, y: 50 });

  return (
    <AnimatePresence>
      {lb && c && (
        <motion.div
          key="photos"
          className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-[rgb(255_227_211/0.7)] backdrop-blur-md" onClick={close} />
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lb-title"
            data-testid="lightbox"
            className="relative"
            initial={{ y: 30, scale: 0.94, rotate: -2 }}
            animate={{ y: 0, scale: 1, rotate: 0 }}
            exit={{ y: 16, scale: 0.97 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Phone
              app="photos"
              wide
              title="Photos"
              subtitle={lb.list.length > 1 ? `${lb.index + 1} of ${lb.list.length}` : c.issuer}
              screenKey={c.id}
              height="min(700px, 92svh)"
              action={
                <button type="button" className="pill !h-9" onClick={close} aria-label="Close Photos">
                  Done
                </button>
              }
            >
              <div className="flex h-full flex-col">
                <div
                  className="relative flex min-h-[220px] flex-1 touch-pan-y items-center justify-center overflow-hidden bg-[#f6efe9]"
                  onPointerDown={(e) => (swipe.current = { x: e.clientX, t: performance.now() })}
                  onPointerUp={(e) => {
                    const s = swipe.current;
                    swipe.current = null;
                    if (!s || zoom.on) return;
                    const dx = e.clientX - s.x;
                    if (Math.abs(dx) > 60 && performance.now() - s.t < 700) {
                      resetZoom();
                      step(dx < 0 ? 1 : -1);
                    }
                  }}
                >
                  {c.preview ? (
                    <button
                      type="button"
                      className={`h-full w-full ${zoom.on ? "cursor-zoom-out" : "cursor-zoom-in"}`}
                      aria-label={zoom.on ? "Zoom out" : "Zoom in"}
                      onClick={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setZoom((z) => (z.on ? { on: false, x: 50, y: 50 } : { on: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }));
                      }}
                      onPointerMove={(e) => {
                        if (!zoom.on) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        setZoom({ on: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={c.id}
                        src={c.preview}
                        alt={`${c.title}, issued by ${c.issuer}`}
                        draggable={false}
                        className="h-full w-full object-contain p-3 transition-transform duration-300"
                        style={{ transform: zoom.on ? "scale(2.2)" : "scale(1)", transformOrigin: `${zoom.x}% ${zoom.y}%` }}
                      />
                    </button>
                  ) : (
                    <p className="p-10 text-center text-ink-soft">Preview not available.</p>
                  )}
                  {lb.list.length > 1 && (
                    <>
                      <button type="button" className="pill absolute top-1/2 left-3 -translate-y-1/2 !h-10 !w-10 !justify-center !px-0 text-[18px]" onClick={() => (resetZoom(), step(-1))} aria-label="Previous photo">
                        ‹
                      </button>
                      <button type="button" className="pill absolute top-1/2 right-3 -translate-y-1/2 !h-10 !w-10 !justify-center !px-0 text-[18px]" onClick={() => (resetZoom(), step(1))} aria-label="Next photo">
                        ›
                      </button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 px-5 py-3">
                  <div className="min-w-0">
                    {lb.achievement && <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-accent-strong uppercase">Trophy unlocked</p>}
                    <h2 id="lb-title" className="truncate text-[17px] leading-tight font-extrabold text-ink">
                      {c.title}
                    </h2>
                    <p className="font-mono text-[12px] text-ink-soft">
                      {c.issuer} · {c.dateLabel} · {c.category}
                    </p>
                  </div>
                  {c.file && (
                    <div className="flex gap-2">
                      <a className="btn btn-ghost btn-sm" href={c.file} target="_blank" rel="noopener noreferrer">
                        Open original<span className="sr-only"> (opens in new tab)</span>
                      </a>
                      <a className="btn btn-primary btn-sm" href={c.file} download>
                        Download
                      </a>
                    </div>
                  )}
                </div>
                {lb.list.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto px-5 pb-4" aria-label="All photos">
                    {lb.list.map((x, i) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => {
                          resetZoom();
                          jump(i);
                        }}
                        aria-label={`Show ${x.title}`}
                        aria-current={i === lb.index ? "true" : undefined}
                        className={`h-12 w-16 shrink-0 overflow-hidden rounded-[8px] transition ${i === lb.index ? "ring-2 ring-accent" : "opacity-70 hover:opacity-100"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {x.thumb && <img src={x.thumb} alt="" className="h-full w-full object-cover" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Phone>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
