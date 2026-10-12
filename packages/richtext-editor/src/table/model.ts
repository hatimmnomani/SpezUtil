import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  type ElementFormatType,
  type LexicalNode,
} from "lexical";
import {
  $computeTableMapSkipCellCheck,
  $createTableSelectionFrom,
  $deleteTableColumn,
  $findCellNode,
  $findTableNode,
  $insertTableColumnAtNode,
  $insertTableRowAtNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $isTableSelection,
  $mergeCells,
  $moveTableColumn,
  $removeTableRowAtIndex,
  $setTableColumnIsHeader,
  $setTableRowIsHeader,
  $unmergeCell,
  TableCellHeaderStates,
  type TableCellNode,
  type TableMapType,
  type TableNode,
  type TableRowNode,
} from "@lexical/table";

/** Narrowest a column may be dragged or typed to, in CSS px. */
export const TABLE_MIN_COL_WIDTH = 40;
/** Widest a column may be set to, in CSS px. */
export const TABLE_MAX_COL_WIDTH = 1200;
/** Largest table the picker's custom size will build. */
export const TABLE_MAX_ROWS = 100;
export const TABLE_MAX_COLS = 20;

/** Inclusive rectangle of logical grid positions (spans counted), zero-based. */
export interface CellRect {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export interface TableSelectionInfo {
  table: TableNode;
  rect: CellRect;
  /** Distinct cells overlapping `rect`, in row-major order. */
  cells: TableCellNode[];
  /** The cell holding the caret / the selection anchor. */
  anchor: TableCellNode;
  /** True for a multi-cell (rectangular) selection rather than a caret. */
  isRange: boolean;
}

export type CellAlignment = "left" | "center" | "right" | "justify" | "start" | "end" | "";
export type CellVerticalAlign = "top" | "middle" | "bottom";

export function $tableMap(table: TableNode): TableMapType {
  return $computeTableMapSkipCellCheck(table, null, null)[0];
}

export function $rowCount(table: TableNode): number {
  return table.getChildrenSize();
}

export function $columnCount(table: TableNode): number {
  return $tableMap(table)[0]?.length ?? 0;
}

/** The cell covering grid position (row, col), or null outside the grid. */
export function $cellAt(table: TableNode, row: number, col: number): TableCellNode | null {
  return $tableMap(table)[row]?.[col]?.cell ?? null;
}

/** Grid rectangle a single cell covers. */
export function $rectOfCell(table: TableNode, cell: TableCellNode): CellRect {
  const map = $tableMap(table);
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r]!.length; c++) {
      if (map[r]![c]!.cell.is(cell)) {
        const v = map[r]![c]!;
        return {
          minRow: v.startRow,
          minCol: v.startColumn,
          maxRow: v.startRow + cell.getRowSpan() - 1,
          maxCol: v.startColumn + cell.getColSpan() - 1,
        };
      }
    }
  }
  return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
}

/** Widens a rectangle until no merged cell is cut by its edge. */
export function $growToWholeCells(table: TableNode, rect: CellRect): CellRect {
  const map = $tableMap(table);
  const next = { ...rect };
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = next.minRow; r <= next.maxRow; r++) {
      for (let c = next.minCol; c <= next.maxCol; c++) {
        const v = map[r]?.[c];
        if (!v) continue;
        const endRow = v.startRow + v.cell.getRowSpan() - 1;
        const endCol = v.startColumn + v.cell.getColSpan() - 1;
        if (v.startRow < next.minRow) { next.minRow = v.startRow; changed = true; }
        if (v.startColumn < next.minCol) { next.minCol = v.startColumn; changed = true; }
        if (endRow > next.maxRow) { next.maxRow = endRow; changed = true; }
        if (endCol > next.maxCol) { next.maxCol = endCol; changed = true; }
      }
    }
  }
  return next;
}

export function $cellsInRect(table: TableNode, rect: CellRect): TableCellNode[] {
  const map = $tableMap(table);
  const seen = new Set<string>();
  const cells: TableCellNode[] = [];
  for (let r = rect.minRow; r <= rect.maxRow; r++) {
    for (let c = rect.minCol; c <= rect.maxCol; c++) {
      const cell = map[r]?.[c]?.cell;
      if (cell && !seen.has(cell.getKey())) {
        seen.add(cell.getKey());
        cells.push(cell);
      }
    }
  }
  return cells;
}

