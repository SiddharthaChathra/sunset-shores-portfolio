"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useDeviceMode } from "@/lib/device";
import { certificateList } from "@/content/stats";
import type { CertCategory } from "@/content/types";
import { useApp, type CertFilter } from "@/lib/store";
import { sfx } from "@/lib/audio";

const FILTERS: CertFilter[] = ["All", "Cloud", "AI", "Data", "Networking"];

export const CATEGORY_COLOR: Record<CertCategory, string> = {
  Cloud: "var(--teal-ink)",
  AI: "var(--accent-strong)",
  Data: "#8A4B00",
  Networking: "var(--ink)",
};

export function filteredCertificates(f: CertFilter) {
  return f === "All"
    ? certificateList
    : certificateList.filter((c) => c.category === f);
}

/** Hanging tool-wall tag used for the filter pills. */
function ToolTag({
  label,
  count,
  pressed,
  onClick,
}: {
  label: string;
  count: number;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`group relative flex h-[40px] items-center gap-2 rounded-[10px] pr-3.5 pl-6 text-[13.5px] font-extrabold transition-all duration-300 hover:-rotate-2 app:h-11 app:shrink-0 app:text-[15px] touch:h-11 ${
        pressed
          ? "bg-ink text-white shadow-[0_8px_18px_rgb(35_32_58/0.3)]"
          : "bg-white text-ink shadow-[inset_0_0_0_1.5px_rgb(35_32_58/0.16)]"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-1/2 left-2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${pressed ? "bg-[#FF9F43]" : "bg-[#F4D9B4] shadow-[inset_0_0_0_1.5px_rgb(35_32_58/0.3)]"}`}
      />
      {label}
      <span
        className={`font-mono text-[11px] ${pressed ? "text-[#FFD7A8]" : "text-ink-soft"}`}
      >
        {count}
      </span>
    </button>
  );
}

type Cert = (typeof certificateList)[number];

/** A plaque card for the mobile carousel / tablet grid: real preview, title, issuer and date. */
function PlaqueCard({ c, centred, onOpen }: { c: Cert; centred?: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      disabled={c.locked}
      data-testid="cert-button"
      data-centred={centred ? "" : undefined}
      onClick={onOpen}
      aria-label={c.locked ? `${c.title}, locked: document not provided yet` : `Open ${c.title}, ${c.issuer}, ${c.dateLabel}`}
      className={`tap-press card relative flex w-full flex-col overflow-hidden rounded-[20px] p-2 text-left transition-transform duration-300 disabled:opacity-75 ${centred ? "-translate-y-1.5 scale-[1.03] shadow-[0_0_0_2px_#FF4F8B,0_18px_36px_rgb(255_79_139/0.28)]" : ""}`}
    >
      <span className="relative block aspect-[4/3] overflow-hidden rounded-[14px] p-[3px]" style={{ background: "var(--grad)" }}>
        {c.preview || c.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(c.preview ?? c.thumb) as string} alt="" className="h-full w-full rounded-[11px] bg-white object-cover object-top" loading="lazy" draggable={false} />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-[11px] bg-paper font-mono text-[12px] font-bold text-ink">LOCKED</span>
        )}
        {centred && <span aria-hidden className="plaque-glint pointer-events-none absolute inset-0" />}
      </span>
      <span className="mt-2.5 line-clamp-2 min-h-[2.6em] px-1 text-[16px] leading-tight font-extrabold text-ink">{c.title.replace(/^AINNOVATION 2025: /, "")}</span>
      <span className="mt-1 block truncate px-1 pb-1 font-mono text-[12px] text-ink-soft">
        <span style={{ color: CATEGORY_COLOR[c.category] }} className="font-bold">
          {c.category}
        </span>{" "}
        · {c.locked ? "Locked" : c.dateLabel}
      </span>
    </button>
  );
}

