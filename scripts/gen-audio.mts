/**
 * Synthesises the Sunset Shores sound effects as 16-bit mono WAV files in public/audio
 * (the radio music is scripts/gen-music.mts).
 * Everything is generated here (original, no third-party audio): see CREDITS.md.
 * Run: npx tsx scripts/gen-audio.mts
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const SR = 22050;
const OUT = path.join(process.cwd(), "public", "audio");

function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const saw = (ph: number) => 2 * (ph - Math.floor(ph + 0.5));

function noiseBurst(seconds: number, decay: number, lpA: number, gain: number) {
  const n = Math.floor(SR * seconds);
  const out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp += (rand() - lp) * lpA;
    out[i] = lp * Math.exp((-i / SR) * decay) * gain;
  }
  return out;
}

function tone(seconds: number, partials: [number, number][], attack = 0.005, decay = 4) {
  const n = Math.floor(SR * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.exp(-t * decay);
    let v = 0;
    for (const [f, amp] of partials) v += Math.sin(2 * Math.PI * f * t) * amp;
    out[i] = v * env * 0.5;
  }
  return out;
}

/** Station-switch crackle: filtered static with a tuning sweep. */
function crackle() {
  const n = Math.floor(SR * 0.45);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = t / 0.45;
    ph += (2 * Math.PI * (2400 - 2000 * k)) / SR;
    const pops = Math.random() < 0.004 ? rand() * 0.8 : 0;
    out[i] = (rand() * 0.35 + Math.sin(ph) * 0.12 + pops) * Math.sin(Math.PI * k);
  }
  return out;
}

/** Car whoosh: band-limited noise with a doppler-ish pitch fall. */
function whoosh() {
  const n = Math.floor(SR * 0.7);
  const out = new Float32Array(n);
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = t / 0.7;
    const a = 0.2 - 0.17 * k;
    lp += (rand() - lp) * a;
    lp2 += (lp - lp2) * a;
    out[i] = (lp - lp2) * Math.sin(Math.PI * k) ** 1.5 * 2.6;
  }
  return out;
}

/** Camera shutter: two clicks with a short noise body. */
function shutter() {
  const a = noiseBurst(0.05, 120, 0.6, 0.9);
  const b = noiseBurst(0.08, 70, 0.4, 0.7);
  const out = new Float32Array(Math.floor(SR * 0.16));
  out.set(a, 0);
  out.set(b.subarray(0, out.length - Math.floor(SR * 0.07)), Math.floor(SR * 0.07));
  return out;
}

/** Two-tone car horn. */
function horn() {
  const n = Math.floor(SR * 0.55);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.02) * Math.min(1, (0.55 - t) / 0.06);
    out[i] = (saw(t * 392) * 0.3 + saw(t * 494) * 0.3) * env * 0.5;
  }
  return out;
}

function click() {
  const n = Math.floor(SR * 0.05);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = (Math.sin(2 * Math.PI * 2200 * t) * 0.5 + rand() * 0.15) * Math.exp(-t * 110);
  }
  return out;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  // clear old effects only; the radio music (radio.mp3 / radio.json) comes from scripts/gen-music.mts
  for (const f of await fs.readdir(OUT)) if (f.endsWith(".wav")) await fs.unlink(path.join(OUT, f));
  const files: [string, Float32Array][] = [
    ["crackle", crackle()],
    ["click", click()],
    ["notify", tone(0.7, [[1318.5, 0.5], [1975.5, 0.25]], 0.003, 6)],
    ["chime", tone(1.2, [[987.8, 0.5], [1318.5, 0.35], [1975.5, 0.15]], 0.004, 3.2)],
    ["whoosh", whoosh()],
    ["shutter", shutter()],
    ["horn", horn()],
    ["buzz", tone(0.5, [[120, 0.5], [240, 0.3], [360, 0.15]], 0.01, 5)],
  ];
  for (const [name, s] of files) await fs.writeFile(path.join(OUT, `${name}.wav`), wav(s));
  console.log(`[audio] wrote ${files.length} files to public/audio`);
}

main();
