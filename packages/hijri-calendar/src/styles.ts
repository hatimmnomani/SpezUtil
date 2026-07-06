export const styles = `
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
  display: block;
  font-family: system-ui, sans-serif;
  color: var(--hcal-fg);
}
.cal { background: var(--hcal-bg); border: 1px solid var(--hcal-border); border-radius: var(--hcal-radius); overflow: hidden; display: flex; flex-direction: column; }
.toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--hcal-border); flex-wrap: wrap; }
.toolbar button { background: none; border: 1px solid var(--hcal-border); cursor: pointer; font: inherit; color: var(--hcal-fg); border-radius: 6px; padding: 4px 10px; }
.toolbar button:hover { background: color-mix(in srgb, var(--hcal-fg) 6%, transparent); }
.nav-group { display: flex; gap: 4px; }
.title { flex: 1; text-align: center; font-weight: 600; min-width: 160px; }
.title small { display: block; font-weight: 400; color: var(--hcal-muted); font-size: 11px; }
.view-switch { display: flex; gap: 2px; }
.view-switch button[aria-pressed="true"] { background: var(--hcal-accent); color: var(--hcal-accent-fg); border-color: var(--hcal-accent); }

/* month view */
.month { display: flex; flex-direction: column; flex: 1; }
.dow-row { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--hcal-border); }
.dow { text-align: center; font-size: 11px; color: var(--hcal-muted); padding: 6px 0; }
.week { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: min-content; border-bottom: 1px solid var(--hcal-border); min-height: 96px; align-content: start; position: relative; }
.week:last-child { border-bottom: none; }
.day-head { grid-row: 1; border: none; background: none; cursor: pointer; font: inherit; color: var(--hcal-fg); display: flex; align-items: baseline; gap: 4px; justify-content: center; padding: 4px 4px 2px; border-radius: 6px; }
.day-head:hover { background: color-mix(in srgb, var(--hcal-fg) 6%, transparent); }
.day-head .hijri { font-weight: 600; font-size: 14px; }
.day-head .greg { font-size: 9px; color: var(--hcal-muted); }
.day-head.out { opacity: 0.45; }
.day-head.today .hijri { background: var(--hcal-accent); color: var(--hcal-accent-fg); border-radius: 999px; padding: 1px 6px; }
.day-head[data-disabled] { cursor: not-allowed; opacity: 0.3; }
.chip { border: none; cursor: pointer; font: inherit; font-size: 11px; text-align: start; color: var(--hcal-event-fg); background: var(--_ev-color, var(--hcal-accent)); border-radius: 4px; padding: 1px 6px; margin: 1px 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip.continues-before { border-start-start-radius: 0; border-end-start-radius: 0; }
.chip.continues-after { border-start-end-radius: 0; border-end-end-radius: 0; }
.more { border: none; background: none; cursor: pointer; font: inherit; font-size: 11px; color: var(--hcal-muted); text-align: start; padding: 0 6px; margin: 1px 2px; }
.more:hover { color: var(--hcal-fg); }

/* time grid (week/day) */
.timegrid { display: flex; flex-direction: column; flex: 1; }
.tg-head { display: grid; border-bottom: 1px solid var(--hcal-border); }
.tg-col-head { text-align: center; padding: 6px 2px; border-inline-start: 1px solid var(--hcal-border); }
.tg-col-head .dow { padding: 0; }
.tg-col-head .hijri { font-weight: 600; font-size: 15px; }
.tg-col-head .greg { font-size: 10px; color: var(--hcal-muted); }
.tg-col-head.today .hijri { color: var(--hcal-accent); }
.tg-allday { display: grid; border-bottom: 1px solid var(--hcal-border); min-height: 22px; }
.tg-allday-label { font-size: 10px; color: var(--hcal-muted); display: flex; align-items: center; justify-content: center; }
.tg-allday-col { border-inline-start: 1px solid var(--hcal-border); display: flex; flex-direction: column; }
.tg-body { display: grid; position: relative; overflow-y: auto; max-height: 640px; }
.tg-gutter { position: relative; }
.tg-hour { height: 48px; position: relative; }
.tg-gutter .tg-hour span { position: absolute; top: -7px; inset-inline-end: 6px; font-size: 10px; color: var(--hcal-muted); }
.tg-day-col { border-inline-start: 1px solid var(--hcal-border); position: relative; }
.tg-day-col .tg-hour { border-bottom: 1px solid color-mix(in srgb, var(--hcal-border) 60%, transparent); cursor: pointer; }
.tg-event { position: absolute; inset-inline: 2px; border: none; cursor: pointer; font: inherit; font-size: 11px; text-align: start; color: var(--hcal-event-fg); background: var(--_ev-color, var(--hcal-accent)); border-radius: 4px; padding: 2px 6px; overflow: hidden; box-shadow: 0 0 0 1px var(--hcal-bg); }
.tg-event small { display: block; opacity: 0.85; font-size: 10px; }
.now-line { position: absolute; inset-inline: 0; height: 2px; background: #ea4335; pointer-events: none; }
.now-line::before { content: ""; position: absolute; inset-inline-start: -4px; top: -3px; width: 8px; height: 8px; border-radius: 999px; background: #ea4335; }

/* agenda */
.agenda { padding: 8px 0; overflow-y: auto; max-height: 640px; }
.agenda-day { display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--hcal-border); }
.agenda-date { min-width: 120px; }
.agenda-date .hijri { font-weight: 600; }
.agenda-date .greg { font-size: 11px; color: var(--hcal-muted); }
.agenda-items { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.agenda-item { display: flex; gap: 10px; align-items: baseline; border: none; background: none; cursor: pointer; font: inherit; color: var(--hcal-fg); text-align: start; padding: 2px 4px; border-radius: 4px; }
.agenda-item:hover { background: color-mix(in srgb, var(--hcal-fg) 6%, transparent); }
.agenda-item .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--_ev-color, var(--hcal-accent)); flex: none; }
.agenda-item .when { font-size: 11px; color: var(--hcal-muted); min-width: 96px; }
.agenda-empty { padding: 16px; text-align: center; color: var(--hcal-muted); }

:host([dir="rtl"]) .cal { direction: rtl; }
`;
