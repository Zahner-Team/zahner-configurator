// src/components/Panel.tsx
import { useMemo } from "react";
import {
  PlaneGeometry,
  MeshStandardMaterial,
  RepeatWrapping,
  Texture,
  SRGBColorSpace,
} from "three";
import { useTexture } from "@react-three/drei";
import type { PanelSize } from "../store/useUI";
import useUI from "../store/useUI";

interface PanelProps {
  faceSize: PanelSize; // { w, h }
  wallSize: [number, number];
  position: [number, number, number];
  returnLeg: number;
  perforate: boolean;
  alphaMap: Texture;
}

/**
 * Individual rainscreen panel consisting of a face and four folded flanges.
 * ✨  NOTE:  Every child <mesh> now has its own **static, descriptive key**.  
 *     This guarantees React never encounters duplicate keys, no matter how many
 *     panels you mount.
 */
export default function Panel({
  faceSize: { w: faceW, h: faceH },
  wallSize: [wallW, wallH],
  position,
  returnLeg,
  perforate,
  alphaMap,
}: PanelProps) {
  /* ------------------------------------------------------------------
   * material + textures
   * ------------------------------------------------------------------ */
  const { materialVariant } = useUI();
  const base = `/textures/${materialVariant}/`;
  const isCu = materialVariant === "copper";

  const [map, normalMap, roughnessMap, metalnessMap, aoMap] = useTexture([
    `${base}${isCu ? "Copper_PBR_BaseColor.jpg" : "Steel_Weathering_BaseColor.png"}`,
    `${base}${isCu ? "Copper_PBR_Normal.jpg"    : "Steel_Weathering_Normal.jpg"}`,
    `${base}${isCu ? "Copper_PBR_Roughness.jpg" : "Steel_Weathering_Roughness.jpg"}`,
    `${base}${isCu ? "Copper_PBR_Metalness.jpg" : "Steel_Weathering_Metalness.jpg"}`,
    `${base}${isCu ? "Copper_PBR_AO.jpg"        : "Steel_Weathering_AO.jpg"}`,
  ]);

  map.colorSpace = SRGBColorSpace;

  /**
   * Perforation alpha‑map is cloned so each panel can tweak repeat / offset
   * independently without stomping a shared instance.
   */
  const faceAlpha = useMemo(() => {
    if (!perforate) return undefined;
    const tex = alphaMap.clone();
    tex.wrapS = tex.wrapT = RepeatWrapping;

    // repeat so the holes always stay square regardless of panel aspect ratio
    tex.repeat.set(faceW / wallW, faceH / wallH);

    // offset so the hole pattern is continuous across adjacent panels
    tex.offset.set(
      (position[0] + wallW / 2 - returnLeg) / wallW - tex.repeat.x / 2,
      (position[1] + wallH / 2 - returnLeg) / wallH - tex.repeat.y / 2
    );
    tex.needsUpdate = true;
    return tex;
  }, [perforate, alphaMap, faceW, faceH, wallW, wallH, position, returnLeg]);

  const makeMat = (alpha?: Texture) => {
    const params: any = {
      map,
      normalMap,
      roughnessMap,
      metalnessMap,
      metalness: 1,
      roughness: 0.5,
      envMapIntensity: 1,
      side: 2,
    } as const;

    if (alpha) {
      params.alphaMap = alpha;
      params.alphaTest = 0.4; // discard *just* the holes
    }

    const mat = new MeshStandardMaterial(params);
    if (aoMap?.image?.naturalWidth) {
      mat.aoMap = aoMap;
      mat.aoMapIntensity = 1;
    }
    return mat;
  };

  const faceMat = useMemo(() => makeMat(faceAlpha), [faceAlpha]);
  const flangeMat = useMemo(() => makeMat(undefined), []);

  /* ------------------------------------------------------------------
   * geometry (memoised → one set reused across every instance)
   * ------------------------------------------------------------------ */
  const faceGeo = useMemo(() => new PlaneGeometry(faceW, faceH), [faceW, faceH]);
  const flangeGeoH = useMemo(() => new PlaneGeometry(faceW, returnLeg), [faceW, returnLeg]);
  const flangeGeoV = useMemo(() => new PlaneGeometry(returnLeg, faceH), [faceH, returnLeg]);
  const FLANGE_Z = -returnLeg / 2 

  /* ------------------------------------------------------------------
   * render
   * ------------------------------------------------------------------ */
  return (
    <group position={position}>
      {/* face */}
      <mesh geometry={faceGeo} material={faceMat} key="face" />

      {/* horizontal flanges (top / bottom) */}
      {(["top", "bottom"] as const).map((dir) => (
        <mesh
          key={`flange-h-${dir}`}
          geometry={flangeGeoH}
          material={flangeMat}
          position={[0, dir === "top" ?  faceH / 2 : -faceH / 2,  FLANGE_Z]}
          rotation={[Math.PI / 2, 0, 0]}   // same as before – only Z-offset changed
        />
      ))}

      {/* vertical flanges (left / right) */}
      {(["left", "right"] as const).map((dir) => (
        <mesh
          key={`flange-v-${dir}`}
          geometry={flangeGeoV}
          material={flangeMat}
          position={[dir === "left" ? -faceW / 2 : faceW / 2, 0,  FLANGE_Z]}
          rotation={[0, dir === "left" ?  Math.PI / 2 : -Math.PI / 2, 0]}
        />
      ))}
    </group>
  );
}
