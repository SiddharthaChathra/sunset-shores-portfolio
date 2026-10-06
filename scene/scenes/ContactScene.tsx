"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { theme } from "@/theme/theme";
import { useApp } from "@/lib/store";
import { SceneRoot } from "../SceneRoot";
import { useStopLayout } from "../useStopLayout";
import { GeoBuilder, vertexColorMaterial } from "../props/geo";
import { neonMaterial } from "../fx/materials";

const mat = vertexColorMaterial(0.75);

/** The pier at sunset: a long boardwalk into the sea toward the sun, lamps, and a neon sign that lights up on "Call". */
export function ContactScene() {
  const L = useStopLayout(6);
  const connectAt = useApp((s) => s.connectAt);
  const gl = useThree((s) => s.gl);
  const base = useMemo(() => {
    // the pier starts on the beach and runs out to sea toward the sun
    let p = L.at(L.narrow ? 0 : 0.34, 0, 11);
    for (let dz = 11; L.ground(p).y < 0.1 && dz < 24; dz += 1) p = L.at(L.narrow ? 0 : 0.34, 0, dz);
    return p.setY(0);
  }, [L]);
  const neon = useMemo(() => neonMaterial(theme.color.accent, 2.6), []);
  const lampMat = useMemo(() => neonMaterial("#FFE2B8", 2.2), []);
  const signMat = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);

  const pier = useMemo(() => {
    const b = new GeoBuilder();
    const len = 40;
    // boardwalk heading away from the camera (−z local)
    b.box(3.4, 0.3, len, 0, 1.6, -len / 2, "#D9B48F");
    for (let z = 0; z > -len; z -= 4) {
      b.cyl(0.18, 0.2, 3, -1.6, 0.2, z, "#8F6A4A", 8);
      b.cyl(0.18, 0.2, 3, 1.6, 0.2, z, "#8F6A4A", 8);
      b.box(0.1, 1, 0.1, -1.65, 2.25, z, "#FFFFFF");
      b.box(0.1, 1, 0.1, 1.65, 2.25, z, "#FFFFFF");
    }
    b.box(0.08, 0.08, len, -1.65, 2.75, -len / 2, "#FFFFFF");
    b.box(0.08, 0.08, len, 1.65, 2.75, -len / 2, "#FFFFFF");
    // platform + kiosk at the end
    b.box(8, 0.3, 6, 0, 1.6, -len - 2, "#D9B48F");
    b.box(3.2, 2.6, 2.4, 0, 3.05, -len - 3.2, "#FFD1DC");
    b.box(3.6, 0.3, 2.8, 0, 4.5, -len - 3.2, "#FFFFFF");
    return b.build();
  }, []);
  const lamps = useMemo(() => Array.from({ length: 6 }, (_, i) => new THREE.Vector3(i % 2 ? 1.7 : -1.7, 4, -4 - i * 6.5)), []);

  useFrame(({ clock }, dt) => {
    const t = connectAt ? (performance.now() - connectAt) / 1000 : 99;
    const flash = t < 2.2 ? Math.exp(-t * 2.2) : 0;
    gl.toneMappingExposure = THREE.MathUtils.damp(gl.toneMappingExposure, 1.05 + flash * 0.45, 10, dt);
    if (signMat.current) {
      const on = t < 2.2 ? (Math.sin(t * 40) > -0.2 ? 1 : 0.3) : 0.85 + Math.sin(clock.elapsedTime * 2) * 0.05;
      signMat.current.color.set(theme.color.accent).multiplyScalar(2.6 * on);
    }
    if (ring.current) {
      const k = THREE.MathUtils.clamp(t / 1.6, 0, 1);
      ring.current.visible = t < 1.6;
      ring.current.scale.setScalar(0.5 + k * 10);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 1 - k;
    }
  });

  return (
    <SceneRoot index={6}>
      <group position={base} rotation-y={L.yaw + 0.18}>
        <mesh geometry={pier} material={mat} />
        {lamps.map((p, i) => (
          <group key={i} position={p}>
            <mesh position={[0, -1.1, 0]}>
              <cylinderGeometry args={[0.05, 0.06, 2.2, 6]} />
              <meshStandardMaterial color="#5B5670" />
            </mesh>
            <mesh material={lampMat}>
              <sphereGeometry args={[0.18, 10, 8]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 4.75, -41.9]} material={neon}>
          <boxGeometry args={[3.4, 0.06, 0.06]} />
        </mesh>
        <Text position={[0, 5.5, -41.85]} fontSize={0.62} font={theme.fonts.displayWoff} anchorX="center" letterSpacing={0.06}>
          LET&apos;S TALK
          <meshBasicMaterial ref={signMat} toneMapped={false} color={theme.color.accent} />
        </Text>
        <mesh ref={ring} position={[0, 5.4, -41.6]} visible={false}>
          <ringGeometry args={[0.9, 1, 48]} />
          <meshBasicMaterial color={theme.color.orange} transparent toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </SceneRoot>
  );
}
