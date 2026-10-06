"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rig } from "@/lib/rig";
import { useDeviceMode } from "@/lib/device";
import { CURVES, curveT, roadX, roadY, STOPS } from "./layout";

const pos = new THREE.Vector3();
const look = new THREE.Vector3();
const off = new THREE.Vector3();
const right = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** Mutable camera state other scene parts can read (damped world progress etc.). */
export const camState = { world: 0, heroWeight: 1, px: 0, py: 0 };

/**
 * Scroll-driven spline camera. World progress is damped (critically, frame-rate independent) so
 * scrolling feels weighty; at stops the smootherstep mapping gives zero velocity → no jitter.
 */
export function CameraRig() {
  const damped = useRef(0);
  const mode = useDeviceMode();
  const stacked = mode === "phone" || mode === "tabp";
  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20);
    const target = rig.world;
    damped.current = rig.capture ? target : THREE.MathUtils.damp(damped.current, target, 3.2, d);
    if (Math.abs(damped.current - target) < 1e-4) damped.current = target;
    const w = damped.current;
    camState.world = w;
    camState.heroWeight = 1 - THREE.MathUtils.smoothstep(w, 0, 0.6);

    const t = curveT(w);
    CURVES.cam.getPoint(t, pos);
    CURVES.target.getPoint(t, look);

    // Never dip under the road deck between control points (the spline can sag on the flyover descent).
    if (Math.abs(pos.x - roadX(pos.z)) < 9) pos.y = Math.max(pos.y, roadY(pos.z) + 2.6);

    // Billboard highway: the camera dollies forward along the flyover through the four projects.
    // (phones/tablets in portrait keep the camera still: the billboards slide sideways instead)
    const pw = stacked ? 0 : 1 - THREE.MathUtils.smoothstep(Math.abs(w - 2), 0.15, 0.6);
    if (pw > 0) {
      off.copy(look).sub(pos).setY(0).normalize();
      const dolly = (rig.project - 2) * 2.2 * pw;
      pos.addScaledVector(off, dolly);
      look.addScaledVector(off, dolly);
    }

    // Inside a stop's scroll hold the camera keeps moving: a slow orbit (±6°) and push-in tied to how far
    // you've scrolled through that section. Weighted by distance to each neighbouring stop so it blends
    // continuously into the flights between stops. (Projects has its own dolly above.)
    if (!rig.capture && rig.sections.length) {
      let yawH = 0;
      let push = 0;
      for (const i of new Set([Math.floor(w), Math.ceil(w)])) {
        if (i === 2 || !rig.sections[i]) continue;
        const wt = 1 - THREE.MathUtils.smoothstep(Math.abs(w - i), 0.1, 0.5);
        if (wt <= 0) continue;
        const h = holdT(i, state.size.height) - 0.5;
        yawH += h * 0.21 * wt;
        push += h * 3 * wt;
      }
      if (Math.abs(yawH) > 1e-5) {
        off.copy(pos).sub(look).applyAxisAngle(UP, yawH);
        pos.copy(look).add(off);
        pos.addScaledVector(off.normalize(), -push);
      }
    }

    // Hero drag-orbit (±25°) around the look target, fading out as you leave the hero.
    const yaw = rig.orbit * camState.heroWeight;
    if (Math.abs(yaw) > 1e-4) {
      off.copy(pos).sub(look).applyAxisAngle(UP, yaw);
      pos.copy(look).add(off);
    }

    // Cursor / gyro parallax: the scene tilts slightly (≈ ±3°) toward the pointer.
    const src = rig.tilt.active ? rig.tilt : rig.pointer;
    const k = 1 - Math.exp(-3 * d);
    camState.px += (src.x - camState.px) * k;
    camState.py += (src.y - camState.py) * k;
    if (!rig.capture) {
      const dist = pos.distanceTo(look);
      const amp = Math.tan(THREE.MathUtils.degToRad(3)) * dist;
      right.copy(look).sub(pos).cross(UP).normalize();
      pos.addScaledVector(right, camState.px * amp * 0.6);
      pos.y += -camState.py * amp * 0.35;
    }

    state.camera.position.copy(pos);
    state.camera.lookAt(look);
  });
  return null;
}

/** How far (0..1) the page has scrolled through section i's hold; 0.5 for sections without one. */
function holdT(i: number, vh: number) {
  const sec = rig.sections[i];
  const a = Math.min(sec.top, rig.maxScroll);
  const b = Math.min(sec.top + sec.height - vh, rig.maxScroll);
  if (b - a < 40) return 0.5;
  return THREE.MathUtils.clamp((rig.scrollY - a) / (b - a), 0, 1);
}

/** Index of the nearest stop and how settled the camera is there (1 = exactly at the stop). */
export function stopPresence(i: number) {
  const d = Math.abs(camState.world - i);
  return 1 - THREE.MathUtils.smoothstep(d, 0.15, 0.85);
}

export { STOPS };
