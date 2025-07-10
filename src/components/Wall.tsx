// ────────────────────────────────────────────────────────────────
// src/components/Wall.tsx
// ────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import { useThree, useLoader } from "@react-three/fiber";
import { Bounds, useBounds } from "@react-three/drei";
import { TextureLoader, CanvasTexture, Texture, Group  } from "three";

import Panel from "./Panel";
import SeamPicker from "./SeamPicker";
import SeamOverlay from "./SeamOverlay";
import generatePerforation from "../utils/generatePerforation";
import useUI from "../store/useUI";
import type { WallState } from "../store/useUI";

import { CELL_IN as CELL, H_JOINT_IN as H_JOINT } from "../constants/layout";




/* 1×1 px transparent PNG – avoids loader errors when no pattern URL is set */
const BLANK =
  "data:image/png;base64," +
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAABlBMVEUAAAD///+" +
  "l2Z/dAAAACklEQVR4nGNgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==";

/* —————————————————— component ——————————————————— */
export default function Wall({ wall }: { wall: WallState }) {
  const ui = useUI();
  const wallGroupRef = useRef<Group>(null);

  /* pattern → α-map ------------------------------------------------ */
  const tex = useLoader(
    TextureLoader,
    ui.patternUrl?.trim() || BLANK,
    (l) => (l.crossOrigin = "anonymous")
  ) as Texture;

  const patternImg =
    ui.patternUrl?.trim() ? (tex.image as HTMLImageElement) : undefined;

  const [alphaMap, setAlphaMap] = useState<CanvasTexture>(() =>
    generatePerforation(
      { w: wall.width, h: wall.height },
      wall.patternSeed,
      ui.perfoDiameterMin * 32,
      ui.perfoDiameterMax * 32,
      1,
      32,
      patternImg,
      ui.blur,
      ui.invertPattern
    )
  );

  /* regenerate when knobs change ---------------------------------- */
  useEffect(() => {
    setAlphaMap(
      generatePerforation(
        { w: wall.width, h: wall.height },
        wall.patternSeed,
        ui.perfoDiameterMin * 32,
        ui.perfoDiameterMax * 32,
        1,
        32,
        patternImg,
        ui.blur,
        ui.invertPattern
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    wall.width,
    wall.height,
    wall.patternSeed,
    ui.perfoDiameterMin,
    ui.perfoDiameterMax,
    ui.blur,
    ui.invertPattern,
    ui.patternUrl,
  ]);

  /* layout helpers ------------------------------------------------ */
  const cols = Math.floor(wall.width / CELL);
  const vJoint = (wall.width - cols * CELL) / (cols + 1);
  const face = (span: number, joint: number) =>
    span * CELL - (span - 1) * joint;

  /* ——————————— render ——————————— */
  return (
    <Bounds clip margin={1}>
      <ZoomController />

      {ui.editGrid && (
        <>
          <SeamPicker wallW={wall.width} wallH={wall.height} />
          <SeamOverlay
          wallWorldMatrix={wallGroupRef.current?.matrixWorld ?? null}
          wallW={wall.width}
          wallH={wall.height}
          />
        </>
      )}

      <group ref={wallGroupRef}>
        {ui.layoutBlocks.map((b) => {
          const wFace = face(b.span.w, vJoint);
          const hFace = face(b.span.h, H_JOINT);

          return (
            <Panel
              key={b.id}
              faceSize={{ w: wFace, h: hFace }}
              wallSize={[wall.width, wall.height]}
              position={[
                -wall.width / 2 +
                  vJoint +
                  b.origin.col * (CELL + vJoint) +
                  wFace / 2,
                wall.height / 2 -
                  H_JOINT -
                  b.origin.row * (CELL + H_JOINT) -
                  hFace / 2,
                0,
              ]}
              returnLeg={ui.returnLeg}
              perforate={ui.perforate}
              alphaMap={alphaMap}
            />
          );
        })}
      </group>
    </Bounds>
  );
}

/* helper – keeps the “Zoom All” button working ------------------- */
function ZoomController() {
  const { zoomAll, setZoomAll } = useUI();
  const api = useBounds();

  /* fit on mount */
  useEffect(() => {
    api.refresh();
    api.fit();
  }, [api]);

  /* subsequent user-requested fits */
  useEffect(() => {
    if (zoomAll) {
      api.refresh();
      api.fit();
      setZoomAll(false);
    }
  }, [zoomAll, api, setZoomAll]);

  return null;
}
