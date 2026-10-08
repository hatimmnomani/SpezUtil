import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  PASTE_COMMAND,
  PASTE_TAG,
  type LexicalEditor,
} from "lexical";
import { $insertGeneratedNodes } from "@lexical/clipboard";
import { $generateNodesFromDOM } from "@lexical/html";
import { $isTableSelection } from "@lexical/table";
import { sanitizeCellColor } from "./model";

/** Spans are clamped here; the handbook's server renderer clamps at the same limit. */
const MAX_SPAN = 50;
const MAX_PASTED_COLS = 50;
const MAX_PASTED_ROWS = 500;

const WHITE = /^(#fff(fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*1\s*\))$/i;
const SAFE_HREF = /^(https?:|mailto:|tel:|#|\/)/i;
const DROP_TAGS = new Set(["STYLE", "SCRIPT", "META", "LINK", "TITLE", "XML", "HEAD", "IMG", "SVG", "OBJECT", "IFRAME", "CANVAS", "NOSCRIPT", "TEMPLATE"]);
const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "PRE", "BLOCKQUOTE", "SECTION", "ARTICLE", "HEADER", "FOOTER", "FIGURE", "ADDRESS", "CENTER"]);

type Format = { b?: boolean; i?: boolean; u?: boolean; s?: boolean; sub?: boolean; sup?: boolean; code?: boolean };

interface CellPlan {
  src: HTMLTableCellElement;
  row: number;
  col: number;
  colSpan: number;
  rowSpan: number;
  header: boolean;
}

export interface CleanedPaste {
  html: string;
  /** True when at least one table was found and rebuilt. */
  hasTable: boolean;
}

function intAttr(el: Element, name: string): number {
  const n = Number.parseInt(el.getAttribute(name) ?? "", 10);
  return Number.isFinite(n) && n > 1 ? Math.min(n, MAX_SPAN) : 1;
}

function styleOf(el: Element): CSSStyleDeclaration | null {
  return (el as HTMLElement).style ?? null;
}

/** Formats a source element implies through its tag or inline style; everything else about it is dropped. */
function formatFor(el: Element, inherited: Format): Format {
  const next: Format = { ...inherited };
  switch (el.tagName) {
    case "B": case "STRONG": next.b = true; break;
    case "I": case "EM": case "CITE": next.i = true; break;
    case "U": case "INS": next.u = true; break;
    case "S": case "STRIKE": case "DEL": next.s = true; break;
    case "SUB": next.sub = true; break;
    case "SUP": next.sup = true; break;
    case "CODE": case "TT": case "KBD": case "SAMP": next.code = true; break;
  }
  const style = styleOf(el);
  if (style) {
    const weight = style.fontWeight;
    if (weight === "bold" || weight === "bolder" || Number(weight) >= 600) next.b = true;
    else if (weight === "normal" || (weight !== "" && Number(weight) > 0 && Number(weight) < 600)) next.b = false;
    if (style.fontStyle === "italic" || style.fontStyle === "oblique") next.i = true;
    else if (style.fontStyle === "normal") next.i = false;
    const deco = `${style.textDecoration} ${style.getPropertyValue("text-decoration-line")}`;
    if (/underline/.test(deco)) next.u = true;
    if (/line-through/.test(deco)) next.s = true;
  }
  return next;
}

function wrapWith(doc: Document, fmt: Format, text: string): Node {
  let node: Node = doc.createTextNode(text);
  const wrap = (tag: string) => {
    const el = doc.createElement(tag);
    el.append(node);
    node = el;
  };
  if (fmt.code) wrap("code");
  if (fmt.sub) wrap("sub");
  if (fmt.sup) wrap("sup");
  if (fmt.s) wrap("s");
  if (fmt.u) wrap("u");
  if (fmt.i) wrap("em");
  if (fmt.b) wrap("strong");
  return node;
}

