"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { theme } from "@/theme/theme";
import { GeoBuilder } from "./geo";
import { decoMaterial, neonMaterial } from "../fx/materials";
import { hash } from "../noise";

export interface DecoSpec {
  pos: THREE.Vector3;
  yaw: number;
  w: number;
  d: number;
  h: number;
  seed: number;
}

const NEON = [theme.materials.neon.pink, theme.materials.neon.teal, theme.materials.neon.orange];

/** Art-deco building: pastel body, stepped crown, white eyebrow bands, glass strips, centre fin. */
export function decoGeometry(s: DecoSpec) {
  const b = new GeoBuilder();
  const pal = theme.materials.deco;
  const body = pal[Math.floor(hash(s.seed) * pal.length)];
  const trim = "#FFFFFF";
  const glass = "#7FB3C8";
  const { w, d, h } = s;
  b.box(w, h, d, 0, h / 2, 0, body);
  // stepped crown
  b.box(w * 0.7, h * 0.12, d * 0.8, 0, h + h * 0.06, 0, body);
  b.box(w * 0.4, h * 0.1, d * 0.6, 0, h + h * 0.17, 0, trim);
  // eyebrow bands + glass strips per floor
  const floors = Math.max(2, Math.round(h / 3));
  for (let f = 0; f < floors; f++) {
    const y = 2 + f * ((h - 2.5) / floors);
    b.box(w + 0.3, 0.16, d + 0.3, 0, y + 1.25, 0, trim);
    b.box(w * 0.8, 0.9, 0.06, 0, y + 0.55, d / 2 + 0.02, glass);
  }
  // centre fin
  b.box(0.5, h * 0.95, 0.5, 0, h * 0.55, d / 2 + 0.25, trim);
  // ground floor porch
  b.box(w * 0.5, 0.25, 1.6, 0, 2.1, d / 2 + 0.8, trim);
  const geo = b.build();
  // neon: vertical along the fin + horizontal under the crown
  const n1 = new THREE.BoxGeometry(0.08, h * 0.8, 0.08);
  n1.translate(0.32, h * 0.52, d / 2 + 0.52);
  const n2 = new THREE.BoxGeometry(w * 0.72, 0.08, 0.08);
  n2.translate(0, h - 0.05, d / 2 + 0.06);
  const neon = mergeGeometries([n1, n2], false);
  return { geo, neon, neonColor: NEON[Math.floor(hash(s.seed * 1.7) * NEON.length)] };
}

const bodyMat = decoMaterial();
const neonMats = Object.fromEntries(NEON.map((c) => [c, neonMaterial(c, 2.6)]));

type Built = { s: DecoSpec } & ReturnType<typeof decoGeometry>;

/**
 * A row of deco buildings; each building is 2 draw calls (body + neon). Geometry is built a few
 * buildings per task (behind the loading screen) instead of all at once in the first render.
 */
export function DecoRow({ specs }: { specs: DecoSpec[] }) {
  const [built, setBuilt] = useState<Built[]>([]);
  useEffect(() => {
    let cancelled = false;
    let i = 0;
    const out: Built[] = [];
    const step = () => {
      if (cancelled) return;
      const end = Math.min(specs.length, i + 8);
      for (; i < end; i++) out.push({ s: specs[i], ...decoGeometry(specs[i]) });
      setBuilt([...out]);
      if (i < specs.length) setTimeout(step, 0);
    };
    step();
    return () => {
      cancelled = true;
    };
  }, [specs]);
  return (
    <>
      {built.map(({ s, geo, neon, neonColor }, i) => (
        <group key={i} position={s.pos} rotation-y={s.yaw}>
          <mesh geometry={geo} material={bodyMat} />
          <mesh geometry={neon} material={neonMats[neonColor]} />
        </group>
      ))}
    </>
  );
}
