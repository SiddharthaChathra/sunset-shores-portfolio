import { test, expect, devices, type Page, type BrowserContextOptions } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SECTIONS, scrollToSection } from "./helpers";

/**
 * Mobile & tablet suite (brief: "Mobile & Tablet Looping Prompt"). Real touch input through CDP
 * (Input.dispatchTouchEvent → pointer events with pointerType "touch").
 */
const iphone = devices["iPhone 15"];
const ipad = devices["iPad Pro 11"];
const pixel = devices["Pixel 7"];
// one engine (Chromium) for the whole matrix: drop each preset's default browser
const strip = (d: (typeof devices)[string]) => {
  const rest: Partial<typeof d> = { ...d };
  delete rest.defaultBrowserType;
  return rest;
};
const dev = (w: number, h: number, base: (typeof devices)[string] = iphone): BrowserContextOptions => ({
  ...strip(base),
  viewport: { width: w, height: h },
  screen: { width: w, height: h },
});
const MATRIX: Record<string, BrowserContextOptions> = {
  "iPhone SE": dev(375, 667),
  "iPhone 15": dev(393, 852),
  "iPhone 15 Pro Max": dev(430, 932),
  "Pixel 7": dev(412, 915, pixel),
  "Galaxy Fold": dev(344, 882, pixel),
  "iPad Mini": dev(768, 1024, ipad),
  "iPad Air": dev(820, 1180, ipad),
  "iPad Pro": dev(1024, 1366, ipad),
  "iPhone 15 landscape": dev(852, 393),
  "iPad Pro landscape": dev(1366, 1024, ipad),
};

async function ready(page: Page, query = "") {
  await page.goto(`/${query}`);
  await page.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 90_000 });
}

async function touch(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: string, points: { x: number; y: number; id?: number }[]) =>
    cdp.send("Input.dispatchTouchEvent", { type: type as "touchStart", touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i })) });
  return {
    async drag(from: { x: number; y: number }, to: { x: number; y: number }, steps = 10, holdMs = 0) {
      await send("touchStart", [from]);
      if (holdMs) await page.waitForTimeout(holdMs);
      for (let i = 1; i <= steps; i++) {
        await send("touchMove", [{ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }]);
        await page.waitForTimeout(16);
      }
      await send("touchEnd", []);
    },
    async pinch(c: { x: number; y: number }, from: number, to: number) {
      const pts = (d: number) => [
        { x: c.x - d / 2, y: c.y, id: 1 },
        { x: c.x + d / 2, y: c.y, id: 2 },
      ];
      await send("touchStart", pts(from));
      for (let i = 1; i <= 10; i++) {
        await send("touchMove", pts(from + ((to - from) * i) / 10));
        await page.waitForTimeout(16);
      }
      await send("touchEnd", []);
    },
    async tap(p: { x: number; y: number }) {
      await send("touchStart", [p]);
      await send("touchEnd", []);
    },
  };
}

// ---------- Layout on every device ----------
for (const [name, opts] of Object.entries(MATRIX)) {
  test.describe(name, () => {
    test.use(opts);

    test("no overflow, ≥44px targets, ≥16px body copy, nothing collides", async ({ page }) => {
      await ready(page);
      for (const id of SECTIONS) {
        await scrollToSection(page, id, id === "projects" ? 0.05 : 0);
        await page.waitForTimeout(700);
        await page.screenshot({ path: `test-results/mobile/${name.replace(/\s+/g, "-")}/${id}.png` });
        const r = (await page.evaluate(`(() => {
          const vis = (el) => { if (el.matches(".sr-only-focusable:not(:focus), .sr-only")) return false; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight && cs.visibility !== "hidden" && cs.pointerEvents !== "none"; };
          const small = [...document.querySelectorAll("a[href], button, [role=button], [role=tab], input, select, textarea")].filter(vis)
            .map((el) => { const b = el.getBoundingClientRect(); const z = el.currentCSSZoom ?? 1; return { w: b.width, h: b.height, z, label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30) }; })
            .filter((t) => t.w < 43.5 || t.h < 43.5);
          const tiny = [...document.querySelectorAll("p, li")].filter(vis)
            .filter((el) => !el.closest(".kicker, .meta, .font-mono, .hashtag, [aria-hidden=true]") && !/font-mono|kicker|meta|hashtag/.test(el.className) && el.textContent.trim())
            .map((el) => ({ size: parseFloat(getComputedStyle(el).fontSize) * (el.currentCSSZoom ?? 1), text: el.textContent.trim().slice(0, 30) }))
            .filter((t) => t.size < 15.95);
          const box = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? b : null; };
          const hit = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
          const orb = box('[data-testid="companion-orb"]'), dock = box('[data-testid="dock"]'), map = box('nav[aria-label="Map"]');
          return { overflow: document.documentElement.scrollWidth - innerWidth, small, tiny, orbDock: !!hit(orb, dock), orbMap: !!hit(orb, map), dockMap: !!hit(dock, map) };
        })()`)) as { overflow: number; small: unknown[]; tiny: unknown[]; orbDock: boolean; orbMap: boolean; dockMap: boolean };
        expect(r.overflow, `${id}: horizontal overflow`).toBeLessThanOrEqual(1);
        expect(r.small, `${id}: tap targets under 44px`).toEqual([]);
        expect(r.tiny, `${id}: body copy under 16px`).toEqual([]);
        expect(r.orbDock || r.orbMap || r.dockMap, `${id}: HUD / dock / assistant collide`).toBe(false);
      }
    });
  });
}

