/* eslint-disable @typescript-eslint/consistent-type-imports */
import { create } from "zustand";

/* ───────────── literal unions ───────────── */
type Span = 1 | 2 | 3 | 4 | 5;

/* ───────────── domain models ───────────── */
export interface PanelSize { w: number; h: number }

export interface PanelBlock {
  id: string;
  origin: { col: number; row: number };
  span  : { w: Span; h: Span };
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

/* ───── starter helper ───── */
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
  /* wall + layout */
  wall: WallState;
  wallWidth: number; wallHeight: number;
  setWall: (p: Partial<WallState>) => void;
  layoutBlocks: PanelBlock[];
  setLayoutBlocks: (b: PanelBlock[]) => void;

  /* drag-and-drop */
  dragging: DragInfo | null;
  startDrag: (span: { w: Span; h: Span }) => void;
  updateDragCell: (cell: { col: number; row: number } | null) => void;
  cancelDrag: () => void;
  commitDrag: () => void;

  /* selection / combine */
  selectedIds: string[];
  toggleSelect: (id: string, multi: boolean) => void;
  clearSelection: () => void;
  combineSelected: () => void;

  /* —— UI prefs (needed by HUD/App/Wall) —— */
  showEnvironment: boolean;
  setShowEnvironment: (b: boolean) => void;
  backgroundColor: string;
  setBackgroundColor: (c: string) => void;
  showGround: boolean;
  setShowGround: (b: boolean) => void;
  groundColor: string;
  setGroundColor: (c: string) => void;
  backgroundVariant: "dark" | "light";
  setBackgroundVariant: (v: "dark" | "light") => void;
  zoomAll: boolean;
  setZoomAll: (b: boolean) => void;

  materialVariant: "weatheringSteel" | "copper";
  setMaterialVariant: (v: "weatheringSteel" | "copper") => void;
  perforate: boolean;
  setPerforate: (b: boolean) => void;

  perfoDiameterMin: number; perfoDiameterMax: number;
  setPerfoDiameterMin: (v: number) => void;
  setPerfoDiameterMax: (v: number) => void;

  patternUrl: string; blur: number; invertPattern: boolean;
  setPatternUrl: (u: string) => void;
  setBlur: (v: number) => void;
  setInvertPattern: (b: boolean) => void;

  layoutOrientation: "portrait" | "landscape";
  setLayoutOrientation: (o: "portrait" | "landscape") => void;
  returnLeg: number; jointMin: number; jointMax: number;
  setReturnLeg: (v: number) => void;
  setJointMin: (v: number) => void;
  setJointMax: (v: number) => void;
}

