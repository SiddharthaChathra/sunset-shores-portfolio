"use client";

import { skillCategories, type SkillCategory, type SkillLevel } from "@/content/skills";
import { useApp } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { Phone, Tap } from "../phone/Phone";
import { useState } from "react";
import { useDeviceMode } from "@/lib/device";

/** 5-segment bar, filled to a tier. Never a percentage. */
const SEGMENTS: Record<SkillLevel, number> = { Learning: 2, "Working knowledge": 3, Proficient: 5 };

function categoryTier(c: SkillCategory): { level: SkillLevel; filled: number } {
  const avg = c.skills.reduce((s, k) => s + SEGMENTS[k.level], 0) / c.skills.length;
  const level: SkillLevel = avg >= 4 ? "Proficient" : avg >= 2.6 ? "Working knowledge" : "Learning";
  return { level, filled: Math.round(avg) };
}

function Bar({ filled, label }: { filled: number; label: string }) {
  return (
    <span className="flex items-center gap-[3px]" role="img" aria-label={label}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="h-[10px] w-[22px] rounded-[3px] -skew-x-12"
          style={i < filled ? { background: "var(--grad)" } : { background: "rgb(35 32 58 / 0.1)" }}
        />
      ))}
    </span>
  );
}

/** Phones/tablets: every category expands inline (accordion) to show its skills and the evidence. */
function SkillAccordion() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="px-4 py-4">
      <ul className="grid gap-2.5 tabp:grid-cols-2 tabp:items-start">
        {skillCategories.map((c) => {
          const t = categoryTier(c);
          const isOpen = open === c.id;
          return (
            <li key={c.id} className="card overflow-hidden">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`skill-panel-${c.id}`}
                data-testid={`stat-${c.id}`}
                onClick={() => {
                  sfx("click");
                  setOpen(isOpen ? null : c.id);
                }}
                className="tap-press flex min-h-[64px] w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-[17px] font-extrabold text-ink">{c.name}</span>
                  <span className="mt-1 block font-mono text-[11.5px] font-bold tracking-[0.08em] text-accent-strong uppercase">{t.level}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Bar filled={t.filled} label={`${t.filled} of 5 segments`} />
                  <span aria-hidden className={`text-[20px] text-ink-soft transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}>
                    ›
                  </span>
                </span>
              </button>
              <div
                id={`skill-panel-${c.id}`}
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
              >
                <div className="min-h-0 overflow-hidden" inert={!isOpen}>
                  <ul className="divide-y divide-ink/8 border-t border-ink/8 px-4">
                    {c.skills.map((sk) => (
                      <li key={sk.name} className="flex items-center justify-between gap-3 py-3">
                        <span className="text-[16px] font-semibold text-ink">{sk.name}</span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <Bar filled={SEGMENTS[sk.level]} label={sk.level} />
                          <span className="font-mono text-[11px] font-bold text-ink-soft uppercase">{sk.level}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="px-4 pb-4 text-[16px] leading-relaxed text-ink-soft">
                    <span className="font-bold text-accent-strong">Evidence · </span>
                    {c.evidence}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-ink-soft">
        <span>■■■■■ Proficient</span>
        <span>■■■□□ Working knowledge</span>
        <span>■■□□□ Learning</span>
      </p>
    </div>
  );
}

export function Skills() {
  const selected = useApp((s) => s.skill);
  const setSkill = useApp((s) => s.setSkill);
  const mode = useDeviceMode();
  const cat = mode === "frame" ? (skillCategories.find((c) => c.id === selected) ?? null) : null;

  return (
    <section id="skills" data-section tabIndex={-1} aria-labelledby="skills-title" className="section">
      <div className="section-inner flex items-center justify-end app:items-start app:justify-center lg:pr-[190px]">
        <div className="app:w-full app:max-w-[640px] tabp:max-w-[760px]">
          <h2 id="skills-title" className="display grad-text skew mb-4 text-[clamp(40px,4.2vw,68px)] app:mb-3 app:text-[clamp(34px,9vw,48px)]">
            Skills
          </h2>
          <Phone
            app="stats"
            title={cat ? cat.name : "Stats"}
            subtitle={cat ? cat.summary : "Levels, not percentages"}
            screenKey={cat?.id ?? "list"}
            testId="stats-app"
            scroll
            action={
              cat ? (
                <button type="button" className="pill !h-8" onClick={() => setSkill(null)} aria-label="Back to all stats">
                  ‹ Back
                </button>
              ) : undefined
            }
          >
            {mode !== "frame" ? (
              <SkillAccordion />
            ) : !cat ? (
              <div className="px-4 py-4 [@media(max-height:820px)]:py-3">
                <ul className="space-y-2.5 [@media(max-height:820px)]:space-y-2">
                  {skillCategories.map((c) => {
                    const t = categoryTier(c);
                    return (
                      <li key={c.id}>
                        <Tap
                          onClick={() => {
                            sfx("click");
                            setSkill(c.id);
                          }}
                          className="card flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left [@media(max-height:820px)]:py-2.5 transition hover:shadow-[0_0_0_2px_#FF4F8B]"
                          aria-label={`${c.name}: ${t.level}. Open skill list.`}
                          data-testid={`stat-${c.id}`}
                        >
                          <span className="min-w-0">
                            <span className="block text-[15px] font-extrabold text-ink">{c.name}</span>
                            <span className="mt-1 block font-mono text-[11px] font-bold tracking-[0.08em] text-accent-strong uppercase">{t.level}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <Bar filled={t.filled} label={`${t.filled} of 5 segments`} />
                            <span aria-hidden className="text-[18px] text-ink-soft">›</span>
                          </span>
                        </Tap>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink-soft [@media(max-height:820px)]:mt-3">
                  <span>■■■■■ Proficient</span>
                  <span>■■■□□ Working knowledge</span>
                  <span>■■□□□ Learning</span>
                </p>
              </div>
            ) : (
              <div className="px-4 py-4">
                <ul className="divide-y divide-ink/8 rounded-[14px] bg-white px-4 shadow-[0_8px_24px_rgb(255_79_139/0.08)]">
                  {cat.skills.map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-3 py-3">
                      <span className="text-[14px] font-semibold text-ink">{s.name}</span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <Bar filled={SEGMENTS[s.level]} label={s.level} />
                        <span className="font-mono text-[10.5px] font-bold text-ink-soft uppercase">{s.level}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11.5px] leading-relaxed text-ink-soft">
                  <span className="font-bold text-accent-strong">Evidence · </span>
                  {cat.evidence}
                </p>
              </div>
            )}
          </Phone>
        </div>
      </div>
    </section>
  );
}
