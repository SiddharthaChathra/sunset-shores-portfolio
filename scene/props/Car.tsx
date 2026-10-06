"use client";

import { forwardRef, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as THREE from "three";
import { theme } from "@/theme/theme";
import { paintMaterial } from "../fx/materials";
import { roadX, roadY } from "../layout";
import { sfx } from "@/lib/audio";

const chrome = new THREE.MeshStandardMaterial({ color: theme.materials.chrome, metalness: 1, roughness: 0.18 });
const tyre = new THREE.MeshStandardMaterial({ color: "#2B2838", roughness: 0.85 });
const seat = new THREE.MeshStandardMaterial({ color: "#FFF1E2", roughness: 0.6 });
const glass = new THREE.MeshPhysicalMaterial({ color: "#C9F0EA", transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0 });
const tail = new THREE.MeshBasicMaterial({ color: new THREE.Color("#FF3B5C").multiplyScalar(2.2), toneMapped: false });

/** Car parts merged per material, built once and shared by every car (7 draw calls per car instead of 21). */
const CAR = (() => {
  const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, rz = 0) =>
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(1, 1, 1)));
  const merge = (parts: THREE.BufferGeometry[]) => {
    const g = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    g.computeBoundingSphere();
    return g;
  };
  const wheels: [number, number][] = [
    [-0.85, -1.35],
    [0.85, -1.35],
    [-0.85, 1.35],
    [0.85, 1.35],
  ];
  return {
    paint: merge([at(new RoundedBoxGeometry(1.85, 0.62, 4.4, 3, 0.22), 0, 0.62, 0), at(new RoundedBoxGeometry(1.7, 0.3, 1.6, 2, 0.12), 0, 0.98, 1.2)]),
    glass: at(new THREE.PlaneGeometry(1.6, 0.6), 0, 1.18, -0.55, -0.55),
    seat: merge(
      [-0.42, 0.42].flatMap((x) => [at(new THREE.BoxGeometry(0.62, 0.18, 0.62), x, 1.0, 0.1), at(new THREE.BoxGeometry(0.6, 0.6, 0.16), x, 1.33, 0.38, -0.25)]),
    ),
    chrome: merge([
      at(new THREE.BoxGeometry(1.8, 0.14, 0.12), 0, 0.48, -2.22),
      at(new THREE.BoxGeometry(1.8, 0.14, 0.12), 0, 0.48, 2.22),
      ...wheels.map(([x, z]) => at(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 10), x + (x > 0 ? 0.14 : -0.14), 0.36, z, 0, Math.PI / 2)),
    ]),
    tyre: merge(wheels.map(([x, z]) => at(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14), x, 0.36, z, 0, Math.PI / 2))),
    head: merge([-0.62, 0.62].map((x) => at(new THREE.BoxGeometry(0.36, 0.14, 0.04), x, 0.72, -2.21))),
    tail: merge([-0.62, 0.62].map((x) => at(new THREE.BoxGeometry(0.36, 0.1, 0.04), x, 0.75, 2.21))),
  };
})();

/** Original low-poly convertible (≈ 4.4 m), built from primitives. Facing −z. */
export const Convertible = forwardRef<THREE.Group, { color?: string; headlights?: number }>(function Convertible({ color = theme.materials.carPaint, headlights = 1 }, ref) {
  const paint = useMemo(() => paintMaterial(color), [color]);
  const head = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFF6E6").multiplyScalar(1.4 + headlights * 2), toneMapped: false }), [headlights]);
  return (
    <group ref={ref} userData={{ vehicle: true }}>
      <mesh geometry={CAR.paint} material={paint} />
      <mesh geometry={CAR.glass} material={glass} />
      <mesh geometry={CAR.seat} material={seat} />
      <mesh geometry={CAR.chrome} material={chrome} />
      <mesh geometry={CAR.tyre} material={tyre} />
      <mesh geometry={CAR.head} material={head} />
      <mesh geometry={CAR.tail} material={tail} />
    </group>
  );
});

/* ---------- Traffic ---------- */

/** Lane loop: cars wrap behind the hero camera (z = 60) and far down the coast in the haze. */
const Z_NEAR = 60;
const Z_FAR = -380;
const LOOP = Z_NEAR - Z_FAR;
const LANE_OFFSET = 2.7;
/** Bumper-to-bumper gap a car keeps (m), plus its own length. */
const CAR_LEN = 4.6;
const MIN_GAP = 6;
const HEADWAY = 1.1; // seconds of following distance

