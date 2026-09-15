import { beforeEach, describe, expect, it } from "vitest";
import { createEditorInstance } from "./editor";
import { exportHTML, importHTML } from "./html";

function makeEditor() {
  const rootEl = document.createElement("div");
  rootEl.contentEditable = "true";
  document.body.appendChild(rootEl);
  return createEditorInstance(rootEl);
}

beforeEach(() => {
  document.body.innerHTML = "";
});

const FIXTURE = [
  "<h2>Bayaan</h2>",
  '<blockquote data-spez-type="ayat">بسم الله الرحمن الرحيم</blockquote>',
  '<div data-spez-type="translit-pair">',
  '<p data-role="arabic">العلم نور</p>',
  '<p data-role="latin">al-ilmu noor</p>',
  "</div>",
  '<p>Majlis on <time data-spez-hijri="1447-2-12" data-spez-format="D MMMM YYYY">12 Safar al-Muzaffar 1447</time>.</p>',
  "<ul><li>one</li><li>two</li></ul>",
  '<img src="https://example.com/x.png" alt="banner">',
].join("");

describe("HTML import/export", () => {
  it("round-trips core + custom content", () => {
    const { editor } = makeEditor();
    importHTML(editor, FIXTURE);
    const html = exportHTML(editor);

    expect(html).toContain("<h2");
    expect(html).toContain('data-spez-type="ayat"');
    expect(html).toContain("بسم الله");
    expect(html).toContain('data-spez-type="translit-pair"');
    expect(html).toContain('data-role="arabic"');
    expect(html).toContain('data-role="latin"');
    expect(html).toContain('data-spez-hijri="1447-2-12"');
    expect(html).toContain("12 Safar al-Muzaffar 1447");
    expect(html).toContain("<li");
    expect(html).toContain('src="https://example.com/x.png"');
  });

  it("re-importing exported HTML is stable", () => {
    const { editor } = makeEditor();
    importHTML(editor, FIXTURE);
    const first = exportHTML(editor);
    importHTML(editor, first);
    const second = exportHTML(editor);
    expect(second).toBe(first);
  });

  it("imports tables", () => {
    const { editor } = makeEditor();
    importHTML(editor, "<table><tr><td>a</td><td>b</td></tr></table>");
    const html = exportHTML(editor);
    expect(html).toContain("<table");
    expect(html).toContain(">a<");
  });
});

// The toolbar's swatches write hex, but an exported style goes out through the
// DOM's own CSS serialiser, so what consumers persist — and what comes back on
// the next import — is rgb() notation.
const RED = "rgb(198, 40, 40)";
const YELLOW = "rgb(255, 243, 163)";

describe("inline colour", () => {
  it("keeps the text colour on import", () => {
    const { editor } = makeEditor();
    importHTML(editor, '<p><span style="color: #c62828;">shahaadat</span></p>');
    expect(exportHTML(editor)).toContain(`color: ${RED}`);
  });

  it("keeps the highlight colour on import", () => {
    const { editor } = makeEditor();
    importHTML(editor, '<p><span style="background-color: #fff3a3;">nasihat</span></p>');
    expect(exportHTML(editor)).toContain(`background-color: ${YELLOW}`);
  });

  it("re-importing coloured HTML is stable", () => {
    const { editor } = makeEditor();
    importHTML(
      editor,
      '<p><span style="color: #c62828; background-color: #fff3a3;">both</span></p>',
    );
    const first = exportHTML(editor);
    importHTML(editor, first);
    const second = exportHTML(editor);
    importHTML(editor, second);
    const third = exportHTML(editor);

    expect(first).toContain(`color: ${RED}`);
    expect(first).toContain(`background-color: ${YELLOW}`);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("keeps a coloured span inside an ayat block", () => {
    const { editor } = makeEditor();
    importHTML(
      editor,
      '<blockquote data-spez-type="ayat"><span style="color: #c62828;">بسم الله</span></blockquote>',
    );
    const html = exportHTML(editor);
    expect(html).toContain('data-spez-type="ayat"');
    expect(html).toContain(`color: ${RED}`);
    expect(html).toContain("بسم الله");
    importHTML(editor, html);
    expect(exportHTML(editor)).toBe(html);
  });

  it("drops colour values that are not plain literals", () => {
    const { editor } = makeEditor();
    importHTML(
      editor,
      '<p><span style="color: var(--brand); background-color: #fff3a3;">x</span></p>',
    );
    const html = exportHTML(editor);
    expect(html).not.toContain("var(");
    expect(html).toContain(`background-color: ${YELLOW}`);
  });
});
