/** Every table shortcut, in one place: the docs page and the tests read this list. */
export interface TableShortcut {
  keys: string;
  action: string;
  /** Provided by the editor package itself, or by @lexical/table underneath it. */
  source: "spez" | "lexical";
}

export const TABLE_SHORTCUTS: readonly TableShortcut[] = [
  { keys: "Tab", action: "Next cell. In the last cell, adds a row and moves into it.", source: "spez" },
  { keys: "Shift+Tab", action: "Previous cell. In the first cell, leaves the table backwards.", source: "spez" },
  { keys: "Arrow keys", action: "Move the caret; at a cell's edge, continue into the neighbouring cell.", source: "lexical" },
  { keys: "Shift+Arrow", action: "Extend a rectangular multi-cell selection from the caret.", source: "lexical" },
  { keys: "Escape", action: "With a multi-cell selection: collapse into the cell. With a caret: step out to the block after the table.", source: "spez" },
  { keys: "Backspace / Delete", action: "On a multi-cell selection: clear those cells. On every cell: delete the table. At a table edge: select, then delete, the table.", source: "lexical" },
  { keys: "Ctrl/Cmd+A", action: "Select the whole table when the caret is in a cell.", source: "lexical" },
  { keys: "Alt+F9", action: "Move focus to the table toolbar, Alt+F10 stays the main toolbar (arrow keys move along it, Escape returns to the cell).", source: "spez" },
];
