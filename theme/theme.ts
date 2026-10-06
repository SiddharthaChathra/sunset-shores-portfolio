/**
 * THEME + WORLD tokens: Vice Sunset ("Sunset Shores").
 * Swapping the theme is a one-file change here plus the CSS twin in app/globals.css.
 * Art direction is inspired by golden-hour coastal cities; no game names, logos or assets.
 */

export type SectionId = "hero" | "about" | "projects" | "experience" | "certificates" | "skills" | "contact";

export const SECTION_ORDER: SectionId[] = ["hero", "about", "projects", "experience", "certificates", "skills", "contact"];

export const theme = {
  name: "Vice Sunset",
  fonts: {
    display: "Anton",
    body: "Manrope",
    mono: "Space Mono",
    /** woff files served from /fonts for in-scene (troika) text. */
    displayWoff: "/fonts/anton-400.woff",
    bodyBoldWoff: "/fonts/manrope-800.woff",
    monoWoff: "/fonts/space-mono-700.woff",
  },
  color: {
    ink: "#23203A",
    inkSoft: "#4A4566",
    accent: "#FF4F8B", // hot pink: display ≥32px, buttons, neon
    accentStrong: "#BE1458", // small text + links: the brief's #D81B60 darkened to reach 4.5:1 on every section tint
    orange: "#FF9F43",
    coral: "#FF7A59",
    teal: "#2EC4B6",
    tealInk: "#0B6E66", // teal for small text (AA)
    skyTop: "#FF8FB1",
    skyHorizon: "#FFC48C",
    sun: "#FFF1C9",
    paper: "#FFF8F2",
    white: "#FFFFFF",
  },
  gradient: "linear-gradient(100deg, #FF4F8B 0%, #FF7A59 50%, #FF9F43 100%)",
  gradientStops: ["#FF4F8B", "#FF7A59", "#FF9F43"],
  /** Dominant colour per section: UI surfaces and haze lerp to it. */
  tints: {
    hero: "#FFE3D3",
    about: "#FFEFD9",
    projects: "#FFE0EC",
    experience: "#E3F6F5",
    certificates: "#FFF4CC",
    skills: "#E7E4FF",
    contact: "#FFD9C7",
  } satisfies Record<SectionId, string>,
  /** Sky zenith per section (golden hour drifting from pink toward lilac and back to orange). */
  skyZenith: {
    hero: "#FF8FB1",
    about: "#FF9EA8",
    projects: "#FF86B4",
    experience: "#8FD3E8",
    certificates: "#FFB37A",
    skills: "#B7A6F2",
    contact: "#FF8A7A",
  } satisfies Record<SectionId, string>,
  /** Haze at the horizon per section (fog colour). */
  haze: {
    hero: "#FFD2B0",
    about: "#FFDDB5",
    projects: "#FFCFD9",
    experience: "#CFEFEA",
    certificates: "#FFE6A8",
    skills: "#E2D6FF",
    contact: "#FFC6A8",
  } satisfies Record<SectionId, string>,
  radius: { phone: 22, card: 14, pill: 999 },
  shadow: "0 24px 60px rgba(255,79,139,0.18), 0 6px 18px rgba(35,32,58,0.10)",
  materials: {
    sand: "#F4D9B4",
    sandWet: "#E2BE95",
    grass: "#7FB58A",
    asphalt: "#5B5670",
    lane: "#FFF1D6",
    concrete: "#EFE6DD",
    ocean: { deep: "#1E8FA6", shallow: "#58D1C9", foam: "#FFFFFF" },
    palmTrunk: "#9C7656",
    palmLeaf: "#3E9A6B",
    deco: ["#FFD1DC", "#FFE8C2", "#C9F0EA", "#E4DBFF", "#FFFFFF", "#FFC9B5"],
    neon: { pink: "#FF4F8B", orange: "#FF9F43", teal: "#2EC4B6", white: "#FFF6FA" },
    carPaint: "#FF5C93",
    chrome: "#E8E6F0",
  },
  companion: {
    name: "Sid's Assistant",
    ribbons: ["#FF4F8B", "#FF7A59", "#FF9F43", "#2EC4B6"],
  },
} as const;

/** WORLD copy: location names for HUD cards and the minimap. */
export const world = {
  name: "Sunset Shores",
  locations: {
    hero: "Ocean Drive",
    about: "Rooftop Pool",
    projects: "Billboard Highway",
    experience: "Beach Café",
    certificates: "Trophy Garage",
    skills: "Marina",
    contact: "The Pier",
  } satisfies Record<SectionId, string>,
  labels: {
    hero: "Home",
    about: "About",
    projects: "Projects",
    experience: "Experience",
    certificates: "Certificates",
    skills: "Skills",
    contact: "Contact",
  } satisfies Record<SectionId, string>,
} as const;