/* ───────────── Zustand implementation ───────────── */
const useUI = create<Store>((set, get) => ({
  /* wall -------------------------------------------------------- */
  wall: { width: 144, height: 108, seamOffsetX: 0, seamOffsetY: 0, patternSeed: 42 },
  wallWidth: 144,
  wallHeight: 108,
  setWall: (p) => {
    const w = Math.max(36, Math.min(288, p.width  ?? get().wallWidth));
    const h = Math.max(36, Math.min(288, p.height ?? get().wallHeight));
    set({
      wallWidth: w,
      wallHeight: h,
      wall: { ...get().wall, ...p, width: w, height: h },
      layoutBlocks: packPanels(w, h),
    });
  },

  /* layout ------------------------------------------------------- */
  layoutBlocks: packPanels(144, 108),
  setLayoutBlocks: (b) => set({ layoutBlocks: b }),

  /* drag-and-drop ----------------------------------------------- */
  dragging: null,
  startDrag: (span) => set({ dragging: { span, cell: null } }),
  updateDragCell: (cell) =>
    set((s) => (s.dragging ? { dragging: { ...s.dragging, cell } } : {})),
  cancelDrag: () => set({ dragging: null }),

  commitDrag: () => {
    const d = get().dragging;
    if (!d?.cell) return set({ dragging: null });

    const { col, row } = d.cell;
    const { w, h }     = d.span;
    const x1 = col + w;
    const y1 = row + h;

    /* intersecting blocks */
    const intersecting = get().layoutBlocks.filter((b) => {
      const bx1 = b.origin.col + b.span.w;
      const by1 = b.origin.row + b.span.h;
      return !(x1 <= b.origin.col || col >= bx1 || y1 <= b.origin.row || row >= by1);
    });

    const survivors = intersecting.filter((b) =>
      !(b.origin.col >= col && b.origin.row >= row &&
        b.origin.col + b.span.w <= x1 && b.origin.row + b.span.h <= y1)
    );

    const newBlock: PanelBlock = {
      id: crypto.randomUUID(),
      origin: { col, row },
      span : { w, h },
      lockedJoints: { v: [], h: [] },
    };

    set((s) => ({
      dragging: null,
      layoutBlocks: [
        ...s.layoutBlocks.filter((b) => !intersecting.includes(b)),
        ...survivors,
        newBlock,
      ],
    }));
  },

  /* selection / combine ----------------------------------------- */
  selectedIds: [],
  toggleSelect: (id, multi) =>
    set((s) => {
      const base = multi ? [...s.selectedIds] : [];
      return { selectedIds: base.includes(id) ? base.filter((x) => x !== id) : [...base, id] };
    }),
  clearSelection: () => set({ selectedIds: [] }),

  combineSelected: () => {
    const { selectedIds, layoutBlocks } = get();
    if (selectedIds.length < 2) return;
    /* simple vertical combine of same-col 1-wide blocks */
    const blocks = layoutBlocks.filter((b) => selectedIds.includes(b.id));
    const col = blocks[0].origin.col;
    const sameCol1Wide = blocks.every((b) => b.origin.col === col && b.span.w === 1);
    if (!sameCol1Wide) return;
    const rows = blocks.map((b) => b.origin.row).sort((a, b) => a - b);
    const contiguous = rows.every((r, i) => i === 0 || r === rows[i - 1] + 2);
    if (!contiguous) return;
    const totalH = rows.length * blocks[0].span.h as Span;
    const newBlock: PanelBlock = {
      id: crypto.randomUUID(),
      origin: { col, row: rows[0] },
      span: { w: 1, h: totalH },
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

  /* UI prefs (default values + setters) ------------------------- */
  showEnvironment: true,
  setShowEnvironment: (b) => set({ showEnvironment: b }),
  backgroundColor: "#ffffff",
  setBackgroundColor: (c) => set({ backgroundColor: c }),
  showGround: true,
  setShowGround: (b) => set({ showGround: b }),
  groundColor: "#dddddd",
  setGroundColor: (c) => set({ groundColor: c }),
  backgroundVariant: "light",
  setBackgroundVariant: (v) => set({ backgroundVariant: v }),
  zoomAll: false,
  setZoomAll: (b) => set({ zoomAll: b }),

  materialVariant: "weatheringSteel",
  setMaterialVariant: (v) => set({ materialVariant: v }),
  perforate: false,
  setPerforate: (b) => set({ perforate: b }),

  perfoDiameterMin: 0.0625,
  perfoDiameterMax: 0.5,
  setPerfoDiameterMin: (v) => set({ perfoDiameterMin: v }),
  setPerfoDiameterMax: (v) => set({ perfoDiameterMax: v }),

  patternUrl: "",
  blur: 0,
  invertPattern: false,
  setPatternUrl: (u) => set({ patternUrl: u }),
  setBlur: (v) => set({ blur: v }),
  setInvertPattern: (b) => set({ invertPattern: b }),

  layoutOrientation: "portrait",
  setLayoutOrientation: (o) => set({ layoutOrientation: o }),
  returnLeg: 2,
  setReturnLeg: (v) => set({ returnLeg: v }),
  jointMin: 0.25,
  setJointMin: (v) => set({ jointMin: v }),
  jointMax: 3,
  setJointMax: (v) => set({ jointMax: v }),
}));

/* dev helper ---------------------------------------------------- */
if (typeof window !== "undefined") (window as any).uiStore = useUI;
export default useUI;
