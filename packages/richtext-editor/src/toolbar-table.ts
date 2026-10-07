import { INSERT_TABLE_COMMAND } from "@lexical/table";
import type { ToolbarItemDefinition } from "./toolbar-registry";

/**
 * The "Insert table" toolbar item. It lives in its own file, registered under the id `table`, so
 * table work can change the control (a grid picker, a table-options group, more items) without
 * touching the main toolbar. Place it with the layout config; it ships in the `insert` group.
 *
 * To replace it, `registerToolbarItem({ ...tableToolbarItem, create })` with the same id, or register new
 * ids and name them in `ToolbarConfig.groups`.
 */
export const tableToolbarItem: ToolbarItemDefinition = {
  id: "table",
  label: (t) => t.table,
  icon: "table",
  home: "insert",
  create: (ctx) => {
    const { t } = ctx;
    return ctx.button(
      tableToolbarItem,
      (self) => {
        const wrap = document.createElement("div");
        wrap.style.display = "contents";
        const rows = document.createElement("input");
        rows.type = "number";
        rows.min = "1";
        rows.value = "3";
        const rowsLabel = document.createElement("label");
        rowsLabel.append(`${t.rows}:`, rows);
        const cols = document.createElement("input");
        cols.type = "number";
        cols.min = "1";
        cols.value = "3";
        const colsLabel = document.createElement("label");
        colsLabel.append(`${t.columns}:`, cols);
        const ok = document.createElement("button");
        ok.type = "button";
        ok.textContent = t.insert;
        ok.addEventListener("click", () => {
          ctx.editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            rows: rows.value || "3",
            columns: cols.value || "3",
          });
          close();
        });
        wrap.append(rowsLabel, colsLabel, ok);
        const close = ctx.openPopover(wrap, self);
      },
      { popup: true },
    );
  },
};
