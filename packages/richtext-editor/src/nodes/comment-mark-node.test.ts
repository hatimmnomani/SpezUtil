import { beforeEach, describe, expect, it } from "vitest";
import { $createTextNode, $getRoot, type ElementNode } from "lexical";
import { exportHTML, importHTML } from "../html";
import { makeEditor, seedParagraph } from "../test-utils";
import { $createCommentMarkNode, $isCommentMarkNode, type CommentMarkNode } from "./comment-mark-node";

const A = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
const B = "01J9ZX3M4Q8R2S5T7V9W0XYZAC";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("CommentMarkNode", () => {
  it("serializes as comment-mark with ids and children", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createTextNode("Students must "), () =>
      $createCommentMarkNode([A]).append($createTextNode("attend daily")),
    );
    const para = editor.getEditorState().toJSON().root.children[0] as unknown as { children: any[] };
    expect(para.children[1]).toEqual({
      children: [expect.objectContaining({ type: "text", text: "attend daily" })],
      direction: null,
      format: "",
      indent: 0,
      type: "comment-mark",
      version: 1,
      ids: [A],
    });
  });

  it("loads the backend's minimal re-anchor mark (no format/indent/direction)", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createTextNode("attend daily"));
    const state = editor.getEditorState().toJSON() as any;
    const text = state.root.children[0].children[0];
    state.root.children[0].children = [{ type: "comment-mark", version: 1, ids: [A], children: [text] }];
    editor.setEditorState(editor.parseEditorState(JSON.stringify(state)));
    const again = editor.getEditorState().toJSON() as any;
    expect(again.root.children[0].children[0]).toMatchObject({ type: "comment-mark", ids: [A], format: "", indent: 0 });
  });

  it("renders a highlightable <mark> carrying the thread ids", () => {
    const { editor, root } = makeEditor();
    seedParagraph(editor, () => $createCommentMarkNode([A, B]).append($createTextNode("x")));
    const mark = root.querySelector("mark.spez-rte-comment")!;
    expect(mark.getAttribute("data-thread-ids")).toBe(`${A} ${B}`);
    editor.update(
      () => {
        const m = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as CommentMarkNode;
        m.deleteID(B);
      },
      { discrete: true },
    );
    expect(root.querySelector("mark.spez-rte-comment")!.getAttribute("data-thread-ids")).toBe(A);
  });

  // Ruling F1 (progress.md): MarkNode.excludeFromCopy('html') is inherited and NOT overridden —
  // getHTML() flattens every comment mark (ids are never carried into HTML; this is what stops
  // copy/paste from duplicating a thread id). `<span data-thread-ids>` is therefore import-only:
  // it re-anchors a mark arriving from outside the editor, never something getHTML() emits.
  it("flattens the mark on export (ids never reach HTML)", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createCommentMarkNode([A]).append($createTextNode("marked")));
    const html = exportHTML(editor);
    expect(html).not.toContain("<mark");
    expect(html).not.toContain("data-thread-ids");
    expect(html).toContain("marked");
  });

  it("imports <span data-thread-ids> as a re-anchored mark", () => {
    const { editor } = makeEditor();
    importHTML(editor, `<p><span data-thread-ids="${A}">marked</span></p>`);
    editor.getEditorState().read(() => {
      const m = ($getRoot().getFirstChild() as ElementNode).getFirstChild();
      expect($isCommentMarkNode(m)).toBe(true);
      expect((m as CommentMarkNode).getIDs()).toEqual([A]);
      expect(m!.getTextContent()).toBe("marked");
    });
  });

  it("ignores span data-thread-ids values that are not ULIDs", () => {
    const { editor } = makeEditor();
    importHTML(editor, '<p><span data-thread-ids="bad ids">x</span></p>');
    editor.getEditorState().read(() => {
      expect($isCommentMarkNode(($getRoot().getFirstChild() as ElementNode).getFirstChild())).toBe(false);
    });
  });
});
