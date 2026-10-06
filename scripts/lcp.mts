/** Diagnostics: LCP candidates on a throttled phone (Pixel 7 emulation, 4× CPU). Usage: npx tsx scripts/lcp.mts [query] */
import { chromium, devices } from "@playwright/test";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"] });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.addInitScript(`window.__lcp = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push([Math.round(e.startTime), e.size, e.element ? e.element.tagName + "." + String(e.element.className).slice(0, 60) + " " + (e.url || e.element.textContent.slice(0, 30)) : "?"]))).observe({ type: "largest-contentful-paint", buffered: true });`);
await page.goto(`http://localhost:3100/${process.argv[2] ?? "?tier=low"}`);
await page.waitForTimeout(6000);
for (const r of (await page.evaluate("window.__lcp")) as unknown[]) console.log(JSON.stringify(r));
await browser.close();
