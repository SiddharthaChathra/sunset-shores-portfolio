import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Geometry builder: accumulate coloured primitives, then merge into one vertex-coloured mesh (1 draw call). */
export class GeoBuilder {
  parts: THREE.BufferGeometry[] = [];

  add(g: THREE.BufferGeometry, color: string | THREE.Color, m?: THREE.Matrix4) {
    const geo = g.index ? g.toNonIndexed() : g;
    if (m) geo.applyMatrix4(m);
    const c = new THREE.Color(color);
    const n = geo.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.deleteAttribute("uv");
    this.parts.push(geo);
    return this;
  }

  box(w: number, h: number, d: number, x: number, y: number, z: number, color: string, ry = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.BoxGeometry(w, h, d), color, m);
  }

  cyl(rt: number, rb: number, h: number, x: number, y: number, z: number, color: string, seg = 10, rx = 0, rz = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, m);
  }

  build() {
    const g = mergeGeometries(this.parts, false);
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    // primitives already carry correct normals; recomputing them on the merged mesh was pure boot cost
    g.computeBoundingSphere();
    return g;
  }
}

export const vertexColorMaterial = (roughness = 0.75, metalness = 0.05) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness });
