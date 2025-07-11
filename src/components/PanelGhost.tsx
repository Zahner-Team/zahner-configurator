// src/components/PanelGhost.tsx
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, Vector3 } from "three";
import useUI from "../store/useUI";
import { CELL_IN, H_JOINT_IN } from "../constants/layout";

interface Props {
  /** top-left corner of the wall, in world coords */
  wallOrigin: Vector3;
  /** overall wall width  */
  wallW: number;
  /** overall wall height */
  wallH: number;
}

export default function PanelGhost({ wallOrigin, wallW, wallH }: Props) {
  // 1) always call your hooks, un-conditionally:
  const dragging = useUI((s) => s.dragging);
  const ref = useRef<Mesh>(null!);

  // subtle float animation to make it pop
  useFrame(() => {
    if (ref.current) {
      ref.current.position.z = 0.05 + Math.sin(Date.now() / 200) * 0.002;
    }
  });

  // 2) only now can we early-return if there's nothing to ghost:
  if (!dragging || !dragging.cell) {
    return null;
  }

  // 3) compute exactly the same face-sizing + positioning logic you use for real panels:
  const { span, cell } = dragging;
  const { w: spanW, h: spanH } = span;
  const { col, row } = cell;

  const cols = Math.floor(wallW / CELL_IN);
  const vJoint = (wallW - cols * CELL_IN) / (cols + 1);

  const faceW = spanW * CELL_IN - (spanW - 1) * vJoint;
  const faceH = spanH * CELL_IN - (spanH - 1) * H_JOINT_IN;

  const x =
    wallOrigin.x +
    vJoint +
    col * (CELL_IN + vJoint) +
    faceW / 2;
  const y =
    wallOrigin.y -
    H_JOINT_IN -
    row * (CELL_IN + H_JOINT_IN) -
    faceH / 2;

  // 4) render a translucent green plane in world-space:
  return (
    <mesh ref={ref} position={[x, y, 0.05]}>
      <planeGeometry args={[faceW, faceH]} />
      <meshBasicMaterial
        color="#10b981"
        transparent
        opacity={0.25}
        depthWrite={false}
      />
    </mesh>
  );
}
