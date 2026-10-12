/**
 * Table styles. Every colour, size and radius is a CSS custom property with a neutral default, so a
 * host can retheme tables without forking: set any `--rte-table-*` on `spez-richtext`.
 *
 *   --rte-table-border          cell and frame border
 *   --rte-table-header-bg       header cell background
 *   --rte-table-cell-padding    padding of every cell
 *   --rte-table-selection       tint of selected cells and the active-cell ring
 *   --rte-table-ui-bg / -fg     floating bar, menus and grips
 *   --rte-table-ui-border       their border
 *   --rte-table-grip            idle grip colour
 */
export const tableStyles: string = `
.spez-rte {
  --rte-table-border: var(--rte-border);
  --rte-table-header-bg: color-mix(in srgb, var(--rte-fg) 6%, var(--rte-bg));
  --rte-table-cell-padding: 6px 10px;
  --rte-table-selection: var(--rte-accent);
  --rte-table-ui-bg: var(--rte-menu-bg, var(--rte-bg));
  --rte-table-ui-fg: var(--rte-menu-fg, var(--rte-fg));
  --rte-table-ui-border: var(--rte-menu-border, var(--rte-border));
  --rte-table-grip: color-mix(in srgb, var(--rte-fg) 16%, transparent);
}

.spez-rte-editor .spez-rte-table-scroll {
  overflow-x: auto;
  max-width: 100%;
  margin: 1em 0 0.5em;
}
.spez-rte-editor .spez-rte-table {
  border-collapse: collapse;
  border-spacing: 0;
  width: 100%;
  margin: 0;
}
/* Explicit column widths (colWidths): the colgroup rules, so the table is exactly their sum. */
.spez-rte-editor .spez-rte-table:has(> colgroup > col[style*="width"]) {
  table-layout: fixed;
  width: auto;
}
.spez-rte-editor .spez-rte-table-cell {
  border: 1px solid var(--rte-table-border);
  padding: var(--rte-table-cell-padding);
  min-width: 40px;
  vertical-align: top;
  text-align: start;
  overflow-wrap: anywhere;
  position: relative;
}
.spez-rte-editor .spez-rte-table-cell > :first-child { margin-top: 0; }
.spez-rte-editor .spez-rte-table-cell > :last-child { margin-bottom: 0; }
.spez-rte-editor .spez-rte-table-cell-header {
  background-color: var(--rte-table-header-bg);
  font-weight: 600;
}
.spez-rte-editor .spez-rte-table-cell-selected {
  box-shadow: inset 0 0 0 9999px color-mix(in srgb, var(--rte-table-selection) 22%, transparent);
}
.spez-rte-editor .spez-rte-table-selecting *::selection,
.spez-rte-editor .spez-rte-table-selecting::selection {
  background: transparent;
}

/* ---- overlay: bar, grips, resize strips ---- */
.spez-rte-tui {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* Above the text, below the toolbar and its More menu (z-index 2 in the toolbar, --rte-toolbar-z 5 when pinned). */
  z-index: 1;
  font-size: 0.85rem;
  color: var(--rte-table-ui-fg);
}
.spez-rte-tui [hidden] { display: none !important; }
.spez-rte-tlive {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.spez-rte-tbar {
  position: absolute;
  pointer-events: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 3px;
  max-width: calc(100% - 16px);
  background: var(--rte-table-ui-bg);
  border: 1px solid var(--rte-table-ui-border);
  border-radius: var(--rte-radius);
  box-shadow: var(--rte-menu-shadow, 0 1px 2px rgba(0, 0, 0, 0.06), 0 6px 20px rgba(0, 0, 0, 0.12));
  user-select: none;
  -webkit-user-select: none;
}
.spez-rte-tbar-group { display: inline-flex; align-items: center; gap: 1px; }
.spez-rte-tbar-group + .spez-rte-tbar-group {
  margin-inline-start: 3px;
  padding-inline-start: 4px;
  border-inline-start: 1px solid var(--rte-table-ui-border);
}
.spez-rte-tbar button,
.spez-rte-tmenu button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 1;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border-radius: 5px;
  cursor: pointer;
}
.spez-rte-tbar button:hover:not(:disabled),
.spez-rte-tmenu button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--rte-accent) 10%, transparent);
}
.spez-rte-tbar button[aria-pressed="true"],
.spez-rte-tbar button[aria-expanded="true"],
.spez-rte-tmenu button[aria-pressed="true"] {
  background: color-mix(in srgb, var(--rte-accent) 16%, transparent);
  border-color: color-mix(in srgb, var(--rte-accent) 40%, transparent);
  color: var(--rte-accent);
}
.spez-rte-tbar button:disabled,
.spez-rte-tmenu button:disabled { opacity: 0.4; cursor: default; }
.spez-rte-tbar button:focus-visible,
.spez-rte-tmenu button:focus-visible,
.spez-rte-tgrip:focus-visible,
.spez-rte-tadd:focus-visible {
  outline: 2px solid var(--rte-accent);
  outline-offset: 1px;
}
.spez-rte-ticon { flex: none; }
[dir="rtl"] .spez-rte-ticon-alignStart,
[dir="rtl"] .spez-rte-ticon-alignEnd,
[dir="rtl"] .spez-rte-ticon-colLeft,
[dir="rtl"] .spez-rte-ticon-colRight { transform: scaleX(-1); }
.spez-rte-tfill-bar {
  position: absolute;
  inset-inline: 7px;
  bottom: 3px;
  height: 3px;
  border-radius: 1px;
  background: var(--swatch, transparent);
}
.spez-rte-tbar button { position: relative; }

.spez-rte-tmenu {
  position: absolute;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1px;
  width: max-content;
  min-width: 190px;
  max-width: min(320px, calc(100% - 8px));
  padding: 4px;
  background: var(--rte-table-ui-bg);
  color: var(--rte-table-ui-fg);
  border: 1px solid var(--rte-table-ui-border);
  border-radius: var(--rte-radius);
  box-shadow: var(--rte-menu-shadow, 0 1px 2px rgba(0, 0, 0, 0.06), 0 6px 20px rgba(0, 0, 0, 0.12));
  z-index: 6;
}
.spez-rte-tmenu button { justify-content: flex-start; width: 100%; white-space: nowrap; }
.spez-rte-tmenu hr { border: 0; border-top: 1px solid var(--rte-table-ui-border); margin: 3px 0; width: 100%; }
.spez-rte-tmenu label { display: flex; align-items: center; gap: 8px; padding: 2px 6px; font-size: 0.8rem; }
.spez-rte-tmenu input[type="number"] { width: 5em; font: inherit; padding: 2px 4px; border: 1px solid var(--rte-table-ui-border); border-radius: 4px; background: var(--rte-bg); color: inherit; }
.spez-rte-tmenu-row { display: flex; gap: 2px; padding: 2px; }
.spez-rte-tmenu-row button { width: auto; flex: 1; justify-content: center; }
.spez-rte-tmenu .spez-rte-swatch { width: 22px; min-width: 22px; height: 22px; padding: 0; background: var(--swatch); border: 1px solid var(--rte-table-ui-border); }
.spez-rte-tmenu .spez-rte-swatch[aria-pressed="true"] { outline: 2px solid var(--rte-accent); outline-offset: 1px; }
.spez-rte-tswatches { display: grid; grid-template-columns: repeat(6, 22px); gap: 4px; padding: 4px 6px; }

.spez-rte-tgrip {
  position: absolute;
  pointer-events: auto;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: var(--rte-table-grip);
  color: var(--rte-table-ui-fg);
  cursor: pointer;
  opacity: 0.6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.spez-rte-tgrip:hover, .spez-rte-tgrip[aria-expanded="true"], .spez-rte-tgrip[data-active] {
  opacity: 1;
  background: color-mix(in srgb, var(--rte-accent) 35%, transparent);
}
.spez-rte-tgrip svg { width: 10px; height: 10px; }
.spez-rte-tadd {
  position: absolute;
  pointer-events: auto;
  width: 18px;
  height: 18px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--rte-table-ui-border);
  background: var(--rte-table-ui-bg);
  color: var(--rte-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 100ms ease;
}
.spez-rte-tadd svg { width: 12px; height: 12px; }
.spez-rte-tadd:hover, .spez-rte-tadd:focus-visible { opacity: 1; }
.spez-rte-tadd-guide {
  position: absolute;
  pointer-events: none;
  background: var(--rte-accent);
  opacity: 0;
}
.spez-rte-tresize {
  position: absolute;
  pointer-events: auto;
  width: 9px;
  cursor: col-resize;
  touch-action: none;
  background: transparent;
}
.spez-rte-tresize::after {
  content: "";
  position: absolute;
  inset-block: 0;
  inset-inline-start: 3px;
  width: 3px;
  border-radius: 2px;
  background: var(--rte-accent);
  opacity: 0;
}
.spez-rte-tresize:hover::after, .spez-rte-tresize[data-dragging]::after { opacity: 0.75; }
.spez-rte-tring {
  position: absolute;
  pointer-events: none;
  border: 2px solid var(--rte-table-selection);
  box-sizing: border-box;
}

@media (prefers-reduced-motion: reduce) {
  .spez-rte-tadd { transition: none; }
}

.spez-rte-tpicker { display: flex; flex-direction: column; gap: 8px; }
.spez-rte-tpicker-label { font-size: 0.8rem; color: var(--rte-muted); min-height: 1.2em; }
.spez-rte-tpicker-grid { display: flex; flex-direction: column; gap: 2px; }
.spez-rte-tpicker-row { display: flex; gap: 2px; }
.spez-rte-popover .spez-rte-tpicker-cell {
  appearance: none;
  width: 18px;
  height: 18px;
  min-width: 0;
  padding: 0;
  border: 1px solid var(--rte-border);
  border-radius: 2px;
  background: var(--rte-bg);
  cursor: pointer;
}
.spez-rte-popover .spez-rte-tpicker-cell.is-active {
  background: color-mix(in srgb, var(--rte-accent) 28%, var(--rte-bg));
  border-color: var(--rte-accent);
}
.spez-rte-tpicker-cell:focus-visible { outline: 2px solid var(--rte-accent); outline-offset: 1px; }
.spez-rte-popover .spez-rte-tpicker-check { display: flex; align-items: center; justify-content: flex-start; gap: 6px; font-size: 0.8rem; }
.spez-rte-tpicker-custom { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; border-top: 1px solid var(--rte-border); padding-top: 8px; }
.spez-rte-popover .spez-rte-tpicker-insert {
  font: inherit; font-size: 0.85rem; padding: 3px 10px; cursor: pointer;
  border: 1px solid var(--rte-border); border-radius: 5px; background: var(--rte-toolbar-bg); color: var(--rte-fg);
}
.spez-rte-tpicker-insert:hover { border-color: var(--rte-accent); }
`;
