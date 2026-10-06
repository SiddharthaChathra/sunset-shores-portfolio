"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { theme } from "@/theme/theme";
import { useApp } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { SceneRoot } from "../SceneRoot";
import { useStopLayout } from "../useStopLayout";
import { keepOffRoad } from "../layout";
import { GeoBuilder, vertexColorMaterial } from "../props/geo";
import { neonMaterial } from "../fx/materials";

const mat = vertexColorMaterial(0.7);

/** Beach café: pastel hut, striped awning, counter, neon OPEN sign, tables with umbrellas, string lights, surfboards. */
export function ExperienceScene() {
  const L = useStopLayout(3);
  const base = useMemo(() => {
    // walk toward the camera until the café stands on dry sand
    let p = L.ground(L.at(L.narrow ? 0 : 0.42, 0, 4));
    for (let dz = 4; p.y < 0.3 && dz < 20; dz += 2) p = L.ground(L.at(L.narrow ? 0 : 0.42, 0, dz));
    // the 12 × 8 m deck never overlaps the highway
    return L.ground(keepOffRoad(p, 7.4));
  }, [L]);
  const expFocus = useApp((s) => s.expFocus);
  const [flick, setFlick] = useState(0);
  const sign = useRef<THREE.MeshBasicMaterial>(null);
  const clock = useThree((st) => st.clock);

  const { hut, bulbs } = useMemo(() => {
    const b = new GeoBuilder();
    // deck + hut
    b.box(12, 0.3, 8, 0, 0.15, 0, "#E9D3B5");
    b.box(7, 3.2, 3.2, 0, 1.9, -2.2, "#C9F0EA");
    b.box(7.4, 0.3, 3.6, 0, 3.6, -2.2, "#FFFFFF");
    b.box(6.6, 1.1, 0.6, 0, 0.9, -0.3, "#FFFFFF"); // counter
    b.box(6.8, 0.12, 0.9, 0, 1.5, -0.3, "#FF9F43");
    // striped awning (alternating pink / white slats)
    for (let i = 0; i < 9; i++) {
      const x = -3.4 + i * 0.85;
      b.add(new THREE.BoxGeometry(0.85, 0.08, 1.8), i % 2 ? "#FFFFFF" : "#FF4F8B", new THREE.Matrix4().makeRotationX(0.32).premultiply(new THREE.Matrix4().makeTranslation(x, 3.05, -0.1)));
    }
    // tables with umbrellas
    const tables: [number, number, string][] = [
      [-4, 2.2, "#FF9F43"],
      [0, 2.8, "#2EC4B6"],
      [4, 2.2, "#FF4F8B"],
    ];
    for (const [x, z, c] of tables) {
      b.cyl(0.6, 0.6, 0.08, x, 1.05, z, "#FFFFFF", 14);
      b.cyl(0.06, 0.06, 1, x, 0.55, z, "#5B5670", 6);
      b.cyl(0.04, 0.04, 2.2, x, 1.9, z, "#FFFFFF", 6);
      b.add(new THREE.ConeGeometry(1.5, 0.55, 8, 1, true), c, new THREE.Matrix4().makeTranslation(x, 3.1, z));
      for (const dx of [-0.9, 0.9]) b.box(0.45, 0.6, 0.45, x + dx, 0.6, z, "#FFF1E2");
    }
    // surfboards leaning on the hut
    const boards = ["#FF4F8B", "#FF9F43", "#2EC4B6"];
    boards.forEach((c, i) => {
      const m = new THREE.Matrix4().makeRotationZ(0.18 + i * 0.05).premultiply(new THREE.Matrix4().makeTranslation(-4.6 - i * 0.55, 1.6, -0.7));
      b.add(new THREE.CapsuleGeometry(0.28, 2.4, 4, 10).scale(1, 1, 0.18), c, m);
    });
    // string-light posts
    b.cyl(0.05, 0.05, 3.6, -6, 1.8, 3.8, "#FFFFFF", 6);
    b.cyl(0.05, 0.05, 3.6, 6, 1.8, 3.8, "#FFFFFF", 6);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      pts.push(new THREE.Vector3(-6 + t * 12, 3.5 - Math.sin(Math.PI * t) * 0.6, 3.8));
    }
    return { hut: b.build(), bulbs: pts };
  }, []);

  const bulbMat = useMemo(() => neonMaterial("#FFE2B8", 2.4), []);
  const neonPink = useMemo(() => neonMaterial(theme.color.accent, 2.6), []);

  useFrame(({ clock }) => {
    if (!sign.current) return;
    const t = clock.elapsedTime;
    const flickering = flick && t - flick < 0.9;
    const on = flickering ? (Math.sin(t * 60) > 0 ? 1 : 0.15) : 1;
    sign.current.color.set(theme.color.accent).multiplyScalar(2.6 * on);
  });

  return (
    <SceneRoot index={3}>
      <group position={base} rotation-y={L.yaw + 0.3}>
        <mesh geometry={hut} material={mat} />
        {bulbs.map((p, i) => (
          <mesh key={i} position={p} material={bulbMat} scale={expFocus !== null && i % 2 === expFocus % 2 ? 1.6 : 1}>
            <sphereGeometry args={[0.09, 8, 6]} />
          </mesh>
        ))}
        <group
          position={[0, 4.35, -2.2]}
          onClick={(e) => {
            e.stopPropagation();
            setFlick(clock.elapsedTime);
            sfx("buzz");
          }}
        >
          <mesh position={[0, 0, -0.06]}>
            <boxGeometry args={[3.4, 1, 0.1]} />
            <meshStandardMaterial color={theme.color.ink} />
          </mesh>
          <Text fontSize={0.62} font={theme.fonts.displayWoff} anchorX="center" anchorY="middle" position={[0, 0.02, 0.02]} letterSpacing={0.08}>
            CAFÉ · OPEN
            <meshBasicMaterial ref={sign} toneMapped={false} color={theme.color.accent} />
          </Text>
        </group>
        <mesh position={[0, 3.78, -0.38]} material={neonPink}>
          <boxGeometry args={[7, 0.06, 0.06]} />
        </mesh>
      </group>
    </SceneRoot>
  );
}
