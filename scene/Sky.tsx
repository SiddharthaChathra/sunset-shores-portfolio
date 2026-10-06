"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SECTION_ORDER, theme } from "@/theme/theme";
import { NOISE_GLSL } from "./glsl";
import { camState } from "./CameraRig";
import { SUN_DIR } from "./layout";
import { skyTint } from "./fx/materials";

const ZENITH = SECTION_ORDER.map((s) => new THREE.Color(theme.skyZenith[s]));
const HAZE = SECTION_ORDER.map((s) => new THREE.Color(theme.haze[s]));
const HORIZON = new THREE.Color(theme.color.skyHorizon);
const WHITE = new THREE.Color(1, 1, 1);

/** Shared per-frame colours (fog, lights, ocean read these). */
export const skyColors = {
  zenith: new THREE.Color(theme.skyZenith.hero),
  haze: new THREE.Color(theme.haze.hero),
  horizon: HORIZON.clone(),
};

export { SUN_DIR };

/** Golden-hour sky: zenith → horizon gradient per section, a big low sun with halo, pink-lit streaky clouds. */
/** Direction toward the key light (the sun lifted a little, so golden-hour shadows stay readable). */
const KEY_DIR = SUN_DIR.clone().multiplyScalar(100).add(new THREE.Vector3(0, 30, 0)).normalize();
const SHADOW_SNAP = 6;

/** Decide once per object whether it casts / receives sun shadows. */
function flagShadows(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o.userData.shadowSet || !(o as THREE.Mesh).isMesh) return;
    o.userData.shadowSet = true;
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[];
    const mat = Array.isArray(m) ? m[0] : m;
    const lit = mat instanceof THREE.MeshStandardMaterial; // includes MeshPhysicalMaterial
    if (!lit) return;
    o.receiveShadow = true;
    let vehicle = false;
    for (let c: THREE.Object3D | null = o; c; c = c.parent) if (c.userData.vehicle || c.userData.road) vehicle = true;
    const geo = (o as THREE.Mesh).geometry;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const huge = (geo.boundingSphere?.radius ?? 0) > 150; // terrain: receives only
    o.castShadow = !vehicle && !huge && !mat.transparent;
  });
}

export function Sky({ shadows = false }: { shadows?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const shadowAt = useRef(new THREE.Vector3(1e9, 0, 0));
  const warm = useRef(0);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const centre = useMemo(() => new THREE.Vector3(), []);

  // Sun shadows (high tier): the shadow map is cached and re-rendered only when the area in view moves.
  useLayoutEffect(() => {
    if (!shadows) return;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl, shadows]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        uniforms: {
          uTop: { value: new THREE.Color() },
          uHorizon: { value: new THREE.Color() },
          uHaze: { value: new THREE.Color() },
          uSunDir: { value: SUN_DIR },
          uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main(){
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uHaze; uniform vec3 uSunDir; uniform float uTime;
          varying vec3 vDir;
          ${NOISE_GLSL}
          void main(){
            vec3 d = normalize(vDir);
            float h = d.y;
            float sun = max(dot(d, uSunDir), 0.0);
            // warmer horizon toward the sun
            vec3 horizon = mix(uHorizon, vec3(1.0, 0.72, 0.5), pow(sun, 3.0) * 0.6);
            vec3 col = mix(horizon, uTop, smoothstep(0.0, 0.55, h));
            col = mix(col, uHaze, (1.0 - smoothstep(-0.02, 0.12, h)) * 0.85);
            // sun disc + halo
            col += vec3(1.0, 0.86, 0.62) * (smoothstep(0.9988, 0.9993, sun) * 1.6 + pow(sun, 60.0) * 0.55 + pow(sun, 8.0) * 0.22);
            // streaky cirrus lit pink from below
            vec2 uv = d.xz / (h + 0.25);
            float c = fbm2(vec2(uv.x * 0.6, uv.y * 2.4) + vec2(uTime * 0.006, 0.0));
            float clouds = smoothstep(0.1, 0.65, c) * smoothstep(0.03, 0.22, h) * (1.0 - smoothstep(0.45, 0.85, h));
            vec3 cloudCol = mix(vec3(1.0, 0.62, 0.72), vec3(1.0, 0.86, 0.7), pow(sun, 2.0));
            col = mix(col, cloudCol, clouds * 0.55);
            // below horizon (seen past the sea edge) fades to haze
            col = mix(col, uHaze, 1.0 - smoothstep(-0.06, 0.0, h));
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  );

  const fog = useMemo(() => new THREE.Fog(theme.haze.hero, 60, 260), []);
  // Fog must exist before the shader precompile pass, or every program recompiles (with FOG) on frame 1.
  useLayoutEffect(() => {
    scene.fog = fog;
  }, [scene, fog]);

  useFrame((state, dt) => {
    const w = camState.world;
    const i = Math.min(ZENITH.length - 2, Math.floor(w));
    const f = THREE.MathUtils.clamp(w - i, 0, 1);
    skyColors.zenith.copy(ZENITH[i]).lerp(ZENITH[i + 1], f);
    skyColors.haze.copy(HAZE[i]).lerp(HAZE[i + 1], f);
    skyColors.horizon.copy(HORIZON).lerp(skyColors.haze, 0.35);
    material.uniforms.uTop.value.copy(skyColors.zenith);
    material.uniforms.uHorizon.value.copy(skyColors.horizon);
    material.uniforms.uHaze.value.copy(skyColors.haze);
    material.uniforms.uTime.value += dt;
    skyTint.zenith.value.copy(skyColors.zenith);
    skyTint.horizon.value.copy(skyColors.horizon);
    fog.color.copy(skyColors.haze);
    if (scene.fog !== fog) scene.fog = fog;
    (scene.background as THREE.Color | null)?.copy?.(skyColors.haze);
    if (mesh.current) mesh.current.position.copy(state.camera.position);
    if (hemi.current) hemi.current.color.copy(skyColors.zenith).lerp(WHITE, 0.4);

    const light = sun.current;
    if (shadows && light) {
      state.camera.getWorldDirection(fwd).setY(0).normalize();
      centre.copy(state.camera.position).addScaledVector(fwd, 38);
      centre.set(Math.round(centre.x / SHADOW_SNAP) * SHADOW_SNAP, 0, Math.round(centre.z / SHADOW_SNAP) * SHADOW_SNAP);
      // Buildings are built a few at a time while loading: pick them up during the first seconds too.
      warm.current++;
      const settling = warm.current < 400 && warm.current % 40 === 0;
      if (!centre.equals(shadowAt.current) || settling) {
        shadowAt.current.copy(centre);
        light.target.position.copy(centre);
        light.target.updateMatrixWorld();
        light.position.copy(centre).addScaledVector(KEY_DIR, 140);
        light.updateMatrixWorld();
        flagShadows(scene);
        gl.shadowMap.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <mesh ref={mesh} material={material} frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[900, 48, 24]} />
      </mesh>
      <hemisphereLight ref={hemi} args={["#FFD0DC", "#E8B993", 1.05]} />
      <directionalLight
        ref={sun}
        position={KEY_DIR.clone().multiplyScalar(140).toArray()}
        intensity={2.6}
        color="#FFB98A"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.5}
        shadow-camera-left={-52}
        shadow-camera-right={52}
        shadow-camera-top={52}
        shadow-camera-bottom={-52}
        shadow-camera-near={1}
        shadow-camera-far={320}
      />
      <directionalLight position={[-40, 60, 30]} intensity={0.45} color="#C9B8FF" />
      <ambientLight intensity={0.22} color="#FFE3D3" />
    </>
  );
}
