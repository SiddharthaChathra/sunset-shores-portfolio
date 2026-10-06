"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { camState } from "../CameraRig";
import { Text, useTexture } from "@react-three/drei";
import { Select } from "@react-three/postprocessing";
import * as THREE from "three";
import { theme } from "@/theme/theme";
import { certificateList } from "@/content/stats";
import type { CertificateEntry } from "@/content/types";
import { useApp } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { SceneRoot } from "../SceneRoot";
import { useStopLayout } from "../useStopLayout";
import { keepOffRoad } from "../layout";
import { GeoBuilder, vertexColorMaterial } from "../props/geo";
import { neonMaterial } from "../fx/materials";
import { Convertible } from "../props/Car";
import { filteredCertificates } from "@/ui/sections/Certificates";

const mat = vertexColorMaterial(0.6);
const PW = 1.25;
const PH = 1.25;
/** Spotlight target shared between plaques and the beam. */
const spot = { target: new THREE.Vector3(0, 2.4, -3.2), glint: 0 };

function PlaqueFace({ texture }: { texture: string }) {
  const map = useTexture(texture);
  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
  }, [map]);
  return (
    <mesh position={[0, 0, 0.031]}>
      <planeGeometry args={[PW, PH]} />
      <meshStandardMaterial map={map} roughness={0.35} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.18} />
    </mesh>
  );
}

function Plaque({ c, pos, shown, list, near }: { c: CertificateEntry; pos: THREE.Vector3; shown: boolean; list: CertificateEntry[]; near: boolean }) {
  const g = useRef<THREE.Group>(null);
  const glint = useRef<THREE.Mesh>(null);
  const [hoverState, setHover] = useState(false);
  const focused = useApp((s) => s.certFocus === c.id);
  const hover = hoverState || focused;
  const openLightbox = useApp((s) => s.openLightbox);
  useEffect(() => {
    if (focused) spot.target.set(pos.x, pos.y, pos.z); // the mobile carousel's centred plaque
  }, [focused, pos]);
  useFrame((_, dt) => {
    if (!g.current) return;
    const k = THREE.MathUtils.damp(g.current.userData.k ?? 1, shown ? 1 : 0.35, 5, dt);
    g.current.userData.k = k;
    g.current.rotation.x = (1 - k) * -0.5;
    g.current.position.z = pos.z + (hover ? 0.18 : 0);
    if (glint.current) {
      const m = glint.current.material as THREE.MeshBasicMaterial;
      m.opacity = THREE.MathUtils.damp(m.opacity, hover ? 0.55 : 0, 6, dt);
      glint.current.position.x = Math.sin(performance.now() / 300) * 0.4;
    }
  });
  return (
    <group ref={g} position={pos}>
      <Select enabled={hover}>
        <group
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(true);
            spot.target.set(pos.x, pos.y, pos.z);
            document.body.style.cursor = c.locked ? "not-allowed" : "pointer";
          }}
          onPointerOut={() => {
            setHover(false);
            document.body.style.cursor = "";
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (c.locked) return;
            sfx("shutter");
            const unlocked = list.filter((x) => !x.locked);
            openLightbox(unlocked, unlocked.findIndex((x) => x.id === c.id));
          }}
        >
          <mesh>
            <boxGeometry args={[PW + 0.24, PH + 0.24, 0.06]} />
            <meshStandardMaterial color={theme.color.coral} metalness={0.6} roughness={0.25} />
          </mesh>
          {c.texture ? (
            near && (
              <Suspense fallback={null}>
                <PlaqueFace texture={c.texture.replace("-badge.webp", "-plaque.webp")} />
              </Suspense>
            )
          ) : (
            <Text position={[0, 0, 0.04]} fontSize={0.16} font={theme.fonts.monoWoff} color={theme.color.ink}>
              LOCKED
            </Text>
          )}
        </group>
      </Select>
      <mesh ref={glint} position={[0, 0, 0.05]} rotation-z={0.6}>
        <planeGeometry args={[0.18, PH * 1.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Soft light cone that swings onto the hovered plaque. */
function SpotBeam({ origin }: { origin: THREE.Vector3 }) {
  const g = useRef<THREE.Group>(null);
  const aim = useMemo(() => spot.target.clone(), []);
  const geo = useMemo(() => {
    const c = new THREE.ConeGeometry(0.9, 1, 24, 1, true);
    c.translate(0, -0.5, 0);
    return c;
  }, []);
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
        uniforms: { uC: { value: new THREE.Color("#FFF1C9") } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: "uniform vec3 uC; varying vec2 vUv; void main(){ gl_FragColor = vec4(uC * 1.4, (1.0 - vUv.y) * 0.22 * smoothstep(0.0, 0.25, vUv.y)); }",
      }),
    [],
  );
  useFrame((_, dt) => {
    aim.lerp(spot.target, 1 - Math.exp(-5 * dt));
    if (!g.current) return;
    const dir = aim.clone().sub(origin);
    const len = dir.length();
    g.current.position.copy(origin);
    g.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
    g.current.scale.set(1, len, 1);
  });
  return (
    <group ref={g}>
      <mesh geometry={geo} material={m} />
    </group>
  );
}

