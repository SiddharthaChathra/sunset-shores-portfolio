"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, GodRays, Outline, SMAA } from "@react-three/postprocessing";
import { BlendFunction, Effect, EffectAttribute, type ChromaticAberrationEffect, type EffectComposer as Composer } from "postprocessing";
import * as THREE from "three";
import { theme } from "@/theme/theme";
import { rig } from "@/lib/rig";
import { SUN_DIR } from "../layout";
import { off } from "../debug";

/** The live composer, so shaders can be precompiled against its real input buffer. */
export const composerHandle: { current: Composer | null } = { current: null };

/** Warm golden-hour grade: violet-ish shadows, peach highlights, gentle film grain, and a simple sun flare. */
class WarmGradeEffect extends Effect {
  constructor() {
    super(
      "WarmGrade",
      /* glsl */ `
      uniform float uTime; uniform float uGrain; uniform vec3 uSun; uniform float uAspect;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
        vec3 c = inputColor.rgb;
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        c *= mix(vec3(0.96, 0.92, 1.05), vec3(1.05, 0.99, 0.91), smoothstep(0.15, 0.85, l));
        c = mix(vec3(l), c, 1.07);
        if (uSun.z > 0.0) {
          vec2 s = uSun.xy;
          vec2 axis = vec2(0.5) - s;
          for (int i = 1; i <= 3; i++) {
            vec2 g = s + axis * (0.55 * float(i));
            vec2 d = (uv - g) * vec2(uAspect, 1.0);
            float r = 0.025 + 0.02 * float(i);
            c += vec3(1.0, 0.6, 0.5) * smoothstep(r, r * 0.4, length(d)) * 0.05 * uSun.z;
          }
          vec2 ds = (uv - s) * vec2(uAspect, 1.0);
          c += vec3(1.0, 0.8, 0.6) * exp(-length(ds) * 9.0) * 0.12 * uSun.z;
        }
        // gentle filmic S-curve (more depth without crushing the pastel palette) + soft warm vignette
        vec3 cc = clamp(c, 0.0, 1.0);
        c += (cc * cc * (3.0 - 2.0 * cc) - cc) * 0.14;
        vec2 vq = (uv - 0.5) * vec2(1.0, 0.82);
        c *= mix(vec3(1.0), vec3(0.86, 0.8, 0.9), smoothstep(0.32, 0.78, length(vq)));
        float n = fract(sin(dot(uv * vec2(1931.0, 1087.0) + fract(uTime) * 61.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        c += n * uGrain;
        outputColor = vec4(c, inputColor.a);
      }`,
      {
        blendFunction: BlendFunction.NORMAL,
        uniforms: new Map<string, THREE.Uniform>([
          ["uTime", new THREE.Uniform(0)],
          ["uGrain", new THREE.Uniform(0.04)],
          ["uSun", new THREE.Uniform(new THREE.Vector3(0.5, 0.5, 0))],
          ["uAspect", new THREE.Uniform(1.6)],
        ]),
      },
    );
  }
}

/** Heat haze: shimmer the far distance (depth-masked) near the horizon. High tier only. */
class HeatHazeEffect extends Effect {
  constructor() {
    super(
      "HeatHaze",
      /* glsl */ `
      uniform float uTime;
      void mainUv(inout vec2 uv){
        float depth = readDepth(uv);
        float far = smoothstep(0.9965, 0.9995, depth);
        float band = smoothstep(0.25, 0.45, uv.y) * (1.0 - smoothstep(0.55, 0.7, uv.y));
        uv.x += sin(uv.y * 220.0 + uTime * 3.0) * 0.0009 * far * band;
        uv.y += cos(uv.x * 180.0 + uTime * 2.4) * 0.0006 * far * band;
      }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){ outputColor = inputColor; }`,
      { attributes: EffectAttribute.DEPTH, uniforms: new Map<string, THREE.Uniform>([["uTime", new THREE.Uniform(0)]]) },
    );
  }
}

export function Effects({ mode }: { mode: "full" | "bloom" | "none" }) {
  const grade = useMemo(() => new WarmGradeEffect(), []);
  const haze = useMemo(() => new HeatHazeEffect(), []);
  const ca = useRef<ChromaticAberrationEffect>(null);
  const [sun, setSun] = useState<THREE.Mesh | null>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  const caOffset = useMemo(() => new THREE.Vector2(0, 0), []);

  useFrame((_, dt) => {
    const u = grade.uniforms;
    (u.get("uTime") as THREE.Uniform<number>).value += dt;
    (u.get("uAspect") as THREE.Uniform<number>).value = size.width / Math.max(1, size.height);
    v.copy(camera.position).addScaledVector(SUN_DIR, 500).project(camera);
    const vis = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15 ? 1 - Math.max(Math.abs(v.x), Math.abs(v.y)) * 0.6 : 0;
    (u.get("uSun") as THREE.Uniform<THREE.Vector3>).value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5, Math.max(0, vis));
    (haze.uniforms.get("uTime") as THREE.Uniform<number>).value += dt;
    if (sun) sun.position.copy(camera.position).addScaledVector(SUN_DIR, 420);
    // Chromatic aberration only while driving fast between sections.
    if (ca.current) {
      const k = Math.min(1, Math.abs(rig.velocity) / 60);
      ca.current.offset.set(0.0022 * k, 0.0012 * k);
    }
  });

  if (mode === "none" || off("post")) return null;
  if (mode === "bloom") {
    return (
      <EffectComposer ref={(c) => void (composerHandle.current = c)} multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur resolutionScale={0.5} levels={5} luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.85} radius={0.7} />
        <primitive object={grade} />
      </EffectComposer>
    );
  }
  return (
    <>
      {/* sun proxy for god rays (kept far along the sun direction from the camera) */}
      <mesh ref={setSun}>
        <sphereGeometry args={[18, 16, 12]} />
        <meshBasicMaterial color="#FFE3B0" transparent opacity={0} depthWrite={false} toneMapped={false} fog={false} />
      </mesh>
      <EffectComposer ref={(c) => void (composerHandle.current = c)} multisampling={0} enableNormalPass={false} autoClear={false}>
        {off("haze") ? <></> : <primitive object={haze} />}
        {sun && !off("rays") ? <GodRays sun={sun} samples={40} density={0.9} decay={0.93} weight={0.35} exposure={0.35} clampMax={1} blur /> : <></>}
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} radius={0.72} />
        <Outline
          visibleEdgeColor={parseInt(theme.color.accent.slice(1), 16)}
          hiddenEdgeColor={parseInt(theme.color.accent.slice(1), 16)}
          edgeStrength={4}
          width={900}
          blur
        />
        <ChromaticAberration ref={ca} offset={caOffset} radialModulation={false} modulationOffset={0} />
        <primitive object={grade} />
        <SMAA />
      </EffectComposer>
    </>
  );
}
