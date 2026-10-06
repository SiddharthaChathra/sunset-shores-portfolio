/**
 * "Sunset Shores Radio": an original golden-hour synthwave piece, synthesised from scratch (no samples,
 * no third-party audio) and encoded to MP3. 32 bars at 88 bpm (~87 s), seamless loop.
 *
 *   bars  0–3   intro      pad opening up through a filter, soft arpeggio
 *   bars  4–11  groove     + bass, drum machine, arpeggio
 *   bars 12–19  theme      + lead melody
 *   bars 20–23  breakdown  drums drop to hats, pad and lead echoes
 *   bars 24–30  reprise    full band, theme variation
 *   bar  31     outro      band drops out, the pad filter closes back to the intro sound
 *
 * Chords (key of F): Bbmaj7 → C6 → Am7 → Dm9, one per bar.
 * Writes public/audio/radio.mp3 and public/audio/radio.json (loop sprite: skips the MP3 encoder delay).
 * Run: npx tsx scripts/gen-music.mts
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { Mp3Encoder } from "@breezystack/lamejs";

const SR = 32000;
const BPM = 88;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const BARS = 32;
const LEN = Math.round(BARS * BAR * SR);
const TAIL = Math.round(4 * SR); // reverb/delay tail, wrapped onto the start for a seamless loop
const N = LEN + TAIL;

const L = new Float32Array(N);
const R = new Float32Array(N);
const revSend = new Float32Array(N); // mono send into the reverb
const dlySend = new Float32Array(N); // mono send into the ping-pong delay
const duck = new Float32Array(N).fill(1); // sidechain gain from the kick (pads/bass pump)

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
const saw = (ph: number) => 2 * (ph - Math.floor(ph + 0.5));
const tri = (ph: number) => 1 - 4 * Math.abs(ph - Math.floor(ph + 0.5));
const at = (bar: number, beat = 0) => Math.round((bar * BAR + beat * BEAT) * SR);

const CHORDS = [
  [58, 62, 65, 69], // Bbmaj7
  [60, 64, 67, 69], // C6
  [57, 60, 64, 67], // Am7
  [62, 65, 69, 72, 76], // Dm9
];
const ROOTS = [34, 36, 33, 38]; // Bb1 C2 A1 D2

const has = (bar: number, part: "drums" | "bass" | "lead" | "arp" | "hats") => {
  if (part === "arp") return true;
  // bar 31 is the outro: drums and bass drop out so the loop flows back into the soft intro
  if (part === "hats") return bar >= 4 && bar < 31;
  if (part === "drums") return bar >= 4 && bar < 31 && !(bar >= 20 && bar < 24);
  if (part === "bass") return bar >= 4 && bar < 31;
  return (bar >= 12 && bar < 20) || bar >= 24 || (bar >= 20 && bar < 24);
};

/** Resonant 2-pole state-variable low-pass, per-sample cutoff. */
function svf() {
  let lo = 0;
  let bp = 0;
  return (x: number, cutoff: number, q = 0.7) => {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff, SR * 0.24)) / SR);
    lo += f * bp;
    const hi = x - lo - bp / q;
    bp += f * hi;
    return lo;
  };
}

function add(i: number, v: number, pan: number, rev = 0, dly = 0) {
  if (i < 0 || i >= N) return;
  L[i] += v * Math.cos((pan + 1) * Math.PI * 0.25) * Math.SQRT2 * 0.5 * 2;
  R[i] += v * Math.sin((pan + 1) * Math.PI * 0.25) * Math.SQRT2 * 0.5 * 2;
  revSend[i] += v * rev;
  dlySend[i] += v * dly;
}

