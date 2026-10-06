/** Diagnostics: wheel-scroll the whole page like a user (auto tier) and log tier changes + FPS per section. Usage: npx tsx scripts/wheel-walk.mts [WxH] */
import { chromium } from "@playwright/test";
const [w, h] = (process.argv[2] ?? "1920x1080").split("x").map(Number);
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on("console", (m) => m.text().startsWith("[quality]") && console.log(m.text()));
await page.goto("http://localhost:3100/");
await page.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 60000 });
await page.mouse.move(w / 2, h / 2);
let last = "";
for (let i = 0; i < 400; i++) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(60);
  if (i % 10 === 0) {
    const s = (await page.evaluate(`[document.documentElement.dataset.tier, Math.round(window.__fps||0), (window.__dpr||0).toFixed(2), [...document.querySelectorAll("[data-section]")].findIndex(e=>{const r=e.getBoundingClientRect();return r.top<=innerHeight/2&&r.bottom>innerHeight/2}), Math.round(scrollY)]`)) as unknown[];
    const k = `${s[0]} sec${s[3]} ${s[2]}`;
    if (k !== last) console.log(i, JSON.stringify(s));
    last = k;
  }
}
await browser.close();
