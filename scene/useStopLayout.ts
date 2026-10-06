"use client";

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FOV, STOPS, stopRight, stopYaw, terrainHeight } from "./layout";

/**
 * Layout helpers for the scene at stop `i`, in screen fractions at the target's depth:
 * `at(sx, dy, dz)` → world point where sx ∈ [-1, 1] is the horizontal screen position once the camera
 * settles at the stop, dy is height relative to the target, dz moves toward (+) / away (−) from the camera.
 * `ground(p)` snaps a point onto the terrain.
 */
export function useStopLayout(i: number) {
  const size = useThree((s) => s.size);
  return useMemo(() => {
    const s = STOPS[i];
    const flat = new THREE.Vector3(s.cam.x - s.target.x, 0, s.cam.z - s.target.z);
    const dist = flat.length();
    const toCam = flat.clone().normalize();
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const aspect = size.width / Math.max(1, size.height);
    const halfW = halfH * aspect;
    const right = stopRight(i);
    const yaw = stopYaw(i);
    const narrow = aspect < 1.1;
    const at = (sx: number, dy = 0, dz = 0) => {
      const k = (dist - dz) / dist;
      return new THREE.Vector3()
        .copy(s.target)
        .addScaledVector(right, sx * halfW * k)
        .addScaledVector(toCam, dz)
        .add(new THREE.Vector3(0, dy, 0));
    };
    const ground = (p: THREE.Vector3, lift = 0) => p.clone().setY(terrainHeight(p.x, p.z) + lift);
    return { halfW, halfH, dist, yaw, at, ground, aspect, narrow, target: s.target, cam: s.cam, right, toCam };
  }, [i, size.width, size.height]);
}
