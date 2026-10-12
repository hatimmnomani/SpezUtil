import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
} from "lexical";
import { $isTableCellNode, $isTableRowNode, $isTableSelection, type TableCellNode, type TableNode } from "@lexical/table";
import { $cellAt, $getTableSelectionInfo, $insertRow, $rowCount } from "./model";

export interface TableKeyboardHooks {
  /** Called after a structural change so assistive tech can be told about it. */
  onRowAdded?: (table: TableNode) => void;
}

/** The cell after (or before) `cell` in reading order, or null at the table's edge. */
export function $adjacentCell(cell: TableCellNode, direction: "next" | "previous"): TableCellNode | null {
  const sibling = direction === "next" ? cell.getNextSibling() : cell.getPreviousSibling();
  if ($isTableCellNode(sibling)) return sibling;
  const row = cell.getParent();
  if (!$isTableRowNode(row)) return null;
  for (
    let r = direction === "next" ? row.getNextSibling() : row.getPreviousSibling();
    $isTableRowNode(r);
    r = direction === "next" ? r.getNextSibling() : r.getPreviousSibling()
  ) {
    const child = direction === "next" ? r.getFirstChild() : r.getLastChild();
    if ($isTableCellNode(child)) return child;
  }
  return null;
}

/** Places the caret in the block after the table, creating one when the table ends the document. */
export function $leaveTable(table: TableNode, direction: "after" | "before" = "after"): void {
  if (direction === "after") {
    const next = table.getNextSibling();
    if (next !== null) {
      next.selectStart();
      return;
    }
    const paragraph = $createParagraphNode();
    table.insertAfter(paragraph);
    paragraph.select();
    return;
  }
  const prev = table.getPreviousSibling();
  if (prev !== null) {
    prev.selectEnd();
    return;
  }
  const paragraph = $createParagraphNode();
  table.insertBefore(paragraph);
  paragraph.select();
}

/**
 * Tab / Shift+Tab / Escape for tables. Priority sits above @lexical/table's own handlers so that:
 * - Tab from the last cell appends a row instead of leaving the table,
 * - Tab works from a multi-cell selection (Lexical only handles a caret),
 * - Shift+Tab from the first cell leaves backwards rather than trapping focus,
 * - Escape from a caret inside a table steps out of it (Lexical's own Escape only collapses a
 *   multi-cell selection, which this leaves alone).
 */
export function registerTableKeyboard(editor: LexicalEditor, hooks: TableKeyboardHooks = {}): () => void {
  const unTab = editor.registerCommand<KeyboardEvent>(
    KEY_TAB_COMMAND,
    (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return false;
      const info = $getTableSelectionInfo();
      if (info === null) return false;
      const forward = !event.shiftKey;
      const edge = forward
        ? $cellAt(info.table, info.rect.maxRow, info.rect.maxCol)
        : $cellAt(info.table, info.rect.minRow, info.rect.minCol);
      if (edge === null) return false;
      event.preventDefault();
      const target = $adjacentCell(edge, forward ? "next" : "previous");
      if (target !== null) {
        target.selectEnd();
        return true;
      }
      if (forward) {
        const rows = $rowCount(info.table);
        $insertRow(info.table, rows - 1, "after");
        $cellAt(info.table, rows, 0)?.selectEnd();
        hooks.onRowAdded?.(info.table);
      } else {
        $leaveTable(info.table, "before");
      }
      return true;
    },
    COMMAND_PRIORITY_CRITICAL,
  );

  const unEscape = editor.registerCommand<KeyboardEvent>(
    KEY_ESCAPE_COMMAND,
    (event) => {
      const selection = $getSelection();
      if ($isTableSelection(selection) || !$isRangeSelection(selection)) return false;
      const info = $getTableSelectionInfo();
      if (info === null) return false;
      event.preventDefault();
      $leaveTable(info.table, "after");
      return true;
    },
    COMMAND_PRIORITY_CRITICAL,
  );

  return () => {
    unTab();
    unEscape();
  };
}

