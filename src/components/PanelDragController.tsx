// src/components/PanelDragController.tsx
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import type { RefObject } from "react";
import type { Group } from "three";

import useUI from "../store/useUI";
import { CELL_IN, H_JOINT_IN } from "../constants/layout";

interface Props {
  wallRef: RefObject<Group | null>;
  wallW: number;
  wallH: number;
}

export default function PanelDragController({ wallRef, wallW, wallH }: Props) {
  const { camera, gl } = useThree();
  const dragging = useUI((state) => state.dragging);

  useEffect(() => {
    if (!dragging) return;

    console.debug("[PDC] 🎉 drag started", dragging);
    const span = dragging.span;
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane();

    // set up the drag plane to match the wall
    if (wallRef.current) {
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(
        wallRef.current.quaternion
      );
      const point = wallRef.current.getWorldPosition(new THREE.Vector3());
      plane.setFromNormalAndCoplanarPoint(normal, point);
    } else {
      plane.set(new THREE.Vector3(0, 0, 1), 0);
    }

    // pointer move → world hit → local cell
    const onMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);

      const hit = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, hit);
      if (!wallRef.current) return;

      const local = wallRef.current.worldToLocal(hit);
      const col = Math.floor((local.x + wallW / 2) / CELL_IN);
      const row = Math.floor(
        (wallH / 2 - local.y) / (CELL_IN + H_JOINT_IN)
      );
      const maxCols = Math.floor(wallW / CELL_IN);
      const maxRows = Math.floor(wallH / CELL_IN);
      const fits =
        col >= 0 && col < maxCols && row >= 0 && row + span.h <= maxRows;

      useUI.getState().updateDragCell(fits ? { col, row } : null);
      console.debug("[PDC] cell now ▶", useUI.getState().dragging?.cell);
    };

    const onUp = () => {
      console.debug("[PDC] onUp ▶ commitDrag");
      useUI.getState().commitDrag();
      removeListeners();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        console.debug("[PDC] onKey ▶ cancelDrag");
        useUI.getState().cancelDrag();
        removeListeners();
      }
    };

    const removeListeners = () => {
      console.debug("[PDC] cleanup ▶ removing listeners");
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("keydown", onKey);
    };

    console.debug("[PDC] adding window listeners");
    window.addEventListener("pointermove", onMove, { capture: true });
    window.addEventListener("pointerup", onUp, { capture: true, once: true });
    window.addEventListener("keydown", onKey);

    return removeListeners;
  }, [dragging, camera, gl, wallRef, wallW, wallH]);

  return null;
}