/** Collects a cell's content as clean blocks: plain `<p>` runs carrying only bold/italic/underline/strike/sub/sup/code and safe links. */
function cleanCellContent(cell: HTMLElement, doc: Document): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  let current: HTMLElement | null = null;
  let link: HTMLAnchorElement | null = null;
  let blockAlign: string | null = null;

  const para = (): HTMLElement => {
    if (current === null) {
      current = doc.createElement("p");
      if (blockAlign) current.setAttribute("data-align", blockAlign);
      blocks.push(current);
    }
    return current;
  };
  const endBlock = () => {
    current = null;
  };
  const target = (): Node => link ?? para();

  const visit = (node: Node, fmt: Format): void => {
    if (node.nodeType === 3) {
      // Source line wrapping and NBSP padding are layout noise, not content.
      const text = (node.nodeValue ?? "").replace(/[\s ]+/g, " ");
      if (text === "" || (text === " " && current === null && link === null)) return;
      target().appendChild(wrapWith(doc, fmt, text));
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as Element;
    if (DROP_TAGS.has(el.tagName.toUpperCase())) return;
    if (el.tagName === "BR") {
      if (current !== null) current.appendChild(doc.createElement("br"));
      else para();
      return;
    }
    if (el.tagName === "TABLE") {
      // Nested tables are flattened to their text, one paragraph per row.
      for (const row of Array.from(el.querySelectorAll("tr"))) {
        endBlock();
        const text = Array.from(row.children).map((c) => (c.textContent ?? "").replace(/[\s ]+/g, " ").trim()).filter(Boolean).join(" | ");
        if (text) para().appendChild(doc.createTextNode(text));
        endBlock();
      }
      return;
    }
    if (el.tagName === "A") {
      const href = el.getAttribute("href") ?? "";
      if (SAFE_HREF.test(href.trim()) && link === null) {
        const a = doc.createElement("a");
        a.setAttribute("href", href.trim());
        para().appendChild(a);
        link = a;
        for (const child of Array.from(el.childNodes)) visit(child, formatFor(el, fmt));
        link = null;
        if (!a.hasChildNodes()) a.remove();
        return;
      }
    }
    const next = formatFor(el, fmt);
    const isBlock = BLOCK_TAGS.has(el.tagName);
    const previousAlign = blockAlign;
    if (isBlock) {
      endBlock();
      const a = alignmentOf(el as HTMLElement);
      if (a) blockAlign = a;
    }
    for (const child of Array.from(el.childNodes)) visit(child, next);
    if (isBlock) {
      endBlock();
      blockAlign = previousAlign;
    }
  };

  const base = formatFor(cell, {});
  for (const child of Array.from(cell.childNodes)) visit(child, base);

  // Trim stray edge whitespace / breaks and discard empty paragraphs.
  const kept: HTMLElement[] = [];
  for (const block of blocks) {
    const first = block.firstChild;
    if (first && first.nodeType === 3) first.nodeValue = (first.nodeValue ?? "").replace(/^\s+/, "");
    const last = block.lastChild;
    if (last && last.nodeType === 3) last.nodeValue = (last.nodeValue ?? "").replace(/\s+$/, "");
    while (block.lastChild && block.lastChild.nodeName === "BR") block.lastChild.remove();
    kept.push(block);
  }
  return kept.filter((b) => (b.textContent ?? "").trim() !== "");
}

function alignmentOf(cell: HTMLElement): string | null {
  const raw = (styleOf(cell)?.textAlign || cell.getAttribute("align") || "").toLowerCase();
  return ["left", "center", "right", "justify", "start", "end"].includes(raw) ? raw : null;
}

function verticalAlignOf(cell: HTMLElement): "middle" | null {
  const raw = (styleOf(cell)?.verticalAlign || cell.getAttribute("valign") || "").toLowerCase();
  if (raw === "middle" || raw === "center") return "middle";
  // Spreadsheets bottom-align every cell by default, so "bottom" is noise rather than intent.
  return null;
}

