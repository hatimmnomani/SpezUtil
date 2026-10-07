import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  type LexicalEditor,
} from "lexical";
import { $findTableNode, $isTableNode, type TableNode } from "@lexical/table";
import type { EditorLocale } from "../locale";
import { announceTable, deleteTableSafely, setTableAnnouncer } from "./actions";
import { tableIcon, type TableIconName } from "./icons";
import {
  $cellAt,
  $clearCells,
  $columnCount,
  $deleteColumns,
  $deleteRows,
  $getTableSelectionInfo,
  $insertColumn,
  $insertRow,
  $isHeaderColumn,
  $isHeaderRow,
  $canMerge,
  $canSplit,
  $mergeSelection,
  $moveColumn,
  $moveRow,
  $rowCount,
  $selectColumn,
  $selectRow,
  $setCellAlignment,
  $setCellBackground,
  $setCellVerticalAlign,
  $setColumnWidth,
  $setColumnWidths,
  $splitSelection,
  $toggleHeaderColumn,
  $toggleHeaderRow,
  $tableMap,
  clampColumnWidth,
  sanitizeCellColor,
  type CellAlignment,
  type CellRect,
  type CellVerticalAlign,
} from "./model";
import { placeBar, type Box } from "./placement";
import { fillTemplate, getTableStrings, type TableStrings } from "./strings";

export interface TableUIOptions {
  /** `.spez-rte-shell`: positioned ancestor the overlay is laid out in. */
  shell: HTMLElement;
  /** The contenteditable root. */
  editable: HTMLElement;
  getLocale: () => EditorLocale;
  /** False hides the bar, grips and resize strips (keyboard, paste and the picker stay). */
  isEnabled: () => boolean;
}

export interface TableUIController {
  refresh: () => void;
  dispose: () => void;
}

/** Light cell fills. Mirrors the main toolbar's highlight palette so the two feel like one product. */
const FILLS: readonly { name: string; value: string }[] = [
  { name: "Yellow", value: "#fff59d" },
  { name: "Orange", value: "#ffe0b2" },
  { name: "Red", value: "#ffcdd2" },
  { name: "Pink", value: "#f8bbd0" },
  { name: "Purple", value: "#e1bee7" },
  { name: "Blue", value: "#bbdefb" },
  { name: "Teal", value: "#b2dfdb" },
  { name: "Green", value: "#c8e6c9" },
  { name: "Brown", value: "#d7ccc8" },
  { name: "Gray", value: "#e0e0e0" },
  { name: "Dark gray", value: "#bdbdbd" },
  { name: "White", value: "#ffffff" },
];

interface Snapshot {
  tableKey: string;
  rows: number;
  cols: number;
  rect: CellRect;
  anchorKey: string;
  selectedCount: number;
  isRange: boolean;
  canMerge: boolean;
  canSplit: boolean;
  headerRow: boolean;
  headerColumn: boolean;
  /** One cell key per row (the row's first cell). */
  rowKeys: string[];
  /** For each column, a cell whose last column it is (for the right/left edge). */
  colEndKeys: (string | null)[];
  /** And one that starts there (for the column's own extent). */
  colStartKeys: (string | null)[];
  /** True when the caret / selection is inside this table (as opposed to merely hovered). */
  active: boolean;
  alignment: CellAlignment;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};

/** Buttons in the overlay must not steal the editor's selection when pressed. */
const keepSelection = (b: HTMLElement) => b.addEventListener("pointerdown", (e) => e.preventDefault());

