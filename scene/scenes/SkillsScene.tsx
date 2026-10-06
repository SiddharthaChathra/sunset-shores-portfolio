"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sfx } from "@/lib/audio";
import { SceneRoot } from "../SceneRoot";
import { useStopLayout } from "../useStopLayout";
import { GeoBuilder, vertexColorMaterial } from "../props/geo";
import { paintMaterial } from "../fx/materials";

const mat = vertexColorMaterial(0.7);

function Boat({ color, sail = false, pos, yaw }: { color: string; sail?: boolean; pos: [number, number, number]; yaw: number }) {
  const g = useRef<THREE.Group>(null);
  const kick = useRef(0);
  const hull = useMemo(() => paintMaterial(color), [color]);
  const parts = useMemo(() => {
    const b = new GeoBuilder();
    b.box(1.6, 0.35, 3.6, 0, 0.75, 0, "#FFFFFF"); // deck
    b.box(1.1, 0.6, 1.3, 0, 1.2, 0.3, "#FFF1E2"); // cabin
    b.box(1.0, 0.25, 0.08, 0, 1.3, -0.36, "#7FB3C8");
    if (sail) {
      b.cyl(0.05, 0.05, 5, 0, 3.4, -0.4, "#FFFFFF", 6);
      b.add(new THREE.ConeGeometry(1.3, 4.2, 3, 1, true, 0, Math.PI / 1.5).scale(1, 1, 0.12), "#FFF8F2", new THREE.Matrix4().makeTranslation(0.1, 3.5, 0.2));
    }
    return b.build();
  }, [sail]);
  useFrame(({ clock }, dt) => {
    if (!g.current) return;
    kick.current = THREE.MathUtils.damp(kick.current, 0, 1.5, dt);
    const t = clock.elapsedTime + pos[0];
    g.current.position.y = pos[1] + Math.sin(t * 1.1) * 0.08 + Math.sin(t * 6) * kick.current * 0.25;
    g.current.rotation.z = Math.sin(t * 0.8) * 0.04 + Math.sin(t * 5) * kick.current * 0.12;
  });
  return (
    <group
      ref={g}
      position={pos}
      rotation-y={yaw}
      onClick={(e) => {
        e.stopPropagation();
        kick.current = 1;
        sfx("horn");
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <mesh position={[0, 0.3, 0]} material={hull} scale={[1, 1, 1]}>
        <capsuleGeometry args={[0.85, 2.6, 4, 12]} />
      </mesh>
      <mesh geometry={parts} material={mat} />
    </group>
  );
}

/** Marina at golden hour: floating docks, bollards, pastel speedboats and a sailboat that bob (click to honk). */
export function SkillsScene() {
  const L = useStopLayout(5);
  const base = useMemo(() => L.at(L.narrow ? 0 : -0.42, 0, -2).setY(0), [L]);
  const docks = useMemo(() => {
    const b = new GeoBuilder();
    b.box(16, 0.3, 2, 0, 0.45, -3, "#D9B48F");
    for (let i = 0; i < 3; i++) b.box(1.6, 0.3, 7, -5 + i * 5, 0.45, 1.5, "#D9B48F");
    for (let i = 0; i < 8; i++) b.cyl(0.18, 0.18, 1.2, -7 + i * 2, 0.4, -3.9, "#8F6A4A", 8);
    for (let i = 0; i < 3; i++) b.cyl(0.12, 0.14, 0.5, -5 + i * 5, 0.85, 4.8, "#FFFFFF", 8);
    // harbour office
    b.box(4, 3, 3, 6, 1.9, -6.5, "#E4DBFF");
    b.box(4.4, 0.3, 3.4, 6, 3.5, -6.5, "#FFFFFF");
    b.box(3, 0.9, 0.06, 6, 2.2, -4.98, "#7FB3C8");
    return b.build();
  }, []);
  return (
    <SceneRoot index={5}>
      <group position={base} rotation-y={L.yaw}>
        <mesh geometry={docks} material={mat} />
        <Boat color="#FF4F8B" pos={[-2.5, 0, 2]} yaw={0.05} />
        <Boat color="#2EC4B6" pos={[2.5, 0, 2.4]} yaw={-0.08} sail />
        <Boat color="#FF9F43" pos={[7.4, 0, 1.6]} yaw={0.12} />
      </group>
    </SceneRoot>
  );
}