// ---------- Forced tiers on a phone and a tablet ----------
for (const [name, opts] of [
  ["iPhone 15", MATRIX["iPhone 15"]],
  ["iPad Air", MATRIX["iPad Air"]],
] as const) {
  test.describe(`${name} tiers`, () => {
    test.use(opts);
    for (const tier of ["high", "medium", "low"] as const) {
      test(`${tier}: renders every section`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await ready(page, `?tier=${tier}`);
        for (const id of SECTIONS) {
          await scrollToSection(page, id, id === "projects" ? 0.05 : 0);
          await page.waitForTimeout(tier === "low" ? 500 : 1100);
          await page.screenshot({ path: `test-results/mobile/tiers/${name.replace(/\s+/g, "-")}-${tier}-${id}.png` });
        }
        if (tier !== "low") await expect(page.locator(".stage-layer canvas")).toBeVisible();
        else await expect(page.getByTestId("still-backdrop")).toBeVisible();
        expect(errors).toEqual([]);
      });
    }
  });
}

// ---------- Interactions (phone) ----------
test.describe("iPhone 15 interactions", () => {
  test.use(MATRIX["iPhone 15"]);

  test("projects: scroll changes billboard + app 4× both ways; swiping the scene window follows", async ({ page }) => {
    await ready(page, "?tier=medium");
    const section = page.locator("#projects");
    const article = page.getByTestId("project-article");
    const ids = ["jobsentinel", "netsentinel", "heart-disease-detection", "travora"];
    for (const order of [
      [0, 1, 2, 3],
      [3, 2, 1, 0],
    ]) {
      for (const i of order) {
        await scrollToSection(page, "projects", (i + 0.5) * 0.75); // pinned span = 3 viewports for 4 projects
        await expect(section).toHaveAttribute("data-active-project", String(i));
        await expect(article).toHaveAttribute("data-project-id", ids[i]);
      }
    }
    // swipe left on the scene window → next project, and the page scrolls to match
    await scrollToSection(page, "projects", 0.5);
    await expect(section).toHaveAttribute("data-active-project", "0");
    const y0 = (await page.evaluate("scrollY")) as number;
    const t = await touch(page);
    await t.drag({ x: 330, y: 170 }, { x: 80, y: 175 }, 8);
    await expect(section).toHaveAttribute("data-active-project", "1", { timeout: 8000 });
    expect((await page.evaluate("scrollY")) as number).toBeGreaterThan(y0 + 200);
    // Read more → full case study in a sheet; Back closes it
    await page.getByTestId("project-read-more").click();
    await expect(page.getByTestId("project-sheet")).toBeVisible();
    await expect(page.getByTestId("project-sheet")).toContainText("The problem");
    await page.goBack();
    await expect(page.getByTestId("project-sheet")).toBeHidden();
    expect(page.url()).toContain("localhost");
  });

  test("dock and map sheet drive to every section", async ({ page }) => {
    await ready(page);
    for (const [dockId, section] of [
      ["dock-projects", "projects"],
      ["dock-experience", "experience"],
      ["dock-certificates", "certificates"],
      ["dock-contact", "contact"],
      ["dock-home", "hero"],
    ] as const) {
      // the dock hides while scrolling down and returns on scroll-up
      await page.evaluate("window.__lenis ? window.__lenis.scrollTo(window.scrollY - 40, { immediate: true, force: true }) : window.scrollBy(0, -40)");
      await page.waitForTimeout(400);
      await page.getByTestId(dockId).click();
      await expect.poll(async () => page.evaluate(`Math.abs(document.getElementById("${section}").getBoundingClientRect().top)`), { timeout: 8000 }).toBeLessThan(60);
    }
    await page.getByTestId("dock-more").click();
    await expect(page.getByTestId("more-sheet")).toBeVisible();
    await page.getByTestId("more-sheet").getByRole("button", { name: /Skills/ }).click();
    await expect.poll(async () => page.evaluate(`Math.abs(document.getElementById("skills").getBoundingClientRect().top)`), { timeout: 8000 }).toBeLessThan(60);
    for (let i = 0; i < 7; i++) {
      await page.getByTestId("minimap-open").click();
      await expect(page.getByTestId("map-sheet")).toBeVisible();
      await page.getByTestId(`map-stop-${i}`).click();
      await expect(page.getByTestId("map-sheet")).toBeHidden();
      await expect.poll(async () => page.evaluate(`Math.abs(document.getElementById("${SECTIONS[i]}").getBoundingClientRect().top)`), { timeout: 8000 }).toBeLessThan(60);
    }
  });

  test("assistant: touch drag snaps to an edge, persists across reload and rotation, never opens on drag", async ({ page }) => {
    await ready(page);
    const orb = page.getByTestId("companion-orb");
    const b = (await orb.boundingBox())!;
    const t = await touch(page);
    await t.drag({ x: b.x + b.width / 2, y: b.y + b.height / 2 }, { x: 60, y: 520 }, 12);
    await page.waitForTimeout(900);
    await expect(page.getByTestId("echo-panel")).toHaveCount(0);
    const after = (await orb.boundingBox())!;
    expect(after.x).toBeLessThan(30); // snapped to the left edge
    await page.reload();
    await page.waitForSelector('[data-testid="loading-screen"]', { state: "detached", timeout: 90_000 });
    expect((await orb.boundingBox())!.x).toBeLessThan(30);
    // rotate to landscape and back: re-clamped inside the viewport
    await page.setViewportSize({ width: 852, height: 393 });
    await page.waitForTimeout(600);
    let r = (await orb.boundingBox())!;
    expect(r.y + r.height).toBeLessThanOrEqual(393);
    await page.setViewportSize({ width: 393, height: 852 });
    await page.waitForTimeout(600);
    r = (await orb.boundingBox())!;
    expect(r.x).toBeLessThan(30);
    expect(r.y + r.height).toBeLessThanOrEqual(852);
  });

  test("assistant sheet: keyboard-aware, closes with Back", async ({ page }) => {
    await ready(page);
    await page.getByTestId("companion-orb").click();
    const panel = page.getByTestId("echo-panel");
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("echo-state")).toHaveAttribute("data-state", "idle");
    // the on-screen keyboard shrinks the visual viewport: the input must stay visible above it
    await page.locator("#echo-input").focus();
    await page.setViewportSize({ width: 393, height: 480 });
    await page.waitForTimeout(500);
    const box = (await page.locator("#echo-input").boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(480);
    expect(box.y).toBeGreaterThan(0);
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goBack();
    await expect(panel).toHaveCount(0);
    expect(page.url()).toContain("localhost");
  });

  test("Photos viewer: swipe, pinch-zoom, double-tap, swipe down to close", async ({ page }) => {
    await ready(page);
    await scrollToSection(page, "certificates");
    await page.waitForTimeout(600);
    await page.locator('[data-testid="cert-button"][data-centred]').click();
    const lb = page.getByTestId("lightbox");
    await expect(lb).toBeVisible();
    const start = Number((await lb.textContent())!.match(/(\d+) of 8/)![1]);
    const stage = page.getByTestId("photo-stage");
    const s = (await stage.boundingBox())!;
    const c = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
    const t = await touch(page);
    await t.drag({ x: c.x + 120, y: c.y }, { x: c.x - 120, y: c.y }, 6);
    await expect(lb).toContainText(`${start + 1} of 8`);
    await page.waitForTimeout(500); // let the app-style slide transition finish
    await t.pinch(c, 80, 240);
    await expect.poll(async () => Number(await page.getByTestId("photo-stage").getAttribute("data-scale"))).toBeGreaterThan(1.5);
    await t.tap(c);
    await page.waitForTimeout(80);
    await t.tap(c); // double tap zooms back out
    await expect.poll(async () => Number(await page.getByTestId("photo-stage").getAttribute("data-scale"))).toBeLessThan(1.05);
    await t.drag(c, { x: c.x, y: c.y + 260 }, 8);
    await expect(lb).toBeHidden();
  });

  test("axe: no violations on the phone layout", async ({ page }) => {
    await ready(page);
    await page.waitForTimeout(1200);
    const results = await new AxeBuilder({ page }).exclude("canvas").analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
});

test.describe("iPad Air interactions", () => {
  test.use(MATRIX["iPad Air"]);
  test("axe + certificates grid + skills accordion", async ({ page }) => {
    await ready(page);
    await scrollToSection(page, "certificates");
    await expect(page.getByTestId("cert-grid")).toBeVisible();
    await scrollToSection(page, "skills");
    const cloud = page.getByTestId("stat-cloud-devops");
    await cloud.click();
    await expect(cloud).toHaveAttribute("aria-expanded", "true");
    await page.waitForTimeout(1200); // let the entrance animations settle before measuring contrast
    const results = await new AxeBuilder({ page }).exclude("canvas").analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
});

test.describe("iPhone 15 landscape (cinematic, short viewport)", () => {
  test.use(MATRIX["iPhone 15 landscape"]);
  test("app sheet, section switcher and the project carousel", async ({ page }) => {
    await ready(page);
    const sw = page.locator("#land-switch");
    await expect(sw).toBeVisible();
    await sw.selectOption("4");
    await expect.poll(async () => page.evaluate(`Math.abs(document.getElementById("certificates").getBoundingClientRect().top)`), { timeout: 8000 }).toBeLessThan(60);
    await scrollToSection(page, "projects");
    await expect(page.getByTestId("billboard-carousel")).toBeVisible();
    await page.getByRole("button", { name: "Show Travora AI" }).click();
    await expect(page.locator("#projects")).toHaveAttribute("data-active-project", "3");
    await expect(page.getByTestId("project-article")).toHaveAttribute("data-project-id", "travora");
  });
});
