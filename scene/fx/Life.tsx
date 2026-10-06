"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { coastX } from "../layout";
import { worldTime } from "./materials";

/** Distant bird flocks: instanced V shapes with flapping wings, wheeling over the shore near the camera. */
export function Birds({ count = 28 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // body at origin, two wing triangles
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.15, -0.9, 0.05, -0.1, 0, 0, -0.2, 0, 0, 0.15, 0, 0, -0.2, 0.9, 0.05, -0.1], 3));
    g.computeVertexNormals();
    const m = new THREE.MeshBasicMaterial({ color: "#5B4A6E", side: THREE.DoubleSide });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = worldTime;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z;
          transformed.y += sin(uTime * 9.0 + ph) * abs(position.x) * 0.7;`,
        );
    };
    return { geometry: g, material: m };
  }, []);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ r: 6 + (i % 7) * 1.3, h: 18 + (i % 5) * 2.2, s: 0.25 + (i % 3) * 0.06, o: i * 0.7, f: Math.floor(i / 10) })), [count]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const cz = state.camera.position.z - 50;
    seeds.forEach((s, i) => {
      const fz = cz - s.f * 40;
      const cx = coastX(fz) + 20 + s.f * 15;
      const a = t * s.s + s.o;
      o.position.set(cx + Math.cos(a) * s.r * 2, s.h + Math.sin(t * 0.5 + s.o) * 1.5, fz + Math.sin(a) * s.r);
      o.rotation.set(0, -a, Math.sin(a) * 0.2);
      o.scale.setScalar(0.9);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />;
}

const BOX = new THREE.Vector3(70, 14, 70);

/** Drifting sea spray / warm sun motes around the camera; densest near the waterline, faded near the lens. */
export function Spray({ count }: { count: number }) {
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = Math.random() * BOX.x;
      pos[i * 3 + 1] = Math.random() * BOX.y;
      pos[i * 3 + 2] = Math.random() * BOX.z;
      seed[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: worldTime, uCam: { value: new THREE.Vector3() }, uBox: { value: BOX }, uPixel: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform vec3 uCam; uniform vec3 uBox; uniform float uPixel;
        attribute float aSeed; varying float vFade; varying float vSeed;
        void main(){
          vec3 p = position;
          p.y += uTime * (0.15 + aSeed * 0.25);
          p.x += sin(uTime * 0.4 + aSeed * 40.0) * 1.2 + uTime * 0.6;
          vec3 origin = uCam - uBox * 0.5 + vec3(0.0, 3.0, 0.0);
          vec3 w = mod(p - origin, uBox) + origin;
          vec4 mv = viewMatrix * vec4(w, 1.0);
          float d = -mv.z;
          vFade = smoothstep(5.0, 14.0, d) * (1.0 - smoothstep(26.0, 34.0, d));
          vSeed = aSeed;
          gl_PointSize = uPixel * (0.6 + aSeed * 1.4) * (55.0 / d);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vFade; varying float vSeed;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          vec3 col = mix(vec3(1.0), vec3(1.0, 0.82, 0.66), vSeed);
          gl_FragColor = vec4(col, smoothstep(0.5, 0.0, d) * vFade * 0.7);
        }`,
    });
    return { geometry: g, material: m };
  }, [count]);
  useFrame((state) => {
    material.uniforms.uCam.value.copy(state.camera.position);
    material.uniforms.uPixel.value = state.gl.getPixelRatio();
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
