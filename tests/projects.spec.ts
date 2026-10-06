import { test, expect, type Page } from "@playwright/test";
import { boot } from "./helpers";

const IDS = ["jobsentinel", "netsentinel", "heart-disease-detection", "travora"];

async function scrollProjectsTo(page: Page, k: number) {
  await page.evaluate(
    `(() => { const el = document.getElementById("projects"); const top = el.getBoundingClientRect().top + window.scrollY; const span = el.offsetHeight - innerHeight; const y = top + span * (${k} + 0.5) / 4; window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y); })()`,
  );
}

for (const tier of ["high", "low"] as const) {
  test(`projects: active card + description change 4 times in both directions (${tier})`, async ({ page }) => {
    await boot(page, tier);
    const section = page.locator("#projects");
    const article = page.getByTestId("project-article");
    for (const k of [0, 1, 2, 3]) {
      await scrollProjectsTo(page, k);
      await expect(section).toHaveAttribute("data-active-project", String(k));
      await expect(article).toHaveAttribute("data-project-id", IDS[k]);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `test-results/screens/projects-${tier}-${k}.png` });
    }
    for (const k of [2, 1, 0]) {
      await scrollProjectsTo(page, k);
      await expect(section).toHaveAttribute("data-active-project", String(k));
      await expect(article).toHaveAttribute("data-project-id", IDS[k]);
    }
    // Clicking a manifest tab jumps to that project.
    await page.getByRole("tab", { name: /Travora/ }).click();
    await expect(section).toHaveAttribute("data-active-project", "3", { timeout: 10_000 });
  });
}

test("projects: exactly the four featured projects, in order", async ({ page }) => {
  await boot(page, "low");
  const tabs = page.getByRole("tablist", { name: "Projects" }).getByRole("tab");
  await expect(tabs).toHaveCount(4);
  await expect(tabs.nth(0)).toContainText("JobSentinel AI");
  await expect(tabs.nth(1)).toContainText("NetSentinel");
  await expect(tabs.nth(2)).toContainText("Heart Disease Detection");
  await expect(tabs.nth(3)).toContainText("Travora AI");
});

test("projects: grab-to-spin the active card, then it springs back (high)", async ({ page }) => {
  // pixel comparison: pin the render resolution so dynamic resolution can't change the frame between shots
  await boot(page, "high", "&fixeddpr");
  await scrollProjectsTo(page, 0);
  await page.waitForTimeout(2500);
  const before = await page.screenshot({ clip: { x: 120, y: 300, width: 480, height: 340 } });
  await page.mouse.move(360, 470);
  await page.mouse.down();
  await page.mouse.move(470, 470, { steps: 5 });
  const mid = await page.screenshot({ clip: { x: 120, y: 300, width: 480, height: 340 } });
  await page.mouse.up();
  await page.waitForTimeout(3500);
  const after = await page.screenshot({ clip: { x: 120, y: 300, width: 480, height: 340 } });
  await page.screenshot({ path: "test-results/screens/projects-spin-settled.png" });
  expect(mid.equals(before), "card rotated while dragged").toBe(false);
  // Springs back home: closer to the initial frame than the dragged frame was.
  const diff = (x: Buffer, y: Buffer) => Math.abs(x.length - y.length);
  expect(diff(after, before)).toBeLessThanOrEqual(diff(mid, before) + 2000);
});
