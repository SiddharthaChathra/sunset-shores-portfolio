"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { rig } from "@/lib/rig";
import { SceneRoot } from "../SceneRoot";
import { camState } from "../CameraRig";
import { coastX, terrainHeight } from "../layout";
import { GeoBuilder, vertexColorMaterial } from "../props/geo";
import { hash } from "../noise";

const MAX_ORBIT = THREE.MathUtils.degToRad(25);
/** Touch drag on the phone/tablet scene window: ±15°. */
const MAX_ORBIT_TOUCH = THREE.MathUtils.degToRad(15);
const mat = vertexColorMaterial(0.7);

/** Beach set dressing for Ocean Drive: striped umbrellas, loungers and a pastel lifeguard tower. */
function Beach() {
  const geo = useMemo(() => {
    const b = new GeoBuilder();
    const stripes = ["#FF4F8B", "#FFFFFF", "#FF9F43", "#FFFFFF", "#2EC4B6", "#FFFFFF"];
    for (let k = 0; k < 9; k++) {
      const z = 6 - k * 6.5 - hash(k) * 2;
      const x = coastX(z) - 6.5 + hash(k * 3) * 3;
      const y = terrainHeight(x, z);
      b.cyl(0.05, 0.05, 2.6, x, y + 1.3, z, "#FFFFFF", 6);
      // umbrella canopy: 6 coloured wedges (cones)
      for (let s = 0; s < 6; s++) {
        const cone = new THREE.ConeGeometry(1.6, 0.6, 6, 1, true, (s / 6) * Math.PI * 2, Math.PI / 3);
        b.add(cone, stripes[(s + k) % stripes.length], new THREE.Matrix4().makeTranslation(x, y + 2.75, z));
      }
      // two loungers
      for (const dx of [-1.1, 1.1]) {
        b.box(0.7, 0.12, 1.9, x + dx, y + 0.35, z + 0.6, k % 2 ? "#FFE8C2" : "#FFD1DC");
        b.box(0.7, 0.12, 0.7, x + dx, y + 0.62, z - 0.3, k % 2 ? "#FFE8C2" : "#FFD1DC", 0);
      }
    }
    // lifeguard tower
    const z = -18;
    const x = coastX(z) - 3;
    const y = terrainHeight(x, z);
    for (const [dx, dz] of [
      [-0.9, -0.9],
      [0.9, -0.9],
      [-0.9, 0.9],
      [0.9, 0.9],
    ])
      b.cyl(0.08, 0.1, 2.6, x + dx, y + 1.3, z + dz, "#FFFFFF", 6);
    b.box(2.6, 0.2, 2.6, x, y + 2.7, z, "#FFFFFF");
    b.box(2.2, 1.6, 2.2, x, y + 3.6, z, "#7FD7CF");
    b.box(2.0, 0.6, 0.06, x - 1.11, y + 3.8, z, "#FFF1C9", Math.PI / 2);
    b.box(2.8, 0.25, 2.8, x, y + 4.5, z, "#FF4F8B");
    b.box(0.5, 2.8, 0.1, x + 1.6, y + 1.4, z, "#FF9F43");
    return b.build();
  }, []);
  return <mesh geometry={geo} material={mat} />;
}

/** Drag-to-orbit (±25°) on the hero street; clicks fall through to the car / palms. */
function OrbitDrag() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    let down: { x: number; y: number; o: number; touch: boolean; locked: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      if (camState.heroWeight < 0.5) return;
      down = { x: e.clientX, y: e.clientY, o: rig.orbit, touch: e.pointerType === "touch", locked: e.pointerType !== "touch" };
    };
    const onMove = (e: PointerEvent) => {
      if (!down) {
        el.style.cursor = camState.heroWeight > 0.5 ? "grab" : "";
        return;
      }
      const dx = e.clientX - down.x;
      // touch: decide after 10 px; a vertical drag belongs to the page scroll (the browser takes it)
      if (!down.locked) {
        if (Math.hypot(dx, e.clientY - down.y) < 10) return;
        if (Math.abs(e.clientY - down.y) > Math.abs(dx)) {
          down = null;
          return;
        }
        down.locked = true;
      }
      el.style.cursor = "grabbing";
      const max = down.touch ? MAX_ORBIT_TOUCH : MAX_ORBIT;
      rig.orbit = THREE.MathUtils.clamp(down.o - dx * (down.touch ? 0.006 : 0.0035), -max, max);
    };
    const onUp = () => {
      down = null;
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [gl]);
  useFrame((_, dt) => {
    if (camState.heroWeight < 0.3) rig.orbit = THREE.MathUtils.damp(rig.orbit, 0, 2, dt);
  });
  return null;
}

export function HeroScene() {
  return (
    <SceneRoot index={0} range={1.6}>
      <Beach />
      <OrbitDrag />
    </SceneRoot>
  );
}
