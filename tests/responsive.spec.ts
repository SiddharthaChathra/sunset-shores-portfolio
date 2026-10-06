import { test, expect, devices } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SECTIONS, scrollToSection } from "./helpers";

const MATRIX = [
  { name: "tablet 820x1180", viewport: { width: 820, height: 1180 }, isMobile: false, hasTouch: true },
  { name: "phone 390x844", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

for (const m of MATRIX) {
  test.describe(m.name, () => {
    test.use({ userAgent: devices["Pixel 7"].userAgent, viewport: m.viewport, isMobile: m.isMobile, hasTouch: m.hasTouch, deviceScaleFactor: 2 });

    test("every section renders its app, no horizontal scroll, HUD stays clear", async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 60_000 });
      const overflow = await page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth");
      expect(overflow, "horizontal overflow").toBeLessThanOrEqual(1);
      const apps: Record<string, string> = { about: "profile-app", experience: "messages-app", skills: "stats-app", contact: "contacts-app" };
      for (const id of SECTIONS) {
        await scrollToSection(page, id, id === "projects" ? 0.3 : 0);
        await page.waitForTimeout(900);
        await page.screenshot({ path: `test-results/screens/${m.viewport.width}x${m.viewport.height}-${id}.png` });
        if (apps[id]) await expect(page.getByTestId(apps[id])).toBeVisible();
      }
      // Phones: the phone UI is native (no device frame). Tablets keep the framed device.
      const frame = await page.getByTestId("contacts-app").evaluate((el) => getComputedStyle(el).paddingTop);
      if (m.viewport.width < 700) expect(frame).toBe("0px");
      else expect(parseFloat(frame)).toBeGreaterThan(0);
      // The assistant bubble never covers the HUD (monogram / minimap row).
      const orb = (await page.getByTestId("companion-orb").boundingBox())!;
      const map = (await page.getByRole("navigation", { name: "Map" }).boundingBox())!;
      expect(orb.y).toBeGreaterThanOrEqual(map.y + map.height - 2);
    });

    test("projects can be switched and the description follows", async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 60_000 });
      await scrollToSection(page, "projects", 0.1);
      const article = page.getByTestId("project-article");
      await expect(article).toHaveAttribute("data-project-id", "jobsentinel");
      if (m.viewport.width < 768) await page.getByRole("button", { name: "Show Travora AI" }).click();
      else await page.getByRole("tab", { name: /Travora/ }).click();
      await expect(page.locator("#projects")).toHaveAttribute("data-active-project", "3", { timeout: 10_000 });
      await expect(article).toHaveAttribute("data-project-id", "travora");
    });

    test("axe: no violations", async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 60_000 });
      const results = await new AxeBuilder({ page }).exclude("canvas").analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  });
}
