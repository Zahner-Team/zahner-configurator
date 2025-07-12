// src/components/PanelGhost.tsx
import { useFrame } from "@react-three/fiber";
import { useRef, useEffect, useMemo } from "react";
import {
  Mesh,
  PlaneGeometry,
  BufferGeometry,
  Vector3,
} from "three";
import { Edges } from "@react-three/drei";
import useUI from "../store/useUI";
import { CELL_IN, H_JOINT_IN } from "../constants/layout";

interface Props {
  /** world-space top-left corner of the wall */
  wallOrigin: Vector3;
}

export default function PanelGhost({ wallOrigin }: Props) {
  // always same hook order
  const dragging = useUI((s) => s.dragging);
  const xStops   = useUI((s) => s.xStops);
  const vGaps    = useUI((s) => s.vGaps);

  // one reusable tiny plane
  const geom = useMemo(() => new PlaneGeometry(0.001, 0.001), []);
  useEffect(() => () => (geom as BufferGeometry).dispose(), [geom]);

  const ref = useRef<Mesh>(null!);

  // update mesh on drag or gap changes
  useEffect(() => {
    const m = ref.current;
    if (!m) return;

    if (!dragging?.cell) {
      m.visible = false;
      return;
    }

    const { span, cell } = dragging;

    // compute ghost width (X) from xStops/vGaps
    const left  = xStops[cell.col];
    const right = xStops[cell.col + span.w] - vGaps[cell.col + span.w];
    const faceW = right - left;
    const centerX = wallOrigin.x + left + faceW/2;

    // compute ghost height (Y) from fixed joints
    const faceH = span.h * CELL_IN - (span.h - 1) * H_JOINT_IN;
    const centerY =
      wallOrigin.y
      - H_JOINT_IN
      - cell.row*(CELL_IN + H_JOINT_IN)
      - faceH/2;

    // swap in new geometry
    const newG = new PlaneGeometry(faceW, faceH);
    (m.geometry as BufferGeometry).dispose();
    m.geometry = newG;

    // position & show
    m.position.set(centerX, centerY, 0.05);
    m.visible = true;
  }, [dragging, xStops, vGaps, wallOrigin]);

  // gentle hover effect
  useFrame(() => {
    if (ref.current && ref.current.visible) {
      ref.current.position.z = 0.05 + Math.sin(performance.now()/250)*0.004;
    }
  });

  // always render exactly one mesh (visibility toggled in effect)
  return (
    <mesh ref={ref} geometry={geom} visible={false}>
      <meshBasicMaterial
        color="#10b981"
        transparent
        opacity={0.25}
        depthWrite={false}
      />
      <Edges scale={1.001} color="#ff0000" />
    </mesh>
  );
}
