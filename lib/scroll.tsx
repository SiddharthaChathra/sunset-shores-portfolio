"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import { rig, worldFromScroll } from "./rig";
import { useApp } from "./store";
import { SECTION_ORDER, theme } from "@/theme/theme";
import { projects } from "@/content/projects";

let lenis: Lenis | null = null;

export function getLenis() {
  return lenis;
}

function sectionEls(): HTMLElement[] {
  return SECTION_ORDER.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
}

function measure() {
  const els = sectionEls();
  const y = window.scrollY;
  rig.sections = els.map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + y, height: r.height };
  });
  rig.maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

export function scrollToSection(i: number) {
  const el = sectionEls()[i];
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (lenis && !reduced) {
    lenis.scrollTo(top, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else {
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }
  // Move keyboard focus to the section for screen-reader / keyboard users.
  el.focus({ preventScroll: true });
}

/** Scroll position (px) that shows project `i` inside the pinned Projects section. */
export function scrollToProject(i: number) {
  const el = document.getElementById("projects");
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const span = el.offsetHeight - window.innerHeight;
  const target = top + (span * (i + 0.5)) / projects.length;
  if (lenis) lenis.scrollTo(target, { duration: 1.2 });
  else window.scrollTo({ top: target, behavior: "smooth" });
}

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const TINTS = SECTION_ORDER.map((s) => hexToRgb(theme.tints[s]));
const TINTS_DEEP = SECTION_ORDER.map((s) => hexToRgb(theme.haze[s]));
const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(" ")})`;

/** Lenis smooth scroll (loaded after first paint) + scroll → world progress mapping. */
export function ScrollDriver() {
  useEffect(() => {
    let disposed = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const params = new URLSearchParams(window.location.search);
    rig.capture = params.has("capture");

    if (!reduced && !rig.capture) {
      // Not needed for the first paint: load the smooth-scroll library in its own chunk.
      import("lenis").then(({ default: L }) => {
        if (disposed) return;
        lenis = new L({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
        (window as unknown as { __lenis?: Lenis }).__lenis = lenis; // test hook
      });
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);

    let lastY = window.scrollY;
    let tintT = -1;
    let raf = 0;
    const loop = (time: number) => {
      lenis?.raf(time);
      const y = lenis ? lenis.scroll : window.scrollY;
      const vh = window.innerHeight;
      rig.scrollY = y;
      rig.velocity += (y - lastY - rig.velocity) * 0.2;
      lastY = y;
      rig.world = worldFromScroll(y, vh);

      // Active section (for HUD + section-driven effects): section containing the viewport centre.
      const mid = y + vh * 0.5;
      let active = 0;
      rig.sections.forEach((s, i) => {
        if (mid >= s.top) active = i;
      });
      const st = useApp.getState();
      st.setActive(active);

      // Projects pin progress.
      const pi = SECTION_ORDER.indexOf("projects");
      const ps = rig.sections[pi];
      if (ps) {
        const span = Math.max(1, ps.height - vh);
        const local = Math.min(1, Math.max(0, (y - ps.top) / span));
        rig.project = local * projects.length;
        st.setProject(Math.min(projects.length - 1, Math.floor(rig.project)));
      }

      // Section tint (CSS var) follows world progress continuously.
      const w = rig.world;
      if (Math.abs(w - tintT) > 0.002) {
        tintT = w;
        const i = Math.min(TINTS.length - 2, Math.floor(w));
        const f = Math.min(1, Math.max(0, w - i));
        const root = document.documentElement.style;
        root.setProperty("--tint", mix(TINTS[i], TINTS[i + 1], f));
        root.setProperty("--tint-deep", mix(TINTS_DEEP[i], TINTS_DEEP[i + 1], f));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Deep links (#projects etc.) once layout is measured.
    if (window.location.hash) {
      const idx = SECTION_ORDER.indexOf(window.location.hash.slice(1) as (typeof SECTION_ORDER)[number]);
      if (idx > 0) requestAnimationFrame(() => scrollToSection(idx));
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      disposed = true;
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  return null;
}