/* ---------- drums ---------- */
function kick(start: number) {
  const n = Math.round(0.45 * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    ph += (48 + 95 * Math.exp(-t * 32)) / SR;
    const v = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 7) + (k < 60 ? rnd() * 0.25 * (1 - k / 60) : 0);
    add(start + k, v * 0.42, 0);
  }
  // sidechain: pads and bass dip and breathe back (the synthwave "pump")
  for (let k = 0; k < Math.round(BEAT * SR); k++) {
    const i = start + k;
    if (i < N) duck[i] = Math.min(duck[i], 1 - 0.5 * Math.exp(-(k / SR) * 9));
  }
}
function snare(start: number) {
  const n = Math.round(0.35 * SR);
  const f = svf();
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    ph += 185 / SR;
    const noise = f(rnd(), 5200, 0.9) * Math.exp(-t * 16);
    const body = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 28) * 0.6;
    add(start + k, (noise + body) * 0.3, 0.05, 0.85);
  }
}
function hat(start: number, open = false) {
  const n = Math.round((open ? 0.22 : 0.05) * SR);
  let prev = 0;
  for (let k = 0; k < n; k++) {
    const x = rnd();
    const hp = x - prev; // crude high-pass
    prev = x;
    add(start + k, hp * Math.exp(-(k / SR) * (open ? 14 : 70)) * 0.075, 0.35, 0.1);
  }
}

/* ---------- tonal voices ---------- */
function pad(bar: number) {
  const notes = CHORDS[bar % 4];
  const start = at(bar);
  const n = Math.round((BAR + 0.9) * SR);
  const f1 = svf();
  const f2 = svf();
  const phases = notes.map(() => [(rnd() + 1) / 2, (rnd() + 1) / 2, (rnd() + 1) / 2]);
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.35) * (t > BAR ? Math.exp(-(t - BAR) * 5) : 1);
    // intro: the filter opens over the first four bars
    const open =
      bar < 4
        ? 700 + ((bar * BAR + t) / (4 * BAR)) * 1300
        : bar >= 30
          ? 2000 - Math.min(1, ((bar - 30) * BAR + t) / (2 * BAR)) * 1300 // outro: close back to the intro
          : 2000 + 300 * Math.sin((bar * BAR + t) * 0.4);
    let l = 0;
    let r = 0;
    notes.forEach((note, j) => {
      const fr = midi(note);
      const p = phases[j];
      p[0] += (fr * 0.996) / SR;
      p[1] += fr / SR;
      p[2] += (fr * 1.004) / SR;
      l += saw(p[0]) * 0.6 + saw(p[1]) * 0.4;
      r += saw(p[2]) * 0.6 + saw(p[1]) * 0.4;
    });
    const i = start + k;
    const g = 0.075 * env * (i < N ? duck[i] : 1);
    const lv = f1(l, open) * g;
    const rv = f2(r, open) * g;
    if (i < N) {
      L[i] += lv;
      R[i] += rv;
      revSend[i] += (lv + rv) * 0.18;
    }
  }
}

function bass(bar: number) {
  const root = ROOTS[bar % 4];
  // eighth-note pattern (0 = rest), octave jumps for movement
  const pattern = [1, 0, 1, 12, 0, 1, 0, 12];
  const f = svf();
  pattern.forEach((step, s) => {
    if (!step) return;
    const note = root + (step === 12 ? 12 : 0);
    const start = at(bar, s * 0.5);
    const n = Math.round(BEAT * 0.48 * SR);
    let ph = 0;
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      ph += midi(note) / SR;
      const env = Math.min(1, t / 0.004) * (t > n / SR - 0.02 ? (n / SR - t) / 0.02 : 1);
      const raw = saw(ph) * 0.6 + Math.sin(2 * Math.PI * ph) * 0.8;
      const v = f(raw, 240 + 700 * Math.exp(-t * 14), 1.0) * env;
      const i = start + k;
      add(i, v * 0.17 * (i < N ? 0.6 + 0.4 * duck[i] : 1), 0);
    }
  });
}

