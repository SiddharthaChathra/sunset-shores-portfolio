# Mobile & tablet: progress

Brief: "Vice Sunset: Mobile & Tablet Looping Prompt". Loop: Audit → Plan → Build → Verify → Critique → Refine.
Screenshots (compressed WebP, 720px wide): `responsive/before/<device>/<section>.webp` (audit) · `responsive/after/<device>/<section>.webp` (latest).
Audit tool: `npx tsx scripts/device-audit.mts <outDir> [deviceFilter] [query]`. It records overflow, tap targets under 44px and body text under 16px, and writes `audit.json`.

## Modes (CSS custom variants in `app/globals.css`, mirrored by `lib/device.ts`)

| Variant | Media | Layout |
|---|---|---|
| `phone:` | width < 768, not short-landscape | "The site is the phone": scene window (42svh) + full-screen Sunset OS apps + dock |
| `tabp:` | 768–1023, not short-landscape | Handheld console: scene band (50svh) + frameless phone (< 900px, per brief) centred, max 640px |
| `stack:` | phone or tabp | Shared rules for the two stacked layouts |
| `land:` | height ≤ 500 and landscape | Cinematic: full-bleed scene + Sunset OS sheet on the right (40%) |
| `app:` | stack or land | Frameless phone UI |
| `frame:` | everything else (≥ 1024, not short) | Desktop layout; 1024–1279 tightened (tablet landscape) |

## Milestones

- [x] 1. Audit
- [x] 2. Foundations (svh, safe areas, gutters, fluid type, tap targets, contrast)
- [x] 3. Phone layout: scene window, full-screen apps, dock, map sheet
- [x] 4. Hero, About, Experience, Skills, Contact on phone and tablet
- [x] 5. Projects: vertical billboard layout, swipe sync, Read-more sheet, short-viewport carousel
- [x] 6. Certificates carousel + Photos app (swipe, pinch, PDF fallback)
- [x] 7. Companion: touch drag, edge snap, keyboard-aware sheet, Back closes
- [x] 8. Tablet portrait + tablet landscape tightening
- [x] 9. Phone landscape cinematic mode
- [x] 10. 3D tiers on mobile, gyroscope, portrait stills, performance
- [x] 11. Polish ×3

## Iteration 1: audit (2026-10-06)

Device matrix: iPhone SE 375×667, iPhone 15 393×852, iPhone 15 Pro Max 430×932, Pixel 7 412×915, Galaxy Fold 344×882, iPad Mini 768×1024, iPad Air 820×1180, iPad Pro 1024×1366, iPhone 15 landscape 852×393, iPad Pro landscape 1366×1024, desktop 1440×900.

There was no horizontal overflow on any device. Every phone and tablet auto-selected the **low** tier in the test browser, because an emulated mobile user agent on a desktop GPU is unknown to detect-gpu. Forced tiers are audited separately.

Defects:
1. **Phones: no app structure.**
   - Content cards float over a full-screen scene.
   - The giant "SUNSET SHORES — X" location card overlaps the app content in every section.
   - There is no dock or section navigation (only a 56px minimap that jumps to the next stop).
   - The assistant orb covers content.
2. **Phones: tap targets under 44px** (3 per section: monogram, Résumé, radio). Certificates and Projects have 8 (filter pills, list rows, dots).
3. **Phones: Experience body text is 13px** (22 elements). About, Projects and Contact have 1–2 small paragraphs.
4. **Hero (phone):** "Download résumé" is cut off at the bottom of the first view. The CTAs aren't full-width.
5. **Projects (phone):** the case study scrolls inside a small box. No billboard progress dots tied to the window, no swipe, no Read-more sheet.
6. **Certificates (phone):** a cramped two-line list with truncated titles. No carousel, and the filter row wraps.
7. **Skills (phone):** list → detail screen. No inline accordion.
8. **Contact (phone):** only Call and Message are buttons. LinkedIn and GitHub are small rows.
9. **Tablet portrait (iPad Mini/Air):** desktop layout with a tiny phone frame and large empty areas. 10–15 small targets per section.
10. **Phone landscape (852×393):** broken. The phone frame is cut off (only its header shows). The HUD (minimap, Résumé) overlaps the content, and the location card covers the content.
11. **Tablet landscape (iPad Pro 1366×1024):** acceptable (desktop layout).

