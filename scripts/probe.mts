/** Diagnostics: per-section frame time, draw calls and triangles. Usage: npx tsx scripts/probe.mts [tier] */
import { chromium } from "@playwright/test";
const tier = process.argv[2] ?? "high";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 1440), height: Number(process.env.H ?? 900) } });
page.on("console", (m) => m.text().startsWith("[quality]") && console.log(m.text()));
await page.goto(`http://localhost:3100/${tier === "auto" ? "?" : "?tier=" + tier}&fixeddpr${process.env.Q ?? ""}`);
await page.waitForFunction("window.__sceneReady || document.documentElement.dataset.tier === 'low'", null, { timeout: 60000 });
if (process.env.CSS) await page.addStyleTag({ content: process.env.CSS });
await page.waitForTimeout(3000);
for (const id of [...(process.argv[3] ? ["hero","about","projects","experience","certificates","skills","contact"] : []), "hero", "about", "projects", "experience", "certificates", "skills", "contact"]) {
  await page.evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + (${JSON.stringify(id)} === "projects" ? innerHeight * 0.4 : 0)); })()`);
  await page.waitForTimeout(3500);
  const r = await page.evaluate(`new Promise((res) => { const ts = []; let last = performance.now(); const f = () => { const n = performance.now(); ts.push(n - last); last = n; if (ts.length < 90) requestAnimationFrame(f); else { ts.sort((a,b)=>a-b); const i = window.__gl ? window.__gl.info.render : {}; res({ med: ts[45], p95: ts[85], max: ts[89], calls: i.calls, tris: i.triangles, tier: document.documentElement.dataset.tier }); } }; requestAnimationFrame(f); })`);
  console.log(id.padEnd(13), JSON.stringify(r));
}
await browser.close();
