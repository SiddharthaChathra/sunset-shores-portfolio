/**
 * Renders a still of every 3D scene (camera settled at each stop, HTML hidden) for the low tier /
 * reduced-motion fallback, posterised loading-screen panels, and the Open Graph image from the Hero. Requires a running server.
 * Usage: npm run build && npm run start & npm run capture:stills
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SECTIONS = ["hero", "about", "projects", "experience", "certificates", "skills", "contact"];
const ARGS = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle"];

mkdirSync("public/stills", { recursive: true });
const browser = await chromium.launch({ args: ARGS });

// 1. Scene stills (HTML hidden via ?capture).
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`${BASE}/?tier=high&capture=1`);
await page.waitForFunction("window.__sceneReady", null, { timeout: 90000 });
await page.waitForTimeout(2500);
for (const id of SECTIONS) {
  await page.evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY); })()`);
  await page.waitForTimeout(id === "projects" ? 2600 : 1800);
  const png = await page.screenshot({ type: "png" });
  await sharp(png).webp({ quality: 78 }).toFile(`public/stills/${id}.webp`);
  await sharp(png).resize(960).webp({ quality: 70 }).toFile(`public/stills/${id}-sm.webp`);
  // Loading-screen artwork: posterised "illustrated" panels from three of the scenes.
  const panel = { hero: 1, projects: 2, contact: 3 }[id as "hero" | "projects" | "contact"];
  if (panel) {
    const poster = await sharp(png).resize(960).png({ palette: true, colors: 14, dither: 0 }).toBuffer();
    await sharp(poster).modulate({ saturation: 1.15 }).webp({ quality: 80 }).toFile(`public/stills/loader-${panel}.webp`);
  }
  console.log("still", id);
}

// 2. Open Graph image: the live Hero with its HTML title.
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.goto(`${BASE}/?tier=high`);
await og.waitForFunction("window.__sceneReady", null, { timeout: 90000 });
await og.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 30000 });
await og.addStyleTag({ content: ".companion-layer,.hud-layer nav,[aria-label='Scroll to the next section']{display:none!important}" });
await og.waitForTimeout(4500);
await sharp(await og.screenshot({ type: "png" })).png({ compressionLevel: 9 }).toFile("app/opengraph-image.png");
console.log("og image written");
await browser.close();
