/// <reference lib="webworker" />
/** Builds the coastline terrain off the main thread: heights (regular grid) and vertex colours. */
import * as THREE from "three";
import { theme } from "@/theme/theme";
import { fbm } from "./noise";
import { TERRAIN_BOUNDS, coastX, roadX, terrainHeight } from "./layout";

export interface TerrainRequest {
  segX: number;
  segZ: number;
}
export interface TerrainResult {
  segX: number;
  segZ: number;
  heights: Float32Array;
  colors: Float32Array;
}

function build({ segX, segZ }: TerrainRequest): TerrainResult {
  const { minX, maxX, minZ, maxZ } = TERRAIN_BOUNDS;
  const w = segX + 1;
  const h = segZ + 1;
  const heights = new Float32Array(w * h);
  const colors = new Float32Array(w * h * 3);
  const sand = new THREE.Color(theme.materials.sand);
  const wet = new THREE.Color(theme.materials.sandWet);
  const grass = new THREE.Color(theme.materials.grass);
  const plaza = new THREE.Color(theme.materials.concrete);
  const c = new THREE.Color();
  // Rows run minZ → maxZ, columns minX → maxX (PlaneGeometry rotated -90° about X).
  for (let j = 0; j < h; j++) {
    const z = minZ + (j / segZ) * (maxZ - minZ);
    const cx = coastX(z);
    const rx = roadX(z);
    for (let i = 0; i < w; i++) {
      const x = minX + (i / segX) * (maxX - minX);
      const k = j * w + i;
      heights[k] = terrainHeight(x, z);
      const d = x - cx;
      if (d > -9) {
        c.copy(sand).lerp(wet, THREE.MathUtils.smoothstep(d, -3, 1));
      } else if (Math.abs(x - rx) < 9) {
        c.copy(plaza); // promenade either side of the highway
      } else {
        const g = THREE.MathUtils.smoothstep(fbm(x * 0.05, z * 0.05, 3), -0.2, 0.35);
        c.copy(sand).lerp(grass, 0.35 + g * 0.5);
      }
      const grain = fbm(x * 0.7, z * 0.7, 2) * 0.035;
      colors[k * 3] = c.r + grain;
      colors[k * 3 + 1] = c.g + grain;
      colors[k * 3 + 2] = c.b + grain;
    }
  }
  return { segX, segZ, heights, colors };
}

self.onmessage = (e: MessageEvent<TerrainRequest>) => {
  const r = build(e.data);
  (self as unknown as Worker).postMessage(r, [r.heights.buffer, r.colors.buffer]);
};
