/* src/store/useUI.ts
   ONE authoritative Zustand store for the whole app */

import { create } from "zustand";
import { CELL_IN } from "../constants/layout";

/* ── literal unions ── */
type Span = 1 | 2 | 3 | 4 | 5;
export interface PanelSize { w: number; h: number }

/* ── data models ── */
export interface PanelBlock {
  id: string;
  origin: { col: number; row: number };
  span : { w: Span; h: Span };
  lockedJoints: { v: number[]; h: number[] };
}

export interface WallState {
  width: number;  height: number;
  seamOffsetX: number; seamOffsetY: number;
  patternSeed: number;
}

export interface DragInfo {
  span: { w: Span; h: Span };
  cell: { col: number; row: number } | null;
}

/* ── helpers ── */
const packPanels = (w: number, h: number, c = CELL_IN): PanelBlock[] => {
  const out: PanelBlock[] = [];
  const cols = Math.floor(w / c);
  const rows = Math.floor(h / c);
  let id = 0;
  for (let r = 0; r < rows; r += 2)
    for (let col = 0; col < cols; col++)
      out.push({
        id: `p${id++}`,
        origin: { col, row: r },
        span: { w: 1, h: 2 },
        lockedJoints: { v: [], h: [] },
      });
  return out;
};

/* uniform-gap solver identical to logic in <Wall> when no horizontals */
const solveGap = (W: number, min: number, max: number) => {
  let cols = Math.floor(W / CELL_IN);
  let gap  = (W - cols * CELL_IN) / (cols + 1);
  while ((gap < min || gap > max) && cols > 1) {
    cols--;
    gap = (W - cols * CELL_IN) / (cols + 1);
  }
  return { cols, gap };
};

/* build vGaps + xStops from wallW and joint range */
const buildStops = (wallW: number, min: number, max: number) => {
  const { cols, gap } = solveGap(wallW, min, max);
  const vGaps = Array(cols + 1).fill(gap);
  const xStops: number[] = [];
  let pos = 0;
  for (let i = 0; i < cols; i++) {
    pos += vGaps[i];
    xStops.push(pos);          // left edge of column i
    pos += CELL_IN;
  }
  xStops.push(wallW);          // right edge of last column
  return { vGaps, xStops };
};

/* ── Zustand store interface ── */
interface Store {
  /* wall + variable gaps */
  wall: WallState;
  wallWidth: number; wallHeight: number;
  vGaps: number[];   xStops: number[];
  jointMin: number;  jointMax: number;
  setWall: (p: Partial<WallState>) => void;
  setJointMin: (v: number) => void;
  setJointMax: (v: number) => void;

  /* layout blocks */
  layoutBlocks: PanelBlock[];
  setLayoutBlocks: (b: PanelBlock[]) => void;

  /* drag-drop */
  dragging: DragInfo | null;
  startDrag: (span: { w: Span; h: Span }) => void;
  updateDragCell: (cell: { col: number; row: number } | null) => void;
  cancelDrag: () => void;
  commitDrag: () => void;

  /* selection */
  selectedIds: string[];
  toggleSelect: (id: string, multi: boolean) => void;
  clearSelection: () => void;
  combineSelected: () => void;

  /* UI prefs used elsewhere */
  showEnvironment: boolean; setShowEnvironment: (b: boolean) => void;
  backgroundColor: string;  setBackgroundColor: (c: string) => void;
  showGround: boolean;      setShowGround: (b: boolean) => void;
  groundColor: string;      setGroundColor: (c: string) => void;
  backgroundVariant: "dark" | "light"; setBackgroundVariant: (v: "dark" | "light") => void;
  zoomAll: boolean;         setZoomAll: (b: boolean) => void;

  layoutOrientation: "portrait" | "landscape"; setLayoutOrientation: (o: "portrait" | "landscape") => void;
  materialVariant: "weatheringSteel" | "copper"; setMaterialVariant: (v: "weatheringSteel" | "copper") => void;
  perforate: boolean; setPerforate: (b: boolean) => void;

  returnLeg: number; setReturnLeg: (v: number) => void;

  perfoDiameterMin: number; perfoDiameterMax: number;
  setPerfoDiameterMin: (v: number) => void; setPerfoDiameterMax: (v: number) => void;

