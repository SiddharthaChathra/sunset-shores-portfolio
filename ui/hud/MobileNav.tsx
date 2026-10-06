"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SECTION_ORDER, world } from "@/theme/theme";
import { profile } from "@/content/profile";
import { useApp } from "@/lib/store";
import { rig } from "@/lib/rig";
import { scrollToSection } from "@/lib/scroll";
import { setSoundEnabled, sfx } from "@/lib/audio";
import { useDeviceMode } from "@/lib/device";
import { Sheet } from "../Sheet";
import { MapArt, WAYPOINT_XY } from "./Hud";

const I = (d: ReactNode) => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const ICONS = {
  home: I(<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />),
  projects: I(
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
    </>,
  ),
  experience: I(<path d="M4 5h16v11H9l-5 4z" />),
  certificates: I(
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M9 13.5L8 21l4-2 4 2-1-7.5" />
    </>,
  ),
  contact: I(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />),
  more: I(
    <>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </>,
  ),
};
const idx = (id: (typeof SECTION_ORDER)[number]) => SECTION_ORDER.indexOf(id);
const DOCK: { id: keyof typeof ICONS; label: string; section: number | null }[] = [
  { id: "home", label: "Home", section: idx("hero") },
  { id: "projects", label: "Projects", section: idx("projects") },
  { id: "experience", label: "Work", section: idx("experience") },
  { id: "certificates", label: "Certs", section: idx("certificates") },
  { id: "contact", label: "Contact", section: idx("contact") },
  { id: "more", label: "More", section: null },
];
const MORE_SECTIONS = [idx("about"), idx("skills")];

const go = (i: number) => {
  sfx("whoosh");
  scrollToSection(i);
};

