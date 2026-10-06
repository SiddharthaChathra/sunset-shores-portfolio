import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Credits · Siddhartha Chathra B S", alternates: { canonical: "/credits" } };

const rows: [string, string, string][] = [
  ["Coastline, ocean, sunset sky, palms", "Procedural, generated in code", "Original work"],
  ["Art-deco hotels, highway, car, pool, café, garage, marina, pier", "Procedural three.js geometry", "Original work"],
  ["Ocean, sky, caustics, grade and heat-haze shaders", "Original GLSL", "Original work"],
  ["Simplex noise (GLSL)", "Ashima Arts / Stefan Gustavson", "MIT"],
  ["Certificate plaques", "Rendered from the owner's certificates", "Owner's documents"],
  ["Radio music (\"Sunset Shores Radio\") and sound effects", "Composed and synthesised by scripts/gen-music.mts and scripts/gen-audio.mts", "Original work"],
  ["Anton, Manrope, Space Mono", "Google Fonts / Fontsource", "SIL OFL 1.1"],
];

export default function Credits() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 text-ink">
      <Link href="/" className="font-mono text-[13px] font-bold text-accent-strong underline-offset-4 hover:underline">
        ← Back to Sunset Shores
      </Link>
      <h1 className="display grad-text skew mt-6 text-[56px]">Credits</h1>
      <p className="mt-4 text-[17px] leading-relaxed">
        Every 3D object, texture and sound here is procedural or original. The art direction is inspired by golden-hour coastal cities; no game names,
        logos, characters, screenshots, ripped assets or official music are used.
      </p>
      <table className="mt-8 w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-ink/20">
            <th className="py-2 pr-4">Asset</th>
            <th className="py-2 pr-4">Source</th>
            <th className="py-2">Licence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-ink/10">
              {r.map((c) => (
                <td key={c} className="py-2 pr-4">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
