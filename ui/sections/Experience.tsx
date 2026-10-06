"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { experience } from "@/content/experience";
import { internshipCertificates } from "@/content/stats";
import type { CertificateEntry } from "@/content/types";
import { useApp } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { useFramedPhone, useSectionFrame } from "@/lib/useSectionProgress";
import { Phone } from "../phone/Phone";

type Msg =
  | { kind: "day"; text: string; key: string }
  | { kind: "text"; text: string; key: string; strong?: boolean; done?: boolean; expIndex: number }
  | { kind: "file"; cert: CertificateEntry; role: string; key: string; expIndex: number };

function useMessages(): Msg[] {
  return useMemo(() => {
    const out: Msg[] = [];
    experience.forEach((e, i) => {
      const cert = internshipCertificates.find((c) => c.id === e.certificateId);
      out.push({ kind: "day", text: e.period, key: `${e.id}-day` });
      out.push({ kind: "text", text: `${e.role} · ${e.company}`, strong: true, key: `${e.id}-role`, expIndex: i });
      out.push({ kind: "text", text: `On the certificate: ${e.certifiedDates}`, key: `${e.id}-dates`, expIndex: i });
      e.objectives.forEach((o, k) => out.push({ kind: "text", text: o, done: true, key: `${e.id}-o${k}`, expIndex: i }));
      out.push({ kind: "text", text: `Tools: ${e.tools.join(", ")}`, key: `${e.id}-tools`, expIndex: i });
      if (cert && !cert.locked) out.push({ kind: "file", cert, role: e.role, key: `${e.id}-file`, expIndex: i });
    });
    return out;
  }, []);
}

export function Experience() {
  const messages = useMessages();
  const openLightbox = useApp((s) => s.openLightbox);
  const setExpFocus = useApp((s) => s.setExpFocus);
  const tier = useApp((s) => s.tier);
  const framed = useFramedPhone();
  const reduced = useReducedMotion();
  const revealAll = reduced || (framed && tier === "low");
  const [count, setCount] = useState(7);
  // Phones/tablets: the thread types itself in once per session when the section first comes into view.
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.2 });
  const [typed, setTyped] = useState<number | null>(null);
  useEffect(() => {
    if (framed || revealAll || !inView || typed !== null) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem("sc-exp-typed") === "1";
    } catch {}
    // starting the reveal is the effect's job (it responds to the section entering the viewport)
    /* eslint-disable react-hooks/set-state-in-effect */
    if (seen) {
      setTyped(messages.length);
      return;
    }
    let n = 2;
    setTyped(n);
    /* eslint-enable react-hooks/set-state-in-effect */
    const id = setInterval(() => {
      n += 1;
      setTyped(Math.min(messages.length, n));
      if (n >= messages.length) {
        clearInterval(id);
        try {
          sessionStorage.setItem("sc-exp-typed", "1");
        } catch {}
      }
    }, 420);
    return () => clearInterval(id);
  }, [framed, revealAll, inView, typed, messages.length]);

  // Messages type in as the (sticky) section scrolls.
  const onFrame = useCallback(
    (p: number) => {
      const n = Math.min(messages.length, 7 + Math.floor(p * (messages.length - 5) * 1.15));
      setCount((c) => (c === n ? c : n));
      const last = messages[n - 1];
      setExpFocus(last && "expIndex" in last ? last.expIndex : null);
    },
    [messages, setExpFocus],
  );
  useSectionFrame("experience", onFrame);
  const shown = revealAll ? messages.length : framed ? count : (typed ?? 0);
  const box = useRef<HTMLDivElement>(null);
  // Stay pinned to the newest message as the conversation types in (earlier ones scroll up, like a real chat).
  useEffect(() => {
    const el = box.current;
    if (el && framed) el.scrollTop = el.scrollHeight;
  }, [shown, framed]);

  return (
    <section ref={sectionRef} id="experience" data-section tabIndex={-1} aria-labelledby="experience-title" className="section frame:h-[230vh]">
      <div className="frame:sticky frame:top-0 frame:h-[100svh]">
        <div className="section-inner flex items-center justify-start app:items-start app:justify-center frame:h-full frame:!min-h-0">
          <div className="app:w-full app:max-w-[640px]">
            <h2 id="experience-title" className="display grad-text skew mb-4 text-[clamp(40px,4.2vw,68px)] app:mb-3 app:text-[clamp(34px,9vw,48px)]">
              Experience
            </h2>
            <Phone
              app="messages"
              title="NoviTech R&D"
              subtitle="2 internships · AI → Data"
              testId="messages-app"
              action={<span className="rounded-full bg-teal/15 px-2.5 py-1 font-mono text-[10.5px] font-bold text-teal-ink">VERIFIED</span>}
            >
              <div ref={box} className="frame:absolute frame:inset-0 frame:overflow-y-auto frame:overscroll-contain" data-lenis-prevent>
              <ol className="flex min-h-full flex-col justify-start gap-2 px-4 pt-3 pb-4" aria-label="Internship messages">
                {messages.slice(0, shown).map((m) => (
                  <motion.li
                    key={m.key}
                    layout
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className={m.kind === "day" ? "self-center" : "max-w-[88%] self-start"}
                  >
                    {m.kind === "day" && (
                      <span className="rounded-full bg-ink/8 px-3 py-0.5 font-mono text-[11px] font-bold text-ink-soft">{m.text}</span>
                    )}
                    {m.kind === "text" && (
                      <p
                        className={`rounded-[18px] rounded-bl-[6px] px-3.5 py-2 text-[13.5px] leading-snug app:px-4 app:py-2.5 app:text-[16px] ${
                          m.strong ? "bg-ink font-extrabold text-white" : "card text-ink"
                        }`}
                      >
                        {m.done && (
                          <span className="mr-1.5 inline-flex h-4 w-4 translate-y-[2px] items-center justify-center rounded-full bg-teal-ink text-[10px] text-white" aria-label="Objective completed:">
                            ✓
                          </span>
                        )}
                        {m.text}
                      </p>
                    )}
                    {m.kind === "file" && (
                      <button
                        type="button"
                        onClick={() => {
                          sfx("shutter");
                          openLightbox([m.cert], 0, false);
                        }}
                        className="card tap-press flex min-h-[52px] items-center gap-3 rounded-[18px] rounded-bl-[6px] p-2 pr-4 text-left transition hover:shadow-[0_0_0_2px_#FF4F8B]"
                        aria-label={`Open the certificate attachment for ${m.role}`}
                      >
                        {m.cert.thumb && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.cert.thumb} alt="" className="h-12 w-16 rounded-[10px] object-cover" loading="lazy" />
                        )}
                        <span>
                          <span className="block text-[13px] font-extrabold text-ink app:text-[16px]">Certificate.pdf</span>
                          <span className="block font-mono text-[11px] text-ink-soft">Tap to open in Photos</span>
                        </span>
                      </button>
                    )}
                  </motion.li>
                ))}
                <AnimatePresence>
                  {shown < messages.length && (
                    <motion.li key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="self-start" aria-label="typing">
                      <span className="card flex gap-1 rounded-[18px] px-4 py-3">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 120}ms` }} />
                        ))}
                      </span>
                    </motion.li>
                  )}
                </AnimatePresence>
              </ol>
              </div>
            </Phone>
          </div>
        </div>
      </div>
    </section>
  );
}
