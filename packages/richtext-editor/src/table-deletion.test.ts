import { beforeEach, describe, expect, it } from "vitest";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  type LexicalEditor,
} from "lexical";
import {
  $isTableCellNode,
  $isTableNode,
  $isTableSelection,
  INSERT_TABLE_COMMAND,
  type TableNode,
} from "@lexical/table";
import { createEditorInstance } from "./editor";

function makeEditor(): LexicalEditor {
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
  editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: "2", columns: "2" });
  editor.update(() => {}, { discrete: true });
  return editor;
}

function press(editor: LexicalEditor, key: "Backspace" | "Delete") {
  const event = new KeyboardEvent("keydown", { key, cancelable: true });
  editor.dispatchCommand(key === "Backspace" ? KEY_BACKSPACE_COMMAND : KEY_DELETE_COMMAND, event);
  editor.update(() => {}, { discrete: true });
}

function $table(): TableNode {
  return $getRoot().getChildren().find($isTableNode)!;
}

function select(editor: LexicalEditor, fn: () => void) {
  editor.update(fn, { discrete: true });
}

function hasTable(editor: LexicalEditor): boolean {
  return editor.getEditorState().read(() => $getRoot().getChildren().some($isTableNode));
}

function isWholeTableSelected(editor: LexicalEditor): boolean {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isTableSelection(selection)) return false;
    const cells = selection.getNodes().filter($isTableCellNode);
    return cells.length === $table().getChildren().length * 2;
  });
}

function fillFirstCell(editor: LexicalEditor, text = "x") {
  select(editor, () => {
    const cell = $table().getFirstDescendant()!.getParent()!;
    const paragraph = cell.getFirstChild()!;
    if ($isParagraphNode(paragraph)) paragraph.append($createTextNode(text));
  });
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("table block deletion", () => {
  it("backspace at the start of the first cell removes an empty table", () => {
    const editor = makeEditor();
    select(editor, () => $table().getFirstDescendant()!.selectStart());
    press(editor, "Backspace");
    expect(hasTable(editor)).toBe(false);
  });

  it("backspace at the start of the first cell of a non-empty table selects the whole table, then deletes it", () => {
    const editor = makeEditor();
    fillFirstCell(editor);
    select(editor, () => $table().getFirstDescendant()!.selectStart());
    press(editor, "Backspace");
    expect(hasTable(editor)).toBe(true);
    expect(isWholeTableSelected(editor)).toBe(true);
    press(editor, "Backspace");
    expect(hasTable(editor)).toBe(false);
  });

  it("delete at the end of the last cell removes an empty table", () => {
    const editor = makeEditor();
    select(editor, () => $table().getLastDescendant()!.selectEnd());
    press(editor, "Delete");
    expect(hasTable(editor)).toBe(false);
  });

  it("backspace at the start of the block after a table selects the table instead of eating the line", () => {
    const editor = makeEditor();
    select(editor, () => $getRoot().getLastChild()!.selectStart());
    press(editor, "Backspace");
    expect(isWholeTableSelected(editor)).toBe(true);
    editor.getEditorState().read(() => {
      expect($isParagraphNode($getRoot().getLastChild())).toBe(true);
    });
    press(editor, "Backspace");
    expect(hasTable(editor)).toBe(false);
  });

  it("delete at the end of the block before a table selects the table", () => {
    const editor = makeEditor();
    select(editor, () => $getRoot().getFirstChild()!.selectEnd());
    press(editor, "Delete");
    expect(isWholeTableSelected(editor)).toBe(true);
    press(editor, "Delete");
    expect(hasTable(editor)).toBe(false);
  });

  // (Actual character deletion needs Selection.modify, which jsdom lacks.)
  it("backspace mid-cell is left to normal character deletion", () => {
    const editor = makeEditor();
    fillFirstCell(editor, "ab");
    select(editor, () => $table().getFirstDescendant()!.selectEnd());
    press(editor, "Backspace");
    expect(hasTable(editor)).toBe(true);
    expect(isWholeTableSelected(editor)).toBe(false);
  });

  it("backspace at the start of a non-first cell does not select the table", () => {
    const editor = makeEditor();
    select(editor, () => $table().getLastDescendant()!.selectStart());
    press(editor, "Backspace");
    expect(hasTable(editor)).toBe(true);
    expect(isWholeTableSelected(editor)).toBe(false);
  });
});
