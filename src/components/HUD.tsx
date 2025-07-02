import { Leva, useControls, button, folder } from "leva";
import useUI, { defaultPanel } from "../store/useUI";

export default function HUD() {
  const {
    wall,
    materialVariant,
    perfoDiameterMin,
    perfoDiameterMax,
    showEnvironment,
    backgroundColor,
    showGround,
    groundColor,
    backgroundVariant,
    setWall,
    setMaterialVariant,
    setPerfoDiameterMin,
    setPerfoDiameterMax,
    setShowEnvironment,
    setBackgroundColor,
    setShowGround,
    setGroundColor,
    setZoomAll,
    patternUrl,
    blur,
    setPatternUrl,
    setBlur,
    invertPattern,
    setInvertPattern,
    setBackgroundVariant,
    layoutOrientation,
    returnLeg,
    setLayoutOrientation,
    setReturnLeg,
    jointMin,
    jointMax,
    setJointMin,
    setJointMax,
  } = useUI();

  // Scene panel
  useControls("Scene", {
    "Use HDRI": { value: showEnvironment, onChange: setShowEnvironment },
    "Sky Color": {
      value: backgroundColor,
      onChange: setBackgroundColor,
    },
    ZoomAll: button(() => setZoomAll(true)),
    Ground: folder(
      {
        Show: { value: showGround, onChange: setShowGround },
        "Ground Color": { value: groundColor, onChange: setGroundColor },
      },
      { collapsed: true }
    ),
  });

  // Perforation panel
  useControls("Perforation", {
    "Min Diameter (in)": {
      value: perfoDiameterMin,
      min: 0.06125, max: 0.5, step: 0.06125,
      onChange: setPerfoDiameterMin,
    },
    "Max Diameter (in)": {
      value: perfoDiameterMax,
      min: 0.06125, max: 0.5, step: 0.06125,
      onChange: setPerfoDiameterMax,
    },
  });

  // Wall panel
  useControls("Wall", {
    width: {
      value: wall.width,
      min: 36,
      max: 288,
      step: 6,
      onChange: (v) => setWall({ width: v }),
    },
    height: {
      value: wall.height,
      min: 36,
      max: 288,
      step: 6,
      onChange: (v) => setWall({ height: v }),
    },
    seamOffsetX: {
      value: wall.seamOffsetX,
      min: -defaultPanel.w,
      max: defaultPanel.w,
      step: 1,
      onChange: (v) => setWall({ seamOffsetX: v }),
    },
    seamOffsetY: {
      value: wall.seamOffsetY,
      min: -defaultPanel.h,
      max: defaultPanel.h,
      step: 1,
      onChange: (v) => setWall({ seamOffsetY: v }),
    },
    panelVariant: {
      label: "Panel Size",
      options: { "18×36": "18x36", "18×54": "18x54" },
      value: `${wall.panelSize.w}x${wall.panelSize.h}`,
      onChange: (v) =>
        setWall({
          panelSize: v === "18x36" ? { w: 18, h: 36 } : { w: 18, h: 54 },
        }),
    },
    shufflePerforation: button(() =>
      setWall({ patternSeed: Math.random() * 99999 | 0 })
    ),
  });



  useControls("Layout", {
    Orientation: {
      options: { Portrait: "portrait", Landscape: "landscape" },
      value: layoutOrientation,
      onChange: setLayoutOrientation,
    },
    "Return‐Leg (in)": {
      value: returnLeg,
      min: 0,
      max: 6,
      step: 1,
      onChange: setReturnLeg,
    },
  });
  useControls("Materials", {
    PBR: {
      options: { Steel: "weatheringSteel", Copper: "copper" },
      value: materialVariant,
      onChange: setMaterialVariant,
    },
    });

  //image pattern panel
  useControls("Pattern", {
    "Image URL": { value: patternUrl, onChange: setPatternUrl },
    Blur: { value: blur, min: 0, max: 2, step: 0.1, onChange: setBlur },
    Invert: { value: invertPattern, onChange: setInvertPattern },
  });

  useControls("Background", {
    Variant: {
      options: { Light: "light", Dark: "dark" },
      value: backgroundVariant,
      onChange: setBackgroundVariant,
    },
  });

  useControls("Seams", {
  jointMin: { value: jointMin, min: 0, max: 1, step: 0.01, onChange: setJointMin },
  jointMax: { value: jointMax, min: 1, max: 6, step: 0.25, onChange: setJointMax },
});

  return (
    <>
    <Leva
      collapsed={false}
      theme={{
        sizes: { rootWidth: "300px" },
        colors: {
          accent1: "#1de9b6",
          accent2: "#f50057",
          highlight1: "#1a1d27",
          highlight3: "#10131a",
          folderWidgetColor: "#1de9b6",
          folderTextColor: "#e0e0e0",
        },
      }}
    />
    {patternUrl && (
        <div style={{ padding: 8, textAlign: "center" }}>
          <div style={{ color: "#fff", marginBottom: 4 }}>Pattern Preview</div>
          <img
            src={patternUrl}
            alt="Pattern preview"
            style={{
              maxWidth: "100%",
              maxHeight: 120,
              filter: `blur(${blur}px)`,
            }}
          />
        </div>
      )}
      </>
    
  );
}
