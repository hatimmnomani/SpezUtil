import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  DELETE_CHARACTER_COMMAND,
  type ElementNode,
  type LexicalEditor,
  type PointType,
} from "lexical";
import {
  $createTableSelectionFrom,
  $findTableNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  type TableCellNode,
  type TableNode,
} from "@lexical/table";

function $firstCell(table: TableNode): TableCellNode | null {
  const row = table.getFirstChild();
  const cell = $isTableRowNode(row) ? row.getFirstChild() : null;
  return $isTableCellNode(cell) ? cell : null;
}

function $lastCell(table: TableNode): TableCellNode | null {
  const row = table.getLastChild();
  const cell = $isTableRowNode(row) ? row.getLastChild() : null;
  return $isTableCellNode(cell) ? cell : null;
}

function $isAtStartOf(element: ElementNode, point: PointType): boolean {
  if (point.offset !== 0) return false;
  const target = point.getNode();
  if (target.is(element)) return true;
  const first = element.getFirstDescendant();
  return first !== null && first.is(target);
}

function $isAtEndOf(element: ElementNode, point: PointType): boolean {
  const target = point.getNode();
  if (target.is(element)) return point.offset === element.getChildrenSize();
  const last = element.getLastDescendant();
  if (last === null || !last.is(target)) return false;
  return point.offset === target.getTextContentSize();
}

/** Highlights every cell; Lexical's table handler removes the table on the next delete. */
function $selectWholeTable(table: TableNode): boolean {
  const first = $firstCell(table);
  const last = $lastCell(table);
  if (first === null || last === null) return false;
  $setSelection($createTableSelectionFrom(table, first, last));
  return true;
}

/** Removes the table, placing the caret where the deletion was heading. */
function $removeTable(table: TableNode, isBackward: boolean): void {
  const toward = isBackward ? table.getPreviousSibling() : table.getNextSibling();
  const away = isBackward ? table.getNextSibling() : table.getPreviousSibling();
  if (toward !== null) {
    if (isBackward) toward.selectEnd();
    else toward.selectStart();
  } else if (away !== null) {
    if (isBackward) away.selectStart();
    else away.selectEnd();
  } else {
    const paragraph = $createParagraphNode();
    table.insertAfter(paragraph);
    paragraph.select();
  }
  table.remove();
}

/**
 * Keyboard removal of tables. Lexical treats table cells as shadow roots, so
 * out of the box backspace/delete can never cross the table boundary: the
 * only way to remove a table is dragging a selection over every cell.
 * - backspace at the start of the first cell (or forward delete at the end
 *   of the last cell) removes an empty table, or selects a non-empty one
 * - backspace at the start of the block after a table (or forward delete at
 *   the end of the block before one) selects the table instead of merging
 * A whole-table selection is then deleted by @lexical/table's own handler.
 */
export function registerTableDeletion(editor: LexicalEditor): () => void {
  return editor.registerCommand<boolean>(
    DELETE_CHARACTER_COMMAND,
    (isBackward) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
      const anchor = selection.anchor;
      const node = anchor.getNode();
      const table = $findTableNode(node);

      if (table !== null) {
        const edgeCell = isBackward ? $firstCell(table) : $lastCell(table);
        if (edgeCell === null || !(edgeCell.is(node) || edgeCell.isParentOf(node))) return false;
        const atEdge = isBackward ? $isAtStartOf(edgeCell, anchor) : $isAtEndOf(edgeCell, anchor);
        if (!atEdge) return false;
        if (table.getTextContent().trim() === "") {
          $removeTable(table, isBackward);
          return true;
        }
        return $selectWholeTable(table);
      }

      const top = node.getTopLevelElement();
      if (top === null) return false;
      const atEdge = isBackward ? $isAtStartOf(top, anchor) : $isAtEndOf(top, anchor);
      if (!atEdge) return false;
      const neighbour = isBackward ? top.getPreviousSibling() : top.getNextSibling();
      if (!$isTableNode(neighbour)) return false;
      return $selectWholeTable(neighbour);
    },
    COMMAND_PRIORITY_LOW,
  );
}
