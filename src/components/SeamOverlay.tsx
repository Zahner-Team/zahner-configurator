import React, { useMemo, useEffect } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import useUI from "../store/useUI";
import { CELL_IN as CELL, H_JOINT_IN } from "../constants/layout";
import { worldToScreen } from "../utils/projection";

const THICK = 3;                         // px – seam-bar thickness

interface Props {
  wallWorldMatrix: THREE.Matrix4 | null; // pass wallRef.current?.matrixWorld
  wallW: number;                         // inches
  wallH: number;                         // inches
}

export default function SeamOverlay(props: Props) {
  const { wallWorldMatrix, wallW, wallH } = props;
  const { camera, size } = useThree();
  const { layoutBlocks, hoverSeam, editGrid } = useUI();

  /* mount / unmount trace --------------------------------------- */
  useEffect(() => {
    console.log("[SeamOverlay] mounted");
    return () => console.log("[SeamOverlay] un-mounted");
  }, []);

  /* bail out entirely when grid is off --------------------------- */
  if (!editGrid) return null;

  /* ─── grid metrics ───────────────────────────────────────────── */
  const cols = Math.max(1, Math.floor(wallW / CELL));
  let vJ = (wallW - cols * CELL) / (cols + 1);
  if (!Number.isFinite(vJ) || vJ <= 0) vJ = 0.5;

  const originX = -wallW / 2 + vJ;
  const originY = wallH / 2 - H_JOINT_IN;

  const vLeft = (i: number) => originX + i * (CELL + vJ);
  const hTop  = (j: number) => originY - j * (CELL + H_JOINT_IN);

  /* local → world helper (identity if matrixWorld === null) */
  const toWorld = (v: THREE.Vector3) =>
    wallWorldMatrix ? v.clone().applyMatrix4(wallWorldMatrix) : v;

  const ends = (
    kind: "v" | "h",
    idx: number,
  ): [THREE.Vector3, THREE.Vector3] =>
    kind === "v"
      ? [toWorld(new THREE.Vector3(vLeft(idx),  wallH / 2, 0)),
         toWorld(new THREE.Vector3(vLeft(idx), -wallH / 2, 0))]
      : [toWorld(new THREE.Vector3(-wallW / 2, hTop(idx), 0)),
         toWorld(new THREE.Vector3( wallW / 2, hTop(idx), 0))];

  /* ─── build screen-space bars ───────────────────────────────── */
  const bars = useMemo(() => {
    const out: React.ReactElement[] = [];
    const seen = new Set<string>();

    const push = (key: string, kind: "v" | "h", idx: number, hover = false) => {
      if (seen.has(key)) return;
      seen.add(key);

      const [p1, p2] = ends(kind, idx);
      const s1 = worldToScreen(p1, camera, size);
      const s2 = worldToScreen(p2, camera, size);

      const dx = s2.x - s1.x;
      const dy = s2.y - s1.y;

      out.push(
        <div
          key={key}
          style={{
            position: "absolute",
            left: s1.x,
            top : s1.y,
            width : Math.hypot(dx, dy),
            height: THICK,
            background: hover
              ? "rgba(0,255,180,0.45)"
              : "rgba(0,200,120,0.55)",
            transform: `rotate(${Math.atan2(dy, dx)}rad)`,
            transformOrigin: "0 0",
            pointerEvents: "none",
          }}
        />,
      );
    };

    /* locked seams ------------------------------------------------ */
    const lockV = new Set<number>();
    const lockH = new Set<number>();
    layoutBlocks.forEach(b => {
      b.lockedJoints.v.forEach(lockV.add, lockV);
      b.lockedJoints.h.forEach(lockH.add, lockH);
    });

    lockV.forEach(i => push(`lv-${i}`, "v", i));
    lockH.forEach(j => push(`lh-${j}`, "h", j));

    /* hover seam -------------------------------------------------- */
    if (hoverSeam && Number.isFinite(hoverSeam.idx)) {
      const { kind, idx } = hoverSeam;
      if (!(kind === "v" ? lockV : lockH).has(idx)) {
        push("hover", kind, idx, true);
      }
    }

    console.log(`[SeamOverlay] built ${out.length} bar(s)`);
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutBlocks, hoverSeam, camera, size]);

  /* ─── render ─────────────────────────────────────────────────── */
  return (
    <Html
      fullscreen
      style={{ pointerEvents: "none" }}   // **outer wrapper**
    >
      <div
        style={{
          position: "relative",
          width:  "100%",
          height: "100%",
          pointerEvents: "none",          // **inner wrapper**
        }}
      >
        {bars}
      </div>
    </Html>
  );
}
