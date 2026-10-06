"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type Uniforms = Record<string, number | [number, number, number]>;

const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

/**
 * Minimal full-quad fragment-shader canvas (raw WebGL, no three.js) so the companion works on every
 * quality tier, including the low tier where the 3D world is not loaded. `getUniforms` runs every frame.
 */
export function ShaderCanvas({
  frag,
  getUniforms,
  className,
  animate = true,
  fallback,
}: {
  frag: string;
  getUniforms: (t: number) => Uniforms;
  className?: string;
  animate?: boolean;
  fallback?: React.ReactNode;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const getRef = useRef(getUniforms);
  useLayoutEffect(() => {
    getRef.current = getUniforms;
  });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true });
    if (!gl) {
      canvas.style.display = "none";
      queueMicrotask(() => setFailed(true));
      return;
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, "precision mediump float;\nvarying vec2 vUv;\n" + frag));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const locs = new Map<string, WebGLUniformLocation | null>();
    const uloc = (n: string) => {
      if (!locs.has(n)) locs.set(n, gl.getUniformLocation(prog, n));
      return locs.get(n)!;
    };

    let raf = 0;
    const t0 = performance.now();
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const t = (performance.now() - t0) / 1000;
      gl.uniform2f(uloc("uRes"), w, h);
      gl.uniform1f(uloc("uTime"), t);
      for (const [k, v] of Object.entries(getRef.current(t))) {
        if (typeof v === "number") gl.uniform1f(uloc(k), v);
        else gl.uniform3f(uloc(k), v[0], v[1], v[2]);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (animate && !document.hidden) raf = requestAnimationFrame(draw);
    };
    draw();
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && animate) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [frag, animate]);

  return (
    <>
      <canvas ref={ref} className={className} aria-hidden />
      {failed ? fallback : null}
    </>
  );
}

export const hex3 = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
