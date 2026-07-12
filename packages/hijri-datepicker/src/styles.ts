import { arabicFontFace, ARABIC_FONT_FAMILY } from "./font-arabic";

export const styles = `
${arabicFontFace}
:host {
  --dtp-bg: #fff;
  --dtp-fg: #1a1a1a;
  --dtp-muted: #9aa0a6;
  --dtp-accent: #0b7d3e;
  --dtp-accent-fg: #fff;
  --dtp-radius: 8px;
  --dtp-font-family-arabic: "${ARABIC_FONT_FAMILY}", "Traditional Arabic", serif;
  display: inline-block;
  font-family: system-ui, sans-serif;
  color: var(--dtp-fg);
}
.cal { background: var(--dtp-bg); border: 1px solid #e0e0e0; border-radius: var(--dtp-radius); padding: 8px; width: 280px; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.header button { background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px 8px; border-radius: 6px; color: var(--dtp-fg); }
.header button:hover { background: #f0f0f0; }
.title { font-weight: 600; text-align: center; font-family: var(--dtp-font-family-arabic); }
.title small { display: block; font-weight: 400; color: var(--dtp-muted); font-size: 11px; font-family: var(--dtp-font-family); }
.grid { display: flex; flex-direction: column; gap: 2px; }
.dow-row, .week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.dow { text-align: center; font-size: 11px; color: var(--dtp-muted); padding: 4px 0; font-family: var(--dtp-font-family-arabic); }
.cell { aspect-ratio: 1; border: none; background: none; cursor: pointer; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1; color: var(--dtp-fg); font-family: var(--dtp-font-family-arabic); }
.cell:hover:not([disabled]) { background: #f0f0f0; }
.cell .num-secondary { font-size: 9px; color: var(--dtp-muted); white-space: nowrap; }
:host([secondary-position="above"]) .cell { flex-direction: column-reverse; }
:host([secondary-position="end"]) .cell { flex-direction: row; align-items: baseline; gap: 2px; }
:host([secondary-position="start"]) .cell { flex-direction: row-reverse; align-items: baseline; gap: 2px; }
.cell.out { color: var(--dtp-muted); opacity: 0.5; }
.cell.today { outline: 1px solid var(--dtp-accent); }
.cell[aria-selected="true"] { background: var(--dtp-accent); color: var(--dtp-accent-fg); }
.cell[aria-selected="true"] .num-secondary { color: var(--dtp-accent-fg); }
.cell[disabled] { cursor: not-allowed; opacity: 0.3; }
.cell.in-range { background: color-mix(in srgb, var(--dtp-accent) 16%, transparent); border-radius: 0; }
.cell.range-start { background: var(--dtp-accent); color: var(--dtp-accent-fg); border-top-right-radius: 0; border-bottom-right-radius: 0; }
.cell.range-end { background: var(--dtp-accent); color: var(--dtp-accent-fg); border-top-left-radius: 0; border-bottom-left-radius: 0; }
.cell.range-start .num-secondary, .cell.range-end .num-secondary { color: var(--dtp-accent-fg); }
.time-row { display: flex; align-items: center; gap: 4px; margin-top: 8px; justify-content: center; }
.time-row input { width: 44px; text-align: center; padding: 4px; border: 1px solid #e0e0e0; border-radius: 6px; font: inherit; }
.time-row button { border: 1px solid var(--dtp-accent); background: none; color: var(--dtp-accent); border-radius: 6px; padding: 4px 8px; cursor: pointer; font: inherit; }
.time-row button[aria-pressed="true"] { background: var(--dtp-accent); color: var(--dtp-accent-fg); }
:host([dir="rtl"]) .cal { direction: rtl; }
`;
