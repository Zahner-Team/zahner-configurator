// src/App.tsx
import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  StatsGl,
  Sky,
  Bounds,
  useBounds,
} from "@react-three/drei";
import useUI from "./store/useUI";
import Wall from "./components/Wall";
import HUD from "./components/HUD";
import PanelPalette from "./components/PanelPalette";

export default function App() {
  const ui = useUI();                       // NEW  ← keep the whole store
  const {
    wall,
    showEnvironment,
    backgroundColor,
    showGround,
    zoomAll,
    setZoomAll,
  } = ui;  

  // margins in inches
  const sideMargin   = 12;
  const topMargin    = 12;
  const bottomMargin = 4;
  const backZ        = -6;       // 6″ back
  const backingWidth  = wall.width + sideMargin * 2;
  const backingHeight = wall.height + topMargin + bottomMargin;
  // Y center offset = (top–bottom)/2
  const backingY     = (topMargin - bottomMargin) / 2;

  // ground‐grid size & divisions for 1″ spacing

  // backing‐wall color (modeled grey)
  const bgColor = backgroundColor === "dark" ? "#333333" : "#cccccc";

  return (
    <>
      <Canvas
        gl={{ antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
        shadows
        className="three-canvas"
        camera={{ position: [0, 4, 12], fov: 40 }}
      >
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
          <Sky sunPosition={[50, 100, -50]} turbidity={2} rayleigh={1} />
          {showEnvironment && <Environment preset="warehouse" resolution={512} />}

          <Bounds clip margin={1}>
            {/* Zoom controller inside Bounds */}
            <ZoomController zoomAll={zoomAll} setZoomAll={setZoomAll} />

            {/* Backing wall, vertical plane */}
            <mesh position={[0, backingY, backZ]} receiveShadow>
              <planeGeometry args={[backingWidth, backingHeight]} />
              <meshStandardMaterial
                color={bgColor}
                roughness={0.8}
                metalness={0.2}
              />
            </mesh>

            {/* Perforated panel wall */}
            <Wall wall={wall} />
          </Bounds>

          {/* single copy of the grid editor – world-space so it tracks the wall exactly */}
   

          {/* replace plain ground with a 1″ grid */}
          {showGround && (
      <gridHelper
        // total size same as backing width, divisions = size / 18"
        args={[backingWidth, Math.ceil(backingWidth / 18), "#444444", "#888888"]}
        // lie flat under the wall base
        rotation-y={-Math.PI / 2}
        // y = bottom of wall
        position={[
          0,
          (-wall.height / 2 + wall.seamOffsetY - 0.01)-bottomMargin,
          backZ + 0.01,    // sit just in front of the backing wall
        ]}
      />
    )}
        </Suspense>

        <OrbitControls makeDefault />
        <StatsGl />
      </Canvas>

      <PanelPalette /> {/* NEW  ← panel palette for drag-and-drop */}

      <div className="hud-bar">
        <HUD />
      </div>
    </>
  );
}

// ZoomController must live inside <Bounds> so useBounds() isn't null
function ZoomController({
  zoomAll,
  setZoomAll,
}: {
  zoomAll: boolean;
  setZoomAll: (b: boolean) => void;
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
