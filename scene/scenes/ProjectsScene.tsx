"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import { Select } from "@react-three/postprocessing";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { theme } from "@/theme/theme";
import { projects, type Project } from "@/content/projects";
import { rig } from "@/lib/rig";
import { useApp } from "@/lib/store";
import { scrollToProject } from "@/lib/scroll";
import { sfx } from "@/lib/audio";
import { SceneRoot } from "../SceneRoot";
import { useStopLayout } from "../useStopLayout";
import { addDissolve, neonMaterial } from "../fx/materials";
import { Emblem } from "./Emblems";

const BW = 7.2;
const BH = 3.2;
const TILT = THREE.MathUtils.degToRad(-12);
const accentOf = (p: Project) => (p.accentFromTheme === "teal" ? theme.color.teal : p.accentFromTheme === "coral" ? theme.color.coral : theme.color.accent);

/** Shared swing state for the grabbed billboard (inertia, then a spring back). */
const swing = { angle: 0, vel: 0, dragging: false, lastX: 0, lastT: 0 };
const tmp = new THREE.Vector3();
const postMat = new THREE.MeshStandardMaterial({ color: "#5B5670", roughness: 0.6, metalness: 0.4 });
const backMat = new THREE.MeshStandardMaterial({ color: "#EFE6DD", roughness: 0.8 });

/** Billboard neon frame, merged per colour (built once, shared by all billboards). */
const FRAME = (() => {
  const bar = (w: number, h: number, x: number, y: number) => new THREE.BoxGeometry(w, h, 0.09).translate(x, y, 0.14);
  return {
    pink: mergeGeometries([bar(BW + 0.3, 0.09, 0, BH / 2 + 0.12), bar(0.09, BH + 0.3, -BW / 2 - 0.12, 0)]),
    orange: mergeGeometries([bar(BW + 0.3, 0.09, 0, -BH / 2 - 0.12), bar(0.09, BH + 0.3, BW / 2 + 0.12, 0)]),
  };
})();

function Billboard({ p, k, total }: { p: Project; k: number; total: number }) {
  const group = useRef<THREE.Group>(null);
  const swinger = useRef<THREE.Group>(null);
  const titleRef = useRef<{ fillOpacity: number } | null>(null);
  const subRef = useRef<{ fillOpacity: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const activeIdx = useApp((s) => s.project);

  const { face, dissolve, base } = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: "#FFF8F2", roughness: 0.45, metalness: 0.05, emissive: "#FFB98A", emissiveIntensity: 0.12 });
    return { face: m, dissolve: addDissolve(m, accentOf(p)), base: new THREE.Color("#FFF8F2") };
  }, [p]);
  const frame = useMemo(() => {
    const pink = neonMaterial(theme.color.accent, 2.6);
    const orange = neonMaterial(theme.color.orange, 2.6);
    return { pink, orange };
  }, []);
  const dim = useMemo(() => new THREE.Color("#CFC6D6"), []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const center = THREE.MathUtils.clamp(rig.project, 0.5, total - 0.5);
    const d = k + 0.5 - center;
    const s = (Math.sign(d) * Math.max(0, Math.abs(d) - 0.28)) / 0.72;
    const isActive = Math.abs(s) < 0.5;
    let x = 0,
      y = 0,
      z = 0,
      dis = 0,
      op = 1;
    if (s >= 0) {
      // waiting further down the highway
      x = s * 1.6;
      y = s * 0.4;
      z = -s * 9;
      op = s > 2.3 ? 0 : 1 - Math.min(1, s) * 0.5;
    } else {
      // slides past the camera and dissolves
      const a = -s;
      x = -a * 6;
      z = a * 5;
      dis = THREE.MathUtils.clamp(a * 1.2, 0, 1);
    }
    g.position.lerp(tmp.set(x, y, z), 1 - Math.exp(-9 * dt));
    g.visible = op > 0.01 && dis < 0.999;
    dissolve.uDissolve.value = dis;
    face.color.copy(base).lerp(dim, 1 - op);
    const textOp = op * (1 - THREE.MathUtils.smoothstep(dis, 0.05, 0.45));
    if (titleRef.current) titleRef.current.fillOpacity = textOp;
    if (subRef.current) subRef.current.fillOpacity = textOp;
    frame.pink.visible = frame.orange.visible = true;

    if (swinger.current) {
      if (isActive) {
        if (!swing.dragging) {
          if (Math.abs(swing.vel) > 0.6) {
            swing.angle += swing.vel * dt;
            swing.vel *= Math.exp(-2.6 * dt);
          } else {
            swing.vel += (-swing.angle * 30 - swing.vel * 8) * dt;
            swing.angle += swing.vel * dt;
          }
        }
        swing.angle = THREE.MathUtils.clamp(swing.angle, -1.2, 1.2);
        swinger.current.rotation.y = swing.angle;
      } else {
        swinger.current.rotation.y = THREE.MathUtils.damp(swinger.current.rotation.y, 0, 6, dt);
      }
    }
    g.userData.active = isActive;
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!group.current?.userData.active) return;
    swing.dragging = true;
    swing.lastX = e.clientX;
    swing.lastT = performance.now();
    swing.vel = 0;
    const move = (ev: PointerEvent) => {
      const now = performance.now();
      const da = (ev.clientX - swing.lastX) * 0.01;
      swing.angle += da;
      swing.vel = da / Math.max(0.008, (now - swing.lastT) / 1000);
      swing.lastX = ev.clientX;
      swing.lastT = now;
    };
    const up = () => {
      swing.dragging = false;
      if (performance.now() - swing.lastT > 80) swing.vel = 0;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    document.body.style.cursor = "grabbing";
  };

  return (
    <group ref={group}>
      {/* legs down to the ground far below the flyover */}
      {[-BW * 0.3, BW * 0.3].map((x) => (
        <mesh key={x} position={[x, -BH / 2 - 9, -0.25]} material={postMat}>
          <boxGeometry args={[0.35, 18, 0.35]} />
        </mesh>
      ))}
      <group ref={swinger}>
        <Select enabled={hovered && activeIdx === k}>
          <group
            onPointerDown={onDown}
            onClick={(e) => {
              e.stopPropagation();
              if (!group.current?.userData.active && e.delta < 8) {
                sfx("whoosh");
                scrollToProject(k);
              }
            }}
            onPointerOver={() => {
              setHovered(true);
              document.body.style.cursor = group.current?.userData.active ? "grab" : "pointer";
            }}
            onPointerOut={() => {
              setHovered(false);
              if (!swing.dragging) document.body.style.cursor = "";
            }}
          >
            <RoundedBox args={[BW, BH, 0.25]} radius={0.08} smoothness={2} material={face} />
            <mesh position={[0, 0, -0.16]} material={backMat}>
              <boxGeometry args={[BW + 0.2, BH + 0.2, 0.06]} />
            </mesh>
          </group>
        </Select>
        {/* neon gradient frame: pink top/left, orange bottom/right (two merged meshes) */}
        <mesh geometry={FRAME.pink} material={frame.pink} />
        <mesh geometry={FRAME.orange} material={frame.orange} />
        <Text
          ref={subRef as never}
          position={[-BW / 2 + 0.45, BH / 2 - 0.45, 0.15]}
          fontSize={0.34}
          font={theme.fonts.monoWoff}
          color={theme.color.accentStrong}
          anchorX="left"
          anchorY="middle"
          letterSpacing={0.12}
        >
          {`${p.index} / 0${total}`}
        </Text>
        <Text
          ref={titleRef as never}
          position={[-BW / 2 + 0.42, -0.2, 0.15]}
          fontSize={1.05}
          maxWidth={BW - 0.9}
          lineHeight={0.95}
          font={theme.fonts.displayWoff}
          color={theme.color.ink}
          anchorX="left"
          anchorY="middle"
        >
          {p.title.toUpperCase()}
        </Text>
        <mesh position={[-BW / 2 + 1.6, -BH / 2 + 0.38, 0.14]}>
          <boxGeometry args={[2.4, 0.1, 0.02]} />
          <meshBasicMaterial color={accentOf(p)} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function ProjectsScene() {
  const L = useStopLayout(2);
  const active = useApp((s) => s.project);
  const boards = useMemo(() => L.at(L.narrow ? 0 : -0.5, L.narrow ? 2.4 : 0.6, 1.5), [L]);
  const emblem = useMemo(() => L.at(L.narrow ? 0.2 : -0.08, 3.2, -22), [L]);
  return (
    <SceneRoot index={2}>
      <group position={boards} rotation-y={L.yaw + TILT}>
        {projects.map((p, k) => (
          <Billboard key={p.id} p={p} k={k} total={projects.length} />
        ))}
      </group>
      <group position={emblem} rotation-y={L.yaw}>
        {projects.map((p, k) => (
          <Emblem key={p.id} kind={p.emblem} color={accentOf(p)} visible={k === active} />
        ))}
      </group>
    </SceneRoot>
  );
}
