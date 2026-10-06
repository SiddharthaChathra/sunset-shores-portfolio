/** Diagnostics: scene-only screenshots along the camera path at given world positions. Usage: npx tsx scripts/path-shots.mts <outDir> 2.5,3,3.5 [tier] */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const [out = "test-results/path", list = "2,2.5,3,3.5,4,4.5,5", tier = "high"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`http://localhost:3100/?tier=${tier}&capture=1&fixeddpr`);
await p.waitForFunction("window.__sceneReady", null, { timeout: 90000 });
await p.waitForTimeout(2000);
for (const w of list.split(",").map(Number)) {
  // scroll between section i's hold end and section i+1's top (world i → i+1)
  await p.evaluate(`(() => {
    const els = [...document.querySelectorAll("[data-section]")];
    const i = Math.floor(${w}), f = ${w} - i;
    const top = (el) => el.getBoundingClientRect().top + scrollY;
    const a = top(els[i]) + els[i].offsetHeight - innerHeight;
    const b = els[i + 1] ? top(els[i + 1]) : a;
    window.scrollTo(0, a + (b - a) * f);
  })()`);
  await p.waitForTimeout(1500);
  const cam = await p.evaluate(`window.__camera.position.toArray().map(v => +v.toFixed(1))`);
  console.log(w, JSON.stringify(cam));
  await p.screenshot({ path: `${out}/w${w}.png` });
}
await b.close();
