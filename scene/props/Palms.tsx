"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { theme } from "@/theme/theme";
import { addSway, gust, swayPhase } from "../fx/materials";
import { hash } from "../noise";

/** One palm: tapered curved trunk with ring texture + 10 drooping fronds + coconuts (vertex-coloured). */
function palmGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const colorize = (g: THREE.BufferGeometry, fn: (y: number, x: number) => THREE.Color) => {
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const c = fn(p.getY(i), p.getX(i));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.deleteAttribute("uv");
    return g;
  };
  const H = 9;
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.4, H * 0.4, 0), new THREE.Vector3(1.2, H * 0.8, 0.2), new THREE.Vector3(1.8, H, 0.3)]);
  const trunk = new THREE.TubeGeometry(curve, 24, 0.24, 7, false);
  const tp = trunk.attributes.position;
  const centre = new THREE.Vector3();
  for (let i = 0; i < tp.count; i++) {
    const y = tp.getY(i);
    curve.getPoint(Math.min(1, Math.max(0, y / H)), centre);
    const k = 1.15 - (y / H) * 0.45;
    tp.setX(i, centre.x + (tp.getX(i) - centre.x) * k);
    tp.setZ(i, centre.z + (tp.getZ(i) - centre.z) * k);
  }
  const bark = new THREE.Color(theme.materials.palmTrunk);
  const barkLight = bark.clone().offsetHSL(0, 0, 0.1);
  parts.push(colorize(trunk.toNonIndexed(), (y) => (Math.floor(y * 3) % 2 ? bark : barkLight)));
  const top = new THREE.Vector3(1.8, H, 0.3);
  const leaf = new THREE.Color(theme.materials.palmLeaf);
  const leafLight = leaf.clone().offsetHSL(0.02, 0.05, 0.14);
  for (let f = 0; f < 10; f++) {
    const len = 4.2 + hash(f + 3) * 1.4;
    const g = new THREE.PlaneGeometry(1, len, 1, 8);
    g.translate(0, len / 2, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const t = y / len;
      const w = Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.7;
      p.setX(i, p.getX(i) * w * 1.6);
      p.setZ(i, -t * t * len * 0.75); // droop
      p.setY(i, y * 0.95);
    }
    const m = new THREE.Matrix4()
      .makeRotationY((f / 10) * Math.PI * 2 + hash(f) * 0.3)
      .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2 + 0.55 + hash(f * 2) * 0.25));
    g.applyMatrix4(m);
    g.translate(top.x, top.y, top.z);
    parts.push(colorize(g.toNonIndexed(), (y) => (y > H + 0.6 ? leafLight : leaf)));
  }
  for (let k = 0; k < 4; k++) {
    const s = new THREE.SphereGeometry(0.22, 6, 5);
    s.translate(top.x + Math.cos(k * 1.6) * 0.3, top.y - 0.35, top.z + Math.sin(k * 1.6) * 0.3);
    parts.push(colorize(s.toNonIndexed(), () => new THREE.Color("#6B4E2E")));
  }
  const g = mergeGeometries(parts, false);
  g.computeVertexNormals();
  return g;
}

let shared: THREE.BufferGeometry | null = null;
let lastTick = -1;
const material = addSway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));

/**
 * Instanced palms with wind sway. Hovering or tapping a palm (cheap cylinder proxies) sends a soft gust
 * rippling outward: nearby palms bend away once and settle.
 */
export function Palms({ points, scale = 1 }: { points: THREE.Vector3[]; scale?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const proxy = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => (shared ??= palmGeometry()), []);
  const proxyGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(1.4, 0.6, 10, 6);
    g.translate(1, 5, 0);
    return g;
  }, []);
  const proxyMat = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), []);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    points.forEach((p, i) => {
      o.position.copy(p);
      o.rotation.set(0, hash(i * 7.1 + p.x) * Math.PI * 2, 0);
      o.scale.setScalar(scale * (0.8 + hash(i * 3.3 + p.z) * 0.45));
      o.updateMatrix();
      ref.current?.setMatrixAt(i, o.matrix);
      proxy.current?.setMatrixAt(i, o.matrix);
    });
    [ref.current, proxy.current].forEach((m) => {
      if (!m) return;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    });
  }, [points, scale]);

  useFrame(({ clock }, dt) => {
    // several Palms instances share the breeze and the gust: advance them once per frame
    if (lastTick === clock.elapsedTime) return;
    lastTick = clock.elapsedTime;
    const d = Math.min(dt, 0.1);
    swayPhase.value += d * 1.1;
    gust.age.value = Math.min(99, gust.age.value + d);
  });

  return (
    <>
      <instancedMesh ref={ref} args={[geometry, material, points.length]} />
      <instancedMesh
        ref={proxy}
        args={[proxyGeo, proxyMat, points.length]}
        onPointerOver={(e) => {
          e.stopPropagation();
          // one gust at a time: sweeping the cursor across a row of palms doesn't restart it
          if (gust.age.value < 2.2) return;
          gust.pos.value.copy(e.point);
          gust.age.value = 0;
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (gust.age.value < 0.6) return;
          gust.pos.value.copy(e.point);
          gust.age.value = 0;
        }}
      />
    </>
  );
}
