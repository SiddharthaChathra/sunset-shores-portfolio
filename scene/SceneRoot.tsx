"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { camState } from "./CameraRig";

/** While true every scene is visible (used once to precompile all shaders behind the loading screen). */
export const compileState = { all: false };

/** Only renders a stop's scene while the camera is near it (saves draw calls; fog hides the swap). */
export function SceneRoot({ index, range = 1.35, children }: { index: number; range?: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.visible = compileState.all || Math.abs(camState.world - index) < range;
  });
  return (
    <group ref={g} userData={{ sceneRoot: true }}>
      {children}
    </group>
  );
}
