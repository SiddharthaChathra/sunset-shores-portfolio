import * as THREE from "three";
import { theme } from "@/theme/theme";
import { NOISE_GLSL } from "../glsl";
import { SUN_DIR, coastX } from "../layout";
import { off } from "../debug";

/** Shared time uniform for animated materials (advanced once per frame by World). */
export const worldTime = { value: 0 };
/**
 * Wind gust from a tapped palm: a soft pressure wave travelling outward from `pos`.
 * `age` is seconds since the tap (large = no gust). Advanced once per frame by the Palms component.
 */
export const gust = { pos: { value: new THREE.Vector3() }, age: { value: 99 } };
/** Steady breeze phase, integrated on the CPU so a speed change never jumps the phase. */
export const swayPhase = { value: 0 };

/** Live sky colours (updated every frame by Sky) for materials that reflect the sky. */
export const skyTint = { zenith: { value: new THREE.Color(theme.skyZenith.hero) }, horizon: { value: new THREE.Color(theme.color.skyHorizon) } };

/** World-space position varying, injected into a built-in material's vertex shader. */
const WORLD_POS_VERT = [
  "#include <common>",
  "#include <common>\nvarying vec3 vWorldPos;",
  "#include <worldpos_vertex>",
  "#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
] as const;

/**
 * Art-deco facade material: vertex-coloured, and the glass strips (vertex colour #7FB3C8) become windows
 * that reflect the live sunset sky with a Fresnel sheen and a sun glint; about one window in five glows
 * warm from inside. Done in the one shared shader: no extra meshes or draw calls.
 */
export function decoMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 });
  if (off("glass")) return mat;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uZenith = skyTint.zenith;
    shader.uniforms.uHorizon = skyTint.horizon;
    shader.uniforms.uSunDir = { value: SUN_DIR };
    shader.uniforms.uGlass = { value: new THREE.Color("#7FB3C8") };
    shader.vertexShader = shader.vertexShader
      .replace(WORLD_POS_VERT[0], WORLD_POS_VERT[1])
      .replace(WORLD_POS_VERT[2], WORLD_POS_VERT[3]);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uGlass;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float dg_glassK = 1.0 - smoothstep(0.03, 0.09, distance(vColor.rgb, uGlass));
        if (dg_glassK > 0.0) {
          vec3 dg_gn = normalize(normal);
          vec3 dg_gv = normalize(vViewPosition);
          vec3 dg_gr = inverseTransformDirection(reflect(-dg_gv, dg_gn), viewMatrix);
          vec3 dg_skyRef = mix(uHorizon * 1.1, uZenith, smoothstep(-0.05, 0.55, dg_gr.y));
          dg_skyRef += vec3(1.0, 0.82, 0.6) * pow(max(dot(dg_gr, uSunDir), 0.0), 90.0) * 3.0;
          float dg_fres = 0.3 + 0.7 * pow(1.0 - max(dot(dg_gn, dg_gv), 0.0), 3.0);
          vec3 dg_cell = floor(vWorldPos / vec3(2.3, 2.9, 2.3));
          float dg_lit = step(0.8, fract(sin(dot(dg_cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453));
          diffuseColor.rgb *= mix(1.0, 0.2, dg_glassK);
          totalEmissiveRadiance += dg_glassK * (dg_skyRef * dg_fres * 0.85 + dg_lit * vec3(1.0, 0.6, 0.3) * 0.75);
        }`,
      );
  };
  mat.customProgramCacheKey = () => "deco-glass";
  return mat;
}

/**
 * Lit asphalt for the coastal highway: takes sunlight, sheen and shadows; dashed centre line and edge
 * lines are painted in the shader from the road ribbon's UVs (u across, v along).
 */
export function roadMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: theme.materials.asphalt, roughness: 0.62, metalness: 0.0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLane = { value: new THREE.Color(theme.materials.lane) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vRoadUv;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvRoadUv = uv;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vRoadUv; uniform vec3 uLane;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float rd_x = vRoadUv.x;
        float rd_centre = step(abs(rd_x - 0.5), 0.008) * step(0.45, fract(vRoadUv.y * 0.12));
        float rd_edges = step(abs(rd_x - 0.06), 0.006) + step(abs(rd_x - 0.94), 0.006);
        float rd_grain = fract(sin(dot(floor(vRoadUv * vec2(60.0, 8.0)), vec2(12.9898, 78.233))) * 43758.5453);
        // tyre tracks: slightly darker, smoother bands in each lane
        float rd_tracks = smoothstep(0.05, 0.0, abs(abs(rd_x - 0.5) - 0.25) - 0.06);
        diffuseColor.rgb *= 0.92 + rd_grain * 0.1 - rd_tracks * 0.08;
        diffuseColor.rgb = mix(diffuseColor.rgb, uLane, clamp(rd_centre + rd_edges, 0.0, 1.0));`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor - smoothstep(0.05, 0.0, abs(abs(vRoadUv.x - 0.5) - 0.25) - 0.06) * 0.22, 0.2, 1.0);",
      );
  };
  mat.customProgramCacheKey = () => "road-lit";
  return mat;
}

