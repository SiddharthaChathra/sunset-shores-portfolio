/**
 * Diagnostics: phone FPS on the medium tier with 4× CPU slowdown (brief: ≥45 fps, or auto-degrade engages).
 * Usage: npx tsx scripts/phone-fps.mts
 */
import { chromium, devices } from "@playwright/test";
const { defaultBrowserType: _d, ...phone } = devices["Pixel 7"];
const b = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await b.newContext({ ...phone });
const p = await ctx.newPage();
p.on("console", (m) => m.text().startsWith("[quality]") && console.log(m.text()));
await p.goto("http://localhost:3100/?tier=medium");
await p.waitForFunction("window.__sceneReady", null, { timeout: 90000 });
await p.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 30000 });
const cdp = await ctx.newCDPSession(p);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
for (const id of ["hero", "projects", "certificates", "contact"]) {
  await p.evaluate(`(() => { const el = document.getElementById("${id}"); window.__lenis.scrollTo(el.getBoundingClientRect().top + scrollY + (${JSON.stringify(id)} === "projects" ? innerHeight * 0.4 : 0), { immediate: true, force: true }); })()`);
  await p.waitForTimeout(4500); // give the resolution guard time to settle
  const r = await p.evaluate(`new Promise((res) => { const ts = []; let last = performance.now(); const t0 = last; const f = () => { const n = performance.now(); ts.push(n - last); last = n; if (n - t0 < 2500) requestAnimationFrame(f); else { const s = [...ts].sort((a, b) => a - b); res({ median: Math.round(1000 / s[Math.floor(s.length / 2)]), dpr: (window.__dpr || 0).toFixed(2), tier: document.documentElement.dataset.tier }); } }; requestAnimationFrame(f); })`);
  console.log(id.padEnd(13), JSON.stringify(r));
}
await b.close();
