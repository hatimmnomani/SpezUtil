import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot, type ElementNode } from "lexical";
import { exportHTML, importHTML } from "../html";
import { firstParagraphChildren, makeEditor, seedParagraph } from "../test-utils";
import { $createLudTextNode, $isLudTextNode, LudTextNode } from "./lud-text-node";

beforeEach(() => {
  document.body.innerHTML = "";
});

// Typed for the Al Kanz font: doubled letters and "}" stand for glyphs the font lacks.
const TYPED = "نسس ثثاك }";

describe("LudTextNode", () => {
  it("serializes to the fixed lud-text contract with the text exactly as typed", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode(TYPED, "al-kanz").toggleFormat("bold"));
    const json = editor.getEditorState().toJSON();
    const node = (json.root.children[0] as unknown as { children: unknown[] }).children[0];
    expect(node).toEqual({
      detail: 0,
      format: 1,
      mode: "normal",
      style: 'font-family: "AL-KANZ", "Noto Naskh Arabic";',
      text: TYPED,
      type: "lud-text",
      version: 1,
      ludFont: "al-kanz",
    });
  });

  it("round-trips through JSON without touching the text", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode(TYPED, "al-fatemi"));
    editor.setEditorState(editor.parseEditorState(JSON.stringify(editor.getEditorState().toJSON())));
    const [node] = firstParagraphChildren(editor);
    expect($isLudTextNode(node)).toBe(true);
    editor.getEditorState().read(() => {
      expect((node as LudTextNode).getLudFont()).toBe("al-fatemi");
      expect(node!.getTextContent()).toBe(TYPED);
    });
  });

  it("stores an invalid ludFont from JSON as unicode", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("x", "al-kanz"));
    // Style is swapped to the fallback family too, so the Task 3 sync transform agrees with "unicode".
    const json = JSON.stringify(editor.getEditorState().toJSON())
      .replace('"ludFont":"al-kanz"', '"ludFont":"\\" onmouseover=\\"x"')
      .replace('font-family: \\"AL-KANZ\\", \\"Noto Naskh Arabic\\";', 'font-family: \\"Noto Naskh Arabic\\";');
    editor.setEditorState(editor.parseEditorState(json));
    editor.getEditorState().read(() => {
      expect((firstParagraphChildren(editor)[0] as LudTextNode).getLudFont()).toBe("unicode");
    });
  });

  it("updateFromJSON sets the profile family when the JSON carries no font-family (final review I1)", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("x", "al-kanz"));
    for (const [style, expected] of [
      ["", 'font-family: "AL-KANZ", "Noto Naskh Arabic";'],
      ["color: red;", 'font-family: "AL-KANZ", "Noto Naskh Arabic"; color: red;'],
      ['font-family: "AL-KANZ", "Noto Naskh Arabic";', 'font-family: "AL-KANZ", "Noto Naskh Arabic";'],
      // A family that maps to another profile is kept verbatim here; lud-sync re-tags the node from it.
      ['font-family: "AL-FATEMI-Lisaan-ud-Dawat";', 'font-family: "AL-FATEMI-Lisaan-ud-Dawat";'],
    ]) {
      const state = editor.getEditorState().toJSON() as any;
      state.root.children[0].children[0].style = style;
      editor.setEditorState(editor.parseEditorState(JSON.stringify(state)));
      editor.getEditorState().read(() => {
        const node = firstParagraphChildren(editor)[0] as LudTextNode;
        expect($isLudTextNode(node)).toBe(true);
        expect(node.getStyle()).toBe(expected);
      });
    }
  });

  it("updateFromJSON writes no family for a profile this build does not know", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("x", "al-kanz"));
    const state = editor.getEditorState().toJSON() as any;
    Object.assign(state.root.children[0].children[0], { ludFont: "kanz-al-lulu", style: "" });
    editor.setEditorState(editor.parseEditorState(JSON.stringify(state)));
    editor.getEditorState().read(() => {
      const node = firstParagraphChildren(editor)[0] as LudTextNode;
      expect(node.getLudFont()).toBe("kanz-al-lulu");
      expect(node.getStyle()).toBe("");
    });
  });

  it("renders in the profile font and tags the DOM with data-lud-font", () => {
    const { editor, root } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode(TYPED, "al-kanz"));
    const span = root.querySelector<HTMLElement>("[data-lud-font]")!;
    expect(span.getAttribute("data-lud-font")).toBe("al-kanz");
    expect(span.style.fontFamily).toContain("AL-KANZ");
    expect(span.textContent).toBe(TYPED);
  });

  it("exports <span data-lud-font> and imports it back", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode(TYPED, "kanz-al-marjaan").toggleFormat("bold"));
    const html = exportHTML(editor);
    expect(html).toContain('data-lud-font="kanz-al-marjaan"');
    expect(html).toMatch(/<b><span data-lud-font="kanz-al-marjaan"[^>]*>نسس ثثاك }<\/span><\/b>/);

    importHTML(editor, html);
    editor.getEditorState().read(() => {
      const nodes = ($getRoot().getFirstChild() as ElementNode).getChildren();
      expect(nodes).toHaveLength(1);
      const node = nodes[0] as LudTextNode;
      expect($isLudTextNode(node)).toBe(true);
      expect(node.getLudFont()).toBe("kanz-al-marjaan");
      expect(node.getTextContent()).toBe(TYPED);
      expect(node.hasFormat("bold")).toBe(true);
    });
  });

  it("imports a hand-written span with an unknown valid id and keeps the id", () => {
    const { editor } = makeEditor();
    importHTML(editor, '<p><span data-lud-font="kanz-al-lulu">ككتاب</span></p>');
    editor.getEditorState().read(() => {
      const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
      expect(node.getLudFont()).toBe("kanz-al-lulu");
      expect(node.getTextContent()).toBe("ككتاب");
    });
  });
});
