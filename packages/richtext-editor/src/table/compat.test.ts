import { beforeEach, describe, expect, it } from "vitest";
import "../index";
import type { SpezRichtext } from "../richtext-editor";
import { exportHTML } from "../html";
import { TABLE_SHORTCUTS } from "./shortcuts";
import { getTableStrings } from "./strings";
import { insertTable } from "./actions";
import { $firstTable, makeEditor, read, update } from "./test-utils";
import { $cellAt, $setColumnWidths, $setCellVerticalAlign } from "./model";

beforeEach(() => {
  document.body.innerHTML = "";
});

const para = (text: string) => ({
  children: text
    ? [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }]
    : [],
  direction: text ? "ltr" : null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
  textFormat: 0,
  textStyle: "",
});

const cell = (text: string, extra: Record<string, unknown> = {}) => ({
  children: [para(text)],
  direction: null,
  format: "",
  indent: 0,
  type: "tablecell",
  version: 1,
  backgroundColor: null,
  colSpan: 1,
  headerState: 0,
  rowSpan: 1,
  ...extra,
});

const row = (...cells: unknown[]) => ({
  children: cells,
  direction: null,
  format: "",
  indent: 0,
  type: "tablerow",
  version: 1,
});

/** A table exactly as @spezutil/richtext-editor 0.5.1 serialised it: no colWidths, no verticalAlign, no cell width. */
const V051 = {
  root: {
    children: [
      {
        children: [
          row(cell("Name", { headerState: 3 }), cell("Qty", { headerState: 1, backgroundColor: "#fff59d" })),
          row(cell("Apples", { headerState: 2 }), cell("3", { colSpan: 1 })),
          row(cell("Total", { headerState: 2, colSpan: 2 })),
        ],
        direction: null,
        format: "",
        indent: 0,
        type: "table",
        version: 1,
      },
      para(""),
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
};

describe("0.5.1 stored tables", () => {
  it("load and re-serialise unchanged", () => {
    const el = document.createElement("spez-richtext") as SpezRichtext;
    document.body.appendChild(el);
    el.value = JSON.stringify(V051);
    expect(JSON.parse(el.value!)).toEqual(V051);
  });

  it("survive an edit elsewhere in the document without gaining new attributes", () => {
    const editor = makeEditor();
    editor.setEditorState(editor.parseEditorState(JSON.stringify(V051)));
    update(editor, () => {});
    const json = JSON.stringify(editor.getEditorState().toJSON());
    expect(json).not.toMatch(/colWidths|verticalAlign|"width"/);
    expect(JSON.parse(json)).toEqual(V051);
  });

  it("still export to HTML with a plain table", () => {
    const editor = makeEditor();
    editor.setEditorState(editor.parseEditorState(JSON.stringify(V051)));
    const html = exportHTML(editor);
    expect(html).toContain("<table");
    expect(html).toContain("Apples");
    expect(html).toContain('colspan="2"');
  });
});

describe("new attributes are optional and round-trip", () => {
  it("colWidths and verticalAlign survive load and save", () => {
    const withNew = JSON.parse(JSON.stringify(V051));
    withNew.root.children[0].colWidths = [140, 90];
    withNew.root.children[0].children[0].children[0].verticalAlign = "middle";
    const editor = makeEditor();
    editor.setEditorState(editor.parseEditorState(JSON.stringify(withNew)));
    expect(JSON.parse(JSON.stringify(editor.getEditorState().toJSON()))).toEqual(withNew);
    expect(read(editor, () => $firstTable().getColWidths())).toEqual([140, 90]);
  });

  it("new tables carry no new attributes until used", () => {
    const editor = makeEditor();
    insertTable(editor, { rows: 2, columns: 2 });
    expect(JSON.stringify(editor.getEditorState().toJSON())).not.toMatch(/colWidths|verticalAlign/);
    update(editor, () => {
      $setColumnWidths($firstTable(), [100, 200]);
      $setCellVerticalAlign([$cellAt($firstTable(), 0, 0)!], "bottom");
    });
    const json = JSON.stringify(editor.getEditorState().toJSON());
    expect(json).toContain('"colWidths":[100,200]');
    expect(json).toContain('"verticalAlign":"bottom"');
  });
});

describe("insertTable", () => {
  it("clamps the size and puts the caret in the first cell", () => {
    const editor = makeEditor();
    insertTable(editor, { rows: 500, columns: 99, headerRow: true });
    read(editor, () => {
      const t = $firstTable();
      expect(t.getChildrenSize()).toBe(100);
      expect($cellAt(t, 0, 0)!.hasHeader()).toBe(true);
      expect($cellAt(t, 1, 0)!.hasHeader()).toBe(false);
      expect($cellAt(t, 0, 19)).not.toBeNull();
      expect($cellAt(t, 0, 20)).toBeNull();
    });
  });

  it("makes header columns only when asked", () => {
    const editor = makeEditor();
    insertTable(editor, { rows: 2, columns: 2 });
    read(editor, () => expect($cellAt($firstTable(), 0, 0)!.hasHeader()).toBe(false));
  });
});

describe("<spez-richtext> table options", () => {
  it("tableTools defaults on and reflects the attribute", () => {
    const el = document.createElement("spez-richtext") as SpezRichtext;
    document.body.appendChild(el);
    expect(el.tableTools).toBe(true);
    el.tableTools = false;
    expect(el.getAttribute("table-tools")).toBe("off");
    expect(el.tableTools).toBe(false);
    el.setAttribute("table-tools", "false");
    expect(el.tableTools).toBe(false);
    el.removeAttribute("table-tools");
    expect(el.tableTools).toBe(true);
  });

  it("renders an accessible, labelled table bar once the caret is in a table", async () => {
    const el = document.createElement("spez-richtext") as SpezRichtext;
    el.setAttribute("toolbar", "history,insert");
    document.body.appendChild(el);
    insertTable(el.editor, { rows: 2, columns: 2 });
    await new Promise((r) => setTimeout(r, 50));
    const bar = el.querySelector<HTMLElement>(".spez-rte-tbar")!;
    expect(bar).not.toBeNull();
    expect(bar.getAttribute("role")).toBe("toolbar");
    expect(bar.getAttribute("aria-label")).toBe("Table tools");
    const buttons = Array.from(bar.querySelectorAll("button"));
    expect(buttons.length).toBeGreaterThanOrEqual(14);
    for (const b of buttons) {
      expect(b.getAttribute("aria-label")).toBeTruthy();
      expect(b.title).toBe(b.getAttribute("aria-label"));
    }
    // Roving tabindex: exactly one tab stop.
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    expect(el.querySelector('[aria-live="polite"][role="status"]')).not.toBeNull();
  });

  it("hides the bar with table-tools=off and localises it for Arabic", async () => {
    const el = document.createElement("spez-richtext") as SpezRichtext;
    el.setAttribute("table-tools", "off");
    document.body.appendChild(el);
    insertTable(el.editor, { rows: 2, columns: 2 });
    await new Promise((r) => setTimeout(r, 50));
    expect(el.querySelector<HTMLElement>(".spez-rte-tbar")!.hidden).toBe(true);
    el.removeAttribute("table-tools");
    el.setAttribute("locale", "ar");
    await new Promise((r) => setTimeout(r, 50));
    expect(el.querySelector(".spez-rte-tbar")!.getAttribute("aria-label")).toBe(getTableStrings("ar").toolbar);
  });
});

describe("localisation and shortcuts", () => {
  it("English and Arabic define the same keys", () => {
    expect(Object.keys(getTableStrings("ar")).sort()).toEqual(Object.keys(getTableStrings("en")).sort());
  });

  it("placeholders match between locales", () => {
    const en = getTableStrings("en") as unknown as Record<string, string>;
    const ar = getTableStrings("ar") as unknown as Record<string, string>;
    for (const key of Object.keys(en)) {
      const names = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(names(ar[key]!), key).toEqual(names(en[key]!));
    }
  });

  it("documents Alt+F9 for the table bar and leaves Alt+F10 to the main toolbar", () => {
    const keys = TABLE_SHORTCUTS.map((s) => s.keys);
    expect(keys).toContain("Alt+F9");
    expect(keys).not.toContain("Alt+F10");
  });
});
