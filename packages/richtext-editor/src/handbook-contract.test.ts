import { describe, expect, it } from "vitest";
import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";
import { $createCommentMarkNode } from "./nodes/comment-mark-node";
import { $createDiagramNode } from "./nodes/diagram-node";
import { $createLudTextNode } from "./nodes/lud-text-node";
import { makeEditor } from "./test-utils";

const MARK = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" id="spez-rte-mermaid-01J9ZX3M4Q8R2S5T7V9W0XYZAB"><text>A</text></svg>';

/**
 * Node JSON consumed by the handbook API (HandbookHtmlRenderer, LexicalText, KB ToUnicode).
 * Changing any expectation here is a breaking change for mahadalzahrawebapi: update
 * contract/handbook-nodes.json there too.
 */
describe("handbook node contract", () => {
  it("pins lud-text, comment-mark and diagram exactly", async () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        $getRoot().clear().append(
          $createParagraphNode().append(
            $createLudTextNode("نسس", "al-kanz").toggleFormat("bold"),
            $createCommentMarkNode([MARK]).append($createTextNode("attend "), $createLudTextNode("ثثا", "al-kanz")),
          ),
          $createDiagramNode("graph TD;A", SVG, null),
        );
      },
      { discrete: true },
    );
    const state = editor.getEditorState().toJSON();
    const [para, diagram] = state.root.children as any[];
    const [lud, mark] = para.children;

    expect(lud).toEqual({
      detail: 0, format: 1, mode: "normal",
      style: 'font-family: "AL-KANZ", "Noto Naskh Arabic";',
      text: "نسس", type: "lud-text", version: 1, ludFont: "al-kanz",
    });
    expect(mark).toMatchObject({ type: "comment-mark", version: 1, ids: [MARK], format: "", indent: 0 });
    expect(mark.children.map((c: any) => c.type)).toEqual(["text", "lud-text"]);
    expect(diagram).toEqual({ type: "diagram", version: 1, source: "graph TD;A", svg: SVG, drawioKey: null });

    await expect(JSON.stringify(state, null, 2) + "\n").toMatchFileSnapshot("../contract/handbook-nodes.json");
  });
});