export function registerTableUI(editor: LexicalEditor, options: TableUIOptions): TableUIController {
  const { shell, editable } = options;
  let strings: TableStrings = getTableStrings(options.getLocale());

  const root = el("div", "spez-rte-tui");
  const live = el("div", "spez-rte-tlive");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("role", "status");
  const bar = el("div", "spez-rte-tbar");
  bar.setAttribute("role", "toolbar");
  bar.hidden = true;
  const handles = el("div");
  const ring = el("div", "spez-rte-tring");
  ring.hidden = true;
  root.append(live, ring, handles, bar);
  shell.append(root);

  let hoveredKey: string | null = null;
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  let blurred = false;
  let frame = 0;
  let dragging = false;
  let closeMenu: (() => void) | null = null;
  let snap: Snapshot | null = null;
  let barButtons: HTMLButtonElement[] = [];
  const barState = new Map<string, HTMLButtonElement>();

  // ---- announcements ------------------------------------------------------------------------
  let lastSelectedCount = 1;
  setTableAnnouncer(editor, (key, values) => {
    const text = fillTemplate(strings[key], values ?? {});
    live.textContent = "";
    requestAnimationFrame(() => {
      live.textContent = text;
    });
  });

  // ---- snapshot -----------------------------------------------------------------------------
  const takeSnapshot = (): Snapshot | null =>
    editor.getEditorState().read(() => {
      const info = $getTableSelectionInfo();
      let table: TableNode | null = info?.table ?? null;
      if (table === null && hoveredKey !== null) {
        const n = $getNodeByKey(hoveredKey);
        table = $isTableNode(n) ? n : null;
      }
      if (table === null) return null;
      const rows = $rowCount(table);
      const cols = $columnCount(table);
      const rowKeys: string[] = [];
      for (let r = 0; r < rows; r++) rowKeys.push($cellAt(table, r, 0)?.getKey() ?? "");
      const map = $tableMap(table);
      const colEndKeys: (string | null)[] = new Array(cols).fill(null);
      const colStartKeys: (string | null)[] = new Array(cols).fill(null);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = map[r]?.[c];
          if (!v) continue;
          if (v.startColumn === c && colStartKeys[c] === null) colStartKeys[c] = v.cell.getKey();
          if (v.startColumn + v.cell.getColSpan() - 1 === c && colEndKeys[c] === null) colEndKeys[c] = v.cell.getKey();
        }
      }
      const active = info !== null;
      const first = info?.cells[0];
      const align = (first?.getFirstChild() as { getFormatType?: () => string } | null)?.getFormatType?.() ?? "";
      return {
        tableKey: table.getKey(),
        rows,
        cols,
        rect: info?.rect ?? { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 },
        anchorKey: info?.anchor.getKey() ?? "",
        selectedCount: info?.cells.length ?? 0,
        isRange: info?.isRange ?? false,
        canMerge: $canMerge(info),
        canSplit: $canSplit(info),
        headerRow: $isHeaderRow(table),
        headerColumn: $isHeaderColumn(table),
        rowKeys,
        colEndKeys,
        colStartKeys,
        active,
        alignment: align as CellAlignment,
      };
    });

  // ---- geometry -----------------------------------------------------------------------------
  const shellBox = () => shell.getBoundingClientRect();
  const rel = (r: DOMRect): Box => {
    const s = shellBox();
    return { left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height };
  };
  const domOf = (key: string): HTMLElement | null => editor.getElementByKey(key);
  const tableElOf = (key: string): HTMLTableElement | null => {
    const dom = domOf(key);
    if (dom === null) return null;
    return dom instanceof HTMLTableElement ? dom : dom.querySelector("table");
  };
  const isRtl = (node: Element) => getComputedStyle(node).direction === "rtl";

  // ---- table widths (DOM-only: colWidths -> exact table width) --------------------------------
  const syncWidths = () => {
    for (const table of Array.from(editable.querySelectorAll<HTMLTableElement>("table.spez-rte-table"))) {
      const cols = Array.from(table.querySelectorAll<HTMLElement>(":scope > colgroup > col"));
      const widths = cols.map((c) => Number.parseFloat(c.style.width));
      if (cols.length > 0 && widths.every((w) => Number.isFinite(w))) {
        table.style.width = `${widths.reduce((a, b) => a + b, 0)}px`;
        table.dataset.spezW = "";
      } else if (table.dataset.spezW !== undefined) {
        table.style.removeProperty("width");
        delete table.dataset.spezW;
      }
    }
  };

  // ---- primitives ---------------------------------------------------------------------------
  const iconButton = (
    icon: TableIconName,
    label: string,
    onClick: (b: HTMLButtonElement) => void,
    stateKey?: string,
  ): HTMLButtonElement => {
    const b = el("button");
    b.type = "button";
    b.title = label;
    b.setAttribute("aria-label", label);
    b.append(tableIcon(icon));
    keepSelection(b);
    b.addEventListener("click", () => onClick(b));
    if (stateKey) barState.set(stateKey, b);
    return b;
  };

  const run = (fn: () => void) => {
    editor.update(fn);
  };

  const closeAnyMenu = () => {
    closeMenu?.();
    closeMenu = null;
  };

  /** Opens a menu next to `anchor` (shell coordinates); Escape / outside click closes it. */
  const openMenu = (anchor: Box, content: HTMLElement, opener?: HTMLElement): (() => void) => {
    closeAnyMenu();
    const menu = el("div", "spez-rte-tmenu");
    menu.setAttribute("role", "menu");
    menu.append(content);
    root.append(menu);
    const sw = shell.clientWidth;
    const rtl = isRtl(shell);
    let left = rtl ? anchor.left + anchor.width - menu.offsetWidth : anchor.left;
    left = Math.max(4, Math.min(left, sw - menu.offsetWidth - 4));
    menu.style.left = `${left}px`;
    menu.style.top = `${anchor.top + anchor.height + 4}px`;
    opener?.setAttribute("aria-expanded", "true");
    const items = () => Array.from(menu.querySelectorAll<HTMLElement>("button:not(:disabled), input"));
    const onDown = (e: Event) => {
      if (!menu.contains(e.target as Node) && !(opener && opener.contains(e.target as Node))) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        editor.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const list = items();
        const i = list.indexOf(document.activeElement as HTMLElement);
        const next = list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length];
        if (next) {
          e.preventDefault();
          next.focus();
        }
      }
    };
    const close = () => {
      menu.remove();
      opener?.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", onDown, true);
      menu.removeEventListener("keydown", onKey);
      if (closeMenu === close) closeMenu = null;
    };
    document.addEventListener("pointerdown", onDown, true);
    menu.addEventListener("keydown", onKey);
    closeMenu = close;
    (menu.querySelector<HTMLElement>("[data-autofocus]") ?? items()[0])?.focus();
    return close;
  };

  const menuItem = (icon: TableIconName | null, label: string, onClick: () => void, disabled = false) => {
    const b = el("button");
    b.type = "button";
    b.setAttribute("role", "menuitem");
    if (icon) b.append(tableIcon(icon));
    b.append(document.createTextNode(label));
    b.disabled = disabled;
    keepSelection(b);
    b.addEventListener("click", () => {
      closeAnyMenu();
      onClick();
      editor.focus();
    });
    return b;
  };

  // ---- structural actions -------------------------------------------------------------------
  const counts = (t: TableNode) => ({ rows: $rowCount(t), cols: $columnCount(t) });

  const withInfo = (fn: (info: NonNullable<ReturnType<typeof $getTableSelectionInfo>>) => void) =>
    run(() => {
      const info = $getTableSelectionInfo();
      if (info) fn(info);
    });

  const withTable = (key: string, fn: (t: TableNode) => void) =>
    run(() => {
      const t = $getNodeByKey(key);
      if ($isTableNode(t)) fn(t);
    });

  /** "Left"/"right" are visual; in an RTL table the visually-left column is the later one. */
  const visualAfter = (rightSide: boolean, tableKey: string): "before" | "after" => {
    const t = tableElOf(tableKey);
    const rtl = t ? isRtl(t) : isRtl(editable);
    return rightSide !== rtl ? "after" : "before";
  };

  const insertRowAt = (key: string, row: number, where: "before" | "after") =>
    withTable(key, (t) => {
      $insertRow(t, row, where);
      $cellAt(t, where === "after" ? row + 1 : row, 0)?.selectEnd();
      announceTable(editor, "rowAdded", counts(t));
    });

  const insertColAt = (key: string, col: number, where: "before" | "after") =>
    withTable(key, (t) => {
      $insertColumn(t, col, where);
      $cellAt(t, 0, where === "after" ? col + 1 : col)?.selectEnd();
      announceTable(editor, "columnAdded", counts(t));
    });

  const deleteRowsOf = (key: string, min: number, max: number) =>
    withTable(key, (t) => {
      if (min <= 0 && max >= $rowCount(t) - 1) {
        void deleteTableSafely(editor, key).then(() => announceTable(editor, "tableDeleted"));
        return;
      }
      $deleteRows(t, min, max);
      announceTable(editor, "rowsDeleted", counts(t));
    });

  const deleteColsOf = (key: string, min: number, max: number) =>
    withTable(key, (t) => {
      if (min <= 0 && max >= $columnCount(t) - 1) {
        void deleteTableSafely(editor, key).then(() => announceTable(editor, "tableDeleted"));
        return;
      }
      $deleteColumns(t, min, max);
      announceTable(editor, "columnsDeleted", counts(t));
    });

  const deleteTable = (key: string) => {
    void deleteTableSafely(editor, key).then(() => announceTable(editor, "tableDeleted"));
  };

  // ---- popovers on the bar ------------------------------------------------------------------
  const colorMenu = (anchor: HTMLElement) => {
    const wrap = el("div");
    const grid = el("div", "spez-rte-tswatches");
    const apply = (value: string | null) =>
      withInfo((info) => $setCellBackground(info.cells, value));
    const none = menuItem("clear", strings.noFill, () => apply(null));
    for (const { name, value } of FILLS) {
      const s = el("button", "spez-rte-swatch");
      s.type = "button";
      s.title = name;
      s.setAttribute("aria-label", name);
      s.style.setProperty("--swatch", value);
      keepSelection(s);
      s.addEventListener("click", () => {
        closeAnyMenu();
        apply(value);
        editor.focus();
      });
      grid.append(s);
    }
    const custom = el("label");
    const input = el("input");
    input.type = "color";
    input.value = "#ffff99";
    input.setAttribute("aria-label", strings.customColor);
    input.addEventListener("change", () => {
      const v = sanitizeCellColor(input.value);
      closeAnyMenu();
      if (v) apply(v);
      editor.focus();
    });
    custom.append(input, document.createTextNode(strings.customColor));
    wrap.append(grid, none, custom);
    openMenu(rel(anchor.getBoundingClientRect()), wrap, anchor);
  };

  const alignMenu = (anchor: HTMLElement) => {
    const wrap = el("div");
    const rowOf = (items: [TableIconName, string, () => void][]) => {
      const row = el("div", "spez-rte-tmenu-row");
      row.setAttribute("role", "group");
      for (const [icon, label, fn] of items) {
        const b = iconButton(icon, label, () => {
          closeAnyMenu();
          fn();
          editor.focus();
        });
        b.setAttribute("role", "menuitem");
        row.append(b);
      }
      return row;
    };
    const h = (f: CellAlignment) => () => withInfo((info) => $setCellAlignment(info.cells, f));
    const v = (a: CellVerticalAlign) => () => withInfo((info) => $setCellVerticalAlign(info.cells, a));
    wrap.append(
      rowOf([
        ["alignStart", strings.alignStart, h("start")],
        ["alignCenter", strings.alignCenter, h("center")],
        ["alignEnd", strings.alignEnd, h("end")],
        ["alignJustify", strings.alignJustify, h("justify")],
      ]),
      rowOf([
        ["vTop", strings.alignTop, v("top")],
        ["vMiddle", strings.alignMiddle, v("middle")],
        ["vBottom", strings.alignBottom, v("bottom")],
      ]),
    );
    openMenu(rel(anchor.getBoundingClientRect()), wrap, anchor);
  };

  // ---- the floating bar ---------------------------------------------------------------------
  const buildBar = () => {
    bar.replaceChildren();
    barState.clear();
    bar.setAttribute("aria-label", strings.toolbar);
    const g = (...children: HTMLElement[]) => {
      const group = el("div", "spez-rte-tbar-group");
      group.setAttribute("role", "group");
      group.append(...children);
      bar.append(group);
    };
    g(
      iconButton("rowAbove", strings.insertRowAbove, () => withInfo((i) => { $insertRow(i.table, i.rect.minRow, "before"); $cellAt(i.table, i.rect.minRow, i.rect.minCol)?.selectEnd(); announceTable(editor, "rowAdded", counts(i.table)); })),
      iconButton("rowBelow", strings.insertRowBelow, () => withInfo((i) => { $insertRow(i.table, i.rect.maxRow, "after"); $cellAt(i.table, i.rect.maxRow + 1, i.rect.minCol)?.selectEnd(); announceTable(editor, "rowAdded", counts(i.table)); })),
      iconButton("colLeft", strings.insertColumnLeft, () => snap && insertColAt(snap.tableKey, visualAfter(false, snap.tableKey) === "before" ? snap.rect.minCol : snap.rect.maxCol, visualAfter(false, snap.tableKey))),
      iconButton("colRight", strings.insertColumnRight, () => snap && insertColAt(snap.tableKey, visualAfter(true, snap.tableKey) === "after" ? snap.rect.maxCol : snap.rect.minCol, visualAfter(true, snap.tableKey))),
    );
    g(
      iconButton("deleteRow", strings.deleteRow, () => snap && deleteRowsOf(snap.tableKey, snap.rect.minRow, snap.rect.maxRow)),
      iconButton("deleteColumn", strings.deleteColumn, () => snap && deleteColsOf(snap.tableKey, snap.rect.minCol, snap.rect.maxCol)),
      iconButton("deleteTable", strings.deleteTable, () => snap && deleteTable(snap.tableKey)),
    );
    g(
      iconButton("merge", strings.mergeCells, () => withInfo((i) => { if ($mergeSelection(i)) announceTable(editor, "merged"); }), "merge"),
      iconButton("split", strings.splitCell, () => withInfo((i) => { if ($splitSelection(i) > 0) announceTable(editor, "split"); }), "split"),
    );
    const hr = iconButton("headerRow", strings.headerRow, () => withTable(snap!.tableKey, (t) => announceTable(editor, $toggleHeaderRow(t) ? "headerRowOn" : "headerRowOff")), "headerRow");
    const hc = iconButton("headerColumn", strings.headerColumn, () => withTable(snap!.tableKey, (t) => announceTable(editor, $toggleHeaderColumn(t) ? "headerColumnOn" : "headerColumnOff")), "headerColumn");
    g(hr, hc);
    const fill = iconButton("fill", strings.cellBackground, (b) => colorMenu(b));
    fill.setAttribute("aria-haspopup", "menu");
    fill.setAttribute("aria-expanded", "false");
    const al = iconButton("cellAlign", strings.cellAlignment, (b) => alignMenu(b));
    al.setAttribute("aria-haspopup", "menu");
    al.setAttribute("aria-expanded", "false");
    g(fill, al, iconButton("clear", strings.clearContents, () => withInfo((i) => { $clearCells(i.cells); announceTable(editor, "cleared"); })));

    barButtons = Array.from(bar.querySelectorAll("button"));
    barButtons.forEach((b, i) => (b.tabIndex = i === 0 ? 0 : -1));
  };

  bar.addEventListener("keydown", (e) => {
    const list = barButtons.filter((b) => !b.disabled);
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      editor.focus();
      return;
    }
    if (i === -1) return;
    const rtl = isRtl(bar);
    let n = i;
    if (e.key === "ArrowRight") n = i + (rtl ? -1 : 1);
    else if (e.key === "ArrowLeft") n = i + (rtl ? 1 : -1);
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = list.length - 1;
    else return;
    e.preventDefault();
    n = (n + list.length) % list.length;
    for (const b of barButtons) b.tabIndex = -1;
    list[n]!.tabIndex = 0;
    list[n]!.focus();
  });

  const onAltF10 = (e: KeyboardEvent) => {
    if (e.key !== "F9" || !e.altKey || bar.hidden) return;
    e.preventDefault();
    (barButtons.find((b) => b.tabIndex === 0 && !b.disabled) ?? barButtons.find((b) => !b.disabled))?.focus();
  };
  editable.addEventListener("keydown", onAltF10);

  const updateBarState = (s: Snapshot) => {
    const set = (k: string, v: { disabled?: boolean; pressed?: boolean }) => {
      const b = barState.get(k);
      if (!b) return;
      if (v.disabled !== undefined) b.disabled = v.disabled;
      if (v.pressed !== undefined) b.setAttribute("aria-pressed", String(v.pressed));
    };
    set("merge", { disabled: !s.canMerge });
    set("split", { disabled: !s.canSplit });
    set("headerRow", { pressed: s.headerRow });
    set("headerColumn", { pressed: s.headerColumn });
  };

  // ---- grips, add buttons, resize strips ----------------------------------------------------
  const startResize = (s: Snapshot, col: number, strip: HTMLElement, ev: PointerEvent, widths: number[], rtl: boolean) => {
    const table = tableElOf(s.tableKey);
    if (!table) return;
    ev.preventDefault();
    closeAnyMenu();
    dragging = true;
    strip.setPointerCapture(ev.pointerId);
    strip.dataset.dragging = "";
    const startX = ev.clientX;
    const startW = widths[col]!;
    const next = widths.slice();
    const cols = Array.from(table.querySelectorAll<HTMLElement>(":scope > colgroup > col"));
    const paint = () => {
      cols.forEach((c, i) => (c.style.width = `${next[i]}px`));
      table.style.width = `${next.reduce((a, b) => a + b, 0)}px`;
      table.dataset.spezW = "";
    };
    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX - startX) * (rtl ? -1 : 1);
      next[col] = clampColumnWidth(startW + dx);
      paint();
      strip.style.transform = `translateX(${(next[col]! - startW) * (rtl ? -1 : 1)}px)`;
    };
    const finish = (commit: boolean) => {
      strip.removeEventListener("pointermove", onMove);
      strip.removeEventListener("pointerup", onUp);
      strip.removeEventListener("pointercancel", onCancel);
      document.removeEventListener("keydown", onKey, true);
      dragging = false;
      delete strip.dataset.dragging;
      strip.style.transform = "";
      if (commit && next[col] !== startW) {
        const key = s.tableKey;
        const final = next.slice();
        run(() => {
          const t = $getNodeByKey(key);
          if (!$isTableNode(t)) return;
          $setColumnWidths(t, final);
          announceTable(editor, "widthSet", { n: col + 1, w: final[col]! });
        });
      } else {
        cols.forEach((c, i) => (c.style.width = `${widths[i]}px`));
        syncWidths();
        schedule();
      }
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        finish(false);
      }
    };
    strip.addEventListener("pointermove", onMove);
    strip.addEventListener("pointerup", onUp);
    strip.addEventListener("pointercancel", onCancel);
    document.addEventListener("keydown", onKey, true);
  };

  const gripMenu = (s: Snapshot, kind: "row" | "column", index: number, anchor: HTMLElement) => {
    const wrap = el("div");
    const key = s.tableKey;
    const t = tableElOf(key);
    const rtl = t ? isRtl(t) : false;
    const simple = editor.getEditorState().read(() => {
      const n = $getNodeByKey(key);
      return $isTableNode(n) && n.getChildren().every((r) => "getChildren" in r && (r as unknown as { getChildren(): { getColSpan(): number; getRowSpan(): number }[] }).getChildren().every((c) => c.getColSpan() === 1 && c.getRowSpan() === 1));
    });
    const items: HTMLElement[] = [];
    if (kind === "row") {
      items.push(
        menuItem("rowAbove", strings.insertRowAbove, () => insertRowAt(key, index, "before")),
        menuItem("rowBelow", strings.insertRowBelow, () => insertRowAt(key, index, "after")),
        menuItem("arrowUp", strings.moveRowUp, () => withTable(key, (tb) => { if ($moveRow(tb, index, index - 1)) announceTable(editor, "moved"); }), !simple || index === 0),
        menuItem("arrowDown", strings.moveRowDown, () => withTable(key, (tb) => { if ($moveRow(tb, index, index + 1)) announceTable(editor, "moved"); }), !simple || index >= s.rows - 1),
      );
    } else {
      items.push(
        menuItem("colLeft", strings.insertColumnLeft, () => insertColAt(key, index, rtl ? "after" : "before")),
        menuItem("colRight", strings.insertColumnRight, () => insertColAt(key, index, rtl ? "before" : "after")),
        menuItem("arrowLeft", strings.moveColumnLeft, () => withTable(key, (tb) => { if ($moveColumn(tb, index, index + (rtl ? 1 : -1))) announceTable(editor, "moved"); }), !simple || (rtl ? index >= s.cols - 1 : index === 0)),
        menuItem("arrowRight", strings.moveColumnRight, () => withTable(key, (tb) => { if ($moveColumn(tb, index, index + (rtl ? -1 : 1))) announceTable(editor, "moved"); }), !simple || (rtl ? index === 0 : index >= s.cols - 1)),
      );
    }
    items.push(
      menuItem("fill", strings.cellBackground, () => {
        // Colour whatever the grip selected, via the bar's popover.
        const fillBtn = bar.querySelector<HTMLElement>(".spez-rte-ticon-fill")?.parentElement;
        if (fillBtn) colorMenu(fillBtn);
      }),
      menuItem("clear", strings.clearContents, () => withInfo((i) => { $clearCells(i.cells); announceTable(editor, "cleared"); })),
    );
    if (kind === "column") {
      const label = el("label");
      const input = el("input");
      input.type = "number";
      input.min = "40";
      input.max = "1200";
      const measured = measureWidths(s);
      input.value = String(Math.round(measured[index] ?? 120));
      input.setAttribute("aria-label", strings.columnWidth);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const w = clampColumnWidth(Number(input.value));
          closeAnyMenu();
          withTable(key, (tb) => {
            $setColumnWidth(tb, index, w, measured);
            announceTable(editor, "widthSet", { n: index + 1, w });
          });
          editor.focus();
        }
      });
      label.append(document.createTextNode(strings.columnWidth), input);
      items.push(label);
      items.push(menuItem("width", strings.resetWidths, () => withTable(key, (tb) => { $setColumnWidths(tb, null); announceTable(editor, "widthsReset"); })));
    }
    items.push(
      el("hr"),
      menuItem(kind === "row" ? "deleteRow" : "deleteColumn", kind === "row" ? strings.deleteRow : strings.deleteColumn, () =>
        kind === "row" ? deleteRowsOf(key, index, index) : deleteColsOf(key, index, index)),
      menuItem("deleteTable", strings.deleteTable, () => deleteTable(key)),
    );
    wrap.append(...items);
    openMenu(rel(anchor.getBoundingClientRect()), wrap, anchor);
  };

  /** Column widths in px, from where the cells actually sit. */
  const measureWidths = (s: Snapshot): number[] => {
    const table = tableElOf(s.tableKey);
    if (!table) return [];
    const tr = table.getBoundingClientRect();
    const rtl = isRtl(table);
    const widths: number[] = [];
    let prev = rtl ? tr.right : tr.left;
    for (let c = 0; c < s.cols; c++) {
      const k = s.colEndKeys[c];
      const d = k ? domOf(k) : null;
      const edge = d ? (rtl ? d.getBoundingClientRect().left : d.getBoundingClientRect().right) : prev + 100 * (rtl ? -1 : 1);
      widths.push(Math.max(1, Math.round(Math.abs(edge - prev))));
      prev = edge;
    }
    return widths;
  };

  const renderHandles = (s: Snapshot) => {
    handles.replaceChildren();
    const table = tableElOf(s.tableKey);
    const wrapper = domOf(s.tableKey);
    if (!table || !wrapper) return;
    const tbox = rel(table.getBoundingClientRect());
    const clip = rel(wrapper.getBoundingClientRect());
    const rtl = isRtl(table);
    const widths = measureWidths(s);
    const visibleX = (x: number) => x >= clip.left - 1 && x <= clip.left + clip.width + 1;

    // Column grips + resize strips + add buttons.
    for (let c = 0; c < s.cols; c++) {
      const startKey = s.colStartKeys[c] ?? s.colEndKeys[c];
      const endKey = s.colEndKeys[c];
      const sd = startKey ? domOf(startKey) : null;
      const ed = endKey ? domOf(endKey) : null;
      if (!sd || !ed) continue;
      const a = rel(sd.getBoundingClientRect());
      const b = rel(ed.getBoundingClientRect());
      const left = Math.min(a.left, b.left);
      const right = Math.max(a.left + a.width, b.left + b.width);
      const center = (left + right) / 2;
      if (visibleX(center)) {
        const grip = el("button", "spez-rte-tgrip");
        grip.type = "button";
        grip.tabIndex = -1;
        grip.setAttribute("aria-label", fillTemplate(strings.columnMenu, { n: c + 1 }));
        grip.setAttribute("aria-haspopup", "menu");
        grip.setAttribute("aria-expanded", "false");
        grip.append(tableIcon("gripH"));
        Object.assign(grip.style, { left: `${Math.max(left, clip.left)}px`, width: `${Math.min(right, clip.left + clip.width) - Math.max(left, clip.left)}px`, top: `${tbox.top - 13}px`, height: "10px" });
        if (s.active && c >= s.rect.minCol && c <= s.rect.maxCol && s.isRange) grip.dataset.active = "";
        keepSelection(grip);
        grip.addEventListener("click", () => {
          editor.update(() => { const t = $getNodeByKey(s.tableKey); if ($isTableNode(t)) $selectColumn(t, c); }, { discrete: true });
          gripMenu(s, "column", c, grip);
        });
        handles.append(grip);
      }
      // Resize strip at the column's inline-end edge.
      const edgeX = rtl ? Math.min(a.left, b.left) : right;
      if (visibleX(edgeX)) {
        const strip = el("div", "spez-rte-tresize");
        strip.setAttribute("role", "separator");
        strip.setAttribute("aria-orientation", "vertical");
        strip.setAttribute("aria-label", `${strings.resizeColumn} ${c + 1}`);
        Object.assign(strip.style, { left: `${edgeX - 4.5}px`, top: `${tbox.top}px`, height: `${tbox.height}px` });
        strip.addEventListener("pointerdown", (e) => startResize(s, c, strip, e, widths, rtl));
        handles.append(strip);
      }
    }
    // Column "+" buttons at every boundary (physical order), only the visible ones.
    const boundaries: { x: number; col: number; where: "before" | "after" }[] = [];
    for (let c = 0; c <= s.cols; c++) {
      const k = c === 0 ? s.colStartKeys[0] : s.colEndKeys[c - 1];
      const d = k ? domOf(k) : null;
      if (!d) continue;
      const r = d.getBoundingClientRect();
      const x = c === 0 ? (rtl ? r.right : r.left) : rtl ? r.left : r.right;
      boundaries.push({ x: x - shellBox().left, col: c === 0 ? 0 : c - 1, where: c === 0 ? "before" : "after" });
    }
    for (const bd of boundaries) {
      if (!visibleX(bd.x)) continue;
      const add = el("button", "spez-rte-tadd");
      add.type = "button";
      add.tabIndex = -1;
      add.title = strings.addColumn;
      add.setAttribute("aria-label", strings.addColumn);
      add.append(tableIcon("plus"));
      Object.assign(add.style, { left: `${bd.x - 9}px`, top: `${tbox.top - 27}px` });
      keepSelection(add);
      add.addEventListener("click", () => insertColAt(s.tableKey, bd.col, bd.where));
      handles.append(add);
    }

    // Row grips + add buttons on the inline-start side.
    const gutterX = rtl ? tbox.left + tbox.width + 3 : tbox.left - 13;
    for (let r = 0; r < s.rows; r++) {
      const key = s.rowKeys[r];
      const d = key ? domOf(key) : null;
      const rowEl = d?.parentElement;
      if (!rowEl) continue;
      const box = rel(rowEl.getBoundingClientRect());
      const grip = el("button", "spez-rte-tgrip");
      grip.type = "button";
      grip.tabIndex = -1;
      grip.setAttribute("aria-label", fillTemplate(strings.rowMenu, { n: r + 1 }));
      grip.setAttribute("aria-haspopup", "menu");
      grip.setAttribute("aria-expanded", "false");
      grip.append(tableIcon("gripV"));
      Object.assign(grip.style, { left: `${gutterX}px`, width: "10px", top: `${box.top}px`, height: `${box.height}px` });
      if (s.active && s.isRange && r >= s.rect.minRow && r <= s.rect.maxRow) grip.dataset.active = "";
      keepSelection(grip);
      grip.addEventListener("click", () => {
        editor.update(() => { const t = $getNodeByKey(s.tableKey); if ($isTableNode(t)) $selectRow(t, r); }, { discrete: true });
        gripMenu(s, "row", r, grip);
      });
      handles.append(grip);
      for (const where of r === 0 ? (["before", "after"] as const) : (["after"] as const)) {
        const add = el("button", "spez-rte-tadd");
        add.type = "button";
        add.tabIndex = -1;
        add.title = strings.addRow;
        add.setAttribute("aria-label", strings.addRow);
        add.append(tableIcon("plus"));
        const y = where === "before" ? box.top : box.top + box.height;
        Object.assign(add.style, { left: `${rtl ? gutterX + 14 : gutterX - 9}px`, top: `${y - 9}px` });
        keepSelection(add);
        add.addEventListener("click", () => insertRowAt(s.tableKey, r, where));
        handles.append(add);
      }
    }
  };

  // ---- render -------------------------------------------------------------------------------
  const hideAll = () => {
    bar.hidden = true;
    ring.hidden = true;
    handles.replaceChildren();
  };

  const render = () => {
    frame = 0;
    syncWidths();
    if (dragging) return;
    if (!options.isEnabled() || !editor.isEditable()) {
      hideAll();
      snap = null;
      return;
    }
    const s = takeSnapshot();
    snap = s;
    if (s === null) {
      hideAll();
      return;
    }
    renderHandles(s);

    if (s.active && !blurred) {
      bar.hidden = false;
      updateBarState(s);
      const table = tableElOf(s.tableKey);
      const anchor = domOf(s.anchorKey);
      if (table && anchor) {
        const s0 = shellBox();
        const tbox = rel(table.getBoundingClientRect());
        const wbox = rel((domOf(s.tableKey) ?? table).getBoundingClientRect());
        const cbox = rel(anchor.getBoundingClientRect());
        const visTop = Math.max(0, -s0.top) ;
        const visBottom = window.innerHeight - s0.top;
        const p = placeBar(
          { left: wbox.left, top: tbox.top, width: wbox.width, height: tbox.height },
          cbox,
          { width: bar.offsetWidth, height: bar.offsetHeight },
          { top: visTop, bottom: visBottom },
          shell.clientWidth,
          isRtl(table),
        );
        bar.style.left = `${p.left}px`;
        bar.style.top = `${p.top}px`;
        if (!s.isRange) {
          ring.hidden = false;
          Object.assign(ring.style, { left: `${cbox.left}px`, top: `${cbox.top}px`, width: `${cbox.width}px`, height: `${cbox.height}px` });
        } else ring.hidden = true;
      }
      if (s.selectedCount !== lastSelectedCount) {
        lastSelectedCount = s.selectedCount;
        if (s.selectedCount > 1) announceTable(editor, "cellsSelected", { count: s.selectedCount });
      }
    } else {
      bar.hidden = true;
      ring.hidden = true;
    }
  };

  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(render);
  };

  // ---- wiring -------------------------------------------------------------------------------
  buildBar();
  const unUpdate = editor.registerUpdateListener(() => {
    syncWidths();
    schedule();
  });
  const unEditable = editor.registerEditableListener(schedule);

  const onPointerMove = (e: PointerEvent) => {
    if (dragging) return;
    const target = e.target as Element | null;
    if (!target || root.contains(target)) {
      clearTimeout(hoverTimer);
      return;
    }
    const inTable = target.closest?.("table.spez-rte-table, .spez-rte-table-scroll");
    clearTimeout(hoverTimer);
    if (inTable) {
      const key = editor.getEditorState().read(() => {
        const n = $getNearestNodeFromDOMNode(target);
        const t = n ? $findTableNode(n) : null;
        return t ? t.getKey() : null;
      });
      if (key !== hoveredKey) {
        hoveredKey = key;
        schedule();
      }
    } else {
      hoverTimer = setTimeout(() => {
        hoveredKey = null;
        schedule();
      }, 250);
    }
  };
  const onLeave = () => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (!root.matches(":hover")) {
        hoveredKey = null;
        schedule();
      }
    }, 250);
  };
  shell.addEventListener("pointermove", onPointerMove);
  shell.addEventListener("pointerleave", onLeave);
  const onFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next === null || !shell.parentElement?.contains(next)) {
      blurred = true;
      schedule();
    }
  };
  const onFocusIn = () => {
    blurred = false;
    schedule();
  };
  const host = shell.parentElement ?? shell;
  host.addEventListener("focusout", onFocusOut);
  host.addEventListener("focusin", onFocusIn);
  editable.addEventListener("scroll", schedule, true);
  window.addEventListener("scroll", schedule, true);
  window.addEventListener("resize", schedule);
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
  ro?.observe(editable);
  document.addEventListener("selectionchange", schedule);
  schedule();

  return {
    refresh: () => {
      strings = getTableStrings(options.getLocale());
      closeAnyMenu();
      buildBar();
      schedule();
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      clearTimeout(hoverTimer);
      closeAnyMenu();
      setTableAnnouncer(editor, null);
      unUpdate();
      unEditable();
      shell.removeEventListener("pointermove", onPointerMove);
      shell.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("focusout", onFocusOut);
      host.removeEventListener("focusin", onFocusIn);
      editable.removeEventListener("scroll", schedule, true);
      editable.removeEventListener("keydown", onAltF10);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("selectionchange", schedule);
      ro?.disconnect();
      root.remove();
    },
  };
}

