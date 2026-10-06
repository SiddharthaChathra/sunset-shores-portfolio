# PROGRESS

Theme: **Vice Sunset** (in-site world: *Sunset Shores*), re-themed from the original Chiral Network build. See `MIGRATION.md` for the old → new map, deviations and the re-theme iteration log. Build loop: Build → Verify → Critique → Refine.
Verification hardware: Windows 11 laptop, **Intel Iris Xe (integrated)**, Chromium via ANGLE/D3D11 (real GPU, not SwiftShader).

## Milestones

- [x] 1. Scaffold (Next 16, TS, Tailwind 4), theme tokens (`theme/theme.ts`), fonts, HTML section shell, HUD, quest rail, Lenis + GSAP ScrollTrigger
- [x] 2. Content pipeline (`scripts/build-content.mts`): copy, thumbnails, previews, 1024 px badge textures, `certificates.json`, résumé text, `knowledge.json`, locked-badge seeds, photo meta
- [x] 3. Persistent canvas, CatmullRom camera rig with smootherstep stops, sky shader + fog lerping per section tint, quality tiers, loading screen with real progress
- [x] 4. Hero: hilltop, gold strand to the sky, particle name assembling over the HTML h1, hologram terminal frame, drag-orbit ±25°, scanner ping revealing hologram relays
- [x] 5. About (outpost powers on, stat crystals rise, click to pulse/count) and Experience (holographic route map, segments draw on, hover sync with HTML)
- [x] 6. Projects: angled container-label cards slide / dissolve (accent edge glow) with scroll, grab-to-spin with inertia + spring back, fixed crossfading "order details" panel, per-project emblems
- [x] 7. Certificates (hex medals with real textures on pedestals, hover lift/spin, "like" burst, filters, Achievement lightbox), Skills (3D pentagon radar, clickable nodes), Contact (terminal, Connect strand + flash), chiral-strand connectors between sections
- [x] 8. VFX: Bloom, light Hero DOF, Outline, Vignette, SMAA, GPU particles, mist, hologram / strand / dissolve / crystal shaders, synthesised sound (off by default)
- [x] 9. Companion orb (drag mouse/touch, edge snap, persistence, trail) + panel (shader waveform with idle / listening / thinking / speaking, typewriter, quest chips, mic, voice-out, focus trap, Ctrl/⌘+K)
- [x] 10. Assistant API: **Groq** (owner's choice) streaming, grounded on `knowledge.json`, 10-turn history, input caps, 20 req / IP / 10 min, in-character errors
- [x] 11. Low tier / reduced motion: pre-rendered stills (`npm run capture:stills`) + CSS parallax, HTML/CSS project cards, SVG radar
- [x] 12. Performance (shader + texture precompile, pixel-budget DPR, wall-clock FPS guard), SEO (metadata, JSON-LD, sitemap, robots, OG image rendered from the Hero), accessibility

## Results (latest run, Vice Sunset)

See `MIGRATION.md` → "Iteration log" for the re-theme passes. The milestones and iteration log below describe the original Chiral build. See the "Iteration log" below for the numbers from each pass. Commands: `npm run verify`, `npm run test:e2e`, `npm run lighthouse`.

## Deviations from the brief (and why)

| Brief | Built | Why |
|---|---|---|
| Claude via `@anthropic-ai/sdk` | **Groq** via `groq-sdk` (`GROQ_API_KEY`, `GROQ_MODEL`, default `openai/gpt-oss-120b`) | Owner instruction during the build ("for llm i will use groq"). Groq caches identical prompt prefixes automatically on supported models, so persona + knowledge are sent first and unchanged. |
| `MeshTransmissionMaterial` crystals | Single-pass crystal shader (`createCrystalMaterial`) | Any transmission pass combined with DOF caused 0.4–1.6 s GPU stalls (measured, bisected). The shader keeps the look (Fresnel, gold attenuation, faux refraction) with no extra render. |
| `@react-three/rapier` physics for grab/throw | Custom inertia + spring integrator for the card spin | Same feel, no ~2 MB WASM in the bundle; nothing else needed physics. Removed the dependency. |
| Orb/waveform in an R3F canvas | Tiny raw-WebGL fragment-shader canvases (`ui/companion/ShaderCanvas.tsx`) | The companion must also work on the low tier, where three.js isn't loaded. |
| Filter pills All · Cloud · AI · Data | Plus **Networking** | Two Cisco Networking Academy certificates exist in the assets. |
| HDRI from Poly Haven | Procedural `Lightformer` environment | No download, nothing to license, smaller budget. |
| Quest-rail label visible for the active node | Label on hover / focus only | The always-on label overlapped left-side panels (Contact, Experience). |
| High tier for every "tier 3" GPU | Integrated Intel GPUs start at **medium** | On Iris Xe the full post stack stalls at 1920×1080 (forced high: median 58–60 fps but multi-second stalls). Medium is stall-free. The FPS guard (wall clock, now counts stalls) still degrades at runtime. |

## Needs from owner

- **Certificate dates conflict with the brief.** Dates were taken from the documents:
  - Applied AI Learning Challenge: the PDF says **19 Sep 2025** (brief said 28 Sep 2025).
  - Microsoft AI Learning Challenge: the PDF (page 4 of `Microsoft.pdf`) says **18 Sep 2025** (brief said 11 Nov 2025).
  - "Data Analysis Certificate": the PDF is Skill Nation's *Data Analysis Using AI* live workshop, **23 Jun 2024** (brief and older résumé say 25 Jul 2025). Please confirm or send the right file.
- `cirtificates/AINNOVATION-Microsoft AI challenge.pdf` actually contains the *Applied AI* certificate. The real Microsoft AI one was extracted from `Microsoft.pdf`.
- **Skill levels** in `content/skills.ts` are inferred from the résumé, projects and certificates. Please confirm each one.
- **`{{PROFILE_PHOTO}}`**: add `assets/profile.jpg` (the monogram "SC" shows until then).
- **`{{SCREENSHOTS}}`**: project screenshots for JobSentinel, Heart Disease Detection and Travora AI (`public/projects/<id>.webp`, then set `coverImage` in `content/projects.ts`); until then the framed emblem art shows. NetSentinel uses the dashboard screenshot from its own repository (`screenshots/dashboard.png`).
- **`{{SHOW_PHONE}}`**: currently `false` in `content/profile.ts`.
- **`{{SITE_URL}}`**: set `NEXT_PUBLIC_SITE_URL` when deploying.
- The newer résumé (`assets/resume.pdf`) lists NetSentinel with a RAG layer (Ollama/Groq) and a 23-module test suite, while the brief says 569 passing tests. The site uses the brief's text.

## Iteration log

### Iteration 1: first full build (milestones 1–12)
- **Plan:** build every milestone end to end, then verify with real-GPU screenshots.
- **Verify:** lint / typecheck / build all green.
- **Critique, top weaknesses:**
  - The hero particle "ghost" name sat half a line low: canvas sampling used mixed case while CSS uppercases the h1.
  - The mist washed the hero out.
  - The experience map rendered solid gold.
  - The certificate rows overlapped.
  - The quest-rail label covered left-side panels.
- **Refine:**
  - Hero sampling now uses a baseline marker plus the CSS text-transform; mist alpha 0.32 → 0.17.
  - Added summit rocks and a darker terrain palette; fixed the map pedestal ring.
  - Medals in staggered rows on stepped pedestals.
  - Rail labels on hover/focus only; photo fallback decided at build time; About panel tightened.

### Iteration 2: frame pacing
- **Verify:** periodic 0.4–3 s GPU stalls at the forced high tier.
- **Bisect:**
  - Transmission + DOF together caused the main stalls, so the crystals moved to a single-pass shader.
  - The wall-clock FPS guard had clamped `dt`, so stalls were invisible to it; fixed.
  - Added a pixel-budget DPR and texture pre-upload.
  - On Iris Xe at 1080p the full post stack still stalls, so integrated Intel GPUs auto-start at medium.
- **Bug fixes:**
  - Orb drag was cancelled by native image drag over the low-tier stills.
  - Mirrored stat labels in About.
  - The orb leaked into the captured stills.

### Iteration 3: boot cost / Lighthouse
- **Verify:** Lighthouse Performance 61, TBT 2.6–3.4 s; the HTML-only path scored 98.
- **Profile findings:**
  - drei `<Preload all>` ran a synchronous whole-scene compile.
  - three's shader-error checks block on every link (cold GPU cache).
  - Terrain generation ran on the main thread.
  - Post-processing shaders compiled on the first composer render.
- **Refine:**
  - Removed Preload.
  - `checkShaderErrors` is now off in production only.
  - Async batched precompile against the composer's real input buffer, including its pass materials, before the first frame.
  - Terrain is built in a Web Worker.
  - The environment map is on high only.
  - Software renderers go to low; the Stage mounts on idle.
- **Result:** cold-boot blocking on medium went from 2.4 s to about 0.3 s.

### Iteration 4: polish (motion and VFX restraint)
- Low-tier fallback cards: the waiting card is offset and faded, so titles no longer collide.
- The hero ghost name fades while the hero is drag-orbited.
- Unlit connector strands fade to 20% until scrolled past, so the sky reads calmer.

### Latest verification (2026-10-05, Intel Iris Xe, Chromium/ANGLE D3D11)

| Check | Result |
|---|---|
| `npm run lint` / `typecheck` / `build` | pass |
| `npm run check:secrets` (`.next/static`) | clean |
| Playwright | Last full run: 25 passed, 1 failed (forced-high FPS at 1080p on this iGPU), 6 skipped (the live Groq answer tests; no `GROQ_API_KEY`). The failing test now asserts FPS only on high-tier hardware and passes when rerun on its own. |
| axe (low and high tier HTML layer) | 0 violations |
| Lighthouse desktop (3 runs) | Performance 78 / 90 / 90 (one earlier post-test run: 73). Accessibility 100, Best Practices 100, SEO 100. LCP 0.8 s, CLS 0.004, TBT 200–540 ms. The first cold run on a fresh GPU driver cache is the slow one. |
| Initial route JS | 290 KB gzipped (budget 350). The 3D chunk (318 KB) is lazy. |
| 3D assets | 0.77 MB (budget 8 MB) |
| FPS, medium (this machine's auto tier) | ≥ 45 median and average at every stop (≈ 60 median) |
| FPS, forced high | median 58–61 at every stop, but averages drop (stalls) on this integrated GPU at 1080p. That's why it auto-starts at medium. **The ≥ 55 fps high-tier target is unverified here and needs a discrete GPU.** |

### Critique (Awwwards jury + recruiter), latest

Scores 1–10: art direction · motion · interactivity · readability · smoothness · "want to hire".

| Section | Art | Motion | Interact | Read | Smooth | Hire |
|---|---|---|---|---|---|---|
| Hero | 9 | 8 | 8 | 9 | 8 | 9 |
| About | 9 | 8 | 8 | 9 | 9 | 9 |
| Projects | 9 | 9 | 9 | 9 | 9 | 9 |
| Experience | 8 | 8 | 7 | 9 | 9 | 9 |
| Certificates | 8 | 8 | 9 | 9 | 8 | 9 |
| Skills | 8 | 8 | 8 | 9 | 9 | 9 |
| Contact | 8 | 9 | 8 | 9 | 9 | 9 |

**The stop condition (every section ≥ 9 in two consecutive critiques) is not met yet.** Remaining weaknesses, in priority order:
1. The Experience route map is the plainest scene. It needs terrain relief on the map and moving "porter" markers along the routes.
2. The Certificates and Skills scenes could carry more environmental storytelling (relay pylons, small props) without adding noise behind the panels.
3. Hero motion: the name assembly and the strand are good, but the hill composition is still simple. A slow cloud sweep across the valley would add depth.
4. High-tier performance must be verified on a discrete GPU (target ≥ 55 fps), and the live Groq answers verified with a real key.

Next loop: items 1–3 as polish iterations 5–7, then re-score. After that, run `responsive-looping-prompt.md` for phones and tablets; tablet and phone layouts are not yet tuned.

### Iteration 5: live companion verification (Groq key added in `.env.local`)
- Live answers verified for all six required questions; companion suite 12/12 passing.
  - "What's his favourite food?" → it says it doesn't have that information and suggests emailing him.
- **Fix:** the first NetSentinel answer added Tailwind CSS, which isn't in its stack.
  - The prompt now requires technologies and dates exactly as listed in the knowledge, plain text only, temperature 0.2.
  - The client strips stray Markdown.
  - The test now fails if Tailwind appears in the NetSentinel answer.
- `npm run check:secrets` is still clean after a build with the key present (the key value is part of the grep).