  patternUrl: string; blur: number; invertPattern: boolean;
  setPatternUrl: (u: string) => void; setBlur: (v: number) => void; setInvertPattern: (b: boolean) => void;
}

/* ── store implementation ── */
const useUI = create<Store>((set, get) => ({
  /* wall defaults */
  jointMin: 0.25,
  jointMax: 3,
  wall: { width: 144, height: 108, seamOffsetX: 0, seamOffsetY: 0, patternSeed: 42 },
  wallWidth: 144, wallHeight: 108,
  ...buildStops(144, 0.25, 3),

  setWall: (p) => {
    const w = Math.max(36, Math.min(288, p.width  ?? get().wallWidth));
    const h = Math.max(36, Math.min(288, p.height ?? get().wallHeight));
    const { vGaps, xStops } = buildStops(w, get().jointMin, get().jointMax);

    set({
      wallWidth: w, wallHeight: h,
      wall: { ...get().wall, ...p, width: w, height: h },
      vGaps, xStops,
      layoutBlocks: packPanels(w, h),
    });
  },
  setJointMin: (v) => { set({ jointMin: v }); get().setWall({}); },
  setJointMax: (v) => { set({ jointMax: v }); get().setWall({}); },

  /* layout */
  layoutBlocks: packPanels(144, 108),
  setLayoutBlocks: (b) => set({ layoutBlocks: b }),

  /* drag */
  dragging: null,
  startDrag: (span) => set({ dragging: { span, cell: null } }),
  updateDragCell: (cell) =>
    set((s) => (s.dragging ? { dragging: { ...s.dragging, cell } } : {})),
  cancelDrag: () => set({ dragging: null }),

  commitDrag: () => {
    const d = get().dragging; if (!d?.cell) return set({ dragging: null });
    const { col, row } = d.cell, { w, h } = d.span;

    const survivors = get().layoutBlocks.filter((b) => {
      const bx0 = b.origin.col, by0 = b.origin.row,
        bx1 = bx0 + b.span.w - 1, by1 = by0 + b.span.h - 1;
      return bx1 < col || bx0 > col + w - 1 || by1 < row || by0 > row + h - 1;
    });
    survivors.push({ id: crypto.randomUUID(), origin: { col, row }, span: { w, h }, lockedJoints: { v: [], h: [] } });

    set({ dragging: null, layoutBlocks: survivors });
  },

  /* selection */
  selectedIds: [],
  toggleSelect: (id, multi) =>
    set((s) => ({
      selectedIds: multi
        ? s.selectedIds.includes(id) ? s.selectedIds : [...s.selectedIds, id]
        : s.selectedIds.includes(id) ? [] : [id],
    })),
  clearSelection: () => set({ selectedIds: [] }),
  combineSelected: () => {},

  /* UI prefs */
  showEnvironment: true, setShowEnvironment: (b) => set({ showEnvironment: b }),
  backgroundColor: "#ffffff", setBackgroundColor: (c) => set({ backgroundColor: c }),
  showGround: true, setShowGround: (b) => set({ showGround: b }),
  groundColor: "#dddddd", setGroundColor: (c) => set({ groundColor: c }),
  backgroundVariant: "light", setBackgroundVariant: (v) => set({ backgroundVariant: v }),
  zoomAll: false, setZoomAll: (b) => set({ zoomAll: b }),

  layoutOrientation: "portrait", setLayoutOrientation: (o) => set({ layoutOrientation: o }),
  materialVariant: "weatheringSteel", setMaterialVariant: (v) => set({ materialVariant: v }),
  perforate: false, setPerforate: (b) => set({ perforate: b }),

  returnLeg: 2, setReturnLeg: (v) => set({ returnLeg: v }),

  perfoDiameterMin: 0.0625, perfoDiameterMax: 0.5,
  setPerfoDiameterMin: (v) => set({ perfoDiameterMin: v }),
  setPerfoDiameterMax: (v) => set({ perfoDiameterMax: v }),

  patternUrl: "", blur: 0, invertPattern: false,
  setPatternUrl: (u) => set({ patternUrl: u }),
  setBlur: (v) => set({ blur: v }),
  setInvertPattern: (b) => set({ invertPattern: b }),
}));

/* expose for console tinkering */
if (typeof window !== "undefined") (window as any).uiStore = useUI;

export default useUI;
