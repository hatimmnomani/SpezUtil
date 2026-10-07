import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot, $getSelection, $isRangeSelection, type ElementNode, type TextNode } from "lexical";
import "./index";
import { $isLudTextNode, type LudTextNode } from "./nodes/lud-text-node";
import type { SpezRichtext } from "./richtext-editor";

if (typeof Range !== "undefined" && !Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON() {} }) as DOMRect;
}

function create(toolbar?: string): SpezRichtext {
  const el = document.createElement("spez-richtext");
  if (toolbar) el.setAttribute("toolbar", toolbar);
  document.body.appendChild(el);
  return el;
}

function flush(el: SpezRichtext) {
  el.editor.update(() => {}, { discrete: true });
}

function ludSelect(el: SpezRichtext): HTMLSelectElement {
  const s = el.querySelector<HTMLSelectElement>('.spez-rte-toolbar [data-group="lud"] select');
  expect(s, "lud select").not.toBeNull();
  return s!;
}

function choose(el: SpezRichtext, value: string) {
  const s = ludSelect(el);
  s.value = value;
  s.dispatchEvent(new Event("change"));
  flush(el);
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("LuD font picker", () => {
  it("is opt-in in the legacy layout: its toolbar is unchanged", () => {
    const el = document.createElement("spez-richtext");
    el.setAttribute("toolbar-layout", "legacy");
    document.body.appendChild(el);
    const groups = [...el.querySelectorAll(".spez-rte-group")].map((g) => g.getAttribute("data-group"));
    expect(groups).toEqual(["history", "block", "font", "inline", "color", "list", "indent", "align", "direction", "insert"]);
  });

  it("lists Al Kanz, Al-Fatemi, Kanz al-Marjaan and Unicode, marking drafts", () => {
    const el = create("lud");
    const options = [...ludSelect(el).options].map((o) => [o.value, o.textContent]);
    expect(options[0]).toEqual(["", "Default"]);
    expect(options.map((o) => o[0])).toEqual(["", "al-kanz", "al-fatemi", "kanz-al-marjaan", "unicode"]);
    expect(options[2]![1]).toContain("(draft)");
  });

  it("wraps the selection in lud-text without changing the text", () => {
    const el = create("lud");
    el.setHTML("<p>نسس ككتاب</p>");
    el.editor.update(
      () => {
        const t = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as TextNode;
        t.select(0, t.getTextContentSize());
      },
      { discrete: true },
    );
    choose(el, "al-kanz");
    el.editor.getEditorState().read(() => {
      const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild()!;
      expect($isLudTextNode(node)).toBe(true);
      expect((node as LudTextNode).getLudFont()).toBe("al-kanz");
      expect(node.getTextContent()).toBe("نسس ككتاب");
    });
    expect(ludSelect(el).value).toBe("al-kanz");
  });

  it("typing after choosing a font at a collapsed caret continues in that font", () => {
    const el = create("lud");
    el.setHTML("<p>abc</p>");
    el.editor.update(() => ($getRoot().getFirstChild() as ElementNode).selectEnd(), { discrete: true });
    choose(el, "kanz-al-marjaan");
    el.editor.update(
      () => {
        const s = $getSelection();
        if ($isRangeSelection(s)) s.insertText("ثثا");
      },
      { discrete: true },
    );
    el.editor.getEditorState().read(() => {
      const nodes = ($getRoot().getFirstChild() as ElementNode).getChildren();
      expect(nodes.map((n) => [n.getType(), n.getTextContent()])).toEqual([
        ["text", "abc"],
        ["lud-text", "ثثا"],
      ]);
    });
  });

  it("choosing None turns lud-text back into plain text", () => {
    const el = create("lud");
    el.setHTML('<p><span data-lud-font="al-kanz">ككتاب</span></p>');
    el.editor.update(
      () => {
        const t = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
        t.select(0, t.getTextContentSize());
      },
      { discrete: true },
    );
    choose(el, "");
    el.editor.getEditorState().read(() => {
      const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild()!;
      expect(node.getType()).toBe("text");
      expect(node.getTextContent()).toBe("ككتاب");
    });
  });
});
