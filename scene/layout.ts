import * as THREE from "three";
import { fbm } from "./noise";

/**
 * Sunset Shores world layout. The coast runs along −z; the ocean lies east (+x) of the coastline and
 * the low sun hangs over it. A coastal highway follows the camera's path between the seven stops.
 */
export interface Stop {
  cam: THREE.Vector3;
  target: THREE.Vector3;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const FOV = 40;
export const SEA_LEVEL = 0;

/** x of the shoreline at depth z (land is x < coastX). */
export const coastX = (z: number) => 30 + Math.sin(z * 0.017) * 7 + Math.sin(z * 0.043 + 1.3) * 2.5;
/** x of the coastal highway centreline at depth z. */
export const roadX = (z: number) => coastX(z) - 15;

/** Half-width of the highway (matches ROAD_WIDTH in props/Road.tsx) plus a kerb margin. */
const ROAD_CLEAR = 11 / 2 + 0.8;

/**
 * Pushes a set piece with a circular footprint of `radius` (centred on `p`, xz plane) sideways until
 * no part of it overlaps the road, keeping it on the side it was already on. Set pieces are placed in
 * screen space, so on wide screens they could otherwise drift onto the carriageway.
 */
export function keepOffRoad(p: THREE.Vector3, radius: number) {
  const side = Math.sign(p.x - roadX(p.z)) || 1;
  let x = p.x;
  for (let dz = -radius; dz <= radius; dz += 0.5) {
    const need = roadX(p.z + dz) + side * (ROAD_CLEAR + Math.sqrt(Math.max(0, radius * radius - dz * dz)));
    x = side > 0 ? Math.max(x, need) : Math.min(x, need);
  }
  return p.clone().setX(x);
}

export const STOPS: Stop[] = [
  { cam: v(roadX(14) + 1, 3.4, 14), target: v(roadX(-8) + 12, 3.2, -8) }, // hero: Ocean Drive
  { cam: v(roadX(-46) - 2, 17.5, -44), target: v(roadX(-60) - 14, 13.4, -62) }, // about: rooftop pool
  { cam: v(roadX(-92) + 2, 11.5, -92), target: v(roadX(-110) - 6, 10.5, -112) }, // projects: billboard highway
  { cam: v(roadX(-146), 4.2, -146), target: v(coastX(-164) - 2, 2.4, -166) }, // experience: beach café
  { cam: v(roadX(-196) + 2, 4.6, -196), target: v(roadX(-212) - 12, 3.4, -214) }, // certificates: garage
  { cam: v(roadX(-244) + 3, 5.4, -244), target: v(coastX(-262) + 8, 1.6, -262) }, // skills: marina
  { cam: v(coastX(-292) - 4, 4.2, -292), target: v(coastX(-306) + 20, 2.2, -308) }, // contact: pier
];

/** Low golden-hour sun, over the sea in the direction the pier faces. */
export const SUN_DIR = new THREE.Vector3(0.78, 0.06, -0.62).normalize();

function buildCurves() {
  const camPts: THREE.Vector3[] = [];
  const tgtPts: THREE.Vector3[] = [];
  STOPS.forEach((s, i) => {
    camPts.push(s.cam.clone());
    tgtPts.push(s.target.clone());
    const n = STOPS[i + 1];
    if (n) {
      // Between stops the camera drives low along the highway.
      const z = (s.cam.z + n.cam.z) / 2;
      // never below the road deck (the flyover between the billboards and the café)
      camPts.push(new THREE.Vector3(roadX(z) + 1.5, Math.max(3.2, Math.min(s.cam.y, n.cam.y) * 0.6, roadY(z) + 3.2), z));
      const t = s.target.clone().lerp(n.target, 0.5);
      t.z -= 6;
      tgtPts.push(t);
    }
  });
  return {
    cam: new THREE.CatmullRomCurve3(camPts, false, "centripetal", 0.5),
    target: new THREE.CatmullRomCurve3(tgtPts, false, "centripetal", 0.5),
    segments: camPts.length - 1,
  };
}

export const CURVES = buildCurves();

/** World progress (0..6) → spline parameter. Stops sit exactly on even control points. */
export function curveT(world: number) {
  return Math.min(1, Math.max(0, (world * 2) / CURVES.segments));
}

export function stopYaw(i: number) {
  const s = STOPS[i];
  return Math.atan2(s.cam.x - s.target.x, s.cam.z - s.target.z);
}

export function stopRight(i: number) {
  const yaw = stopYaw(i);
  return new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
}

/** Ground height: low dunes inland, a beach slope at the coast, sea floor offshore. */
export function terrainHeight(x: number, z: number): number {
  const h = naturalHeight(x, z);
  // Grade the road corridor: flat under the carriageway, blending back to the dunes over the shoulders,
  // so the asphalt always sits on the ground (no sand poking through, no floating edges).
  const dr = Math.abs(x - roadX(z));
  const w = THREE.MathUtils.smoothstep(dr, 11 / 2 + 0.8, 11 / 2 + 7);
  return THREE.MathUtils.lerp(ROAD_BED, h, w);
}

/** Ground level under the road corridor (just below the asphalt at street level). */
const ROAD_BED = 0.26;

function naturalHeight(x: number, z: number): number {
  const d = x - coastX(z); // >0 offshore
  const inland = fbm(x * 0.02 + 7, z * 0.02, 4) * 1.6 + 0.5;
  if (d < -8) return inland * THREE.MathUtils.smoothstep(-d, 8, 40) + 0.35;
  if (d < 6) {
    // beach: gentle slope from the promenade down into the water
    const k = (d + 8) / 14;
    return THREE.MathUtils.lerp(0.35, -0.8, k * k);
  }
  return -0.8 - Math.min(10, (d - 6) * 0.18);
}

export const TERRAIN_BOUNDS = { minX: -120, maxX: 120, minZ: -380, maxZ: 70 };

/** Road surface height at depth z (elevated through the billboard highway). */
export function roadY(z: number) {
  const hz = -102;
  const k = 1 - THREE.MathUtils.smoothstep(Math.abs(z - hz), 14, 34);
  return 0.38 + k * 8.2;
}
