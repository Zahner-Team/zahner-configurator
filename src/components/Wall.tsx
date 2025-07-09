import { useState, useRef, useEffect, useMemo } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import { Bounds, Html, useBounds } from "@react-three/drei";
import {
  TextureLoader, CanvasTexture, Vector3, MathUtils, Texture
} from "three";

import generatePerforation from "../utils/generatePerforation";
import Panel   from "./Panel";
import GridLayoutEditor from "./GridLayoutEditor";
import useUI   from "../store/useUI";
import type { WallState } from "../store/useUI";

/**
 * Choose an integer panel count (n) so that the resulting vertical-joint
 * width falls inside [min, max].  If there is no perfect fit, return the
 * closest one **below max** (or clamp to min).
 *
 *   joint = (wall – n·cell) / (n + 1)
 */
function bestFit(
  wall    : number,   // overall inches
  cell    : number,   // 18″ module
  jointMin: number,
  jointMax: number
) {
  let bestN      = 1;
  let bestJoint  = (wall - cell) / 2;      // n = 1
  let smallestErr = Math.abs(bestJoint - jointMax);

  // reasonable search range: 1 … wall/cell  (anything higher is negative)
  const maxN = Math.max(1, Math.floor(wall / cell));

  for (let n = 1; n <= maxN; n++) {
    const joint = (wall - n * cell) / (n + 1);

    // perfect hit – we're done
    if (joint >= jointMin && joint <= jointMax) return { n, joint };

    // otherwise remember the candidate that’s *just* under max
    if (joint < jointMax) {
      const err = jointMax - joint;        // how far under?
      if (err < smallestErr) {
        smallestErr = err;
        bestN       = n;
        bestJoint   = Math.max(joint, jointMin);  // never below min
      }
    }
  }

  return { n: bestN, joint: bestJoint };
}


/**
 * Html scales in “world-units → CSS-px”.
 * We want   1 world-inch ≈ 4 CSS-px  (tweak once – stays readable on 4-K &
 * laptop screens alike).  Feel free to change 4 if you prefer bigger/smaller.
 */
const CSS_PER_INCH = 4;

/* tiny 1×1 white – fallback for pattern */
const BLANK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAA" +
  "Al21bKAAAABlBMVEUAAAD///+l2Z/dAAAACklEQVR4nGNgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==";

export default function Wall({ wall }: { wall: WallState }) {
  const ui = useUI();
  const { camera } = useThree();

  /* ─────────────────── pattern texture / α-map ─────────────────── */
  const patternTexture = useLoader(
    TextureLoader,
    ui.patternUrl?.trim() || BLANK,
    loader => { loader.crossOrigin = "anonymous"; }
  ) as Texture;

  const patternImage = ui.patternUrl?.trim()
    ? (patternTexture.image as HTMLImageElement)
    : undefined;

  /* big alpha-map – regenerated on demand */
  const [alphaMap, setAlphaMap] = useState<CanvasTexture>(() =>
    generatePerforation(
      { w: wall.width, h: wall.height },
      wall.patternSeed,
      ui.perfoDiameterMin * 32,
      ui.perfoDiameterMax * 32,
      1, 32, patternImage, ui.blur, ui.invertPattern
    )
  );
  const lastStep = useRef(1);

  /* regen when UI changes */
  useEffect(() => {
    alphaMap.dispose();
    const dpi = 32 * lastStep.current;
    setAlphaMap(
      generatePerforation(
        { w: wall.width, h: wall.height },
        wall.patternSeed,
        ui.perfoDiameterMin * dpi,
        ui.perfoDiameterMax * dpi,
        1, dpi, patternImage, ui.blur, ui.invertPattern
      )
    );
  }, [
    patternImage, ui.blur, ui.invertPattern,
    ui.perfoDiameterMin, ui.perfoDiameterMax,
    wall.patternSeed, wall.width, wall.height
  ]);

  /* simple LOD bump */
  useFrame(() => {
     const t0 = performance.now();  
    const raw = MathUtils.clamp(
      10 / camera.position.distanceTo(new Vector3(0, 0, 0)),
      0.5, 4
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
          ui.perfoDiameterMin * dpi,
          ui.perfoDiameterMax * dpi,
          1, dpi, patternImage, ui.blur, ui.invertPattern
        )
      );
    }
  });

  /* ──────────────── dynamic joint / cell sizes ──────────────── */
    const CELL = 18;
    /* columns (X) ------------------------------------------------------ */
    const { n: cols, joint: vJoint } = bestFit(
  ui.wallWidth, 18, ui.jointMin, ui.jointMax
);

    const strideX = CELL + vJoint;           // panel + vertical reveal
    
    /* rows (Y) – same idea but joint is always 0 .25” ------------------ */
    const hJoint   = 0.25;
    const rows     = Math.floor(
      (ui.wallHeight + hJoint) / (CELL + hJoint)
    );                                       // max rows that fit
    const strideY  = CELL + hJoint;

    /* leaders only – filter duplicates */  
  const leaderCells = useMemo(() => {
    const seen = new Set<string>();
    return ui.layoutMatrix
      .flat()
      .filter(cell => {
        if (seen.has(cell.id)) return false;
        seen.add(cell.id);
        return true;
      });
  }, [ui.layoutMatrix]);

  /* ─────────────────── render ─────────────────── */
  return (
    <Bounds clip margin={1}>
      <ZoomController />

      {ui.editLayout ? (
        /* 2-D editor overlay – world-space so it lines up */
        <Html
          transform
          position={[0, 0, 0.01]}      /* hair in front of panels */
          scale={CSS_PER_INCH}         /* keep in sync with editor file */
          pointerEvents="auto"
        >
          <GridLayoutEditor wallW={ui.wallWidth} wallH={ui.wallHeight} />
        </Html>
      ) : (
        /* 3-D panel geometry */
        <group>
          {leaderCells.map(cell => (
            <Panel
              key={cell.id}
              /* face width shrinks by the joint on *each* column it occupies */
              faceSize={{
                w: cell.w * (CELL - vJoint),
                h: cell.h * (CELL - hJoint),
              }}
              wallSize={[ui.wallWidth, ui.wallHeight]}
              position={[
                -ui.wallWidth / 2 + vJoint / 2 +             /* first reveal */
                cell.x * strideX +                           /* prior cols   */
                cell.w * (CELL - vJoint) / 2,                /* mid-panel    */

                ui.wallHeight / 2 - hJoint / 2 -             /* top reveal   */
                cell.y * strideY -                           /* prior rows   */
                cell.h * (CELL - hJoint) / 2,                /* mid-panel    */
                 0,
              ]}
              returnLeg={ui.returnLeg}
              perforate={ui.perforate}
              alphaMap={alphaMap}
            />
          ))}
        </group>
      )}
    </Bounds>
  );
}

/* helper – keeps the “ZoomAll” button working */
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
