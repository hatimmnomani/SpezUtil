import { beforeEach, describe, expect, it } from "vitest";
import { $createTextNode, $getRoot } from "lexical";
import { createEditorInstance } from "../editor";
import { exportHTML, importHTML } from "../html";
import {
  $createTranslitLineNode,
  $createTranslitPairNode,
  $isTranslitLineNode,
  $isTranslitPairNode,
  TranslitPairNode,
} from "./translit-nodes";

function makeEditor() {
  const rootEl = document.createElement("div");
  rootEl.contentEditable = "true";
  document.body.appendChild(rootEl);
  return createEditorInstance(rootEl);
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("TranslitPairNode normalizer", () => {
  it("re-creates a missing latin line", () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        const pair = $createTranslitPairNode();
        const arabic = $createTranslitLineNode("arabic");
        arabic.append($createTextNode("العلم نور"));
        pair.append(arabic);
        $getRoot().clear().append(pair);
      },
      { discrete: true },
    );
    editor.getEditorState().read(() => {
      const pair = $getRoot().getFirstChild() as TranslitPairNode;
      expect($isTranslitPairNode(pair)).toBe(true);
      const roles = pair
        .getChildren()
        .filter($isTranslitLineNode)
        .map((line) => line.getRole());
      expect(roles).toEqual(["arabic", "latin"]);
    });
  });

  it("removes an emptied pair", () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        const pair = $createTranslitPairNode();
        $getRoot().clear().append(pair);
      },
      { discrete: true },
    );
    editor.getEditorState().read(() => {
      expect($getRoot().getChildren().some($isTranslitPairNode)).toBe(false);
    });
  });
});

describe("TranslitPairNode serialization", () => {
  function seed(editor: ReturnType<typeof makeEditor>["editor"]) {
    editor.update(
      () => {
        const pair = $createTranslitPairNode();
        const arabic = $createTranslitLineNode("arabic");
        arabic.append($createTextNode("العلم نور"));
        const latin = $createTranslitLineNode("latin");
        latin.append($createTextNode("al-ilmu noor"));
        pair.append(arabic, latin);
        $getRoot().clear().append(pair);
      },
      { discrete: true },
    );
  }

  it("round-trips through JSON with roles intact", () => {
    const { editor } = makeEditor();
    seed(editor);
    const json = JSON.stringify(editor.getEditorState().toJSON());
    editor.setEditorState(editor.parseEditorState(json));
    editor.getEditorState().read(() => {
      const pair = $getRoot().getFirstChild() as TranslitPairNode;
      const lines = pair.getChildren().filter($isTranslitLineNode);
      expect(lines.map((l) => l.getRole())).toEqual(["arabic", "latin"]);
      expect(lines[0]!.getTextContent()).toBe("العلم نور");
      expect(lines[1]!.getTextContent()).toBe("al-ilmu noor");
    });
  });

  it("exports tagged markup and re-imports it", () => {
    const { editor } = makeEditor();
    seed(editor);
    const html = exportHTML(editor);
    expect(html).toContain('data-spez-type="translit-pair"');
    expect(html).toContain('data-role="arabic"');
    expect(html).toContain('data-role="latin"');

    importHTML(editor, html);
    editor.getEditorState().read(() => {
      const pair = $getRoot().getFirstChild();
      expect($isTranslitPairNode(pair)).toBe(true);
    });
  });
});