/** Browsers report computed-style colours as rgb(); store the tidier #rrggbb when it is lossless. */
function normalizeColor(value: string): string | null {
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value);
  if (rgb) {
    if (rgb[4] !== undefined && Number(rgb[4]) < 1) return null; // translucent: not a cell fill
    return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("")}`;
  }
  return value.toLowerCase();
}

function backgroundOf(cell: HTMLElement): string | null {
  const style = styleOf(cell);
  const raw = (style?.backgroundColor || cell.getAttribute("bgcolor") || "").trim();
  if (raw === "" || WHITE.test(raw)) return null;
  const color = sanitizeCellColor(raw);
  const normalized = color === null ? null : normalizeColor(color);
  return normalized === null || WHITE.test(normalized) ? null : normalized;
}

function rowsOf(table: HTMLTableElement): { row: HTMLTableRowElement; inHead: boolean }[] {
  const head: { row: HTMLTableRowElement; inHead: boolean }[] = [];
  const body: { row: HTMLTableRowElement; inHead: boolean }[] = [];
  const foot: { row: HTMLTableRowElement; inHead: boolean }[] = [];
  for (const tr of Array.from(table.querySelectorAll("tr"))) {
    if (tr.closest("table") !== table) continue; // belongs to a nested table
    const section = tr.parentElement?.tagName;
    const entry = { row: tr as HTMLTableRowElement, inHead: section === "THEAD" };
    (section === "THEAD" ? head : section === "TFOOT" ? foot : body).push(entry);
  }
  return [...head, ...body, ...foot];
}

/** Rebuilds one source table as plain, rectangular, style-free markup. */
export function cleanTable(source: HTMLTableElement, doc: Document): HTMLTableElement {
  const rows = rowsOf(source).slice(0, MAX_PASTED_ROWS);
  const plans: CellPlan[] = [];
  const occupied: boolean[][] = rows.map(() => []);
  let totalCols = 0;

  rows.forEach(({ row, inHead }, r) => {
    let c = 0;
    for (const child of Array.from(row.children)) {
      if (child.tagName !== "TD" && child.tagName !== "TH") continue;
      while (occupied[r]![c]) c++;
      if (c >= MAX_PASTED_COLS) break;
      const colSpan = Math.min(intAttr(child, "colspan"), MAX_PASTED_COLS - c);
      const rowSpan = Math.min(intAttr(child, "rowspan"), rows.length - r);
      for (let dr = 0; dr < rowSpan; dr++) for (let dc = 0; dc < colSpan; dc++) occupied[r + dr]![c + dc] = true;
      plans.push({ src: child as HTMLTableCellElement, row: r, col: c, colSpan, rowSpan, header: child.tagName === "TH" || inHead });
      c += colSpan;
      totalCols = Math.max(totalCols, c);
    }
  });

  const table = doc.createElement("table");
  const tbody = doc.createElement("tbody");
  table.append(tbody);
  rows.forEach((_, r) => {
    const tr = doc.createElement("tr");
    for (const plan of plans.filter((p) => p.row === r)) {
      const cell = doc.createElement(plan.header ? "th" : "td");
      if (plan.colSpan > 1) cell.setAttribute("colspan", String(plan.colSpan));
      if (plan.rowSpan > 1) cell.setAttribute("rowspan", String(plan.rowSpan));
      const css: string[] = [];
      const bg = backgroundOf(plan.src);
      if (bg) css.push(`background-color:${bg}`);
      const va = verticalAlignOf(plan.src);
      if (va) css.push(`vertical-align:${va}`);
      if (css.length) cell.setAttribute("style", css.join(";"));
      const align = alignmentOf(plan.src);
      const blocks = cleanCellContent(plan.src, doc);
      if (blocks.length === 0) blocks.push(doc.createElement("p"));
      for (const block of blocks) {
        const own = block.getAttribute("data-align") ?? align;
        block.removeAttribute("data-align");
        if (own) block.setAttribute("style", `text-align:${own}`);
        cell.append(block);
      }
      tr.append(cell);
    }
    // Ragged rows (Excel drops trailing empties) are padded so the grid is rectangular.
    let filled = 0;
    for (let c = 0; c < totalCols; c++) if (occupied[r]![c]) filled++;
    for (let missing = totalCols - filled; missing > 0; missing--) {
      const cell = doc.createElement("td");
      cell.append(doc.createElement("p"));
      tr.append(cell);
    }
    tbody.append(tr);
  });
  return table;
}

/**
 * Normalises pasted HTML for the editor. Every table (from Excel, Google Sheets, Word, a web page) is
 * rebuilt from scratch: structure, merged cells (clamped), header cells, a plain background colour,
 * alignment and bold / italic / underline / strike / links survive; fonts, sizes, colours, classes,
 * widths, Office markup and tracking attributes do not. Content outside tables is left as it came.
 */
export function cleanPastedHtml(html: string): CleanedPaste {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = Array.from(doc.body.querySelectorAll("table")).filter(
    (t) => t.parentElement?.closest("table") == null,
  );
  for (const t of Array.from(doc.querySelectorAll("style, script, meta, link, xml"))) t.remove();
  // Office wraps the fragment in conditional comments and StartFragment markers.
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  for (const c of comments) c.parentNode?.removeChild(c);
  if (tables.length === 0) return { html: doc.body.innerHTML, hasTable: false };
  for (const table of tables) table.replaceWith(cleanTable(table, doc));
  // Custom wrapper elements (<google-sheets-html-origin>) carry nothing the editor can use.
  for (const el of Array.from(doc.body.querySelectorAll("*"))) {
    if (el.tagName.includes("-")) el.replaceWith(...Array.from(el.childNodes));
  }
  return { html: doc.body.innerHTML, hasTable: true };
}

/** True when a clipboard payload is an HTML table from outside this editor. */
export function shouldCleanPaste(data: Pick<DataTransfer, "getData">): boolean {
  if (data.getData("application/x-lexical-editor") !== "") return false;
  return /<table[\s>]/i.test(data.getData("text/html"));
}

function clipboardOf(event: Event): Pick<DataTransfer, "getData" | "types"> | null {
  const data = (event as ClipboardEvent).clipboardData ?? (event as InputEvent).dataTransfer;
  return data ?? null;
}

/**
 * Intercepts paste when the clipboard carries an HTML table from outside the editor and inserts the
 * cleaned version instead. Content copied from this editor (it carries Lexical's own payload) and
 * everything without a table take the stock path untouched.
 */
export function registerTablePaste(editor: LexicalEditor): () => void {
  return editor.registerCommand<Event>(
    PASTE_COMMAND,
    (event) => {
      const data = clipboardOf(event);
      if (data === null) return false;
      if (!shouldCleanPaste(data)) return false;
      const cleaned = cleanPastedHtml(data.getData("text/html"));
      if (!cleaned.hasTable) return false;
      event.preventDefault();
      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) && !$isTableSelection(selection)) return;
          const dom = new DOMParser().parseFromString(cleaned.html, "text/html");
          $insertGeneratedNodes(editor, $generateNodesFromDOM(editor, dom), selection);
        },
        { tag: PASTE_TAG },
      );
      return true;
    },
    COMMAND_PRIORITY_LOW,
  );
}
