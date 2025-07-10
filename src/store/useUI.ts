/* eslint-disable @typescript-eslint/consistent-type-imports */
import { create } from "zustand";

/* ─────────────── shared types ─────────────── */
export interface PanelSize { w: number; h: number; }
export interface PanelBlock {
  id: string;
  origin: { col: number; row: number };
  span  : { w: 1|2|3|4; h: 1|2|3|4 };
  lockedJoints: { v: number[]; h: number[] };
}
export interface WallState {
  width: number;  height: number;
  seamOffsetX: number; seamOffsetY: number;
  patternSeed: number;
  panelSize: PanelSize;
}
export type Seam = { kind: "v" | "h"; idx: number } | null;

/* naïve filler --------------------------------------------------- */
function packPanels (wallW: number, wallH: number, cell = 18): PanelBlock[] {
  const out: PanelBlock[] = [];
  const cols = Math.floor(wallW / cell);
  const rows = Math.floor(wallH / cell);
  let id = 0;
  for (let r = 0; r < rows; r += 2)
    for (let c = 0; c < cols; c++)
      out.push({
        id: `p${id++}`,
        origin: { col: c, row: r },
        span: { w: 1, h: 2 },
        lockedJoints: { v: [], h: [] },
      });
  return out;
}

/* ─────────────── Zustand store ─────────────── */
interface Store {
  /* wall (plus convenience mirrors) */
  wall: WallState;
  wallWidth: number; wallHeight: number;
  setWall: (p: Partial<WallState>) => void;

  /* seams */
  hoverSeam: Seam;
  setHoverSeam: (s: Seam) => void;
  toggleSeam: (s: { kind: "v" | "h"; idx: number }) => void;

  /* layout */
  layoutBlocks: PanelBlock[];
  setLayoutBlocks: (b: PanelBlock[]) => void;

  /* edit-grid toggle (+legacy alias) */
  editGrid: boolean;
  setEditGrid: (b: boolean) => void;
  editLayout: boolean;                 // <- alias expected by HUD
  setEditLayout: (b: boolean) => void; // <- alias expected by HUD

  /* --- remainder unchanged -------------------------------------- */
  materialVariant: "weatheringSteel" | "copper";
  setMaterialVariant: (v: "weatheringSteel" | "copper") => void;
  perfoDiameterMin: number; perfoDiameterMax: number;
  invertPattern: boolean; perforate: boolean;
  setPerfoDiameterMin: (v: number) => void;
  setPerfoDiameterMax: (v: number) => void;
  setInvertPattern: (b: boolean) => void;
  setPerforate: (b: boolean) => void;

  showEnvironment: boolean; backgroundColor: string;
  showGround: boolean;      groundColor: string;
  backgroundVariant: "dark" | "light";
  zoomAll: boolean;
  setShowEnvironment: (b: boolean) => void;
  setBackgroundColor: (c: string) => void;
  setShowGround: (b: boolean) => void;
  setGroundColor: (c: string) => void;
  setBackgroundVariant: (v: "dark" | "light") => void;
  setZoomAll: (v: boolean) => void;

  patternUrl: string; blur: number;
  setPatternUrl: (u: string) => void; setBlur: (v: number) => void;

  layoutOrientation: "portrait" | "landscape";
  returnLeg: number; jointMin: number; jointMax: number;
  setLayoutOrientation: (o: "portrait" | "landscape") => void;
  setReturnLeg: (v: number) => void;
  setJointMin: (v: number) => void; setJointMax: (v: number) => void;
}

const useUI = create<Store>((set, get) => ({
  /* wall ---------------------------------------------------------- */
  wall: {
    width: 144, height: 108,
    seamOffsetX: 0, seamOffsetY: 0,
    patternSeed: 42,
    panelSize: { w: 18, h: 36 },
  },
  wallWidth: 144,
  wallHeight: 108,
  setWall: p => {
    const w = Math.max(36, Math.min(288, p.width  ?? get().wall.width));
    const h = Math.max(36, Math.min(288, p.height ?? get().wall.height));
    set({
      wall: { ...get().wall, width: w, height: h, ...p },
      wallWidth: w,
      wallHeight: h,
      layoutBlocks: packPanels(w, h),
    });
  },

  /* seams --------------------------------------------------------- */
  hoverSeam: null,
  setHoverSeam: s => set({ hoverSeam: s }),
  toggleSeam: ({ kind, idx }) =>
    set(state => ({
      layoutBlocks: state.layoutBlocks.map(b => {
        const list = b.lockedJoints[kind];
        return {
          ...b,
          lockedJoints: {
            ...b.lockedJoints,
            [kind]: list.includes(idx)
              ? list.filter(i => i !== idx)
              : [...list, idx],
          },
        };
      }),
    })),

  /* layout / grid ------------------------------------------------- */
  layoutBlocks: packPanels(144, 108),
  setLayoutBlocks: b => set({ layoutBlocks: b }),

  /* the two keys always move together */
  editGrid: false,
  editLayout: false,

  setEditGrid: b => {
    console.log("[UI] editGrid →", b);
    set({ editGrid: b, editLayout: b });
  },
  setEditLayout: b => {
    console.log("[UI] editLayout →", b);
    set({ editGrid: b, editLayout: b });
  },

  /* ---- everything else exactly as before ----------------------- */
  materialVariant: "weatheringSteel",
  setMaterialVariant: v => set({ materialVariant: v }),

  perfoDiameterMin: 0.0625, perfoDiameterMax: 0.5,
  invertPattern: false, perforate: false,
  setPerfoDiameterMin: v => set({ perfoDiameterMin: v }),
  setPerfoDiameterMax: v => set({ perfoDiameterMax: v }),
  setInvertPattern: b  => set({ invertPattern: b }),
  setPerforate:    b  => set({ perforate: b }),

  showEnvironment: true, backgroundColor: "#ffffff",
  showGround: true,      groundColor: "#dddddd",
  backgroundVariant: "light", zoomAll: false,
  setShowEnvironment: b => set({ showEnvironment: b }),
  setBackgroundColor: c => set({ backgroundColor: c }),
  setShowGround:      b => set({ showGround: b }),
  setGroundColor:     c => set({ groundColor: c }),
  setBackgroundVariant: v => set({ backgroundVariant: v }),
  setZoomAll: v => set({ zoomAll: v }),

  patternUrl: "https://images.unsplash.com/photo-1533481644991-f01289782811?fm=jpg&q=60&w=3000",
  blur: 0,
  setPatternUrl: u => set({ patternUrl: u }),
  setBlur: v => set({ blur: v }),

  layoutOrientation: "portrait",
  returnLeg: 2,
  jointMin: 0.25,
  jointMax: 3,
  setLayoutOrientation: o => set({ layoutOrientation: o }),
  setReturnLeg: v => set({ returnLeg: v }),
  setJointMin:  v => set({ jointMin: v }),
  setJointMax:  v => set({ jointMax: v }),
}));

/* dev helper ----------------------------------------------------- */
if (typeof window !== "undefined") {
  (window as any).uiStore = useUI;
  // eslint-disable-next-line no-console
  console.info("%cuiStore → window.uiStore", "color:#22c55e;font-weight:bold;");
}

export default useUI;
