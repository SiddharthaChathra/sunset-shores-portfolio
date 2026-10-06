/**
 * Dev helper: screenshot every section stop with live WebGL and report console errors + FPS.
 * Usage: npx tsx scripts/shoot.mts [tier=high] [width=1440] [height=900] [outDir=reports/shots]
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [tier = "high", w = "1440", h = "900", out = "reports/shots"] = process.argv.slice(2);
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SECTIONS = ["hero", "about", "projects", "experience", "certificates", "skills", "contact"];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors: string[] = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text().slice(0, 300)}`);
  if (m.text().startsWith("[quality]")) console.log(m.text());
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(`${BASE}/?tier=${tier}`, { waitUntil: "load" });
if (tier !== "low") await page.waitForFunction(() => (window as unknown as { __sceneReady?: boolean }).__sceneReady, null, { timeout: 60000 });
await page.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 20000 }).catch(() => {});
await page.waitForTimeout(3500);

const gpu = await page.evaluate(() => {
  const c = document.createElement("canvas").getContext("webgl2");
  const d = c?.getExtension("WEBGL_debug_renderer_info");
  return d ? c!.getParameter(d.UNMASKED_RENDERER_WEBGL) : "unknown";
});
console.log("GPU:", gpu);

for (const id of SECTIONS) {
  await page.evaluate((sid) => {
    const el = document.getElementById(sid)!;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const extra = sid === "projects" ? window.innerHeight * 0.4 : 0;
    window.scrollTo({ top: top + extra, behavior: "instant" as ScrollBehavior });
  }, id);
  await page.waitForTimeout(3500);
  const fps = (await page.evaluate(
    `new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2500) requestAnimationFrame(f); else res((n * 1000) / (performance.now() - t0)); }; requestAnimationFrame(f); })`,
  )) as number;
  await page.screenshot({ path: `${out}/${tier}-${w}x${h}-${id}.png` });
  console.log(`${id.padEnd(13)} fps ${fps.toFixed(1)}`);
}
console.log(errors.length ? errors.slice(0, 25).join("\n") : "no console errors");
await browser.close();
