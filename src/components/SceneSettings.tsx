import { Canvas } from "@react-three/fiber";
import { Suspense  } from "react";
import type {PropsWithChildren} from "react";
import { Sky } from "@react-three/drei";
import * as THREE from "three";

type Props = PropsWithChildren<{ background?: string }>;

export default function SceneSettings({
  children,
  background = "#8d8d8d",            // architectural grey
}: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      /* renderer + scene tweaks once ready */
      onCreated={({ gl, scene }) => {
        // gl.useLegacyLights = false;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;

        scene.background = new THREE.Color(background); // ← hides HDRI “orb”
      }}
      camera={{ position: [0, 4, 12], fov: 40 }}
    >
      {/* soft sun + sky fill (no HDRI as backdrop) */}
      <Suspense fallback={null}>
        <Sky sunPosition={[50, 100, -50]} turbidity={2} rayleigh={1} />
      </Suspense>

      {children}
    </Canvas>
  );
}
