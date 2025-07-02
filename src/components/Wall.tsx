// src/components/Wall.tsx
import { useState, useRef, useEffect } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import {
  TextureLoader,
  CanvasTexture,
  Vector3,
  MathUtils,
  Texture,
} from "three";
import { Bounds, useBounds } from "@react-three/drei";
import generatePerforation from "../utils/generatePerforation";
import Panel from "./Panel";
import useUI from "../store/useUI";
import type { WallState } from "../store/useUI";

// tiny white PNG fallback
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAA" +
  "Al21bKAAAABlBMVEUAAAD///+l2Z/dAAAACklEQVR4nGNgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==";

export default function Wall({ wall }: { wall: WallState }) {
  const {
    perfoDiameterMin,
    perfoDiameterMax,
    patternUrl,
    blur,
    invertPattern,
    layoutOrientation,
    returnLeg,
    jointMin,
    jointMax,
  } = useUI();
  const { camera } = useThree();

  // 1) Load pattern image (or blank)
  const patternTexture = useLoader(
    TextureLoader,
    patternUrl?.trim() || BLANK_PNG,
    (loader) => { loader.crossOrigin = "anonymous"; }
  ) as Texture;
  const patternImage = patternUrl?.trim()
    ? (patternTexture.image as HTMLImageElement)
    : undefined;

  // 2) One big α-map
  const [alphaMap, setAlphaMap] = useState<CanvasTexture>(() =>
    generatePerforation(
      { w: wall.width, h: wall.height },
      wall.patternSeed,
      perfoDiameterMin * 32,
      perfoDiameterMax * 32,
      1,
      32,
      patternImage,
      blur,
      invertPattern
    )
  );
  const lastStep = useRef(1);

  // 3) Re-generate on param changes
  useEffect(() => {
    alphaMap.dispose();
    const dpi = 32 * lastStep.current;
    setAlphaMap(
      generatePerforation(
        { w: wall.width, h: wall.height },
        wall.patternSeed,
        perfoDiameterMin * dpi,
        perfoDiameterMax * dpi,
        1,
        dpi,
        patternImage,
        blur,
        invertPattern
      )
    );
  }, [
    patternImage,
    blur,
    invertPattern,
    perfoDiameterMin,
    perfoDiameterMax,
    wall.patternSeed,
    wall.width,
    wall.height,
  ]);

  // 4) LOD-based regeneration
  useFrame(() => {
    const raw = MathUtils.clamp(
      10 / camera.position.distanceTo(new Vector3(0, 0, 0)),
      0.5,
      4
    );
    const step = Math.round(raw * 10) / 10;
    if (step !== lastStep.current) {
      lastStep.current = step;
      alphaMap.dispose();
      const dpi = 32 * step;
      setAlphaMap(
        generatePerforation(
          { w: wall.width, h: wall.height },
          wall.patternSeed,
          perfoDiameterMin * dpi,
          perfoDiameterMax * dpi,
          1,
          dpi,
          patternImage,
          blur,
          invertPattern
        )
      );
    }
  });

  // —————————————————————————————————————————————
  // 5) Panel grid: 18″ cells, face = cell–¼″, auto-stretch gaps until ≤ jointMax
  const cell   = 18;
  const wCells = layoutOrientation === "portrait" ? 1 : 2;
  const hCells = layoutOrientation === "portrait" ? 2 : 1;
  const minGap = jointMin;  // e.g. 0.25"
  const maxGap = jointMax;  // e.g. 3"

  // visible face dims
  const panelW = cell * wCells - minGap;
  const panelH = cell * hCells - minGap;

  // start with max panels that fit at minGap
  let cols = Math.floor((wall.width + minGap) / (panelW + minGap)) || 1;
  let gapX = (wall.width - cols * panelW) / (cols + 1);

  // if gapX > maxGap, add a column and recompute
  while (gapX > maxGap) {
    cols += 1;
    gapX = (wall.width - cols * panelW) / (cols + 1);
  }
  gapX = Math.max(minGap, gapX);

  // same for rows (you can clamp differently if you like)
  let rows = Math.floor((wall.height + minGap) / (panelH + minGap)) || 1;
  let gapY = (wall.height - rows * panelH) / (rows + 1);
  gapY = Math.max(minGap, Math.min(maxGap, gapY));

  // bottom-left start (half-face + one gap)
  const startX = -wall.width / 2 + gapX + panelW / 2 + wall.seamOffsetX;
  const startY = -wall.height / 2 + gapY + panelH / 2 + wall.seamOffsetY;

  const geoW = panelW + returnLeg * 2;
const geoH = panelH + returnLeg * 2;

  // 6) Build panels
  const panels = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = startX + i * (panelW + gapX);
      const y = startY + j * (panelH + gapY);
      panels.push(
        <Panel
            key={`${i}-${j}`}
            faceSize={{ w: panelW, h: panelH }}
            geoSize={[geoW, geoH]}  
            wallSize={[wall.width, wall.height]}
            position={[x, y, 0]}
            returnLeg={returnLeg}
            alphaMap={alphaMap}
        />
        );
    }
  }

  return (
    <Bounds observe margin={1} fit clip>
      <ZoomController />
      {panels}
    </Bounds>
  );
}

// Zoom-all helper
function ZoomController() {
  const { zoomAll, setZoomAll } = useUI();
  const api = useBounds();
  useEffect(() => {
    if (zoomAll) {
      api.refresh();
      api.fit();
      setZoomAll(false);
    }
  }, [zoomAll, api, setZoomAll]);
  return null;
}
