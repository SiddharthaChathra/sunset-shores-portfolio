/// <reference lib="webworker" />
/** Reads the WebGL renderer string off the main thread (OffscreenCanvas), so tier detection never blocks. */
self.onmessage = () => {
  let renderer: string | null = null;
  let caveat = false;
  try {
    const c = new OffscreenCanvas(1, 1);
    let gl = c.getContext("webgl", { failIfMajorPerformanceCaveat: true }) as WebGLRenderingContext | null;
    if (!gl) {
      caveat = true;
      gl = c.getContext("webgl") as WebGLRenderingContext | null;
    }
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    renderer = null;
  }
  (self as unknown as Worker).postMessage({ renderer, caveat });
};
