import { beforeEach, describe, expect, it } from "vitest";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  DELETE_CHARACTER_COMMAND,
  type LexicalEditor,
} from "lexical";
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

describe("TranslitPair block removal", () => {
  function seedPair(editor: LexicalEditor, arabicText = "العلم نور", latinText = "al-ilmu noor") {
    editor.update(
      () => {
        const pair = $createTranslitPairNode();
        const arabic = $createTranslitLineNode("arabic");
        if (arabicText) arabic.append($createTextNode(arabicText));
        const latin = $createTranslitLineNode("latin");
        if (latinText) latin.append($createTextNode(latinText));
        pair.append(arabic, latin);
        $getRoot().clear().append(pair);
      },
      { discrete: true },
    );
  }

  function deleteChar(editor: LexicalEditor, backward = true) {
    editor.dispatchCommand(DELETE_CHARACTER_COMMAND, backward);
    editor.update(() => {}, { discrete: true });
  }

  function selectLineStart(editor: LexicalEditor, role: "arabic" | "latin") {
    editor.update(
      () => {
        const pair = $getRoot().getChildren().find($isTranslitPairNode)!;
        const line = pair
          .getChildren()
          .filter($isTranslitLineNode)
          .find((l) => l.getRole() === role)!;
        line.selectStart();
      },
      { discrete: true },
    );
  }

  it("backspace in an all-empty pair removes the whole pair", () => {
    const { editor } = makeEditor();
    seedPair(editor, "", "");
    selectLineStart(editor, "latin");
    deleteChar(editor);
    editor.getEditorState().read(() => {
      expect($getRoot().getChildren().some($isTranslitPairNode)).toBe(false);
    });
  });

  it("backspace at start of the latin line moves the caret to the arabic line without merging", () => {
    const { editor } = makeEditor();
    seedPair(editor);
    selectLineStart(editor, "latin");
    deleteChar(editor);
    editor.getEditorState().read(() => {
      const pair = $getRoot().getChildren().find($isTranslitPairNode)!;
      const lines = pair.getChildren().filter($isTranslitLineNode);
      expect(lines.map((l) => l.getTextContent())).toEqual(["العلم نور", "al-ilmu noor"]);
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) throw new Error("expected range selection");
      const node = selection.anchor.getNode();
      const line = $isTranslitLineNode(node) ? node : node.getParent();
      expect($isTranslitLineNode(line) && line.getRole()).toBe("arabic");
    });
  });

  it("backspace at start of the arabic line unwraps the pair into paragraphs", () => {
    const { editor } = makeEditor();
    seedPair(editor);
    selectLineStart(editor, "arabic");
    deleteChar(editor);
    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children.some($isTranslitPairNode)).toBe(false);
      expect(children.every($isParagraphNode)).toBe(true);
      expect(children.map((c) => c.getTextContent())).toEqual(["العلم نور", "al-ilmu noor"]);
    });
  });

  it("forward delete at the end of the block before a pair steps into the pair without merging", () => {
    const { editor } = makeEditor();
    seedPair(editor);
    editor.update(
      () => {
        const intro = $createParagraphNode();
        intro.append($createTextNode("intro"));
        $getRoot().getFirstChild()!.insertBefore(intro);
        intro.selectEnd();
      },
      { discrete: true },
    );
    deleteChar(editor, false);
    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children[0]!.getTextContent()).toBe("intro");
      const pair = children.find($isTranslitPairNode)!;
      expect($isTranslitPairNode(pair)).toBe(true);
      const lines = pair.getChildren().filter($isTranslitLineNode);
      expect(lines.map((l) => l.getTextContent())).toEqual(["العلم نور", "al-ilmu noor"]);
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
