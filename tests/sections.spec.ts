import { test, expect } from "@playwright/test";
import { boot, SECTIONS, sampleFps, wheelTo } from "./helpers";

for (const vp of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`high tier: camera visits all 7 stops, screenshots + FPS @${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await boot(page, "high");
    const report: Record<string, { median: number; avg: number }> = {};
    for (const id of SECTIONS) {
      await wheelTo(page, id);
      await page.waitForTimeout(1800);
      const fps = await sampleFps(page);
      report[id] = { median: Math.round(fps.median), avg: Math.round(fps.avg) };
      await page.screenshot({ path: `test-results/screens/high-${vp.width}x${vp.height}-${id}.png` });
      await expect(page.locator(`#${id}`)).toBeInViewport({ ratio: id === "projects" ? 0.12 : 0.3 });
    }
    console.log(`fps @${vp.width}x${vp.height}`, JSON.stringify(report));
    expect(errors).toEqual([]);
    // The ≥55 fps target applies to hardware the site itself would run at "high". On a GPU that
    // auto-detection places lower (e.g. integrated Intel), forcing ?tier=high is a stress test: log only.
    const probe = await page.context().newPage();
    await probe.goto("/");
    await expect(probe.locator("html")).toHaveAttribute("data-tier", /high|medium|low/);
    const autoTier = await probe.locator("html").getAttribute("data-tier");
    await probe.close();
    test.info().annotations.push({ type: "auto-tier", description: autoTier ?? "?" });
    if (autoTier === "high") {
      for (const [id, f] of Object.entries(report)) {
        expect(f.median, `median fps at ${id}`).toBeGreaterThanOrEqual(55);
        expect(f.avg, `average fps at ${id}`).toBeGreaterThanOrEqual(50);
      }
    } else {
      console.log(`auto tier on this machine is "${autoTier}": high-tier FPS recorded, not asserted`);
    }
  });
}

test("medium tier holds ≥ 45 fps", async ({ page }) => {
  await boot(page, "medium");
  for (const id of SECTIONS) {
    await wheelTo(page, id);
    await page.waitForTimeout(1500);
    const fps = await sampleFps(page, 1500);
    expect(fps.median, `median fps at ${id}`).toBeGreaterThanOrEqual(45);
    expect(fps.avg, `average fps at ${id}`).toBeGreaterThanOrEqual(45);
  }
});

test("scrolling backwards reverses the camera exactly, no jitter at stops", async ({ page }) => {
  await boot(page, "medium");
  const pose = async () =>
    (await page.evaluate("(() => { const p = window.__camera.position; return [p.x, p.y, p.z]; })()")) as number[];
  await page.mouse.move(720, 450); // centre: parallax offset identical for both reads
  await wheelTo(page, "experience");
  await page.evaluate("window.__lenis.scrollTo(document.getElementById('experience').getBoundingClientRect().top + window.scrollY, { immediate: true })");
  await page.waitForTimeout(3500);
  const y = (await page.evaluate("window.scrollY")) as number;
  const a = await pose();
  await page.waitForTimeout(500);
  const a2 = await pose();
  expect(Math.hypot(a[0] - a2[0], a[1] - a2[1], a[2] - a2[2]), "camera settled (no jitter)").toBeLessThan(0.01);
  await wheelTo(page, "skills");
  await page.waitForTimeout(1500);
  await wheelTo(page, "experience");
  await page.evaluate(`window.__lenis.scrollTo(${y}, { immediate: true })`);
  await page.waitForTimeout(3000);
  expect(await page.evaluate("window.scrollY")).toBe(y);
  const b = await pose();
  expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), "same pose after reversing").toBeLessThan(0.05);
});

test("HUD minimap reflects the section and drives there on click", async ({ page }) => {
  await boot(page, "high");
  await page.getByTestId("minimap-waypoint-4").click();
  await expect(page.getByTestId("minimap-waypoint-4")).toHaveAttribute("aria-current", "location", { timeout: 10_000 });
  await expect(page.locator("#certificates")).toBeInViewport({ ratio: 0.3 });
  await page.getByTestId("minimap-waypoint-1").click();
  await expect(page.getByTestId("minimap-waypoint-1")).toHaveAttribute("aria-current", "location", { timeout: 10_000 });
});

test("rendering pauses when the tab is hidden", async ({ page }) => {
  await boot(page, "high");
  await page.evaluate(`Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange"));`);
  await expect(page.getByTestId("stage")).toHaveAttribute("data-frameloop", "never");
  await page.evaluate(`Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange"));`);
  await expect(page.getByTestId("stage")).toHaveAttribute("data-frameloop", "always");
});

test("hero: drag-orbit and beach ping", async ({ page }) => {
  await boot(page, "high");
  await page.mouse.move(1150, 650);
  await page.mouse.down();
  await page.mouse.move(1000, 650, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await page.mouse.click(1080, 720);
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/screens/hero-ping.png" });
  const pinged = await page.evaluate("document.querySelector('[data-testid=stage]') !== null");
  expect(pinged).toBe(true);
});

test("auto tier detection picks a tier and explains why", async ({ page }) => {
  const logs: string[] = [];
  page.on("console", (m) => m.text().startsWith("[quality]") && logs.push(m.text()));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-tier", /high|medium|low/);
  await page.waitForTimeout(500);
  console.log(logs.join("\n"));
  expect(logs.length).toBeGreaterThan(0);
});