function arp(bar: number) {
  const notes = CHORDS[bar % 4].slice(0, 4);
  const seq = [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 1].map((j, s) => notes[j] + 12 + (s % 8 === 7 ? 12 : 0));
  const level = bar < 4 ? 0.07 + 0.01 * bar : bar >= 31 ? 0.07 : bar >= 24 ? 0.09 : 0.08;
  seq.forEach((note, s) => {
    const start = at(bar, s * 0.25);
    const n = Math.round(0.2 * SR);
    let ph = 0;
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      ph += midi(note) / SR;
      const v = (tri(ph) * 0.7 + saw(ph) * 0.3) * Math.exp(-t * 18) * Math.min(1, t / 0.002);
      add(start + k, v * level, s % 2 ? 0.45 : -0.45, 0.15, 0.4);
    }
  });
}

type Note = [beat: number, len: number, note: number];
const PHRASE_1: Note[][] = [
  [[0, 1.5, 81], [1.5, 0.5, 79], [2, 1, 77], [3, 1, 74]],
  [[0, 1.5, 76], [1.5, 0.5, 77], [2, 2, 79]],
  [[0, 1, 76], [1, 1, 72], [2, 1.5, 76], [3.5, 0.5, 79]],
  [[0, 3, 77], [3, 0.5, 76], [3.5, 0.5, 74]],
];
const PHRASE_2: Note[][] = [
  [[0, 1, 74], [1, 1, 77], [2, 1.5, 81], [3.5, 0.5, 84]],
  [[0, 2, 84], [2, 1, 81], [3, 1, 79]],
  [[0, 1.5, 81], [1.5, 0.5, 79], [2, 1, 76], [3, 1, 72]],
  [[0, 4, 74]],
];
const PHRASE_2_END: Note[][] = [...PHRASE_2.slice(0, 3), [[0, 2, 77], [2, 2, 81]]];
const ECHO: Note[][] = [[[0, 2, 81], [2, 2, 77]], [[0, 4, 79]], [[0, 2, 76], [2, 2, 72]], [[0, 4, 74]]];

function lead(bar: number) {
  let phrase: Note[][];
  if (bar >= 12 && bar < 16) phrase = PHRASE_1;
  else if (bar >= 16 && bar < 20) phrase = PHRASE_2;
  else if (bar >= 20 && bar < 24) phrase = ECHO;
  else if (bar >= 24 && bar < 28) phrase = PHRASE_1;
  else phrase = PHRASE_2_END;
  const soft = bar >= 20 && bar < 24 ? 0.55 : 1;
  const f = svf();
  for (const [b, len, note] of phrase[bar % 4]) {
    const start = at(bar, b);
    const dur = len * BEAT;
    const n = Math.round((dur + 0.25) * SR);
    let p1 = 0;
    let p2 = 0;
    for (let k = 0; k < n; k++) {
      const t = k / SR;
      const vib = 1 + Math.sin(2 * Math.PI * 5.2 * t) * 0.004 * Math.min(1, Math.max(0, (t - 0.25) / 0.3));
      const fr = midi(note) * vib;
      p1 += fr / SR;
      p2 += (fr * 1.007) / SR;
      const env = Math.min(1, t / 0.03) * (t > dur ? Math.exp(-(t - dur) * 14) : 1);
      const v = f(saw(p1) + saw(p2) * 0.7 + Math.sin(2 * Math.PI * p1 * 0.5) * 0.4, 2600, 0.8) * env;
      add(start + k, v * 0.1 * soft, 0.1, 0.35, 0.3);
    }
  }
}

/* ---------- arrangement ---------- */
for (let bar = 0; bar < BARS + 1; bar++) {
  const b = bar % BARS; // bar 32 = bar 0 again: its attack wraps into the loop seam below
  if (has(b, "drums")) {
    kick(at(bar, 0));
    kick(at(bar, 2));
    if (b % 4 === 3) kick(at(bar, 3.5));
    snare(at(bar, 1));
    snare(at(bar, 3));
  }
  if (has(b, "hats")) for (let s = 0; s < 8; s++) hat(at(bar, s * 0.5 + 0.0), b % 2 === 1 && s === 7);
}
for (let bar = 0; bar < BARS; bar++) {
  pad(bar);
  if (has(bar, "bass")) bass(bar);
  arp(bar);
  if (has(bar, "lead")) lead(bar);
}

