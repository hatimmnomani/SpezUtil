import { beforeEach, describe, expect, it } from "vitest";
import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  type ElementNode,
} from "lexical";
import { $patchStyleText } from "@lexical/selection";
import { importHTML } from "./html";
import { $createLudTextNode, $isLudTextNode, type LudTextNode } from "./nodes/lud-text-node";
import { firstParagraphChildren, makeEditor, seedParagraph } from "./test-utils";

beforeEach(() => {
  document.body.innerHTML = "";
});

function describeNodes(editor: ReturnType<typeof makeEditor>["editor"]) {
  return editor.getEditorState().read(() =>
    firstParagraphChildren(editor).map((n) => ({
      type: n.getType(),
      text: n.getTextContent(),
      ludFont: $isLudTextNode(n) ? n.getLudFont() : null,
    })),
  );
}

describe("lud sync", () => {
  it("turns Google-Docs pasted AL-KANZ text into lud-text, byte-identical", () => {
    const { editor } = makeEditor();
    importHTML(
      editor,
      '<b style="font-weight:normal" id="docs-internal-guid-1"><p dir="rtl"><span style="font-family:\'AL-KANZ\';font-size:14pt">نسس }حح ظظ</span><span style="font-family:Arial"> ok</span></p></b>',
    );
    expect(describeNodes(editor)).toEqual([
      { type: "lud-text", text: "نسس }حح ظظ", ludFont: "al-kanz" },
      { type: "text", text: " ok", ludFont: null },
    ]);
  });

  it("tags pasted Noto Naskh Arabic (proper Unicode Urdu) as unicode", () => {
    const { editor } = makeEditor();
    importHTML(editor, '<p><span style="font-family:\'Noto Naskh Arabic\'">حاضرین</span></p>');
    expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "حاضرین", ludFont: "unicode" }]);
  });

  it("keeps both halves as lud-text when Lexical splits the node", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("ثثاك طط", "al-kanz"));
    editor.update(
      () => {
        const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
        node.splitText(3);
      },
      { discrete: true },
    );
    expect(describeNodes(editor)).toEqual([
      { type: "lud-text", text: "ثثا", ludFont: "al-kanz" },
      { type: "lud-text", text: "ك طط", ludFont: "al-kanz" },
    ]);
  });

  it("reverts lud-text to text when its font-family is cleared", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("ككتاب", "al-kanz"));
    editor.update(
      () => {
        const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
        node.select(0, node.getTextContentSize());
        const selection = $getSelection();
        if ($isRangeSelection(selection)) $patchStyleText(selection, { "font-family": null });
      },
      { discrete: true },
    );
    expect(describeNodes(editor)).toEqual([{ type: "text", text: "ككتاب", ludFont: null }]);
  });

  it("re-fonts lud-text when another LuD family is applied", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("ككتاب", "al-kanz"));
    editor.update(
      () => {
        const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
        node.setStyle('font-family: "AL-FATEMI-Lisaan-ud-Dawat";');
      },
      { discrete: true },
    );
    expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "ككتاب", ludFont: "al-fatemi" }]);
  });

  it("keeps the caret offset when a node is replaced", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createTextNode("abcdef"));
    editor.update(
      () => {
        const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild()!;
        if ($isTextNode(node)) {
          node.select(4, 4);
          node.setStyle('font-family: "AL-KANZ";');
        }
      },
      { discrete: true },
    );
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) throw new Error("expected range selection");
      expect($isLudTextNode(selection.anchor.getNode())).toBe(true);
      expect(selection.anchor.offset).toBe(4);
    });
  });

  it("leaves a valid unregistered ludFont alone", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("x", "kanz-al-lulu"));
    expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "x", ludFont: "kanz-al-lulu" }]);
  });

  it("removes an emptied lud-text node without leaving a dangling selection", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("x", "al-kanz"));
    expect(() => {
      editor.update(
        () => {
          const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
          node.select(0, node.getTextContentSize());
          const selection = $getSelection();
          if ($isRangeSelection(selection)) selection.removeText();
        },
        { discrete: true },
      );
    }).not.toThrow();
    editor.getEditorState().read(() => {
      expect(describeNodes(editor)).toEqual([]);
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) throw new Error("expected range selection");
      expect(selection.anchor.getNode().isAttached()).toBe(true);
    });
  });
});
