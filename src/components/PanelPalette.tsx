// ───────────────────────────────────────────────────────────
// src/components/PanelPalette.tsx    (REPLACEMENT)
// ───────────────────────────────────────────────────────────
import useUI from "../store/useUI";
import "./PanelPalette.css";

export default function PanelPalette() {
  const { startDrag } = useUI();

  return (
    <div className="panel-palette">
      {[2, 3, 4, 5].map(h => (
        <button
          key={h}
          className="palette-item"
          onPointerDown={e => {
            e.preventDefault();               // ⬅ stop text-select drag
            startDrag(h as 2 | 3 | 4 | 5);
          }}
        >
          1&nbsp;×&nbsp;{h}
        </button>
      ))}
    </div>
  );
}