export function CertificatesScene() {
  const L = useStopLayout(4);
  const filter = useApp((s) => s.certFilter);
  const list = filteredCertificates(filter);
  const shownIds = new Set(list.map((c) => c.id));
  // Certificate textures load only once the camera approaches the garage (keeps them off the boot path).
  const [near, setNear] = useState(false);
  useFrame(() => {
    if (!near && camState.world > 2.6) setNear(true);
  });
  // The garage's footprint (14 × 9.6 m) is kept off the highway whatever the screen aspect.
  const base = useMemo(() => L.ground(keepOffRoad(L.at(L.narrow ? 0 : 0.4, 0, -4), 9)), [L]);

  const garage = useMemo(() => {
    const b = new GeoBuilder();
    b.box(14, 0.2, 9, 0, 0.1, -1, "#EFE6DD"); // floor
    b.box(14, 6, 0.4, 0, 3, -5.5, "#FFF1E2"); // back wall
    b.box(0.4, 6, 9, -7, 3, -1, "#FFD1DC");
    b.box(0.4, 6, 9, 7, 3, -1, "#FFD1DC");
    b.box(14.6, 0.5, 9.6, 0, 6.2, -1, "#FFFFFF"); // roof
    b.box(14.6, 0.8, 0.4, 0, 5.6, 3.4, "#FF9F43"); // door header
    // pegboard panel on the left wall area of the back wall
    b.box(4, 3, 0.1, -4.4, 3, -5.25, "#F4D9B4");
    for (let i = 0; i < 6; i++) b.box(0.08, 0.6, 0.08, -5.8 + i * 0.55, 3.3, -5.15, "#5B5670");
    // glass cabinet frame
    b.box(6.6, 0.2, 1.2, 1.8, 0.6, -4.7, "#FFFFFF");
    b.box(6.6, 0.12, 1.2, 1.8, 2.75, -4.7, "#FFFFFF");
    b.box(6.6, 0.2, 1.2, 1.8, 4.6, -4.7, "#FFFFFF");
    b.box(0.12, 4.2, 1.2, -1.45, 2.6, -4.7, "#FFFFFF");
    b.box(0.12, 4.2, 1.2, 5.05, 2.6, -4.7, "#FFFFFF");
    return b.build();
  }, []);

  const plaques = useMemo(() => {
    const m = new Map<string, THREE.Vector3>();
    certificateList.forEach((c, i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      m.set(c.id, new THREE.Vector3(-0.15 + col * 1.6, 3.7 - row * 1.85, -4.55));
    });
    return m;
  }, []);

  const neonSign = useMemo(() => neonMaterial(theme.color.accent, 2.6), []);
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#EAFBFA", transparent: true, opacity: 0.16, roughness: 0.04, metalness: 0 }), []);

  return (
    <SceneRoot index={4}>
      <group position={base} rotation-y={L.yaw}>
        <mesh geometry={garage} material={mat} />
        <mesh position={[1.8, 2.6, -4.1]} material={glass}>
          <boxGeometry args={[6.5, 4.1, 0.04]} />
        </mesh>
        {certificateList.map((c) => (
          <Plaque key={c.id} c={c} pos={plaques.get(c.id)!} shown={shownIds.has(c.id)} list={list} near={near} />
        ))}
        <group position={[-3.3, 0.02, 0.8]} rotation-y={-0.5} scale={1.05}>
          <Convertible />
        </group>
        <SpotBeam origin={new THREE.Vector3(1.6, 5.9, -1.5)} />
        <Text position={[-4.4, 4.95, -5.18]} fontSize={0.48} font={theme.fonts.displayWoff} anchorX="center" letterSpacing={0.06}>
          TROPHY GARAGE
          <primitive object={neonSign} attach="material" />
        </Text>
      </group>
    </SceneRoot>
  );
}
