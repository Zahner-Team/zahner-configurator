// src/components/HUD.tsx
import { Leva, useControls, folder, button } from "leva";
import useUI from "../store/useUI";

export default function HUD() {
  const ui = useUI();

   // swallow wheel events so Leva’s scroll doesn’t zoom the 3D view
 const stopWheel = (e: React.WheelEvent) => { e.stopPropagation(); };

 

  // Single call to useControls with all folders & controls
  useControls({
    Scene: folder(
      {
        "Use HDRI":  { value: ui.showEnvironment, onChange: ui.setShowEnvironment },
        "Sky Color": { value: ui.backgroundColor, onChange: ui.setBackgroundColor },
        ZoomAll:     button(() => ui.setZoomAll(true)),
        Ground: folder(
          {
            Show:  { value: ui.showGround,  onChange: ui.setShowGround  },
            Color: { value: ui.groundColor, onChange: ui.setGroundColor },
          },
          { collapsed: true }
        ),
      },
      { collapsed: false }
    ),

    Materials: folder(
      {
        PBR:          { options: { Steel: "weatheringSteel", Copper: "copper" },
                   value: ui.materialVariant,   onChange: ui.setMaterialVariant },
        Perforate:    { value: ui.perforate, onChange: ui.setPerforate },  // ← wire this
      },
      { collapsed: true }
    ),

    "Perforation Size": folder(
      {
        "Min Ø (in)": {
          value:   ui.perfoDiameterMin,
          min:     0.06125,
          max:     0.5,
          step:    0.06125,
          onChange: ui.setPerfoDiameterMin,
        },
        "Max Ø (in)": {
          value:   ui.perfoDiameterMax,
          min:     0.06125,
          max:     0.5,
          step:    0.06125,
          onChange: ui.setPerfoDiameterMax,
        },
      },
      { collapsed: true }
    ),

    Layout: folder(
      {
        Orientation: {
          options:  { Portrait: "portrait", Landscape: "landscape" },
          value:    ui.layoutOrientation,
          onChange: ui.setLayoutOrientation,
        },
        "Return-Leg (in)": {
          value:   ui.returnLeg,
          min:     0,
          max:     6,
          step:    1,
          onChange: ui.setReturnLeg,
        },
        "Vert Gap Min": {
          value:   ui.jointMin,
          min:     0.25,
          max:     1,
          step:    0.01,
          onChange: ui.setJointMin,
        },
        "Vert Gap Max": {
          value:   ui.jointMax,
          min:     1,
          max:     3,
          step:    0.25,
          onChange: ui.setJointMax,
        },
      },
      { collapsed: true }
    ),

    Pattern: folder(
      {
        "Image URL": { value: ui.patternUrl, onChange: ui.setPatternUrl },
        Blur:        { value: ui.blur,      min: 0,  max: 2,  step: 0.1, onChange: ui.setBlur },
        Invert:      { value: ui.invertPattern, onChange: ui.setInvertPattern },
      },
      { collapsed: true }
    ),

    Background: folder(
      {
        Variant: {
          options:  { Light: "light", Dark: "dark" },
          value:    ui.backgroundVariant,
          onChange: ui.setBackgroundVariant,
        },
      },
      { collapsed: true }
    ),
  });

  return (
    <div onWheel={stopWheel}>
      <Leva collapsed theme={{ sizes: { rootWidth: "300px" } }} />
      {ui.patternUrl && (
        <div style={{ padding: 8, textAlign: "center" }}>
          <div style={{ color: "#fff", marginBottom: 4 }}>Pattern Preview</div>
          <img
            src={ui.patternUrl}
            alt="Pattern preview"
            style={{
              maxWidth:   "100%",
              maxHeight:  120,
              filter:     `blur(${ui.blur}px)`,
            }}
          />
        </div>
      )}
    </div>
    
  );
}
