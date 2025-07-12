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
  const dragging = useUI((s) => s.dragging);

  useEffect(() => {
    if (!dragging) return;

    const { span } = dragging;
    const isSingle = span.w === 1 && span.h === 1;

    const pitchY = CELL_IN + H_JOINT_IN;
    const { xStops } = useUI.getState();           // live cumulative X stops
    const maxCols = xStops.length - 1;
    const maxRows = Math.floor(wallH / pitchY);

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();
    const plane = new THREE.Plane();

    if (wallRef.current) {
      const n = new THREE.Vector3(0, 0, 1).applyQuaternion(wallRef.current.quaternion);
      const p = wallRef.current.getWorldPosition(new THREE.Vector3());
      plane.setFromNormalAndCoplanarPoint(n, p);
    } else {
      plane.set(new THREE.Vector3(0, 0, 1), 0);
    }

    const pointerToCell = (e: PointerEvent) => {
      const { left, top, width, height } = gl.domElement.getBoundingClientRect();
      ndc.set(
        ((e.clientX - left) / width) * 2 - 1,
        -((e.clientY - top) / height) * 2 + 1
      );
      ray.setFromCamera(ndc, camera);

      if (!ray.ray.intersectPlane(plane, hit) || !wallRef.current) return null;
      const local = wallRef.current.worldToLocal(hit);

      /* —— column from cumulative xStops —— */
      const localX = local.x + wallW / 2;
      let col = -1;
      for (let i = 0; i < xStops.length - 1; i++) {
        if (localX >= xStops[i] && localX < xStops[i + 1]) {
          col = i;
          break;
        }
      }

      const row = Math.floor((wallH / 2 - local.y) / pitchY);

      const fits =
        !isSingle &&
        col >= 0 &&
        row >= 0 &&
        col + span.w <= maxCols &&
        row + span.h <= maxRows;

      return fits ? { col, row } : null;
    };

    const onMove = (e: PointerEvent) => {
      useUI.getState().updateDragCell(pointerToCell(e));
    };
    const onUp = () => {
      if (isSingle) useUI.getState().cancelDrag();
      else useUI.getState().commitDrag();
      detach();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useUI.getState().cancelDrag();
        detach();
      }
    };
    const detach = () => {
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("keydown", onKey);
    };

    window.addEventListener("pointermove", onMove, { capture: true });
    window.addEventListener("pointerup", onUp, { capture: true, once: true });
    window.addEventListener("keydown", onKey);

    return detach;
  }, [dragging, camera, gl, wallRef, wallW, wallH]);

  return null;
}
