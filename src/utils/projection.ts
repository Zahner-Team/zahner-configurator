import * as THREE from "three";

/** Convert a world-space point into screen-space pixel coords */
export function worldToScreen(
  v: THREE.Vector3,
  camera: THREE.Camera,
  viewport: { width: number; height: number }
) {
  const ndc = v.clone().project(camera);           // Normalised device coords (-1…+1)
  return {
    x: ((ndc.x + 1) / 2) * viewport.width,
    y: ((1 - ndc.y) / 2) * viewport.height,
  };
}
