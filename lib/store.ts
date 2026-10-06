"use client";

import { create } from "zustand";
import type { CertCategory, CertificateEntry } from "@/content/types";

export type Tier = "high" | "medium" | "low";
export type CertFilter = "All" | CertCategory;

interface LightboxState {
  list: CertificateEntry[];
  index: number;
  /** Show the "Achievement unlocked" banner (certificates) vs a plain document view. */
  achievement: boolean;
}

interface AppState {
  tier: Tier | null;
  tierReason: string;
  setTier: (tier: Tier, reason: string) => void;

  /** Index into SECTION_ORDER of the section currently in view. */
  active: number;
  setActive: (i: number) => void;

  /** Active project card (0..projects.length-1). */
  project: number;
  setProject: (i: number) => void;

  /** The 3D canvas has rendered its first frame with all suspended assets. */
  sceneReady: boolean;
  setSceneReady: (v: boolean) => void;
  loadingDone: boolean;
  setLoadingDone: (v: boolean) => void;
  /** 0..100 asset progress reported from inside the canvas (drei useProgress). */
  loadProgress: number;
  setLoadProgress: (v: number) => void;

  sound: boolean;
  setSound: (v: boolean) => void;

  certFilter: CertFilter;
  setCertFilter: (f: CertFilter) => void;

  lightbox: LightboxState | null;
  openLightbox: (list: CertificateEntry[], index: number, achievement?: boolean) => void;
  closeLightbox: () => void;
  stepLightbox: (dir: 1 | -1) => void;
  jumpLightbox: (index: number) => void;

  skill: string | null;
  setSkill: (id: string | null) => void;

  expFocus: number | null;
  setExpFocus: (i: number | null) => void;

  /** Bumped by the About stat buttons / crystals: [statIndex, timestamp]. */
  statPulse: [number, number];
  pulseStat: (i: number) => void;

  /** Timestamps for one-shot effects. */
  heroPingAt: number;
  ping: () => void;
  connectAt: number;
  connect: () => void;
  likeAt: { id: string; t: number } | null;
  like: (id: string) => void;

  toast: { id: number; text: string; signature?: boolean } | null;
  showToast: (text: string, signature?: boolean) => void;

  assistantOpen: boolean;
  setAssistantOpen: (v: boolean) => void;

  /** Mobile bottom sheets (map, "More", project details). */
  sheet: "map" | "more" | "project" | null;
  setSheet: (s: "map" | "more" | "project" | null) => void;

  /** Certificate centred in the mobile carousel (the garage spotlight follows it). */
  certFocus: string | null;
  setCertFocus: (id: string | null) => void;
}

export const useApp = create<AppState>((set, get) => ({
  sheet: null,
  setSheet: (sheet) => set({ sheet }),
  certFocus: null,
  setCertFocus: (certFocus) => set({ certFocus }),
  tier: null,
  tierReason: "",
  setTier: (tier, reason) => set({ tier, tierReason: reason }),

  active: 0,
  setActive: (i) => (get().active === i ? undefined : set({ active: i })),

  project: 0,
  setProject: (i) => (get().project === i ? undefined : set({ project: i })),

  sceneReady: false,
  setSceneReady: (v) => set({ sceneReady: v }),
  loadingDone: false,
  setLoadingDone: (v) => set({ loadingDone: v }),
  loadProgress: 0,
  setLoadProgress: (v) => set({ loadProgress: v }),

  sound: false,
  setSound: (v) => set({ sound: v }),

  certFilter: "All",
  setCertFilter: (f) => set({ certFilter: f }),

  lightbox: null,
  openLightbox: (list, index, achievement = true) => set({ lightbox: { list, index, achievement } }),
  closeLightbox: () => set({ lightbox: null }),
  jumpLightbox: (index) => {
    const lb = get().lightbox;
    if (lb && index >= 0 && index < lb.list.length) set({ lightbox: { ...lb, index } });
  },
  stepLightbox: (dir) => {
    const lb = get().lightbox;
    if (!lb || lb.list.length < 2) return;
    set({ lightbox: { ...lb, index: (lb.index + dir + lb.list.length) % lb.list.length } });
  },

  skill: null,
  setSkill: (id) => set({ skill: id }),

  expFocus: null,
  setExpFocus: (i) => set({ expFocus: i }),

  statPulse: [-1, 0],
  pulseStat: (i) => set({ statPulse: [i, performance.now()] }),

  heroPingAt: 0,
  ping: () => set({ heroPingAt: performance.now() }),
  connectAt: 0,
  connect: () => set({ connectAt: performance.now() }),
  likeAt: null,
  like: (id) => set({ likeAt: { id, t: performance.now() } }),

  toast: null,
  showToast: (text, signature) => set({ toast: { id: Date.now(), text, signature } }),

  assistantOpen: false,
  setAssistantOpen: (v) => set({ assistantOpen: v }),
}));
