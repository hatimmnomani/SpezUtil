import { arabicFontFace, ARABIC_FONT_FAMILY } from "./font-arabic";

export const styles = `
${arabicFontFace}
:host {
  --hcal-bg: #fff;
  --hcal-fg: #1a1a1a;
  --hcal-muted: #9aa0a6;
  --hcal-accent: #0b7d3e;
  --hcal-accent-fg: #fff;
  --hcal-border: #e0e0e0;
  --hcal-radius: 8px;
  --hcal-today-bg: color-mix(in srgb, var(--hcal-accent) 10%, transparent);
  --hcal-event-fg: #fff;
  --hcal-font-family: system-ui, sans-serif;
  --hcal-font-family-arabic: "${ARABIC_FONT_FAMILY}", "Traditional Arabic", serif;
  --hcal-font-family-display: var(--hcal-font-family);
  --hcal-font-family-mono: var(--hcal-font-family);
  --hcal-cell-min-height: 96px;
  --hcal-body-max-height: 640px;
  --hcal-button-radius: 6px;
  --hcal-switch-bg: transparent;
  --hcal-switch-active-bg: var(--hcal-accent);
  --hcal-switch-active-fg: var(--hcal-accent-fg);
  --hcal-switch-active-shadow: none;
  --hcal-header-bg: transparent;
  --hcal-weekday-align: center;
  --hcal-weekday-font-size: 11px;
  --hcal-weekday-color: var(--hcal-muted);
  --hcal-title-font-size: inherit;
  --hcal-title-color: var(--hcal-fg);
  --hcal-title-secondary-font-size: 11px;
  --hcal-title-secondary-color: var(--hcal-muted);
  --hcal-title-separator: 1px solid var(--hcal-border);
  display: block;
  font-family: var(--hcal-font-family);
  color: var(--hcal-fg);
}
.cal { background: var(--hcal-bg); border: 1px solid var(--hcal-border); border-radius: var(--hcal-radius); overflow: hidden; display: flex; flex-direction: column; }
.toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--hcal-border); flex-wrap: wrap; }
.toolbar button { background: none; border: 1px solid var(--hcal-border); cursor: pointer; font: inherit; color: var(--hcal-fg); border-radius: var(--hcal-button-radius); padding: 4px 10px; }
.toolbar button:hover { background: color-mix(in srgb, var(--hcal-fg) 6%, transparent); }
.nav-group { display: flex; gap: 4px; }
.title { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 160px; }
.title [part~="title-primary"] { font-weight: 600; font-size: var(--hcal-title-font-size); color: var(--hcal-title-color); font-family: var(--hcal-font-family-arabic); }
.title [part~="title-secondary"] { font-weight: 400; color: var(--hcal-title-secondary-color); font-size: var(--hcal-title-secondary-font-size); font-family: var(--hcal-font-family-display); }
:host([title-layout="inline"]) .title { flex-direction: row; align-items: baseline; justify-content: center; gap: 8px; }
:host([title-layout="inline"]) .title [part~="title-secondary"] { padding-inline-start: 8px; border-inline-start: var(--hcal-title-separator); }
.view-switch { display: flex; gap: 2px; background: var(--hcal-switch-bg); }
.view-switch button[aria-pressed="true"] { background: var(--hcal-switch-active-bg); color: var(--hcal-switch-active-fg); border-color: var(--hcal-switch-active-bg); box-shadow: var(--hcal-switch-active-shadow); }
.subheader { display: block; width: 100%; }

/* month view */
.month { display: flex; flex-direction: column; flex: 1; }
.dow-row { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--hcal-border); background: var(--hcal-header-bg); }
.dow { display: flex; flex-direction: column; align-items: var(--hcal-weekday-align); text-align: var(--hcal-weekday-align); font-size: var(--hcal-weekday-font-size); color: var(--hcal-weekday-color); padding: 6px 0; font-family: var(--hcal-font-family-arabic); }
.dow [part~="weekday-secondary"] { font-family: var(--hcal-font-family-mono); opacity: 0.8; }
.week { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: min-content; border-bottom: 1px solid var(--hcal-border); min-height: var(--hcal-cell-min-height); align-content: start; position: relative; }
.week:last-child { border-bottom: none; }
.day-head { grid-row: 1; border: none; background: none; cursor: pointer; font: inherit; color: var(--hcal-fg); display: flex; align-items: baseline; gap: 4px; justify-content: center; padding: 4px 4px 2px; border-radius: 6px; }
.day-head:hover { background: color-mix(in srgb, var(--hcal-fg) 6%, transparent); }
.day-head .num-primary { font-weight: 600; font-size: 14px; font-family: var(--hcal-font-family-arabic); }
.day-head .num-secondary { font-size: 9px; color: var(--hcal-muted); white-space: nowrap; font-family: var(--hcal-font-family-arabic); }
:host([secondary-position="start"]) .day-head { flex-direction: row-reverse; }
:host([secondary-position="below"]) .day-head { flex-direction: column; gap: 0; align-items: center; }
:host([secondary-position="above"]) .day-head { flex-direction: column-reverse; gap: 0; align-items: center; }
.day-head.out { opacity: 0.45; }
.day-head.today .num-primary { background: var(--hcal-accent); color: var(--hcal-accent-fg); border-radius: 999px; padding: 1px 6px; }
.day-head[data-disabled] { cursor: not-allowed; opacity: 0.3; }
.chip { border: none; cursor: pointer; font: inherit; font-size: 11px; text-align: start; color: var(--hcal-event-fg); background: var(--_ev-color, var(--hcal-accent)); border-radius: 4px; padding: 1px 6px; margin: 1px 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip.continues-before { border-start-start-radius: 0; border-end-start-radius: 0; }
.chip.continues-after { border-start-end-radius: 0; border-end-end-radius: 0; }
.more { border: none; background: none; cursor: pointer; font: inherit; font-size: 11px; color: var(--hcal-muted); text-align: start; padding: 0 6px; margin: 1px 2px; }
.more:hover { color: var(--hcal-fg); }

/* time grid (week/day) */
.timegrid { display: flex; flex-direction: column; flex: 1; }
.tg-head { display: grid; border-bottom: 1px solid var(--hcal-border); background: var(--hcal-header-bg); }
.tg-col-head { text-align: center; padding: 6px 2px; border-inline-start: 1px solid var(--hcal-border); display: flex; flex-direction: column; align-items: center; }
.tg-col-head .dow { padding: 0; }
.tg-col-head .num-primary { font-weight: 600; font-size: 15px; font-family: var(--hcal-font-family-arabic); }
.tg-col-head .num-secondary { font-size: 10px; color: var(--hcal-muted); white-space: nowrap; font-family: var(--hcal-font-family-arabic); }
.tg-col-head.today .num-primary { color: var(--hcal-accent); }
.tg-allday { display: grid; border-bottom: 1px solid var(--hcal-border); min-height: 22px; background: var(--hcal-header-bg); }
.tg-allday-label { font-size: 10px; color: var(--hcal-muted); display: flex; align-items: center; justify-content: center; }
.tg-allday-col { border-inline-start: 1px solid var(--hcal-border); display: flex; flex-direction: column; }
.tg-body { display: grid; position: relative; overflow-y: auto; max-height: var(--hcal-body-max-height); }
.tg-gutter { position: relative; }
.tg-slot { height: 24px; box-sizing: border-box; }
.tg-gutter .tg-slot { position: relative; }
.tg-gutter .tg-slot span { position: absolute; top: -7px; inset-inline-end: 6px; font-size: 10px; color: var(--hcal-muted); white-space: nowrap; font-family: var(--hcal-font-family-mono); }
.tg-day-col { border-inline-start: 1px solid var(--hcal-border); position: relative; }
.tg-day-col .tg-slot { cursor: pointer; }
.tg-day-col .tg-slot.hour-end { border-bottom: 1px solid color-mix(in srgb, var(--hcal-border) 60%, transparent); }
.tg-day-col .tg-slot:hover { background: color-mix(in srgb, var(--hcal-fg) 4%, transparent); }
.tg-event { position: absolute; inset-inline: 2px; border: none; cursor: pointer; font: inherit; font-family: var(--hcal-font-family-display); font-size: 11px; text-align: start; color: var(--hcal-event-fg); background: var(--_ev-color, var(--hcal-accent)); border-radius: 4px; padding: 2px 6px; overflow: hidden; box-shadow: 0 0 0 1px var(--hcal-bg); }
.tg-event small { display: block; opacity: 0.85; font-size: 10px; font-family: var(--hcal-font-family-mono); }
.now-line { position: absolute; inset-inline: 0; height: 2px; background: #ea4335; pointer-events: none; }
.now-line::before { content: ""; position: absolute; inset-inline-start: -4px; top: -3px; width: 8px; height: 8px; border-radius: 999px; background: #ea4335; }

/* agenda */
.agenda { padding: 8px 0; overflow-y: auto; max-height: var(--hcal-body-max-height); }
.agenda-day { display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--hcal-border); }
.agenda-date { min-width: 120px; }
.agenda-date .hijri { font-weight: 600; font-family: var(--hcal-font-family-arabic); }
.agenda-date .greg { font-size: 11px; color: var(--hcal-muted); font-family: var(--hcal-font-family-display); }
.agenda-items { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.agenda-item { display: flex; gap: 10px; align-items: baseline; border: none; background: none; cursor: pointer; font: inherit; color: var(--hcal-fg); text-align: start; padding: 2px 4px; border-radius: 4px; }
.agenda-item:hover { background: color-mix(in srgb, var(--hcal-fg) 6%, transparent); }
.agenda-item .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--_ev-color, var(--hcal-accent)); flex: none; }
.agenda-item .when { font-size: 11px; color: var(--hcal-muted); min-width: 96px; font-family: var(--hcal-font-family-mono); }
.agenda-empty { padding: 16px; text-align: center; color: var(--hcal-muted); }

:host([dir="rtl"]) .cal { direction: rtl; }
`;
