import * as THREE from "three";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import useUI from "../store/useUI";
import {
  CELL_IN,
  H_JOINT_IN,
  PICK_RADIUS_PX,
} from "../constants/layout";
import { worldToScreen } from "../utils/projection";

interface Props {
  wallW: number;
  wallH: number;
}

export default function SeamPicker({ wallW, wallH }: Props) {
  const { camera, size, gl } = useThree();
  const { setHoverSeam, editGrid } = useUI();

  /* rebuild edge list whenever dims or editGrid change ------------ */
  useEffect(() => {
    if (!editGrid) {
      setHoverSeam(null);
      return;
    }

    type Edge = { kind: "v" | "h"; idx: number; p1: THREE.Vector3; p2: THREE.Vector3 };
    const edges: Edge[] = [];

    const cols = Math.floor(wallW / CELL_IN);
    const rows = Math.floor(wallH / CELL_IN);
    const vJ = (wallW - cols * CELL_IN) / (cols + 1);
    const originX = -wallW / 2 + vJ;
    const originY = wallH / 2 - H_JOINT_IN;

    /* vertical seams */
    for (let c = 0; c <= cols; c++) {
      const x = originX + c * (CELL_IN + vJ);
      edges.push({
        kind: "v",
        idx: c,
        p1: new THREE.Vector3(x,  wallH / 2, 0),
        p2: new THREE.Vector3(x, -wallH / 2, 0),
      });
    }

    /* horizontal seams */
    for (let r = 0; r <= rows; r++) {
      const y = originY - r * (CELL_IN + H_JOINT_IN);
      edges.push({
        kind: "h",
        idx: r,
        p1: new THREE.Vector3(-wallW / 2, y, 0),
        p2: new THREE.Vector3( wallW / 2, y, 0),
      });
    }

    const handleMove = (e: PointerEvent) => {
      let best: Edge | undefined;
      let bestDist = PICK_RADIUS_PX + 1;

      edges.forEach(edge => {
        const s1 = worldToScreen(edge.p1, camera, size);
        const s2 = worldToScreen(edge.p2, camera, size);
        const d  = distPointSegment(
          e.clientX, e.clientY,
          s1.x, s1.y,
          s2.x, s2.y
        );
        if (d < bestDist) { best = edge; bestDist = d; }
      });

      setHoverSeam(
        best && bestDist <= PICK_RADIUS_PX
          ? { kind: best.kind, idx: best.idx }
          : null
      );
    };

    gl.domElement.addEventListener("pointermove", handleMove);
    return () => gl.domElement.removeEventListener("pointermove", handleMove);
  }, [editGrid, wallW, wallH, camera, size, gl, setHoverSeam]);

  return null;
}

/* Euclidean distance P–(AB) in screen-space ----------------------- */
function distPointSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
) {
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - ax, py - ay);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - bx, py - by);
  const b = c1 / c2;
  const pbx = ax + b * vx, pby = ay + b * vy;
  return Math.hypot(px - pbx, py - pby);
}
