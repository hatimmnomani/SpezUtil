import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot, $isElementNode } from "lexical";
import { createEditorInstance } from "./editor";
import { detectDirection, SET_DIRECTION_COMMAND } from "./direction";
import { importHTML } from "./html";

function makeEditor() {
  const rootEl = document.createElement("div");
  rootEl.contentEditable = "true";
  document.body.appendChild(rootEl);
  return createEditorInstance(rootEl);
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("detectDirection", () => {
  it("detects Arabic as rtl", () => {
    expect(detectDirection("بسم الله")).toBe("rtl");
  });
  it("detects Latin as ltr", () => {
    expect(detectDirection("Hello")).toBe("ltr");
  });
  it("returns null for neutral text", () => {
    expect(detectDirection("123 ...")).toBeNull();
  });
  it("uses the first strong character", () => {
    expect(detectDirection("12 بسم then latin")).toBe("rtl");
  });
});

describe("auto-direction transform", () => {
  it("sets rtl on Arabic paragraphs imported from HTML", () => {
    const { editor } = makeEditor();
    importHTML(editor, "<p>السلام عليكم</p><p>Hello world</p>");
    const dirs = editor.getEditorState().read(() =>
      $getRoot()
        .getChildren()
        .filter($isElementNode)
        .map((n) => n.getDirection()),
    );
    expect(dirs).toEqual(["rtl", "ltr"]);
  });
});

describe("SET_DIRECTION_COMMAND", () => {
  it("sets explicit direction on the selected block", () => {
    const { editor } = makeEditor();
    importHTML(editor, "<p>Hello</p>");
    editor.update(
      () => {
        $getRoot().getFirstChild()!.selectStart();
      },
      { discrete: true },
    );
    editor.dispatchCommand(SET_DIRECTION_COMMAND, "rtl");
    // Flush the batched update before reading state.
    editor.update(() => {}, { discrete: true });
    const dir = editor
      .getEditorState()
      .read(() => {
        const first = $getRoot().getFirstChild();
        return $isElementNode(first) ? first.getDirection() : null;
      });
    expect(dir).toBe("rtl");
  });
});
