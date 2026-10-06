"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { projects, type Project } from "@/content/projects";
import { useApp } from "@/lib/store";
import { rig } from "@/lib/rig";
import { scrollToProject } from "@/lib/scroll";
import { sfx } from "@/lib/audio";
import { SECTION_ORDER } from "@/theme/theme";
import { useDeviceMode } from "@/lib/device";
import { Phone } from "../phone/Phone";
import { Sheet } from "../Sheet";
import { accent, Block, Bullets, PostImage, tag } from "./Projects";

const PROJECTS_IDX = SECTION_ORDER.indexOf("projects");

/** Short screens (phone landscape, or under 640 px tall): no pinning, a card carousel instead. */
const SHORT_MQ = "(max-height: 639.98px)";
function useShort() {
  const mode = useDeviceMode();
  const short = useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(SHORT_MQ);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(SHORT_MQ).matches,
    () => false,
  );
  return mode === "land" || short;
}

/** Compact post: everything a recruiter needs at a glance; "Read more" opens the full case study. */
function CompactPost({ p, onMore }: { p: Project; onMore: () => void }) {
  const c = accent(p);
  return (
    <article data-testid="project-article" data-project-id={p.id} className="flex h-full flex-col px-4 pt-3 pb-3">
      <div className="flex items-center gap-3">
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[12px] p-[2px]" style={{ background: "var(--grad)" }} aria-hidden>
          <span className="block h-full w-full overflow-hidden rounded-[10px] bg-white">
            <PostImage p={p} thumb />
          </span>
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[18px] leading-tight font-extrabold text-ink">{p.title}</h3>
          <p className="font-mono text-[12px] text-ink-soft">
            {p.index} / 0{projects.length}
            {p.date ? ` · ${p.date}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-2.5 line-clamp-2 text-[16px] leading-snug font-bold text-ink">{p.oneLiner}</p>
      <ul className="mt-2 space-y-1.5">
        {p.unique.slice(0, 3).map((h, i) => (
          <li key={h} className={`flex gap-2 text-[16px] leading-snug text-ink ${i === 1 ? "[@media(max-height:740px)]:hidden" : i === 2 ? "[@media(max-height:900px)]:hidden" : ""}`}>
            <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
            <span className="line-clamp-2">{h}</span>
          </li>
        ))}
      </ul>
      <ul className="no-scrollbar -mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 [@media(max-height:700px)]:hidden [mask-image:linear-gradient(90deg,#000_calc(100%-28px),transparent)]" aria-label="Tech stack (scrolls sideways)" tabIndex={0} data-lenis-prevent>
        {p.stack.map((s) => (
          <li key={s} className="hashtag shrink-0">
            {tag(s)}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex gap-2 pt-3">
        {p.links.repo && (
          <a className="btn btn-primary !h-12 flex-1 !px-3 !text-[15px]" href={p.links.repo} target="_blank" rel="noopener noreferrer">
            GitHub<span className="sr-only"> repository for {p.title} (opens in new tab)</span>
          </a>
        )}
        {p.links.live && (
          <a className="btn btn-ghost !h-12 flex-1 !px-3 !text-[15px]" href={p.links.live} target="_blank" rel="noopener noreferrer">
            Live<span className="sr-only"> demo of {p.title} (opens in new tab)</span>
          </a>
        )}
        <button type="button" className="btn btn-ghost !h-12 flex-1 !px-3 !text-[15px]" onClick={onMore} data-testid="project-read-more">
          Read more
        </button>
      </div>
    </article>
  );
}

/** The full case study, in a bottom sheet. */
function ProjectSheet({ p, open, onClose }: { p: Project; open: boolean; onClose: () => void }) {
  const c = accent(p);
  return (
    <Sheet open={open} onClose={onClose} title={p.title} height="88svh" testId="project-sheet">
      <div className="-mx-5 overflow-hidden">
        <PostImage p={p} />
      </div>
      <p className="mt-3 text-[17px] leading-snug font-extrabold text-ink">{p.oneLiner}</p>
      <div className="-mx-4 [&_p]:text-[16px] [&_li]:text-[15.5px]">
        <Block label="What it does" color={c}>
          <p className="leading-relaxed text-ink">{p.description}</p>
        </Block>
        <Block label="The problem" color={c}>
          <p className="leading-relaxed text-ink">{p.problem}</p>
        </Block>
        <Block label="What makes it different" color={c}>
          <Bullets items={p.unique} color={c} />
        </Block>
        <Block label="How it's built" color={c}>
          <Bullets items={p.highlights} color={c} />
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tech stack">
            {p.stack.map((s) => (
              <li key={s} className="hashtag">
                {tag(s)}
              </li>
            ))}
          </ul>
        </Block>
      </div>
      <div className="mt-4 flex gap-2">
        {p.links.repo && (
          <a className="btn btn-primary !h-12 flex-1" href={p.links.repo} target="_blank" rel="noopener noreferrer">
            GitHub<span className="sr-only"> (opens in new tab)</span>
          </a>
        )}
        {p.links.live && (
          <a className="btn btn-ghost !h-12 flex-1" href={p.links.live} target="_blank" rel="noopener noreferrer">
            Live demo<span className="sr-only"> (opens in new tab)</span>
          </a>
        )}
      </div>
    </Sheet>
  );
}

function Dots({ active, onPick }: { active: number; onPick: (i: number) => void }) {
  return (
    <div className="flex justify-center gap-1.5" role="group" aria-label="Choose project">
      {projects.map((proj, i) => (
        <button
          key={proj.id}
          type="button"
          aria-label={`Show ${proj.title}`}
          aria-pressed={i === active}
          onClick={() => onPick(i)}
          className="flex h-11 min-w-11 items-center justify-center"
        >
          <span className={`block h-2.5 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-ink" : "w-2.5 bg-ink/25"}`} />
        </button>
      ))}
    </div>
  );
}

