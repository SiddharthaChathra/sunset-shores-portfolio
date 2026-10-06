/** Diagnostics: LCP candidates + CLS on a throttled phone (Pixel 7 emulation, 4× CPU, slow 4G). Usage: npx tsx scripts/lcp.mts [query] */
import { chromium, devices } from "@playwright/test";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"] });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
// throttled 4G (Lighthouse "slow 4G": 150 ms RTT, 1.6 Mbps down, 750 kbps up)
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
await page.addInitScript(`window.__cls = 0; new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: "layout-shift", buffered: true }); window.__lcp = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push([Math.round(e.startTime), e.size, e.element ? e.element.tagName + "." + String(e.element.className).slice(0, 60) + " " + (e.url || e.element.textContent.slice(0, 30)) : "?"]))).observe({ type: "largest-contentful-paint", buffered: true });`);
await page.goto(`http://localhost:3100/${process.argv[2] ?? "?tier=low"}`);
await page.waitForTimeout(6000);
for (const r of (await page.evaluate("window.__lcp")) as unknown[]) console.log(JSON.stringify(r));
console.log("CLS", await page.evaluate("window.__cls.toFixed(4)"));
await browser.close();
