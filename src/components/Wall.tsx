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
  const { perfoDiameterMin, perfoDiameterMax, patternUrl, blur, invertPattern,
          layoutOrientation, returnLeg, jointMin, jointMax, perforate } = useUI();
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
// horizontal seam (between rows) is fixed 0.25"
  const seamY = 0.25;  

  // vertical seam (between columns) may grow 0.25" → 3"
  const minGapX = jointMin;
  const maxGapX = jointMax;

  // visible face dims
  const panelW = cell * wCells - minGapX;   // subtract *vertical* min gap
  const panelH = cell * hCells - seamY;     // subtract fixed horizontal gap

  // start with max panels that fit at minGap
  let cols = Math.floor((wall.width + minGapX) / (panelW + minGapX)) || 1;
  let gapX = (wall.width - cols * panelW) / (cols + 1);
  while (gapX > maxGapX) {
    cols += 1;
    gapX = (wall.width - cols * panelW) / (cols + 1);
  }
  gapX = Math.max(minGapX, gapX);

  // same for rows (you can clamp differently if you like)
  const rows = Math.floor((wall.height + seamY) / (panelH + seamY)) || 1;
  const gapY = seamY;                        // always constant

  // bottom-left start (half-face + one gap)
  const startX = -wall.width / 2 + gapX + panelW / 2 + wall.seamOffsetX;
  const startY = -wall.height / 2 + gapY + panelH / 2 + wall.seamOffsetY;

//   const geoW = panelW + returnLeg * 2;
// const geoH = panelH + returnLeg * 2;

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
            // geoSize={[geoW, geoH]}  
            wallSize={[wall.width, wall.height]}
            position={[x, y, 0]}
            returnLeg={returnLeg}
            perforate={perforate}     // ← now reactive
            alphaMap={alphaMap}
        />
        );
    }
  }

  return (
    <Bounds clip margin={1}>
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
