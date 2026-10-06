"use client";

import { projects } from "@/content/projects";
import { scrollToProject } from "@/lib/scroll";

/**
 * Low tier / reduced motion: the angled highway billboards in HTML/CSS 3D, so the Projects interaction
 * (active billboard slides in, previous slides away, click to jump) works without WebGL.
 */
export function BillboardsFallback({ active }: { active: number }) {
  return (
    <div className="relative my-4 h-[44%] [perspective:1100px]" aria-hidden>
      {projects.map((p, i) => {
        const d = i - active;
        const style: React.CSSProperties =
          d === 0
            ? { transform: "translate3d(0,0,0) rotateY(-12deg)", opacity: 1 }
            : d > 0
              ? { transform: `translate3d(${70 + d * 40}px, ${-50 - d * 20}px, ${-d * 220}px) rotateY(-12deg) scale(0.9)`, opacity: d === 1 ? 0.35 : 0 }
              : { transform: "translate3d(-260px, 20px, 120px) rotateY(-12deg)", opacity: 0, filter: "blur(8px)" };
        return (
          <button
            key={p.id}
            type="button"
            tabIndex={-1}
            onClick={() => scrollToProject(i)}
            className="absolute inset-x-0 top-1/2 mx-auto block w-[86%] max-w-[440px] -translate-y-1/2 text-left transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ ...style, transformStyle: "preserve-3d" }}
          >
            <span className="block rounded-[16px] p-[4px] shadow-[0_0_24px_rgb(255_79_139/0.55),0_24px_50px_rgb(35_32_58/0.25)]" style={{ background: "var(--grad)" }}>
              <span className="flex h-[150px] flex-col justify-between rounded-[12px] bg-[linear-gradient(160deg,#fff8f2,#ffe3d3)] p-5">
                <span className="font-mono text-[12px] font-bold tracking-[0.2em] text-[#BE1458]">BILLBOARD · {p.index}</span>
                <span className="font-[family-name:var(--font-anton)] text-[40px] leading-none text-[#23203A] uppercase">{p.title}</span>
                <span className="h-[3px] w-1/3 rounded-full" style={{ background: "var(--grad)" }} />
              </span>
            </span>
            <span className="mx-auto flex w-[60%] justify-between px-6">
              <span className="h-10 w-2 bg-[#5B5670]" />
              <span className="h-10 w-2 bg-[#5B5670]" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
