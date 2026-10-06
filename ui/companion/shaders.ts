/** Assistant waveform (fragment shader for ShaderCanvas). */

const NOISE = `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
`;

/**
 * Siri-style layered ribbons in the signature gradient (pink → coral → orange, teal accent).
 * uMode: 0 idle (calm), 1 listening (mic level), 2 thinking (fast shimmer), 3 speaking (pulses with the stream).
 */
export const WAVE_FRAG = `
uniform vec2 uRes; uniform float uTime; uniform float uAmp; uniform float uMode; uniform float uLevel; uniform float uPulse;
uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4;
${NOISE}
vec3 grad(float x){ return x < 0.5 ? mix(uC1, uC2, x * 2.0) : mix(uC2, uC3, (x - 0.5) * 2.0); }
float ribbon(vec2 uv, float freq, float speed, float phase, float amp, float width){
  float env = pow(sin(3.14159 * uv.x), 2.0);
  float y = sin(uv.x * freq + uTime * speed + phase) * amp * env;
  y += (vnoise(vec2(uv.x * 3.0 + uTime * speed * 0.3, phase)) - 0.5) * amp * 0.6 * env;
  float d = abs(uv.y - 0.5 - y);
  return smoothstep(width, 0.0, d) + smoothstep(width * 7.0, 0.0, d) * 0.22;
}
void main(){
  vec2 uv = vUv;
  float thinking = step(1.5, uMode) * step(uMode, 2.5);
  vec3 col = vec3(0.0); float alpha = 0.0;
  for (int i = 0; i < 4; i++){
    float fi = float(i);
    float a = uAmp * (1.0 - fi * 0.17);
    float speed = 1.3 + fi * 0.55 + thinking * 3.2;
    float freq = 7.0 + fi * 2.6 + thinking * 5.0 * sin(uTime + fi);
    float r = ribbon(uv, freq, speed, fi * 1.9, a, 0.013 + fi * 0.002);
    vec3 c = fi < 3.0 ? grad(fract(uv.x + fi * 0.18)) : uC4;
    col += c * r; alpha += r * (0.95 - fi * 0.14);
  }
  float sweep = smoothstep(0.12, 0.0, abs(uv.x - fract(uTime * 0.6))) * thinking * smoothstep(0.35, 0.0, abs(uv.y - 0.5));
  col += uC3 * sweep; alpha += sweep * 0.6;
  alpha = clamp(alpha, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha / max(alpha, 0.001) * alpha, alpha);
}
`;
