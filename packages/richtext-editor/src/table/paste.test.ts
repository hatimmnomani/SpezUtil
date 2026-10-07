import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot, $getSelection, type LexicalEditor, PASTE_COMMAND } from "lexical";
import { $isTableCellNode, $isTableRowNode } from "@lexical/table";
import { cleanPastedHtml, shouldCleanPaste } from "./paste";
import { $cellAt, $columnCount, $rowCount } from "./model";
import { $firstTable, grid, insertFilledTable, isConsistent, makeEditor, read, update } from "./test-utils";

beforeEach(() => {
  document.body.innerHTML = "";
});

// Fixtures trimmed from real clipboard payloads of each source.
const EXCEL = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta name=ProgId content=Excel.Sheet><style><!--table{mso-displayed-decimal-separator:"\\.";}
.xl65{mso-number-format:"General";background:yellow;}--></style></head><body link="#0563C1">
<!--StartFragment-->
<table border=0 cellpadding=0 cellspacing=0 width=192 style='border-collapse:collapse;width:144pt'>
<col width=64 span=3 style='width:48pt'>
<tr height=20 style='height:15.0pt'>
<td height=20 class=xl65 width=64 style='height:15.0pt;width:48pt'>Name</td>
<td class=xl66 width=64 style='width:48pt;font-weight:700;background:#FFC7CE;mso-pattern:auto'>Qty</td>
<td class=xl67 style='text-align:center'>Price</td></tr>
<tr height=20><td height=20 align=right>Apples</td><td align=right x:num>3</td></tr>
</table>
<!--EndFragment--></body></html>`;

const SHEETS = `<meta charset='utf-8'><google-sheets-html-origin><style type="text/css"><!--td {border: 1px solid #cccccc;}--></style>
<table xmlns="http://www.w3.org/1999/xhtml" cellspacing="0" cellpadding="0" dir="ltr" border="1" style="table-layout:fixed;font-size:10pt;font-family:Arial;width:0px;border-collapse:collapse;border:none">
<colgroup><col width="100"/><col width="100"/></colgroup><tbody>
<tr style="height:21px;"><td style="overflow:hidden;padding:2px 3px;vertical-align:bottom;font-weight:bold;" data-sheets-value="{&quot;1&quot;:2}" colspan="2">Merged <span style="font-style:italic;color:#ff0000;font-family:Roboto">title</span></td></tr>
<tr style="height:21px;"><td style="vertical-align:bottom;background-color:#ffffff;">a<br>b</td><td style="vertical-align:middle;background-color:#d9ead3;">c</td></tr>
</tbody></table></google-sheets-html-origin>`;

const WORD = `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><style><!-- p.MsoNormal{margin:0cm;font-size:11.0pt;font-family:"Calibri",sans-serif;} --></style></head><body lang=EN-US>
<!--StartFragment--><table class=MsoTableGrid border=1 cellspacing=0 cellpadding=0 style='border-collapse:collapse;border:none'>
<tr><td width=100 valign=top style='width:75.0pt;border:solid windowtext 1.0pt;background:#D9D9D9;padding:0cm 5.4pt'>
<p class=MsoNormal><b><span style='font-size:12.0pt;font-family:"Times New Roman"'>Head</span></b><o:p></o:p></p></td>
<td rowspan=2 style='width:75pt'><p class=MsoNormal style='text-align:center'><span style='color:red'>Tall</span></p></td></tr>
<tr><td><p class=MsoNormal>Body&nbsp;text <a href="https://example.com/x" style="color:blue">link</a> <a href="javascript:alert(1)">bad</a></p></td></tr>
</table><!--EndFragment--></body></html>`;

function cleaned(html: string): Document {
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = cleanPastedHtml(html).html;
  return doc;
}

describe("cleanPastedHtml", () => {
  it("reports whether a table was found", () => {
    expect(cleanPastedHtml("<p>hi</p>").hasTable).toBe(false);
    expect(cleanPastedHtml("<table><tr><td>a</td></tr></table>").hasTable).toBe(true);
  });

  it("Excel: keeps rows, bold, background and alignment; drops widths, classes, mso styles and colgroup", () => {
    const doc = cleaned(EXCEL);
    const table = doc.querySelector("table")!;
    expect(table.querySelector("colgroup, col")).toBeNull();
    expect(table.getAttribute("style")).toBeNull();
    expect(doc.querySelectorAll("tr")).toHaveLength(2);
    const cells = doc.querySelectorAll("td");
    expect(cells[0]!.textContent).toBe("Name");
    expect(cells[1]!.querySelector("strong")).not.toBeNull();
    expect(cells[1]!.getAttribute("style")).toContain("background-color:#ffc7ce");
    expect(cells[2]!.querySelector("p")!.getAttribute("style")).toBe("text-align:center");
    const html = doc.body.innerHTML;
    for (const noise of ["mso-", "class=", "width", "height", "x:num", "StartFragment", "<style", "<meta"]) {
      expect(html).not.toContain(noise);
    }
    // Excel drops trailing empty cells: the short second row is padded to a rectangle.
    expect(doc.querySelectorAll("tr")[1]!.children).toHaveLength(3);
  });

  it("Google Sheets: keeps the colspan and italic, drops fonts/colours, treats white as no fill, keeps line breaks", () => {
    const doc = cleaned(SHEETS);
    const first = doc.querySelector("td")!;
    expect(first.getAttribute("colspan")).toBe("2");
    expect(first.querySelector("strong")).not.toBeNull(); // bold set on the cell itself applies to its content
    expect(first.querySelector("em")!.textContent).toBe("title");
    expect(doc.body.innerHTML).not.toMatch(/(^|[^-])color\s*:|font-family|Roboto|data-sheets|google-sheets|<col/i);
    const row2 = doc.querySelectorAll("tr")[1]!.children;
    expect(row2[0]!.getAttribute("style")).toBeNull(); // white fill and default bottom alignment are noise
    expect(first.getAttribute("style")).toBeNull();
    expect(row2[0]!.querySelector("br")).not.toBeNull();
    expect(row2[1]!.getAttribute("style")).toContain("background-color:#d9ead3");
    expect(row2[1]!.getAttribute("style")).toContain("vertical-align:middle");
  });

  it("Word: keeps rowspan, header-ish formatting and safe links; drops Office markup and javascript: links", () => {
    const doc = cleaned(WORD);
    expect(doc.querySelector("td[rowspan]")!.getAttribute("rowspan")).toBe("2");
    expect(doc.querySelectorAll("tr")).toHaveLength(2);
    expect(doc.querySelectorAll("tr")[1]!.children).toHaveLength(1); // other cell is covered by the rowspan
    expect(doc.querySelector("strong")!.textContent).toBe("Head");
    expect(doc.querySelector("a")!.getAttribute("href")).toBe("https://example.com/x");
    expect(doc.body.innerHTML).not.toMatch(/javascript:|Calibri|Times|o:p|MsoNormal|windowtext|<span/i);
    expect(doc.body.textContent).toContain("Body text link bad");
    expect(doc.querySelector("td")!.getAttribute("style")).toContain("background-color:#d9d9d9");
  });

  it("converts thead cells to header cells and moves tfoot last", () => {
    const doc = cleaned(
      "<table><tfoot><tr><td>F</td></tr></tfoot><thead><tr><td>H</td></tr></thead><tbody><tr><td>B</td></tr></tbody></table>",
    );
    expect(Array.from(doc.querySelectorAll("tr")).map((r) => r.children[0]!.tagName + r.textContent)).toEqual([
      "THH",
      "TDB",
      "TDF",
    ]);
  });

  it("clamps absurd spans and rowspans that run off the table", () => {
    const doc = cleaned('<table><tr><td colspan="9999" rowspan="9999">x</td></tr></table>');
    const td = doc.querySelector("td")!;
    expect(td.getAttribute("colspan")).toBe("50");
    expect(td.hasAttribute("rowspan")).toBe(false);
  });

  it("pads ragged rows into a rectangle", () => {
    const doc = cleaned("<table><tr><td>1</td><td>2</td><td>3</td></tr><tr><td>1</td></tr></table>");
    expect(doc.querySelectorAll("tr")[1]!.children).toHaveLength(3);
  });

  it("flattens nested tables to text and ignores their rows", () => {
    const doc = cleaned("<table><tr><td>outer<table><tr><td>in1</td><td>in2</td></tr></table></td></tr></table>");
    expect(doc.querySelectorAll("table")).toHaveLength(1);
    expect(doc.querySelectorAll("tr")).toHaveLength(1);
    expect(doc.querySelector("td")!.textContent).toContain("in1 | in2");
  });

  it("drops images, scripts and event handlers", () => {
    const doc = cleaned('<table><tr><td onclick="x()"><img src="file:///c:/a.png"><script>alert(1)</script>ok</td></tr></table>');
    expect(doc.body.innerHTML).not.toMatch(/img|script|onclick|file:/i);
    expect(doc.querySelector("td")!.textContent).toBe("ok");
  });

  it("keeps whitespace-only and &nbsp; cells empty", () => {
    const doc = cleaned("<table><tr><td>&nbsp;</td><td>  \n </td></tr></table>");
    expect(Array.from(doc.querySelectorAll("td")).map((c) => c.textContent)).toEqual(["", ""]);
  });

  it("does not trust a background shorthand that carries more than a colour", () => {
    const doc = cleaned('<table><tr><td style="background:url(http://x/y.png) red">a</td></tr></table>');
    // `red` is a keyword the server-side renderer would drop, so it is not carried at all.
    expect(doc.querySelector("td")!.getAttribute("style")).toBeNull();
    expect(doc.body.innerHTML).not.toContain("url(");
  });

  it("collapses source line wrapping inside a cell", () => {
    const doc = cleaned("<table><tr><td>one\n   two\n\tthree</td></tr></table>");
    expect(doc.querySelector("td")!.textContent).toBe("one two three");
  });
});

// ---------------------------------------------------------------------------------------------

function paste(editor: LexicalEditor, payload: Record<string, string>): Event {
  const event = new Event("paste", { cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { types: Object.keys(payload), getData: (type: string) => payload[type] ?? "" },
  });
  editor.dispatchCommand(PASTE_COMMAND, event as ClipboardEvent);
  editor.update(() => {}, { discrete: true });
  return event;
}

describe("pasting into the editor", () => {
  it("turns an Excel table into a clean table node, with merged cells where representable", () => {
    const editor = makeEditor();
    const event = paste(editor, { "text/html": SHEETS, "text/plain": "x" });
    expect(event.defaultPrevented).toBe(true);
    read(editor, () => {
      const table = $firstTable();
      expect($rowCount(table)).toBe(2);
      expect($columnCount(table)).toBe(2);
      const merged = $cellAt(table, 0, 0)!;
      expect(merged.getColSpan()).toBe(2);
      expect(merged.getTextContent()).toBe("Merged title");
      expect($cellAt(table, 1, 1)!.getBackgroundColor()).toMatch(/^(#d9ead3|rgb\(217, 234, 211\))$/);
      expect($cellAt(table, 1, 1)!.getVerticalAlign()).toBe("middle");
      expect($cellAt(table, 1, 0)!.getBackgroundColor()).toBeNull();
    });
    expect(isConsistent(editor)).toBe(true);
    // No foreign text styles reached the document.
    const json = JSON.stringify(editor.getEditorState().toJSON());
    expect(json).not.toMatch(/Roboto|font-family|#ff0000|colWidths/);
  });

  it("keeps alignment as block format and bold as text format (Word)", () => {
    const editor = makeEditor();
    paste(editor, { "text/html": WORD });
    const json = JSON.parse(JSON.stringify(editor.getEditorState().toJSON()));
    const text = JSON.stringify(json);
    expect(text).toContain('"format":"center"');
    expect(text).not.toMatch(/Calibri|Times New Roman|color:red|style":"[^"]*font/);
    read(editor, () => {
      const table = $firstTable();
      expect($cellAt(table, 0, 1)!.getRowSpan()).toBe(2);
      expect($cellAt(table, 0, 0)!.getBackgroundColor()).toMatch(/^(#d9d9d9|rgb\(217, 217, 217\))$/);
    });
  });

  it("leaves non-table HTML and the editor's own clipboard payload to the default handler", () => {
    const data = (map: Record<string, string>) => ({ getData: (t: string) => map[t] ?? "" });
    expect(shouldCleanPaste(data({ "text/html": "<p>plain</p>" }))).toBe(false);
    expect(shouldCleanPaste(data({ "text/html": "<table><tr><td>x</td></tr></table>", "application/x-lexical-editor": "{}" }))).toBe(false);
    expect(shouldCleanPaste(data({ "text/html": "<TABLE><tr><td>x</td></tr></TABLE>" }))).toBe(true);
  });

  it("pasting a table over a cell selection inside another table keeps the grid intact", () => {
    const editor = makeEditor();
    insertFilledTable(editor, 3, 3);
    update(editor, () => $cellAt($firstTable(), 0, 0)!.selectEnd());
    paste(editor, { "text/html": "<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>" });
    expect(isConsistent(editor)).toBe(true);
    expect(grid(editor).slice(0, 2).map((r) => r.slice(0, 2))).toEqual([["A", "B"], ["C", "D"]]);
    read(editor, () => {
      expect($getRoot().getChildren().filter((n) => n.getType() === "table")).toHaveLength(1);
      expect($getSelection()).not.toBeNull();
    });
  });

  it("cells have at least one paragraph even when the source cell was empty", () => {
    const editor = makeEditor();
    paste(editor, { "text/html": "<table><tr><td></td><td>x</td></tr></table>" });
    read(editor, () => {
      const rows = $firstTable().getChildren().filter($isTableRowNode);
      for (const cell of rows[0]!.getChildren()) {
        expect($isTableCellNode(cell)).toBe(true);
        expect((cell as { getChildrenSize(): number }).getChildrenSize()).toBeGreaterThan(0);
      }
    });
  });
});