/** Horizontal swipes on the scene window step through the projects (and scroll the page to match). */
function useWindowSwipe(enabled: boolean, step: (dir: 1 | -1) => void) {
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; t: number } | null = null;
    const inWindow = (e: PointerEvent) => {
      const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scene-h")) || 0;
      const sceneH = (h / 100) * window.innerHeight; // --scene-h is in svh
      return (e.target as Element | null)?.closest?.(".stage-layer") !== null || e.clientY < sceneH;
    };
    const down = (e: PointerEvent) => {
      start = inWindow(e) ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
    };
    const up = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const fast = performance.now() - start.t < 700;
      start = null;
      // a quick flick, or any deliberate long horizontal drag
      // Defer past the touchend that follows pointerup: Lenis treats that touchend as the user taking over
      // the scroll and would cancel a scrollTo started now.
      if ((fast ? Math.abs(dx) > 48 : Math.abs(dx) > 110) && Math.abs(dx) > Math.abs(dy) * 1.3) {
        const dir = dx < 0 ? 1 : -1;
        setTimeout(() => stepRef.current(dir), 60);
      }
    };
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [enabled]);
}

/** Phones + tablet portrait: pinned for projects.length × 100svh; the app stays fixed and swaps screens. */
function PinnedProjects() {
  const active = useApp((s) => s.project);
  const section = useApp((s) => s.active);
  const [sheet, setSheet] = useState(false);
  const p = projects[active];
  useWindowSwipe(section === PROJECTS_IDX && !sheet, (dir) => {
    const n = Math.min(projects.length - 1, Math.max(0, active + dir));
    if (n !== active) {
      sfx("whoosh");
      scrollToProject(n);
    }
  });
  return (
    <section id="projects" data-section tabIndex={-1} aria-label="Featured projects" className="section" style={{ height: `${projects.length * 100}svh` }} data-active-project={active}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-x-0 top-[calc(var(--scene-h)+6px)] bottom-[calc(var(--dock-h)+10px)] flex flex-col px-[calc(var(--gutter)+var(--safe-l))]">
          <h2 id="projects-title" className="sr-only">
            Featured projects
          </h2>
          <Dots active={active} onPick={(i) => scrollToProject(i)} />
          <div id="project-panel" role="region" aria-live="polite" aria-label={`Project ${active + 1} of ${projects.length}`} className="mx-auto min-h-0 w-full max-w-[640px] flex-1">
            <Phone app="projects" title="Projects" subtitle={`${p.index} of 0${projects.length} · swipe the scene or scroll`} screenKey={p.id} height="100%" className="!h-full" tilt={false}>
              <CompactPost p={p} onMore={() => setSheet(true)} />
            </Phone>
          </div>
        </div>
      </div>
      <ProjectSheet p={p} open={sheet} onClose={() => setSheet(false)} />
    </section>
  );
}

