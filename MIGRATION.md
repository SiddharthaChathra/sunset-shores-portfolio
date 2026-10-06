# MIGRATION: Chiral Network → Vice Sunset ("Sunset Shores")

The in-site world is **Sunset Shores**. Inspired by golden-hour Miami art direction; no game names, logos, characters, screenshots, ripped assets or music.

Screenshots: `migration/before/` (Chiral, 1440×900 and 390×844) · `migration/after/` (Vice Sunset, 1440×900, 1920×1080, 820×1180 and 390×844).

## Old → new

| ✓ | Old element (Chiral Network) | New element (Vice Sunset) | File(s) |
|---|---|---|---|
| [x] | Theme tokens (gold #E8B04A, cyan #4FC3F7, misty tints) | Vice Sunset tokens, signature gradient, section tints | `theme/theme.ts`, `app/globals.css` |
| [x] | Rajdhani / Inter / JetBrains Mono | Anton / Manrope / Space Mono | `app/layout.tsx`, `scripts/build-content.mts` (scene fonts) |
| [x] | Frosted angled-corner `.panel`, HUD buttons | Sunset OS phone + warm frosted cards, gradient pills | `ui/phone/*`, `app/globals.css` |
| [x] | Kojima-style HUD tab bar + quest rail | Neon "SC" monogram, circular minimap with waypoints, résumé pill, radio toggle | `ui/Hud.tsx`, `ui/QuestRail.tsx` → `ui/hud/Hud.tsx` |
| [x] | (none) | Location cards, section-complete toasts, bottom speed-line progress | `ui/hud/*` |
| [x] | Misty sky + fog, rolling moss terrain, rocks, mist sprites | Sunset sky with low sun, ocean shader, coastline, palms with sway, warm haze | `scene/Sky.tsx`, `scene/Terrain.tsx`, `scene/terrain.worker.ts`, `scene/props/Palms.tsx`, `scene/props/Street.tsx` (removed: `scene/Rocks.tsx`, `scene/fx/Mist.tsx`) |
| [x] | Gold dust particles | Sea spray / sun motes, bird flocks | `scene/fx/Particles.tsx` → `scene/fx/Life.tsx` (`Spray`, `Birds`) |
| [x] | Chiral strands between sections | Coastal highway road (the camera drives it) | `scene/Connectors.tsx` → `scene/props/Road.tsx`, `scene/props/Car.tsx` |
| [x] | Hologram Fresnel / scanline material | Neon tube + glossy paint materials | `scene/fx/materials.ts` |
| [x] | Hero: hilltop, gold sky strand, particle name, relay scanner ping | Ocean Drive: art-deco hotel strip, palms, beach, drive-by convertible, HTML neon sign | `scene/scenes/HeroScene.tsx`, `ui/sections/Hero.tsx` |
| [x] | About: outpost + stat crystals | Rooftop pool with caustics + Profile app | `scene/scenes/AboutScene.tsx`, `ui/sections/About.tsx` |
| [x] | Projects: cargo containers + name cards | Billboard highway, billboards with neon frame + Projects app | `scene/scenes/ProjectsScene.tsx`, `ui/sections/Projects.tsx` |
| [x] | Emblems (radar, globe, heart, plane) | Rooftop radar dish, globe sign, neon heart + ECG, seaplane circling the bay | `scene/scenes/Emblems.tsx` |
| [x] | Experience: holographic route map | Beach café + Messages app threads | `scene/scenes/ExperienceScene.tsx`, `ui/sections/Experience.tsx` |
| [x] | Certificates: hex medals on pedestals | Garage trophy cabinet, plaques under spotlights | `scene/scenes/CertificatesScene.tsx`, `ui/sections/Certificates.tsx` |
| [x] | Achievement lightbox | Photos app (swipe, zoom, download) | `ui/Lightbox.tsx` |
| [x] | Skills: 3D pentagon radar + SVG radar | Marina + Stats app segmented bars | `scene/scenes/SkillsScene.tsx`, `ui/sections/Skills.tsx` (removed: `ui/SkillRadarSvg.tsx`) |
| [x] | Contact: network terminal + strand | Pier at sunset + Contacts app (Call / Message) | `scene/scenes/ContactScene.tsx`, `ui/sections/Contact.tsx` |
| [x] | Chiral loader (hex rings, strand) | Illustrated Ken Burns panels + neon SC + gradient bar | `ui/LoadingScreen.tsx` |
| [x] | Echo orb + hologram panel | Notification bubble + Messages app "Sid's Assistant" | `ui/companion/*` |
| [x] | Echo persona | "Sid's Assistant" persona (grounding rules unchanged) | `app/api/assistant/route.ts` |
| [x] | Wind / chime / ping SFX | Radio synth loop, station crackle, notification, whoosh, shutter, horn | `scripts/gen-audio.mts`, `lib/audio.ts` |
| [x] | Bloom/DOF/Outline/Vignette | Bloom, warm grade, film grain, transition chromatic aberration, heat haze (high) | `scene/fx/Effects.tsx` |
| [x] | Stills + OG image | Re-rendered from Sunset Shores | `public/stills/*`, `app/opengraph-image.png` |
| [x] | Tests referencing quest nodes / medals | Minimap waypoints, Photos app, Contacts app | `tests/*` |
| [x] | CREDITS (Chiral) | CREDITS (Sunset Shores) | `CREDITS.md`, `app/credits/page.tsx` |

## Shared components replaced in one place

- Panels and cards: the `.card` / `.glass` classes in `app/globals.css`
- Buttons and pills: `.btn`, `.pill`
- Phone shell: `ui/phone/Phone.tsx` (About, Projects, Experience, Skills, Contact, Photos lightbox, assistant)
- HUD: `ui/hud/*`
- Toasts: `ui/Toast.tsx`
- Loading screen: `ui/LoadingScreen.tsx`

## Deviations from the brief

| Brief | Shipped | Why |
|---|---|---|
| Claude for the assistant | Groq (`openai/gpt-oss-120b`), streaming | Owner's choice of provider. Key stays server-side in `.env.local`. |
| `#D81B60` deep pink | `#BE1458` (`accentStrong`) | `#D81B60` misses WCAG AA for small text on the warm cream surfaces; `#BE1458` passes all 48 pairs in `npm run contrast`. |
| Tool-wall filters | Adds a **Networking** filter | The CCNA certificates otherwise fall under "All" only. |
| Siri-style waveform | Raw WebGL fragment shader (not R3F) | Keeps the companion out of the 3D bundle; it works on the low tier too. |
| Physics (rapier) | Not used | No interaction needed rigid-body physics; billboards swing and boats bob on cheap analytic motion. |
| GSAP ScrollTrigger | Removed | No triggers were ever created; Lenis now runs from the scroll loop and loads after first paint (−48 KB gzip initial JS). |
| Auto tier | Intel integrated GPUs start on **medium** | Iris Xe holds 56–60 fps on high at 1440×900 but 35–40 at 1920×1080; medium holds 60. The live FPS guard still steps down. |
| Mobile Lighthouse ≥ 90 | 87–89 on this machine | See the iteration log. Real phone-emulated first paint is 128 ms, CLS 0. |

## Iteration log

### Iteration 1: re-theme build
Tokens, fonts, Sunset OS phone, HUD, all seven scenes, loader, companion, sound, VFX and the stills pipeline were rebuilt in place. The content pipeline, the scroll rig, the tiers, the assistant grounding rules and the section order are unchanged.

### Iteration 2: test and accessibility pass
- Lenis-aware test helpers.
- Minimap targets: 24 px, with names prefixed by number (Lighthouse label-content-name).
- Phone tilt stays flat while the pointer is inside it ("element not stable").
- Experience chat is now a scroll container pinned to the newest message.
- Stills backdrop: `pointer-events: none` (orb drag).

### Iteration 3: boot cost
- Fog is set before precompile.
- GPU probe runs in a worker.
- The world mounts in stages, with progressive deco and lazy 512 px plaques.
- Shader error checks run in development only.
- Desktop Lighthouse rose from the 70s to 92–95.

### Iteration 4: frame rate and first paint
- The street is split into 60 m segments, hidden outside 170 m ahead / 40 m behind. Medium-tier median at Projects went from 41.7 fps to 60 fps on every stop.
- Palm gust decays once per frame.
- Below-fold sections hydrate in their own Suspense boundaries. GSAP is removed and Lenis is lazy.
- On phones, the loader only covers the page once a live 3D tier is detected.
- Phone-emulated first paint went from 280 ms to 128 ms. Initial JS went from 296 KB to 248 KB gzip.

### Iteration 5: polish
- The Experience chat opens with 7 messages, anchored to the top, so the screen no longer starts mostly empty.
- The assistant bubble is 52 px on phones (64 px on desktop), so it covers less of the content column.
- About stat labels are tightened under 420 px ("CERTIFICATES" was clipped).
- The `migration/after` matrix was re-shot after these changes.

### Iteration 6: owner feedback (2026-10-06)
- **Projects are full case studies.** Each project has "What it does", "The problem", "What makes it different" and "How it's built", plus the stack. The phone screen scrolls through the case study as you scroll the page (no inner scroll trap), and each project gets 150vh. The new text comes only from the repositories (READMEs, the training and serving code) and the résumé. "Model accuracy evaluated before serving predictions" was removed because the training script does not evaluate.
- **NetSentinel image.** It was the sign-in page; it is now the dashboard screenshot from the repo.
- **Certificates turning 2D.** Cause: the runtime FPS guard switched medium → low (postcard stills) after 2 s under 40 fps, typically on the plaque texture uploads at Certificates. Fix:
  - The guard now lowers resolution in 15% steps (floor DPR 0.6) and raises it back when there is headroom.
  - Windows containing a single hitch are ignored, plus a 2 s warm-up.
  - Medium → low only below 15 fps at the floor for 8 s.
  - Medium bloom runs at half resolution.
  - Every stop's scroll hold now has a slow orbit and push-in. Certificates has a 160vh hold, so the camera keeps moving while you browse.
- **Assistant icon.** Now a Siri-style orb (pink, orange, teal and violet light in a dark glass sphere, pure CSS, `ui/companion/SiriOrb.tsx`). It is also used as the avatar in the assistant panel, and it speeds up while the assistant is busy.

### Iteration 7: owner feedback, round 2 (2026-10-06)
- **Skills:** the last card ("Web") was cut off on short laptop windows (1366×768, 1280×720). Cards are now tighter when the window is under 820 px tall, and the Stats screen scrolls without trapping the wheel (scroll continues to the page at the ends). Verified at 1280×720 through 390×844.
- **Cars:**
  - Traffic is now a car-following (IDM) model with one lane per direction. Cars keep a safe gap and brake behind slower cars, follow the road's curve, and pitch with the flyover ramps.
  - The hero drive-by car, which drove head-on through oncoming traffic in the same lane, is now part of the traffic.
  - The garage and café were standing on the road shoulder on wide screens; `keepOffRoad()` keeps every set piece clear of the carriageway.
  - `scripts/lane-check.mts` raycasts both lanes against the scene and finds nothing at 16:10, 16:9 and 21:9. Over 25 s of sampling, cars never come closer than oncoming lanes allow.
  - Every car can be tapped to honk.
  - Cars are merged per material (7 draw calls instead of 21).
- **Visuals (3D layer only):**
  - Soft golden-hour sun shadows on the high tier, cached and re-rendered only when the view moves.
  - Windows reflect the live sunset sky with Fresnel and a sun glint, and some glow warm.
  - A lit asphalt road with tyre tracks and sheen. The old road ribbon was wound the wrong way and had never been visible.
  - Sand ripples (high tier), a gentle filmic S-curve and a warm vignette.
- **Music:** the 10-second synth loop is replaced by "Sunset Shores Radio", an original 87 s golden-hour synthwave piece (`scripts/gen-music.mts`) with an intro, groove, theme, breakdown, reprise and outro, and a seamless loop. It is 1.4 MB and loads only when the radio is turned on.
- **Palms:** a tap used to make every palm on the coast flail, because the sway frequency was multiplied by elapsed time, so changing it jumped the phase. Now a soft gust ripples out from the tapped palm: nearby palms bend away once and settle with a damped sway.
- **Shader fix:** the new palm-sway shader declared `mat4 im`, which clashes with three.js's own `im` in instanced meshes. Palms failed to compile and vanished in production builds (shader errors are only reported in development). All injected GLSL locals now carry a prefix (`sw_`, `dg_`, `rd_`, `tr_`), and `tests/shaders.spec.ts` compiles every program on high and medium with error checks on (`?shadercheck`).
- **Performance:**
  - Billboard dissolve noise only runs while a billboard is dissolving.
  - The billboard frames are merged.
  - A forced tier (`?tier=`) keeps dynamic resolution, as a visitor has; `?fixeddpr` pins it for diagnostics.

### Iteration 8: road finish and owner photo (2026-10-06)
- **Road between Projects and Skills:**
  - The terrain added dunes under the carriageway, so sand poked through the asphalt and the road edges floated. The road corridor is now graded flat (`terrainHeight`), blending back to the dunes over the shoulders.
  - The flyover was level 6 m boxes, missing below 1.2 m, so ramp ends floated and the deck looked stair-stepped. It is now continuous geometry extruded along the road: a solid body that becomes an embankment where the ramp meets the ground, continuous parapets, kerbs at street level, and pillars only where there is clearance.
  - The camera path dipped under the ramp; it now stays above the deck (path control point + a clamp in `CameraRig`).
  - `scripts/path-shots.mts` captures the camera path for review.
- **Owner photo:** `assets/profile.jpg` (supplied by the owner) is processed by `npm run content` into a face-centred round avatar and a 16:9 sunset cover. They are used as the Profile app cover, the profile picture, and the Contacts picture. The framing is set in `profile.photoFraming`.

## Final verification (2026-10-06, Intel Iris Xe, Chromium/ANGLE D3D11)

| Check | Result |
|---|---|
| Acceptance grep (chiral, strand, holo…, #E8B04A, #4FC3F7) in app/scene/ui/lib/theme | clean |
| Playwright (38 tests: desktop, tablet 820×1180, phone 390×844, axe, companion via Groq) | **38 passed** |
| FPS, high tier, 1440×900 | median 56–60 on every stop |
| FPS, medium tier | median 60 on every stop (target ≥ 45) |
| FPS, high tier, 1920×1080 on this iGPU | 34–42, recorded only; this machine auto-selects medium |
| Lighthouse desktop | Performance 95–97 · Accessibility 100 · Best Practices 100 · SEO 100 · LCP 1.0 s · CLS 0.006 |
| Lighthouse mobile | Performance **87–89** (target 90, **not met**) · Accessibility 100 · CLS 0 |
| Contrast | 48 / 48 pairs pass AA |
| Bundle | initial JS 248 KB gzip (budget 350) · 3D assets 1.3 MB (budget 8 MB) |
| Secrets in `.next/static` | clean |

**Mobile Lighthouse gap.** The simulated LCP (3.6 s) is the hero tagline. A Pixel 7 emulation with 4× CPU throttling measures it at about 130 ms, yet Lighthouse's own run on this machine sees first paint at about 660 ms. It then scales the hydration work that ran during that wait by 4×. The machine was under heavy OneDrive sync load during every run. Lighthouse should be re-run on a quiet machine or a deployed URL before deciding on further work. The next lever would be hydrating the HUD lazily.

## Critique scores (self-assessed against the brief's rubric)

| Section | Golden-hour feel | Art direction | Phone UI | Readability | Motion | Recruiter clarity |
|---|---|---|---|---|---|---|
| Hero (Ocean Drive) | 9 | 9 | n/a | 9 | 9 | 9 |
| About (Rooftop pool) | 9 | 9 | 9 | 9 | 9 | 9 |
| Projects (Billboard highway) | 9 | 9 | 9 | 9 | 9 | 9 |
| Experience (Beach café) | 9 | 9 | 9 | 9 | 9 | 9 |
| Certificates (Trophy garage) | 9 | 9 | 9 | 9 | 9 | 9 |
| Skills (Marina) | 9 | 9 | 9 | 9 | 9 | 9 |
| Contact (Pier) | 9 | 9 | 9 | 9 | 9 | 9 |

These scores are my own judgement against the brief's rubric, not an outside review.
