# @spezutil/richtext-editor-react

## 0.4.0

### Minor Changes

- f793a98: Table editing, at the level of a document editor.

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

  Also in this release (fixes found integrating 0.6.0):

  - **More menu**: Escape now closes it wherever focus is in the editor, including after a mouse open (the button does not take focus), and returns focus to the button. The table bar and grip menus hear Escape the same way, so it still works after pressing the menu's padding.
  - **Table grips and resize strips** follow the pointer, not the caret: hovering any table shows its row/column grips, "+" buttons and column resize strips, even when the caret is in another table, in none, or after Escape stepped out of the table. The table bar stays tied to the caret.
  - **Table bar and a pinned toolbar**: with `toolbar-mode="sticky"` the bar is placed below the stuck toolbar instead of under or over it. The table overlay now sits below the toolbar and its More menu (z-index 1, was 5, which tied with `--rte-toolbar-z` and painted over it).

- e0bf76b: Configurable toolbar API, and a compact default toolbar.

  **Core (`@spezutil/richtext-editor` 0.6.0)**

  - New declarative `toolbarConfig` (property, or `toolbar-config` JSON attribute): ordered `groups` of item ids, a `more` menu, `hide`/`show` for any item, a `collapse` order and `overflow` on/off. `DEFAULT_TOOLBAR_LAYOUT`, `LEGACY_TOOLBAR_LAYOUT` and `resolveToolbarLayout()` are exported.
  - Item registry: `registerToolbarItem()`, `getToolbarItem()`, `listToolbarItems()`. Built-in controls use it too, so tooling can add or replace items (the "Insert table" button is the item `table`).
  - Default layout is now one compact row (`history | block | inline | color | lists | align-dir | insert`) plus a **More** menu holding strike, sub/sup, code, justify, auto direction, Hijri date, ayat, transliteration, font family, font size and the Lisan ud-Dawat font picker. Insert diagram is in the insert group. Comment stays opt-in (`show: ["comment"]`).
  - Responsive overflow: groups collapse into More as the toolbar narrows and return as it widens (ResizeObserver); at the narrowest the row wraps instead of clipping.
  - Display mode `toolbar-mode` / `toolbarMode` / `setToolbarMode()`: `static` (default), `sticky` (pinned to the top of the scroll container) or `focus` (shown only while the editor has focus, overlaid so content never shifts), plus `toolbarPinned`. Persisting the choice is up to the app.
  - Accessibility: one inline-SVG icon set (no icon font), `aria-label` and a tooltip with the shortcut on every control (Cmd on Apple, Ctrl elsewhere) plus `aria-keyshortcuts`, `aria-pressed` on toggles, `role="toolbar"` with roving tabindex and arrow-key navigation (mirrored in RTL), a keyboard-operable More menu, Alt+F10 from the text to the toolbar and Escape back, `focusToolbar()`.
  - Theming: new `--rte-toolbar-*` and `--rte-menu-*` custom properties (colours, spacing, radius, font sizes, icon size, z-index, sticky offset) with neutral defaults. `--rte-control-height` / `--rte-control-radius` can now be set on the element.
  - RTL: the toolbar uses logical properties and mirrors under `dir="rtl"`; with `locale="ar"` and no `dir`, an Arabic toolbar reads right to left. Direction-sensitive icons mirror.
  - The Lisan ud-Dawat picker is labelled "Lisan ud-Dawat font" (was "LuD font") and its empty option reads "Default" (was "None"); Arabic "افتراضي".

  **Migration notes (0.5 to 0.6)**

  - The default toolbar changed. To keep the 0.5 layout (flat wrapping groups, no More menu) set `toolbar-layout="legacy"`. An explicit `toolbar="history,inline,..."` attribute keeps working unchanged and selects the legacy layout with exactly those groups.
  - Buttons draw SVG icons, not text glyphs, and their `title` now ends with the shortcut (`Bold (Ctrl+B)`). Find buttons by `aria-label` or the new `data-item` attribute, not `title` or text content. Controls are tagged `data-item="<id>"`.
  - Low-use controls now sit in the More menu by default; the `font`, `lud` and `diagram` toolbar groups exist only in the legacy layout (use item ids `font-family`, `font-size`, `lud-font`, `diagram` in `toolbarConfig`).
  - Anything that matched the empty LuD option's text "None" must match "Default".

  **Angular and React wrappers**

  - Angular: new inputs `toolbarConfig`, `toolbarLayout`, `toolbarMode`, `toolbarPinned` and methods `setToolbarMode()` / `focusToolbar()`; the new inputs need core 0.6 to have any effect (the peer range stays `>=0.5.0`). Re-exports the toolbar API and types.
  - React: `toolbarConfig`, `toolbarMode`, `toolbarPinned` (and `toolbarLayout` via attribute) are forwarded to the element; the toolbar API and types are re-exported.

