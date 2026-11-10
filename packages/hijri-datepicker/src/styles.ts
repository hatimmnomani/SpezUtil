import { arabicFontFace, ARABIC_FONT_FAMILY } from "./font-arabic";

/*
 * Every visual trait is a `--dtp-*` custom property declared on :host with today's literal value
 * as its default, so hosts theme the picker without reaching into the shadow tree. Structural
 * escape hatches are `::part()`: calendar, header, title, title-primary, title-secondary,
 * nav-prev, nav-next, weekday, day, day-primary, day-secondary, time.
 */
export const styles = `
${arabicFontFace}
:host {
  --dtp-bg: #fff;
  --dtp-fg: #1a1a1a;
  --dtp-muted: #9aa0a6;
  --dtp-accent: #0b7d3e;
  --dtp-accent-fg: #fff;
  --dtp-border: #e0e0e0;
  --dtp-radius: 8px;
  --dtp-cell-radius: 6px;
  --dtp-width: 280px;
  --dtp-padding: 8px;
  --dtp-gap: 2px;
  --dtp-shadow: none;
  --dtp-font-family: system-ui, sans-serif;
  --dtp-font-family-display: var(--dtp-font-family);
  --dtp-font-family-mono: var(--dtp-font-family);
  --dtp-font-family-arabic: "${ARABIC_FONT_FAMILY}", "Traditional Arabic", serif;
  --dtp-header-bg: transparent;
  --dtp-hover-bg: #f0f0f0;
  --dtp-title-font-size: inherit;
  --dtp-title-color: var(--dtp-fg);
  --dtp-title-weight: 600;
  --dtp-title-secondary-font-size: 11px;
  --dtp-title-secondary-color: var(--dtp-muted);
  --dtp-weekday-font-size: 11px;
  --dtp-weekday-color: var(--dtp-muted);
  --dtp-weekday-font-family: var(--dtp-font-family-arabic);
  --dtp-day-primary-font-size: inherit;
  --dtp-day-primary-color: var(--dtp-fg);
  --dtp-day-primary-weight: 400;
  --dtp-day-secondary-font-size: 9px;
  --dtp-day-secondary-color: var(--dtp-muted);
  --dtp-day-secondary-font-family: var(--dtp-font-family-arabic);
  --dtp-out-color: var(--dtp-muted);
  --dtp-out-opacity: 0.5;
  --dtp-today-color: var(--dtp-accent);
  --dtp-selected-bg: var(--dtp-accent);
  --dtp-selected-fg: var(--dtp-accent-fg);
  --dtp-range-bg: color-mix(in srgb, var(--dtp-accent) 16%, transparent);
  --dtp-input-border: var(--dtp-border);
  display: inline-block;
  font-family: var(--dtp-font-family);
  color: var(--dtp-fg);
}
.cal { background: var(--dtp-bg); border: 1px solid var(--dtp-border); border-radius: var(--dtp-radius); padding: var(--dtp-padding); width: var(--dtp-width); max-width: 100%; box-shadow: var(--dtp-shadow); box-sizing: border-box; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; background: var(--dtp-header-bg); border-radius: var(--dtp-cell-radius); }
.header button { background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px 8px; border-radius: var(--dtp-cell-radius); color: var(--dtp-fg); font-family: var(--dtp-font-family); }
.header button:hover { background: var(--dtp-hover-bg); }
.title { font-weight: var(--dtp-title-weight); text-align: center; display: flex; flex-direction: column; align-items: center; }
.title [part="title-primary"] { font-family: var(--dtp-font-family-arabic); font-size: var(--dtp-title-font-size); color: var(--dtp-title-color); }
.title small { display: block; font-weight: 400; color: var(--dtp-title-secondary-color); font-size: var(--dtp-title-secondary-font-size); font-family: var(--dtp-font-family-display); }
.grid { display: flex; flex-direction: column; gap: var(--dtp-gap); }
.dow-row, .week { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--dtp-gap); }
.dow { text-align: center; font-size: var(--dtp-weekday-font-size); color: var(--dtp-weekday-color); padding: 4px 0; font-family: var(--dtp-weekday-font-family); }
.cell { aspect-ratio: 1; border: none; background: none; cursor: pointer; border-radius: var(--dtp-cell-radius); display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1; color: var(--dtp-fg); font-family: var(--dtp-font-family-arabic); }
.cell:hover:not([disabled]) { background: var(--dtp-hover-bg); }
.cell:focus-visible { outline: 2px solid var(--dtp-accent); outline-offset: 1px; }
.cell .num-primary { font-size: var(--dtp-day-primary-font-size); color: var(--dtp-day-primary-color); font-weight: var(--dtp-day-primary-weight); }
.cell .num-secondary { font-size: var(--dtp-day-secondary-font-size); color: var(--dtp-day-secondary-color); white-space: nowrap; font-family: var(--dtp-day-secondary-font-family); }
:host([secondary-position="above"]) .cell { flex-direction: column-reverse; }
:host([secondary-position="end"]) .cell { flex-direction: row; align-items: baseline; gap: 2px; }
:host([secondary-position="start"]) .cell { flex-direction: row-reverse; align-items: baseline; gap: 2px; }
.cell.out .num-primary, .cell.out .num-secondary { color: var(--dtp-out-color); }
.cell.out { opacity: var(--dtp-out-opacity); }
.cell.today { outline: 1px solid var(--dtp-today-color); }
.cell[aria-selected="true"] { background: var(--dtp-selected-bg); }
.cell[aria-selected="true"] .num-primary, .cell[aria-selected="true"] .num-secondary { color: var(--dtp-selected-fg); }
.cell[disabled] { cursor: not-allowed; opacity: 0.3; }
.cell.in-range { background: var(--dtp-range-bg); border-radius: 0; }
.cell.range-start { background: var(--dtp-selected-bg); border-top-right-radius: 0; border-bottom-right-radius: 0; }
.cell.range-end { background: var(--dtp-selected-bg); border-top-left-radius: 0; border-bottom-left-radius: 0; }
.cell.range-start .num-primary, .cell.range-end .num-primary, .cell.range-start .num-secondary, .cell.range-end .num-secondary { color: var(--dtp-selected-fg); }
.time-row { display: flex; align-items: center; gap: 4px; margin-top: 8px; justify-content: center; font-family: var(--dtp-font-family-mono); }
.time-row input { width: 44px; text-align: center; padding: 4px; border: 1px solid var(--dtp-input-border); border-radius: var(--dtp-cell-radius); font: inherit; color: var(--dtp-fg); background: var(--dtp-bg); }
.time-row button { border: 1px solid var(--dtp-accent); background: none; color: var(--dtp-accent); border-radius: var(--dtp-cell-radius); padding: 4px 8px; cursor: pointer; font: inherit; }
.time-row button[aria-pressed="true"] { background: var(--dtp-accent); color: var(--dtp-accent-fg); }
:host([dir="rtl"]) .cal { direction: rtl; }
`;
