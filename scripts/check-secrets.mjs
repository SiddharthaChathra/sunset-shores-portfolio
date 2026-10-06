/** Fails if any server secret (or a Groq key pattern) appears in the client bundles. */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const dir = ".next/static";
if (!existsSync(dir)) {
  console.error("No .next/static: run `npm run build` first.");
  process.exit(1);
}
const needles = ["GROQ_API_KEY", "gsk_"];
if (process.env.GROQ_API_KEY) needles.push(process.env.GROQ_API_KEY);
const hits = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|css|json|html|txt|map)$/.test(f)) {
      const s = readFileSync(p, "utf8");
      for (const n of needles) if (s.includes(n)) hits.push(`${p}: contains ${n === process.env.GROQ_API_KEY ? "the API key value" : n}`);
    }
  }
};
walk(dir);
if (hits.length) {
  console.error("Secret leak:\n" + hits.join("\n"));
  process.exit(1);
}
console.log(`check-secrets: clean (${needles.length} patterns, ${dir})`);
