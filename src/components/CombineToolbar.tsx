// src/components/CombineToolbar.tsx
import useUI from "../store/useUI";
import "./CombineToolbar.css";

export default function CombineToolbar() {
  const { selectedIds, combineSelected, clearSelection } = useUI();
  if (selectedIds.length < 2) return null;           // only show when useful

  return (
    <div className="combine-toolbar">
      <button onClick={combineSelected}>
        Combine ({selectedIds.length})
      </button>
      <button onClick={clearSelection}>Cancel</button>
    </div>
  );
}
