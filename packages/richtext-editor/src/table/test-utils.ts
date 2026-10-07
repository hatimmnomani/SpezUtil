import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalEditor,
} from "lexical";
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  INSERT_TABLE_COMMAND,
  type TableNode,
} from "@lexical/table";
import { createEditorInstance } from "../editor";

/** Test helper: an editor with one empty paragraph, mounted in jsdom. */
export function makeEditor(): LexicalEditor {
  const rootEl = document.createElement("div");
  rootEl.contentEditable = "true";
  document.body.appendChild(rootEl);
  const { editor } = createEditorInstance(rootEl);
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      $getRoot().clear().append(paragraph);
      paragraph.select();
    },
    { discrete: true },
  );
  return editor;
}

/** Runs `fn` as a discrete update so the result is committed (and transforms have run) on return. */
export function update<T>(editor: LexicalEditor, fn: () => T): T {
  let result!: T;
  editor.update(
    () => {
      result = fn();
    },
    { discrete: true },
  );
  return result;
}

export function read<T>(editor: LexicalEditor, fn: () => T): T {
  return editor.getEditorState().read(fn);
}

export function $firstTable(): TableNode {
  const table = $getRoot().getChildren().find($isTableNode);
  if (!table) throw new Error("no table");
  return table;
}

/** Inserts a rows x cols table and writes "r{row}c{col}" into every cell. */
export function insertFilledTable(
  editor: LexicalEditor,
  rows: number,
  cols: number,
  headers: boolean | { rows: boolean; columns: boolean } = false,
): void {
  editor.dispatchCommand(INSERT_TABLE_COMMAND, {
    rows: String(rows),
    columns: String(cols),
    includeHeaders: headers,
  });
  update(editor, () => {
    const table = $firstTable();
    table.getChildren().forEach((row, r) => {
      if (!$isTableRowNode(row)) return;
      row.getChildren().forEach((cell, c) => {
        if (!$isTableCellNode(cell)) return;
        const p = cell.getFirstChild();
        if (p && "append" in p) (p as unknown as { append: (n: unknown) => void }).append($createTextNode(`r${r}c${c}`));
      });
    });
  });
}

/** Text of every cell, row by row (merged cells show once, where they start in DOM order). */
export function grid(editor: LexicalEditor): string[][] {
  return read(editor, () =>
    $firstTable()
      .getChildren()
      .filter($isTableRowNode)
      .map((row) => row.getChildren().filter($isTableCellNode).map((c) => c.getTextContent())),
  );
}

/** Every row of the logical grid is the same width once spans are counted. */
export function isConsistent(editor: LexicalEditor): boolean {
  return read(editor, () => {
    const table = $firstTable();
    const rows = table.getChildren().filter($isTableRowNode);
    const widths = new Array<number>(rows.length).fill(0);
    rows.forEach((row, r) => {
      for (const cell of row.getChildren()) {
        if (!$isTableCellNode(cell)) continue;
        for (let dr = 0; dr < cell.getRowSpan(); dr++) {
          if (r + dr < rows.length) widths[r + dr]! += cell.getColSpan();
        }
      }
    });
    return widths.every((w) => w === widths[0]);
  });
}
