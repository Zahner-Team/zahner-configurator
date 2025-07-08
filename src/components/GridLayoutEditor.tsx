import React, { useState, useCallback, useMemo } from "react";
import useUI from "../store/useUI";
import type { LayoutCell } from "../store/useUI";

/* ------------------------------------------------- helpers & types */
export interface PanelCell {
  id: string;              // `${row}-${col}`
  panelId: string | null;  // leader’s id
  orientation: "portrait" | "landscape";
}

export interface GridLayoutEditorProps {
  wallW: number;
  wallH: number;
  cell?: number;           // default 18″
  onChange?: (m: Record<string, PanelCell>) => void;
}

/* ----------------------------------------------------- constants */
const CELL            = 18;    // 18″ module
const PIXELS_PER_INCH = 8;     // ↔ <Html scale={…}> in Wall.tsx

/* ================================================================ */
export default function GridLayoutEditor({
  wallW,
  wallH,
  cell = CELL,
  onChange,
}: GridLayoutEditorProps) {
  const ui        = useUI();
  const cols      = Math.floor(wallW / cell);
  const rows      = Math.floor(wallH / cell);
  const remainder = wallW - cols * cell;
  const vJoint    =
    remainder === 0 ? 0 : Math.min(ui.jointMax, remainder / (cols + 1));

  /* ------------- SAFETY BELT -------------- */
  if (cols === 0 || rows === 0 || vJoint < 0.01) return null;

  /* ----------------- editor state (panels) ---------------------- */
  const [cells, setCells] = useState<Record<string, PanelCell>>(() => {
    const m: Record<string, PanelCell> = {};
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        m[`${r}-${c}`] = {
          id: `${r}-${c}`,
          panelId: `${r}-${c}`,
          orientation: "portrait",
        };
    return m;
  });

  const [hoverCol, setHoverCol] = useState<number | null>(null);

  /* ------------------ helpers ------------------ */
  const persist = (state: Record<string, PanelCell>) =>
    ui.setLayoutMatrix(
      Array.from({ length: rows }).map((_, rr) =>
        Array.from({ length: cols }).map((_, cc) => {
          const pc = state[`${rr}-${cc}`];
          return {
            id: pc.panelId ?? "",
            x: cc,
            y: rr,
            w: pc.orientation === "landscape" ? 2 : 1,
            h: pc.orientation === "portrait" ? 2 : 1,
          } as LayoutCell;
        })
      )
    );

  /* join / split column */
  const toggleCol = useCallback(
    (c: number) => {
      if (c === 0 || c === cols) return;
      setCells((prev) => {
        const nxt = { ...prev };
        for (let r = 0; r < rows; r++) {
          const L = nxt[`${r}-${c - 1}`];
          const R = nxt[`${r}-${c}`];
          if (!L || !R) continue;

          /* join */
          if (
            L.orientation === "portrait" &&
            R.orientation === "portrait" &&
            L.panelId === L.id &&
            R.panelId === R.id
          ) {
            L.orientation = R.orientation = "landscape";
            R.panelId = L.id;
          }
          /* split */
          else if (L.orientation === "landscape" && R.panelId === L.panelId) {
            L.orientation = R.orientation = "portrait";
            R.panelId = R.id;
          }
        }
        onChange?.(nxt);
        persist(nxt);
        return nxt;
      });
    },
    [cols, rows, onChange, persist]
  );

  /* ------------------- SVG GRID ------------------- */
  const svgLines = useMemo(() => {
    const lines: React.JSX.Element[] = [];
    let x = 0;     // running x-pos in wall space

    for (let c = 0; c <= cols; c++) {
      lines.push(
        <line
          key={`v${c}`}
          x1={x}
          y1={0}
          x2={x}
          y2="100%"
          stroke="#666"
          strokeWidth={0.5}
        />
      );
      /* don’t step past the right edge */
      const step = cell + (c < cols ? vJoint : 0);
      if (x + step > wallW) break;
      x += step;
    }
    /* horizontals */
    for (let r = 0; r <= rows; r++)
      lines.push(
        <line
          key={`h${r}`}
          x1={0}
          y1={r * cell}
          x2="100%"
          y2={r * cell}
          stroke="#666"
          strokeWidth={0.5}
        />
      );
    return lines;
  }, [cols, rows, cell, vJoint, wallW]);

  /* ======================= render ======================= */
  return (
    <div
      className="absolute inset-0 pointer-events-auto select-none"
      style={{
        width: wallW * PIXELS_PER_INCH,
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
        const jointX = c * cell + Math.min(c, cols) * vJoint;
        const pxLeft = (jointX - vJoint / 2) / wallW * 100;
        const pxWidth = Math.max(6, vJoint) / wallW * 100;

        const hot = hoverCol === c;
        return (
          <div
            key={`hit${c}`}
            onMouseEnter={() => setHoverCol(c)}
            onMouseLeave={() => setHoverCol(null)}
            onClick={() => toggleCol(c)}
            className="absolute top-0 h-full cursor-pointer"
            style={{
              left: `${pxLeft}%`,
              width: `${pxWidth}%`,
              background: hot ? "rgba(52,211,153,0.35)" : "transparent",
              transition: "background 0.1s",
            }}
          />
        );
      })}
    </div>
  );
}
