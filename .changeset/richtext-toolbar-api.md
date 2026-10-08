---
"@spezutil/richtext-editor": minor
"@spezutil/richtext-editor-angular": minor
"@spezutil/richtext-editor-react": minor
---

Configurable toolbar API, and a compact default toolbar.

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
