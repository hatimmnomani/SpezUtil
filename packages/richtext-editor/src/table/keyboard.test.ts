import { beforeEach, describe, expect, it } from "vitest";
import {
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
} from "lexical";
import { $isTableSelection } from "@lexical/table";
import { $adjacentCell } from "./keyboard";
import { $cellAt, $getTableSelectionInfo, $selectRect, $selectWholeTable } from "./model";
import { $firstTable, grid, insertFilledTable, makeEditor, read, update } from "./test-utils";

beforeEach(() => {
  document.body.innerHTML = "";
});

function key(editor: LexicalEditor, command: typeof KEY_TAB_COMMAND, init: KeyboardEventInit & { key: string }) {
  const event = new KeyboardEvent("keydown", { cancelable: true, ...init });
  editor.dispatchCommand(command, event);
  editor.update(() => {}, { discrete: true });
  return event;
}
const tab = (e: LexicalEditor, shift = false) => key(e, KEY_TAB_COMMAND, { key: "Tab", shiftKey: shift });

function caret(editor: LexicalEditor): { row: number; col: number } | null {
  return read(editor, () => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return null;
    const info = $getTableSelectionInfo();
    return info ? { row: info.rect.minRow, col: info.rect.minCol } : null;
  });
}

function setup(rows = 2, cols = 3) {
  const editor = makeEditor();
  insertFilledTable(editor, rows, cols);
  return editor;
}

describe("Tab navigation", () => {
  it("moves to the next cell, wrapping to the next row", () => {
    const editor = setup();
    update(editor, () => $cellAt($firstTable(), 0, 1)!.selectEnd());
    tab(editor);
    expect(caret(editor)).toEqual({ row: 0, col: 2 });
    tab(editor);
    expect(caret(editor)).toEqual({ row: 1, col: 0 });
  });

  it("Shift+Tab moves back, wrapping to the previous row", () => {
    const editor = setup();
    update(editor, () => $cellAt($firstTable(), 1, 0)!.selectEnd());
    tab(editor, true);
    expect(caret(editor)).toEqual({ row: 0, col: 2 });
    tab(editor, true);
    expect(caret(editor)).toEqual({ row: 0, col: 1 });
  });

  it("Tab in the last cell adds a row and lands in its first cell", () => {
    const editor = setup(2, 3);
    update(editor, () => $cellAt($firstTable(), 1, 2)!.selectEnd());
    const event = tab(editor);
    expect(event.defaultPrevented).toBe(true);
    expect(grid(editor)).toHaveLength(3);
    expect(grid(editor)[2]).toEqual(["", "", ""]);
    expect(caret(editor)).toEqual({ row: 2, col: 0 });
  });

  it("keeps adding rows on repeated Tab at the end", () => {
    const editor = setup(1, 1);
    update(editor, () => $cellAt($firstTable(), 0, 0)!.selectEnd());
    tab(editor);
    tab(editor);
    expect(grid(editor)).toHaveLength(3);
  });

  it("Shift+Tab in the first cell leaves the table backwards instead of trapping focus", () => {
    const editor = setup();
    update(editor, () => $cellAt($firstTable(), 0, 0)!.selectEnd());
    tab(editor, true);
    expect(grid(editor)).toHaveLength(2);
    expect(read(editor, () => $getTableSelectionInfo())).toBeNull();
    read(editor, () => expect($isParagraphNode($getRoot().getFirstChild())).toBe(true));
  });

  it("Tab from a multi-cell selection continues after the selection's last cell", () => {
    const editor = setup(3, 3);
    update(editor, () => $selectRect($firstTable(), { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 }));
    tab(editor);
    expect(caret(editor)).toEqual({ row: 0, col: 2 });
  });

  it("leaves Tab outside a table to the indentation handler", () => {
    const editor = makeEditor();
    // Not swallowed by the table handler: the editor's indent command still runs (and prevents default).
    expect(tab(editor).defaultPrevented).toBe(true);
    expect(read(editor, () => $getTableSelectionInfo())).toBeNull();
  });

  it("walks cells in reading order across a merged cell", () => {
    const editor = setup(2, 3);
    update(editor, () => {
      $selectRect($firstTable(), { minRow: 0, maxRow: 1, minCol: 0, maxCol: 0 });
      const info = $getTableSelectionInfo()!;
      info.cells[0]!.getParent();
    });
    const order = read(editor, () => {
      const t = $firstTable();
      const seen: string[] = [];
      let cell = $cellAt(t, 0, 0);
      while (cell) {
        seen.push(cell.getTextContent());
        cell = $adjacentCell(cell, "next");
      }
      return seen;
    });
    expect(order).toEqual(["r0c0", "r0c1", "r0c2", "r1c0", "r1c1", "r1c2"]);
  });
});

describe("Escape", () => {
  it("steps from a caret in a cell to the block after the table", () => {
    const editor = setup();
    update(editor, () => $cellAt($firstTable(), 0, 1)!.selectEnd());
    const event = key(editor, KEY_ESCAPE_COMMAND, { key: "Escape" });
    expect(event.defaultPrevented).toBe(true);
    expect(read(editor, () => $getTableSelectionInfo())).toBeNull();
    read(editor, () => {
      const sel = $getSelection();
      expect($isRangeSelection(sel)).toBe(true);
    });
  });

  it("creates a paragraph when the table ends the document", () => {
    const editor = setup();
    update(editor, () => {
      const last = $getRoot().getLastChild();
      if ($isParagraphNode(last)) last.remove();
      $cellAt($firstTable(), 0, 0)!.selectEnd();
    });
    key(editor, KEY_ESCAPE_COMMAND, { key: "Escape" });
    read(editor, () => {
      expect($isParagraphNode($getRoot().getLastChild())).toBe(true);
      expect($getTableSelectionInfo()).toBeNull();
    });
  });

  it("leaves a multi-cell selection to collapse into its cell first", () => {
    const editor = setup(3, 3);
    update(editor, () => $selectRect($firstTable(), { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 }));
    key(editor, KEY_ESCAPE_COMMAND, { key: "Escape" });
    // Still inside the table: the first Escape only collapses the range.
    expect(read(editor, () => $getTableSelectionInfo())).not.toBeNull();
  });

  it("ignores Escape outside a table", () => {
    const editor = makeEditor();
    expect(key(editor, KEY_ESCAPE_COMMAND, { key: "Escape" }).defaultPrevented).toBe(false);
  });
});

describe("Backspace and Delete over a cell range", () => {
  it("clears the selected cells' content and keeps the table", () => {
    const editor = setup(3, 3);
    update(editor, () => $selectRect($firstTable(), { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 }));
    key(editor, KEY_BACKSPACE_COMMAND, { key: "Backspace" });
    expect(grid(editor)).toEqual([
      ["", "", "r0c2"],
      ["", "", "r1c2"],
      ["r2c0", "r2c1", "r2c2"],
    ]);
  });

  it("Delete does the same", () => {
    const editor = setup(2, 2);
    update(editor, () => $selectRect($firstTable(), { minRow: 1, maxRow: 1, minCol: 0, maxCol: 1 }));
    key(editor, KEY_DELETE_COMMAND, { key: "Delete" });
    expect(grid(editor)).toEqual([["r0c0", "r0c1"], ["", ""]]);
  });
});
