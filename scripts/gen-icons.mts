/**
 * Renders the neon "SC" monogram (same look as the HUD badge) into the app icons:
 *   app/icon.png (512) · app/apple-icon.png (180, opaque) · app/favicon.ico (16/32/48 PNG-in-ICO)
 * Usage: npx tsx scripts/gen-icons.mts
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const font = readFileSync("public/fonts/anton-400.woff").toString("base64");

function html(size: number, rounded: boolean) {
  const r = rounded ? Math.round(size * 0.22) : 0;
  const fs = Math.round(size * 0.56);
  const glow = (c: string) =>
    `0 0 ${size * 0.006}px #fff, 0 0 ${size * 0.025}px ${c}, 0 0 ${size * 0.06}px ${c}, 0 0 ${size * 0.11}px ${c}`;
  return `<!doctype html><html><head><style>
@font-face { font-family: Anton; src: url(data:font/woff;base64,${font}) format("woff"); }
html, body { margin: 0; background: transparent; }
.b { width: ${size}px; height: ${size}px; border-radius: ${r}px; box-sizing: border-box;
  background: radial-gradient(120% 90% at 50% 0%, #3a2f5c 0%, #23203a 60%);
  border: ${Math.max(1, size * 0.03)}px solid rgb(255 79 139 / 0.75);
  display: flex; align-items: center; justify-content: center;
  font-family: Anton, Impact, sans-serif; font-size: ${fs}px; letter-spacing: 0.02em; line-height: 1; padding-top: ${size * 0.02}px; }
.s { color: #fff6fa; text-shadow: ${glow("#ff4f8b")}; }
.c { color: #fff8ef; text-shadow: ${glow("#ff9f43")}; }
</style></head><body><div class="b"><span class="s">S</span><span class="c">C</span></div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function shot(size: number, rounded: boolean) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html(size, rounded));
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ omitBackground: rounded, clip: { x: 0, y: 0, width: size, height: size } });
}

writeFileSync("app/icon.png", await shot(512, true));
writeFileSync("app/apple-icon.png", await shot(180, false));

// favicon.ico: PNG-compressed entries (supported by every current browser)
const sizes = [16, 32, 48];
const pngs: Buffer[] = [];
for (const s of sizes) pngs.push(await shot(s, true));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
writeFileSync("app/favicon.ico", Buffer.concat([header, ...pngs]));

await browser.close();
console.log("icons written");
