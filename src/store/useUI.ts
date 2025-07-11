/* eslint-disable @typescript-eslint/consistent-type-imports */
import { create } from "zustand";

/* ───────────── shared literal types ───────────── */
type SpanW = 1 | 2 | 3 | 4;
type SpanH = 1 | 2 | 3 | 4 | 5;          // portrait panels may reach 5

/* ───────────── domain models ───────────── */
export interface PanelSize { w: number; h: number }

export interface PanelBlock {
  id: string;
  origin: { col: number; row: number };
  span: { w: SpanW; h: SpanH };
  lockedJoints: { v: number[]; h: number[] };
}

export interface WallState {
  width: number;  height: number;
  seamOffsetX: number; seamOffsetY: number;
  patternSeed: number;
  panelSize: PanelSize;
}

/* ───── drag-and-drop info ───── */
export interface DragInfo {
  span: { w: 1; h: Exclude<SpanH, 1> };     // always 1×(2-5)
  cell: { col: number; row: number } | null;
}

/* ───── helper: seed wall with 1×2 panels ───── */
function packPanels(w: number, h: number, cell = 18): PanelBlock[] {
  const out: PanelBlock[] = [];
  const cols = Math.floor(w / cell);
  const rows = Math.floor(h / cell);
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

/* ───────────── Zustand store types ───────────── */
interface Store {
  wall: WallState;
  wallWidth: number; wallHeight: number;
  setWall: (p: Partial<WallState>) => void;

  layoutBlocks: PanelBlock[];
  setLayoutBlocks: (b: PanelBlock[]) => void;

  dragging: DragInfo | null;
  startDrag: (spanH: Exclude<SpanH, 1>) => void;
  updateDragCell: (cell: { col: number; row: number } | null) => void;
  cancelDrag: () => void;
  commitDrag: () => void;

  selectedIds: string[];
  toggleSelect: (id: string, multi: boolean) => void;
  clearSelection: () => void;
  combineSelected: () => void;

  /* — other UI prefs (unchanged signatures) — */
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
  setPatternUrl: (u: string) => void;
  setBlur: (v: number) => void;
  layoutOrientation: "portrait" | "landscape";
  returnLeg: number; jointMin: number; jointMax: number;
  setLayoutOrientation: (o: "portrait" | "landscape") => void;
  setReturnLeg: (v: number) => void;
  setJointMin: (v: number) => void;
  setJointMax: (v: number) => void;
}

/* ───────────── Zustand implementation ───────────── */
const useUI = create<Store>((set, get) => ({
  /* ------------- wall ------------- */
  wall: {
    width: 144, height: 108,
    seamOffsetX: 0, seamOffsetY: 0,
    patternSeed: 42,
    panelSize: { w: 18, h: 36 },
  },
  wallWidth: 144,
  wallHeight: 108,
  setWall: (p) => {
    const w = Math.max(36, Math.min(288, p.width  ?? get().wall.width));
    const h = Math.max(36, Math.min(288, p.height ?? get().wall.height));
    set({
      wall: { ...get().wall, width: w, height: h, ...p },
      wallWidth: w,
      wallHeight: h,
      layoutBlocks: packPanels(w, h),
    });
  },

  /* ---------- panel layout -------- */
  layoutBlocks: packPanels(144, 108),
  setLayoutBlocks: (b) => set({ layoutBlocks: b }),

  /* ------------- drag ------------- */
  dragging: null,
  startDrag: (spanH) =>
    set({ dragging: { span: { w: 1, h: spanH }, cell: null } }),

  updateDragCell: (cell) =>
    set((s) => (s.dragging ? { dragging: { ...s.dragging, cell } } : {})),

  cancelDrag: () => set({ dragging: null }),

  commitDrag: () => {
    const d = get().dragging;
    if (!d?.cell) return set({ dragging: null });

    const { col, row } = d.cell;
    const h = d.span.h;
    const w: 1 = 1;

    const overlaps = get().layoutBlocks.some((b) => {
      const bx1 = b.origin.col + b.span.w;
      const by1 = b.origin.row + b.span.h;
      const dx1 = col + w;
      const dy1 = row + h;
      return !(dx1 <= b.origin.col || col >= bx1 || dy1 <= b.origin.row || row >= by1);
    });
    if (overlaps) return set({ dragging: null });

    const newBlock: PanelBlock = {
      id: crypto.randomUUID(),
      origin: { col, row },
      span : { w, h },
      lockedJoints: {
        v: [col, col + 1],
        h: Array.from({ length: h + 1 }, (_, i) => row + i),
      },
    };

    set((s) => ({
      dragging: null,
      layoutBlocks: [...s.layoutBlocks, newBlock],
    }));
  },

  /* --------- selection --------- */
  selectedIds: [],
  toggleSelect: (id, multi) =>
    set((s) => {
      const base = multi ? [...s.selectedIds] : [];
      return {
        selectedIds: base.includes(id)
          ? base.filter((x) => x !== id)
          : [...base, id],
      };
    }),
  clearSelection: () => set({ selectedIds: [] }),

  /* ---------- combine (vertical) ---------- */
  combineSelected: () => {
    const { selectedIds, layoutBlocks } = get();
    if (selectedIds.length < 2) return;

    const blocks = layoutBlocks.filter((b) => selectedIds.includes(b.id));
    const col    = blocks[0].origin.col;

    const sameCol1Wide = blocks.every(
      (b) => b.origin.col === col && b.span.w === 1
    );
    if (!sameCol1Wide) return;

    const rows = blocks.map((b) => b.origin.row).sort((a, b) => a - b);
    const contiguous = rows.every((r, i) =>
      i === 0 ? true : r === rows[i - 1] + 2
    );
    if (!contiguous) return;

    /* sum heights with proper typing ------------------ */
    const totalH = blocks.reduce<number>((sum, b) => sum + b.span.h, 0) as SpanH;

    const newBlock: PanelBlock = {
      id: crypto.randomUUID(),
      origin: { col, row: Math.min(...rows) },
      span : { w: 1, h: totalH },
      lockedJoints: { v: [], h: [] },
    };

    set({
      layoutBlocks: [
        ...layoutBlocks.filter((b) => !selectedIds.includes(b.id)),
        newBlock,
      ],
      selectedIds: [newBlock.id],
    });
  },

  /* ------------- other UI prefs (unchanged bodies) ------------- */
  materialVariant: "weatheringSteel",
  setMaterialVariant: (v) => set({ materialVariant: v }),
  perfoDiameterMin: 0.0625, perfoDiameterMax: 0.5,
  invertPattern: false, perforate: false,
  setPerfoDiameterMin: (v) => set({ perfoDiameterMin: v }),
  setPerfoDiameterMax: (v) => set({ perfoDiameterMax: v }),
  setInvertPattern : (b) => set({ invertPattern : b }),
  setPerforate     : (b) => set({ perforate     : b }),
  showEnvironment: true, backgroundColor: "#ffffff",
  showGround: true,      groundColor: "#dddddd",
  backgroundVariant: "light", zoomAll: false,
  setShowEnvironment : (b) => set({ showEnvironment : b }),
  setBackgroundColor : (c) => set({ backgroundColor : c }),
  setShowGround      : (b) => set({ showGround      : b }),
  setGroundColor     : (c) => set({ groundColor     : c }),
  setBackgroundVariant: (v) => set({ backgroundVariant: v }),
  setZoomAll: (v) => set({ zoomAll: v }),
  patternUrl:
    "https://images.unsplash.com/photo-1533481644991-f01289782811?fm=jpg&q=60&w=3000",
  blur: 0,
  setPatternUrl: (u) => set({ patternUrl: u }),
  setBlur      : (v) => set({ blur: v }),
  layoutOrientation: "portrait",
  returnLeg: 2,
  jointMin: 0.25,
  jointMax: 3,
  setLayoutOrientation: (o) => set({ layoutOrientation: o }),
  setReturnLeg       : (v) => set({ returnLeg: v }),
  setJointMin        : (v) => set({ jointMin : v }),
  setJointMax        : (v) => set({ jointMax : v }),
}));

/* ───────────── dev helper ───────────── */
if (typeof window !== "undefined") {
  (window as any).uiStore = useUI;
  console.info("%cuiStore → window.uiStore", "color:#22c55e;font-weight:bold;");
}

export default useUI;
