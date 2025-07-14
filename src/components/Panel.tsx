// src/components/Panel.tsx
import { useMemo } from "react";
import {
  PlaneGeometry,
  MeshStandardMaterial,
  RepeatWrapping,
  Texture,
  SRGBColorSpace,
  LinearFilter,
  LinearMipMapLinearFilter,
} from "three";
import { useThree } from "@react-three/fiber";
import useUI from "../store/useUI";
import type { PanelSize } from "../store/useUI";

import { useTexture, Edges } from "@react-three/drei";   // ← Edges here

import { assetUrl } from "../utils/assetUrl";


interface PanelProps {
  id: string;                   // ← NEW
  faceSize: PanelSize;
  wallSize: [number, number];
  position: [number, number, number];
  returnLeg: number;
  perforate: boolean;
  alphaMap: Texture;
}

export default function Panel({
  id, 
  faceSize: { w: faceW, h: faceH },
  wallSize: [wallW, wallH],
  position,
  returnLeg,
  perforate,
  alphaMap,
}: PanelProps) {
  /* ------------------------------------------------------------------ textures */
  const { materialVariant } = useUI();
  // const texPath = `/textures/${materialVariant}/`;
// const texPath = assetUrl(`textures/${materialVariant}/`);
const texPath = `textures/${materialVariant}/`;
console.log("texPath", texPath); // Debugging line to check the texture path

  const isCu = materialVariant === "copper";

  const [map, normalMap, roughnessMap, metalnessMap, aoMap] = useTexture([
    assetUrl(`${texPath}${isCu ? "Copper_PBR_BaseColor.jpg" : "Steel_Weathering_BaseColor.png"}`),
    assetUrl(`${texPath}${isCu ? "Copper_PBR_Normal.jpg"    : "Steel_Weathering_Normal.jpg"}`),
    assetUrl(`${texPath}${isCu ? "Copper_PBR_Roughness.jpg" : "Steel_Weathering_Roughness.jpg"}`),
    assetUrl(`${texPath}${isCu ? "Copper_PBR_Metalness.jpg" : "Steel_Weathering_Metalness.jpg"}`),
    assetUrl(`${texPath}${isCu ? "Copper_PBR_AO.jpg"        : "Steel_Weathering_AO.jpg"}`),
  ]);
  map.colorSpace = SRGBColorSpace;

  const { gl } = useThree();

  /* ------------------------------------------------------------------ α-map (perforations) */
  const faceAlpha = useMemo(() => {
    if (!perforate) return undefined;

    const tex = alphaMap.clone();
    tex.wrapS = tex.wrapT = RepeatWrapping;

    tex.repeat.set(faceW / wallW, faceH / wallH);
    tex.offset.set(
      (position[0] + wallW / 2 - returnLeg) / wallW - tex.repeat.x / 2,
      (position[1] + wallH / 2 - returnLeg) / wallH - tex.repeat.y / 2
    );

    // shimmer / aliasing mitigation
    tex.minFilter      = LinearMipMapLinearFilter;
    tex.magFilter      = LinearFilter;
    tex.anisotropy     = gl.capabilities.getMaxAnisotropy();
    tex.generateMipmaps = true;
    tex.needsUpdate    = true;

    return tex;
  }, [perforate, alphaMap, faceW, faceH, wallW, wallH, position, returnLeg, gl]);

  /* ------------------------------------------------------------------ material helpers */
  const makeBase = () => {
    const m = new MeshStandardMaterial({
      map,
      normalMap,
      roughnessMap,
      metalnessMap,
      metalness: 1,
      roughness: 0.5,
      envMapIntensity: 1,
      side: 2,
    });
    if (aoMap?.image?.naturalWidth) {
      m.aoMap = aoMap;
      m.aoMapIntensity = 1;
    }
    return m;
  };

  const faceMat = useMemo(() => {
    const m = makeBase();
    if (faceAlpha) {
      m.alphaMap     = faceAlpha;
      m.alphaTest    = 0.15;      // ↓ softer edge ⇒ tiny holes remain
      m.transparent  = true;
      m.depthWrite   = false;
      m.polygonOffset = true;     // avoid Z-fighting with flanges
      m.polygonOffsetFactor = -1;
    }
    return m;
  }, [faceAlpha]);

  const flangeMat = useMemo(() => makeBase(), []);

  /* ------------------------------------------------------------------ geometry (re-used) */
  const faceGeo    = useMemo(() => new PlaneGeometry(faceW, faceH), [faceW, faceH]);
  const flangeGeoH = useMemo(() => new PlaneGeometry(faceW, returnLeg), [faceW, returnLeg]);
  const flangeGeoV = useMemo(() => new PlaneGeometry(returnLeg, faceH), [faceH, returnLeg]);

  const Z_FLANGE = -returnLeg / 2; // tuck behind the face

  /* ---------------- selection ---------------- */
  const { selectedIds, toggleSelect } = useUI();
  const selected = selectedIds.includes(id);

  const handleSelect = (e: React.PointerEvent) => {
    e.stopPropagation();
    toggleSelect(id, e.shiftKey || e.metaKey);
  };




  /* ---------------- render ---------------- */
  return (
    <group position={position} onPointerDown={handleSelect}>
      <mesh geometry={faceGeo} material={faceMat} />

      {/* flanges (unchanged) */}
      {/* top / bottom */}
      {(["top", "bottom"] as const).map((dir) => (
        <mesh
          key={`flange-h-${dir}`}
          geometry={flangeGeoH}
          material={flangeMat}
          position={[0, dir === "top" ? faceH / 2 : -faceH / 2, Z_FLANGE]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      ))}
      {/* left / right */}
      {(["left", "right"] as const).map((dir) => (
        <mesh
          key={`flange-v-${dir}`}
          geometry={flangeGeoV}
          material={flangeMat}
          position={[dir === "left" ? -faceW / 2 : faceW / 2, 0, Z_FLANGE]}
          rotation={[0, dir === "left" ? Math.PI / 2 : -Math.PI / 2, 0]}
        />
      ))}

      {/* green outline when selected */}
      {selected && <Edges scale={1.03} color="#10b981" />}
    </group>
  );
}