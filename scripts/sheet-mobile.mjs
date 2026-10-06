/** Dev helper: contact-sheet portrait screenshots side by side. Usage: node scripts/sheet-mobile.mjs out.png a.png ... */
import sharp from "sharp";
const [out, ...files] = process.argv.slice(2);
const W = 300, H = 650;
const tiles = await Promise.all(files.map((f) => sharp(f).resize(W, H, { fit: "contain", background: "#fff" }).png().toBuffer()));
await sharp({ create: { width: W * files.length, height: H, channels: 3, background: "#fff" } })
  .composite(tiles.map((t, k) => ({ input: t, left: k * W, top: 0 })))
  .png()
  .toFile(out);
