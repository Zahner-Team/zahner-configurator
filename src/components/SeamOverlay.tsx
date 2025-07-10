import React, { useMemo, useEffect } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import useUI, { sameSeam } from "../store/useUI";            // ✨ sameSeam
import { CELL_IN as CELL, H_JOINT_IN } from "../constants/layout";
import { worldToScreen } from "../utils/projection";

const THICK = 3;                                             // px

interface Props {
  /** `wallRef.current?.matrixWorld` (or `null` for identity) */
  wallWorldMatrix: THREE.Matrix4 | null;
  wallW: number;                                             // inches
  wallH: number;                                             // inches
}

export default function SeamOverlay({
  wallWorldMatrix,
  wallW,
  wallH,
}: Props) {
  const { camera, size } = useThree();

  /* store -------------------------------------------------------- */
  const {
    layoutBlocks,
    hoverSeam,
    selectedSeam,          // ✨ new
    editGrid,
  } = useUI();

  /* mount trace – handy when experimenting ----------------------- */
  useEffect(() => {
    console.log("[SeamOverlay] mounted");
    return () => console.log("[SeamOverlay] un-mounted");
  }, []);

  /* don’t render when grid editor is off ------------------------ */
  if (!editGrid) return null;

  /* ─── grid metrics ──────────────────────────────────────────── */
  const cols = Math.max(1, Math.floor(wallW / CELL));
  let vJ = (wallW - cols * CELL) / (cols + 1);
  if (!Number.isFinite(vJ) || vJ <= 0) vJ = 0.5;

  const originX = -wallW / 2 + vJ;
  const originY =  wallH / 2 - H_JOINT_IN;

  const vLeft = (i: number) => originX + i * (CELL + vJ);
  const hTop  = (j: number) => originY - j * (CELL + H_JOINT_IN);

  /* local → world helper (identity if no matrix passed) ---------- */
  const toWorld = (v: THREE.Vector3) =>
    wallWorldMatrix ? v.clone().applyMatrix4(wallWorldMatrix) : v;

  const ends = (kind: "v" | "h", idx: number): [THREE.Vector3, THREE.Vector3] =>
    kind === "v"
      ? [
          toWorld(new THREE.Vector3(vLeft(idx),  wallH / 2, 0)),
          toWorld(new THREE.Vector3(vLeft(idx), -wallH / 2, 0)),
        ]
      : [
          toWorld(new THREE.Vector3(-wallW / 2, hTop(idx), 0)),
          toWorld(new THREE.Vector3( wallW / 2, hTop(idx), 0)),
        ];

  /* ─── build screen-space bars ───────────────────────────────── */
  const bars = useMemo(() => {
    const out: React.ReactElement[] = [];
    const seen = new Set<string>();

    const push = (
      key   : string,
      kind  : "v" | "h",
      idx   : number,
      hover = false,
      selected = false,                                // ✨
    ) => {
      if (seen.has(key)) return;
      seen.add(key);

      const [p1, p2] = ends(kind, idx);
      const s1 = worldToScreen(p1, camera, size);
      const s2 = worldToScreen(p2, camera, size);

      const dx = s2.x - s1.x;
      const dy = s2.y - s1.y;

      /* colour priority: hover > selected > normal --------------- */
      const bg =
        hover
          ? "rgba(0,255,180,0.45)"                      // mint
          : selected
              ? "rgba(255,200,0,0.65)"                 // amber
              : "rgba(0,200,120,0.55)";                // default

      out.push(
        <div
          key={key}
          style={{
            position: "absolute",
            left:   s1.x,
            top:    s1.y,
            width:  Math.hypot(dx, dy),
            height: THICK,
            background: bg,
            transform: `rotate(${Math.atan2(dy, dx)}rad)`,
            transformOrigin: "0 0",
            pointerEvents: "none",
          }}
        />,
      );
    };

    /* locked seams ---------------------------------------------- */
    const lockV = new Set<number>();
    const lockH = new Set<number>();
    layoutBlocks.forEach(b => {
      b.lockedJoints.v.forEach(lockV.add, lockV);
      b.lockedJoints.h.forEach(lockH.add, lockH);
    });

    lockV.forEach(i =>
      push(
        `lv-${i}`,
        "v",
        i,
        false,
        sameSeam(selectedSeam, { kind: "v", idx: i }),
      ),
    );
    lockH.forEach(j =>
      push(
        `lh-${j}`,
        "h",
        j,
        false,
        sameSeam(selectedSeam, { kind: "h", idx: j }),
      ),
    );

    /* hover seam (only when not locked) -------------------------- */
    if (hoverSeam && Number.isFinite(hoverSeam.idx)) {
      const { kind, idx } = hoverSeam;
      if (!(kind === "v" ? lockV : lockH).has(idx)) {
        push(
          "hover",
          kind,
          idx,
          true,
          sameSeam(selectedSeam, hoverSeam),
        );
      }
    }

    console.log(`[SeamOverlay] built ${out.length} bar(s)`);
    return out;
    // deps:
  }, [layoutBlocks, hoverSeam, selectedSeam, camera, size]);       // ✨

  /* ─── render ────────────────────────────────────────────────── */
  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "relative",
          width:  "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {bars}
      </div>
    </Html>
  );
}