### Patch Changes

- Updated dependencies [f793a98]
- Updated dependencies [e0bf76b]
  - @spezutil/richtext-editor@0.6.0

## 0.3.0

### Minor Changes

- 34d79ba: LuD text, comment marks and diagrams for `<spez-richtext>`:

  - `lud-text` node (text stored exactly as typed, `ludFont` = lud-codec profile id or `unicode`), `<span data-lud-font>` HTML, and an opt-in `lud` toolbar font picker; Google Docs paste in a LuD font keeps the typed text.
  - `CommentMarkNode` (`comment-mark`, ULID `ids`), `addCommentMark`/`removeCommentMark`/`focusCommentMark`, `highlightMarks`/`activeMark`, `comment-requested`/`comment-clicked` events, opt-in `comment` toolbar button; works in read-only.
  - `DiagramNode` (Mermaid `source` + rendered `svg` + `drawioKey`), lazy Mermaid with `htmlLabels: false`, `insertDiagram`/`updateDiagram`, `diagram-edit-requested`, opt-in `diagram` toolbar button.
  - The default toolbar is unchanged; new groups are opt-in. Wrappers expose the new inputs and events.
  - `@spezutil/richtext-editor-angular` now requires `@spezutil/richtext-editor >=0.5.0 <2.0.0` as its
    peer: the component binds `highlightMarks`/`activeMark`/`fontSizes`, listens to the three new events
    and delegates `addCommentMark`/`insertDiagram`/`updateDiagram` to the element, none of which exist
    on 0.4.x. (The React wrapper depends on the editor directly, so its range moves with this release.)
  - `contract/handbook-nodes.json` ships the node JSON contract shared with the handbook API.

  **Release note:** `@spezutil/richtext-editor` now depends on `@spezutil/lud-codec`, which is not yet
  published to the registry (see `.changeset/lud-codec-initial.md`). Run `changeset version` and
  publish once so `lud-codec` and `richtext-editor` (plus the `richtext-editor-react` /
  `richtext-editor-angular` wrappers) release together — publishing `richtext-editor` alone would
  leave its `lud-codec` dependency unresolvable.

### Patch Changes

- Updated dependencies [34d79ba]
  - @spezutil/richtext-editor@0.5.0

## 0.2.2

### Patch Changes

- Updated dependencies [797ceeb]
  - @spezutil/richtext-editor@0.4.0

## 0.2.1

### Patch Changes

- Updated dependencies [555dec6]
  - @spezutil/richtext-editor@0.3.0

## 0.2.0

### Minor Changes

- 0534a7a: Add a font-family selector to the `<spez-richtext>` toolbar.

  - New `font` toolbar group: end users apply a font to the selected text
    (inline `font-family` style, preserved across HTML export/import).
  - Configurable via the new `fonts` property (`FontOption[]`; replaces the
    defaults — spread the exported `DEFAULT_FONTS` to extend them) or the simple
    `fonts="Amiri, Tahoma"` attribute form.
  - React wrapper accepts `fonts` as a prop; the Angular wrapper adds a `fonts`
    `@Input`. Both re-export `FontOption` and `DEFAULT_FONTS`.
  - Localized control labels (en/ar).

### Patch Changes

- Updated dependencies [0534a7a]
- Updated dependencies [0534a7a]
  - @spezutil/richtext-editor@0.2.0

## 0.1.0

### Minor Changes

- Initial public release of the typed React wrapper for `@spezutil/richtext-editor`.

### Patch Changes

- Updated dependencies
  - `@spezutil/richtext-editor@0.1.0`
