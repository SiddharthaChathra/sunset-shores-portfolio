"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useApp } from "@/lib/store";
import { AppIcon } from "./phone/Phone";

/** Hand-drawn style signature (drawn on with stroke-dashoffset). */
function Signature() {
  return (
    <svg className="signature" width="120" height="34" viewBox="0 0 150 40" aria-hidden fill="none">
      <path
        d="M14 26c-6-2-8-8-2-11s14 1 10 6-14 6-14 9 10 3 16-2c4-4 6-10 6-10l-3 14m8-14l-3 10c-1 4 4 4 7-2l3-9-3 10c0 3 4 3 7-1 3-5 4-12 4-12l-4 16m6-6c4-4 8-6 10-3s-5 8-8 5m14-9c-3 9-2 12 2 10s5-8 5-8-2 9 2 8 7-9 7-9-1 9 3 8 8-14 8-14"
        stroke="var(--accent-strong)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Phone-style notification banner. */
export function Toast() {
  const toast = useApp((s) => s.toast);
  const [hiddenId, setHiddenId] = useState(0);
  const visible = toast && toast.id !== hiddenId ? toast : null;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setHiddenId(toast.id), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--hud-h)+8px)] z-[80] flex justify-center px-4" aria-live="polite" role="status">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={visible.id}
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass flex items-center gap-3 !rounded-[22px] px-4 py-3"
          >
            <AppIcon app="contacts" size={34} />
            <span>
              <span className="block font-mono text-[10.5px] font-bold tracking-[0.12em] text-ink-soft uppercase">Sunset OS · now</span>
              <span className="block text-[14.5px] font-extrabold text-ink">{visible.text}</span>
            </span>
            {visible.signature && <Signature />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
