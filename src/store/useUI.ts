import { create } from "zustand";

/* ─────────────────────────  shared types ───────────────────────── */
export interface PanelSize { w: number; h: number; }

export interface WallState {
  width: number;
  height: number;
  seamOffsetX: number;
  seamOffsetY: number;
  patternSeed: number;
  panelSize: PanelSize;
}

export interface LayoutCell {
  id: string;          // unique panel id
  x: number; y: number;
  w: number; h: number; // span in grid cells
}

/* ----------------------------------------------------------------- */
// const CELL = 18;                              // rigid 18" grid
export const defaultPanel: PanelSize = { w: 18, h: 36 };

/** fills the whole wall with portrait 1 × 1 panels */
/* helper ─ make a default “all-portrait” matrix */
function makeDefaultMatrix(wInch: number, hInch: number): LayoutCell[][] {
  const cols  = Math.floor(wInch / 18);   // 18 in cell
  const rows  = Math.floor(hInch / 18);
  const m: LayoutCell[][] = [];

  for (let r = 0; r < rows; ) {
    const h = Math.min(2, rows - r);      // each portrait panel is 2 cells high
    const rowBlock: LayoutCell[] = [];
    for (let c = 0; c < cols; c++) {
      const id = `${r}-${c}`;
      // leader cell
      rowBlock.push({ id, x: c, y: r, w: 1, h,           /* portrait */ });
    }
    // copy the leader reference into the slave row(s)
    for (let rr = 1; rr < h; rr++) {
      m[r + rr] = rowBlock.map(({ id, x, y }) => ({ id, x, y: y + rr, w: 1, h }));
    }
    m[r] = rowBlock;
    r += h;
  }
  return m;
}



/* ─────────────────────────  store shape ─────────────────────────-- */
export interface Store {
  /* wall */
  wall: WallState;
  wallWidth:  number;
  wallHeight: number;
  setWall: (p: Partial<WallState>) => void;

  /* materials & perforation */
  materialVariant: "weatheringSteel" | "copper";
  setMaterialVariant: (v: "weatheringSteel" | "copper") => void;
  perfoDiameterMin: number;
  perfoDiameterMax: number;
  invertPattern: boolean;
  perforate: boolean;
  setPerfoDiameterMin: (v: number) => void;
  setPerfoDiameterMax: (v: number) => void;
  setInvertPattern : (b: boolean) => void;
  setPerforate     : (b: boolean) => void;

  /* scene */
  showEnvironment: boolean;
  backgroundColor: string;
  showGround     : boolean;
  groundColor    : string;
  backgroundVariant: "dark" | "light";
  zoomAll        : boolean;
  setShowEnvironment : (b: boolean) => void;
  setBackgroundColor : (c: string)  => void;
  setShowGround      : (b: boolean) => void;
  setGroundColor     : (c: string)  => void;
  setBackgroundVariant: (v: "dark" | "light") => void;
  setZoomAll         : (v: boolean) => void;

  /* pattern */
  patternUrl: string;
  blur      : number;
  setPatternUrl: (url: string) => void;
  setBlur       : (v: number)  => void;

  /* layout & gaps */
  layoutOrientation: "portrait" | "landscape";
  returnLeg : number;
  jointMin  : number;
  jointMax  : number;
  setLayoutOrientation: (o: "portrait" | "landscape") => void;
  setReturnLeg        : (v: number) => void;
  setJointMin         : (v: number) => void;
  setJointMax         : (v: number) => void;

  /* grid-editor */
  layoutMatrix: LayoutCell[][];
  editLayout  : boolean;
  setLayoutMatrix: (m: LayoutCell[][]) => void;
  setEditLayout  : (b: boolean) => void;
}

/* ─────────────────────────  store impl ─────────────────────────-- */
export default create<Store>((set, get) => ({
  /* wall defaults */
  wall: {
    width : 144,
    height: 108,
    seamOffsetX: 0,
    seamOffsetY: 0,
    patternSeed: 42,
    panelSize  : defaultPanel,
  },
  wallWidth : 144,
  wallHeight: 108,
  setWall: (p) => set((s) => {
    // clamp to sensible limits
    const w = Math.max(36, Math.min(288, p.width  ?? s.wall.width));
    const h = Math.max(36, Math.min(288, p.height ?? s.wall.height));
    return {
      wall      : { ...s.wall, width: w, height: h, ...p },
      wallWidth  : w,
      wallHeight : h,
      // if wall size changed, regen default matrix unless user has custom one
      layoutMatrix: makeDefaultMatrix(w, h),
    };
  }),

  /* materials & perforation */
  materialVariant: "weatheringSteel",
  setMaterialVariant: (v) => set({ materialVariant: v }),
  perfoDiameterMin: 0.0625,
  perfoDiameterMax: 0.5,
  invertPattern   : false,
  perforate       : false,
  setPerfoDiameterMin: (v) => set({ perfoDiameterMin: v }),
  setPerfoDiameterMax: (v) => set({ perfoDiameterMax: v }),
  setInvertPattern   : (b) => set({ invertPattern: b }),
  setPerforate       : (b) => set({ perforate: b }),

  /* scene toggles */
  showEnvironment: true,
  backgroundColor: "#ffffff",
  showGround     : true,
  groundColor    : "#dddddd",
  backgroundVariant: "light",
  zoomAll        : false,
  setShowEnvironment : (b) => set({ showEnvironment: b }),
  setBackgroundColor : (c) => set({ backgroundColor: c }),
  setShowGround      : (b) => set({ showGround: b }),
  setGroundColor     : (c) => set({ groundColor: c }),
  setBackgroundVariant: (v) => set({ backgroundVariant: v }),
  setZoomAll         : (v) => set({ zoomAll: v }),

  /* pattern */
  patternUrl: "https://images.unsplash.com/photo-1533481644991-f01289782811?fm=jpg&q=60&w=3000",
  blur: 0,
  setPatternUrl: (url) => set({ patternUrl: url }),
  setBlur      : (v)   => set({ blur: v }),

  /* layout & gaps */
  layoutOrientation: "portrait",
  returnLeg: 2,
  jointMin : 0.25,
  jointMax : 3,
  setLayoutOrientation: (o) => set({ layoutOrientation: o }),
  setReturnLeg        : (v) => set({ returnLeg: v }),
  setJointMin         : (v) => set({ jointMin: v }),
  setJointMax         : (v) => set({ jointMax: v }),

  /* grid-editor */
  
  /* …inside create<Store>() — just change the one line below… */
  layoutMatrix : makeDefaultMatrix(144, 108),   // <-- instead of []
  editLayout   : false,
  setLayoutMatrix: (m) => set({ layoutMatrix: m }),
  setEditLayout  : (b) => set({ editLayout : b }),
}));
