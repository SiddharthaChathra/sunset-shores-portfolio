/**
 * Content pipeline (runs on predev / prebuild).
 *
 * 1. Copies /assets → /public/assets
 * 2. Renders certificate thumbnails (PDF first page) + 1024px badge textures
 * 3. Writes content/generated/certificates.json (titles from filenames, overrides from
 *    content/certificate-overrides.json; override entries without a file become locked badges)
 * 4. Extracts résumé text → content/generated/resume.txt
 * 5. Builds content/generated/knowledge.json — the companion's only knowledge source
 * 6. Vendors static runtime files (scene fonts, detect-gpu benchmarks)
 *
 * The site must look complete with an empty /assets folder.
 */
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import * as mupdf from "mupdf";
import type { CertificateEntry, CertCategory } from "../content/types";
import { profile, SHOW_PHONE } from "../content/profile";
import { projects } from "../content/projects";
import { experience } from "../content/experience";
import { skillCategories } from "../content/skills";

const ROOT = process.cwd();
const ASSETS = path.join(ROOT, "assets");
const PUBLIC_ASSETS = path.join(ROOT, "public", "assets");
const GEN_PUBLIC = path.join(PUBLIC_ASSETS, "generated");
const GEN_CONTENT = path.join(ROOT, "content", "generated");

type Override = Partial<Pick<CertificateEntry, "title" | "issuer" | "date" | "category" | "type">>;

const PDF = /\.pdf$/i;
const IMG = /\.(png|jpe?g|webp)$/i;

