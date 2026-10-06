/**
 * Contrast check for every text/surface pairing the Vice Sunset design uses.
 * Body / small text must reach 4.5:1; large display (≥ 32px or ≥ 24px bold) must reach 3:1.
 * Usage: node scripts/contrast.mjs  (exits 1 on any failure)
 */
const tokens = {
  ink: "#23203A",
  inkSoft: "#4A4566",
  accent: "#FF4F8B",
  accentStrong: "#BE1458",
  orange: "#FF9F43",
  tealInk: "#0B6E66",
  white: "#FFFFFF",
  paper: "#FFF8F2",
  glass: "#FFF6F0", // frosted panel (white 72% over warm tint) — conservative flattened value
};
const tints = {
  hero: "#FFE3D3",
  about: "#FFEFD9",
  projects: "#FFE0EC",
  experience: "#E3F6F5",
  certificates: "#FFF4CC",
  skills: "#E7E4FF",
  contact: "#FFD9C7",
};

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const checks = [];
const surfaces = { white: tokens.white, paper: tokens.paper, glass: tokens.glass, ...tints };
for (const [sName, s] of Object.entries(surfaces)) {
  checks.push(["body ink", tokens.ink, sName, s, 4.5]);
  checks.push(["secondary ink-soft", tokens.inkSoft, sName, s, 4.5]);
  checks.push(["link / kicker accent-strong", tokens.accentStrong, sName, s, 4.5]);
  checks.push(["teal-ink label", tokens.tealInk, sName, s, 4.5]);
}
// Buttons: ink on gradient stops (primary pill), white on ink (selected pill), ink on white (ghost).
for (const stop of [tokens.accent, "#FF7A59", tokens.orange]) checks.push(["primary button label (ink)", tokens.ink, `gradient ${stop}`, stop, 4.5]);
checks.push(["selected pill (white on ink)", tokens.white, "ink", tokens.ink, 4.5]);
checks.push(["hashtag (accent-strong on pink 10%)", tokens.accentStrong, "pink tint", "#FFEDF3", 4.5]);
// Display gradient text carries a 1.2px ink outline; we still require the fill to be ≥ 3:1 against the ink
// outline so the letterforms read, and the outline itself is ink on light (≥ 4.5:1 above).
for (const stop of [tokens.accent, tokens.orange]) checks.push(["display fill vs ink outline", stop, "ink outline", tokens.ink, 3]);
// Neon sign: white tube core on the ink signboard.
checks.push(["neon tube core on signboard", "#FFF6FA", "signboard", tokens.ink, 4.5]);

let failed = 0;
for (const [what, fg, sName, bg, min] of checks) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (≥${min})  ${what} on ${sName}`);
}
console.log(failed ? `\n${failed} pairing(s) fail` : `\nall ${checks.length} pairings pass`);
process.exit(failed ? 1 : 0);
