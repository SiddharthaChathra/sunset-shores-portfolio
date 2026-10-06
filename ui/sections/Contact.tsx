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
      <div className="section-inner flex flex-1 items-center justify-start max-md:justify-center max-md:!pt-[40svh]">
        <div>
          <h2 id="contact-title" className="display grad-text skew mb-4 text-[clamp(40px,4.2vw,68px)]">
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
              <p className="text-[13.5px] font-semibold text-ink-soft">Networking · Cloud · DevOps · ML</p>
              <p className="mt-1 font-mono text-[11.5px] text-ink-soft" aria-live="polite">
                {ringing ? "Calling… email copied to your clipboard" : "Have a role, a project or a question? Get in touch."}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Tap onClick={call} className="btn btn-primary w-full" aria-label="Call: copies the email address">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />
                  </svg>
                  Call
                </Tap>
                <a className="btn btn-ghost w-full" href={`mailto:${profile.links.email}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 5h16v11H9l-5 4z" />
                  </svg>
                  Message
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
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#fff1f6]"
                  aria-label={`Email ${profile.links.email}: copy to clipboard`}
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] font-bold text-accent-strong uppercase">Email · tap to copy</span>
                    <span className="block truncate text-[14px] font-semibold text-ink">{profile.links.email}</span>
                  </span>
                  <span aria-hidden className="text-[16px] text-ink-soft">⧉</span>
                </button>
                <Row label="LinkedIn" value="siddhartha-chathra-b-s" href={profile.links.linkedin} />
                <Row label="GitHub" value="SiddharthaChathra" href={profile.links.github} />
                {profile.phone && <Row label="Phone" value={profile.phone} href={`tel:${profile.phone.replace(/\s/g, "")}`} />}
              </div>
            </div>
          </Phone>
        </div>
      </div>

      <footer className="readable relative z-10 mx-auto mb-10 max-w-[720px] px-6 text-center">
        <p className="font-mono text-[11px] tracking-[0.3em] text-ink-soft uppercase">— End credits —</p>
        <p className="mt-3 text-[14px] font-semibold text-ink">
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
