import { arabicFontFace, ARABIC_FONT_FAMILY } from "./font-arabic";

export const styles = `
${arabicFontFace}
:host {
  --hcal-bg: #fff;
  --hcal-fg: #1a1a1a;
  --hcal-muted: #5b6572;
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
  --hcal-grid-line: var(--hcal-border);
  --hcal-cell-padding: 4px;
  --hcal-cell-hover-bg: color-mix(in srgb, var(--hcal-fg) 6%, transparent);
  --hcal-cell-out-bg: transparent;
  --hcal-cell-out-opacity: 0.45;
  /* D8: out-of-month text de-emphasis is a solid color, not opacity (opacity multiplies the
     contrast deficit of whatever it's applied to — see the .day-head.out rule below, which no
     longer carries an opacity declaration). --hcal-cell-out-opacity above is retained only for
     any host CSS that still references it; nothing in this stylesheet applies it to text or
     to part="day-cell"'s own background anymore. */
  --hcal-cell-out-fg: var(--hcal-muted);
  --hcal-weekend-bg: transparent;
  --hcal-weekend-fg: inherit;
  --hcal-today-color: var(--hcal-accent);
  --hcal-today-indicator-color: var(--hcal-accent);
  --hcal-day-primary-font-size: 14px;
  --hcal-day-primary-color: var(--hcal-fg);
  --hcal-day-primary-weight: 600;
  --hcal-day-secondary-font-size: 9px;
  --hcal-day-secondary-color: var(--hcal-muted);
  --hcal-day-secondary-font-family: var(--hcal-font-family-arabic);
  --hcal-month-marker-color: var(--hcal-muted);
  --hcal-transition: 0ms;
  --hcal-gutter-bg: transparent;
  --hcal-gutter-width: 56px;
  --hcal-hour-height: 48px;
  --hcal-slot-alt-bg: transparent;
  --hcal-slot-hover-bg: color-mix(in srgb, var(--hcal-fg) 4%, transparent);
  --hcal-today-column-bg: transparent;
  --hcal-event-radius: 4px;
  --hcal-chip-padding: 1px 6px;
  --hcal-block-padding: 2px 6px;
  --hcal-event-font-size: 11px;
  --hcal-event-border-width: 2px;
  --hcal-event-tint-alpha: 18%;
  --hcal-event-hover-bg: none;
  --hcal-event-hover-shadow: none;
  --hcal-event-hover-transform: none;
  --hcal-event-inset: 2px;
  --hcal-now-color: #c5321f;
  --hcal-now-width: 2px;
  --hcal-now-dot-size: 8px;
  --hcal-banner-bg: var(--hcal-header-bg);
  --hcal-banner-padding: 16px 20px;
  --hcal-banner-primary-font-size: 28px;
  --hcal-cell-min-height-medium: 72px;
  --hcal-cell-min-height-narrow: 56px;
  --hcal-column-min-width: 120px;
  --hcal-event-dot-size: 6px;
  display: block;
  font-family: var(--hcal-font-family);
  color: var(--hcal-fg);
  /* §5.9 task 7: the host never widens its container — every band's overflow lives inside
     its own part="scroll" container instead (month narrow-events="scroll", week/day at
     medium/narrow), never on the host or the page. */
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}
/* Finding 3 (task-5 review): overflow-x: auto is restored here (it was dropped to a bare
   'overflow: hidden' during Phase 5, which silently clipped instead of scrolled at every band,
   including wide). Task 7's "all overflow lives in part=scroll" principle covers the grid
   regions this component owns, but not agenda content or renderEvent/renderDayCell hook output
   (Phase 4 lets hosts return arbitrary text/nodes there), which sit in no scroll container of
   their own — .cal is their fallback. Restoring the longhand costs nothing: content already
   inside a part="scroll" descendant still scrolls there first, since overflow is resolved at the
   nearest ancestor that actually overflows. */
.cal { background: var(--hcal-bg); border: 1px solid var(--hcal-border); border-radius: var(--hcal-radius); overflow: hidden; overflow-x: auto; display: flex; flex-direction: column; }
.body-wrap { position: relative; flex: 1; display: flex; flex-direction: column; min-height: 0; }
[part="loading"] { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: var(--hcal-event-font-size); color: var(--hcal-muted); background: color-mix(in srgb, var(--hcal-bg) 80%, transparent); }
:host([loading]) .month, :host([loading]) .timegrid, :host([loading]) .agenda { pointer-events: none; }
.toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--hcal-border); flex-wrap: wrap; }
.toolbar button { background: none; border: 1px solid var(--hcal-border); cursor: pointer; font: inherit; color: var(--hcal-fg); border-radius: var(--hcal-button-radius); padding: 4px 10px; }
.toolbar button:hover { background: color-mix(in srgb, var(--hcal-fg) 6%, transparent); }
.nav-group { display: flex; gap: 4px; }
.title { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 160px; }
.title [part~="title-primary"] { font-weight: 600; font-size: var(--hcal-title-font-size); color: var(--hcal-title-color); font-family: var(--hcal-font-family-arabic); }
.title [part~="title-secondary"] { font-weight: 400; color: var(--hcal-title-secondary-color); font-size: var(--hcal-title-secondary-font-size); font-family: var(--hcal-font-family-display); }
/* title-layout: the effective layout ("stacked"/"inline") is decided at render time
   (hijri-calendar.ts, task 3 — forced "stacked" at the narrow band regardless of the
   title-layout attribute), so CSS keys off the rendered data-layout hook rather than the
   raw host attribute directly. */
.title[data-layout="inline"] { flex-direction: row; align-items: baseline; justify-content: center; gap: 8px; }
.title[data-layout="inline"] [part~="title-secondary"] { padding-inline-start: 8px; border-inline-start: var(--hcal-title-separator); }
.view-switch { display: flex; gap: 2px; background: var(--hcal-switch-bg); }
.view-switch button[aria-pressed="true"] { background: var(--hcal-switch-active-bg); color: var(--hcal-switch-active-fg); border-color: var(--hcal-switch-active-bg); box-shadow: var(--hcal-switch-active-shadow); }
.subheader { display: block; width: 100%; }

/* §5.9 task 3: toolbar wrap rules at medium/narrow — nav+title on the first row, the view
   switch (and toolbar-end slot content) forced onto a second row via flex-basis:100%, which
   only takes effect because .toolbar already has flex-wrap: wrap. */
.cal[data-size="medium"] .view-switch, .cal[data-size="medium"] .toolbar > slot[name="toolbar-end"],
.cal[data-size="narrow"] .view-switch, .cal[data-size="narrow"] .toolbar > slot[name="toolbar-end"] { flex-basis: 100%; }
.cal[data-size="narrow"] .view-switch { display: flex; }
.cal[data-size="narrow"] .view-switch button { flex: 1; }

/* §5.9: part="scroll" is the one horizontal-scroll container the responsive model uses —
   month's narrow-events="scroll" wraps .month in it (task 4); week/day always wrap
   .tg-head/.tg-allday/.tg-body in it (task 5), harmlessly inert at wide since those tracks
   never overflow it there (Global Constraint 1). */
[part="scroll"] { overflow-x: auto; min-width: 0; }

/* month view */
.month { display: flex; flex-direction: column; flex: 1; }
/* narrow-events="scroll" (task 4): .month keeps its desktop min-width inside the scroll
   wrapper instead of collapsing, so the horizontal scrollbar actually has something to scroll. */
[part="scroll"] > .month { min-width: 640px; }
.dow-row { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--hcal-border); background: var(--hcal-header-bg); }
.dow { display: flex; flex-direction: column; align-items: var(--hcal-weekday-align); text-align: var(--hcal-weekday-align); font-size: var(--hcal-weekday-font-size); color: var(--hcal-weekday-color); padding: 6px 0; font-family: var(--hcal-font-family-arabic); }
/* D8: no opacity here either — it compounded on top of an already-muted parent (.dow inherits
   --hcal-weekday-color) and pushed this text below AA on its own; the parent's muted color is
   already the intended de-emphasis. */
.dow [part~="weekday-secondary"] { font-family: var(--hcal-font-family-mono); }
.dow[part~="weekend"] { color: var(--hcal-weekend-fg); }
/* One week = a role="rowgroup" wrapper holding the day row (.week, 7 role="gridcell" cells) and,
   when the week has any, the spanning event row (.lanes). ARIA: role="row" permits only cells as
   children, so the chips/more-links can't live in the day row — see hijri-calendar.ts's
   renderMonth() and api.md's Accessibility section.

   .week-wrap is the positioned, min-height-carrying box the absolutely positioned .day-cell
   background layer resolves against (it used to be .week itself, back when .week held every one
   of these boxes in one grid). Its height is therefore the full month-cell height — day row plus
   lane rows, or the min-height floor, whichever is larger — exactly as .week's was before. NOTHING
   below may make .week or .week-cell positioned: that would re-bound .day-cell to the day row's
   own height, which is the (twice-shipped) bug the abspos layer exists to avoid. */
.week-wrap { min-height: var(--hcal-cell-min-height); position: relative; }
/* §5.9 task 4: month-cell minimum height shrinks at medium/narrow — wide keeps
   --hcal-cell-min-height unchanged (Global Constraint 1). */
.cal[data-size="medium"] .week-wrap { min-height: var(--hcal-cell-min-height-medium); }
.cal[data-size="narrow"] .week-wrap { min-height: var(--hcal-cell-min-height-narrow); }
.week { display: grid; grid-template-columns: repeat(7, 1fr); }
/* The day gridcell contributes no box of its own (no padding/border/margin) and is a grid
   container purely so its .day-head button stretches to fill it, exactly as the button did back
   when it was the grid item of .week directly. */
.week-cell { display: grid; }
/* The spanning event layer: same 7 equal columns as .week, so chip columns line up with day
   columns without needing subgrid; lane rows are its own implicit rows, so a lane's height is
   the tallest chip in that lane across the whole week (auto-sized, never a hard-coded lane
   height). min-width: 0 on the cells keeps a long chip title from widening a 1fr track — the
   chip itself clips (overflow: hidden), as it did when it was the grid item. */
.lanes { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); grid-auto-rows: min-content; }
.lane-cell { display: grid; min-width: 0; }
/* Background layer (R1): one div per column, behind the day-head buttons/chips/more-link
   (all position: relative; z-index: 1) in both DOM and stacking order — the chips' own
   z-index: 1 keeps them above this layer even though .lanes comes later in the DOM (an
   in-flow, non-positioned box paints below a positioned z-index: 0 one). */
.day-cell { position: absolute; top: 0; bottom: 0; inset-inline-start: calc(var(--_col, 0) * (100% / 7)); width: calc(100% / 7); z-index: 0; box-sizing: border-box; padding: var(--hcal-cell-padding); border-inline-end: 1px solid var(--hcal-grid-line); border-block-end: 1px solid var(--hcal-grid-line); transition: background var(--hcal-transition); }
/* Last column only — each .day-cell is now the only div inside its own gridcell, so this can no
   longer be :nth-of-type(7) among siblings. */
.week-cell:last-child .day-cell { border-inline-end: none; }
.day-cell:hover { background: var(--hcal-cell-hover-bg); }
.day-cell.out { background: var(--hcal-cell-out-bg); }
.day-cell.weekend { background: var(--hcal-weekend-bg); }
.day-cell.today { background: var(--hcal-today-bg); }
[part~="today-indicator"] { position: absolute; top: 4px; inset-inline-end: 4px; width: 6px; height: 6px; border-radius: 999px; background: var(--hcal-today-indicator-color); pointer-events: none; }
/* §5.9 task 4: narrow-events="dots" — the day-cell layer becomes the dots' own layout
   container (bottom-aligned, wrapping), never a grid item itself (see the R1 comment above:
   day-cell keeps its --_col-based absolute positioning either way). */
.cal[data-size="narrow"] .day-cell { display: flex; align-items: flex-end; justify-content: center; flex-wrap: wrap; gap: 2px; padding-bottom: 4px; }
[part~="event"][part~="dot"] { width: var(--hcal-event-dot-size); height: var(--hcal-event-dot-size); border-radius: 999px; background: var(--_ev-color, var(--hcal-accent)); flex: none; pointer-events: none; }
.day-cell [part="more-link"] { font-size: 9px; line-height: var(--hcal-event-dot-size); color: var(--hcal-muted); font-family: var(--hcal-font-family-mono); pointer-events: none; }
.day-head { border: none; background: none; cursor: pointer; font: inherit; color: var(--hcal-fg); display: flex; align-items: baseline; gap: 4px; justify-content: center; padding: 4px 4px 2px; border-radius: 6px; position: relative; z-index: 1; }
.day-head:focus-visible { outline: 2px solid var(--hcal-accent); outline-offset: 1px; }
[part~="day-numbers"] { display: contents; }
[part~="day-month-marker"] { margin-inline-start: auto; font-size: var(--hcal-day-secondary-font-size); color: var(--hcal-month-marker-color); font-family: var(--hcal-day-secondary-font-family); white-space: nowrap; }
.day-head .num-primary, .tg-col-head .num-primary { font-weight: var(--hcal-day-primary-weight); font-size: var(--hcal-day-primary-font-size); font-family: var(--hcal-font-family-arabic); color: var(--hcal-day-primary-color); }
.day-head .num-secondary, .tg-col-head .num-secondary { font-size: var(--hcal-day-secondary-font-size); color: var(--hcal-day-secondary-color); white-space: nowrap; font-family: var(--hcal-day-secondary-font-family); }
:host([secondary-position="start"]) .day-head { flex-direction: row-reverse; }
:host([secondary-position="below"]) .day-head { flex-direction: column; gap: 0; align-items: center; }
:host([secondary-position="above"]) .day-head { flex-direction: column-reverse; gap: 0; align-items: center; }
:host([day-number-align="start"]) .day-head,
:host([day-number-align="start"]) .tg-col-head { justify-content: flex-start; align-items: flex-start; }
:host([day-number-align="end"]) .day-head,
:host([day-number-align="end"]) .tg-col-head { justify-content: flex-end; align-items: flex-end; }
/* D8: out-of-month numbers are de-emphasised with a dedicated color token instead of opacity —
   opacity on text multiplies whatever contrast deficit the underlying color already has, which is
   exactly how this failed AA (see --hcal-cell-out-fg default above). Each descendant that carries
   its own color (num-primary, num-secondary, day-month-marker) is targeted directly rather than
   relying on inheritance, since each already sets its own color in the rules above. */
.day-head.out .num-primary,
.day-head.out .num-secondary,
.day-head.out [part~="day-month-marker"] { color: var(--hcal-cell-out-fg); }
:host(:not([today-marker])) .day-head.today .num-primary,
:host([today-marker="pill"]) .day-head.today .num-primary { background: var(--hcal-accent); color: var(--hcal-accent-fg); border-radius: 999px; padding: 1px 6px; }
:host([today-marker="dot"]) .day-head.today .num-primary { color: var(--hcal-today-color); }
.day-head[data-disabled] { cursor: not-allowed; opacity: 0.3; }
.chip { border: none; cursor: pointer; font: inherit; font-size: var(--hcal-event-font-size); text-align: start; color: var(--hcal-event-fg); background: var(--_ev-color, var(--hcal-accent)); border-radius: var(--hcal-event-radius); padding: var(--hcal-chip-padding); margin: 1px 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; position: relative; z-index: 1; }
.chip.continues-before { border-start-start-radius: 0; border-end-start-radius: 0; }
.chip.continues-after { border-start-end-radius: 0; border-end-end-radius: 0; }
.more { border: none; background: none; cursor: pointer; font: inherit; font-size: 11px; color: var(--hcal-muted); text-align: start; padding: 0 6px; margin: 1px 2px; position: relative; z-index: 1; }
.more:hover { color: var(--hcal-fg); }
/* event-style (P3): "solid" is the default .chip/.tg-event background above; "tinted" and
   "outline" are selected on the part attribute itself (only elements carrying part="event"
   ever carry these tokens), so no extra class is needed. */
[part~="event"][part~="tinted"] { background: color-mix(in srgb, var(--_ev-color, var(--hcal-accent)) var(--hcal-event-tint-alpha), transparent); color: var(--_ev-color, var(--hcal-accent)); border-inline-start: var(--hcal-event-border-width) solid var(--_ev-color, var(--hcal-accent)); }
[part~="event"][part~="outline"] { background: transparent; color: var(--_ev-color, var(--hcal-accent)); border: 1px dashed var(--_ev-color, var(--hcal-accent)); border-inline-start: var(--hcal-event-border-width) solid var(--_ev-color, var(--hcal-accent)); }
/* Hover affordances default to no-op: each var() below substitutes a value ("none") that is
   invalid for its property, so per CSS custom-property semantics the whole declaration falls
   back to its initial value (no shadow / no filter / no transform) until a host supplies a
   real value — the chip's normal background is never touched, so it can never be regressed. */
.chip:hover, .tg-event:hover { box-shadow: inset 0 0 0 999px var(--hcal-event-hover-bg); filter: drop-shadow(var(--hcal-event-hover-shadow)); transform: var(--hcal-event-hover-transform); }

/* time grid (week/day) */
.timegrid { display: flex; flex-direction: column; flex: 1; }
/* §5.9 task 5: .tg-head/.tg-allday/.tg-body's shared scroll wrapper (see the generic
   [part="scroll"] rule above) also needs to lay them out in a column, same as .timegrid did
   directly before this wrapper existed. */
.timegrid > [part="scroll"] { display: flex; flex-direction: column; flex: 1; min-height: 0; }
/* Sticky gutter (task 5, verbatim CSS from the brief): the all-day row's label cell and the
   head row's leading (empty) cell stay pinned to the scroll container's inline-start edge via
   this rule alone, while [part="scroll"] scrolls horizontally; the head row itself stays pinned
   to the top. '.tg-gutter' is the exception (Finding 2, task-5 review): this declaration's
   'inset-inline-start: 0' on '.tg-gutter' is INERT on its own — always resolves to an offset of
   0 — because '.tg-gutter' lives inside '.tg-body', and '.tg-body' has its own non-visible
   overflow-x (see the '.tg-body' rule below), which per the CSS Overflow spec makes '.tg-body'
   itself the nearest scrolling ancestor for the gutter's sticky-inset resolution, and '.tg-body'
   never scrolls horizontally. The actual pin for '.tg-gutter' comes entirely from
   'wireStickyGutter()' in hijri-calendar.ts (a 'scroll'-driven 'transform: translateX()'), not
   from this CSS. This rule is kept anyway, verbatim, to satisfy the brief's literal
   unit-acceptance bullet ("styles string contains 'position: sticky' for '.tg-gutter'") and to
   document original intent — but if you are touching sticky/scroll CSS here, the gutter's real
   behaviour is in the JS, not this file; do not "clean up" wireStickyGutter() as redundant. */
.tg-gutter, .tg-allday-label, .tg-head > :first-child { position: sticky; inset-inline-start: 0; z-index: 3; background: var(--hcal-gutter-bg, var(--hcal-bg)); }
.tg-head { position: sticky; top: 0; z-index: 4; }
.tg-head { display: grid; border-bottom: 1px solid var(--hcal-border); background: var(--hcal-header-bg); }
.tg-col-head { text-align: center; padding: 6px 2px; border-inline-start: 1px solid var(--hcal-border); display: flex; flex-direction: column; align-items: center; }
.tg-col-head .dow { padding: 0; }
.tg-col-head.today { background: var(--hcal-today-bg); }
.tg-col-head.today .num-primary { color: var(--hcal-accent); }
/* day-header="banner" (day view only): replaces .tg-head entirely, see dayBannerHtml(). */
[part~="day-banner"] { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: var(--hcal-banner-padding); background: var(--hcal-banner-bg); border-bottom: 1px solid var(--hcal-border); }
[part~="day-banner"][part~="today"] { background: var(--hcal-today-bg); }
[part~="day-banner"] > div:first-child { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
[part="day-banner-primary"] { font-size: var(--hcal-banner-primary-font-size); font-weight: 600; font-family: var(--hcal-font-family-arabic); color: var(--hcal-fg); }
[part="day-banner-secondary"] { font-size: var(--hcal-title-secondary-font-size); color: var(--hcal-title-secondary-color); font-family: var(--hcal-font-family-display); }
[part="day-banner-weekday"] { font-size: var(--hcal-weekday-font-size); color: var(--hcal-weekday-color); font-family: var(--hcal-font-family-mono); }
[part="day-banner-summary"] { font-size: var(--hcal-event-font-size); color: var(--hcal-muted); white-space: nowrap; }
.tg-allday { display: grid; border-bottom: 1px solid var(--hcal-border); min-height: 22px; background: var(--hcal-header-bg); }
.tg-allday-label { font-size: 10px; color: var(--hcal-muted); display: flex; align-items: center; justify-content: center; }
.tg-allday-col { border-inline-start: 1px solid var(--hcal-border); display: flex; flex-direction: column; }
/* overflow-x: clip (not the default "visible"): per the CSS Overflow spec, an element whose
   overflow-y is non-visible (here, "auto") has its overflow-x *computed value* silently
   promoted from "visible" to "auto" too, unless overflow-x is itself something other than
   "visible" — "clip" avoids that specific promotion (unlike "hidden", it never establishes a
   *scrollable* overflow region of its own). This narrows the surface area of the problem, but
   it does NOT fix the sticky gutter (Finding 2, task-5 review — an earlier version of this
   comment implied it did, past tense, as though the bug were resolved here): per spec, a box
   with non-"visible" overflow in *either* axis — "clip" included — is still a scroll container
   for its descendants' sticky-inset resolution, so .tg-gutter's inset-inline-start still
   resolves against .tg-body instead of part="scroll", and is still permanently 0. The actual
   fix is wireStickyGutter() in hijri-calendar.ts; this declaration is retained because it is
   still correct and harmless (and needed for reasons unrelated to sticky positioning — it keeps
   any wide/oddly-sized hook content from pushing a second, redundant horizontal scrollbar onto
   .tg-body itself). Caught by browser verification (Chromium), not jsdom, which performs no
   layout and can't see this at all. */
.tg-body { display: grid; position: relative; overflow-y: auto; overflow-x: clip; max-height: var(--hcal-body-max-height); }
/* position comes from the sticky rule above (.tg-gutter, .tg-allday-label, .tg-head >
   :first-child) — not redeclared here so that rule's position: sticky isn't shadowed by a
   same-specificity position: relative later in the cascade. */
.tg-gutter { background: var(--hcal-gutter-bg); }
.tg-slot { height: var(--_slot-h); box-sizing: border-box; }
.tg-gutter .tg-slot { position: relative; }
.tg-gutter .tg-slot span { position: absolute; top: -7px; inset-inline-end: 6px; font-size: 10px; color: var(--hcal-muted); white-space: nowrap; font-family: var(--hcal-font-family-mono); }
:host([time-label-position="cell"]) .tg-gutter .tg-slot span { top: 2px; }
.tg-day-col { border-inline-start: 1px solid var(--hcal-border); position: relative; }
.tg-day-col.today { background: var(--hcal-today-column-bg); }
.tg-day-col .tg-slot { cursor: pointer; }
.tg-day-col .tg-slot.tg-slot-alt { background: var(--hcal-slot-alt-bg); }
.tg-day-col .tg-slot.slot-hour-end { border-bottom: 1px solid color-mix(in srgb, var(--hcal-border) 60%, transparent); }
.tg-day-col .tg-slot:hover { background: var(--hcal-slot-hover-bg); }
.tg-event { position: absolute; inset-inline: var(--hcal-event-inset); border: none; cursor: pointer; font: inherit; font-family: var(--hcal-font-family-display); font-size: var(--hcal-event-font-size); text-align: start; color: var(--hcal-event-fg); background: var(--_ev-color, var(--hcal-accent)); border-radius: var(--hcal-event-radius); padding: var(--hcal-block-padding); overflow: hidden; box-shadow: 0 0 0 1px var(--hcal-bg); }
.tg-event [part~="event-time"] { display: block; opacity: 0.85; font-size: 10px; font-family: var(--hcal-font-family-mono); }
.now-line { position: absolute; inset-inline: 0; height: var(--hcal-now-width); background: var(--hcal-now-color); pointer-events: none; }
.now-line::before { content: ""; position: absolute; inset-inline-start: calc(var(--hcal-now-dot-size) / -2); top: calc((var(--hcal-now-width) - var(--hcal-now-dot-size)) / 2); width: var(--hcal-now-dot-size); height: var(--hcal-now-dot-size); border-radius: 999px; background: var(--hcal-now-color); }
[part="now-label"] { position: absolute; top: -8px; inset-inline-start: 4px; transform: translateY(-100%); font-size: 10px; font-family: var(--hcal-font-family-mono); color: var(--hcal-now-color); white-space: nowrap; pointer-events: none; }
/* §5.9 task 6: the day banner's summary stacks below the date at the narrow band. */
.cal[data-size="narrow"] [part~="day-banner"] { flex-direction: column; align-items: flex-start; }

/* agenda */
.agenda { padding: 8px 0; overflow-y: auto; max-height: var(--hcal-body-max-height); }
.agenda-day { display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--hcal-border); }
/* §5.9 task 6: the agenda date stacks above its items at the narrow band. */
.cal[data-size="narrow"] .agenda-day { flex-direction: column; gap: 4px; }
.cal[data-size="narrow"] .agenda-date { min-width: 0; }
.agenda-date { min-width: 120px; }
.agenda-date .hijri { font-weight: 600; font-family: var(--hcal-font-family-arabic); }
.agenda-date .greg { font-size: 11px; color: var(--hcal-muted); font-family: var(--hcal-font-family-display); }
.agenda-items { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.agenda-item { display: flex; gap: 10px; align-items: baseline; border: none; background: none; cursor: pointer; font: inherit; color: var(--hcal-fg); text-align: start; padding: 2px 4px; border-radius: 4px; }
.agenda-item:hover { background: color-mix(in srgb, var(--hcal-fg) 6%, transparent); }
.agenda-item .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--_ev-color, var(--hcal-accent)); flex: none; }
.agenda-item [part~="event-time"] { font-size: 11px; color: var(--hcal-muted); min-width: 96px; font-family: var(--hcal-font-family-mono); }
.agenda-empty { padding: 16px; text-align: center; color: var(--hcal-muted); }

:host([dir="rtl"]) .cal { direction: rtl; }
`;
