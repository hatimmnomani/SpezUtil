import { beforeEach, describe, expect, it } from "vitest";
import { $createTextNode, $getRoot } from "lexical";
import { createEditorInstance } from "../editor";
import { exportHTML, importHTML } from "../html";
import { $createAyatNode, $isAyatNode } from "./ayat-node";

function makeEditor() {
  const rootEl = document.createElement("div");
  rootEl.contentEditable = "true";
  document.body.appendChild(rootEl);
  return createEditorInstance(rootEl);
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("AyatNode", () => {
  it("round-trips through JSON", () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        const ayat = $createAyatNode();
        ayat.append($createTextNode("بسم الله الرحمن الرحيم"));
        $getRoot().clear().append(ayat);
      },
      { discrete: true },
    );
    const json = JSON.stringify(editor.getEditorState().toJSON());
    expect(json).toContain('"ayat"');
    editor.setEditorState(editor.parseEditorState(json));
    editor.getEditorState().read(() => {
      const first = $getRoot().getFirstChild();
      expect($isAyatNode(first)).toBe(true);
      expect(first!.getTextContent()).toBe("بسم الله الرحمن الرحيم");
    });
  });

  it("exports a tagged blockquote and re-imports it", () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        const ayat = $createAyatNode();
        ayat.append($createTextNode("آية"));
        $getRoot().clear().append(ayat);
      },
      { discrete: true },
    );
    const html = exportHTML(editor);
    expect(html).toContain("<blockquote");
    expect(html).toContain('data-spez-type="ayat"');

    importHTML(editor, html);
    editor.getEditorState().read(() => {
      expect($isAyatNode($getRoot().getFirstChild())).toBe(true);
    });
  });

  it("renders as div.spez-rte-ayat with dir=rtl in the editor DOM", () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        const ayat = $createAyatNode();
        ayat.append($createTextNode("نص"));
        $getRoot().clear().append(ayat);
      },
      { discrete: true },
    );
    const dom = editor.getRootElement()!.querySelector(".spez-rte-ayat");
    expect(dom).not.toBeNull();
    expect(dom!.getAttribute("dir")).toBe("rtl");
  });
});
