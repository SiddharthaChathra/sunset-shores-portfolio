"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { rig } from "@/lib/rig";

export type AppId = "profile" | "projects" | "messages" | "stats" | "photos" | "contacts";

const APP_META: Record<AppId, { label: string; glyph: ReactNode }> = {
  profile: {
    label: "Profile",
    glyph: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" />,
  },
  projects: {
    label: "Projects",
    glyph: <path d="M4 7h16v12H4zM9 7V4h6v3" />,
  },
  messages: {
    label: "Messages",
    glyph: <path d="M4 5h16v11H9l-5 4z" />,
  },
  stats: {
    label: "Stats",
    glyph: <path d="M5 20V11M12 20V5M19 20v-7" />,
  },
  photos: {
    label: "Photos",
    glyph: <path d="M4 6h16v13H4zM4 16l5-5 4 4 3-3 4 4" />,
  },
  contacts: {
    label: "Contacts",
    glyph: <path d="M6 3h12v18H6zM12 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm-4 6a4 4 0 018 0" />,
  },
};

export function AppIcon({ app, size = 30 }: { app: AppId; size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-[9px] shadow-[0_4px_10px_rgb(255_79_139/0.35)]"
      style={{ width: size, height: size, background: "var(--grad)" }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke="#23203A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {APP_META[app].glyph}
      </svg>
    </span>
  );
}

function StatusBar() {
  return (
    <div className="flex h-8 shrink-0 items-center justify-between px-6 font-mono text-[11.5px] font-bold text-ink" aria-hidden>
      <span>6:47 PM</span>
      <span className="flex items-center gap-1.5">
        <span className="mr-1 tracking-wide">SUNSET</span>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="4.3" y="5" width="3" height="6" rx="1" />
          <rect x="8.6" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="12.9" y="0" width="3" height="11" rx="1" />
        </svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none">
          <rect x="0.75" y="0.75" width="20" height="9.5" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <rect x="2.5" y="2.5" width="14" height="6" rx="1.5" fill="currentColor" />
          <rect x="22" y="3.5" width="1.6" height="4" rx="0.8" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
}

/**
 * Sunset OS: the in-world smartphone every app lives in. On desktop it floats beside the scene with a
 * ±4° cursor tilt and moving glass reflection; under 700px it becomes full-width native UI (no frame).
 */
export function Phone({
  app,
  title,
  subtitle,
  action,
  screenKey,
  children,
  className = "",
  height = "var(--phone-h)",
  scroll = false,
  wide = false,
  tilt = true,
  mobileHeight,
  testId,
  icon,
}: {
  app: AppId;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  /** Changing this key plays the app-to-app slide transition. */
  screenKey?: string;
  children: ReactNode;
  className?: string;
  height?: string;
  /** Inner scrolling when the content can outgrow the screen (short laptop windows). Scroll chains to the page at the ends. */
  scroll?: boolean;
  /** Landscape device (Photos app). */
  wide?: boolean;
  /** Cursor tilt (off for input-heavy apps like the assistant). */
  tilt?: boolean;
  /** Fixed height on phones (< 700px) with touch scrolling inside, e.g. "calc(64svh - 90px)". */
  mobileHeight?: string;
  testId?: string;
  /** Replaces the app icon in the header (e.g. the assistant's orb). */
  icon?: ReactNode;
}) {
  const shell = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);

  // Cursor tilt (±4°) + glass reflection; disabled for reduced motion and on small screens.
  useEffect(() => {
    const el = shell.current;
    if (!el || !tilt || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    let lastX = NaN;
    let lastY = NaN;
    // Interacting with the phone must not move its targets: ease flat while the pointer is over it.
    let inside = false;
    const enter = () => (inside = true);
    const leave = () => (inside = false);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    const loop = () => {
      const narrow = window.innerWidth < 700;
      const src = rig.tilt.active ? rig.tilt : rig.pointer;
      const flat = narrow || inside;
      const tx = flat ? 0 : src.x;
      const ty = flat ? 0 : src.y;
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      if (Math.abs(tx - x) < 0.001) x = tx;
      if (Math.abs(ty - y) < 0.001) y = ty;
      if (x === lastX && y === lastY) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastX = x;
      lastY = y;
      el.style.transform = narrow ? "" : `perspective(1400px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
      if (glare.current) glare.current.style.transform = `translate3d(${x * 40}%, ${y * 30}%, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [tilt]);

  return (
    <div
      ref={shell}
      data-testid={testId}
      className={`phone relative w-full ${mobileHeight ? "max-[699px]:![height:var(--phone-mobile-h)]" : "max-[699px]:!h-auto"} ${wide ? "min-[700px]:w-[min(1000px,92vw)]" : "min-[700px]:w-[392px]"} min-[700px]:rounded-[48px] min-[700px]:p-[11px] min-[700px]:shadow-[0_40px_90px_rgb(255_79_139/0.28),0_12px_30px_rgb(35_32_58/0.22)] ${className}`}
      style={{
        height,
        ...(mobileHeight ? ({ "--phone-mobile-h": mobileHeight } as React.CSSProperties) : {}),
        background: "linear-gradient(145deg,#ffffff 0%,#ffe6ef 35%,#ffd2b8 70%,#ffffff 100%)",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {/* side buttons */}
      <span aria-hidden className="absolute top-[120px] -left-[3px] hidden h-14 w-[4px] rounded-l bg-[#f3c6d6] min-[700px]:block" />
      <span aria-hidden className="absolute top-[150px] -right-[3px] hidden h-20 w-[4px] rounded-r bg-[#f3c6d6] min-[700px]:block" />
      <div className="relative flex h-full flex-col overflow-hidden bg-paper max-[699px]:rounded-[var(--r-phone)] min-[700px]:rounded-[38px]">
        <div className="relative hidden min-[700px]:block">
          <span aria-hidden className="absolute top-2 left-1/2 h-[22px] w-[96px] -translate-x-1/2 rounded-full bg-ink" />
        </div>
        <div className="hidden pt-1 min-[700px]:block">
          <StatusBar />
        </div>
        <header className="flex shrink-0 items-center gap-3 border-b border-ink/8 px-5 pt-3 pb-3">
          {icon ?? <AppIcon app={app} />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] leading-tight font-extrabold text-ink">{title ?? APP_META[app].label}</p>
            {subtitle && <p className="truncate font-mono text-[11.5px] text-ink-soft">{subtitle}</p>}
          </div>
          {action}
        </header>
        <div data-phone-screen className={`relative min-h-0 flex-1 ${scroll ? "overflow-y-auto" : mobileHeight ? "overflow-hidden max-[699px]:overflow-y-auto" : "overflow-hidden"}`} data-lenis-prevent={scroll ? "" : undefined}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screenKey ?? "screen"}
              initial={{ x: 50, opacity: 0, scale: 0.97 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -50, opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        <div aria-hidden className="hidden h-5 shrink-0 items-center justify-center min-[700px]:flex">
          <span className="h-[5px] w-[120px] rounded-full bg-ink/80" />
        </div>
        {/* glass reflection */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden min-[700px]:block">
          <div
            ref={glare}
            className="absolute -inset-1/2 bg-[linear-gradient(115deg,transparent_40%,rgb(255_255_255/0.35)_48%,transparent_56%)]"
          />
        </div>
      </div>
    </div>
  );
}

/** Button with a phone-style tap ripple. */
export function Tap({ className = "", children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  return (
    <button
      type="button"
      {...props}
      className={`relative overflow-hidden ${className}`}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const id = Date.now() + Math.random();
        setRipples((list) => [...list, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
        setTimeout(() => setRipples((list) => list.filter((p) => p.id !== id)), 600);
        props.onPointerDown?.(e);
      }}
    >
      {children}
      {ripples.map((p) => (
        <span
          key={p.id}
          aria-hidden
          className="pointer-events-none absolute h-10 w-10 rounded-full bg-accent/40"
          style={{ left: p.x - 20, top: p.y - 20, animation: "ripple 0.6s var(--ease) forwards" }}
        />
      ))}
    </button>
  );
}
