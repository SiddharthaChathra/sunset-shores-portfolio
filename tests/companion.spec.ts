import { test, expect } from "@playwright/test";
import { boot } from "./helpers";

test("orb drags (mouse), snaps to an edge, persists, and never opens on drag", async ({ page }) => {
  await boot(page, "low");
  const orb = page.getByTestId("companion-orb");
  const before = (await orb.boundingBox())!;
  await page.mouse.move(before.x + 36, before.y + 36);
  await page.mouse.down();
  await page.mouse.move(700, 500, { steps: 12 });
  await page.mouse.move(420, 840, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("echo-panel")).toHaveCount(0);
  const after = (await orb.boundingBox())!;
  expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(100);
  const vw = 1440;
  const vh = 900;
  const onEdge = after.x <= 24 || after.x + after.width >= vw - 24 || after.y + after.height >= vh - 32;
  expect(onEdge, "snapped to an edge").toBe(true);
  expect(after.y, "clear of the HUD bar").toBeGreaterThan(72);
  await page.reload();
  await page.waitForSelector('[data-testid="companion-orb"]');
  await page.waitForTimeout(600);
  const reloaded = (await page.getByTestId("companion-orb").boundingBox())!;
  expect(Math.abs(reloaded.x - after.x)).toBeLessThan(4);
  expect(Math.abs(reloaded.y - after.y)).toBeLessThan(4);
});

test("orb drags with touch and does not open", async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await boot(page, "low");
  const orb = page.getByTestId("companion-orb");
  const b = (await orb.boundingBox())!;
  const cdp = await ctx.newCDPSession(page);
  const pt = (x: number, y: number) => [{ x, y, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(b.x + 36, b.y + 36) });
  for (let i = 1; i <= 12; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt(b.x + 36 - i * 40, b.y + 36 - i * 30) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(1500);
  const a = (await orb.boundingBox())!;
  expect(Math.abs(a.y - b.y) + Math.abs(a.x - b.x)).toBeGreaterThan(100);
  await expect(page.getByTestId("echo-panel")).toHaveCount(0);
  await ctx.close();
});

test("keyboard: Enter opens, Esc closes and returns focus, Ctrl+K opens", async ({ page }) => {
  await boot(page, "low");
  const orb = page.getByTestId("companion-orb");
  await orb.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("echo-panel")).toBeVisible();
  await expect(page.locator("#echo-input")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("echo-panel")).toHaveCount(0);
  await expect(orb).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(page.getByTestId("echo-panel")).toBeVisible();
});

test("panel streams a reply with distinct thinking → speaking → idle states (mocked API)", async ({ page }) => {
  await page.route("**/api/assistant", async (route) => {
    await new Promise((r) => setTimeout(r, 1200)); // "thinking"
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "NetSentinel is a network observability platform built with Python, FastAPI and Next.js 16.",
    });
  });
  await boot(page, "low");
  await page.keyboard.press("Control+k");
  const state = page.getByTestId("echo-state");
  await expect(state).toHaveAttribute("data-state", "idle");
  await page.getByRole("button", { name: /What is NetSentinel\?/ }).click();
  await expect(state).toHaveAttribute("data-state", "thinking");
  await expect(page.getByTestId("echo-reply").last()).toContainText("NetSentinel is a network", { timeout: 15_000 });
  await expect(state).toHaveAttribute("data-state", "idle");
  await page.screenshot({ path: "test-results/screens/echo-panel.png" });
});

test("in-character error when the API fails", async ({ page }) => {
  await page.route("**/api/assistant", (route) => route.fulfill({ status: 503, body: "Assistant is not configured" }));
  await boot(page, "low");
  await page.keyboard.press("Control+k");
  await page.locator("#echo-input").fill("Hi");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("echo-reply").last()).toContainText("Signal lost", { timeout: 10_000 });
});

const live = !!process.env.GROQ_API_KEY;
const QA: [string, RegExp][] = [
  ["What did he do at NoviTech?", /intern/i],
  ["What tech does NetSentinel use?", /^(?![\s\S]*Tailwind)[\s\S]*(FastAPI|Python)/i],
  ["What's his CGPA?", /8\.26/],
  ["List his certificates", /AWS|Azure|Cisco/i],
  ["Explain Travora", /travel/i],
  ["What's his favourite food?", /(don['’]t|do not|not sure|no information|isn['’]t|not in|doesn['’]t|not available|not mentioned)/i],
];
for (const [q, re] of QA) {
  test(`assistant answers (live Groq): ${q}`, async ({ request }) => {
    test.skip(!live, "GROQ_API_KEY not set");
    const res = await request.post("/api/assistant", { data: { messages: [{ role: "user", content: q }] } });
    expect(res.status()).toBe(200);
    const text = await res.text();
    console.log(`Q: ${q}\nA: ${text}\n`);
    expect(text).toMatch(re);
  });
}

test("assistant API validates input", async ({ request }) => {
  expect((await request.post("/api/assistant", { data: { messages: [] } })).status()).toBe(400);
  expect((await request.post("/api/assistant", { data: { nope: 1 } })).status()).toBe(400);
});
