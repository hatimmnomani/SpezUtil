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
