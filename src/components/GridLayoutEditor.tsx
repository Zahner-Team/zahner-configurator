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

/* ───────────────────────────── impl ───────────────────────────── */
const CELL = 18;       // 18″ module



export default function GridLayoutEditor({
  wallW,
  wallH,
  cell = CELL,
  onChange,
}: GridLayoutEditorProps) {
  const ui = useUI();

  /* grid geometry */
  const cols     = Math.floor(wallW / cell);
  const rows     = Math.floor(wallH / cell);
  const remainder = wallW - cols * cell;
  const vJoint    = Math.min(ui.jointMax, remainder / (cols + 1));

  /* editor state – every cell keeps its own data */
  const [cells, setCells] = useState<Record<string, PanelCell>>(() => {
    const m: Record<string, PanelCell> = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = `${r}-${c}`;
        m[id] = { id, panelId: id, orientation: "portrait" };
      }
    }
    return m;
  });

  /* helper – is (r,c) free to become SECOND half of a landscape? */
  const isFree = useCallback(
    (r: number, c: number) => {
      const cand = cells[`${r}-${c}`];
      if (!cand) return false;
      if (cand.orientation === "portrait") return true;

      /* already landscape → partner is at c-1 */
      const partner = cells[`${r}-${c - 1}`];
      return partner?.panelId !== cand.panelId;
    },
    [cells]
  );

  /* click handler – simpler portrait<->landscape toggle */
  const handleClick = useCallback(
    (r: number, c: number) => {
      setCells(prev => {
        const id  = `${r}-${c}`;
        const cur = prev[id];
        if (!cur) return prev;
        const nxt = { ...prev };

        /* portrait → landscape (needs room right) */
        if (cur.orientation === "portrait" && c < cols - 1 && isFree(r, c + 1)) {
          const partner = `${r}-${c + 1}`;
          nxt[id]       = { id, panelId: id, orientation: "landscape" };
          nxt[partner]  = { id: partner, panelId: id, orientation: "landscape" };
        }
        /* landscape → portrait */
        else if (cur.orientation === "landscape") {
          const partner = `${r}-${c + 1}`;
          nxt[id]       = { id, panelId: id, orientation: "portrait" };
          nxt[partner]  = { id: partner, panelId: partner, orientation: "portrait" };
        }

        /* propagate to parent + ZUSTAND store */
        onChange?.(nxt);
        ui.setLayoutMatrix(
          Array.from({ length: rows }).map((_, rr) =>
            Array.from({ length: cols }).map((_, cc) => {
              const pc = nxt[`${rr}-${cc}`];
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

        return nxt;
      });
    },
    [cols, rows, isFree, onChange, ui]
  );

  /* build the SVG grid once */
  const svgLines = useMemo(() => {
    const L: React.JSX.Element[] = [];
    let x = 0;
    for (let c = 0; c <= cols; c++) {
      L.push(<line key={`v${c}`} x1={x} y1={0} x2={x} y2="100%" stroke="#666" strokeWidth={0.5} />);
      x += cell + (c < cols ? vJoint : 0);
    }
    for (let r = 0; r <= rows; r++) {
      L.push(<line key={`h${r}`} x1={0} y1={r * cell} x2="100%" y2={r * cell} stroke="#666" strokeWidth={0.5} />);
    }
    return L;
  }, [cols, rows, cell, vJoint]);

  /* ───────────────────────────── render ───────────────────────────── */
  return (
    <div className="absolute inset-0 pointer-events-auto select-none">
      {/*  SVG grid  */}
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${wallW} ${wallH}`} preserveAspectRatio="none">
        {svgLines}
      </svg>

      {/* clickable overlay */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows   : `repeat(${rows}, 1fr)`,
        }}
      >
        {Array.from({ length: rows }).flatMap((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const { orientation, panelId } = cells[`${r}-${c}`];
            const isLeader = panelId === `${r}-${c}`;
            const bg = orientation === "landscape"
              ? isLeader ? "bg-amber-500/30" : "hidden"
              : "bg-sky-500/30";

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                className={`${bg} border border-transparent hover:bg-white/20 hover:ring-2 hover:ring-emerald-400/70`}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
