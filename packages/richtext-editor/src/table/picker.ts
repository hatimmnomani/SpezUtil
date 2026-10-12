import type { LocaleStrings } from "../locale";
import { fillTemplate, type TableStrings } from "./strings";
import { TABLE_MAX_COLS, TABLE_MAX_ROWS } from "./model";

export interface TablePickerChoice {
  rows: number;
  columns: number;
  headerRow: boolean;
}

export interface TablePickerOptions {
  t: LocaleStrings;
  strings: TableStrings;
  /** Initial state of the "Header row" checkbox. */
  headerRow?: boolean;
  onInsert: (choice: TablePickerChoice) => void;
}

export const PICKER_ROWS = 10;
export const PICKER_COLS = 10;

/**
 * "Insert table" popover content: a hover grid (up to 10 x 10), a custom-size form and a header-row
 * checkbox. The grid is a roving-tabindex grid: arrow keys move, Enter / Space inserts.
 */
export function createTablePicker(options: TablePickerOptions): HTMLElement {
  const { t, strings } = options;
  const root = document.createElement("div");
  root.className = "spez-rte-tpicker";

  const label = document.createElement("div");
  label.className = "spez-rte-tpicker-label";
  label.setAttribute("aria-live", "polite");
  const size = (rows: number, cols: number) => fillTemplate(strings.sizeLabel, { rows, cols });
  label.textContent = t.table;

  const grid = document.createElement("div");
  grid.className = "spez-rte-tpicker-grid";
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-label", strings.pickerLabel);

  const header = document.createElement("label");
  header.className = "spez-rte-tpicker-check";
  const headerBox = document.createElement("input");
  headerBox.type = "checkbox";
  headerBox.checked = options.headerRow ?? true;
  header.append(headerBox, document.createTextNode(strings.headerRowOption));

  const cells: HTMLButtonElement[][] = [];
  const paint = (rows: number, cols: number) => {
    for (let r = 0; r < PICKER_ROWS; r++) {
      for (let c = 0; c < PICKER_COLS; c++) {
        cells[r]![c]!.classList.toggle("is-active", r < rows && c < cols);
      }
    }
    label.textContent = rows > 0 && cols > 0 ? size(rows, cols) : t.table;
  };
  const choose = (rows: number, columns: number) =>
    options.onInsert({ rows, columns, headerRow: headerBox.checked });

  for (let r = 0; r < PICKER_ROWS; r++) {
    const rowEl = document.createElement("div");
    rowEl.setAttribute("role", "row");
    rowEl.className = "spez-rte-tpicker-row";
    cells.push([]);
    for (let c = 0; c < PICKER_COLS; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "spez-rte-tpicker-cell";
      cell.setAttribute("role", "gridcell");
      cell.tabIndex = r === 0 && c === 0 ? 0 : -1;
      cell.dataset.row = String(r + 1);
      cell.dataset.col = String(c + 1);
      cell.setAttribute("aria-label", size(r + 1, c + 1));
      cell.addEventListener("pointerenter", () => paint(r + 1, c + 1));
      cell.addEventListener("focus", () => paint(r + 1, c + 1));
      cell.addEventListener("click", () => choose(r + 1, c + 1));
      cells[r]!.push(cell);
      rowEl.append(cell);
    }
    grid.append(rowEl);
  }
  cells[0]![0]!.setAttribute("data-autofocus", "");
  grid.addEventListener("pointerleave", () => paint(0, 0));

  grid.addEventListener("keydown", (event) => {
    const target = event.target as HTMLButtonElement;
    if (!target.dataset.row) return;
    const r = Number(target.dataset.row) - 1;
    const c = Number(target.dataset.col) - 1;
    const rtl = getComputedStyle(grid).direction === "rtl";
    let nr = r;
    let nc = c;
    switch (event.key) {
      case "ArrowRight": nc += rtl ? -1 : 1; break;
      case "ArrowLeft": nc += rtl ? 1 : -1; break;
      case "ArrowDown": nr += 1; break;
      case "ArrowUp": nr -= 1; break;
      case "Home": nc = 0; break;
      case "End": nc = PICKER_COLS - 1; break;
      default: return;
    }
    nr = Math.max(0, Math.min(PICKER_ROWS - 1, nr));
    nc = Math.max(0, Math.min(PICKER_COLS - 1, nc));
    event.preventDefault();
    target.tabIndex = -1;
    const next = cells[nr]![nc]!;
    next.tabIndex = 0;
    next.focus();
  });

  const custom = document.createElement("form");
  custom.className = "spez-rte-tpicker-custom";
  custom.setAttribute("aria-label", strings.customSize);
  const mk = (text: string, max: number, value: number) => {
    const l = document.createElement("label");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(max);
    input.value = String(value);
    l.append(`${text}:`, input);
    return { l, input };
  };
  const rowsField = mk(t.rows, TABLE_MAX_ROWS, 3);
  const colsField = mk(t.columns, TABLE_MAX_COLS, 3);
  const ok = document.createElement("button");
  ok.type = "submit";
  ok.className = "spez-rte-tpicker-insert";
  ok.textContent = t.insert;
  custom.append(rowsField.l, colsField.l, ok);
  custom.addEventListener("submit", (event) => {
    event.preventDefault();
    const rows = Math.min(TABLE_MAX_ROWS, Math.max(1, Math.round(Number(rowsField.input.value) || 3)));
    const cols = Math.min(TABLE_MAX_COLS, Math.max(1, Math.round(Number(colsField.input.value) || 3)));
    choose(rows, cols);
  });

  root.append(label, grid, header, custom);
  return root;
}
