"use client";

import { useMemo } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { sfx } from "@/lib/audio";
import { SceneRoot } from "../SceneRoot";
import { useStopLayout } from "../useStopLayout";
import { GeoBuilder, vertexColorMaterial } from "../props/geo";
import { causticsMaterial, neonMaterial, poolWaterMaterial, worldTime } from "../fx/materials";
import { Palms } from "../props/Palms";

const mat = vertexColorMaterial(0.65);
const railGlass = new THREE.MeshPhysicalMaterial({ color: "#E6FBFA", transparent: true, opacity: 0.25, roughness: 0.05 });
const POOL_W = 9;
const POOL_D = 4.6;

/** Rooftop pool: deco tower top, tiled pool with animated caustics, loungers, umbrellas, glass rail, neon trim. */
export function AboutScene() {
  const L = useStopLayout(1);
  const roof = useMemo(() => L.at(L.narrow ? 0 : -0.42, -3.2, -2), [L]);
  const roofY = roof.y;
  const ground = useMemo(() => L.ground(roof).y, [L, roof]);

  const { tower, deck } = useMemo(() => {
    const t = new GeoBuilder();
    const h = roofY - ground;
    t.box(20, h, 14, 0, -h / 2, 0, "#FFE8C2");
    for (let y = -h + 3; y < -1; y += 3) {
      t.box(20.4, 0.2, 14.4, 0, y, 0, "#FFFFFF");
      t.box(16, 1.2, 0.1, 0, y - 1.1, 7.02, "#7FB3C8");
    }
    const d = new GeoBuilder();
    d.box(20, 0.3, 14, 0, 0.15, 0, "#FFF8F2");
    // pool rim
    d.box(POOL_W + 1, 0.35, 0.5, 0, 0.45, POOL_D / 2 + 0.25, "#FFFFFF");
    d.box(POOL_W + 1, 0.35, 0.5, 0, 0.45, -POOL_D / 2 - 0.25, "#FFFFFF");
    d.box(0.5, 0.35, POOL_D, POOL_W / 2 + 0.25, 0.45, 0, "#FFFFFF");
    d.box(0.5, 0.35, POOL_D, -POOL_W / 2 - 0.25, 0.45, 0, "#FFFFFF");
    // loungers + umbrellas
    for (let k = 0; k < 4; k++) {
      const x = -6 + k * 3.6;
      d.box(0.8, 0.14, 2, x, 0.55, 4.4, k % 2 ? "#FFD1DC" : "#C9F0EA");
      d.box(0.8, 0.14, 0.8, x, 0.85, 3.5, k % 2 ? "#FFD1DC" : "#C9F0EA");
    }
    for (const x of [-8, 7.5]) {
      d.cyl(0.05, 0.05, 2.6, x, 1.5, 4.6, "#FFFFFF", 6);
      d.add(new THREE.ConeGeometry(1.7, 0.6, 8, 1, true), x > 0 ? "#FF4F8B" : "#FF9F43", new THREE.Matrix4().makeTranslation(x, 2.9, 4.6));
    }
    // glass rail (frame) on the sea side
    d.box(20, 0.08, 0.08, 0, 1.3, 6.9, "#FFFFFF");
    // bar kiosk
    d.box(3, 1.2, 1.4, 7.5, 0.9, -4.6, "#FF9F43");
    d.box(3.4, 0.15, 1.8, 7.5, 1.55, -4.6, "#FFFFFF");
    return { tower: t.build(), deck: d.build() };
  }, [roofY, ground]);

  const caustics = useMemo(() => causticsMaterial(), []);
  const water = useMemo(() => poolWaterMaterial(), []);
  const neon = useMemo(() => neonMaterial("#2EC4B6", 2.4), []);
  const palms = useMemo(() => [new THREE.Vector3(-9, 0.3, -5.5), new THREE.Vector3(9.2, 0.3, 5.6)], []);

  const onPool = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const uv = e.uv;
    if (uv) caustics.uniforms.uRipple.value.set(uv.x, uv.y, worldTime.value);
    sfx("click");
  };

  return (
    <SceneRoot index={1}>
      <group position={roof} rotation-y={L.yaw}>
        <mesh geometry={tower} material={mat} />
        <mesh geometry={deck} material={mat} />
        <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2} material={caustics}>
          <planeGeometry args={[POOL_W, POOL_D]} />
        </mesh>
        <mesh
          position={[0, 0.5, 0]}
          rotation-x={-Math.PI / 2}
          material={water}
          onClick={onPool}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}
        >
          <planeGeometry args={[POOL_W, POOL_D]} />
        </mesh>
        <mesh position={[0, 0.66, POOL_D / 2 + 0.52]} material={neon}>
          <boxGeometry args={[POOL_W + 1, 0.06, 0.06]} />
        </mesh>
        <mesh position={[0, 0.7, 6.9]} material={railGlass}>
          <boxGeometry args={[20, 1.2, 0.04]} />
        </mesh>
        <Palms points={palms} scale={0.42} />
      </group>
    </SceneRoot>
  );
}
