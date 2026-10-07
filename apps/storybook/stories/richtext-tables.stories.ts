import "@spezutil/richtext-editor";
import { cleanPastedHtml, TABLE_SHORTCUTS } from "@spezutil/richtext-editor";

export default {
  title: "Components/SpezRichtext/Tables",
  parameters: {
    docs: {
      description: {
        component: [
          "Table editing: size picker, floating table bar, row/column grips, column resize, cell selection, paste cleaning.",
          "",
          "**Shortcuts**",
          ...TABLE_SHORTCUTS.map((s) => `- \`${s.keys}\`: ${s.action}`),
        ].join("\n"),
      },
    },
  },
};

type Cell = { text: string; header?: number; colSpan?: number; rowSpan?: number; bg?: string; format?: string; va?: string };

function para(text: string, format = "") {
  return {
    children: text ? [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }] : [],
    direction: null, format, indent: 0, type: "paragraph", version: 1, textFormat: 0, textStyle: "",
  };
}

function tableDoc(rows: Cell[][], colWidths?: number[]) {
  const table: Record<string, unknown> = {
    children: rows.map((r) => ({
      children: r.map((c) => ({
        children: [para(c.text, c.format)],
        direction: null, format: c.format ?? "", indent: 0, type: "tablecell", version: 1,
        backgroundColor: c.bg ?? null, colSpan: c.colSpan ?? 1, headerState: c.header ?? 0, rowSpan: c.rowSpan ?? 1,
        ...(c.va ? { verticalAlign: c.va } : {}),
      })),
      direction: null, format: "", indent: 0, type: "tablerow", version: 1,
    })),
    direction: null, format: "", indent: 0, type: "table", version: 1,
  };
  if (colWidths) table.colWidths = colWidths;
  return JSON.stringify({
    root: { children: [para("Before the table."), table, para("After the table.")], direction: null, format: "", indent: 0, type: "root", version: 1 },
  });
}

function editor(attrs: Record<string, string> = {}, setup?: (el: HTMLElement & { value: string | null; initialHtml: string | null }) => void) {
  const el = document.createElement("spez-richtext") as HTMLElement & { value: string | null; initialHtml: string | null };
  // `default-toolbar` leaves the toolbar attribute off, which gives the compact default with its More menu.
  if (!("default-toolbar" in attrs)) el.setAttribute("toolbar", "history,inline,insert");
  for (const [k, v] of Object.entries(attrs)) if (k !== "default-toolbar") el.setAttribute(k, v);
  setup?.(el);
  return el;
}

const H = 3;
const basic: Cell[][] = [
  [{ text: "Item", header: 1 }, { text: "Qty", header: 1 }, { text: "Notes", header: 1 }],
  [{ text: "Apples" }, { text: "3" }, { text: "Click a cell: the table bar appears." }],
  [{ text: "Pears" }, { text: "5" }, { text: "Press Tab in the last cell to add a row." }],
];

export const Basic = { render: () => editor({}, (el) => (el.value = tableDoc(basic))) };

export const Merged = {
  render: () =>
    editor({}, (el) =>
      (el.value = tableDoc([
        [{ text: "Quarterly report", header: H, colSpan: 3, format: "center" }],
        [{ text: "Region", header: 1 }, { text: "Q1", header: 1 }, { text: "Q2", header: 1 }],
        [{ text: "North", rowSpan: 2, va: "middle", bg: "#c8e6c9" }, { text: "10" }, { text: "12" }],
        [{ text: "14" }, { text: "9", bg: "#ffcdd2" }],
      ])),
    ),
};

export const Resized = {
  render: () => editor({}, (el) => (el.value = tableDoc(basic, [120, 80, 420]))),
};

export const RTL = {
  render: () =>
    editor({ dir: "rtl", locale: "ar" }, (el) =>
      (el.value = tableDoc([
        [{ text: "الصنف", header: 1 }, { text: "العدد", header: 1 }, { text: "ملاحظات", header: 1 }],
        [{ text: "تفاح" }, { text: "٣" }, { text: "اضغط على خلية لإظهار شريط الجدول." }],
        [{ text: "كمثرى" }, { text: "٥" }, { text: "اضغط Tab في الخلية الأخيرة لإضافة صف." }],
      ])),
    ),
};

/** What Excel puts on the clipboard, run through the same cleaner paste uses. */
const EXCEL = `<table style='border-collapse:collapse;width:144pt'><col width=64 span=3>
<tr><td class=xl65 width=64 style='font-weight:700;background:#FFC7CE;mso-pattern:auto'>Name</td><td class=xl66 style='text-align:center'>Qty</td></tr>
<tr><td align=right style='font-family:Calibri;font-size:11pt;color:#9C0006'>Apples</td><td align=right x:num>3</td></tr></table>`;

export const Pasted = {
  render: () => editor({}, (el) => (el.initialHtml = cleanPastedHtml(EXCEL).html)),
};

/** The compact default toolbar (with its More menu) above a table. */
export const DefaultToolbar = { render: () => editor({ "default-toolbar": "" }, (el) => (el.value = tableDoc(basic))) };

/** A table just under a pinned toolbar, in a document tall enough for the page to scroll: the bar must clear the toolbar. */
export const StickyToolbar = {
  render: () =>
    editor({ "default-toolbar": "", "toolbar-mode": "sticky" }, (el) => {
      const filler = Array.from({ length: 40 }, (_, i) => para(`Filler paragraph ${i + 1}, so the page has somewhere to scroll.`));
      const doc = JSON.parse(tableDoc(basic)) as { root: { children: unknown[] } };
      doc.root.children.push(...filler);
      el.value = JSON.stringify(doc);
    }),
};

/** Two tables, to see grips follow the pointer rather than the caret. */
export const TwoTables = {
  render: () =>
    editor({}, (el) => {
      const a = JSON.parse(tableDoc(basic)) as { root: { children: unknown[] } };
      const b = JSON.parse(tableDoc(basic, [120, 120, 240])) as { root: { children: unknown[] } };
      a.root.children.push(...b.root.children);
      el.value = JSON.stringify(a);
    }),
};
