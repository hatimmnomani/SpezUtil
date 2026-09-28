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
import "./index";
import type { SpezRichtext } from "./richtext-editor";

beforeEach(() => {
  document.body.innerHTML = "";
});

/** Serialised paragraph children, the shape a stored document (or the backend) hands `parseEditorState`. */
function documentWith(children: object[]): string {
  return JSON.stringify({
    root: {
      type: "root", version: 1, direction: null, format: "", indent: 0,
      children: [{ type: "paragraph", version: 1, direction: null, format: "", indent: 0, children }],
    },
  });
}

const storedLud = (ludFont: string, style: string, text = "ككتاب") => ({
  type: "lud-text", version: 1, ludFont, text, detail: 0, format: 0, mode: "normal", style,
});

/** Loads a stored document and then dirties every leaf, as the first keystroke after load would. */
function loadAndTouch(editor: ReturnType<typeof makeEditor>["editor"], json: string): void {
  editor.setEditorState(editor.parseEditorState(json));
  editor.update(
    () => {
      for (const node of ($getRoot().getFirstChild() as ElementNode).getChildren()) node.markDirty();
    },
    { discrete: true },
  );
}

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

  describe("stored documents (final review I1)", () => {
    const styleOf = (editor: ReturnType<typeof makeEditor>["editor"]) =>
      editor.getEditorState().read(() => (firstParagraphChildren(editor)[0] as LudTextNode).getStyle());

    it("leaves a stored node whose profile this build does not know untouched", () => {
      const { editor } = makeEditor();
      const style = 'font-family: "Kanz al-Lulu", "Noto Naskh Arabic";';
      loadAndTouch(editor, documentWith([storedLud("kanz-al-lulu", style)]));
      expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "ككتاب", ludFont: "kanz-al-lulu" }]);
      expect(styleOf(editor)).toBe(style);
    });

    it("leaves an unknown profile with no style untouched too (no fallback family is written)", () => {
      const { editor } = makeEditor();
      loadAndTouch(editor, documentWith([storedLud("kanz-al-lulu", "")]));
      expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "ككتاب", ludFont: "kanz-al-lulu" }]);
      expect(styleOf(editor)).toBe("");
    });

    it("restores the profile family for a stored node with an empty style instead of demoting it", () => {
      const { editor } = makeEditor();
      loadAndTouch(editor, documentWith([storedLud("al-kanz", "")]));
      expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "ككتاب", ludFont: "al-kanz" }]);
      expect(styleOf(editor)).toBe('font-family: "AL-KANZ", "Noto Naskh Arabic";');
    });

    it("restores the fallback family for stored unicode text with an empty style", () => {
      const { editor } = makeEditor();
      loadAndTouch(editor, documentWith([storedLud("unicode", "")]));
      expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "ككتاب", ludFont: "unicode" }]);
      expect(styleOf(editor)).toBe('font-family: "Noto Naskh Arabic";');
    });

    it("keeps other style properties when it restores the family", () => {
      const { editor } = makeEditor();
      loadAndTouch(editor, documentWith([storedLud("al-kanz", "color: red;")]));
      expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "ككتاب", ludFont: "al-kanz" }]);
      expect(styleOf(editor)).toContain('font-family: "AL-KANZ", "Noto Naskh Arabic";');
      expect(styleOf(editor)).toContain("color: red;");
    });

    it("keeps a stored node whose style already carries its profile family (control)", () => {
      const { editor } = makeEditor();
      loadAndTouch(editor, documentWith([storedLud("al-kanz", 'font-family: "AL-KANZ", "Noto Naskh Arabic";')]));
      expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "ككتاب", ludFont: "al-kanz" }]);
    });

    it("still demotes a known profile whose family the user replaced with a non-LuD font", () => {
      const { editor } = makeEditor();
      loadAndTouch(editor, documentWith([storedLud("al-kanz", "font-family: Arial;")]));
      expect(describeNodes(editor)).toEqual([{ type: "text", text: "ككتاب", ludFont: null }]);
    });

    it("survives the element's value setter and the next edit (setValue → edit → getJSON)", () => {
      const el = document.createElement("spez-richtext") as SpezRichtext;
      document.body.appendChild(el);
      el.value = documentWith([storedLud("kanz-al-lulu", 'font-family: "Kanz al-Lulu";'), storedLud("al-kanz", "")]);
      // A keystroke inside the first node: the caret's style mirrors the node's, as it does in the browser.
      el.editor.update(
        () => {
          const first = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
          const selection = first.select(2, 2);
          selection.style = first.getStyle();
          selection.insertText("x");
        },
        { discrete: true },
      );
      const children = JSON.parse(el.getJSON()).root.children[0].children as Array<Record<string, unknown>>;
      expect(children.map((c) => [c.type, c.ludFont])).toEqual([
        ["lud-text", "kanz-al-lulu"],
        ["lud-text", "al-kanz"],
      ]);
      expect(children[0]!.text).toBe("ككxتاب");
      expect(children[1]!.style).toBe('font-family: "AL-KANZ", "Noto Naskh Arabic";');
    });
  });
});