## Iteration 2: build (milestones 2–10)

- **Foundations** (`app/globals.css`, `lib/device.ts`):
  - CSS custom variants `frame` / `app` / `stack` / `phone` / `tabp` / `land` / `touch`, mirrored by `useDeviceMode()`.
  - Layout tokens `--scene-h`, `--gutter`, `--dock-h` and `--safe-*` (`viewport-fit=cover`).
  - Body text is 16px on mobile, with press states instead of hover.
  - The old 700px breakpoint is gone: `frame:` replaces it, so desktop is unchanged.
- **Scene window:** on phones and tablets in portrait the canvas itself becomes a fixed band at the top (42svh on phones, 50svh on tablets, 38svh on short phones). It has rounded bottom corners, a soft fade and `touch-action: pan-y`. The apps scroll beneath it, and the smaller canvas is also cheaper to render.
- **HUD** (`ui/hud/Hud.tsx`, `ui/hud/MobileNav.tsx`):
  - 44px monogram; 56px minimap on phones, 88px on tablets, opening a full-screen **map sheet** with labelled stops (tap to drive).
  - A compact location pill on the window's bottom edge.
  - A 0.8s section toast at the top centre.
  - The progress line sits above the home indicator.
  - **Sunset OS dock**: Home, Projects, Work, Certs, Contact, plus **More** (About, Skills, Résumé, Radio). It is frosted in the live section tint, shows a gradient underline under the active item, and hides on scroll-down.
  - **Cinematic bar** (phone landscape): section switcher and radio.
- **Sections:**
  - **Hero:** CTAs full-width, sign at `clamp(2.6rem, 11vw, 5rem)`, and an iOS **Enable tilt** chip (asked once, never on load). Touch drag orbits ±15°, deciding the direction after 10px.
  - **About:** Profile app with 16px copy.
  - **Experience:** the thread types in once per session when the section enters.
  - **Skills:** inline accordion (2 columns on tablets).
  - **Contact:** 2×2 actions (Call, Message, LinkedIn, GitHub), and the footer clears the dock.
- **Projects** (`ui/sections/ProjectsMobile.tsx`):
  - Pinned for 4 × 100svh. Billboards slide sideways in the window: the active one centred, the next one waiting right, the previous one leaving left and dissolving. The camera stays still.
  - The app stays fixed and swaps screens.
  - Progress dots; a compact post with "Read more" opening a bottom sheet with the full case study.
  - **Swipe sync** on the scene window. Long-press swings the billboard with a haptic tick.
  - **Short screens** (landscape or < 640px tall): a billboard-card snap carousel with the app below.
- **Certificates:**
  - Phones: snap carousel. The centred plaque lifts and glints, and the garage spotlight follows it.
  - Tablets: 3-column grid.
  - Filter tags in a scrolling row with fade edges.
- **Photos app** (`ui/PhotoGestures.tsx`): full-screen on phones. Swipe, pinch-zoom with pan, double-tap zoom, swipe-down to close, Back to close, and **Open PDF** for documents.
- **Companion:**
  - 56/60/64px per device. Snaps to the left or right edge only on mobile, stays clear of the HUD and dock, persists per device class, re-clamps on rotation, and gives a haptic tick on snap.
  - **Bottom sheet** on phones (92svh, keyboard-aware via `visualViewport`), swipe-down / Back to close.
  - 56px mic with hold-to-talk; quick replies in a scrolling row.
  - The 3D scene pauses while a sheet, the Photos app or the assistant covers it.
