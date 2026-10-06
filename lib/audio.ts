"use client";

import type { Howl } from "howler";
import { useApp } from "./store";

/**
 * Optional audio (off by default; never autoplays). The "Radio" plays "Sunset Shores Radio", an original
 * synthwave piece (scripts/gen-music.mts → public/audio/radio.mp3, ~87 s seamless loop). Sound effects are
 * synthesised by scripts/gen-audio.mts.
 *
 * To use your own track instead: replace public/audio/radio.mp3 and delete public/audio/radio.json
 * (without the JSON the whole file loops).
 */
type Sfx = "click" | "chime" | "notify" | "whoosh" | "shutter" | "horn" | "buzz" | "crackle";

let howls: (Record<Sfx, Howl> & { radio: Howl }) | null = null;
let loading: Promise<void> | null = null;
let lastWhoosh = 0;
let radioId: number | null = null;
let radioSprite = false;

function load() {
  if (loading) return loading;
  loading = Promise.all([
    import("howler"),
    // Loop window inside the MP3 (skips the encoder delay so the loop is seamless); optional.
    fetch("/audio/radio.json")
      .then((r) => (r.ok ? (r.json() as Promise<{ offsetMs: number; durationMs: number }>) : null))
      .catch(() => null),
  ]).then(([{ Howl }, loopWindow]) => {
    radioSprite = !!loopWindow;
    const h = (name: string, volume: number, loop = false) => new Howl({ src: [`/audio/${name}.wav`], volume, loop, preload: true });
    howls = {
      radio: new Howl({
        src: ["/audio/radio.mp3"],
        volume: 0,
        loop: true,
        preload: true,
        ...(loopWindow ? { sprite: { loop: [loopWindow.offsetMs, loopWindow.durationMs, true] as [number, number, boolean] } } : {}),
      }),
      crackle: h("crackle", 0.35),
      click: h("click", 0.3),
      chime: h("chime", 0.4),
      notify: h("notify", 0.4),
      whoosh: h("whoosh", 0.25),
      shutter: h("shutter", 0.5),
      horn: h("horn", 0.35),
      buzz: h("buzz", 0.25),
    };
  });
  return loading;
}

/** Play a sound effect if the radio/sound is on. Whoosh is throttled (fast-scroll cue). */
export function sfx(name: Sfx) {
  if (!useApp.getState().sound || !howls) return;
  if (name === "whoosh") {
    const now = performance.now();
    if (now - lastWhoosh < 2500) return;
    lastWhoosh = now;
  }
  howls[name].play();
}

export async function setSoundEnabled(on: boolean) {
  useApp.getState().setSound(on);
  try {
    localStorage.setItem("sc-sound", on ? "1" : "0");
  } catch {}
  if (on) {
    await load();
    if (!howls) return;
    howls.crackle.play();
    const r = howls.radio;
    // One radio voice: resume it if paused, otherwise start the loop (sprite "loop" when the window is known).
    if (radioId === null) radioId = radioSprite ? r.play("loop") : r.play();
    else if (!r.playing(radioId)) r.play(radioId);
    r.fade(r.volume(radioId) as number, 0.18, 1400, radioId);
  } else if (howls && radioId !== null) {
    const r = howls.radio;
    const id = radioId;
    howls.crackle.play();
    r.fade(r.volume(id) as number, 0, 500, id);
    setTimeout(() => {
      if (!useApp.getState().sound) r.pause(id);
    }, 550);
  }
}
