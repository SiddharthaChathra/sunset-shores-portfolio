import { test, expect } from "@playwright/test";
import { boot, scrollToSection } from "./helpers";

/**
 * Production builds skip WebGL shader error checks (they stall the main thread), so a shader that fails
 * to compile would silently render nothing. This boots each live tier with the checks on, visits every
 * stop (shadow and post-processing programs included) and fails on any compile or link error.
 */
for (const tier of ["high", "medium"] as const) {
  test(`every shader compiles and links (${tier})`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && /shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text())) errors.push(m.text().slice(0, 400));
    });
    await boot(page, tier, "&shadercheck");
    for (const id of ["hero", "about", "projects", "experience", "certificates", "skills", "contact"]) {
      await scrollToSection(page, id);
      await page.waitForTimeout(600);
    }
    expect(errors).toEqual([]);
  });
}