interface Driver {
  lane: 1 | -1; // 1: sea-side lane heading down the coast (−z); −1: land-side lane heading back (+z)
  s: number; // distance travelled along the lane loop
  v: number;
  v0: number; // desired speed (m/s)
  color: string;
}

const tmp = new THREE.Vector3();
const ahead = new THREE.Vector3();

/** World position on a lane at loop distance s. */
function lanePoint(lane: 1 | -1, s: number, out: THREE.Vector3) {
  const d = ((s % LOOP) + LOOP) % LOOP;
  const z = lane === 1 ? Z_NEAR - d : Z_FAR + d;
  return out.set(roadX(z) + lane * LANE_OFFSET, roadY(z), z);
}

/**
 * Background traffic with a simple car-following model (IDM): each lane has its own direction, every
 * car keeps a safe gap and slows behind a slower car, so cars never overlap. Cars follow the road's
 * curve and pitch up and down the flyover ramps. Tap a car to honk and flash its headlights.
 */
export function Traffic({ count = 6 }: { count?: number }) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const [flash, setFlash] = useState(-1);
  const flashT = useRef(0);
  const streak = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#FF4F8B").multiplyScalar(1.6), transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false }), []);
  const drivers = useMemo<Driver[]>(() => {
    const colors = [theme.materials.carPaint, "#FFFFFF", "#2EC4B6", "#FF9F43", "#C9B8FF", "#FFD1DC", "#7FD8F0"];
    // Two thirds head down the coast past the hero camera (that lane is what the hero shot sees).
    const down = Math.max(1, Math.round(count * 0.66));
    return Array.from({ length: count }, (_, i) => {
      const lane: 1 | -1 = i < down ? 1 : -1;
      const k = lane === 1 ? i : i - down;
      const n = lane === 1 ? down : count - down;
      const v0 = 12 + ((i * 37) % 7) * 0.6; // 12–15.6 m/s, varied so the following model has work to do
      return { lane, s: (k / n) * LOOP + (lane === 1 ? 20 : 0), v: v0, v0, color: colors[i % colors.length] };
    });
  }, [count]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 1 / 20);
    // Intelligent-driver acceleration toward v0, braking for the car ahead in the same lane.
    for (const a of drivers) {
      let gap = Infinity;
      let dv = 0;
      for (const b of drivers) {
        if (b === a || b.lane !== a.lane) continue;
        const g = (((b.s - a.s) % LOOP) + LOOP) % LOOP - CAR_LEN;
        if (g < gap) {
          gap = g;
          dv = a.v - b.v;
        }
      }
      const sStar = MIN_GAP + a.v * HEADWAY + (a.v * dv) / (2 * Math.sqrt(2.2 * 3.5));
      const acc = 2.2 * (1 - Math.pow(a.v / a.v0, 4) - Math.pow(Math.max(0, sStar) / Math.max(0.5, gap), 2));
      a.v = Math.max(0, Math.min(a.v0 * 1.05, a.v + acc * d));
    }
    drivers.forEach((a, i) => {
      a.s += a.v * d;
      const g = groups.current[i];
      if (!g) return;
      lanePoint(a.lane, a.s, tmp);
      lanePoint(a.lane, a.s + 2.2, ahead); // a point just ahead: heading + pitch follow the road
      g.position.copy(tmp);
      // The car's nose is local −z, and lookAt aims +z: look at the point behind.
      g.lookAt(tmp.multiplyScalar(2).sub(ahead));
    });
    if (flashT.current > 0) {
      flashT.current = Math.max(0, flashT.current - d);
      if (flashT.current === 0) setFlash(-1);
    }
  });

  const honk = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    sfx("horn");
    flashT.current = 0.9;
    setFlash(i);
  };

  return (
    <>
      {drivers.map((dr, i) => (
        <group
          key={i}
          ref={(el) => void (groups.current[i] = el)}
          scale={0.95}
          userData={{ vehicle: true }}
          onClick={honk(i)}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}
        >
          <Convertible color={dr.color} headlights={flash === i ? 1 : 0.35} />
          <mesh position={[0, 0.75, 4.6]} material={streak}>
            <boxGeometry args={[1.4, 0.06, 4.5]} />
          </mesh>
        </group>
      ))}
    </>
  );
}