/** Sand and grass: fine wind ripples and grain on top of the terrain's vertex colours (no textures). */
export function terrainMaterial(detail = true) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  if (!detail || off("detail")) return mat;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(WORLD_POS_VERT[0], WORLD_POS_VERT[1])
      .replace(WORLD_POS_VERT[2], WORLD_POS_VERT[3]);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos;").replace(
      "#include <color_fragment>",
      `#include <color_fragment>
        vec2 tr_wp = vWorldPos.xz;
        float tr_ripple = sin(tr_wp.x * 1.7 + sin(tr_wp.y * 0.35) * 2.2 + tr_wp.y * 0.45) * 0.5 + 0.5;
        float tr_grainS = fract(sin(dot(floor(tr_wp * 9.0), vec2(12.9898, 78.233))) * 43758.5453);
        float tr_fade = 1.0 - smoothstep(25.0, 90.0, length(vWorldPos - cameraPosition));
        diffuseColor.rgb *= 1.0 + ((tr_ripple - 0.5) * 0.06 + (tr_grainS - 0.5) * 0.05) * tr_fade;`,
    );
  };
  mat.customProgramCacheKey = () => "terrain-detail";
  return mat;
}

/** Emissive neon tube: unlit, over-bright so it blooms. */
export function neonMaterial(color: string, intensity = 2.4) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false });
}

/** Glossy car paint: clearcoat over a flaked base. */
export function paintMaterial(color: string) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.45,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    sheen: 0.4,
    sheenColor: new THREE.Color("#FFD1DC"),
  });
}

/** Adds a noise dissolve with an accent edge glow to a standard material. Returns its uniforms. */
export function addDissolve(mat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial, edgeColor: string) {
  const uniforms = { uDissolve: { value: 0 }, uEdge: { value: new THREE.Color(edgeColor) }, uScale: { value: 1.4 } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLPos = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vLPos;\nuniform float uDissolve; uniform vec3 uEdge; uniform float uScale;\n${NOISE_GLSL}`)
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        // noise only while dissolving (uniform branch): a resting billboard costs a plain lit surface
        float dEdge = 0.0;
        if (uDissolve > 0.0) {
          float dn = fbm2(vLPos.xy * uScale + vLPos.z) * 0.5 + 0.5;
          if (dn < uDissolve) discard;
          dEdge = 1.0 - smoothstep(uDissolve, uDissolve + 0.07, dn);
        }`,
      )
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEdge * dEdge * 3.0;");
  };
  mat.customProgramCacheKey = () => "dissolve";
  return uniforms;
}