/* ---------- effects: ping-pong delay (dotted eighth) + Schroeder reverb ---------- */
const dTime = Math.round(BEAT * 0.75 * SR);
const dl = new Float32Array(N);
const dr = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const inL = dlySend[i] + (i >= dTime ? dr[i - dTime] * 0.42 : 0);
  const inR = i >= dTime ? dl[i - dTime] * 0.9 : 0;
  dl[i] = inL;
  dr[i] = inR;
  L[i] += dl[i] * 0.5;
  R[i] += dr[i] * 0.5;
  revSend[i] += (dl[i] + dr[i]) * 0.1;
}

function reverb(input: Float32Array, spread: number) {
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round(((d + spread) * SR) / 44100));
  const out = new Float32Array(N);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * 0.7 + lp * 0.3;
      buf[idx] = input[i] + lp * 0.83;
      idx = (idx + 1) % d;
      out[i] += y * 0.25;
    }
  }
  for (const d of [556, 441].map((x) => Math.round(((x + spread) * SR) / 44100))) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[idx];
      const y = -out[i] + b;
      buf[idx] = out[i] + b * 0.5;
      idx = (idx + 1) % d;
      out[i] = y;
    }
  }
  return out;
}
const revL = reverb(revSend, 0);
const revR = reverb(revSend, 23);
for (let i = 0; i < N; i++) {
  L[i] += revL[i] * 0.32;
  R[i] += revR[i] * 0.32;
}

/* ---------- loop seam: wrap the tail onto the start ---------- */
for (let i = 0; i < TAIL; i++) {
  L[i] += L[LEN + i];
  R[i] += R[LEN + i];
}

/* ---------- master: gentle tape saturation, normalise to −1 dBFS ---------- */
let peak = 0;
for (let i = 0; i < LEN; i++) {
  L[i] = Math.tanh(L[i] * 1.4);
  R[i] = Math.tanh(R[i] * 1.4);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = 0.89 / peak;
const toI16 = (x: Float32Array) => {
  const o = new Int16Array(LEN);
  for (let i = 0; i < LEN; i++) o[i] = Math.round(Math.max(-1, Math.min(1, x[i] * gain)) * 32767);
  return o;
};
const li = toI16(L);
const ri = toI16(R);

// Optional analysis dump (raw interleaved PCM) for scripts/analyse-music.mts
if (process.env.MUSIC_PCM) {
  const pcm = Buffer.alloc(LEN * 4);
  for (let i = 0; i < LEN; i++) {
    pcm.writeInt16LE(li[i], i * 4);
    pcm.writeInt16LE(ri[i], i * 4 + 2);
  }
  await fs.writeFile(process.env.MUSIC_PCM, pcm);
}

const enc = new Mp3Encoder(2, SR, 128);
const chunks: Uint8Array[] = [];
for (let i = 0; i < LEN; i += 1152) {
  const out = enc.encodeBuffer(li.subarray(i, i + 1152), ri.subarray(i, i + 1152));
  if (out.length) chunks.push(new Uint8Array(out));
}
const end = enc.flush();
if (end.length) chunks.push(new Uint8Array(end));
const mp3 = Buffer.concat(chunks.map((c) => Buffer.from(c)));

const OUT = path.join(process.cwd(), "public", "audio");
await fs.writeFile(path.join(OUT, "radio.mp3"), mp3);
// LAME adds 576 + 529 samples of decoder delay at the start; the sprite skips it so the loop is seamless.
const offsetMs = ((576 + 529) / SR) * 1000;
await fs.writeFile(path.join(OUT, "radio.json"), JSON.stringify({ offsetMs: +offsetMs.toFixed(2), durationMs: +((LEN / SR) * 1000).toFixed(2) }) + "\n");
console.log(`[music] radio.mp3 ${(mp3.length / 1024).toFixed(0)} KB, ${(LEN / SR).toFixed(1)} s, ${BARS} bars @ ${BPM} bpm`);
