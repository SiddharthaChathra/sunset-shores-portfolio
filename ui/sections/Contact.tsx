"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import meta from "@/content/generated/meta.json";
import { profile } from "@/content/profile";
import { useApp } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { Phone, Tap } from "../phone/Phone";

function Row({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[#fff1f6]">
      <span className="min-w-0">
        <span className="block font-mono text-[11px] font-bold text-accent-strong uppercase">{label}</span>
        <span className="block truncate text-[14px] font-semibold text-ink">{value}</span>
      </span>
      <span aria-hidden className="text-[18px] text-ink-soft">↗</span>
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}

export function Contact() {
  const connect = useApp((s) => s.connect);
  const showToast = useApp((s) => s.showToast);
  const [ringing, setRinging] = useState(false);

  const call = async () => {
    setRinging(true);
    connect();
    sfx("notify");
    try {
      await navigator.clipboard.writeText(profile.links.email);
    } catch {}
    showToast("Email copied — talk soon!", true);
    setTimeout(() => setRinging(false), 2200);
  };

  return (
    <section id="contact" data-section tabIndex={-1} aria-labelledby="contact-title" className="section flex flex-col">
      <div className="section-inner flex flex-1 items-center justify-start app:items-start app:justify-center app:!pb-8">
        <div className="app:w-full app:max-w-[640px]">
          <h2 id="contact-title" className="display grad-text skew mb-4 text-[clamp(40px,4.2vw,68px)] app:mb-3 app:text-[clamp(34px,9vw,48px)]">
            Let&apos;s talk
          </h2>
          <Phone app="contacts" title="Contacts" subtitle="Favourites" testId="contacts-app">
            <div className="px-5 pt-6 pb-6 text-center">
              <span className="relative mx-auto block h-[96px] w-[96px] rounded-full p-[3px]" style={{ background: "var(--grad)" }}>
                <AnimatePresence>
                  {ringing && (
                    <>
                      {[0, 1].map((i) => (
                        <motion.span
                          key={i}
                          aria-hidden
                          className="absolute inset-0 rounded-full border-2 border-accent"
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: 1.8, opacity: 0 }}
                          transition={{ duration: 1.1, delay: i * 0.4, repeat: 1, ease: "easeOut" }}
                        />
                      ))}
                    </>
                  )}
                </AnimatePresence>
                <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-paper">
                  {meta.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={meta.photo} alt={`Portrait of ${profile.name}`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="display text-[36px] text-ink">{profile.monogram}</span>
                  )}
                </span>
              </span>
              <p className="mt-3 text-[20px] font-extrabold text-ink">{profile.name}</p>
              <p className="text-[13.5px] font-semibold text-ink-soft app:text-[16px]">Networking · Cloud · DevOps · ML</p>
              <p className="mt-1 font-mono text-[11.5px] text-ink-soft app:text-[13px]" aria-live="polite">
                {ringing ? "Calling… email copied to your clipboard" : "Have a role, a project or a question? Get in touch."}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Tap onClick={call} className="btn btn-primary w-full app:!h-[54px]" aria-label="Call: copies the email address">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />
                  </svg>
                  Call
                </Tap>
                <a className="btn btn-ghost w-full app:!h-[54px]" href={`mailto:${profile.links.email}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 5h16v11H9l-5 4z" />
                  </svg>
                  Message
                </a>
                <a className="btn btn-ghost w-full frame:hidden" href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
                    <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V21h-4z" />
                  </svg>
                  LinkedIn<span className="sr-only"> (opens in new tab)</span>
                </a>
                <a className="btn btn-ghost w-full frame:hidden" href={profile.links.github} target="_blank" rel="noopener noreferrer">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
                    <path d="M12 2a10 10 0 00-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 015 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0012 2z" />
                  </svg>
                  GitHub<span className="sr-only"> (opens in new tab)</span>
                </a>
              </div>

              <div className="card mt-5 divide-y divide-ink/8 overflow-hidden text-left">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(profile.links.email);
                    } catch {}
                    showToast("Email copied — talk soon!", true);
                    sfx("notify");
                  }}
                  className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#fff1f6]"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] font-bold text-accent-strong uppercase">Email · tap to copy</span>{" "}
                    <span className="block truncate text-[14px] font-semibold text-ink app:text-[16px]">{profile.links.email}</span>
                  </span>
                  <span aria-hidden className="text-[16px] text-ink-soft">⧉</span>
                </button>
                <div className="divide-y divide-ink/8 app:hidden">
                  <Row label="LinkedIn" value="siddhartha-chathra-b-s" href={profile.links.linkedin} />
                  <Row label="GitHub" value="SiddharthaChathra" href={profile.links.github} />
                </div>
                {profile.phone && <Row label="Phone" value={profile.phone} href={`tel:${profile.phone.replace(/\s/g, "")}`} />}
              </div>
            </div>
          </Phone>
        </div>
      </div>

      <footer className="readable relative z-10 mx-auto mb-10 max-w-[720px] px-6 text-center app:mb-0 app:pb-[calc(var(--dock-h)+96px)] land:pb-24">
        <p className="font-mono text-[11px] tracking-[0.3em] text-ink-soft uppercase">— End credits —</p>
        <p className="mt-3 text-[14px] font-semibold text-ink app:text-[16px]">
          Directed, written and engineered by <span className="font-extrabold">{profile.name}</span>
        </p>
        <p className="mt-1 text-[13px] text-ink-soft">Built with Next.js, three.js and React Three Fiber · Set in Sunset Shores</p>
        <p className="mt-1 text-[13px] text-ink-soft">
          Art direction inspired by golden-hour coastal cities; all 3D, audio and textures are original or procedural ·{" "}
          <a className="font-bold text-accent-strong underline underline-offset-4" href="/credits">
            Credits
          </a>
        </p>
        <p className="mt-3 font-mono text-[11px] text-ink-soft">© {new Date().getFullYear()} {profile.name}</p>
      </footer>
    </section>
  );
}