/** Sunset OS dock: 5 sections + "More". Frosted in the section tint; hides while scrolling down. */
function Dock() {
  const active = useApp((s) => s.active);
  const sheet = useApp((s) => s.sheet);
  const setSheet = useApp((s) => s.setSheet);
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const y = rig.scrollY;
      const dy = y - last.current;
      if (Math.abs(dy) > 6) {
        const nearEnd = y > rig.maxScroll - 40;
        setHidden(dy > 0 && y > 80 && !nearEnd);
        last.current = y;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const moreActive = MORE_SECTIONS.includes(active) || sheet === "more";
  return (
    <nav
      aria-label="Sections"
      data-testid="dock"
      className={`fixed inset-x-[calc(10px+var(--safe-l))] bottom-[calc(8px+var(--safe-b))] z-[46] mx-auto max-w-[560px] rounded-[24px] border border-white/70 shadow-[0_14px_40px_rgb(35_32_58/0.22)] backdrop-blur-xl transition-transform duration-300 ease-out ${hidden ? "translate-y-[140%]" : ""}`}
      style={{ background: "color-mix(in srgb, var(--tint) 72%, rgb(255 255 255 / 0.55))" }}
    >
      <ul className="flex h-[60px] items-stretch justify-between px-1.5">
        {DOCK.map((d) => {
          const on = d.section === null ? moreActive : active === d.section;
          return (
            <li key={d.id} className="flex flex-1">
              <button
                type="button"
                data-testid={`dock-${d.id}`}
                aria-current={on && d.section !== null ? "location" : undefined}
                aria-label={d.section === null ? "More: About, Skills, résumé and radio" : world.labels[SECTION_ORDER[d.section]] === d.label ? d.label : `${d.label}: ${world.labels[SECTION_ORDER[d.section]]}`}
                aria-expanded={d.section === null ? sheet === "more" : undefined}
                onClick={() => (d.section === null ? setSheet("more") : go(d.section))}
                className={`tap-press relative flex min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] transition-colors ${on ? "text-ink" : "text-ink-soft"}`}
              >
                {ICONS[d.id]}
                <span className={`text-[10.5px] leading-none font-bold ${on ? "text-accent-strong" : ""}`}>{d.label}</span>
                <span aria-hidden className={`absolute bottom-1 h-[3px] rounded-full transition-all duration-300 ${on ? "w-6 opacity-100" : "w-0 opacity-0"}`} style={{ background: "var(--grad)" }} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Full-screen coastal map: the 7 stops labelled, tap to drive there. */
function MapSheet() {
  const sheet = useApp((s) => s.sheet);
  const setSheet = useApp((s) => s.setSheet);
  const active = useApp((s) => s.active);
  const close = () => setSheet(null);
  return (
    <Sheet open={sheet === "map"} onClose={close} title="Sunset Shores map" testId="map-sheet">
      <div className="relative mx-auto aspect-square w-full max-w-[420px]">
        <MapArt className="h-full w-full rounded-[28px]" label="Map of Sunset Shores with the seven stops along the coastal highway" />
        {SECTION_ORDER.map((id, i) => {
          const [x, y] = WAYPOINT_XY[i];
          const on = active === i;
          return (
            <button
              key={id}
              type="button"
              data-testid={`map-stop-${i}`}
              aria-current={on ? "location" : undefined}
              onClick={() => {
                close();
                setTimeout(() => go(i), 120);
              }}
              className="tap-press absolute flex h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full py-1 pr-3 pl-1"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-bold ${on ? "bg-ink text-white shadow-[0_0_0_2px_#fff,0_0_14px_#FF4F8B]" : "bg-white text-ink shadow-[0_0_0_1.5px_#23203A]"}`}>
                {i + 1}
              </span>
              <span className="rounded-full bg-white/92 px-2 py-0.5 text-[12.5px] font-extrabold whitespace-nowrap text-ink shadow-sm">{world.locations[id]}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[15px] text-ink-soft">Tap a stop to drive there.</p>
    </Sheet>
  );
}

/** "More": the two sections not on the dock, plus the résumé and the radio. */
function MoreSheet() {
  const sheet = useApp((s) => s.sheet);
  const setSheet = useApp((s) => s.setSheet);
  const sound = useApp((s) => s.sound);
  const close = () => setSheet(null);
  return (
    <Sheet open={sheet === "more"} onClose={close} title="More" testId="more-sheet">
      <ul className="grid grid-cols-2 gap-3">
        {MORE_SECTIONS.map((i) => {
          const id = SECTION_ORDER[i];
          return (
            <li key={id}>
              <button
                type="button"
                className="card tap-press flex h-full min-h-[88px] w-full flex-col items-start justify-center px-4 py-3 text-left"
                onClick={() => {
                  close();
                  setTimeout(() => go(i), 120);
                }}
              >
                <span className="text-[17px] font-extrabold text-ink">{world.labels[id]}</span>
                <span className="font-mono text-[12px] tracking-[0.1em] text-accent-strong uppercase">{world.locations[id]}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a href={profile.links.resume} download="Siddhartha_Chathra_BS_Resume.pdf" className="btn btn-primary !h-[52px]" onClick={() => sfx("click")}>
          Résumé
        </a>
        <button type="button" className="btn btn-ghost !h-[52px]" aria-pressed={sound} onClick={() => setSoundEnabled(!sound)}>
          Radio {sound ? "on" : "off"}
        </button>
      </div>
    </Sheet>
  );
}

/** Cinematic mode (phone landscape): a slim bar on top of the app sheet with a compact section switcher. */
function LandBar() {
  const active = useApp((s) => s.active);
  const sound = useApp((s) => s.sound);
  return (
    <div className="fixed top-0 right-0 z-[46] flex h-[52px] w-[var(--sheet-w)] items-center gap-2 border-b border-ink/8 bg-paper/95 pr-[calc(10px+var(--safe-r))] pl-3 backdrop-blur">
      <label className="sr-only" htmlFor="land-switch">
        Go to section
      </label>
      <select
        id="land-switch"
        value={active}
        onChange={(e) => go(Number(e.target.value))}
        className="h-11 w-0 min-w-0 flex-1 truncate rounded-full bg-white px-3 text-[15px] font-extrabold text-ink shadow-[inset_0_0_0_1.5px_rgb(35_32_58/0.14)]"
      >
        {SECTION_ORDER.map((id, i) => (
          <option key={id} value={i}>
            {i + 1}. {world.labels[id]} · {world.locations[id]}
          </option>
        ))}
      </select>
      <button type="button" className="pill !h-11 shrink-0" aria-pressed={sound} onClick={() => setSoundEnabled(!sound)}>
        <span aria-hidden>📻</span> Radio {sound ? "on" : "off"}
      </button>
    </div>
  );
}

/** Mobile navigation for the current device mode (nothing on desktop). */
export function MobileNav() {
  const mode = useDeviceMode();
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  // desktop layout on a touch tablet: the minimap opens the map sheet
  if (mode === "frame") return coarse ? <MapSheet /> : null;
  return (
    <>
      {mode === "land" ? <LandBar /> : <Dock />}
      <MapSheet />
      <MoreSheet />
    </>
  );
}
