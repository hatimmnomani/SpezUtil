---
title: API reference
---

# `<hijri-calendar>` API

## Attributes

Existing attributes, unchanged:

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `view` | `month \| week \| day \| agenda` | `month` | Active view. |
| `date` | ISO date | today | Focused date; determines the shown month/week/day/agenda window. |
| `locale` | `translit \| ar` | `translit` | Transliterated Fatimid or Arabic **UI chrome strings** (toolbar labels, "+N more", "All day", loading text, day-banner summary). Independent of `names` and `numerals` — see below. |
| `dir` | `ltr \| rtl` | `ltr` | Text direction of the component as a whole. |
| `week-start` | `0–6` | `0` | First day of week (0 = Sunday). Also the sole driver of month-grid column order (left-to-right Sun→Sat by default) — never affected by `names` or `numerals`. |
| `day-start` | `0–23` | `0` | First visible hour in week/day views. |
| `day-end` | `1–24` | `24` | Last visible hour (exclusive) in week/day views. |
| `time-format` | `12 \| 24` | `12` | Hour label / event time format. |
| `max-events` | number | `3` | Visible event lanes per month-view week before days collapse into "+N more" (or dots, see `narrow-events`). |
| `primary` | `hijri \| gregorian` | `hijri` | Which day number is prominent in day cells and time-grid headers. |
| `secondary-position` | `end \| start \| above \| below \| hidden` | `end` | Where the secondary day number sits relative to the primary (or hide it). |
| `timezone` | IANA name (e.g. `"Asia/Kolkata"`) | viewer's local zone | Pins "today" and the current-time indicator to a fixed zone instead of resolving against the viewer's device. |

Every attribute has a matching camelCase property (`weekStart`, `dayStart`, `dayEnd`, `timeFormat`, `maxEvents`, `locale`, `view`, `date`, `timezone`, …).

## New attributes (events-parity API)

