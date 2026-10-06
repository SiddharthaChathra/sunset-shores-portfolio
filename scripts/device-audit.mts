/**
 * Responsive audit: screenshot every section on the device matrix and measure overflow, small tap targets
 * and small body text. Usage: npx tsx scripts/device-audit.mts <outDir> [deviceFilter] [query]
 * Writes <outDir>/<device>/<section>.png and <outDir>/audit.json.
 */
import { chromium, devices, type BrowserContextOptions } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const [out = "responsive/audit", filter = "", query = ""] = process.argv.slice(2);
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SECTIONS = ["hero", "about", "projects", "experience", "certificates", "skills", "contact"];

const iphone = devices["iPhone 15"];
const ipad = devices["iPad Pro 11"];
const pixel = devices["Pixel 7"];
const phone = (w: number, h: number, base = iphone): BrowserContextOptions => ({ ...base, viewport: { width: w, height: h }, screen: { width: w, height: h } });
export const MATRIX: Record<string, BrowserContextOptions> = {
  "iphone-se": phone(375, 667),
  "iphone-15": phone(393, 852),
  "iphone-15-pro-max": phone(430, 932),
  "pixel-7": phone(412, 915, pixel),
  "galaxy-fold": phone(344, 882, pixel),
  "ipad-mini": phone(768, 1024, ipad),
  "ipad-air": phone(820, 1180, ipad),
  "ipad-pro": phone(1024, 1366, ipad),
  "iphone-15-land": phone(852, 393),
  "ipad-pro-land": phone(1366, 1024, ipad),
  "desktop": { viewport: { width: 1440, height: 900 } },
};

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const report: Record<string, unknown> = {};
for (const [name, opts] of Object.entries(MATRIX)) {
  if (filter && !name.includes(filter)) continue;
  mkdirSync(`${out}/${name}`, { recursive: true });
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${query ? "?" + query : ""}`);
  await page.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 90_000 });
  await page.waitForTimeout(1200);
  const tier = await page.evaluate("document.documentElement.dataset.tier");
  const perSection: Record<string, unknown> = {};
  for (const id of SECTIONS) {
    await page.evaluate(
      `(() => { const el = document.getElementById(${JSON.stringify(id)}); const y = el.getBoundingClientRect().top + scrollY; window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); })()`,
    );
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${out}/${name}/${id}.png` });
    perSection[id] = await page.evaluate(`(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (el.matches(".sr-only-focusable:not(:focus), .sr-only")) return false; return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && cs.visibility !== "hidden" && cs.display !== "none" && cs.pointerEvents !== "none"; };
      const small = [...document.querySelectorAll("a[href], button, [role=button], [role=tab], input, textarea")]
        .filter(vis)
        .map((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40) }; })
        .filter((t) => t.w < 44 || t.h < 44);
      const tinyText = [...document.querySelectorAll("p, li")]
        .filter(vis)
        .filter((el) => !el.closest(".kicker, .meta, .font-mono, .hashtag, [aria-hidden=true]") && !/font-mono|kicker|meta|hashtag/.test(el.className))
        .map((el) => ({ size: +(parseFloat(getComputedStyle(el).fontSize) * (el.currentCSSZoom ?? 1)).toFixed(1), text: el.textContent.trim().slice(0, 40) }))
        .filter((t) => t.size < 16 && t.text);
      return { overflow: document.documentElement.scrollWidth - innerWidth, smallTargets: small, tinyText: tinyText.slice(0, 12), tinyTextCount: tinyText.length };
    })()`);
  }
  report[name] = { tier, viewport: opts.viewport, sections: perSection };
  console.log(name, tier, Object.entries(perSection).map(([k, v]) => `${k}:ov${(v as { overflow: number }).overflow}/t${(v as { smallTargets: unknown[] }).smallTargets.length}/x${(v as { tinyTextCount: number }).tinyTextCount}`).join(" "));
  await ctx.close();
}
writeFileSync(`${out}/audit.json`, JSON.stringify(report, null, 1));
await browser.close();
