/** Diagnostics: which shader programs block the main thread (>15 ms WebGL calls) after the precompile pass. */
import { chromium } from "@playwright/test";
const init = `
window.__slow = [];
const names = new WeakMap(), srcOf = new WeakMap();
for (const C of [WebGL2RenderingContext]) {
  const P = C.prototype;
  for (const k of Object.getOwnPropertyNames(P)) {
    const d = Object.getOwnPropertyDescriptor(P, k);
    if (!d || typeof d.value !== "function") continue;
    const o = d.value;
    P[k] = function (...a) {
      if (k === "shaderSource") srcOf.set(a[0], a[1]);
      if (k === "attachShader") { const s = srcOf.get(a[1]) || ""; const m = s.match(/#define SHADER_NAME (.*)/); const t = s.includes("troika") ? "troika " : ""; if (m) names.set(a[0], t + m[1]); else if (!names.has(a[0])) names.set(a[0], t + (s.match(/uniform [a-z0-9]+ (u[A-Z][A-Za-z]+)/) || ["", s.slice(0, 60)])[1]); }
      const t0 = performance.now(); const r = o.apply(this, a); const dt = performance.now() - t0;
      if (dt > 15) window.__slow.push([Math.round(t0), Math.round(dt), k, (a[0] && names.get(a[0])) || ""]);
      return r;
    };
  }
}`;
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1350, height: 940 } });
await page.addInitScript(init);
await page.goto(`http://localhost:3100/${process.argv[2] ?? "?tier=medium"}`);
await page.waitForFunction("window.__sceneReady", null, { timeout: 90000 });
await page.waitForTimeout(1500);
console.log("marks", await page.evaluate("JSON.stringify(performance.getEntriesByType('mark').filter((m) => m.name.startsWith('sc:')).map((m) => [m.name, Math.round(m.startTime)]))"));
for (const r of (await page.evaluate("window.__slow")) as unknown[]) console.log(JSON.stringify(r));
await browser.close();
