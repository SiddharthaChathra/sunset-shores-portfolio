import type { Page } from "@playwright/test";

export const SECTIONS = ["hero", "about", "projects", "experience", "certificates", "skills", "contact"] as const;

/** Load the page at a tier and wait until it is interactive (3D ready + loader gone). */
export async function boot(page: Page, tier: "high" | "medium" | "low", extra = "") {
  await page.goto(`/?tier=${tier}${extra}`);
  if (tier !== "low") await page.waitForFunction("window.__sceneReady === true", null, { timeout: 90_000 });
  await page.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 30_000 });
}

export async function scrollToSection(page: Page, id: string, offsetVh = 0) {
  await page.evaluate(
    `(() => { const el = document.getElementById(${JSON.stringify(id)}); const y = el.getBoundingClientRect().top + window.scrollY + innerHeight * ${offsetVh}; window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y); })()`,
  );
}

/** Smoothly wheel-scroll until the section's top reaches the viewport (realistic input path through Lenis). */
export async function wheelTo(page: Page, id: string) {
  await page.mouse.move(720, 450);
  for (let i = 0; i < 600; i++) {
    const top = (await page.evaluate(`document.getElementById(${JSON.stringify(id)}).getBoundingClientRect().top`)) as number;
    if (Math.abs(top) < 30) break;
    await page.mouse.wheel(0, Math.sign(top) * Math.min(100, Math.abs(top)));
    await page.waitForTimeout(16);
  }
}

/** Frame-time sample over `ms`: median FPS (robust to one-off spikes) and average FPS. */
export async function sampleFps(page: Page, ms = 2000): Promise<{ median: number; avg: number }> {
  return (await page.evaluate(
    `new Promise((res) => { const ts = []; let last = performance.now(); const t0 = last; const f = () => { const n = performance.now(); ts.push(n - last); last = n; if (n - t0 < ${ms}) requestAnimationFrame(f); else { const s = [...ts].sort((a, b) => a - b); res({ median: 1000 / s[Math.floor(s.length / 2)], avg: (ts.length * 1000) / (n - t0) }); } }; requestAnimationFrame(f); })`,
  )) as { median: number; avg: number };
}
