import { beforeEach, describe, expect, it } from "vitest";
import { $isHeadingNode, HeadingNode } from "@lexical/rich-text";
import { $createParagraphNode, $createTextNode, $getRoot, $isParagraphNode, createEditor, type LexicalEditor } from "lexical";
import { exportHTML, importHTML } from "../html";
import { makeEditor } from "../test-utils";
import { $createAnchorHeadingNode, $isAnchorHeadingNode, AnchorHeadingNode, headingAnchorId } from "./heading-node";

beforeEach(() => {
  document.body.innerHTML = "";
});

function heading(extra: Record<string, unknown>, text = "Marahil Nizaam") {
  return {
    type: "heading", version: 1, direction: "ltr", format: "", indent: 0, tag: "h2",
    children: [{ type: "text", version: 1, text, format: 0, detail: 0, mode: "normal", style: "" }],
    ...extra,
  };
}

function load(editor: LexicalEditor, ...children: unknown[]): void {
  const state = { root: { type: "root", version: 1, direction: null, format: "", indent: 0, children } };
  editor.setEditorState(editor.parseEditorState(JSON.stringify(state)));
}

function saved(editor: LexicalEditor): any[] {
  return editor.getEditorState().toJSON().root.children as any[];
}

describe("AnchorHeadingNode", () => {
  it("round-trips `anchor` through JSON and renders it as the element id", () => {
    const { editor, root } = makeEditor();
    load(editor, heading({ anchor: "marahil-nizaam-2" }));
    const [h] = saved(editor);
    expect(h.type).toBe("heading");
    expect(h.anchor).toBe("marahil-nizaam-2");
    expect(root.querySelector("h2")!.id).toBe("marahil-nizaam-2");

    // A second load/save cycle is stable.
    load(editor, h);
    expect(saved(editor)[0]).toEqual(h);
  });

  it("adds no anchor key and no id when the document has none", () => {
    const { editor, root } = makeEditor();
    const input = heading({});
    load(editor, input);
    const [h] = saved(editor);
    expect("anchor" in h).toBe(false);
    expect(h).toEqual(input);
    // Byte-identical to what the stock HeadingNode saves for the same document.
    const stock = createEditor({ nodes: [HeadingNode], onError: (e) => { throw e; } });
    load(stock, input);
    expect(JSON.stringify(h)).toBe(JSON.stringify(saved(stock)[0]));
    expect(root.querySelector("h2")!.hasAttribute("id")).toBe(false);
  });

  it("drops a non-string or empty anchor instead of storing it", () => {
    const { editor } = makeEditor();
    load(editor, heading({ anchor: 42 }), heading({ anchor: "" }), heading({ anchor: null }));
    for (const h of saved(editor)) expect("anchor" in h).toBe(false);
  });

  it("keeps the stored anchor verbatim but sanitises the DOM id to a slug", () => {
    const { editor, root } = makeEditor();
    load(editor, heading({ anchor: 'Foo  Bar"><script>' }));
    expect(saved(editor)[0].anchor).toBe('Foo  Bar"><script>');
    expect(root.querySelector("h2")!.id).toBe("foo-bar-script");
    expect(root.querySelector("script")).toBeNull();
  });

  it("renders no id for an anchor with no slug characters", () => {
    const { editor, root } = makeEditor();
    load(editor, heading({ anchor: "مراحل" }));
    expect(saved(editor)[0].anchor).toBe("مراحل");
    expect(root.querySelector("h2")!.hasAttribute("id")).toBe(false);
  });

  it("headingAnchorId matches the handbook API's valid-slug rule", () => {
    expect(headingAnchorId("marahil-nizaam")).toBe("marahil-nizaam");
    expect(headingAnchorId("foo-2")).toBe("foo-2");
    expect(headingAnchorId("  Café Menu  ")).toBe("cafe-menu");
    expect(headingAnchorId("a--b__c")).toBe("a-b-c");
    expect(headingAnchorId("-x-")).toBe("x");
    expect(headingAnchorId("١٢٣")).toBeNull(); // Arabic-Indic digits are not ASCII
    expect(headingAnchorId("")).toBeNull();
    expect(headingAnchorId(undefined)).toBeNull();
    expect(headingAnchorId("a".repeat(200))).toHaveLength(160);
    expect(headingAnchorId(`${"a".repeat(159)}-b`)).toBe("a".repeat(159));
  });

  it("updates the DOM id when the anchor changes and removes it when cleared", () => {
    const { editor, root } = makeEditor();
    load(editor, heading({ anchor: "one" }));
    editor.update(() => ($getRoot().getFirstChild() as AnchorHeadingNode).setAnchor("two"), { discrete: true });
    expect(root.querySelector("h2")!.id).toBe("two");
    editor.update(() => ($getRoot().getFirstChild() as AnchorHeadingNode).setAnchor(null), { discrete: true });
    expect(root.querySelector("h2")!.hasAttribute("id")).toBe(false);
    expect("anchor" in saved(editor)[0]).toBe(false);
  });

  it("contributes no text: the heading's text content is its children only", () => {
    const { editor } = makeEditor();
    load(editor, heading({ anchor: "marahil-nizaam" }, "Marahil"));
    editor.getEditorState().read(() => {
      expect($getRoot().getTextContent()).toBe("Marahil");
      expect($getRoot().getFirstChild()!.getTextContent()).toBe("Marahil");
    });
  });

  it("is the class stock helpers see: $isHeadingNode, and <h2> import", () => {
    const { editor } = makeEditor();
    importHTML(editor, "<h2>Title</h2>");
    editor.getEditorState().read(() => {
      const first = $getRoot().getFirstChild();
      expect($isAnchorHeadingNode(first)).toBe(true);
      expect($isHeadingNode(first)).toBe(true);
      expect((first as AnchorHeadingNode).getAnchor()).toBeNull();
    });
  });

  it("exports the sanitised id in HTML", () => {
    const { editor } = makeEditor();
    load(editor, heading({ anchor: "marahil-nizaam" }));
    expect(exportHTML(editor)).toMatch(/<h2 id="marahil-nizaam"[^>]*>/);
  });

  it("does not copy the anchor onto the heading split off by Enter", () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        const h = $createAnchorHeadingNode("h2").setAnchor("intro");
        const text = $createTextNode("Intro text");
        $getRoot().clear().append(h.append(text));
        h.insertNewAfter(text.select(5, 5));
      },
      { discrete: true },
    );
    editor.getEditorState().read(() => {
      const [first, second] = $getRoot().getChildren();
      expect((first as AnchorHeadingNode).getAnchor()).toBe("intro");
      expect($isAnchorHeadingNode(second)).toBe(true);
      expect((second as AnchorHeadingNode).getAnchor()).toBeNull();
    });
  });

  it("collapsing an empty heading at start leaves a paragraph", () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        const h = $createAnchorHeadingNode("h3").setAnchor("x");
        $getRoot().clear().append(h, $createParagraphNode());
        h.collapseAtStart();
      },
      { discrete: true },
    );
    editor.getEditorState().read(() => expect($isParagraphNode($getRoot().getFirstChild())).toBe(true));
  });
});
