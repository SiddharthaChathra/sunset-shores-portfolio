# Credits: Sunset Shores (Vice Sunset theme)

The art direction takes inspiration from golden-hour coastal cities in modern open-world games. **No game names, logos, characters, screenshots, ripped models or textures, or official music are used.** Everything in the world is original or procedural.

## 3D assets (all procedural, generated in code)

| Asset | Source | Licence |
|---|---|---|
| Coastline terrain, beach, promenade colouring | `scene/terrain.worker.ts`, `scene/layout.ts` | Original work |
| Ocean (shallow/deep, foam line, sun glints) | GLSL in `scene/fx/materials.ts` | Original work |
| Sunset sky, sun disc, streaky clouds | GLSL in `scene/Sky.tsx` | Original work |
| Palm trees (instanced, wind sway) | `scene/props/Palms.tsx` | Original work |
| Art-deco hotels and skyline, neon trims | `scene/props/Deco.tsx`, `scene/props/Street.tsx` | Original work |
| Coastal highway, flyover, streetlights | `scene/props/Road.tsx` | Original work |
| Convertible car and traffic | `scene/props/Car.tsx` (primitives) | Original work |
| Rooftop pool and caustics, beach café, trophy garage, marina boats, pier | `scene/scenes/*` | Original work |
| Billboards, emblems (rooftop radar, globe sign, neon heart, seaplane) | `scene/scenes/ProjectsScene.tsx`, `scene/scenes/Emblems.tsx` | Original work |
| Birds, sea spray | `scene/fx/Life.tsx` | Original work |
| Warm grade, film grain, sun flare, heat haze | `scene/fx/Effects.tsx` | Original work |
| Simplex noise (GLSL) | Ashima Arts / Stefan Gustavson, `webgl-noise` | MIT |
| Certificate plaque textures | Rendered from the owner's certificates by `scripts/build-content.mts` | Owner's documents |
| Environment lighting | drei `Lightformer`s (no HDRI download) | Original work |

## Audio

- **Radio music: "Sunset Shores Radio"**, an original golden-hour synthwave piece. It is 32 bars at 88 bpm (about 87 s), with a seamless loop, and it is composed and synthesised from scratch by `scripts/gen-music.mts`. It is encoded to MP3 at build time with [@breezystack/lamejs](https://github.com/breezystack/lamejs) (LGPL-3.0, a development tool only; nothing from it ships to visitors).
- **Sound effects:** station crackle, notification, whoosh, camera shutter, horn and neon buzz are synthesised by `scripts/gen-audio.mts`.

No samples or third-party audio are used.

## Fonts

- Anton (Vernon Adams), SIL Open Font License 1.1
- Manrope (Mikhail Sharanda), SIL Open Font License 1.1
- Space Mono (Colophon Foundry), SIL Open Font License 1.1

All are served via Google Fonts and Fontsource.

## Libraries

Next.js, React, three.js, React Three Fiber, drei, @react-three/postprocessing / postprocessing, GSAP, Lenis, Motion, Howler.js, Zustand, detect-gpu, Groq SDK (assistant, server-side only), mupdf (build-time only, not shipped to the browser) and sharp.
