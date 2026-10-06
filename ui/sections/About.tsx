"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import meta from "@/content/generated/meta.json";
import { profile } from "@/content/profile";
import { aboutStats } from "@/content/stats";
import { useApp } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { Phone, Tap } from "../phone/Phone";
import { ScrollLinked } from "../phone/ScrollLinked";

/** Count-up stat card with a game-style "+2 INTERNSHIPS" pickup when it first appears. */
function StatCard({ value, label, index }: { value: number; label: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const pulse = useApp((s) => s.statPulse);
  const pulseStat = useApp((s) => s.pulseStat);
  const [v, setV] = useState(value);
  const [pick, setPick] = useState(0);

  useEffect(() => {
    if (!seen && !(pulse[0] === index && pulse[1])) return;
    let raf = 0;
    const t0 = performance.now();
    const run = (t: number) => {
      const k = Math.min(1, (t - t0 - index * 160) / 800);
      setV(Math.round(value * Math.max(0, 1 - Math.pow(1 - Math.max(0, k), 3))));
      if (k < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    const p = setTimeout(() => setPick((x) => x + 1), 250 + index * 160);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(p);
    };
  }, [seen, pulse, index, value]);

  return (
    <div ref={ref} className="relative">
      <Tap
        onClick={() => {
          pulseStat(index);
          sfx("chime");
        }}
        className="card w-full rounded-[16px] px-3 py-3 text-left transition-transform hover:-translate-y-0.5"
        aria-label={`${value} ${label}. Activate to replay the counter.`}
      >
        <span className="display block text-[34px] leading-none text-ink tabular-nums">{String(v).padStart(2, "0")}</span>
        <span className="mt-1 block font-mono text-[10.5px] font-bold tracking-[0.12em] max-[420px]:text-[9.5px] max-[420px]:tracking-[0.04em] text-accent-strong uppercase">{label}</span>
      </Tap>
      <AnimatePresence>
        {pick > 0 && (
          <motion.span
            key={pick}
            aria-hidden
            initial={{ y: 6, opacity: 0, scale: 0.8 }}
            animate={{ y: -30, opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 font-display text-[13px] tracking-[0.06em] whitespace-nowrap text-white"
          >
            <span className="text-[#FF9F43]">+{value}</span> {label.toUpperCase()}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export function About() {
  return (
    <section id="about" data-section tabIndex={-1} aria-labelledby="about-title" className="section min-[700px]:h-[170vh]">
      <div className="min-[700px]:sticky min-[700px]:top-0 min-[700px]:h-[100svh]">
        <div className="section-inner flex items-center justify-end max-md:justify-center max-md:!pt-[40svh] min-[700px]:h-full min-[700px]:!min-h-0 lg:pr-[190px]">
          <Phone app="profile" title="Profile" subtitle={`@siddhartha · ${profile.education.school.split(" (")[0]}`} testId="profile-app">
            <ScrollLinked section="about">
              <div className="px-5 pt-5 pb-8">
                {meta.cover && (
                  <figure className="-mx-5 -mt-5 mb-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={meta.cover} alt={`${profile.name} on the beach at sunset`} className="aspect-[16/9] w-full object-cover" loading="lazy" />
                  </figure>
                )}
                <div className={`flex gap-4 ${meta.cover ? "-mt-9 items-start" : "items-center"}`}>
                  <span className="relative block h-[78px] w-[78px] shrink-0 rounded-full p-[3px] shadow-[0_0_0_3px_#fff]" style={{ background: "var(--grad)" }}>
                    <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-paper">
                      {meta.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={meta.photo} alt={`Portrait of ${profile.name}`} className="h-full w-full object-cover" />
                      ) : (
                        <span className="display text-[30px] text-ink" aria-label={`${profile.name} monogram`}>
                          {profile.monogram}
                        </span>
                      )}
                    </span>
                  </span>
                  <div className={`min-w-0 ${meta.cover ? "pt-10" : ""}`}>
                    <h2 id="about-title" className="text-[21px] leading-tight font-extrabold text-ink">
                      {profile.name}
                    </h2>
                    <p className="mt-1 text-[13.5px] leading-snug font-semibold text-ink-soft">
                      Information Science & Engineering @ NMAMIT · CGPA {profile.education.cgpa} · {profile.education.graduation}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  {aboutStats.map((s, i) => (
                    <StatCard key={s.label} value={s.value} label={s.label} index={i} />
                  ))}
                </div>

                <div className="mt-5 space-y-3 text-[14.5px] leading-[1.6] text-ink">
                  {profile.bio.map((p) => (
                    <p key={p.slice(0, 24)}>{p}</p>
                  ))}
                </div>

                <div className="card mt-5 p-4">
                  <p className="kicker !text-[11px]">Education</p>
                  <p className="mt-1 text-[15px] leading-snug font-extrabold text-ink">{profile.education.degree}</p>
                  <p className="text-[13.5px] text-ink-soft">{profile.education.school}</p>
                  <p className="mt-1 font-mono text-[12px] text-ink-soft">{profile.education.period}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Relevant coursework">
                    {profile.education.coursework.map((c) => (
                      <li key={c} className="hashtag">
                        #{c.replace(/\s+/g, "")}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex gap-3 rounded-[16px] p-[2px]" style={{ background: "var(--grad)" }}>
                  <div className="flex w-full gap-3 rounded-[14px] bg-paper p-4">
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[16px]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF9F43">
                        <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-[14.5px] font-extrabold text-ink">Side quest · Ripple Factor Crew</p>
                      <p className="text-[13.5px] leading-relaxed text-ink">{profile.sideQuest.text}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollLinked>
          </Phone>
        </div>
      </div>
    </section>
  );
}
