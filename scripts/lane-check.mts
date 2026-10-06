/**
 * Diagnostics: drive a virtual car down both traffic lanes and report every scene mesh it would hit.
 * Rays are cast along each lane at bumper height and at both car edges. Usage: npx tsx scripts/lane-check.mts [WxH]
 */
import { chromium } from "@playwright/test";
const [w, h] = (process.argv[2] ?? "1440x900").split("x").map(Number);
const b = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto("http://localhost:3100/?tier=high&diag");
await p.waitForFunction("window.__sceneReady", null, { timeout: 90000 });
await p.waitForTimeout(1500);
const hits = await p.evaluate(`(() => {
  const T = window.__three, scene = window.__scene;
  scene.updateMatrixWorld(true);
  const coastX = (z) => 30 + Math.sin(z * 0.017) * 7 + Math.sin(z * 0.043 + 1.3) * 2.5;
  const roadX = (z) => coastX(z) - 15;
  const roadY = (z) => { const k = 1 - T.MathUtils.smoothstep(Math.abs(z + 102), 14, 34); return 0.38 + k * 8.2; };
  const skip = (o) => { for (let c = o; c; c = c.parent) { if (c.userData && (c.userData.vehicle || c.userData.road)) return true; } return !o.visible || (o.material && (o.material.colorWrite === false || o.material.opacity === 0)); };
  const targets = []; scene.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && !skip(o) && o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count < 2e6) targets.push(o); });
  // ignore the terrain and ocean: road sits on them by design (checked separately by height)
  const big = targets.filter((o) => { o.geometry.computeBoundingBox(); const s = new T.Vector3(); o.geometry.boundingBox.getSize(s); return s.x > 300 || s.z > 300; });
  const list = targets.filter((o) => !big.includes(o));
  const rc = new T.Raycaster(); const out = {};
  for (const lane of [-2.7, 2.7]) {
    for (let z = 60; z > -330; z -= 1) {
      const a = new T.Vector3(roadX(z) + lane, roadY(z), z), bb = new T.Vector3(roadX(z - 1) + lane, roadY(z - 1), z - 1);
      const dir = bb.clone().sub(a); const len = dir.length(); dir.normalize();
      const side = new T.Vector3(-dir.z, 0, dir.x).normalize();
      for (const [sx, hy] of [[0, 0.45], [0.95, 0.5], [-0.95, 0.5], [0, 1.2]]) {
        rc.set(a.clone().addScaledVector(side, sx).add(new T.Vector3(0, hy, 0)), dir); rc.far = len;
        const hit = rc.intersectObjects(list, false)[0];
        if (hit) { let n = hit.object; let path = []; for (let c = n; c && path.length < 4; c = c.parent) path.push(c.name || c.type + (c.userData.sceneRoot ? '#root' + c.userData.index : '')); const k = 'lane ' + lane + ' :: ' + path.join(' < ') + ' | ' + hit.object.geometry.type + ' ' + (hit.object.material.color ? hit.object.material.color.getHexString() : '') + ' @' + hit.point.toArray().map(Math.round).join(',') + ' scale ' + hit.object.getWorldScale(new T.Vector3()).toArray().map((v) => v.toFixed(2)).join(','); (out[k] ||= []).push(Math.round(z)); }
      }
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, zs]) => [k, [...new Set(zs)].length + ' samples, z ' + Math.max(...zs) + '..' + Math.min(...zs)]));
})()`);
console.log(JSON.stringify(hits, null, 1));
await b.close();