All of these are additive: every default reproduces today's (pre-parity) behaviour, **except** the
nine accepted visual changes listed in [Accepted visual changes](#accepted-visual-changes-d1d9)
below. A 0.2.x consumer upgrading to 0.3.0 sees no other visual difference.

| Attribute (property) | Type | Default | Description |
| --- | --- | --- | --- |
| `views` (`views`) | space-separated list of `month\|week\|day\|agenda` | `"month week day agenda"` | Which view buttons render, in which order. Unknown tokens are ignored; the currently active `view` is always rendered even if absent from the list. |
| `toolbar` (`toolbar`) | `"full" \| "none"` | `"full"` | `"none"` removes the built-in toolbar (the host drives `view`/`date` itself, e.g. from URL params). Slots still render. |
| `title-layout` (`titleLayout`) | `"stacked" \| "inline"` | `"stacked"` | Gregorian subtitle rendered below the Hijri title (today) or inline after it with a separator. |
| `names` (`names`) | `"translit" \| "ar"` | follows `locale` | Hijri month & weekday **name set**, independent of the `locale` UI strings. Set `names="ar"` for genuine Arabic month/weekday names while keeping English toolbar labels. |
| `numerals` (`numerals`) | `"latn" \| "arab"` | `"arab"` | Digit system for **Hijri** numbers: day numbers, Hijri year, title primary, agenda Hijri date, day-banner primary. Defaults to Arabic-Indic (see [D9](#accepted-visual-changes-d1d9)); set `numerals="latn"` for the pre-0.3.0 Latin look. See the [numerals truth table](#numerals-truth-table). |
| `numerals-gregorian` (`numeralsGregorian`) | `"latn" \| "arab"` | `"latn"` | Digit system for **Gregorian** numbers *and clock digits*: Gregorian day numbers, Gregorian year in the title/agenda/banner, time-gutter labels, `event-time` text, event duration/count/hours-scheduled figures, `now-label`. Month abbreviations ("Jul") and `AM`/`PM` are never transliterated. `locale` never decides a digit system — only `numerals` and `numerals-gregorian` do. |
| `weekday-format` (`weekdayFormat`) | `"short" \| "long" \| "bilingual"` | `"short"` | `"bilingual"` renders the `names` weekday (primary) and the English abbreviation (secondary) stacked. |
| `weekend-days` (`weekendDays`) | space-separated day indices `0`(Sun)–`6`(Sat) | `"0 6"` | Days that receive the `weekend` part token and `--hcal-weekend-*` styling. Empty string = no weekend. Set `weekend-days="5 6"` for a Fri/Sat weekend. Out-of-range or duplicate tokens are ignored. |
| `day-number-align` (`dayNumberAlign`) | `"center" \| "start" \| "end"` | `"center"` | Alignment of the number row in month cells and time-grid column heads. |
| `month-marker` (`monthMarker`) | `"gregorian" \| "hijri" \| "both" \| "none"` | `"gregorian"` | Which calendar's first-of-month gets a month-name marker in day cells / column heads. |
| `today-marker` (`todayMarker`) | `"pill" \| "dot" \| "none"` | `"pill"` | Pill around the primary number (today) or a corner dot; `--hcal-today-bg` applies to the whole cell in all three modes. |
| `event-style` (`eventStyle`) | `"solid" \| "tinted" \| "outline"` | `"solid"` in 0.3.x — **becomes `"tinted"` at 1.0**, see [below](#event-style-will-default-to-tinted-at-10) | Default chip/block rendering. A per-event `style` field overrides this per event. |
| `event-time` (`eventTime`) | `"auto" \| "none" \| "start" \| "start-duration" \| "range"` | `"auto"` | Time text rendered on chips/blocks. `"auto"` = none in month view, `"start"` in week/day (today's behaviour, unchanged). |
| `slot-minutes` (`slotMinutes`) | `15 \| 30 \| 60` | `30` | Time-grid slot granularity. **Also the granularity of `slot-click`** — see the [slot-click coarsening note](#slot-minutes-coarsens-slot-click). |
| `allday-row` (`alldayRow`) | `"always" \| "auto" \| "never"` | `"always"` | `"auto"` hides the all-day row entirely when no all-day event is in the visible range. |
| `now-indicator` (`nowIndicator`) | `"line" \| "line-label" \| "none"` | `"line"` | Current-time line in week/day views, optionally with a "Now · 13:30" label. |
| `time-label-position` (`timeLabelPosition`) | `"line" \| "cell"` | `"line"` | Gutter hour label centred on the hour line (today's behaviour) or top-aligned inside the hour cell. |
| `day-header` (`dayHeader`) | `"column" \| "banner"` | `"column"` | Day view only: compact column head (matches week view) or a full-width banner with a computed "N events · X hours" summary. |
| `agenda-days` (`agendaDays`) | integer `1`–`366` | `30` | Length of the agenda window, in days, starting at `date`. |
| `loading` (`loading`) | boolean | `false` | Sets `aria-busy="true"` on the grid/timegrid/agenda and renders a `part="loading"` overlay (`slot="loading"` to replace its content). |
| `narrow-events` (`narrowEvents`) | `"dots" \| "scroll"` | `"dots"` | Month view at the `narrow` size band (see [Responsive model](#responsive-model)): collapse chips to coloured, non-interactive dots (tap the cell → `date-click`), or keep the desktop lane layout and scroll horizontally. |

## Read-only properties (JS only)

| Property | Type | Description |
| --- | --- | --- |
| `size` | `"wide" \| "medium" \| "narrow"` | Current [size band](#responsive-model), measured from the host's own width. Also exposed as a part token on `part="calendar"` (e.g. `part="calendar narrow"`). |
| `visibleRange` | `RangeChangeDetail \| null` | The same object carried by the most recent `range-change` event, or `null` before the first render. **This is the load-bearing catch-up path for React and Angular hosts** — see [Fetching events for the visible range](/calendar/getting-started#fetching-events-for-the-visible-range). |

## Properties (JS only)

| Property | Type | Description |
| --- | --- | --- |
| `events` | `CalendarEvent[]` | The events to display. Setting it re-renders. |
| `eventFields` | `EventFieldMap` | Maps your own event shape's field names onto `CalendarEvent`. See [Mapping your own event shape](/calendar/getting-started) and the README's `eventFields` function example. |
| `isDateDisabled` | `(hijri, gregorian) => boolean` | Marks month-view day cells disabled. |
| `renderEvent` | `(ctx: RenderEventContext) => Node \| string \| null` | Replaces the **inner content** of a chip/block/agenda item. `string` is inserted as a text node (never parsed as HTML); `null` falls back to the default renderer. See [Render hooks](#render-hooks-renderevent--renderdaycell). |
| `renderDayCell` | `(ctx: RenderDayCellContext) => Node \| string \| null` | Replaces the **inner content** of the month-cell number button and the time-grid column head (both `part~="day"`). Same `string`/`null` contract as `renderEvent`. Output must be non-interactive — it lives inside a `<button>`. |

### `CalendarEvent`

```ts
interface CalendarEvent {
  id: string;
  title: string;
  start: string;              // "yyyy-mm-dd" (all-day) or "yyyy-mm-ddTHH:mm" (timed), Gregorian
  end?: string;                // timed: exclusive; all-day: inclusive date. Defaults: +1h / same day
  durationMinutes?: number;    // derives `end` when `end` is absent (timed events only)
  allDay?: boolean;            // derived from `start` when omitted
  color?: string;              // chip/block background (any CSS color)
  subtitle?: string;           // second text line (e.g. location); part="event-subtitle" in week/day/agenda
  tag?: string;                // short label (e.g. event type); hook-only — reaches you as ctx.event.tag, never rendered
  style?: "solid" | "tinted" | "outline"; // per-event override of the `event-style` attribute
  variant?: string;             // free token → part="event variant-<x>" + data-variant; must match /^[a-z0-9-]+$/
  data?: unknown;               // your payload, passed back in event details
}
```

### `EventFieldMap`

If your data doesn't use `CalendarEvent`'s field names, set `eventFields` instead of pre-mapping
every event by hand. Each value is either a source field name (string) or a **derive function**
run against the raw object:

```ts
type EventFieldSource<T = unknown> = string | ((raw: Record<string, unknown>) => T);

interface EventFieldMap {
  id?: EventFieldSource<string>;
  title?: EventFieldSource<string>;
  start?: EventFieldSource<string>;
  end?: EventFieldSource<string>;
  durationMinutes?: EventFieldSource<number>;
  allDay?: EventFieldSource<boolean>;
  color?: EventFieldSource<string>;
  subtitle?: EventFieldSource<string>;
  tag?: EventFieldSource<string>;
  style?: EventFieldSource<CalendarEvent["style"]>;
  variant?: EventFieldSource<string>;
}
```

Omitted keys default to the same-named field. The original raw object is always passed back as
`event.data` in click/interaction handlers, so a derive function's own inputs are never lost.

### Numerals truth table

Both `numerals` and `numerals-gregorian` share a single `formatNumerals()` utility from
`@spezutil/hijri-core`. `numerals-gregorian`'s `"latn"` default is untouched, so Gregorian day/year
numbers, clock digits and month abbreviations are unaffected by this section. `numerals`'s default
is `"arab"` (Arabic-Indic Hijri numbers — see [D9](#accepted-visual-changes-d1d9)); set
`numerals="latn"` for the pre-0.3.0 all-Latin look. `locale` **never** decides a digit system:

| `numerals` | `numerals-gregorian` | Hijri day/year/title | Gregorian day/year | Clock labels (`10:30`, gutter, event time/duration, `now-label`) | Month names |
| --- | --- | --- | --- | --- | --- |
| `latn` (pre-0.3.0 look) | `latn` (default) | `27 Shawwal 1447` | `14`, `May 2026` | `10:30` | per `names`; Gregorian month abbreviations are always Latin |
| `arab` (default) | `latn` | `٢٧ شوال ١٤٤٧` | `14`, `May 2026` | `10:30` | idem — this is the reference "editorial" look |
| `latn` | `arab` | `27 Shawwal 1447` | `١٤`, `May ٢٠٢٦` | `١٠:٣٠` | idem |
| `arab` | `arab` | `٢٧ شوال ١٤٤٧` | `١٤`, `May ٢٠٢٦` | `١٠:٣٠` | idem |

`AM`/`PM` in `time-format="12"` stay Latin letters in every combination — there are no Arabic
meridiem strings in `locale.ts` today.

### `slot-minutes` coarsens `slot-click`

`slot-minutes` sets the time-grid's visual granularity **and** the granularity of the `slot-click`
event fired for that grid. With `slot-minutes="60"`, `detail.gregorian` is always the hour start
(e.g. `"…T09:00"`) — it can never be `"…T09:30"`, because there is no 30-minute slot to click. This
is an accepted trade-off, not a bug: hosts that need finer-grained times than their configured
`slot-minutes` should collect them in their own UI (e.g. a time picker inside a "create meeting"
dialog opened from the coarser click).

### Render hooks (`renderEvent` / `renderDayCell`)

```ts
interface RenderEventContext {
  event: CalendarEvent;
  view: CalendarView;
  placement: "month-chip" | "allday-chip" | "timed-block" | "agenda-item";
  hijri: HijriDate;
  /** Pre-formatted labels honouring time-format / numerals-gregorian / locale. */
  labels: { start: string; end: string; duration: string; range: string };
  continuesBefore: boolean;
  continuesAfter: boolean;
  size: "wide" | "medium" | "narrow";
}

interface RenderDayCellContext {
  cell: DayCell;                        // hijri, gregorian, inCurrentMonth, isToday, disabled, isWeekend
  view: CalendarView;                   // "month" for cells, "week" | "day" for column heads
  placement: "month-cell" | "column-head";
  /** Events overlapping this day (all, including overflow), already field-mapped. */
  events: CalendarEvent[];
  /** Pre-formatted labels honouring primary / numerals / numerals-gregorian / month-marker. */
  labels: { primary: string; secondary: string; monthMarker: string | null; weekday: string };
  size: "wide" | "medium" | "narrow";
}
```

**Contract, for both hooks:** called during render, once per chip/block/agenda-item or per
day-cell/column-head. Return a `Node` (appended), a `string` (appended as a plain text node —
**never** parsed as HTML), or `null` (renders the default content). Must be synchronous and
side-effect free.

The wrapper element is always component-owned: `<button part="event …">` for `renderEvent`,
`<button part="day …">` for `renderDayCell` (in the month view that button sits inside the day's
`role="gridcell"`; see [Accessibility](#accessibility)). Hook output therefore inherits the
button's `:focus-visible` ring, roving `tabindex`, `aria-label`, and click wiring — **do not return
interactive elements** (nested interactive content is invalid HTML and breaks the grid's keyboard
model); use the `date-click` / `event-click` events instead if you need custom interaction.

A hook that **throws** is caught, reported once per hook function via `console.warn` (not once per
call — a hook reused across many cells/events warns only the first time), and the default renderer
is used for that call and every subsequent one. Hooks never break the calendar.

`renderDayCell` output must not use `position: fixed`/`absolute` outside its own button — the
month-cell background layer (`part="day-cell"`) sits at `z-index: 0` and the button/chips sit at
`z-index: 1`; escaping that stacking context would visually break the grid.

## Events

All events bubble and are `composed`.

| Event | `detail` | Fired when |
| --- | --- | --- |
| `event-click` | `{ event, hijri, gregorian }` | An event chip/block/agenda item is clicked. |
| `date-click` | `{ hijri, gregorian }` | A month-view day cell is clicked (including, at the `narrow` size band with `narrow-events="dots"`, clicking anywhere in the cell). |
| `slot-click` | `{ hijri, gregorian }` | An empty time-grid slot is clicked in week/day view (`gregorian` is the slot start datetime, coarsened to `slot-minutes` — see [above](#slot-minutes-coarsens-slot-click)). |
| `more-click` | `{ hijri, gregorian, events }` | A "+N more" link is clicked (`events` = all events that day). Not fired in `narrow-events="dots"` mode (there is no "+N more" link there — the count renders as text, not a button). |
| `view-change` | `{ view }` | The user switches views via the toolbar. |
| `date-change` | `{ date }` | The user navigates (today/prev/next) via the toolbar. |
| `range-change` | `RangeChangeDetail` (below) | See the [`range-change` contract](#range-change-contract). |

The host can also drive `view`/`date` by setting the attributes directly — the corresponding
`view-change`/`date-change` navigation events are only fired for user interaction with the
built-in toolbar, never as an echo of a host-set attribute.

### `RangeChangeDetail`

```ts
interface RangeChangeDetail {
  view: CalendarView;
  /** Inclusive first visible day, "yyyy-mm-dd" (Gregorian, UTC day). */
  start: string;
  /** Exclusive end, "yyyy-mm-dd" — the day after the last visible day. */
  end: string;
  hijriStart: HijriDate;
  /** Hijri date of the last visible day (inclusive, for display). */
  hijriEnd: HijriDate;
  reason: "init" | "navigate" | "view" | "attribute";
}
```

### `range-change` contract

This is the exact contract the component guarantees — reproduced verbatim from the design
document because hosts that fetch data on this event depend on every clause:

1. **Initial fire.** Exactly one `range-change` with `reason: "init"` after the first render, in
   `connectedCallback()` — synchronously, before `connectedCallback` returns. **Hosts that attach a
   listener after mount (all React and Angular wrapper hosts, and any vanilla host that adds its
   listener after `appendChild`) miss this event and must read the same object from the
   `visibleRange` property instead.** See [Fetching events for the visible
   range](/calendar/getting-started#fetching-events-for-the-visible-range).
2. **Subsequent fires.** After any render whose computed range differs from the last emitted one:
   toolbar prev/next/today (`reason: "navigate"`), view switch (`"view"`), and `date`, `view`,
   `week-start`, `agenda-days` attribute/property changes (`"attribute"`). Setting `events`,
   `eventFields`, `loading`, theming attributes, or resizing the host never fires it.
3. **Dedupe.** At most one event per render; consecutive identical `{view,start,end}` ranges never
   fire twice — rapid prev/next that ends back on the original month emits `A→B→A`, not `A→B→A→A`.
4. **No debounce inside the component.** Emission is synchronous and deterministic. Rapid
   navigation therefore emits one event per click; hosts that fetch on it must key their query by
   `{start, end}` and let their own data layer coalesce (TanStack Query's `queryKey` +
   `keepPreviousData` does this — see the getting-started recipe). The component does **not**
   cancel or coalesce fetches itself.
5. **Range definition per view.** Month: first cell of the 6×7 grid through the last cell + 1 day
   (so leading/trailing out-of-month days are included — events there are rendered). Week: 7
   columns from the `week-start`-aligned first day. Day: 1 day. Agenda: `agenda-days` days from
   `date`.
6. Emitted **before** any timers start (the now-indicator interval) and independently of
   `timezone` — ranges are UTC-day based like the rest of the component.

## Styling

### CSS custom properties

All declared on `:host`. Grouped by region; every default below is today's literal value unless
noted **new**.

```css
hijri-calendar {
  /* Existing (unchanged) */
  --hcal-bg: #fff;
  --hcal-fg: #1a1a1a;
  --hcal-muted: #5b6572; /* darkened from #9aa0a6 in 0.3.0 for AA contrast; see D8 */
  --hcal-accent: #0b7d3e;
  --hcal-accent-fg: #fff;
  --hcal-border: #e0e0e0;
  --hcal-radius: 8px;
  --hcal-event-fg: #fff;
  --hcal-font-family-arabic: "Amiri", "Traditional Arabic", serif;

  /* Fonts — the font-family trio (new: -display, -mono) */
  --hcal-font-family: system-ui, sans-serif;                 /* base; was referenced but undeclared before P0 */
  --hcal-font-family-display: var(--hcal-font-family);       /* title-secondary, day-banner secondary, timed-block event title, agenda-date Gregorian sub-label */
  --hcal-font-family-mono: var(--hcal-font-family);          /* gutter labels, event-time, weekday-secondary, day-banner weekday */

  /* Today */
  --hcal-today-bg: color-mix(in srgb, var(--hcal-accent) 10%, transparent); /* now actually wired to the cell/column-head bg */
  --hcal-today-color: var(--hcal-accent);
  --hcal-today-indicator-color: var(--hcal-accent);
  --hcal-today-column-bg: transparent;

  /* Grid / cells */
  --hcal-grid-line: var(--hcal-border);   /* month-cell hairlines (part="day-cell"); see D6 */
  --hcal-header-bg: transparent;
  --hcal-cell-min-height: 96px;
  --hcal-cell-min-height-medium: 72px;    /* month at the `medium` size band */
  --hcal-cell-min-height-narrow: 56px;    /* month at the `narrow` size band */
  --hcal-cell-padding: 4px;
  --hcal-cell-hover-bg: color-mix(in srgb, var(--hcal-fg) 6%, transparent);
  --hcal-cell-out-bg: transparent;
  --hcal-cell-out-opacity: 0.45;   /* 0.3.0: declared for compatibility, no longer consumed — see D8 */
  --hcal-cell-out-fg: var(--hcal-muted);  /* new in 0.3.0; out-of-month day-number color, see D8 */
  --hcal-weekend-bg: transparent;
  --hcal-weekend-fg: inherit;

  /* Day numbers (drives BOTH month cells and time-grid column heads — see the D4 note) */
  --hcal-day-primary-font-size: 14px;
  --hcal-day-primary-color: var(--hcal-fg);
  --hcal-day-primary-weight: 600;
  --hcal-day-secondary-font-size: 9px;
  --hcal-day-secondary-color: var(--hcal-muted);
  /* Gregorian day-number spans are governed by THIS token, not --hcal-font-family-display —
     its default preserves the Arabic family; override it to the display serif for the
     reference "editorial" look (see the recipes page). */
  --hcal-day-secondary-font-family: var(--hcal-font-family-arabic);
  --hcal-month-marker-color: var(--hcal-muted);

  /* Weekday header / title */
  --hcal-weekday-font-size: 11px;
  --hcal-weekday-color: var(--hcal-muted);
  --hcal-weekday-align: center;              /* start | center | end */
  --hcal-title-font-size: inherit;
  --hcal-title-color: var(--hcal-fg);
  --hcal-title-secondary-font-size: 11px;
  --hcal-title-secondary-color: var(--hcal-muted);
  --hcal-title-separator: 1px solid var(--hcal-border); /* inline title-layout divider */

  /* Toolbar */
  --hcal-switch-bg: transparent;
  --hcal-switch-active-bg: var(--hcal-accent);
  --hcal-switch-active-fg: var(--hcal-accent-fg);
  --hcal-switch-active-shadow: none;
  --hcal-button-radius: 6px;

  /* Events */
  --hcal-event-radius: 4px;
  --hcal-chip-padding: 1px 6px;    /* month chips */
  --hcal-block-padding: 2px 6px;   /* timed blocks */
  --hcal-event-font-size: 11px;
  --hcal-event-border-width: 2px;      /* left accent border in tinted/outline */
  --hcal-event-tint-alpha: 18%;        /* tinted bg = color-mix(in srgb, <color> var(--hcal-event-tint-alpha), transparent) */
  --hcal-event-hover-bg: none;
  --hcal-event-hover-shadow: none;
  --hcal-event-hover-transform: none;
  --hcal-event-inset: 2px;             /* horizontal inset of timed blocks */
  --hcal-event-dot-size: 6px;          /* month dot-mode chips at `narrow` */

  /* Time grid */
  --hcal-gutter-bg: transparent;
  --hcal-gutter-width: 56px;
  --hcal-hour-height: 48px;            /* slot height = hour height * slot-minutes/60 */
  --hcal-body-max-height: 640px;       /* time-grid body & agenda scroll container; "none" = unbounded */
  --hcal-slot-alt-bg: transparent;     /* every second hour row */
  --hcal-slot-hover-bg: color-mix(in srgb, var(--hcal-fg) 4%, transparent);
  --hcal-now-color: #c5321f; /* darkened from #ea4335 in 0.3.0 for AA contrast; see D8 */
  --hcal-now-width: 2px;
  --hcal-now-dot-size: 8px;

  /* Day banner (day-header="banner") */
  --hcal-banner-bg: var(--hcal-header-bg);
  --hcal-banner-padding: 16px 20px;
  --hcal-banner-primary-font-size: 28px;

  /* Responsive (§5.9) */
  --hcal-column-min-width: 120px;      /* min width of a week/day column before scrolling engages */

  /* Misc */
  --hcal-transition: 0ms;              /* hover transitions; reference uses 120ms cubic-bezier(.2,.7,.2,1) */
}
```

> **The sticky time gutter is pinned by JavaScript, not CSS.** `.tg-gutter` carries
> `position: sticky; inset-inline-start: 0` in the stylesheet, but that rule alone does nothing in
> real browsers: `.tg-gutter` lives inside `.tg-body`, and `.tg-body`'s own `overflow-y: auto`
> (needed for the unrelated vertical `--hcal-body-max-height` scroll) makes `.tg-body` — which
> never scrolls horizontally — the nearest scrolling ancestor CSS resolves the sticky inset
> against, so the computed offset is always zero. The component's `wireStickyGutter()` does the
> real work: on every `scroll` of `part="scroll"` (throttled to one measurement per animation
> frame), it measures the actual gap between the scroll container's edge and the gutter's edge and
> cancels it with an inline `transform: translateX()`, direction-aware for `dir="rtl"`. You don't
> need to do anything to get this behaviour — it's automatic at the `medium`/`narrow` size bands —
> but if you're debugging why the gutter "should" be sticky from CSS alone, it isn't; it's JS.

Size-band thresholds (`wide`/`medium`/`narrow`) are **not** custom properties — see
[Responsive model](#responsive-model).

### Parts

Existing (kept): `toolbar`, `title`, `nav-today`, `nav-prev`, `nav-next`, `view-switch`,
`view-btn`, `weekday`, `day`, `day-primary`, `day-secondary`, `event`, `more-link`,
`allday-row`, `time-gutter`, `slot`, `now-indicator`, `agenda-day`, `agenda-item`.

New: `calendar` (the root `.cal`, carries the size-band token), `nav-group`, `title-primary`,
`title-secondary`, `subheader`, `weekday-primary`, `weekday-secondary`, `day-cell`,
`day-numbers`, `day-month-marker`, `today-indicator`, `column-head`, `day-column`,
`time-label`, `allday-label`, `event-time`, `event-title`, `event-subtitle`, `now-label`,
`day-banner`, `day-banner-primary`, `day-banner-secondary`, `day-banner-weekday`,
`day-banner-summary`, `agenda-date`, `agenda-when`, `loading`, `scroll`
(the week/day horizontal scroll container).

`CalendarEvent.tag` has **no part of its own** — it is hook-only, reaching you as
`ctx.event.tag` inside `renderEvent`, and the built-in renderers never draw it. The
`narrow-events="dots"` marker is not a part of its own either: it is an `event` part with a
`dot` token (`::part(event dot)`), listed below.

Parts use **space-separated tokens** (design principle: existing single-token parts keep their
names), so hosts can select a specific combination:

```css
hijri-calendar::part(event) {
  border-radius: 999px;
  font-weight: 600;
}
hijri-calendar::part(event outline variant-draft) {
  border-color: #9a8e85;
}
hijri-calendar::part(calendar narrow) {
  --hcal-radius: 0;
}
```

Tokens appended where applicable: `today`, `out`, `weekend`, `disabled`, `continues-before`,
`continues-after` (month chips of a multi-day event), `allday`/`timed` (on every chip, block and
agenda item), `dot` (the `narrow-events="dots"` marker), `solid|tinted|outline`, `variant-<x>`,
and on `calendar`: `wide|medium|narrow`.

Per-event colors come from the `color` field on the event itself (surfaced as the `--_ev-color`
custom property internally; use the event's own `color` rather than trying to select individual
chips by content).

### Slots

| Slot | Rendered where |
| --- | --- |
| `toolbar-start` | Before the nav group. |
| `toolbar-end` | After the view switch. |
| `subheader` | Between the toolbar and the grid, full width (e.g. a host's own filter-chip row). |
| `day-summary` | Right side of the day banner (`day-header="banner"`); replaces the built-in "N events · X hours" summary. |
| `loading` | Inside the loading overlay (`loading` attribute); replaces the default "Loading…" text. |

React: children with `slot="…"` pass through `createComponent` unchanged. Angular: the wrapper
template exposes `<ng-content select="[slot=toolbar-start]">` etc. inside `<hijri-calendar-ng>`.

## Accepted visual changes (D1–D9)

Nine default/visual changes ship with 0.3.0 and have **no escape hatch** other than `::part()`/
render hooks (D6, D8 and D9 have a one-line restore) — they were accepted as improvements over the
0.2.x look, not left configurable:

- **D1 — toolbar order.** Navigation is now `‹ Today ›` (prev / today / next), was `Today ‹ ›`.
  Purely visual; `::part(nav-prev|nav-today|nav-next)` selectors are unaffected.
- **D2 — time-grid column-head part.** `part="day"` on week/day column heads gains a second
  token: `part="day column-head"`. Existing `::part(day)` selectors keep matching.
- **D3 — title DOM.** The internal `<small>` inside `.title` is replaced by
  `<span part="title-secondary">`. The old `<small>` had no part, so no public selector is
  affected.
- **D4 — time-grid column-head numeral sizes.** Week/day column-head primary/secondary numerals
  shrink from 15px/10px to 14px/9px, because `--hcal-day-primary-font-size` (`14px`) and
  `--hcal-day-secondary-font-size` (`9px`) now drive **both** the month day-head and the
  time-grid column-head — one token pair for both, instead of a separate time-grid default.
  Restore the old time-grid size with a one-line override:
  `hijri-calendar { --hcal-day-primary-font-size: 15px; }` (note this also affects month cells,
  since the token is now shared).
- **D5 — event content order.** Inside every chip/block/agenda item, `event-time` now renders
  **before** `event-title` (`<span part="event-time">…</span><span part="event-title">…</span>`),
  not after. Because `event-time` defaults to `auto` (= `start` in week/day), this changes the
  default look of every timed week/day block: the clock text sits above/before the title, not
  after it. There is no attribute to restore the old order — use `renderEvent` if you need a
  different layout.
- **D6 — month-grid hairlines.** Month cells now draw a real grid: `part="day-cell"` carries
  `border-inline-end` and `border-block-end: 1px solid var(--hcal-grid-line)`, and
  `--hcal-grid-line` defaults to `var(--hcal-border)` — i.e. visible. In 0.2.x the month grid had
  a horizontal rule *between* weeks only (and none under the last one) and **no vertical rules at
  all**, so an existing consumer gains 36 vertical hairlines plus a horizontal hairline under the
  last week, which sits directly on top of the calendar's own outer border and reads as a doubled
  bottom edge. The border also moved from `.week` (content-box, so each rule added 1px to the
  row's outer height) to `.day-cell` (border-box), so the month body now renders roughly 5px
  shorter than 0.2.x at the same `--hcal-cell-min-height`.
  `hijri-calendar { --hcal-grid-line: transparent; }` gives a fully borderless month grid — this
  is *not* the 0.2.x look, which still had horizontal rules between weeks; the token drives only
  `part="day-cell"`'s two borders (the time-grid's slot lines and gutter border are on
  `--hcal-border`). `hijri-calendar::part(day-cell) { border-inline-end: none; }` is the closest
  approximation to 0.2.x: it removes the vertical rules and keeps a horizontal rule under every
  week, including the last one, which 0.2.x did not have. (`::part(day-cell) { border-block-end:
  none; }` instead removes every cell's bottom border, since the part matches all 42 cells — that
  yields a verticals-only grid, not a bottom-edge fix.) An exact 0.2.x month grid is not reachable
  through the public API: `.day-cell` carries no token encoding its week index, and `.week` is not
  an exposed part.
- **D7 — agenda items are `event` parts.** Agenda rows now emit
  `part="agenda-item event <solid|tinted|outline> <allday|timed>"`; in 0.2.x they were
  `part="agenda-item"` only. Existing `::part(agenda-item)` rules are unaffected, but an existing
  `::part(event)` rule — chip/block styling — **now also matches agenda rows**, whose internal
  layout is a horizontal row rather than a chip. The token is load-bearing: it is what lets
  `event-style` (and its `::part(event tinted)` styling) reach the agenda view at all. To get the
  old scoping back, scope your chip rule to the views that have chips —
  `hijri-calendar:not([view="agenda"])::part(event) { … }` (`view` is reflected, and agenda items
  only exist in the agenda view) — and style the agenda row through `::part(agenda-item)`, which
  means exactly what it always did. Note that adding style tokens does *not* narrow the match:
  `::part(event solid)` still matches an agenda row, because the row carries the style token too.
- **D8 — darker `--hcal-muted`, darker `--hcal-now-color`, and opacity removed from
  out-of-month/weekday-secondary text.** An accessibility audit found the 0.2.x default theme
  failing WCAG 2 AA color contrast (1.4.3) at roughly 40 element instances on the audited page.
  Reduced to the distinct text/background pairs behind those instances, 20 of the 21 pairs the
  default theme produces were failing; all 20 now pass at ≥5.16:1. Three independent fixes:
  - `--hcal-muted` darkens from `#9aa0a6` to `#5b6572`. The old value measured ≈2.64:1 against
    `--hcal-bg` (`#fff`) — AA requires 4.5:1 for normal text (this token drives weekday labels,
    the title's Gregorian sub-label, secondary day numbers, month markers, the "+N more" link,
    the loading label, the day-banner summary, and the agenda's Gregorian date/event-time text,
    nearly all well under 18.66px so none qualify for the 3:1 large-text allowance). The new
    value measures ≈5.92:1 on `--hcal-bg` and ≈5.16:1 on the default `--hcal-today-bg` tint
    (`color-mix(in srgb, var(--hcal-accent) 10%, transparent)` over white) — both of which this
    token renders on by default, since several of the elements above appear on today cells too.
    Restore the old (failing) look with `hijri-calendar { --hcal-muted: #9aa0a6; }` — this
    reintroduces the AA failure and is not recommended.
  - `--hcal-now-color` darkens from `#ea4335` to `#c5321f`. It is both a decorative line/dot
    color (not subject to 1.4.3) and the text color of `part="now-label"` at 10px
    (`now-indicator="line-label"`), where `#ea4335` measured ≈3.92:1 on white — below AA.
    `#c5321f` measures ≈5.45:1. Restore the old (failing) color with
    `hijri-calendar { --hcal-now-color: #ea4335; }`.
  - **Out-of-month numbers and the bilingual weekday secondary label no longer use `opacity`
    for de-emphasis.** `.day-head.out` previously applied `opacity: var(--hcal-cell-out-opacity)`
    (default `0.45`) to its whole subtree; opacity multiplies whatever contrast deficit the
    underlying color already has, and the audit measured the resulting out-of-month numbers at
    1.44:1 (secondary) and 2.85:1 (primary) — both far below AA even after the `--hcal-muted` fix
    above, since the multiplication happens regardless of the base color. `.day-head.out`'s
    number spans and month marker now get a solid color instead, from a new token
    **`--hcal-cell-out-fg`** (default `var(--hcal-muted)`, ≈5.92:1/≈5.16:1 on the same two
    surfaces as `--hcal-muted` above). Similarly, `.dow [part~="weekday-secondary"]` no longer
    carries `opacity: 0.8` on top of its already-muted inherited color.
    **Deviation:** `--hcal-cell-out-opacity` is still declared (default `0.45`) so existing host
    CSS referencing it doesn't break, but nothing in this stylesheet consumes it anymore — a host
    that was overriding it to tune out-of-month dimming intensity will see no effect from that
    override after upgrading, and should use `--hcal-cell-out-fg` instead to control the
    out-of-month text color directly. `--hcal-cell-out-bg` (the out-of-month cell *background*,
    unaffected by this change) is unchanged and still transparent by default.

  **Judgement call, not changed:** `--hcal-day-secondary-font-size` stays at its 9px default
  (matching the reference design, D4). WCAG sets no minimum font size, so 9px text is not itself
  a violation, but legibility at that size matters more once contrast is fixed — hosts who want
  larger secondary numerals can already do this via `--hcal-day-secondary-font-size`.
- **D9 — `numerals` now defaults to `"arab"`.** Hijri day numbers, the Hijri year, the title
  primary, the agenda Hijri date, and the day-banner primary render Arabic-Indic digits with no
  attribute set — through 0.3.0's first release, `numerals` defaulted to `"latn"` (Latin digits)
  to preserve the 0.2.x look byte-for-byte, so this was the one place Arabic-Indic numerals
  didn't show up unless a consumer opted in explicitly. The component's whole purpose is
  rendering Hijri dates, and Latin was the wrong default for that audience; `numerals-gregorian`
  is untouched, so Gregorian numbers, clock digits (time labels, event duration, day-banner
  counts) and month abbreviations (`Jul`) stay Latin — exactly the reference "editorial" pairing,
  now the default instead of an opt-in. The day-cell `aria-label` is unaffected: it is
  deliberately not a numerals-truth-table site, so it stays Latin regardless of `numerals` — a
  screen reader announcing an otherwise-English label should not switch digit systems mid-string.
  The month grid's own `aria-label` is the deliberate exception in the other direction: it reuses
  the visible title, which *is* a truth-table site, so it reads "Rabi al-Awwal ١٤٤٨" — an accessible
  name must match the visible label it names (WCAG 2.5.3), and unlike the day-cell label it is a
  Hijri month/year on its own rather than a Hijri date embedded in English prose.
  Restore the pre-fix, all-Latin look by setting the attribute explicitly:
  `<hijri-calendar numerals="latn">`.

## `event-style` will default to `tinted` at 1.0

`event-style` defaults to `"solid"` through the whole 0.3.x line — this is deliberate, sequenced
so that the 0.3.0 upgrade adds no event-styling change of its own (the changes it *does* make are
D1–D9 above). **At 1.0, the default becomes `"tinted"`** (a soft
tinted background with a left accent border, matching the reference editorial look), which *is* a
breaking visual change. If you depend on the current solid-fill look, start setting
`event-style="solid"` explicitly now — it will keep working identically after the 1.0 upgrade, and
costs nothing before it (it's already the default). `--hcal-event-fg` continues to apply to
`"solid"` only.

## Responsive model

The component measures its own width with a `ResizeObserver` on the host and classifies it into a
size band — layout differences are driven by the band, not by viewport media queries, because the
calendar is often inside a sidebar-constrained column rather than filling the viewport.

| Band | Host width | Notes |
| --- | --- | --- |
| `wide` | ≥ 900px | Full desktop layout. |
| `medium` | 600–899px | Tablet / narrow desktop: toolbar wraps to two rows, month cells shrink to `--hcal-cell-min-height-medium`, week/day columns shrink toward `--hcal-column-min-width` and the grid scrolls horizontally inside `part="scroll"` once 7 columns no longer fit, with the time gutter kept visually pinned (see the sticky-gutter note above) and the column-head row sticky at top. |
| `narrow` | < 600px | Phone: title forced to `stacked` regardless of `title-layout`; `weekday-format="bilingual"` drops the secondary line and `"long"` becomes `"short"`; month cells use `--hcal-cell-min-height-narrow` with `narrow-events` controlling chip vs. dot rendering; week/day always scrolls (7 × 120px + gutter exceeds 600px); day banner summary stacks below the date; agenda date stacks above its items. |

Thresholds are fixed literals (a CSS container query cannot read a custom property), exported as
`SIZE_BANDS = { medium: 600, wide: 900 }` for hosts that want to mirror them. When
`ResizeObserver` is unavailable (very old browsers; also the default in jsdom-based unit tests),
the component falls back to `wide`.

**The first paint is always at `wide`.** A real `ResizeObserver` delivers its first measurement
*after* layout, asynchronously, so every mount renders once at the `wide` fallback and then
re-renders at the measured band — a one-frame flash of the desktop layout on a phone-width host.
This is inherent to measuring the host's own width rather than the viewport (a media query would
be correct on frame one but wrong inside a narrow container, which is the case that matters here).
If the flash is visible in your app, hide the component for that one frame — render it with
`visibility: hidden` and reveal it once the measured band has landed. A single
`requestAnimationFrame` after mount is **not** enough: `ResizeObserver` notifications are
delivered in the rendering update *after* animation-frame callbacks, so a callback scheduled at
mount still runs before the first measurement arrives, and `el.size` is still the `wide` fallback.
Nest a second `requestAnimationFrame` inside the first instead (so the reveal runs one frame
later, after the observer has delivered), or reveal on the first change of `el.size` itself. There
is no event for the band change itself: the correcting re-render emits no second `range-change`
(the visible range hasn't changed, and `range-change` de-duplicates), so `size` is the thing to
read.

The host element itself never grows past its container (`max-width: 100%; overflow: hidden`) and
never causes page-level horizontal overflow — every scrollable region lives inside
`part="scroll"`.

## Accessibility

- Month grid uses `role="grid"` / `rowgroup` / `row` / `gridcell` with roving `tabindex` and arrow-key navigation; Enter/Space activates. The shape is: the grid owns the weekday `role="row"` (seven `columnheader`s) plus one `role="rowgroup"` per week; each week group owns a day `role="row"` of exactly seven `gridcell`s — one per column, each holding that day's `part="day-cell"` background layer and its `part="day"` button — and, only when that week has events, **one further `role="row"` per event lane** whose `gridcell`s carry that lane's chips, plus a final one for the `part="more-link"` buttons. A multi-day chip's cell spans its columns visually and reports them with `aria-colindex`/`aria-colspan` (`aria-colcount="7"` is on the grid). `role="row"` permits only cells as children, which is why the chips are their own rows rather than siblings of the day cells, and why the day button no longer carries `role="gridcell"` itself — it reports its native `button` role inside the cell. One row **per lane** rather than one row per week is what makes `aria-colindex` legal: it must increase across a row and two cells of a row may not claim the same column, which a single row holding every lane could not satisfy.
- Because a week contributes a variable number of rows (its day row, plus one per occupied event lane, plus a more-link row), every row declares its own `aria-rowindex` and the grid declares `aria-rowcount` — so a row's announced coordinate does not depend on how many earlier weeks happened to have events.
- Arrow keys move between the 42 day cells only; `Enter`/`Space` on a day cell activates it (`date-click`). Keys originating on an event chip or a `part="more-link"` button are left entirely to the button's native behaviour, which fires `click` and therefore `event-click`/`more-click` — the grid handler does not intercept them and does not `preventDefault()` keys it doesn't handle.
- Week/day and agenda views carry **no** grid/table roles at all: their weekday labels are plain labelled elements, not `columnheader`s (a `columnheader` requires an owning `row`), and events there are plain focusable buttons.
- Every day cell is labelled with both the Hijri and Gregorian date; at the `narrow` size band with `narrow-events="dots"`, the label additionally includes an event count via `loc.moreDotsLabel`.
- Event chips are real `<button>`s labelled with title + time (native `title` attribute tooltip too), except in dot mode where events render as non-interactive dots and the whole cell is the tap target.
- The current time indicator in week/day views is decorative (`part="now-indicator"`); its optional label (`now-indicator="line-label"`) is `part="now-label"`.
- `loading` sets `aria-busy="true"` on the grid/timegrid/agenda region.

## Semantics notes

- Hijri↔Gregorian conversion uses the tabular Bohra (Fatimid/Misri) calendar from [`@spezutil/hijri-core`](/engine/hijri-core), including its `formatNumerals()` utility for digit-system transliteration (see the numerals truth table above).
- Days switch at **UTC midnight**. Sunset-based day boundaries (maghrib) are not modelled; if your community convention counts the night before, shift your event dates accordingly.
- Multi-day all-day events treat `end` as **inclusive** (like Google Calendar's UI, unlike its API).
- When the Gregorian month changes mid-grid, the first of the month is labelled with its abbreviated name ("1 Jul") in month-view cells and week/day column headers by default (`month-marker="gregorian"`); set `month-marker="hijri"` or `"both"` to mark Hijri month boundaries instead (or as well).
- `dir="rtl"` on individual spans (weekday names, the title, etc.) is emitted only when that span's content is **single-script Arabic** — e.g. a `names="ar"` weekday or month name. A span that mixes an Arabic-Indic numeral with Latin text (a Gregorian day-secondary label, or the title under mixed `names`/`numerals` settings) gets no `dir`, because Arabic-Indic digits render correctly inside an LTR run on their own. The grid, week rows, weekday header, and scroll container never receive `dir="rtl"` from this mechanism — only leaf text spans do.
