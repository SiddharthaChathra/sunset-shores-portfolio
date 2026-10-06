/**
 * Mutable per-frame state shared between the HTML scroll driver and the R3F scene.
 * Read inside useFrame; never put these in React state (they change every frame).
 */
export const rig = {
  /** Target world progress, 0..6 (integer = settled at a section stop). */
  world: 0,
  /** Signed scroll velocity in px/frame (smoothed). */
  velocity: 0,
  /** Continuous project progress 0..projects.length (inside the pinned Projects section). */
  project: 0,
  /** Normalised pointer, -1..1. */
  pointer: { x: 0, y: 0 },
  /** Device tilt from gyroscope, -1..1 (touch devices only). */
  tilt: { x: 0, y: 0, active: false },
  /** Hero drag-orbit yaw offset in radians (±25°). */
  orbit: 0,
  /** Set when the html Hero h1 lines are measured (px, at scroll 0). */
  heroName: null as null | {
    lines: { text: string; x: number; y: number; w: number; h: number; baseline: number }[];
    font: string;
    fontSize: number;
    letterSpacing: number;
    vw: number;
    vh: number;
  },
  /** Section metrics (px), refreshed on resize. */
  sections: [] as { top: number; height: number }[],
  scrollY: 0,
  maxScroll: 0,
  /** Capture mode (stills generation): hides HTML, snaps camera to stops. */
  capture: false,
};

export const smootherstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/**
 * Map a scroll position to world progress. Each section has a "hold" range in which the
 * camera stays at its stop; between holds the camera flies with a smootherstep ease so it
 * settles (zero velocity) exactly at each stop. Pure function of scroll → reverses exactly.
 */
export function worldFromScroll(y: number, vh: number): number {
  const s = rig.sections;
  if (s.length === 0) return 0;
  const max = rig.maxScroll;
  const holds = s.map(({ top, height }) => {
    const a = Math.min(top, max);
    const b = Math.min(Math.max(top, top + height - vh), max);
    return [a, Math.max(a, b)] as const;
  });
  if (y <= holds[0][1]) return 0;
  for (let i = 0; i < holds.length; i++) {
    const [a, b] = holds[i];
    if (y >= a && y <= b) return i;
    const next = holds[i + 1];
    if (next && y > b && y < next[0]) {
      return i + smootherstep((y - b) / Math.max(1, next[0] - b));
    }
  }
  return s.length - 1;
}