- **Tiers:**
  - Phones top out at medium (DPR ≤ 1.5, ≤ 600 particles, ≤ 12 birds, 3 cars). Tablets with a tier-3 GPU run high (DPR ≤ 1.5).
  - Postcards for Save-Data, touch devices with ≤ 4 GB of memory, or phones under 40fps for 2s at the lowest resolution.
  - WebGL context loss falls back to postcards.
  - Postcards are framed per device: phone 1080 px and tablet 2050 px window stills, plus a 720px phone variant and a preloaded hero poster.
- **iPad Pro (desktop layout on touch):** the minimap opens the map sheet, targets are 44px (`touch:` variant), and the Sunset OS phone and panels zoom ×1.24 so body copy is 16px or more.

## Iterations 3–5: critique and polish

| Round | Top weaknesses | Fix |
|---|---|---|
| 1 | Assistant bubble over app text · iPhone SE: Projects buttons cut off, Hero CTAs below the fold · iPad Pro: big location card over the project tabs | Bubble tucks half off its edge while scrolling down · 38svh window and progressive hiding of highlights on short phones · compact pill on narrow desktop / touch tablets |
| 2 | Dock labels collide ("ExperienceCertificates") · Hero first view too tall · landscape heading under the switcher bar, radio pill clipped · iPad Pro pill over section headings | "Work" / "Certs" (accessible names keep the full words) · tighter sign and kicker · 76px top padding, shrinkable select · pill at the top centre of the HUD row |
| 3 | Phone loader monogram runs off-screen · Lighthouse label-in-name mismatches (sign lines, stat cards, email row, badge) | Stacked loader footer on mobile · visible text and accessible names aligned |

Critique scores for the last two rounds (self-assessed against the brief's rubric: premium mobile-game feel, golden-hour art, Sunset OS polish, thumb reach, readability, motion). Every section scored 9 · 9 on phone, tablet portrait, tablet landscape and phone landscape. These scores are my own assessment, not an external review.

## Verification (2026-10-06, Intel Iris Xe, Chromium)

| Check | Result |
|---|---|
| Overflow / tap targets ≥ 44 / body copy ≥ 16 / HUD–dock–assistant collisions, every section × 10 devices | 0 / 0 / 0 / 0 |
| Projects: scroll 4× both ways; swiping the scene window moves the page | pass |
| Companion: touch drag + edge snap, persistence after reload and rotation, no open on drag, keyboard-aware sheet, Back closes | pass |
| Photos: swipe, pinch, double-tap, swipe-down close | pass |
| Dock, map sheet and More sheet reach every section | pass |
| axe (phone, tablet) + contrast script (48 pairs) | clean |
| Phone FPS, medium tier, 4× CPU (Pixel 7 emulation) | 60 / 60 / 62 / 61 fps (Hero / Projects / Certificates / Contact) |
| Real LCP, Pixel 7 + 4× CPU + slow 4G | 1.37s · CLS 0 |
| Lighthouse mobile | Accessibility 100 · Performance **78–83 (target 90 not met)** · simulated LCP 3.9–4.0s · CLS 0 |
| Lighthouse desktop | 91–95 |
| Desktop 1440×900 | unchanged (`responsive/before/desktop` vs `responsive/after/desktop`) |

**Lighthouse mobile gap.** Lighthouse's simulated LCP is driven by the main-thread time that this machine's Chrome spends before its first paint (the machine was under heavy OneDrive sync load all day). It is not driven by the network. Real throttled measurements are well inside the 2.5s budget.

## Deviations

- **Tablet portrait** uses the stacked frameless layout. The brief allows this under 900px, and every common tablet in portrait is under 900px. iPad Pro portrait (1024px) falls in the tablet-landscape width band, so it gets the desktop layout with touch sizing.
- **KTX2:** not used. Plaque textures are 512px WebP, lazy-loaded near the garage. Everything else is procedural, so there are no other textures.
- **Haptics** use `navigator.vibrate`, which iOS Safari ignores.
- **The phone-landscape section switcher** is a native `<select>`; the platform picker is the most usable control at 393px tall.
