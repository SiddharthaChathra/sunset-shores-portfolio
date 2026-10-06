"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { STOPS, TERRAIN_BOUNDS, coastX, roadX, roadY, terrainHeight } from "../layout";
import { hash } from "../noise";
import { DecoRow, type DecoSpec } from "./Deco";
import { Palms } from "./Palms";
import { compileState } from "../SceneRoot";

/** z-ranges kept clear for stop-specific set pieces (rooftop pool, billboards, garage). */
const CLEAR: [number, number][] = [
  [-72, -50],
  [-124, -96],
  [-226, -200],
];
const isClear = (z: number) => CLEAR.some(([a, b]) => z > a && z < b);
/** Keep palms out of the lens: nothing within 16 m of a camera stop. */
const nearCam = (x: number, z: number) => STOPS.some((s) => Math.hypot(x - s.cam.x, z - s.cam.z) < 16);

const SEGMENT = 60;
/** Segments further than this (along z) from the camera are hidden: the haze hides the cut. */
const DRAW_AHEAD = 170;
const DRAW_BEHIND = 40;

interface Segment {
  z: number;
  front: DecoSpec[];
  back: DecoSpec[];
  palms: THREE.Vector3[];
}

/** One 60 m stretch of street; hidden when far from the camera (keeps draw calls and triangles bounded). */
function StreetSegment({ seg }: { seg: Segment }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (!g.current) return;
    const dz = camera.position.z - seg.z; // > 0: segment is ahead (the camera faces −z)
    g.current.visible = compileState.all || (dz < DRAW_AHEAD + SEGMENT && dz > -DRAW_BEHIND - SEGMENT);
  });
  return (
    <group ref={g}>
      <DecoRow specs={seg.front} />
      <DecoRow specs={seg.back} />
      {seg.palms.length > 0 && <Palms points={seg.palms} />}
    </group>
  );
}

/** Art-deco hotel strip + inland skyline + palm-lined promenade along the whole coastal highway. */
export function Street({ density = 1 }: { density?: number }) {
  const segments = useMemo(() => {
    const { minZ, maxZ } = TERRAIN_BOUNDS;
    const segs = new Map<number, Segment>();
    const segOf = (z: number) => {
      const k = Math.floor((maxZ - z) / SEGMENT);
      let s = segs.get(k);
      if (!s) {
        s = { z: maxZ - (k + 0.5) * SEGMENT, front: [], back: [], palms: [] };
        segs.set(k, s);
      }
      return s;
    };
    let i = 0;
    for (let z = maxZ - 6; z > minZ + 10; z -= 15 / density) {
      i++;
      if (!isClear(z)) {
        const w = 9 + hash(i) * 5;
        const d = 9 + hash(i * 2.3) * 3;
        const h = 8 + hash(i * 4.1) * 9;
        const x = roadX(z) - 9 - d / 2;
        segOf(z).front.push({ pos: new THREE.Vector3(x, terrainHeight(x, z) - 0.2, z), yaw: Math.PI / 2, w, d, h, seed: i });
      }
      if (i % 2 === 0) {
        const x = roadX(z) - 34 - hash(i * 7) * 10;
        const h = 14 + hash(i * 9.7) * 16;
        segOf(z).back.push({ pos: new THREE.Vector3(x, terrainHeight(x, z) - 0.2, z + 4), yaw: Math.PI / 2, w: 12, d: 12, h, seed: i + 100 });
      }
    }
    for (let z = maxZ - 2; z > minZ; z -= 9 / density) {
      if (roadY(z) > 1.2) continue; // no palms on the flyover
      const sea = roadX(z) + 7.6;
      const land = roadX(z) - 7.4;
      if (!nearCam(sea, z)) segOf(z).palms.push(new THREE.Vector3(sea, terrainHeight(sea, z), z));
      if (!isClear(z) && !nearCam(land, z + 4.5)) segOf(z + 4.5).palms.push(new THREE.Vector3(land, terrainHeight(land, z + 4.5), z + 4.5));
    }
    // a few beach palms
    for (let k = 0; k < 26 * density; k++) {
      const z = maxZ - hash(k * 3.7) * (maxZ - minZ);
      const x = coastX(z) - 4 - hash(k * 1.3) * 5;
      if (!nearCam(x, z)) segOf(z).palms.push(new THREE.Vector3(x, terrainHeight(x, z), z));
    }
    return [...segs.values()];
  }, [density]);

  return (
    <>
      {segments.map((seg) => (
        <StreetSegment key={seg.z} seg={seg} />
      ))}
    </>
  );
}
