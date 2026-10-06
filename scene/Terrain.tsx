"use client";

import { use, useEffect, useMemo } from "react";
import * as THREE from "three";
import { TERRAIN_BOUNDS } from "./layout";
import { oceanMaterial, terrainMaterial } from "./fx/materials";
import type { TerrainResult } from "./terrain.worker";

const terrainCache = new Map<string, Promise<TerrainResult>>();

/** Terrain heights + colours are built in a Web Worker (keeps ~200 ms off the main thread). */
function loadTerrain(segX: number, segZ: number) {
  const key = `${segX}x${segZ}`;
  let p = terrainCache.get(key);
  if (!p) {
    p = new Promise<TerrainResult>((resolve, reject) => {
      const w = new Worker(new URL("./terrain.worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (e: MessageEvent<TerrainResult>) => {
        resolve(e.data);
        w.terminate();
      };
      w.onerror = (e) => {
        reject(e);
        w.terminate();
      };
      w.postMessage({ segX, segZ });
    });
    terrainCache.set(key, p);
  }
  return p;
}

/** The coastline: dunes, promenade and beach (vertex-coloured), plus the open sea. */
export function Terrain({ segments, detail = true }: { segments: [number, number]; detail?: boolean }) {
  const data = use(loadTerrain(segments[0], segments[1]));
  const geometry = useMemo(() => {
    const { minX, maxX, minZ, maxZ } = TERRAIN_BOUNDS;
    const g = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ, data.segX, data.segZ);
    g.rotateX(-Math.PI / 2);
    g.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, data.heights[i]);
    g.computeVertexNormals();
    g.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
    return g;
  }, [data]);
  const material = useMemo(() => terrainMaterial(detail), [detail]);
  const ocean = useMemo(() => oceanMaterial(), []);
  const oceanGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(900, 900, 160, 160);
    g.rotateX(-Math.PI / 2);
    g.translate(220, 0, -150);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <>
      <mesh geometry={geometry} material={material} />
      <mesh geometry={oceanGeo} material={ocean} frustumCulled={false} />
    </>
  );
}
