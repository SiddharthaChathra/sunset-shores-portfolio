"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Selection } from "@react-three/postprocessing";
import type { Tier } from "@/lib/store";
import type { TierSettings } from "@/lib/quality";
import { CameraRig } from "./CameraRig";
import { Sky } from "./Sky";
import { Terrain } from "./Terrain";
import { Effects } from "./fx/Effects";
import { worldTime } from "./fx/materials";
import { Birds, Spray } from "./fx/Life";
import { Road } from "./props/Road";
import { Street } from "./props/Street";
import { Traffic } from "./props/Car";
import { off } from "./debug";
import { HeroScene } from "./scenes/HeroScene";
import { AboutScene } from "./scenes/AboutScene";
import { ProjectsScene } from "./scenes/ProjectsScene";
import { ExperienceScene } from "./scenes/ExperienceScene";
import { CertificatesScene } from "./scenes/CertificatesScene";
import { SkillsScene } from "./scenes/SkillsScene";
import { ContactScene } from "./scenes/ContactScene";

function Clock() {
  useFrame((_, dt) => {
    worldTime.value += Math.min(dt, 0.1);
  });
  return null;
}

/**
 * The world mounts in stages, one React commit per task, so building geometry for the whole coast never
 * lands in a single long main-thread task. `onStaged` fires once everything (incl. the composer) is mounted.
 */
export function World({ tier, settings, onStaged }: { tier: Exclude<Tier, "low">; settings: TierSettings; onStaged: () => void }) {
  const high = tier === "high";
  const parts: ReactNode[] = [
    <>
      <Clock />
      <CameraRig />
      <Sky shadows={high && !off("shadows")} />
      {high && (
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={2.4} color="#FFC48C" position={[6, 2, -8]} scale={[16, 5, 1]} />
          <Lightformer intensity={1.2} color="#FF8FB1" position={[-8, 4, 4]} rotation-y={Math.PI / 2} scale={[10, 6, 1]} />
          <Lightformer intensity={0.9} color="#C9F0EA" position={[0, -3, 6]} scale={[14, 3, 1]} />
          <Lightformer form="ring" intensity={2} color="#FFF1C9" position={[8, 6, -6]} scale={4} />
        </Environment>
      )}
      <Terrain segments={high ? [160, 300] : [110, 210]} detail={high} />
    </>,
    off("road") ? null : <Road key="road" />,
    <Street key="street" density={high ? 1 : 0.75} />,
    <>
      {!off("traffic") && <Traffic count={high ? 7 : 5} />}
      <Birds count={high ? 30 : 16} />
      <Spray count={settings.particles} />
    </>,
    <HeroScene key="hero" />,
    <AboutScene key="about" />,
    <ProjectsScene key="projects" />,
    <ExperienceScene key="experience" />,
    <CertificatesScene key="certificates" />,
    <SkillsScene key="skills" />,
    <ContactScene key="contact" />,
    <Effects key="fx" mode={settings.post} />,
  ];
  const [n, setN] = useState(1);
  useEffect(() => {
    if (n < parts.length) {
      const t = setTimeout(() => setN((k) => k + 1), 0);
      return () => clearTimeout(t);
    }
    onStaged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  return (
    <Selection>
      {parts.slice(0, n).map((p, i) => (
        <group key={i}>{p}</group>
      ))}
    </Selection>
  );
}
