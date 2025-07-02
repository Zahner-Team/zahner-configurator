// src/components/Panel.tsx
import React, { useMemo } from "react";
import {
  PlaneGeometry,
  MeshStandardMaterial,
  RepeatWrapping,
  Texture,
} from "three";
import { useTexture } from "@react-three/drei";
import type { PanelSize } from "../store/useUI";
import useUI from "../store/useUI";
import generatePerforation from "../utils/generatePerforation";

interface PanelProps {
  faceSize: PanelSize;      // visible face dims (e.g. {w:17.75,h:35.75})
  geoSize: [number, number]; // face + 2×returnLeg
  wallSize: [number, number];
  position: [number, number, number];
  returnLeg: number;        // flange depth
}

export default function Panel({
  faceSize: { w: faceW, h: faceH },
  geoSize: [geoW, geoH],
  wallSize: [wallW, wallH],
  position,
  returnLeg,
}: PanelProps): React.JSX.Element {
  const { materialVariant } = useUI();

  // 1) PBR textures
  const base = `/textures/${materialVariant}/`;
  const isCu = materialVariant === "copper";
  const urls = [
    `${base}${isCu ? "Copper_PBR_BaseColor.jpg" : "Steel_Weathering_BaseColor.png"}`,
    `${base}${isCu ? "Copper_PBR_Normal.jpg"    : "Steel_Weathering_Normal.jpg"}`,
    `${base}${isCu ? "Copper_PBR_Roughness.jpg" : "Steel_Weathering_Roughness.jpg"}`,
    `${base}${isCu ? "Copper_PBR_Metalness.jpg" : "Steel_Weathering_Metalness.jpg"}`,
  ];
  const aoUrl = `${base}${isCu ? "Copper_PBR_AO.jpg" : "Steel_Weathering_AO.jpg"}`;
  const [map, normalMap, roughnessMap, metalnessMap, maybeAO] =
    useTexture([...urls, aoUrl]);

  // 2) Perforation maps: one tight‐grid for face, one coarser for flange
  const faceAlpha = useMemo(
    () =>
      generatePerforation(
        { w: faceW, h: faceH },
        123,
        faceW * 4,
        faceW * 4,
        1,
        32
      ),
    [faceW, faceH]
  );
  const flangeAlpha = useMemo(
    () =>
      generatePerforation(
        { w: geoW, h: geoH },
        456,
        returnLeg * 4,
        returnLeg * 4,
        1,
        32
      ),
    [geoW, geoH, returnLeg]
  );

  // 3) UV tile & offset (so each panel picks its correct slice
  const uRepeat = faceW / wallW;
  const vRepeat = faceH / wallH;
  const offsetX = (position[0] + wallW / 2 - returnLeg) / wallW - uRepeat / 2;
  const offsetY = (position[1] + wallH / 2 - returnLeg) / wallH - vRepeat / 2;

  // 4) Geometries
  const faceGeo   = useMemo(() => new PlaneGeometry(faceW,       faceH),       [faceW, faceH]);
  const topGeo    = useMemo(() => new PlaneGeometry(faceW,       returnLeg),  [faceW, returnLeg]);
  const sideGeo   = useMemo(() => new PlaneGeometry(returnLeg,   faceH),       [returnLeg, faceH]);

  // 5) Material factory
  function makeMat(amap: Texture) {
    amap.wrapS = amap.wrapT = RepeatWrapping;
    amap.repeat.set(uRepeat, vRepeat);
    amap.offset.set(offsetX, offsetY);

    const m = new MeshStandardMaterial({
      map,
      normalMap,
      roughnessMap,
      metalnessMap,
      alphaMap: amap,
      transparent: false,
      alphaTest: 0.5,
    });
    if (maybeAO && maybeAO.image.naturalWidth > 0) {
      m.aoMap = maybeAO;
      m.aoMapIntensity = 1;
    }
    return m;
  }
  const faceMat   = useMemo(() => makeMat(faceAlpha),   [faceAlpha,   uRepeat, vRepeat, offsetX, offsetY]);
  const flangeMat = useMemo(() => makeMat(flangeAlpha), [flangeAlpha, uRepeat, vRepeat, offsetX, offsetY]);

  // 6) Assemble face + four flanges
  return (
    <group position={position}>
      {/* Front face */}
      <mesh geometry={faceGeo} material={faceMat} />

      {/* Top flange */}
      <mesh
        geometry={topGeo}
        material={flangeMat}
        position={[0, faceH/2 + returnLeg/2, 0]}
        rotation={[Math.PI/2, 0, 0]}
      />

      {/* Bottom flange */}
      <mesh
        geometry={topGeo}
        material={flangeMat}
        position={[0, -faceH/2 - returnLeg/2, 0]}
        rotation={[-Math.PI/2, 0, 0]}
      />

      {/* Left flange */}
      <mesh
        geometry={sideGeo}
        material={flangeMat}
        position={[-faceW/2 - returnLeg/2, 0, 0]}
        rotation={[0, Math.PI/2, 0]}
      />

      {/* Right flange */}
      <mesh
        geometry={sideGeo}
        material={flangeMat}
        position={[faceW/2 + returnLeg/2, 0, 0]}
        rotation={[0, -Math.PI/2, 0]}
      />
    </group>
  );
}
