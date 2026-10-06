"use client";

import { useEffect, useState } from "react";
import { profile } from "@/content/profile";
import { scrollToSection } from "@/lib/scroll";
import { useApp } from "@/lib/store";
import { sfx } from "@/lib/audio";

/** Neon art-deco hotel sign: each letter is a tube that flickers on in sequence. Click to flicker + buzz. */
function NeonSign() {
  const [kick, setKick] = useState(0);
  const [first, ...rest] = profile.name.split(" ");
  const lines = [first, rest.join(" ")];
  let n = 0;
  return (
    <button
      type="button"
      onClick={() => {
        setKick((k) => k + 1);
        sfx("buzz");
      }}
      className="group relative block w-full text-left"
      aria-describedby="neon-sign-hint"
    >
      <span id="neon-sign-hint" className="sr-only">
        Neon sign: activate to flicker it
      </span>
      <svg aria-hidden viewBox="0 0 320 46" className="mx-auto -mb-[2px] block h-[38px] w-[62%] app:h-[22px] app:w-[52%]" preserveAspectRatio="none">
        <path d="M10 46 L10 30 L60 30 L60 18 L110 18 L110 6 L210 6 L210 18 L260 18 L260 30 L310 30 L310 46Z" fill="#23203A" />
        <path d="M118 14 h84 M70 26 h180 M20 38 h280" stroke="#FF9F43" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="relative block rounded-[22px] bg-ink px-[clamp(16px,2.4vw,32px)] pt-4 pb-5 app:pt-3 app:pb-3.5 shadow-[0_30px_70px_rgb(255_79_139/0.35),0_0_0_3px_rgb(255_159_67/0.55)]">
        <span aria-hidden className="absolute top-3 left-4 h-2 w-2 rounded-full bg-orange shadow-[0_0_10px_#FF9F43]" />
        <span aria-hidden className="absolute top-3 right-4 h-2 w-2 rounded-full bg-orange shadow-[0_0_10px_#FF9F43]" />
        <span aria-hidden className="block text-center font-mono text-[11px] tracking-[0.5em] text-[#FFD7A8]">
          HOTEL · PORTFOLIO
        </span>
        <span key={kick} className={`block ${kick ? "flicker" : ""}`}>
          {lines.map((line, li) => (
            <span key={li} data-line className="display block text-center text-[clamp(48px,6.8vw,108px)] leading-[0.98] app:text-[clamp(2.6rem,11vw,5rem)]">
              {line.split("").map((ch) => {
                const i = n++;
                return (
                  <span
                    key={i}
                    className={`whitespace-pre ${li === 0 ? "neon-tube" : "neon-tube-orange"}`}
                    style={{ animation: `tube-on 0.9s steps(1) ${0.25 + i * 0.07}s both` }}
                  >
                    {ch}
                  </span>
                );
              })}
              {/* a real space between the two lines, so the accessible name matches the visible text */}
              {li < lines.length - 1 ? " " : null}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

/**
 * iOS asks permission before the gyroscope can drive the parallax. Offer it with a small chip, once,
 * never on load. Other platforms already stream orientation, so the chip never shows there.
 */
function TiltChip() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    let asked = false;
    try {
      asked = localStorage.getItem("sc-tilt") !== null;
    } catch {}
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // show the chip only where permission is needed (iOS) and only once
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (DOE?.requestPermission && coarse && !reduced && !asked) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      className="pill !h-11"
      onClick={() => {
        const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
        DOE?.requestPermission?.()
          .then((r) => {
            try {
              localStorage.setItem("sc-tilt", r);
            } catch {}
            if (r === "granted") window.dispatchEvent(new Event("sc-tilt-granted"));
          })
          .catch(() => {})
          .finally(() => setShow(false));
      }}
    >
      Enable tilt
    </button>
  );
}

export function Hero() {
  const tier = useApp((s) => s.tier);
  const live = tier === "high" || tier === "medium";

  return (
    <section id="hero" data-section tabIndex={-1} aria-label="Introduction" className="section">
      <div className="section-inner relative flex items-center app:items-start">
        <div className="readable w-full max-w-[620px] tabp:mx-auto">
          <p className="kicker mb-4 inline-block rounded-full bg-white/85 px-3 py-1 app:mb-2.5 app:text-[11px] app:tracking-[0.06em]">Information Science & Engineering · NMAMIT · Class of 2027</p>
          <h1 id="hero-name" className="m-0">
            <NeonSign />
          </h1>
          <div className="glass mt-6 p-6 app:mt-4 app:p-5">
            <p className="text-[clamp(19px,1.7vw,24px)] leading-snug font-extrabold text-ink app:text-[clamp(18px,5vw,22px)]">{profile.tagline}</p>
            <p className="mt-2 font-mono text-[13px] tracking-[0.1em] text-ink-soft uppercase">{profile.subline.join(" · ")}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 app:mt-5 app:grid app:grid-cols-1 tabp:grid-cols-2">
              <button
                type="button"
                className="btn btn-primary app:!h-[54px] app:w-full"
                onClick={() => {
                  sfx("whoosh");
                  scrollToSection(1);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 17h14l-2-6H7zM7 11l2-4h6l2 4M7 17v2M17 17v2" />
                </svg>
                Start the drive
              </button>
              <a className="btn btn-ghost app:!h-[54px] app:w-full" href={profile.links.resume} download="Siddhartha_Chathra_BS_Resume.pdf" onClick={() => sfx("click")}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M8 2v8m0 0l-3.5-3.5M8 10l3.5-3.5M2.5 13.5h11" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Download résumé
              </a>
            </div>
          </div>
          {live && <p className="meta mt-4 app:hidden">Drag the street to look around · tap the car, the palms and the sign</p>}
          {live && (
            <p className="mt-4 flex flex-wrap items-center gap-2 text-[15px] text-ink-soft frame:hidden">
              Swipe the scene sideways to look around · tap the cars and palms
              <TiltChip />
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => scrollToSection(1)}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 app:hidden"
        aria-label="Scroll to the next section"
      >
        <span className="meta rounded-full bg-white/80 px-2">Scroll to drive</span>
        <span className="relative flex h-10 w-6 justify-center rounded-full border-2 border-ink/40 bg-white/50 pt-1.5">
          <span className="cue-dot block h-2 w-[3px] rounded-full bg-accent-strong" />
        </span>
      </button>
    </section>
  );
}
