---
title: Tables
---

# Tables

Tables are built from Lexical's own `table`, `tablerow` and `tablecell` nodes. The editor adds the
authoring UI around them; **there is no custom node**, so documents stay readable by anything that
reads Lexical JSON.

## Authoring

- **Insert table** (toolbar, `insert` group): hover a grid up to 10 x 10 and click, or use *Custom
  size* (up to 100 rows x 20 columns). *Header row* is checked by default.
- **Table bar**: appears above the table (below it when there is no room, and never over the active
  cell) while the caret or a selection is inside it. Insert row above/below, insert column left/right,
  delete row/column/table, merge, split, header row, header column, cell background, cell alignment
  (horizontal and vertical) and clear contents. Every button has an `aria-label` and a tooltip.
- **Row and column grips**: hover a table to see a grip on each row's start edge and each column's top
  edge. Click one to select the row or column and open its menu (insert, move, background, clear,
  column width, reset widths, delete). The round **+** between grips adds a row or column there.
- **Resize columns**: drag a column's right edge (left edge in RTL). The minimum is 40 px, the maximum
  1200 px. A table wider than its container scrolls inside its own wrapper; the page never overflows.
- **Cell selection**: drag across cells, or hold Shift and use the arrow keys. Background, alignment,
  merge, clear and delete act on the whole selection.
- **Paste**: tables from Excel, Google Sheets, Word and web pages are rebuilt cleanly. Rows, header
  cells, merged cells (clamped to 50), a plain background colour, alignment and bold / italic /
  underline / strike / safe links are kept; fonts, sizes, text colours, classes, widths and Office
  markup are dropped. Content copied from this editor pastes as it was.

## Keyboard

| Keys | Action |
| --- | --- |
| `Tab` | Next cell. In the last cell, adds a row and moves into it. |
| `Shift+Tab` | Previous cell. In the first cell, leaves the table backwards. |
| Arrow keys | Move the caret; at a cell's edge, continue into the neighbouring cell. |
| `Shift+Arrow` | Extend a rectangular multi-cell selection. |
| `Escape` | With a multi-cell selection: collapse into the cell. With a caret: step out to the block after the table. |
| `Backspace` / `Delete` | On a multi-cell selection: clear those cells (every cell selected removes the table). |
| `Ctrl/Cmd+A` | Select the whole table when the caret is in a cell. |
| `Alt+F9` | Move focus to the table bar (arrows move along it, `Escape` returns to the cell). `Alt+F10` stays the main toolbar. |

The list is exported as `TABLE_SHORTCUTS`.

Structural changes (rows and columns added or deleted, merge, split, header toggles, widths, moves)
are announced through a polite live region.

## Options

| Option | Description |
| --- | --- |
| `table-tools` attribute / `tableTools` property | `off` / `false` hides the bar, grips and resize strips. Keyboard handling, paste cleaning and the insert picker stay. Default on. Angular: `[tableTools]`, React: `tableTools`. |
| `insertTable(editor, { rows, columns, headerRow?, headerColumn? })` | Insert programmatically (sizes are clamped). |

## Theming

Set these on `spez-richtext`. Defaults are neutral and follow the toolbar and menu tokens.

| Variable | Default |
| --- | --- |
| `--rte-table-border` | `--rte-border` |
| `--rte-table-header-bg` | 6% of `--rte-fg` over `--rte-bg` |
| `--rte-table-cell-padding` | `6px 10px` |
| `--rte-table-selection` | `--rte-accent` |
| `--rte-table-ui-bg` / `-fg` / `-border` | `--rte-menu-bg` / `-fg` / `-border` |
| `--rte-table-grip` | 16% of `--rte-fg` |

Tables mirror in right-to-left documents (the table's `dir` follows its content, "left"/"right" in
the bar follow the visible direction) and cell text keeps the editor's Arabic font and size.

## Stored shape

Everything below is optional; a table saved by 0.5.1 loads and saves byte-identical.

| Node | Property | Type | Notes |
| --- | --- | --- | --- |
| `table` | `colWidths` | `number[]` | Whole px, one per column, each 40 to 1200. Absent until a column is resized. |
| `tablecell` | `verticalAlign` | `"middle"` \| `"bottom"` | Absent means top. |
| `tablecell` | `headerState` | `0` \| `1` \| `2` \| `3` | none, row, column, both. |
| `tablecell` | `backgroundColor` | `#rrggbb` or `rgb()` / `rgba()` | `null` for none. |
| `tablecell` | `colSpan`, `rowSpan` | integer | Merged cells. |
| `tablecell` and its blocks | `format` | `""`, `left`, `center`, `right`, `justify`, `start`, `end` | Horizontal alignment is written on the cell and on each paragraph in it. |

A server-side renderer must read `colWidths` and `verticalAlign` for readers to see them.
