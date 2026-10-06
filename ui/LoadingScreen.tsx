"use client";

import { useEffect, useState } from "react";
import { loadingTips, profile } from "@/content/profile";
import { useApp } from "@/lib/store";
import { Monogram } from "./hud/Hud";

const MAX_WAIT = 8000;
/** Posterised renders of Sunset Shores (scripts/capture-stills.mts). Gradient art shows until they exist. */
const PANELS = ["/stills/loader-1.webp", "/stills/loader-2.webp", "/stills/loader-3.webp"];
const PANEL_FALLBACK = [
  "linear-gradient(170deg,#FF8FB1 0%,#FFC48C 55%,#58D1C9 56%,#1E8FA6 100%)",
  "linear-gradient(170deg,#FF9EA8 0%,#FFE3D3 60%,#F4D9B4 61%,#E2BE95 100%)",
  "linear-gradient(170deg,#B7A6F2 0%,#FFC48C 58%,#58D1C9 59%,#1E8FA6 100%)",
];

/** Illustrated loading screen: three diagonal Ken Burns panels, neon SC, gradient bar, rotating tips. */
export function LoadingScreen() {
  const tier = useApp((s) => s.tier);
  const sceneReady = useApp((s) => s.sceneReady);
  const progress = useApp((s) => s.loadProgress);
  const setLoadingDone = useApp((s) => s.setLoadingDone);
  const [tip, setTip] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [gone, setGone] = useState(false);
  const [shown, setShown] = useState(4);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  // Illustrated panels only for the live 3D tiers (the low tier's loader is brief; gradient art suffices,
  // and it keeps the hero text as the page's largest paint on phones).
  const art = tier === "high" || tier === "medium";

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % loadingTips.length), 3200);
    return () => clearInterval(id);
  }, []);

  const target = !tier ? 8 : tier === "low" ? 100 : sceneReady ? 100 : 15 + progress * 0.8;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setShown((v) => {
        const n = v + (target - v) * 0.12;
        return Math.abs(target - n) < 0.4 ? target : n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const finish = () => {
    setHidden(true);
    setLoadingDone(true);
    setTimeout(() => setGone(true), 800);
  };

  useEffect(() => {
    if (!tier || hidden) return;
    if (tier === "low") {
      const t = setTimeout(finish, 650);
      return () => clearTimeout(t);
    }
    if (sceneReady && shown >= 99.5) {
      const t = setTimeout(finish, 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, sceneReady, shown, hidden]);

  useEffect(() => {
    const t = setTimeout(finish, MAX_WAIT);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;
  const pct = Math.round(shown);

  return (
    <div
      className={`loader-fallback-hide fixed inset-0 z-[90] overflow-hidden bg-[#FFE3D3] transition-[opacity,visibility] duration-[800ms] ${hidden ? "invisible opacity-0" : "opacity-100"}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${profile.name}'s portfolio, ${pct} percent`}
      data-testid="loading-screen"
    >
      {/* three illustrated panels, sliding in diagonally */}
      <div aria-hidden className="absolute inset-0 flex -skew-x-[8deg] gap-3" style={{ marginLeft: "-6%", marginRight: "-6%" }}>
        {PANELS.map((src, i) => (
          <div
            key={src}
            className="relative h-full flex-1 overflow-hidden rounded-[6px]"
            style={{
              background: PANEL_FALLBACK[i],
              animation: `panel-in 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 0.12}s both`,
            }}
          >
            {art && !failed[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                onError={() => setFailed((f) => ({ ...f, [i]: true }))}
                className="absolute inset-0 h-full w-full skew-x-[8deg] scale-125 object-cover"
                style={{ animation: `kenburns 9s ease-out ${i * 0.4}s both alternate infinite` }}
              />
            )}
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(255_227_211/0.92)_80%)]" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 px-[clamp(18px,4vw,56px)] pb-[clamp(20px,5vh,48px)]">
        <div className="max-w-[560px]">
          <p className="display text-[clamp(30px,4vw,54px)] text-ink">Sunset Shores</p>
          <p key={tip} className="mt-2 text-[15px] leading-relaxed font-semibold text-ink">
            <span className="font-mono text-[11.5px] font-bold tracking-[0.18em] text-accent-strong uppercase">Tip · </span>
            {loadingTips[tip]}
          </p>
          <div className="mt-4 w-[min(420px,80vw)]">
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-ink/12">
              <div className="h-full origin-left rounded-full" style={{ background: "var(--grad)", transform: `scaleX(${shown / 100})` }} />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[11.5px] font-bold text-ink-soft">
              <span>{tier ? (tier === "low" ? "Postcards mode" : `Graphics · ${tier}`) : "Checking your GPU"}</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
          </div>
          <button type="button" onClick={finish} className="mt-3 font-mono text-[11.5px] font-bold tracking-[0.18em] text-ink-soft uppercase underline-offset-4 hover:text-ink hover:underline">
            Skip intro
          </button>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Monogram size={84} />
          <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">{profile.name}</p>
        </div>
      </div>
    </div>
  );
}
