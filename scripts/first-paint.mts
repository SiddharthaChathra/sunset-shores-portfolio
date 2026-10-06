/** Diagnostics: observed first paint / LCP / hydration-blocked time, median of N loads. Usage: npx tsx scripts/first-paint.mts [query] [runs] */
import { chromium, devices } from "@playwright/test";
const runs = Number(process.argv[3] ?? 5);
const browser = await chromium.launch();
const out: number[][] = [];
for (let i = 0; i < runs; i++) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  await page.addInitScript(`window.__lcpT = 0; new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__lcpT = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });`);
  await page.goto(`http://localhost:3100/${process.argv[2] ?? ""}`);
  await page.waitForTimeout(2500);
  out.push((await page.evaluate(`[performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? -1, window.__lcpT, performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd]`)) as number[]);
  await ctx.close();
}
const med = (k: number) => out.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(runs / 2)].toFixed(0);
console.log(`FCP ${med(0)}  LCP ${med(1)}  DCL ${med(2)}`);
await browser.close();
