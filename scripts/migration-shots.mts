/**
 * Screenshot every section at a set of viewports (re-theme before/after comparison).
 * Usage: npx tsx scripts/migration-shots.mts <outDir> [sizes=1440x900,390x844]
 * Desktop sizes use ?tier=high; tablet/phone sizes run with the auto tier as a real device would.
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [out = "migration/after", sizesArg = "1440x900,1920x1080,820x1180,390x844"] = process.argv.slice(2);
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SECTIONS = ["hero", "about", "projects", "experience", "certificates", "skills", "contact"];
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
for (const size of sizesArg.split(",")) {
  const [w, h] = size.split("x").map(Number);
  const mobile = w < 1024;
  const ctx = await browser.newContext(
    mobile
      ? { ...devices["Pixel 7"], viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 700, hasTouch: true }
      : { viewport: { width: w, height: h } },
  );
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${mobile ? "" : "?tier=high"}`);
  await page.waitForFunction("window.__sceneReady || document.documentElement.dataset.tier === 'low'", null, { timeout: 90000 });
  await page.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  for (const id of SECTIONS) {
    await page.evaluate(
      `(() => { const el = document.getElementById(${JSON.stringify(id)}); const y = el.getBoundingClientRect().top + window.scrollY + (${JSON.stringify(id)} === "projects" ? innerHeight * 0.4 : 0); window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y); })()`,
    );
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${out}/${size}-${id}.png` });
  }
  console.log("shots", size);
  await ctx.close();
}
await browser.close();
