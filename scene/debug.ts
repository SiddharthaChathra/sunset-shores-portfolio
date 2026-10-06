/**
 * Diagnostics only: ?off=post,haze,rays,traffic,road,glass,detail,shadows disables a feature for bisecting perf.
 * ?fixeddpr pins the render resolution (no dynamic resolution); ?diag exposes three.js for scripts/lane-check.mts.
 */
export const off = (k: string) =>
  typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("off") ?? "").split(",").includes(k);