/** Palm sway: bends vertices by height with a per-instance phase (InstancedMesh). */
export function addSway(mat: THREE.MeshStandardMaterial, strength = 1) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = worldTime;
    shader.uniforms.uSwayPhase = swayPhase;
    shader.uniforms.uGustPos = gust.pos;
    shader.uniforms.uGustAge = gust.age;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uSwayPhase; uniform vec3 uGustPos; uniform float uGustAge;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          mat4 sw_im = instanceMatrix;
        #else
          mat4 sw_im = mat4(1.0);
        #endif
        vec3 sw_base = (modelMatrix * sw_im[3]).xyz;
        float sw_phase = sw_base.x * 0.37 + sw_base.z * 0.21;
        float sw_hk = max(0.0, position.y) * ${(0.022 * strength).toFixed(4)};
        float sw_bendK = sw_hk * sw_hk * 6.0;
        // steady breeze
        float sw_sway = sin(uSwayPhase + sw_phase) + sin(uTime * 2.3 + sw_phase * 1.7) * 0.25;
        transformed.x += sw_sway * sw_bendK;
        transformed.z += cos(uSwayPhase * 0.8 + sw_phase) * sw_bendK * 0.5;
        // gust: a wave leaves the tapped palm at 16 m/s; each palm bends away from it once,
        // then settles with a damped sway (about 1 Hz). Fades out within ~30 m.
        vec2 sw_away = sw_base.xz - uGustPos.xz;
        float sw_dist = length(sw_away);
        float sw_t = uGustAge - sw_dist / 16.0;
        if (sw_t > 0.0 && sw_dist < 34.0) {
          float sw_env = exp(-sw_t * 1.5) * smoothstep(0.0, 0.18, sw_t) * (1.0 - smoothstep(14.0, 34.0, sw_dist));
          float sw_bend = (0.55 + 0.45 * cos(sw_t * 6.2)) * sw_env * 1.6;
          vec2 sw_dir = sw_dist > 0.01 ? sw_away / sw_dist : vec2(1.0, 0.0);
          // world bend direction into the instance's local frame
          vec3 sw_localDir = normalize(transpose(mat3(sw_im)) * vec3(sw_dir.x, 0.0, sw_dir.y));
          transformed.xz += sw_localDir.xz * sw_bend * sw_bendK;
          // fronds flutter a little while the gust passes
          transformed.y += sin(uTime * 9.0 + position.x * 3.0) * sw_env * sw_hk * 0.6;
        }`,
      );
  };
  mat.customProgramCacheKey = () => `sway3-${strength}`;
  return mat;
}

/** Ocean: shallow → deep by distance from the shore, foam at the waterline, sun glints and soft swell. */
export function oceanMaterial() {
  const o = theme.materials.ocean;
  return new THREE.ShaderMaterial({
    transparent: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: worldTime,
        uDeep: { value: new THREE.Color(o.deep) },
        uShallow: { value: new THREE.Color(o.shallow) },
        uSky: { value: new THREE.Color("#FFC0B0") },
        uSun: { value: SUN_DIR },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vW;
      uniform float uTime;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        wp.y += sin(wp.x * 0.12 + uTime * 0.9) * 0.08 + sin(wp.z * 0.09 - uTime * 0.7) * 0.08;
        vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky; uniform vec3 uSun;
      varying vec3 vW;
      ${NOISE_GLSL}
      float coastX(float z){ return 30.0 + sin(z * 0.017) * 7.0 + sin(z * 0.043 + 1.3) * 2.5; }
      void main(){
        float d = vW.x - coastX(vW.z);
        float shore = smoothstep(-6.0, 28.0, d);
        vec3 col = mix(uShallow, uDeep, shore);
        // procedural ripple normal
        vec2 p = vW.xz * 0.35;
        float n1 = snoise(p + vec2(uTime * 0.25, uTime * 0.1));
        float n2 = snoise(p * 2.3 - vec2(uTime * 0.3, -uTime * 0.2));
        vec3 nrm = normalize(vec3(n1 * 0.35 + n2 * 0.15, 1.0, n2 * 0.35 - n1 * 0.12));
        vec3 view = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(nrm, view), 0.0), 3.0);
        col = mix(col, uSky, fres * 0.55);
        // sun glints
        vec3 h = normalize(uSun + view);
        float spec = pow(max(dot(nrm, h), 0.0), 220.0);
        col += vec3(1.0, 0.85, 0.6) * spec * 2.4;
        // foam line at the waterline + soft breaking band
        float foam = smoothstep(1.4, 0.0, abs(d + 5.2 + sin(vW.z * 0.2 + uTime * 1.3) * 0.8)) * (0.55 + 0.45 * n2);
        col = mix(col, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.85);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
  });
}

/** Pool floor caustics (animated cellular light pattern over pale tiles). */
export function causticsMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: worldTime, uRipple: { value: new THREE.Vector3(0, 0, -100) } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uRipple; varying vec2 vUv;
      vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
      float cells(vec2 p){
        vec2 i = floor(p), f = fract(p); float m = 8.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
          vec2 g = vec2(float(x), float(y));
          vec2 o = h22(i + g); o = 0.5 + 0.5 * sin(uTime * 0.9 + 6.2831 * o);
          m = min(m, length(g + o - f));
        }
        return m;
      }
      void main(){
        vec2 uv = vUv * vec2(9.0, 5.0);
        float c = pow(cells(uv), 2.2) + pow(cells(uv * 1.7 + 3.1), 2.2) * 0.6;
        vec2 tile = abs(fract(vUv * vec2(18.0, 10.0)) - 0.5);
        float grout = 1.0 - smoothstep(0.44, 0.48, max(tile.x, tile.y));
        vec3 base = mix(vec3(0.62, 0.86, 0.9), vec3(0.88, 0.97, 0.98), grout);
        vec3 col = base + vec3(1.0, 0.98, 0.9) * smoothstep(0.05, 0.0, c - 0.02) * 0.0 + vec3(0.95, 1.0, 1.0) * (1.0 - smoothstep(0.0, 0.12, c)) * 0.55;
        float r = length(vUv - uRipple.xy);
        float age = uTime - uRipple.z;
        col += vec3(1.0) * smoothstep(0.03, 0.0, abs(r - age * 0.35)) * max(0.0, 1.0 - age * 0.6) * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

/** Warm translucent water surface over the pool floor. */
export function poolWaterMaterial() {
  return new THREE.MeshPhysicalMaterial({ color: "#7FE3E0", transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0, clearcoat: 1 });
}

export { coastX };
