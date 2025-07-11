// src/components/PanelPalette.tsx
import { useState } from "react";
import useUI from "../store/useUI";
import "./PanelPalette.css";

/* size options we support */
const SIZES: (2 | 3 | 4 | 5)[] = [2, 3, 4, 5];

export default function PanelPalette() {
  const { startDrag } = useUI();
  const [landscape, setLandscape] = useState(false); // false = portrait

  return (
    <div className="panel-palette">
      {/* orientation toggle */}
      <button
        className="palette-item"
        onClick={() => setLandscape((v) => !v)}
      >
        {landscape ? "Landscape" : "Portrait"}
      </button>

      {SIZES.map((n) => (
        <button
          key={n + (landscape ? "L" : "P")}
          className="palette-item"
          onPointerDown={(e) => {
            e.preventDefault();
            startDrag(landscape ? { w: n, h: 1 } : { w: 1, h: n });
          }}
        >
          {landscape ? `${n} × 1` : `1 × ${n}`}
        </button>
      ))}
    </div>
  );
}
