export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BarPlacement {
  left: number;
  top: number;
  placement: "above" | "below" | "beside-cell";
}

const GAP = 8;

const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;

/**
 * Where the floating table bar goes, in the shell's coordinate space.
 *
 * Preference: above the table, else below it, else (a table taller than the viewport, scrolled so
 * neither edge is visible) pinned to the visible top edge, and moved under the active cell when
 * that would cover it. The bar never sits on `activeCell`.
 *
 * @param table      the table's box
 * @param activeCell the cell holding the caret / selection anchor
 * @param bar        the bar's own size
 * @param visible    the visible part of the shell (viewport clipped to the shell)
 * @param shellWidth width of the shell, for horizontal clamping
 * @param rtl        align to the table's right edge instead of its left
 */
export function placeBar(
  table: Box,
  activeCell: Box,
  bar: { width: number; height: number },
  visible: { top: number; bottom: number },
  shellWidth: number,
  rtl: boolean,
): BarPlacement {
  const rawLeft = rtl ? table.left + table.width - bar.width : table.left;
  const left = Math.max(GAP / 2, Math.min(rawLeft, shellWidth - bar.width - GAP / 2));
  const fits = (top: number) => top >= visible.top && top + bar.height <= visible.bottom;

  const above = table.top - bar.height - GAP;
  if (fits(above)) return { left, top: above, placement: "above" };
  const below = table.top + table.height + GAP;
  if (fits(below)) return { left, top: below, placement: "below" };

  let top = Math.min(Math.max(visible.top + GAP / 2, above), visible.bottom - bar.height - GAP / 2);
  const box = { left, top, width: bar.width, height: bar.height };
  if (overlaps(box, activeCell)) {
    top = activeCell.top + activeCell.height + GAP;
    if (top + bar.height > visible.bottom) top = activeCell.top - bar.height - GAP;
    return { left, top, placement: "beside-cell" };
  }
  return { left, top, placement: top <= above ? "above" : "below" };
}