/** Describes what the current selection covers inside a table, or null when it is not in one. */
export function $getTableSelectionInfo(): TableSelectionInfo | null {
  const selection = $getSelection();
  if ($isTableSelection(selection)) {
    const table = $getNodeByKey(selection.tableKey);
    const anchor = selection.anchor.getNode();
    const focus = selection.focus.getNode();
    if (!$isTableNode(table) || !$isTableCellNode(anchor) || !$isTableCellNode(focus)) return null;
    const a = $rectOfCell(table, anchor);
    const f = $rectOfCell(table, focus);
    const rect = $growToWholeCells(table, {
      minRow: Math.min(a.minRow, f.minRow),
      maxRow: Math.max(a.maxRow, f.maxRow),
      minCol: Math.min(a.minCol, f.minCol),
      maxCol: Math.max(a.maxCol, f.maxCol),
    });
    return { table, rect, cells: $cellsInRect(table, rect), anchor, isRange: true };
  }
  if ($isRangeSelection(selection)) {
    const cell = $findCellNode(selection.anchor.getNode());
    if (cell === null) return null;
    const table = $findTableNode(cell);
    if (table === null) return null;
    const rect = $rectOfCell(table, cell);
    return { table, rect, cells: [cell], anchor: cell, isRange: false };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Selection helpers
// ---------------------------------------------------------------------------------------------

/** Puts the caret at the end of a cell's last block. */
export function $selectCell(cell: TableCellNode): void {
  cell.selectEnd();
}

/** Selects a rectangle of cells as a multi-cell selection (a single cell becomes a caret). */
export function $selectRect(table: TableNode, rect: CellRect, collapseSingle = true): void {
  const from = $cellAt(table, rect.minRow, rect.minCol);
  const to = $cellAt(table, rect.maxRow, rect.maxCol);
  if (from === null || to === null) return;
  if (collapseSingle && from.is(to)) {
    from.selectEnd();
    return;
  }
  $setSelection($createTableSelectionFrom(table, from, to));
}

export function $selectRow(table: TableNode, row: number): void {
  $selectRect(table, { minRow: row, maxRow: row, minCol: 0, maxCol: $columnCount(table) - 1 }, false);
}

export function $selectColumn(table: TableNode, col: number): void {
  $selectRect(table, { minRow: 0, maxRow: $rowCount(table) - 1, minCol: col, maxCol: col }, false);
}

export function $selectWholeTable(table: TableNode): void {
  $selectRect(
    table,
    { minRow: 0, maxRow: $rowCount(table) - 1, minCol: 0, maxCol: $columnCount(table) - 1 },
    false,
  );
}

// ---------------------------------------------------------------------------------------------
// Rows and columns
// ---------------------------------------------------------------------------------------------

/** Inserts `count` empty rows beside the row at `row`. Returns the first new row. */
export function $insertRow(
  table: TableNode,
  row: number,
  where: "before" | "after",
  count = 1,
): TableRowNode | null {
  const cell = $cellAt(table, Math.max(0, Math.min(row, $rowCount(table) - 1)), 0);
  if (cell === null) return null;
  let first: TableRowNode | null = null;
  for (let i = 0; i < count; i++) {
    const created = $insertTableRowAtNode(cell, where === "after");
    first ??= created;
  }
  return first;
}

/** Inserts `count` empty columns beside the column at `col`, in document order (before/after). */
export function $insertColumn(
  table: TableNode,
  col: number,
  where: "before" | "after",
  count = 1,
): void {
  const map = $tableMap(table);
  const index = Math.max(0, Math.min(col, (map[0]?.length ?? 1) - 1));
  // Anchor on a cell that *starts* in this column so a span cannot swallow the new column.
  let target: TableCellNode | null = null;
  for (let r = 0; r < map.length && target === null; r++) {
    const v = map[r]![index];
    if (v && v.startColumn === index) target = v.cell;
  }
  target ??= map[0]?.[index]?.cell ?? null;
  if (target === null) return;
  for (let i = 0; i < count; i++) {
    $insertTableColumnAtNode(target, where === "after", false);
  }
}

/** Deletes rows minRow..maxRow; the whole table goes when every row is covered. */
export function $deleteRows(table: TableNode, minRow: number, maxRow: number): void {
  const total = $rowCount(table);
  if (minRow <= 0 && maxRow >= total - 1) {
    $deleteTable(table);
    return;
  }
  for (let r = Math.min(maxRow, total - 1); r >= Math.max(0, minRow); r--) {
    $removeTableRowAtIndex(table, r);
  }
  $cellAt(table, Math.min(Math.max(0, minRow), $rowCount(table) - 1), 0)?.selectEnd();
}

/** Deletes columns minCol..maxCol; the whole table goes when every column is covered. */
export function $deleteColumns(table: TableNode, minCol: number, maxCol: number): void {
  const total = $columnCount(table);
  if (minCol <= 0 && maxCol >= total - 1) {
    $deleteTable(table);
    return;
  }
  const widths = table.getColWidths();
  const lo = Math.max(0, minCol);
  const hi = Math.min(maxCol, total - 1);
  for (let c = hi; c >= lo; c--) {
    $deleteTableColumn(table, c);
  }
  // $deleteTableColumn leaves colWidths alone; drop the removed columns' entries ourselves.
  if (widths && widths.length === total) {
    table.setColWidths(widths.filter((_, i) => i < lo || i > hi));
  }
  const col = Math.min(minCol, $columnCount(table) - 1);
  $cellAt(table, 0, col)?.selectEnd();
}

/** Removes the table and leaves the caret in the neighbouring block (creating one when alone). */
export function $deleteTable(table: TableNode): void {
  const next = table.getNextSibling();
  const prev = table.getPreviousSibling();
  if (next !== null) next.selectStart();
  else if (prev !== null) prev.selectEnd();
  else {
    const paragraph = $createParagraphNode();
    table.insertAfter(paragraph);
    paragraph.select();
  }
  table.remove();
}

/** Moves a row to a new index. Refused (returns false) for tables with merged cells. */
export function $moveRow(table: TableNode, from: number, to: number): boolean {
  const rows = table.getChildren().filter($isTableRowNode);
  if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return false;
  if (!$isSimple(table)) return false;
  const row = rows[from]!;
  const target = rows[to]!;
  if (to > from) target.insertAfter(row);
  else target.insertBefore(row);
  return true;
}

/** Moves a column to a new index. Refused (returns false) for tables with merged cells. */
export function $moveColumn(table: TableNode, from: number, to: number): boolean {
  const cols = $columnCount(table);
  if (from === to || from < 0 || to < 0 || from >= cols || to >= cols) return false;
  if (!$isSimple(table)) return false;
  // $moveTableColumn carries the column's width with it.
  $moveTableColumn(table, from, to);
  return true;
}

/** True when no cell spans more than one row or column. */
function $isSimple(table: TableNode): boolean {
  for (const row of table.getChildren()) {
    if (!$isTableRowNode(row)) continue;
    for (const cell of row.getChildren()) {
      if ($isTableCellNode(cell) && (cell.getColSpan() > 1 || cell.getRowSpan() > 1)) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------------------------
// Header rows / columns
// ---------------------------------------------------------------------------------------------

export function $isHeaderRow(table: TableNode, row = 0): boolean {
  const cells = $cellsInRect(table, { minRow: row, maxRow: row, minCol: 0, maxCol: $columnCount(table) - 1 });
  return cells.length > 0 && cells.every((c) => c.hasHeaderState(TableCellHeaderStates.ROW));
}

export function $isHeaderColumn(table: TableNode, col = 0): boolean {
  const cells = $cellsInRect(table, { minRow: 0, maxRow: $rowCount(table) - 1, minCol: col, maxCol: col });
  return cells.length > 0 && cells.every((c) => c.hasHeaderState(TableCellHeaderStates.COLUMN));
}

/** Toggles the first row as a header row. Returns the new state. */
export function $toggleHeaderRow(table: TableNode): boolean {
  const next = !$isHeaderRow(table, 0);
  $setTableRowIsHeader(table, 0, next);
  return next;
}

/** Toggles the first column as a header column. Returns the new state. */
export function $toggleHeaderColumn(table: TableNode): boolean {
  const next = !$isHeaderColumn(table, 0);
  $setTableColumnIsHeader(table, 0, next);
  return next;
}

// ---------------------------------------------------------------------------------------------
// Merge / split
// ---------------------------------------------------------------------------------------------

export function $canMerge(info: TableSelectionInfo | null): boolean {
  return info !== null && info.cells.length > 1;
}

export function $canSplit(info: TableSelectionInfo | null): boolean {
  return info !== null && info.cells.some((c) => c.getColSpan() > 1 || c.getRowSpan() > 1);
}

/** Merges the selected cells into one. Returns the merged cell, or null when fewer than two. */
export function $mergeSelection(info: TableSelectionInfo): TableCellNode | null {
  if (info.cells.length < 2) return null;
  const merged = $mergeCells(info.cells);
  merged?.selectEnd();
  return merged;
}

/** Splits every merged cell in the selection back into 1x1 cells. */
export function $splitSelection(info: TableSelectionInfo): number {
  let count = 0;
  for (const cell of info.cells) {
    if (cell.getColSpan() > 1 || cell.getRowSpan() > 1) {
      // $unmergeCell works on the selection; point it at each merged cell in turn.
      cell.selectEnd();
      $unmergeCell();
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------------------------
// Cell formatting
// ---------------------------------------------------------------------------------------------

/**
 * Hex and rgb()/rgba() only: those are the forms the handbook's server-side renderer re-prints, so a
 * colour in any other form (a keyword, hsl()) would silently vanish for readers.
 */
const CSS_COLOR = /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*[\d.]+\s*)?\))$/i;

/** Accepts a plain CSS colour; anything that could smuggle in other declarations is rejected. */
export function sanitizeCellColor(value: string | null | undefined): string | null {
  if (value == null) return null;
  const v = value.trim();
  if (v === "" || !CSS_COLOR.test(v)) return null;
  return v;
}

export function $setCellBackground(cells: readonly TableCellNode[], color: string | null): void {
  const safe = sanitizeCellColor(color);
  for (const cell of cells) cell.setBackgroundColor(safe);
}

/**
 * Horizontal alignment is stored the way the toolbar's own align buttons store it: on the cell *and*
 * on every block inside it. The block `format` is what readers' renderers already understand.
 */
export function $setCellAlignment(cells: readonly TableCellNode[], format: CellAlignment): void {
  for (const cell of cells) {
    cell.setFormat(format as ElementFormatType);
    for (const child of cell.getChildren()) {
      if ($isElementNode(child) && !child.isInline()) child.setFormat(format as ElementFormatType);
    }
  }
}

/** `top` is the default and is stored as "no value", keeping untouched documents byte-identical. */
export function $setCellVerticalAlign(cells: readonly TableCellNode[], align: CellVerticalAlign): void {
  for (const cell of cells) cell.setVerticalAlign(align === "top" ? undefined : align);
}

/** Empties each cell down to a single empty paragraph. */
export function $clearCells(cells: readonly TableCellNode[]): void {
  for (const cell of cells) {
    cell.clear();
    cell.append($createParagraphNode());
  }
}

export function $getCellAlignment(cell: TableCellNode): CellAlignment {
  const first = cell.getFirstChild();
  const fmt = $isElementNode(first) ? first.getFormatType() : cell.getFormatType();
  return (fmt ?? "") as CellAlignment;
}

// ---------------------------------------------------------------------------------------------
// Column widths
// ---------------------------------------------------------------------------------------------

export function clampColumnWidth(width: number): number {
  if (!Number.isFinite(width)) return TABLE_MIN_COL_WIDTH;
  return Math.round(Math.min(TABLE_MAX_COL_WIDTH, Math.max(TABLE_MIN_COL_WIDTH, width)));
}

/**
 * Stores explicit widths (one per column, whole px, clamped). Pass `null` to return the table to
 * automatic sizing; the property is then dropped from the JSON entirely.
 */
export function $setColumnWidths(table: TableNode, widths: readonly number[] | null): void {
  if (widths === null) {
    table.setColWidths(undefined);
    return;
  }
  const count = $columnCount(table);
  const next: number[] = [];
  for (let i = 0; i < count; i++) next.push(clampColumnWidth(widths[i] ?? widths[widths.length - 1] ?? 120));
  table.setColWidths(next);
}

export function $setColumnWidth(
  table: TableNode,
  col: number,
  width: number,
  measured?: readonly number[],
): void {
  const count = $columnCount(table);
  if (col < 0 || col >= count) return;
  const base = table.getColWidths() ?? measured;
  const next: number[] = [];
  for (let i = 0; i < count; i++) next.push(base?.[i] ?? 120);
  next[col] = width;
  $setColumnWidths(table, next);
}

// ---------------------------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------------------------

export function $tableOf(node: LexicalNode | null): TableNode | null {
  return node === null ? null : $findTableNode(node);
}
