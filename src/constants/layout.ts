/* grid geometry -------------------------------------------------- */
export const CELL_IN          = 18;      // one masonry module (inches)
export const H_JOINT_IN       = 0.25;    // **was 0.5 – fixed**
export const MIN_PICK_HIT_PX  = 14;      // min click area (px)
export const PICK_RADIUS_PX   = 22;      // **new** – distance from cursor to edge

/* panel sizes we support ----------------------------------------- */
export const PANEL_SPANS = [2, 3, 4, 5]; // 1×N or N×1 (N in this list)