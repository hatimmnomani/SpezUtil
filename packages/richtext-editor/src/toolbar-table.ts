import type { ToolbarItemDefinition } from "./toolbar-registry";
import { insertTable } from "./table/actions";
import { createTablePicker } from "./table/picker";
import { getTableStrings } from "./table/strings";

/**
 * The "Insert table" toolbar item, registered under the id `table`: a hover grid up to 10 x 10, a custom
 * size form and a header-row option (see `table/picker.ts`). Place it with the layout config; it ships
 * in the `insert` group.
 *
 * To replace it, `registerToolbarItem({ ...tableToolbarItem, create })` with the same id.
 */
export const tableToolbarItem: ToolbarItemDefinition = {
  id: "table",
  label: (t) => t.table,
  icon: "table",
  home: "insert",
  create: (ctx) =>
    ctx.button(
      tableToolbarItem,
      (self) => {
        const close = ctx.openPopover(
          createTablePicker({
            t: ctx.t,
            strings: getTableStrings(ctx.locale),
            onInsert: ({ rows, columns, headerRow }) => {
              insertTable(ctx.editor, { rows, columns, headerRow });
              close();
              ctx.editor.focus();
            },
          }),
          self,
        );
      },
      { popup: true },
    ),
};
