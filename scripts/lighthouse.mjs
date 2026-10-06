/** Lighthouse against the running prod server. Usage: node scripts/lighthouse.mjs [url] [--mobile] */
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import * as chromeLauncher from "chrome-launcher";
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const mobile = process.argv.includes("--mobile");
const url = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:3100/";
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless=new", "--no-sandbox"] });
const result = await lighthouse(url, { port: chrome.port, output: ["html", "json"], logLevel: "error" }, mobile ? undefined : desktopConfig);
await chrome.kill();
mkdirSync("reports", { recursive: true });
const tag = mobile ? "-mobile" : "";
writeFileSync(`reports/lighthouse${tag}.html`, result.report[0]);
writeFileSync(`reports/lighthouse${tag}.json`, result.report[1]);
const lhr = result.lhr;
const cats = Object.fromEntries(Object.values(lhr.categories).map((c) => [c.id, Math.round(c.score * 100)]));
const a = lhr.audits;
console.log(JSON.stringify({ url, preset: mobile ? "mobile" : "desktop", ...cats, LCP: a["largest-contentful-paint"].displayValue, CLS: a["cumulative-layout-shift"].displayValue, TBT: a["total-blocking-time"].displayValue, FCP: a["first-contentful-paint"].displayValue }, null, 1));
for (const [id, au] of Object.entries(a)) if (au.score !== null && au.score < 0.9 && au.scoreDisplayMode !== "informative" && au.scoreDisplayMode !== "notApplicable") console.log(" -", id, au.score, au.displayValue ?? "");
