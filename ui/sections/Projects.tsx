"use client";

import { useState } from "react";
import { projects, type Project } from "@/content/projects";
import { useApp } from "@/lib/store";
import { scrollToProject } from "@/lib/scroll";
import { sfx } from "@/lib/audio";
import { theme } from "@/theme/theme";
import { Phone } from "../phone/Phone";
import { ScrollLinked } from "../phone/ScrollLinked";
import { EmblemArt } from "../EmblemArt";
import { BillboardsFallback } from "./BillboardsFallback";
import dynamic from "next/dynamic";
import { useDeviceMode } from "@/lib/device";

export const accent = (p: Project) =>
  p.accentFromTheme === "teal" ? theme.color.teal : p.accentFromTheme === "coral" ? theme.color.coral : theme.color.accent;
export const tag = (s: string) => "#" + s.replace(/[^a-z0-9]+/gi, "");

export function PostImage({ p, thumb = false }: { p: Project; thumb?: boolean }) {
  const [ok, setOk] = useState(true);
  if (thumb)
    return p.coverImage && ok ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={p.coverImage} alt="" className="h-full w-full object-cover object-top" loading="lazy" onError={() => setOk(false)} />
    ) : (
      <EmblemArt emblem={p.emblem} color={accent(p)} title={p.title} />
    );
  return (
    <figure className="relative aspect-[16/10] w-full overflow-hidden bg-[linear-gradient(160deg,#fff,#ffe0ec)]">
      {p.coverImage && ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.coverImage} alt={`Screenshot of ${p.title}`} className="h-full w-full object-cover object-top" loading="lazy" onError={() => setOk(false)} />
      ) : (
        <EmblemArt emblem={p.emblem} color={accent(p)} title={p.title} />
      )}
      <figcaption className="absolute top-3 left-3 rounded-full bg-ink/85 px-2.5 py-0.5 font-mono text-[10.5px] text-white">
        {p.coverImage && ok ? "Screenshot" : "Emblem"} · {p.index}/0{projects.length}
      </figcaption>
    </figure>
  );
}

/** Small labelled block inside the case study. */
export function Block({ label, children, color }: { label: string; children: React.ReactNode; color: string }) {
  return (
    <section className="mx-4 mt-3 rounded-[16px] bg-white/80 p-3.5 shadow-[0_1px_0_rgb(35_32_58/0.06)]">
      <h4 className="flex items-center gap-2 font-mono text-[10.5px] font-bold tracking-[0.16em] text-accent-strong uppercase">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {label}
      </h4>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

export function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((h) => (
        <li key={h} className="flex gap-2 text-[13px] leading-snug text-ink">
          <span aria-hidden className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
          {h}
        </li>
      ))}
    </ul>
  );
}

/** A project as a full case study: what it does, the problem, what's different, how it works, stack. */
function ProjectPost({ p }: { p: Project }) {
  const c = accent(p);
  return (
    <article data-testid="project-article" data-project-id={p.id} className="pb-6">
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-bold text-ink"
          style={{ background: "var(--grad)" }}
        >
          {p.index}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] leading-tight font-extrabold text-ink">{p.title}</h3>
          <p className="font-mono text-[11px] text-ink-soft">Sunset Shores{p.date ? ` · ${p.date}` : ""}</p>
        </div>
      </div>
      <PostImage p={p} />
      <div className="flex gap-2 px-4 pt-3">
        {p.links.repo && (
          <a className="btn btn-primary btn-sm flex-1 touch:!h-11" href={p.links.repo} target="_blank" rel="noopener noreferrer">
            GitHub<span className="sr-only"> repository for {p.title} (opens in new tab)</span>
          </a>
        )}
        {p.links.live && (
          <a className="btn btn-ghost btn-sm flex-1 touch:!h-11" href={p.links.live} target="_blank" rel="noopener noreferrer">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="pulse-ring absolute inset-0 rounded-full bg-teal" />
              <span className="relative h-2 w-2 rounded-full bg-teal-ink" />
            </span>
            Live<span className="sr-only"> demo of {p.title} (opens in new tab)</span>
          </a>
        )}
      </div>
      <p className="px-4 pt-3 text-[15px] leading-snug font-extrabold text-ink">{p.oneLiner}</p>

      <Block label="What it does" color={c}>
        <p className="text-[13px] leading-relaxed text-ink">{p.description}</p>
      </Block>
      <Block label="The problem" color={c}>
        <p className="text-[13px] leading-relaxed text-ink">{p.problem}</p>
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
    </article>
  );
}