/** Phones: horizontal swipe carousel that snaps to centre; the centred plaque lifts, glints and gets the spotlight. */
function PlaqueCarousel({ list, open }: { list: Cert[]; open: (c: Cert) => void }) {
  const track = useRef<HTMLUListElement>(null);
  const [centre, setCentre] = useState(0);
  const setCertFocus = useApp((s) => s.setCertFocus);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      Array.from(el.children).forEach((ch, i) => {
        const li = ch as HTMLElement;
        const d = Math.abs(li.offsetLeft + li.offsetWidth / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setCentre(best);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [list]);
  useEffect(() => {
    setCertFocus(list[centre]?.id ?? null);
  }, [centre, list, setCertFocus]);
  useEffect(() => () => setCertFocus(null), [setCertFocus]);
  return (
    <div className="relative pb-4">
      <ul
        ref={track}
        data-testid="cert-carousel"
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-[14%] pt-3 pb-5"
        aria-label="Certificates (swipe)"
        tabIndex={0}
        data-lenis-prevent
      >
        {list.map((c, i) => (
          <li key={c.id} className="w-[72%] max-w-[300px] shrink-0 snap-center">
            <PlaqueCard c={c} centred={i === centre} onOpen={() => open(c)} />
          </li>
        ))}
      </ul>
      <p className="text-center font-mono text-[12px] text-ink-soft" aria-hidden>
        {Math.min(centre + 1, list.length)} / {list.length} · swipe
      </p>
    </div>
  );
}

export function Certificates() {
  const filter = useApp((s) => s.certFilter);
  const setFilter = useApp((s) => s.setCertFilter);
  const openLightbox = useApp((s) => s.openLightbox);
  const like = useApp((s) => s.like);
  const list = filteredCertificates(filter);
  const earned = certificateList.filter((c) => !c.locked).length;
  const mode = useDeviceMode();
  const openCert = (c: Cert) => {
    if (c.locked) return;
    sfx("shutter");
    like(c.id);
    const unlocked = list.filter((x) => !x.locked);
    openLightbox(unlocked, unlocked.findIndex((x) => x.id === c.id));
  };

  return (
    <section
      id="certificates"
      data-section
      tabIndex={-1}
      aria-labelledby="certificates-title"
      className="section frame:h-[160vh]"
    >
      {/* Desktop: the card stays put while the camera drifts along the trophy cabinet (scroll hold). */}
      <div className="frame:sticky frame:top-0">
        <div className="section-inner flex items-center app:items-start app:justify-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="glass touch-zoom w-full max-w-[600px] overflow-hidden app:max-w-[640px] app:[zoom:1]"
          >
            {/* pegboard header */}
            <div className="bg-[radial-gradient(circle,rgb(35_32_58/0.14)_1.6px,transparent_1.8px)] [background-size:18px_18px] px-7 pt-7 pb-5 app:px-5 app:pt-5 app:pb-3">
              <p className="kicker inline-block rounded-full bg-white px-3 py-1">
                05 · Trophy Garage
              </p>
              <h2
                id="certificates-title"
                className="display grad-text skew mt-3 text-[clamp(40px,4.2vw,68px)] app:text-[clamp(34px,9vw,48px)]"
              >
                Certificates
              </h2>
              <p className="mt-2 text-[15.5px] font-semibold text-ink app:text-[16px]">
                {earned} earned. Pick a plaque to open it in Photos.
              </p>
              <div
                role="group"
                aria-label="Filter certificates"
                tabIndex={mode === "frame" ? undefined : 0}
                className="mt-4 flex flex-wrap gap-2 app:no-scrollbar app:-mx-5 app:flex-nowrap app:overflow-x-auto app:px-5 app:pb-1 app:[mask-image:linear-gradient(90deg,transparent,#000_20px,#000_calc(100%-24px),transparent)]"
              >
                {FILTERS.map((f) => (
                  <ToolTag
                    key={f}
                    label={f}
                    count={
                      f === "All"
                        ? certificateList.length
                        : certificateList.filter((c) => c.category === f).length
                    }
                    pressed={filter === f}
                    onClick={() => {
                      sfx("click");
                      setFilter(f);
                    }}
                  />
                ))}
              </div>
            </div>
            {mode === "tabp" && (
              <ul className="grid grid-cols-3 gap-3 px-5 pt-2 pb-6" aria-live="polite" data-testid="cert-grid">
                {list.map((c) => (
                  <li key={c.id}>
                    <PlaqueCard c={c} onOpen={() => openCert(c)} />
                  </li>
                ))}
              </ul>
            )}
            {(mode === "phone" || mode === "land") && <PlaqueCarousel list={list} open={openCert} />}
            {mode === "frame" && (
            <ul
              className="grid gap-2.5 px-7 pt-1 pb-7 sm:grid-cols-2"
              aria-live="polite"
            >
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={c.locked}
                    data-testid="cert-button"
                    onClick={() => {
                      sfx("shutter");
                      like(c.id);
                      const unlocked = list.filter((x) => !x.locked);
                      openLightbox(
                        unlocked,
                        unlocked.findIndex((x) => x.id === c.id),
                      );
                    }}
                    className="card group flex w-full items-center gap-3 p-2 text-left transition hover:-translate-y-0.5 hover:shadow-[0_0_0_2px_#FF4F8B,0_10px_24px_rgb(255_79_139/0.2)] disabled:cursor-not-allowed disabled:opacity-75"
                    aria-label={
                      c.locked
                        ? `${c.title}, locked: document not provided yet`
                        : `Open ${c.title}, ${c.issuer}, ${c.dateLabel}`
                    }
                  >
                    <span
                      className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[8px] p-[2px]"
                      style={{ background: "var(--grad)" }}
                    >
                      {c.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.thumb}
                          alt=""
                          className="h-full w-full rounded-[6px] bg-white object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center rounded-[6px] bg-paper font-mono text-[10px] font-bold text-ink">
                          LOCKED
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-extrabold text-ink">
                        {c.title.replace(/^AINNOVATION 2025: /, "")}
                      </span>
                      <span className="block truncate font-mono text-[11.5px] text-ink-soft">
                        <span
                          style={{ color: CATEGORY_COLOR[c.category] }}
                          className="font-bold"
                        >
                          {c.category}
                        </span>{" "}
                        · {c.locked ? "Locked" : c.dateLabel}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
