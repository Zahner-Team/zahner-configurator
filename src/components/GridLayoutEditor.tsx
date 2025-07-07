import React, { useState, useCallback, useMemo } from "react";
import useUI from "../store/useUI";
import type { LayoutCell } from "../store/useUI";

/* ───────────────────────────── types ───────────────────────────── */
export interface PanelCell {
  id: string;                              // `${row}-${col}`
  panelId: string | null;                  // leader’s id
  orientation: "portrait" | "landscape";   // of THIS cell
}

export interface GridLayoutEditorProps {
  wallW: number;
  wallH: number;
  cell?: number;                           // default 18″
  onChange?: (cells: Record<string, PanelCell>) => void;
}

/* ───────────────────────────── constants ───────────────────────────── */
const CELL             = 18;               // 18″ module
const PIXELS_PER_INCH  = 8;                // must match <Html scale={…}> in Wall.tsx

/* ───────────────────────────── component ───────────────────────────── */
export default function GridLayoutEditor({
  wallW,
  wallH,
  cell = CELL,
  onChange,
}: GridLayoutEditorProps) {
  const ui         = useUI();
  const cols       = Math.floor(wallW / cell);
  const rows       = Math.floor(wallH / cell);
  const remainder  = wallW - cols * cell;
  const vJoint     = Math.min(ui.jointMax, remainder / (cols + 1));

  /* editor state (panels) */
  const [cells, setCells] = useState<Record<string, PanelCell>>(() => {
    const m: Record<string, PanelCell> = {};
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        m[`${r}-${c}`] = { id: `${r}-${c}`, panelId: `${r}-${c}`, orientation: "portrait" };
    return m;
  });

  /* ui state (current hovered joint) */
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  /* helper – can (r,c) become SECOND half of a landscape panel? */
  const isFree = useCallback(
    (r: number, c: number) => {
      const cand = cells[`${r}-${c}`];
      if (!cand) return false;
      if (cand.orientation === "portrait") return true;
      const partner = cells[`${r}-${c - 1}`];
      return partner?.panelId !== cand.panelId;
    },
    [cells]
  );

  /* push current cell map into Zustand layoutMatrix */
  const persist = (state: Record<string, PanelCell>) =>
    ui.setLayoutMatrix(
      Array.from({ length: rows }).map((_, rr) =>
        Array.from({ length: cols }).map((_, cc) => {
          const pc = state[`${rr}-${cc}`];
          return {
            id: pc.panelId ?? "",
            x : cc,
            y : rr,
            w : pc.orientation === "landscape" ? 2 : 1,
            h : pc.orientation === "portrait"  ? 2 : 1,
          } as LayoutCell;
        })
      )
    );

  /* click handler – join / split the column at index c                */
  const toggleCol = useCallback(
    (c: number) => {
      if (c === 0 || c === cols) return;          // outside wall
      setCells(prev => {
        const nxt = { ...prev };
        for (let r = 0; r < rows; r++) {
          const L = nxt[`${r}-${c - 1}`];
          const R = nxt[`${r}-${c}`];
          if (!L || !R) continue;

          // JOIN
          if (
            L.orientation  === "portrait" &&
            R.orientation  === "portrait" &&
            L.panelId === L.id           &&
            R.panelId === R.id
          ) {
            L.orientation = R.orientation = "landscape";
            R.panelId     = L.id;
          }
          // SPLIT
          else if (L.orientation === "landscape" && R.panelId === L.panelId) {
            L.orientation = R.orientation = "portrait";
            R.panelId     = R.id;
          }
        }
        onChange?.(nxt);
        persist(nxt);
        return nxt;
      });
    },
    [cols, rows, onChange, persist]
  );

  /* SVG grid (lines only) */
  const svgLines = useMemo(() => {
    const L: React.JSX.Element[] = [];
    let x = 0;
    for (let c = 0; c <= cols; c++) {
      L.push(<line key={`v${c}`} x1={x} y1={0} x2={x} y2="100%" stroke="#666" strokeWidth={0.5} />);
      x += cell + (c < cols ? vJoint : 0);
    }
    for (let r = 0; r <= rows; r++)
      L.push(<line key={`h${r}`} x1={0} y1={r * cell} x2="100%" y2={r * cell} stroke="#666" strokeWidth={0.5} />);
    return L;
  }, [cols, rows, cell, vJoint]);

  /* ───────────────────────────── render ───────────────────────────── */
  return (
    <div
      className="absolute inset-0 pointer-events-auto select-none"
      style={{
        width : wallW * PIXELS_PER_INCH,
        height: wallH * PIXELS_PER_INCH,
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${wallW} ${wallH}`}
        preserveAspectRatio="none"
      >
        {svgLines}
      </svg>

      {/* clickable vertical joints */}
      {Array.from({ length: cols + 1 }).map((_, c) => {
        // joint x-position in wall-space
        const jointX   = c * cell + Math.min(c, cols) * vJoint;
        const pxLeft   = (jointX - vJoint / 2) / wallW * 100;
        const pxWidth  = Math.max(6, vJoint) / wallW * 100; // at least 6 px wide

        const isHot    = hoverCol === c;

        return (
          <div
            key={`hit-v${c}`}
            onMouseEnter={() => setHoverCol(c)}
            onMouseLeave={() => setHoverCol(null)}
            onClick={() => toggleCol(c)}
            className="absolute top-0 h-full cursor-pointer"
            style={{
              left : `${pxLeft}%`,
              width: `${pxWidth}%`,
              background: isHot ? "rgba(52, 211, 153, 0.35)" : "transparent", // emerald-400/35
              transition: "background 0.1s",
            }}
          />
        );
      })}
    </div>
  );
}
