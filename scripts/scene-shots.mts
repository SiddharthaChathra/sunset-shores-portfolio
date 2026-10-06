/** Diagnostics: scene-only screenshot of every stop (HTML hidden). Usage: npx tsx scripts/scene-shots.mts <outDir> [tier] [WxH] */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const [out = "test-results/scene", tier = "high", size = "1440x900"] = process.argv.slice(2);
const [w, h] = size.split("x").map(Number);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto(`http://localhost:3100/?tier=${tier}&capture=1`);
await p.waitForFunction("window.__sceneReady", null, { timeout: 90000 });
await p.waitForTimeout(2500);
for (const id of ["hero", "about", "projects", "experience", "certificates", "skills", "contact"]) {
  await p.evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY); })()`);
  await p.waitForTimeout(id === "projects" ? 2600 : 1800);
  await p.screenshot({ path: `${out}/${id}.png` });
}
await b.close();