/** Per-project progress (0..1) inside the pinned section, for scroll-linking that project's phone screen. */
const projectProgress = projects.map((_, i) => (p: number) => Math.min(1, Math.max(0, p * projects.length - i)));

// phones/tablets: pinned billboard layout + compact post (loaded only there)
const ProjectsMobile = dynamic(() => import("./ProjectsMobile").then((m) => m.ProjectsMobile), { ssr: false });

export function Projects() {
  const active = useApp((s) => s.project);
  const tier = useApp((s) => s.tier);
  const mode = useDeviceMode();
  const p = projects[active];
  if (mode !== "frame") return <ProjectsMobile />;

  return (
    <section
      id="projects"
      data-section
      tabIndex={-1}
      aria-labelledby="projects-title"
      className="section"
      style={{ height: `${projects.length * 150}vh` }}
      data-active-project={active}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="section-inner grid h-full grid-cols-1 gap-6 max-md:!pt-[32svh] md:grid-cols-[40%_1fr] md:gap-8">
          <div className="relative flex flex-col justify-between max-md:hidden">
            <div className="readable">
              <p className="kicker inline-block rounded-full bg-white/85 px-3 py-1">03 · Billboard Highway</p>
              <h2 id="projects-title" className="display grad-text skew mt-3 text-[clamp(44px,4.6vw,76px)]">
                Featured projects
              </h2>
            </div>
            {tier === "low" && <BillboardsFallback active={active} />}
            <div role="tablist" aria-label="Projects" aria-orientation="vertical" className="glass flex flex-col gap-0.5 self-start p-2">
              {projects.map((proj, i) => (
                <button
                  key={proj.id}
                  role="tab"
                  id={`project-tab-${i}`}
                  aria-selected={i === active}
                  aria-controls="project-panel"
                  tabIndex={i === active ? 0 : -1}
                  onClick={() => {
                    sfx("whoosh");
                    scrollToProject(i);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                    e.preventDefault();
                    const n = (i + (e.key === "ArrowDown" ? 1 : -1) + projects.length) % projects.length;
                    scrollToProject(n);
                    document.getElementById(`project-tab-${n}`)?.focus();
                  }}
                  className={`flex items-center gap-3 rounded-full px-3 py-1.5 text-left transition-colors touch:min-h-11 ${i === active ? "bg-ink text-white" : "text-ink hover:bg-white"}`}
                >
                  <span className={`font-mono text-[12px] font-bold ${i === active ? "text-[#FF9F43]" : "text-accent-strong"}`}>{proj.index}</span>
                  <span className="text-[14.5px] font-extrabold">{proj.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-end lg:justify-center">
            {/* Phones get a compact heading above the app (the billboards ride in the 3D band above). */}
            <div className="w-full frame:w-auto">
              <h2 className="display grad-text skew mb-3 text-[40px] md:hidden" aria-hidden>
                Projects
              </h2>
              <div id="project-panel" role="tabpanel" aria-labelledby={`project-tab-${active}`} aria-live="polite">
                <Phone app="projects" title="Projects" subtitle={`${p.index} of 0${projects.length} · scroll to read`} screenKey={p.id} mobileHeight="calc(68svh - 150px)">
                  <ScrollLinked section="projects" map={projectProgress[active]} lead={0.1} trail={0.22}>
                    <ProjectPost p={p} />
                  </ScrollLinked>
                </Phone>
              </div>
              <div className="mt-3 flex justify-center gap-2 md:hidden" role="group" aria-label="Choose project">
                {projects.map((proj, i) => (
                  <button
                    key={proj.id}
                    type="button"
                    aria-label={`Show ${proj.title}`}
                    aria-pressed={i === active}
                    onClick={() => scrollToProject(i)}
                    className={`h-6 rounded-full transition-all ${i === active ? "w-10 bg-ink" : "w-6 bg-ink/20"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
