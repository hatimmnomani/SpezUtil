import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot, $selectAll } from "lexical";
import { $isHeadingNode } from "@lexical/rich-text";
import "./index";
import { $isAyatNode } from "./nodes/ayat-node";
import type { SpezRichtext } from "./richtext-editor";

function create(attrs: Record<string, string> = {}): SpezRichtext {
  const el = document.createElement("spez-richtext");
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  document.body.appendChild(el);
  return el;
}

function clickButton(el: SpezRichtext, title: string): void {
  const btn = [...el.querySelectorAll<HTMLButtonElement>(".spez-rte-toolbar button")].find(
    (b) => b.title === title,
  );
  expect(btn, `toolbar button "${title}"`).toBeDefined();
  btn!.click();
  flush(el);
}

/** Flush Lexical's batched update before reading state. */
function flush(el: SpezRichtext): void {
  el.editor.update(() => {}, { discrete: true });
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("toolbar", () => {
  it("bold button applies bold to the selection", () => {
    const el = create();
    el.setHTML("<p>hello</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    clickButton(el, "Bold");
    const hasBold = el.editor.getEditorState().read(() => {
      const text = $getRoot().getAllTextNodes()[0]!;
      return text.hasFormat("bold");
    });
    expect(hasBold).toBe(true);
  });

  it("block select turns the paragraph into a heading", () => {
    const el = create();
    el.setHTML("<p>title</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    const select = el.querySelector<HTMLSelectElement>(".spez-rte-toolbar select")!;
    select.value = "h2";
    select.dispatchEvent(new Event("change"));
    flush(el);
    el.editor.getEditorState().read(() => {
      const first = $getRoot().getFirstChild();
      expect($isHeadingNode(first)).toBe(true);
    });
  });

  it("ayat insert button wraps the block in an AyatNode", () => {
    const el = create();
    el.setHTML("<p>بسم الله</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    clickButton(el, "Ayat block");
    el.editor.getEditorState().read(() => {
      expect($isAyatNode($getRoot().getFirstChild())).toBe(true);
    });
  });

  it("undo button starts disabled", () => {
    const el = create();
    const undo = [...el.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => b.title === "Undo",
    )!;
    expect(undo.disabled).toBe(true);
  });

  it("uses Arabic labels for locale=ar", () => {
    const el = create({ locale: "ar" });
    const bold = [...el.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => b.textContent === "B",
    )!;
    expect(bold.title).toBe("غامق");
  });
});