/** A billboard card in the style of the 3D billboards (cream face, neon frame, number and name). */
function BillboardCard({ p, on, onPick }: { p: Project; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      aria-label={`${p.index}. ${p.title}`}
      className={`tap-press relative flex aspect-[7.2/3.2] w-full flex-col justify-center rounded-[10px] bg-[#FFF8F2] px-4 text-left transition-transform duration-300 ${on ? "scale-[1.02]" : "opacity-80"}`}
      style={{ boxShadow: "inset 3px 3px 0 #FF4F8B, inset -3px -3px 0 #FF9F43, 0 10px 24px rgb(255 79 139 / 0.25)" }}
    >
      <span className="font-mono text-[12px] font-bold tracking-[0.12em] text-accent-strong">
        {p.index} / 0{projects.length}
      </span>
      <span className="display mt-1 line-clamp-2 text-[clamp(1.6rem,6vw,2.2rem)] leading-[0.95] text-ink">{p.title}</span>
      <span className="mt-2 block h-1 w-16 rounded-full" style={{ background: accent(p) }} />
    </button>
  );
}

/** Short screens: a snap carousel of billboard cards, the Projects app below. */
function ShortProjects() {
  const active = useApp((s) => s.project);
  const setProject = useApp((s) => s.setProject);
  const [sheet, setSheet] = useState(false);
  const track = useRef<HTMLUListElement>(null);
  const p = projects[active];
  useEffect(() => {
    rig.projectLocked = true;
    return () => {
      rig.projectLocked = false;
    };
  }, []);
  useEffect(() => {
    rig.project = active + 0.5;
  }, [active]);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let d = Infinity;
        Array.from(el.children).forEach((ch, i) => {
          const li = ch as HTMLElement;
          const dd = Math.abs(li.offsetLeft + li.offsetWidth / 2 - mid);
          if (dd < d) {
            d = dd;
            best = i;
          }
        });
        setProject(best);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [setProject]);
  const pick = (i: number) => {
    const li = track.current?.children[i] as HTMLElement | undefined;
    li?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setProject(i);
  };
  return (
    <section id="projects" data-section tabIndex={-1} aria-labelledby="projects-title" className="section" data-active-project={active}>
      <div className="section-inner">
        <h2 id="projects-title" className="display grad-text skew mb-3 text-[clamp(30px,8vw,44px)]">
          Projects
        </h2>
        <ul ref={track} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[12%] pb-3" data-lenis-prevent data-testid="billboard-carousel" tabIndex={0} aria-label="Projects (swipe)">
          {projects.map((proj, i) => (
            <li key={proj.id} className="w-[76%] shrink-0 snap-center">
              <BillboardCard p={proj} on={i === active} onPick={() => pick(i)} />
            </li>
          ))}
        </ul>
        <Dots active={active} onPick={pick} />
        <div id="project-panel" role="region" aria-live="polite" aria-label={`Project ${active + 1} of ${projects.length}`} className="mt-2">
          <Phone app="projects" title="Projects" subtitle={`${p.index} of 0${projects.length}`} screenKey={p.id} tilt={false}>
            <CompactPost p={p} onMore={() => setSheet(true)} />
          </Phone>
        </div>
      </div>
      <ProjectSheet p={p} open={sheet} onClose={() => setSheet(false)} />
    </section>
  );
}

export function ProjectsMobile() {
  const short = useShort();
  return short ? <ShortProjects /> : <PinnedProjects />;
}
