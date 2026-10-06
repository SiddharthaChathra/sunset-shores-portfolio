/** Bundle + asset budgets: initial route JS (gzipped) ≤ 350 KB, 3D assets ≤ 8 MB. Needs a running server. */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const html = await (await fetch(base + "/")).text();
const srcs = [...new Set([...html.matchAll(/\/_next\/static\/[^"'\s)\\]+?\.js/g)].map((m) => m[0]))];
let initial = 0;
for (const s of srcs) {
  const f = path.join(".next", s.replace("/_next", ""));
  if (existsSync(f)) initial += zlib.gzipSync(readFileSync(f)).length;
}
const chunks = readdirSync(".next/static/chunks").filter((f) => f.endsWith(".js"));
const sizes = chunks
  .map((f) => [zlib.gzipSync(readFileSync(path.join(".next/static/chunks", f))).length, f, srcs.some((s) => s.endsWith(f))])
  .sort((a, b) => b[0] - a[0]);

const dirSize = (d) =>
  existsSync(d) ? readdirSync(d).reduce((t, f) => t + (statSync(path.join(d, f)).isDirectory() ? dirSize(path.join(d, f)) : statSync(path.join(d, f)).size), 0) : 0;
const badges = readdirSync("public/assets/generated").filter((f) => f.endsWith("-badge.webp")).reduce((t, f) => t + statSync(path.join("public/assets/generated", f)).size, 0);
const assets3d = badges + dirSize("public/fonts") + dirSize("public/stills");

const kb = (n) => (n / 1024).toFixed(1) + " KB";
console.log(`initial route JS (gzip): ${kb(initial)} across ${srcs.length} files  [budget 350 KB] ${initial <= 350 * 1024 ? "PASS" : "FAIL"}`);
console.log("largest chunks (gzip):");
for (const [g, f, init] of sizes.slice(0, 6)) console.log(`  ${kb(g).padStart(9)}  ${f}  ${init ? "(initial)" : "(lazy)"}`);
console.log(`3D/scene assets (badge textures + scene fonts + stills): ${kb(assets3d)}  [budget 8 MB] ${assets3d <= 8 * 1024 * 1024 ? "PASS" : "FAIL"}`);
