"use client";

import { motion } from "motion/react";
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
      className={`group relative flex h-[40px] items-center gap-2 rounded-[10px] pr-3.5 pl-6 text-[13.5px] font-extrabold transition-all duration-300 hover:-rotate-2 ${
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

export function Certificates() {
  const filter = useApp((s) => s.certFilter);
  const setFilter = useApp((s) => s.setCertFilter);
  const openLightbox = useApp((s) => s.openLightbox);
  const like = useApp((s) => s.like);
  const list = filteredCertificates(filter);
  const earned = certificateList.filter((c) => !c.locked).length;

  return (
    <section
      id="certificates"
      data-section
      tabIndex={-1}
      aria-labelledby="certificates-title"
      className="section min-[700px]:h-[160vh]"
    >
      {/* Desktop: the card stays put while the camera drifts along the trophy cabinet (scroll hold). */}
      <div className="min-[700px]:sticky min-[700px]:top-0">
        <div className="section-inner flex items-center max-md:!pt-[40svh]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="glass w-full max-w-[600px] overflow-hidden"
          >
            {/* pegboard header */}
            <div className="bg-[radial-gradient(circle,rgb(35_32_58/0.14)_1.6px,transparent_1.8px)] [background-size:18px_18px] px-7 pt-7 pb-5">
              <p className="kicker inline-block rounded-full bg-white px-3 py-1">
                05 · Trophy Garage
              </p>
              <h2
                id="certificates-title"
                className="display grad-text skew mt-3 text-[clamp(40px,4.2vw,68px)]"
              >
                Certificates
              </h2>
              <p className="mt-2 text-[15.5px] font-semibold text-ink">
                {earned} earned. Pick a plaque to open it in Photos.
              </p>
              <div
                role="group"
                aria-label="Filter certificates"
                className="mt-4 flex flex-wrap gap-2"
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
          </motion.div>
        </div>
      </div>
    </section>
  );
}
