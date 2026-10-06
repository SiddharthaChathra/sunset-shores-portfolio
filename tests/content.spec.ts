import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { boot, SECTIONS, scrollToSection } from "./helpers";

test("certificates: lightbox via keyboard (Esc, arrows, focus trap) with real renderings", async ({ page }) => {
  await boot(page, "low");
  await scrollToSection(page, "certificates");
  const first = page.getByTestId("cert-button").first();
  await first.focus();
  await page.keyboard.press("Enter");
  const lb = page.getByTestId("lightbox");
  await expect(lb).toBeVisible();
  await expect(lb.getByRole("img")).toHaveJSProperty("complete", true);
  const t1 = await lb.locator("#lb-title").textContent();
  await page.keyboard.press("ArrowRight");
  await expect(lb.locator("#lb-title")).not.toHaveText(t1 ?? "");
  for (let i = 0; i < 10; i++) await page.keyboard.press("Tab");
  expect(await lb.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(lb).toHaveCount(0);
  await expect(first).toBeFocused();
});

test("certificates: filter pills", async ({ page }) => {
  await boot(page, "low");
  await scrollToSection(page, "certificates");
  await page.getByRole("button", { name: /^Cloud \d/ }).click();
  await expect(page.getByTestId("cert-button")).toHaveCount(2);
  await page.getByRole("button", { name: /^All \d/ }).click();
  await expect(page.getByTestId("cert-button")).toHaveCount(8);
});

test("résumé download and internship certificate", async ({ page, request }) => {
  const r = await request.get("/assets/resume.pdf");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("pdf");
  await boot(page, "low");
  const dl = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download résumé" }).click();
  expect((await dl).suggestedFilename()).toMatch(/Resume\.pdf$/);
  await scrollToSection(page, "experience");
  await page.getByRole("button", { name: /certificate attachment for AI Intern/ }).click();
  await expect(page.getByTestId("lightbox")).toContainText("NoviTech");
});

test("contact: email copies with toast", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await boot(page, "low");
  await scrollToSection(page, "contact");
  await page.getByRole("button", { name: /^Call/ }).click();
  await expect(page.getByText("Email copied — talk soon!")).toBeVisible();
  expect(await page.evaluate("navigator.clipboard.readText()")).toBe("chatrasiddharth@gmail.com");
});

test("low tier: polished stills, no live canvas, all content present", async ({ page }) => {
  await boot(page, "low");
  await expect(page.getByTestId("stage")).toHaveCount(0);
  await expect(page.getByTestId("still-backdrop")).toBeVisible();
  for (const id of SECTIONS) {
    await scrollToSection(page, id, id === "projects" ? 0.4 : 0);
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `test-results/screens/low-${id}.png` });
  }
  await expect(page.getByTestId("stats-app")).toBeVisible();
  await page.getByTestId("stat-networking").click();
  await expect(page.getByTestId("stats-app")).toContainText("TCP/IP & OSI model");
});

test("reduced motion → low tier", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-tier", "low");
  await ctx.close();
});

for (const tier of ["low", "high"] as const) {
  test(`axe: HTML layer has no violations (${tier})`, async ({ page }) => {
    await boot(page, tier);
    for (const id of SECTIONS) {
      await scrollToSection(page, id);
      await page.waitForTimeout(500);
    }
    await scrollToSection(page, "hero");
    await page.waitForTimeout(1000);
    const results = await new AxeBuilder({ page }).exclude("canvas").analyze();
    const v = results.violations.map(
      (x) => `${x.id}: ${x.nodes.length} → ${x.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`,
    );
    expect(v).toEqual([]);
  });
}
