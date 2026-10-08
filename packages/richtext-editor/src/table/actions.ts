import { $getNodeByKey, $getSelection, type LexicalEditor } from "lexical";
import { $isTableNode, INSERT_TABLE_COMMAND } from "@lexical/table";
import {
  $cellAt,
  $deleteTable,
  $getTableSelectionInfo,
  TABLE_MAX_COLS,
  TABLE_MAX_ROWS,
} from "./model";
import type { TableStrings } from "./strings";

// ---------------------------------------------------------------------------------------------
// Announcements: the UI layer owns the live region and registers itself here, so commands issued
// from anywhere (toolbar, keyboard, picker) can speak without importing the UI.
// ---------------------------------------------------------------------------------------------

type Announcer = (key: keyof TableStrings, values?: Record<string, string | number>) => void;
const announcers = new WeakMap<LexicalEditor, Announcer>();

export function setTableAnnouncer(editor: LexicalEditor, announcer: Announcer | null): void {
  if (announcer === null) announcers.delete(editor);
  else announcers.set(editor, announcer);
}

/** Speaks a localised message through the editor's live region, if a table UI is attached. */
export function announceTable(
  editor: LexicalEditor,
  key: keyof TableStrings,
  values?: Record<string, string | number>,
): void {
  announcers.get(editor)?.(key, values);
}

export interface InsertTableOptions {
  rows: number;
  columns: number;
  /** First row becomes header cells. Default false. */
  headerRow?: boolean;
  /** First column becomes header cells. Default false. */
  headerColumn?: boolean;
}

const clampInt = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? Math.round(value) : min));

/** Inserts a table at the selection and puts the caret in its first cell. Sizes are clamped to 1..100 x 1..20. */
export function insertTable(editor: LexicalEditor, options: InsertTableOptions): void {
  const rows = clampInt(options.rows, 1, TABLE_MAX_ROWS);
  const columns = clampInt(options.columns, 1, TABLE_MAX_COLS);
  editor.dispatchCommand(INSERT_TABLE_COMMAND, {
    rows: String(rows),
    columns: String(columns),
    includeHeaders: { rows: options.headerRow === true, columns: options.headerColumn === true },
  });
  editor.update(
    () => {
      const info = $getTableSelectionInfo();
      if (info === null || $getSelection() === null) return;
      $cellAt(info.table, 0, 0)?.selectEnd();
    },
    { discrete: true },
  );
  announceTable(editor, "tableInserted", { rows, cols: columns });
}

/**
 * Deletes a table the way the UI should.
 *
 * @lexical/table keeps a MutationObserver on every table element whose callback throws once the table
 * has left the editor state, and tearing down a multi-cell selection touches the table's class list.
 * Removing the table in the same update as that teardown therefore raises an uncaught error (the table
 * still goes, but the console and any `unhandledrejection` hooks light up). Collapsing the selection in
 * one update and removing the table in the next microtask lets the observer drain first.
 */
export function deleteTableSafely(editor: LexicalEditor, tableKey: string): Promise<void> {
  editor.update(
    () => {
      const table = $getNodeByKey(tableKey);
      if ($isTableNode(table)) $cellAt(table, 0, 0)?.selectEnd();
    },
    { discrete: true },
  );
  return new Promise((resolve) => {
    queueMicrotask(() => {
      editor.update(
        () => {
          const table = $getNodeByKey(tableKey);
          if ($isTableNode(table)) $deleteTable(table);
        },
        { onUpdate: resolve, discrete: true },
      );
    });
  });
}
