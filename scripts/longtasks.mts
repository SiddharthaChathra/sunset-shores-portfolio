/** Diagnostics: cold-boot long tasks per URL (fresh browser profile each, so GPU shader caches are cold). */
import { chromium } from "@playwright/test";
for (const q of process.argv.slice(2)) {
  const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1350, height: 940 } });
  await page.addInitScript(`window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: "longtask", buffered: true });`);
  await page.goto(`http://localhost:3100/${q}`);
  await page.waitForFunction("window.__sceneReady || document.documentElement.dataset.tier==='low'", null, { timeout: 90000 });
  await page.waitForTimeout(2500);
  const lt = (await page.evaluate("window.__lt")) as [number, number][];
  console.log(q.padEnd(24), "tbt≈", lt.reduce((s, [, d]) => s + Math.max(0, d - 50), 0), "tasks", JSON.stringify(lt.sort((a, b) => b[1] - a[1]).slice(0, 8)));
  await browser.close();
}
