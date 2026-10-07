---
"@spezutil/richtext-editor": minor
"@spezutil/richtext-editor-react": minor
"@spezutil/richtext-editor-angular": minor
---

Table editing, at the level of a document editor.

- **Insert**: a hover grid (up to 10 x 10) plus a custom size and a header-row option replace the rows/columns popover.
- **Table bar**: a floating bar near the table (never over the active cell) with insert/delete row, column and table, merge, split, header row/column, cell background, horizontal and vertical alignment and clear contents. Every button is labelled; structural changes are announced to screen readers.
- **Grips**: hover grips on rows and columns open a quick menu (insert, move, background, clear, column width, delete); a "+" between grips adds a row or column.
- **Column resize**: drag column borders (40 to 1200 px); wide tables scroll inside their own wrapper.
- **Cell selection** by drag and Shift+Arrow; background, alignment, merge, clear and delete act on the selection.
- **Keyboard**: Tab in the last cell adds a row, Shift+Tab leaves backwards from the first cell, Escape steps out of the table, Alt+F9 focuses the table bar. See `TABLE_SHORTCUTS`.
- **Paste** from Excel, Google Sheets, Word and web pages is rebuilt as a clean table: structure, header cells, merged cells (clamped to 50), a plain background, alignment and basic inline formatting survive; fonts, colours, widths and Office markup do not.
- Themeable through `--rte-table-*` custom properties; RTL tables mirror.
- New `table-tools` attribute / `tableTools` property (Angular `[tableTools]`, React `tableTools`) hides the bar, grips and resize strips.
- New exports: `insertTable`, `cleanPastedHtml`, `TABLE_SHORTCUTS`, `TABLE_MIN_COL_WIDTH`, `TABLE_MAX_COL_WIDTH`, `TABLE_MAX_ROWS`, `TABLE_MAX_COLS`.

Stored documents: all new attributes are optional. `table.colWidths` (number[], px) is written once a column is resized and `tablecell.verticalAlign` (`"middle"` | `"bottom"`) once set. Both are Lexical's own table properties, so 0.5.1 documents load and save unchanged. A server-side renderer must read them for readers to see widths and vertical alignment.
