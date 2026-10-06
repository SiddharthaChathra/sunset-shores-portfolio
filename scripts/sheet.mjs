/** Dev helper: contact-sheet screenshots. Usage: node scripts/sheet.mjs out.png a.png b.png ... */
import sharp from "sharp";
const [out, ...files] = process.argv.slice(2);
const W = 720, H = 450, cols = 2;
const tiles = await Promise.all(files.map((f) => sharp(f).resize(W, H, { fit: "cover", position: "top" }).png().toBuffer()));
await sharp({ create: { width: W * cols, height: H * Math.ceil(files.length / cols), channels: 3, background: "#fff" } })
  .composite(tiles.map((t, k) => ({ input: t, left: (k % cols) * W, top: Math.floor(k / cols) * H })))
  .png()
  .toFile(out);
