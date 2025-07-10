/* src/components/HUD.tsx */
import { Leva, useControls, folder, button } from "leva";
import debounce from "lodash.debounce";
import useUI from "../store/useUI";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const DEBOUNCE_MS = 50;

/** one-liner: debounce + ignore no-ops (keeps React snappy) */
const debouncedSetter = (current: () => number, setter: (v: number) => void) =>
  debounce((v: number) => {
    if (Math.abs(v - current()) < 0.01) return;   // ignore when unchanged
    setter(v);
  }, DEBOUNCE_MS);

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */
export default function HUD() {
  const ui = useUI();

  /* LIGHT-WEIGHT CONTROLS (commit immediately) ---------------------- */
  useControls({
    Scene: folder(
      {
        "Use HDRI":  { value: ui.showEnvironment, onChange: ui.setShowEnvironment },
        "Sky Color": { value: ui.backgroundColor, onChange: ui.setBackgroundColor },
        ZoomAll:     button(() => ui.setZoomAll(true)),
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

  /* HEAVY/EXPENSIVE CONTROLS (debounced while dragging) ------------- */
  useControls({
    Layout: folder(
      {
        Orientation: {
          options : { Portrait: "portrait", Landscape: "landscape" },
          value   : ui.layoutOrientation,
          onChange: ui.setLayoutOrientation,          // cheap, keep live
        },

        /* WALL SIZE */
        "Width (in)": {
          value: ui.wallWidth,  min: 36, max: 240, step: 1,
          onChange: debouncedSetter(() => ui.wallWidth,  v => ui.setWall({ width: v })),
        },
        "Height (in)": {
          value: ui.wallHeight, min: 36, max: 240, step: 1,
          onChange: debouncedSetter(() => ui.wallHeight, v => ui.setWall({ height: v })),
        },

        /* RETURN LEG */
        "Return-Leg (in)": {
          value: ui.returnLeg, min: 0, max: 6, step: 1,
          onChange: debouncedSetter(() => ui.returnLeg, ui.setReturnLeg),
        },

        /* VERTICAL GAPS */
        "Vert Gap Min": {
          value: ui.jointMin,  min: 0.25, max: 1, step: 0.01,
          onChange: debouncedSetter(() => ui.jointMin, ui.setJointMin),
        },
        "Vert Gap Max": {
          value: ui.jointMax,  min: 1, max: 3, step: 0.25,
          onChange: debouncedSetter(() => ui.jointMax, ui.setJointMax),
        },

        /* TOGGLE EDITOR */
        "Edit grid": { value: ui.editLayout, onChange: ui.setEditLayout },
      },
      { collapsed: true }
    ),

    Pattern: folder(
      {
        "Image URL": { value: ui.patternUrl, onChange: ui.setPatternUrl },
        Blur: {
          value: ui.blur, min: 0, max: 2, step: 0.1,
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

  /* stop Leva’s wheel from zooming the scene ------------------------ */
  return (
    <div onWheel={e => e.stopPropagation()}>
      <Leva collapsed theme={{ sizes: { rootWidth: "300px" } }} />
    </div>
  );
}