async function copyDir(src: string, dst: string) {
  if (!existsSync(src)) return;
  await fs.mkdir(dst, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

function titleFromStem(stem: string): string {
  const small = new Set(["and", "of", "in", "on", "for", "the", "to", "a"]);
  const upper = new Set(["ai", "aws", "ml", "ui", "ux", "iot", "sql"]);
  return stem
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (upper.has(lw)) return lw.toUpperCase();
      if (i > 0 && small.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(" ");
}

function guessCategory(text: string): CertCategory {
  const t = text.toLowerCase();
  if (/(aws|azure|cloud|devops|docker|kubernetes)/.test(t)) return "Cloud";
  if (/(network|cisco|ccna|tcp|routing)/.test(t)) return "Networking";
  if (/(data|analyt|sql|power ?bi|excel)/.test(t)) return "Data";
  return "AI";
}

function dateLabel(iso: string | null): string {
  if (!iso) return "Date to be confirmed";
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Render the first page of a PDF (or load an image) to a PNG buffer. */
async function renderFirstPage(file: string): Promise<Buffer> {
  const buf = await fs.readFile(file);
  if (IMG.test(file)) return trimWhite(await sharp(buf).png().toBuffer());
  const doc = mupdf.Document.openDocument(buf, "application/pdf");
  const page = doc.loadPage(0);
  const [x0, y0, x1, y1] = page.getBounds();
  const scale = 1600 / Math.max(x1 - x0, y1 - y0);
  const pix = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  return trimWhite(Buffer.from(pix.asPNG()));
}

/** Remove white page margins around the actual certificate artwork. */
async function trimWhite(png: Buffer): Promise<Buffer> {
  try {
    const trimmed = await sharp(png).trim({ background: "#ffffff", threshold: 18 }).png().toBuffer();
    const m = await sharp(trimmed).metadata();
    return (m.width ?? 0) > 200 && (m.height ?? 0) > 150 ? trimmed : png;
  } catch {
    return png;
  }
}

const BADGE = 1024;

/** A 1024² plaque texture: the certificate on a white matte inside a sunset-gradient frame. */
async function makeBadge(png: Buffer): Promise<Buffer> {
  const inner = 820;
  const fitted = await sharp(png)
    .resize(inner, inner, { fit: "inside", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  const meta = await sharp(fitted).metadata();
  const w = meta.width ?? inner;
  const h = meta.height ?? inner;
  const left = Math.round((BADGE - w) / 2);
  const top = Math.round((BADGE - h) / 2);
  const pad = 26;
  const bg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE}" height="${BADGE}">
  <defs>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF4F8B"/>
      <stop offset="50%" stop-color="#FF7A59"/>
      <stop offset="100%" stop-color="#FF9F43"/>
    </linearGradient>
    <radialGradient id="wall" cx="50%" cy="40%" r="75%">
      <stop offset="0%" stop-color="#FFF8F2"/>
      <stop offset="100%" stop-color="#FFE0CC"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#wall)"/>
  <rect x="${left - pad - 18}" y="${top - pad - 18}" width="${w + (pad + 18) * 2}" height="${h + (pad + 18) * 2}" rx="18" fill="url(#frame)"/>
  <rect x="${left - pad}" y="${top - pad}" width="${w + pad * 2}" height="${h + pad * 2}" rx="8" fill="#FFFFFF"/>
</svg>`);
  return sharp(bg)
    .composite([{ input: fitted, left, top }])
    .webp({ quality: 86 })
    .toBuffer();
}

async function processCollection(
  dir: string,
  type: "certificate" | "internship",
  overrides: Record<string, Override>,
  seen: Set<string>,
): Promise<CertificateEntry[]> {
  if (!existsSync(dir)) return [];
  const out: CertificateEntry[] = [];
  const files = (await fs.readdir(dir)).filter((f) => PDF.test(f) || IMG.test(f)).sort();
  const sub = path.basename(dir);
  for (const f of files) {
    const stem = f.replace(/\.[^.]+$/, "");
    const id = stem.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const o = overrides[stem] ?? overrides[id] ?? {};
    seen.add(stem);
    seen.add(id);
    let thumb: string | null = null;
    let texture: string | null = null;
    let preview: string | null = null;
    let aspect = 1.414;
    try {
      const png = await renderFirstPage(path.join(dir, f));
      const meta = await sharp(png).metadata();
      aspect = (meta.width ?? 1414) / (meta.height ?? 1000);
      await sharp(png).resize({ width: 720 }).webp({ quality: 82 }).toFile(path.join(GEN_PUBLIC, `${id}-thumb.webp`));
      const badge = await makeBadge(png);
      await fs.writeFile(path.join(GEN_PUBLIC, `${id}-badge.webp`), badge);
      // 512px plaque texture for the 3D garage (small on screen; 4× cheaper to upload than 1024²)
      await sharp(badge).resize(512).webp({ quality: 84 }).toFile(path.join(GEN_PUBLIC, `${id}-plaque.webp`));
      await sharp(png).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 86 }).toFile(path.join(GEN_PUBLIC, `${id}-preview.webp`));
      thumb = `/assets/generated/${id}-thumb.webp`;
      preview = `/assets/generated/${id}-preview.webp`;
      texture = `/assets/generated/${id}-badge.webp`;
    } catch (err) {
      console.warn(`[content] could not render ${f}:`, (err as Error).message);
    }
    const title = o.title ?? titleFromStem(stem);
    out.push({
      id,
      title,
      issuer: o.issuer ?? "Issuer to be confirmed",
      date: o.date ?? null,
      dateLabel: dateLabel(o.date ?? null),
      file: `/assets/${sub}/${encodeURIComponent(f)}`,
      thumb,
      texture,
      preview,
      kind: PDF.test(f) ? "pdf" : "image",
      type: o.type ?? type,
      category: o.category ?? guessCategory(title),
      locked: false,
      aspect,
    });
  }
  return out;
}

async function extractResume(): Promise<string> {
  const file = path.join(ASSETS, "resume.pdf");
  if (!existsSync(file)) return "";
  const doc = mupdf.Document.openDocument(await fs.readFile(file), "application/pdf");
  let text = "";
  for (let i = 0; i < doc.countPages(); i++) {
    text += doc.loadPage(i).toStructuredText("preserve-whitespace").asText() + "\n";
  }
  // Keep the phone number out of the companion's knowledge unless the owner opts in.
  if (!SHOW_PHONE) text = text.replace(/\+?\d[\d\s-]{8,}\d/g, "[phone withheld]");
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function vendorStatic() {
  const fontsDir = path.join(ROOT, "public", "fonts");
  await fs.mkdir(fontsDir, { recursive: true });
  const fonts: [string, string][] = [
    ["@fontsource/anton/files/anton-latin-400-normal.woff", "anton-400.woff"],
    ["@fontsource/manrope/files/manrope-latin-800-normal.woff", "manrope-800.woff"],
    ["@fontsource/space-mono/files/space-mono-latin-700-normal.woff", "space-mono-700.woff"],
  ];
  for (const [src, dst] of fonts) {
    const from = path.join(ROOT, "node_modules", src);
    if (existsSync(from)) await fs.copyFile(from, path.join(fontsDir, dst));
  }
  const bench = path.join(ROOT, "node_modules", "detect-gpu", "dist", "benchmarks");
  await copyDir(bench, path.join(ROOT, "public", "benchmarks"));
}

async function main() {
  const t0 = Date.now();
  await fs.mkdir(GEN_PUBLIC, { recursive: true });
  await fs.mkdir(GEN_CONTENT, { recursive: true });
  await copyDir(ASSETS, PUBLIC_ASSETS);

  const overridesRaw = JSON.parse(
    await fs.readFile(path.join(ROOT, "content", "certificate-overrides.json"), "utf8"),
  ) as Record<string, Override | string>;
  const overrides = Object.fromEntries(
    Object.entries(overridesRaw).filter(([k, v]) => !k.startsWith("$") && typeof v === "object"),
  ) as Record<string, Override>;

  const seen = new Set<string>();
  const certs = [
    ...(await processCollection(path.join(ASSETS, "certificates"), "certificate", overrides, seen)),
    ...(await processCollection(path.join(ASSETS, "internships"), "internship", overrides, seen)),
  ];

  // Seeds from overrides that have no file yet → elegant locked badges.
  for (const [stem, o] of Object.entries(overrides)) {
    if (seen.has(stem)) continue;
    const title = o.title ?? titleFromStem(stem);
    certs.push({
      id: stem,
      title,
      issuer: o.issuer ?? "Issuer to be confirmed",
      date: o.date ?? null,
      dateLabel: dateLabel(o.date ?? null),
      file: null,
      thumb: null,
      texture: null,
      preview: null,
      kind: null,
      type: o.type ?? "certificate",
      category: o.category ?? guessCategory(title),
      locked: true,
      aspect: 1.414,
    });
  }

  certs.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  await fs.writeFile(path.join(GEN_CONTENT, "certificates.json"), JSON.stringify(certs, null, 2));

  const resumeText = await extractResume();
  await fs.writeFile(path.join(GEN_CONTENT, "resume.txt"), resumeText);

  const knowledge = {
    $about:
      "Everything the companion is allowed to know about Siddhartha. Generated by scripts/build-content.ts. If something is not here, it is unknown.",
    profile: {
      name: profile.name,
      tagline: profile.tagline,
      focusAreas: profile.subline,
      bio: profile.bio,
      education: profile.education,
      extracurricular: profile.sideQuest.text,
      contact: {
        email: profile.links.email,
        linkedin: profile.links.linkedin,
        github: profile.links.github,
        phone: SHOW_PHONE ? profile.phone : "not published on this site",
        resumeDownload: "/assets/resume.pdf",
      },
    },
    experience: experience.map((e) => ({
      role: e.role,
      company: e.company,
      period: e.period,
      certifiedDates: e.certifiedDates,
      work: e.objectives,
      tools: e.tools,
    })),
    projects: projects.map((p) => ({
      title: p.title,
      oneLiner: p.oneLiner,
      description: p.description,
      problem: p.problem,
      whatMakesItDifferent: p.unique,
      highlights: p.highlights,
      stack: p.stack,
      date: p.date ?? "not stated",
      repo: p.links.repo ?? null,
      live: p.links.live ?? null,
    })),
    skills: skillCategories.map((c) => ({
      category: c.name,
      evidence: c.evidence,
      skills: c.skills.map((s) => `${s.name} (${s.level})`),
    })),
    certificates: certs
      .filter((c) => c.type === "certificate")
      .map((c) => ({ title: c.title, issuer: c.issuer, date: c.dateLabel, category: c.category })),
    internshipCertificates: certs
      .filter((c) => c.type === "internship")
      .map((c) => ({ title: c.title, issuer: c.issuer, date: c.dateLabel })),
    resumeText,
  };
  await fs.writeFile(path.join(GEN_CONTENT, "knowledge.json"), JSON.stringify(knowledge, null, 2));

  // Optional portrait → optimised webp; the About section falls back to the monogram without it.
  const photoSrc = ["profile.jpg", "profile.jpeg", "profile.png", "profile.webp"].map((f) => path.join(ASSETS, f)).find((f) => existsSync(f));
  if (photoSrc) {
    const { width = 0, height = 0 } = await sharp(photoSrc).rotate().metadata();
    const f = profile.photoFraming;
    // round avatar: square crop centred on the face
    const side = Math.round(Math.min(width, height, width * f.faceSize));
    const left = Math.round(Math.min(width - side, Math.max(0, width * f.face[0] - side / 2)));
    const top = Math.round(Math.min(height - side, Math.max(0, height * f.face[1] - side / 2)));
    await sharp(photoSrc).rotate().extract({ left, top, width: side, height: side }).resize(480, 480).webp({ quality: 85 }).toFile(path.join(GEN_PUBLIC, "profile.webp"));
    // 16:9 cover banner (sunset, horizon and the portrait) for the Profile app
    const coverH = Math.round(Math.min(height, (width * 9) / 16));
    const coverTop = Math.round(Math.min(height - coverH, height * f.coverTop));
    await sharp(photoSrc).rotate().extract({ left: 0, top: coverTop, width, height: coverH }).resize(960).webp({ quality: 80 }).toFile(path.join(GEN_PUBLIC, "profile-cover.webp"));
  }
  await fs.writeFile(
    path.join(GEN_CONTENT, "meta.json"),
    JSON.stringify(
      {
        photo: photoSrc ? "/assets/generated/profile.webp" : null,
        cover: photoSrc ? "/assets/generated/profile-cover.webp" : null,
        resume: existsSync(path.join(ASSETS, "resume.pdf")),
      },
      null,
      2,
    ),
  );

  await vendorStatic();

  console.log(
    `[content] ${certs.length} certificate entries (${certs.filter((c) => c.locked).length} locked), résumé ${
      resumeText ? "extracted" : "missing"
    }, in ${Date.now() - t0}ms`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
