"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { theme } from "@/theme/theme";
import type { ProjectEmblem } from "@/content/projects";
import { neonMaterial, paintMaterial } from "../fx/materials";
import { GeoBuilder, vertexColorMaterial } from "../props/geo";

const deco = vertexColorMaterial(0.7);
const metal = new THREE.MeshStandardMaterial({ color: "#F3EEF6", roughness: 0.3, metalness: 0.6 });

/** JobSentinel: radar dish sweeping on a deco rooftop. */
function RooftopRadar({ color }: { color: string }) {
  const dish = useRef<THREE.Group>(null);
  const roof = useMemo(() => {
    const b = new GeoBuilder();
    b.box(6, 4, 5, 0, -3, 0, "#FFD1DC");
    b.box(6.3, 0.2, 5.3, 0, -0.9, 0, "#FFFFFF");
    b.box(1, 1.4, 1, 0, -0.1, 0, "#FFFFFF");
    return b.build();
  }, []);
  const dishGeo = useMemo(() => {
    const pts = Array.from({ length: 9 }, (_, i) => new THREE.Vector2(0.05 + i * 0.26, (i * 0.26) ** 2 * 0.28));
    return new THREE.LatheGeometry(pts, 20);
  }, []);
  const glow = useMemo(() => neonMaterial(color, 2.4), [color]);
  useFrame((_, dt) => {
    if (dish.current) dish.current.rotation.y += dt * 0.6;
  });
  return (
    <group>
      <mesh geometry={roof} material={deco} />
      <group ref={dish} position={[0, 0.9, 0]}>
        <mesh geometry={dishGeo} rotation-x={-Math.PI / 2.5} position={[0, 0.6, 0]} material={metal} />
        <mesh position={[0, 1.6, 0.9]} material={glow}>
          <sphereGeometry args={[0.18, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
}

/** NetSentinel: glowing network globe sign on a pole, nodes pulsing. */
function GlobeSign({ color }: { color: string }) {
  const g = useRef<THREE.Group>(null);
  const nodes = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const y = 1 - (i / 11) * 2;
        const r = Math.sqrt(1 - y * y);
        const a = i * 2.39996;
        return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).multiplyScalar(2.1);
      }),
    [],
  );
  const neon = useMemo(() => neonMaterial(color, 2.6), [color]);
  const ring = useMemo(() => neonMaterial(theme.color.accent, 2.4), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.3;
    refs.current.forEach((m, i) => m && m.scale.setScalar(1 + 0.6 * Math.max(0, Math.sin(s.clock.elapsedTime * 2.2 + i))));
  });
  return (
    <group>
      <mesh position={[0, -4, 0]} material={metal}>
        <cylinderGeometry args={[0.12, 0.18, 6, 8]} />
      </mesh>
      <group ref={g} position={[0, 1, 0]}>
        <mesh>
          <icosahedronGeometry args={[2, 2]} />
          <meshStandardMaterial color="#FFF8F2" roughness={0.5} flatShading />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[2.03, 2]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.5} toneMapped={false} />
        </mesh>
        {nodes.map((p, i) => (
          <mesh key={i} ref={(el) => void (refs.current[i] = el)} position={p} material={neon}>
            <sphereGeometry args={[0.1, 8, 6]} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 1, 0]} rotation-x={Math.PI / 2.3} material={ring}>
        <torusGeometry args={[2.7, 0.05, 6, 64]} />
      </mesh>
    </group>
  );
}

/** Heart Disease Detection: neon heart outline with a travelling ECG trace. */
function NeonHeart({ color }: { color: string }) {
  const { heart, ecg } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * Math.PI * 2;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push(new THREE.Vector3(x * 0.13, y * 0.13, 0));
    }
    const heart = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.07, 6, true);
    const e: THREE.Vector3[] = [];
    const xs = [-4, -1.4, -1, -0.6, -0.2, 0.2, 0.6, 4];
    const ys = [0, 0, 0.8, -1.2, 1.6, -0.4, 0, 0];
    xs.forEach((x, i) => e.push(new THREE.Vector3(x, ys[i] - 0.2, 0.3)));
    const ecg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(e, false, "catmullrom", 0.05), 120, 0.05, 5, false);
    return { heart, ecg };
  }, []);
  const heartMat = useMemo(() => neonMaterial(color, 2.8), [color]);
  const ecgMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        toneMapped: false,
        uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(theme.color.teal) } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: "uniform float uT; uniform vec3 uC; varying vec2 vUv; void main(){ float h = fract(vUv.x - uT * 0.35); float a = smoothstep(0.0, 0.4, h) * 0.95 + 0.05; gl_FragColor = vec4(uC * (1.0 + 2.0 * a), a); }",
      }),
    [],
  );
  const g = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    ecgMat.uniforms.uT.value += dt;
    if (g.current) {
      const beat = Math.pow(Math.max(0, Math.sin(s.clock.elapsedTime * 3.2)), 12);
      g.current.scale.setScalar(1 + beat * 0.06);
    }
  });
  return (
    <group ref={g}>
      <mesh geometry={heart} material={heartMat} />
      <mesh geometry={ecg} material={ecgMat} />
    </group>
  );
}

/** Travora AI: a seaplane circling the bay. */
function Seaplane() {
  const orbit = useRef<THREE.Group>(null);
  const plane = useMemo(() => {
    const b = new GeoBuilder();
    b.box(0.5, 0.5, 3, 0, 0, 0, "#FFFFFF");
    b.box(4.4, 0.08, 0.8, 0, 0.3, -0.2, "#FF9F43");
    b.box(1.4, 0.06, 0.45, 0, 0.1, 1.35, "#FF9F43");
    b.box(0.06, 0.6, 0.45, 0, 0.35, 1.35, "#FF4F8B");
    for (const x of [-0.8, 0.8]) {
      b.box(0.25, 0.22, 2.2, x, -0.75, 0, "#FFFFFF");
      b.box(0.05, 0.55, 0.05, x, -0.4, -0.5, "#5B5670");
      b.box(0.05, 0.55, 0.05, x, -0.4, 0.6, "#5B5670");
    }
    return b.build();
  }, []);
  const prop = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (orbit.current) orbit.current.rotation.y += dt * 0.45;
    if (prop.current) prop.current.rotation.z += dt * 30;
  });
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -3, 0]}>
        <ringGeometry args={[3.3, 3.5, 48]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} />
      </mesh>
      <group ref={orbit}>
        <group position={[3.4, 0, 0]} rotation={[0, 0, -0.35]}>
          <mesh geometry={plane} material={deco} />
          <mesh ref={prop} position={[0, 0, -1.55]} material={paintMaterial("#23203A")}>
            <boxGeometry args={[1.2, 0.08, 0.04]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** An emblem that scales/fades in when its project is active. */
export function Emblem({ kind, color, visible }: { kind: ProjectEmblem; color: string; visible: boolean }) {
  const g = useRef<THREE.Group>(null);
  const k = useRef(visible ? 1 : 0);
  useFrame((_, dt) => {
    k.current = THREE.MathUtils.damp(k.current, visible ? 1 : 0, 4, dt);
    if (g.current) {
      g.current.visible = k.current > 0.02;
      g.current.scale.setScalar(0.6 + k.current * 0.4);
      g.current.position.y = (1 - k.current) * -2;
    }
  });
  return (
    <group ref={g}>
      {kind === "radar" && <RooftopRadar color={color} />}
      {kind === "globe" && <GlobeSign color={color} />}
      {kind === "heart" && <NeonHeart color={color} />}
      {kind === "plane" && <Seaplane />}
    </group>
  );
}
