import { Leva, useControls, folder, button } from "leva";
import debounce from "lodash.debounce";
import useUI from "../store/useUI";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DEBOUNCE_MS = 50;

/** Debounce + shallow-equality guard so we don’t spam the store */
function debouncedSetter(
  current: () => number,
  setter : (v: number) => void
) {
  return debounce((v: number) => {
    if (Math.abs(v - current()) < 0.01) return;     // ignore no-ops
    setter(v);
  }, DEBOUNCE_MS);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function HUD() {
  const ui = useUI();

  /* cheap controls we can update live -------------------------------- */
  useControls({
    Scene: folder(
      {
        "Use HDRI": {
          value: ui.showEnvironment,
          onChange: ui.setShowEnvironment,
        },
        "Sky Color": {
          value: ui.backgroundColor,
          onChange: ui.setBackgroundColor,
        },
        ZoomAll: button(() => ui.setZoomAll(true)),
      },
      { collapsed: false }
    ),

    Materials: folder(
      {
        PBR: {
          options: { Steel: "weatheringSteel", Copper: "copper" },
          value: ui.materialVariant,
          onChange: ui.setMaterialVariant,
        },
        Perforate: { value: ui.perforate, onChange: ui.setPerforate },
      },
      { collapsed: true }
    ),
  });

  /* heavy controls – debounced while dragging ------------------------ */
  useControls({
    Layout: folder(
      {
        Orientation: {
          options : { Portrait: "portrait", Landscape: "landscape" },
          value   : ui.layoutOrientation,
          onChange: ui.setLayoutOrientation,          // cheap, keep live
        },

        /* wall size – debounced onChange (no onEditEnd any more) */
        "Width (in)": {
          value   : ui.wallWidth,
          min     : 36,
          max     : 240,
          step    : 1,
          onChange: debouncedSetter(() => ui.wallWidth,
                                    v => ui.setWall({ width: v })),
        },
        "Height (in)": {
          value   : ui.wallHeight,
          min     : 36,
          max     : 240,
          step    : 1,
          onChange: debouncedSetter(() => ui.wallHeight,
                                    v => ui.setWall({ height: v })),
        },

        /* return-leg – also debounced */
        "Return-Leg (in)": {
          value   : ui.returnLeg,
          min     : 0,
          max     : 6,
          step    : 1,
          onChange: debouncedSetter(() => ui.returnLeg, ui.setReturnLeg),
        },

        /* vertical gaps (already debounced) */
        "Vert Gap Min": {
          value   : ui.jointMin,
          min     : 0.25,
          max     : 1,
          step    : 0.01,
          onChange: debouncedSetter(() => ui.jointMin, ui.setJointMin),
        },
        "Vert Gap Max": {
          value   : ui.jointMax,
          min     : 1,
          max     : 3,
          step    : 0.25,
          onChange: debouncedSetter(() => ui.jointMax, ui.setJointMax),
        },

        "Edit grid": { value: ui.editLayout, onChange: ui.setEditLayout },
      },
      { collapsed: true }
    ),

    Pattern: folder(
      {
        "Image URL": { value: ui.patternUrl, onChange: ui.setPatternUrl },
        Blur: {
          value: ui.blur,
          min: 0,
          max: 2,
          step: 0.1,
          onChange: debounce(ui.setBlur, DEBOUNCE_MS),
        },
        Invert: { value: ui.invertPattern, onChange: ui.setInvertPattern },
      },
      { collapsed: true }
    ),

    Background: folder(
      {
        Variant: {
          options: { Light: "light", Dark: "dark" },
          value: ui.backgroundVariant,
          onChange: ui.setBackgroundVariant,
        },
      },
      { collapsed: true }
    ),
  });

  /* swallow wheel so Leva’s scroll doesn’t zoom Three-JS ------------- */
  const stopWheel = (e: React.WheelEvent) => e.stopPropagation();

  return (
    <div onWheel={stopWheel}>
      <Leva collapsed theme={{ sizes: { rootWidth: "300px" } }} />
    </div>
  );
}
