/** Diagnostics: CPU profile of the page boot (self + inclusive time by function). Usage: npx tsx scripts/profile-boot.mts [query] */
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1350, height: 940 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 300 });
await cdp.send("Profiler.start");
await page.goto(`http://localhost:3100/${process.argv[2] ?? "?tier=medium"}`);
await page.waitForFunction("window.__sceneReady || document.documentElement.dataset.tier==='low'", null, { timeout: 90000 });
await page.waitForTimeout(1500);
const { profile } = await cdp.send("Profiler.stop");
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map<number, number>();
profile.nodes.forEach((n) => n.children?.forEach((c) => parent.set(c, n.id)));
const self = new Map<string, number>();
const incl = new Map<string, number>();
const dt = profile.timeDeltas ?? [];
const name = (n: (typeof profile.nodes)[number]) => `${n.callFrame.functionName || "(anon)"} @${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber}`;
(profile.samples ?? []).forEach((id, i) => {
  const d = (dt[i] ?? 0) / 1000;
  self.set(name(byId.get(id)!), (self.get(name(byId.get(id)!)) ?? 0) + d);
  const seen = new Set<string>();
  for (let cur: number | undefined = id; cur !== undefined; cur = parent.get(cur)) {
    const k = name(byId.get(cur)!);
    if (!seen.has(k)) {
      incl.set(k, (incl.get(k) ?? 0) + d);
      seen.add(k);
    }
  }
});
console.log("SELF");
[...self].filter(([k]) => !/^\((idle|program|root)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log(v.toFixed(0).padStart(6), k));
console.log("INCLUSIVE");
[...incl].filter(([k]) => !/^\((root|program|idle|anon)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([k, v]) => console.log(v.toFixed(0).padStart(6), k));
await browser.close();
