"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { STOPS, TERRAIN_BOUNDS, roadX, roadY } from "../layout";
import { GeoBuilder, vertexColorMaterial } from "./geo";
import { neonMaterial, roadMaterial } from "../fx/materials";

export const ROAD_WIDTH = 11;

/** Coastal highway: asphalt ribbon, a solid body/embankment and parapets where it is elevated, kerbs at street level. */
export function Road() {
  const { road, structure, lamps } = useMemo(() => {
    const { minZ, maxZ } = TERRAIN_BOUNDS;
    const n = 360;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    let along = 0;
    let prev: THREE.Vector3 | null = null;
    for (let i = 0; i <= n; i++) {
      const z = maxZ - (i / n) * (maxZ - minZ);
      const c = new THREE.Vector3(roadX(z), roadY(z), z);
      if (prev) along += c.distanceTo(prev);
      prev = c;
      const dx = roadX(z - 0.5) - roadX(z + 0.5);
      const side = new THREE.Vector3(1, 0, dx).normalize().multiplyScalar(ROAD_WIDTH / 2);
      pos.push(c.x - side.x, c.y, c.z - side.z, c.x + side.x, c.y, c.z + side.z);
      uv.push(0, along, 1, along);
      if (i < n) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); // counter-clockwise from above: faces up
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();

    // Road body, edging and supports, all extruded along the same samples as the ribbon so they follow
    // its curve and slope exactly (no stair-stepped boxes, no floating ramp ends).
    const b = new GeoBuilder();
    const samples = Array.from({ length: n + 1 }, (_, i) => {
      const z = maxZ - (i / n) * (maxZ - minZ);
      const dx = roadX(z - 0.5) - roadX(z + 0.5);
      return { z, x: roadX(z), y: roadY(z), side: new THREE.Vector3(1, 0, dx).normalize() };
    });
    const HALF = ROAD_WIDTH / 2;
    /** Extrude a box section between lateral offsets o1 < o2 with per-sample top/bottom heights. */
    const extrude = (o1: number, o2: number, top: (y: number) => number, bot: (y: number, i: number) => number, color: string, when: (y: number) => boolean = () => true) => {
      const pos: number[] = [];
      const quad = (a: THREE.Vector3, b2: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => pos.push(...a.toArray(), ...b2.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray());
      for (let i = 0; i < n; i++) {
        const A = samples[i];
        const B = samples[i + 1];
        if (!when(A.y) && !when(B.y)) continue;
        const pt = (S: typeof A, o: number, h: number) => new THREE.Vector3(S.x + S.side.x * o, h, S.z + S.side.z * o);
        const [ta, tb] = [top(A.y), top(B.y)];
        const [ba, bb] = [bot(A.y, i), bot(B.y, i + 1)];
        // top, outer sides (both), bottom — wound so normals face outward (B is further along −z)
        quad(pt(A, o1, ta), pt(A, o2, ta), pt(B, o2, tb), pt(B, o1, tb));
        quad(pt(A, o2, ta), pt(A, o2, ba), pt(B, o2, bb), pt(B, o2, tb));
        quad(pt(A, o1, ba), pt(A, o1, ta), pt(B, o1, tb), pt(B, o1, bb));
        quad(pt(A, o1, ba), pt(B, o1, bb), pt(B, o2, bb), pt(A, o2, ba));
      }
      if (!pos.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      b.add(g, color);
    };
    const GROUND = 0.2; // terrain is graded to ~0.26 under the road corridor
    const elevated = (y: number) => y > 0.5;
    // Deck / embankment: a solid body under the asphalt. Low ramps reach the ground (embankment);
    // higher up it becomes a 1.1 m deck slab carried by pillars.
    extrude(-HALF - 0.4, HALF + 0.4, (y) => y - 0.03, (y) => (y - 1.1 < GROUND + 1.6 ? GROUND - 0.3 : y - 1.1), "#E7D9CE", elevated);
    // Parapets on the elevated section, kerbs at street level (continuous, both sides).
    for (const sgn of [-1, 1]) {
      const o = sgn * (HALF + 0.2);
      extrude(o - 0.18, o + 0.18, (y) => y + 1.0, (y) => y - 0.03, "#FFFFFF", elevated);
      extrude(o - 0.25, o + 0.25, (y) => y + 0.16, (y) => y - 0.2, "#EFE3D6", (y) => !elevated(y));
    }
    // Pillars where there is real clearance under the deck.
    samples.forEach(({ x, y, z }, i) => {
      if (i % 10 === 0 && y - 1.1 > GROUND + 1.6) b.box(1.4, y - 1.1 - GROUND, 1.4, x, GROUND + (y - 1.1 - GROUND) / 2, z, "#EFE6DD");
    });
    // Streetlights along the whole road.
    const lampPts: THREE.Vector3[] = [];
    for (let z = maxZ - 4; z > minZ; z -= 6) {
      const y = roadY(z);
      const x = roadX(z);
      if (Math.round(z) % 18 === 0 && !STOPS.some((st) => Math.hypot(x + ROAD_WIDTH / 2 - st.cam.x, z - st.cam.z) < 16)) {
        const lx = x + ROAD_WIDTH / 2 + 0.9;
        b.cyl(0.08, 0.12, 6, lx, y + 3, z, "#4A4566", 6);
        b.box(1.4, 0.12, 0.25, lx - 0.7, y + 6, z, "#4A4566");
        lampPts.push(new THREE.Vector3(lx - 1.3, y + 5.85, z));
      }
    }
    const lampGeo = new THREE.BoxGeometry(0.5, 0.12, 0.3);
    return { road: g, structure: b.build(), lamps: { geo: lampGeo, pts: lampPts } };
  }, []);

  const roadMat = useMemo(() => roadMaterial(), []);
  const lampMat = useMemo(() => neonMaterial("#FFE2B8", 2.2), []);
  const structureMat = useMemo(() => {
    const m = vertexColorMaterial(0.8);
    m.side = THREE.DoubleSide; // extruded panels: never culled whichever way a face is wound
    return m;
  }, []);

  return (
    <>
      <mesh geometry={road} material={roadMat} position={[0, 0.02, 0]} userData={{ road: true }} />
      <mesh geometry={structure} material={structureMat} />
      <instancedMesh
        args={[lamps.geo, lampMat, lamps.pts.length]}
        ref={(m) => {
          if (!m) return;
          const o = new THREE.Object3D();
          lamps.pts.forEach((p, i) => {
            o.position.copy(p);
            o.updateMatrix();
            m.setMatrixAt(i, o.matrix);
          });
          m.instanceMatrix.needsUpdate = true;
          m.computeBoundingSphere();
        }}
      />
    </>
  );
}
