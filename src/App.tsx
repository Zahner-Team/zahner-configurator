// src/App.tsx
import { Suspense, useEffect } from "react";
import SceneSettings from "./components/SceneSettings";
import {
  Environment,
  OrbitControls,
  StatsGl,
  Bounds,
  useBounds,
} from "@react-three/drei";

import useUI from "./store/useUI";
import Wall from "./components/Wall";
import HUD from "./components/HUD";
import PanelPalette from "./components/PanelPalette";
import CombineToolbar from "./components/CombineToolbar";

export default function App() {
  const ui = useUI();
  const {
    wall,
    showEnvironment,
    backgroundColor,
    showGround,
    zoomAll,
    setZoomAll,
  } = ui;

  /* ---------------- derived dims & positions ---------------- */
  const sideMargin = 12;
  const topMargin = 12;
  const bottomMargin = 4;
  const backZ = -6; // 6″ behind the panel face

  const backingWidth = wall.width + sideMargin * 2;
  const backingHeight = wall.height + topMargin + bottomMargin;
  const backingY = (topMargin - bottomMargin) / 2;

  const bgColor = backgroundColor === "dark" ? "#333333" : "#cccccc";

  return (
    <>
      {/* ONE Canvas root comes from SceneSettings */}
      <SceneSettings background="#8d8d8d">
        {/* ------ lights -------- */}
        <ambientLight intensity={0.4} />
        <directionalLight
          color="#fff9cc"
          position={[50, 100, -50]}
          intensity={1}
          castShadow
          shadow-mapSize-width={4096}
          shadow-mapSize-height={4096}
        />

        <Suspense fallback={null}>
          {/* HDRI only for reflections, not as backdrop */}
          {showEnvironment && (
            <Environment preset="warehouse" resolution={512} background={false} />
          )}

          <Bounds clip margin={1}>
            <ZoomController zoomAll={zoomAll} setZoomAll={setZoomAll} />

            {/* backing plane */}
            <mesh position={[0, backingY, backZ]} receiveShadow>
              <planeGeometry args={[backingWidth, backingHeight]} />
              <meshStandardMaterial
                color={bgColor}
                roughness={0.8}
                metalness={0.2}
              />
            </mesh>

            {/* perforated wall */}
            <Wall />
          </Bounds>

          {/* flat ground grid */}
          {showGround && (
            <gridHelper
              args={[
                backingWidth,
                Math.ceil(backingWidth / 18),
                "#444444",
                "#888888",
              ]}
              rotation-y={-Math.PI / 2}
              position={[
                0,
                (-wall.height / 2 + wall.seamOffsetY - 0.01) - bottomMargin,
                backZ + 0.01,
              ]}
            />
          )}
        </Suspense>

        {/* unrestricted orbiting (look under, look up) */}
        <OrbitControls
          makeDefault
          enableDamping
          minPolarAngle={0}
          maxPolarAngle={Math.PI - 0.1}
        />
        <StatsGl />
      </SceneSettings>

      {/* overlays */}
      <PanelPalette />
      <CombineToolbar />
      <div className="hud-bar">
        <HUD />
      </div>
    </>
  );
}

/* ---------------- helper: zoom-to-fit ---------------- */
function ZoomController({
  zoomAll,
  setZoomAll,
}: {
  zoomAll: boolean;
  setZoomAll: (v: boolean) => void;
}) {
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
