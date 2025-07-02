// src/components/Panel.tsx
import  { useMemo } from "react";
import {
  PlaneGeometry,
  MeshStandardMaterial,
  RepeatWrapping,
  Texture,
  SRGBColorSpace,
} from "three";
import type { MeshStandardMaterialParameters } from "three";
import { useTexture } from "@react-three/drei";
import type { PanelSize } from "../store/useUI";
import useUI from "../store/useUI";

interface PanelProps {
  faceSize : PanelSize;        // e.g. { w:17.75 , h:35.75 }
  wallSize : [number, number]; // full wall dims
  position : [number, number, number];
  returnLeg: number;           // flange depth in inches
  perforate: boolean;          // toggle perforation
  alphaMap : Texture;          // wall-wide α-map
}

export default function Panel({
  faceSize : { w: faceW, h: faceH },
  wallSize : [ wallW, wallH ],
  position,
  returnLeg,
  perforate,
  alphaMap,
}: PanelProps) {

  //---------------------------------------------------------------------------
  // 1)  Load PBR set (Base-color, Normal, Roughness, Metalness [, AO])
  //---------------------------------------------------------------------------
  const { materialVariant } = useUI();
  const base   = `/textures/${materialVariant}/`;
  const isCu   = materialVariant === "copper";

  const [
    map,
    normalMap,
    roughnessMap,
    metalnessMap,
    maybeAO,
  ] = useTexture([
    `${base}${isCu ? "Copper_PBR_BaseColor.jpg" : "Steel_Weathering_BaseColor.png"}`,
    `${base}${isCu ? "Copper_PBR_Normal.jpg"    : "Steel_Weathering_Normal.jpg"}`,
    `${base}${isCu ? "Copper_PBR_Roughness.jpg" : "Steel_Weathering_Roughness.jpg"}`,
    `${base}${isCu ? "Copper_PBR_Metalness.jpg" : "Steel_Weathering_Metalness.jpg"}`,
    `${base}${isCu ? "Copper_PBR_AO.jpg"        : "Steel_Weathering_AO.jpg"}`,
  ]);

  // correct colour-spaces (three ≥ r152)
  map.colorSpace = SRGBColorSpace;

  //---------------------------------------------------------------------------
  // 2)  Slice the global α-map so each panel shows its own region
  //---------------------------------------------------------------------------
  const faceAlpha = useMemo(() => {
    if (!perforate) return undefined;
    const tex = alphaMap.clone();
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(faceW / wallW, faceH / wallH);
    tex.offset.set(
      (position[0] + wallW/2 - returnLeg)/wallW - tex.repeat.x/2,
      (position[1] + wallH/2 - returnLeg)/wallH - tex.repeat.y/2
    );
    tex.needsUpdate = true;
    return tex;
  }, [perforate, alphaMap, faceW, faceH, wallW, wallH, position, returnLeg]);


  //---------------------------------------------------------------------------
  // 3)  Material helpers
  //---------------------------------------------------------------------------
  const faceMat = useMemo(() => {
    const params: MeshStandardMaterialParameters = {
      map, normalMap, roughnessMap, metalnessMap,
      metalness: 1, roughness: 0.5, envMapIntensity: 1,
      side: 2,
      transparent: Boolean(faceAlpha),
      ...(faceAlpha
        ? { alphaMap: faceAlpha, alphaTest: 0.4 }
        : {}),
    };
    const m = new MeshStandardMaterial(params);
    if (maybeAO?.image?.naturalWidth) {
      m.aoMap = maybeAO;
      m.aoMapIntensity = 1;
    }
    return m;
  }, [map, normalMap, roughnessMap, metalnessMap, maybeAO, faceAlpha]);

  // 3.1) Flange material (always opaque)
  const flangeMat = useMemo(() => {
    const params: MeshStandardMaterialParameters = {
      map, normalMap, roughnessMap, metalnessMap,
      metalness: 1, roughness: 0.5, envMapIntensity: 1,
      side: 2,
      transparent: false,
    };
    const m = new MeshStandardMaterial(params);
    if (maybeAO?.image?.naturalWidth) {
      m.aoMap = maybeAO;
      m.aoMapIntensity = 1;
    }
    return m;
  }, [map, normalMap, roughnessMap, metalnessMap, maybeAO]);

  //---------------------------------------------------------------------------
  // 4)  Geometries
  //---------------------------------------------------------------------------
  const faceGeo = useMemo(() => new PlaneGeometry(faceW, faceH), [faceW, faceH]);
  const topGeo  = useMemo(() => new PlaneGeometry(faceW, returnLeg), [faceW, returnLeg]);
  const sideGeo = useMemo(() => new PlaneGeometry(returnLeg, faceH), [returnLeg, faceH]);

  //---------------------------------------------------------------------------
  // 5)  Assemble (front face + 4 legs pushed back by returnLeg/2 on −Z)
  //---------------------------------------------------------------------------
  const zShift = -returnLeg / 2;

  return (
    <group position={position}>
      {/* front sheet */}
      <mesh geometry={faceGeo} material={faceMat} />

      {/* top & bottom */}
      <mesh geometry={topGeo}  material={flangeMat} position={[0,  faceH/2, zShift]} rotation={[-Math.PI/2, 0, 0]} />
      <mesh geometry={topGeo}  material={flangeMat} position={[0, -faceH/2, zShift]} rotation={[ Math.PI/2, 0, 0]} />

      {/* left & right */}
      <mesh geometry={sideGeo} material={flangeMat} position={[-faceW/2, 0, zShift]} rotation={[0,  Math.PI/2, 0]} />
      <mesh geometry={sideGeo} material={flangeMat} position={[ faceW/2, 0, zShift]} rotation={[0, -Math.PI/2, 0]} />
    </group>
  );
}
