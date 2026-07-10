import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot, $createParagraphNode } from "lexical";
import { createEditorInstance } from "../editor";
import { exportHTML, importHTML } from "../html";
import {
  $createHijriDateNode,
  $isHijriDateNode,
  formatHijriDate,
  HijriDateNode,
} from "./hijri-date-node";

function makeEditor() {
  const rootEl = document.createElement("div");
  rootEl.contentEditable = "true";
  document.body.appendChild(rootEl);
  return createEditorInstance(rootEl);
}

beforeEach(() => {
  document.body.innerHTML = "";
});

const SAMPLE = { year: 1447, month: 2, day: 12 };

describe("formatHijriDate", () => {
  it("formats with transliterated month names by default", () => {
    expect(formatHijriDate(SAMPLE)).toBe("12 Safar al-Muzaffar 1447");
  });
  it("formats with Arabic month names for ar locale", () => {
    const out = formatHijriDate(SAMPLE, "D MMMM YYYY", "ar");
    expect(out).toContain("1447");
    expect(out).toContain("12");
    expect(out).toMatch(/[؀-ۿ]/);
  });
  it("respects custom patterns", () => {
    expect(formatHijriDate(SAMPLE, "DD/MM/YYYY")).toBe("12/02/1447");
  });
});

describe("HijriDateNode", () => {
  it("is an atomic token with the formatted date as text", () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createHijriDateNode(SAMPLE));
        $getRoot().clear().append(p);
      },
      { discrete: true },
    );
    editor.getEditorState().read(() => {
      const node = $getRoot().getAllTextNodes()[0]!;
      expect($isHijriDateNode(node)).toBe(true);
      expect(node.getTextContent()).toBe("12 Safar al-Muzaffar 1447");
      expect((node as HijriDateNode).isToken()).toBe(true);
    });
  });

  it("round-trips the date payload through JSON", () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createHijriDateNode(SAMPLE, "DD/MM/YYYY"));
        $getRoot().clear().append(p);
      },
      { discrete: true },
    );
    const json = JSON.stringify(editor.getEditorState().toJSON());
    expect(json).toContain('"hijri"');

    editor.setEditorState(editor.parseEditorState(json));
    editor.getEditorState().read(() => {
      const node = $getRoot().getAllTextNodes()[0] as HijriDateNode;
      expect($isHijriDateNode(node)).toBe(true);
      expect(node.getHijri()).toEqual(SAMPLE);
      expect(node.getFormatPattern()).toBe("DD/MM/YYYY");
    });
  });

  it("exports to a <time> element and re-imports the payload", () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        const p = $createParagraphNode();
        p.append($createHijriDateNode(SAMPLE));
        $getRoot().clear().append(p);
      },
      { discrete: true },
    );
    const html = exportHTML(editor);
    expect(html).toContain('<time');
    expect(html).toContain('data-spez-hijri="1447-2-12"');

    importHTML(editor, html);
    editor.getEditorState().read(() => {
      const node = $getRoot().getAllTextNodes()[0] as HijriDateNode;
      expect($isHijriDateNode(node)).toBe(true);
      expect(node.getHijri()).toEqual(SAMPLE);
    });
  });
});
