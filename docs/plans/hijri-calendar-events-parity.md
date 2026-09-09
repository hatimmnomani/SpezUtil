# `@spezutil/hijri-calendar` — Events-tab parity plan

**Status:** approved, ready to execute (all §8 questions resolved 2026-09-06) · **Owner:** hijri-calendar maintainers
**Target packages:** `@spezutil/hijri-calendar` (0.2.2 → 0.3.0), `@spezutil/hijri-view-core` (0.1.4 → 0.2.0),
`@spezutil/hijri-core` (0.1.3 → 0.2.0), `@spezutil/hijri-calendar-react` (0.1.3 → 0.2.0),
`@spezutil/hijri-calendar-angular` (0.1.5 → 0.2.0). Phases P0–P5 all land in those versions; P6 is repo
infrastructure (no package version); P7 is the consumer app.

This document is self-contained. A team that has not seen the investigation behind it should be able to
execute it phase by phase. Read the repo root `CLAUDE.md` first for package layout, the `--hcal-*`
custom-property convention, and the embedded Amiri font setup — everything below follows those conventions.

---

## 0. TL;DR

The reference "Events" tab at <https://busaheba-office-poc.vercel.app/> renders a **hand-built** calendar
(month / week / day) with a warm-editorial design (Amiri Hijri numerals in crimson, Arabic-Indic digits,
bilingual weekday headers, tinted left-bordered event chips with a mono time prefix, cream today cell, a
banner day header with an "N events · X hours" summary, etc.). The production React app
(`da-office-management-fe`) is supposed to look identical but currently drops in `<hijri-calendar>` with
default styling, so the two look nothing alike.

Closing the gap by CSS alone is impossible — roughly half of the reference's visual traits need DOM the
component does not render (time prefix, bilingual weekday, Hijri month marker, banner header, tags,
subtitles). The rest would require `::part()` plus internal-class hacks that break on any refactor. This
plan turns every one of those traits into first-class, documented API: ~50 new `--hcal-*` custom
properties, 21 new attributes/properties, 1 new DOM event (`range-change`), 2 render hooks
(`renderEvent`, `renderDayCell`), 5 slots, and ~30 new `::part()` names/tokens — all additive, shipped in
eight phases (six package phases, one CI/visual-regression phase, one consumer-migration phase), with the
default look unchanged for existing 0.2.x consumers except the accepted changes catalogued in §5.4
(D1–D8 as shipped; D8 is a post-launch WCAG AA contrast fix, not part of the original phase plan).

---

## 1. Goal, non-goals, and why

### 1.1 Goal

1. `<hijri-calendar>` can reproduce the reference Events-tab look and behaviour (month, week, day views)
   **using only its public API** — attributes/properties, `--hcal-*` custom properties, `::part()`,
   slots, and DOM events. No app CSS may target the component's internal class names.
2. Every customization the reference applies is a **documented, tested, stable** surface of the package,
   usable identically from vanilla JS, React (`@spezutil/hijri-calendar-react`) and Angular
   (`@spezutil/hijri-calendar-angular`).
3. `da-office-management-fe` ends up with **less** CSS, not more: the calendar sections of
   `src/styles/events.css` are deleted and replaced by a ~50-line token mapping on the host element, and
   it fetches events for the **visible range** instead of an unfiltered first page.
4. The component behaves sensibly at tablet and phone widths (the reference does not — this is new
   design, see §6 P5), and the reference look is guarded by Playwright screenshot tests (§6 P6).

### 1.2 Non-goals

- The reference's **"List" mode** (a `<table class="data-table">` of events) and **"Unassigned" mode**
  are app-level tables, not calendar views. They stay in the app. The component's `agenda` view is
  kept and lightly improved, but agenda parity with the reference list is not required.
- The **filter-chip row** ("Filter · Executive · Standing …") and the **mode toggle**
  (Calendar / List / Unassigned) and the **"New event" button** are app chrome. The component gets
  slots so the app can place them, but does not implement event-type filtering itself.
- The **event detail drawer**, intake form, assign modal — app-level.
- Drag-to-create / drag-to-move, resizing, recurring events, dark mode, sunset-based day boundaries,
  virtualisation: none exist in the reference; out of scope.
- Any change to Hijri↔Gregorian arithmetic.

### 1.3 Why — the CSS-hack fragility argument

Facts established during the investigation (see §2 for method):

- The deployed reference is the **original CDN POC** (React 18 UMD + Babel standalone,
  `/js/events.jsx`). Its calendar markup uses the class names `cal-head`, `cal-grid`, `cal-dow`,
  `cal-month`, `cm-day`, `hijri-num`, `greg-num`, `hijri-month`, `dow-ar`, `dow-en`, `ev crimson|amber|green|draft`,
  `wk-grid`, `wk-head`, `wk-ev`, `day-grid`, `day-head`, `day-ev`, `day-now`. There is **no**
  `<hijri-calendar>` on the reference page.
- `da-office-management-fe/src/styles/events.css` (2883 lines) is that POC's stylesheet ported
  verbatim (the app's own `CLAUDE.md` says so). Its calendar sections — "Calendar header", "Calendar
  grid", "Week view", "Day view", "List view", roughly 600 lines — match **no markup in the React
  app**: `grep` finds no `cal-grid`, `cm-day`, `wk-`, `day-grid` or `lv-` class usage anywhere in
  `da-office-management-fe/src` except the unrelated dashboard `.cal-day` strip. They are dead CSS
  that documents the intended design.
- The React app's only calendar usage is `src/modules/events/my-calendar.jsx` (19 lines): a bare
  `<HijriCalendar view date eventFields={{ start: "start_at" }} events={assigned} …/>`. It contains
  **zero** `--hcal-*` overrides and zero `::part()` rules. The component renders with its stock green
  (`#0b7d3e`) theme inside a crimson/cream app. It also hard-codes `date="2026-07-06"` and receives
  `assigned` = **page 1 (10 rows) of an unfiltered list**, so it can never show a full month.

So the choice today is between three bad options: (a) re-hand-build the calendar in React (duplicating
the package and abandoning it), (b) write `::part()` overrides for what parts exist and reach around
the shadow root with `hijri-calendar::part(event)`-style rules that still cannot add a time prefix, a
Hijri month marker, a bilingual weekday, or a banner header — because that DOM does not exist, or (c)
fork the package. Option (b) is exactly the kind of "customization at the app level" this plan exists
to eliminate: every `::part()` override that encodes layout (flex direction, grid placement, which
child is where) is coupled to internal structure the package never promised to keep, and the traits
that need new DOM cannot be done at all. The package must own the design surface.

---

## 2. Method and evidence

1. Read the React app: `da-office-management-fe/src/modules/events/index.jsx` (1329 lines — all of it
   is drawers, tables and forms; the calendar is only `MyCalendar`), `my-calendar.jsx`,
   `api/events.js`, `api/schemas.js`, `styles/events.css`, `styles/tokens.css`, `styles/app.css`.
2. Loaded <https://busaheba-office-poc.vercel.app/> in Playwright (no login needed, no forms
   submitted). Screenshotted the Events tab in Month, Week, Day at 1200×736 and Month at 420px wide;
   inspected the live DOM (`document.querySelector("hijri-calendar") === null`; class inventory
   matches `events.css`). Downloaded `/js/events.jsx` (1644 lines) and `/js/data.jsx` — the
   authoritative reference render code — and read `CalendarHeader`, `CalendarFilters`,
   `MonthCalendar`, `WeekView`, `DayView`, `ListView`, `EventsModule`.
3. Read the package: `packages/hijri-calendar/src/{hijri-calendar,styles,locale,index}.ts` and all
   four test files; `packages/hijri-view-core/src/*.ts`; both wrappers; `apps/storybook` story;
   `apps/docs/docs/calendar/*`; `RELEASING.md`; `.changeset/config.json`; `.github/workflows/*`;
   recent git history (`timezone`, `eventFields` commits).
4. Classified every reference trait (§3) as **(a)** already supported, **(b)** achievable only by
   reaching into internals → must become API, or **(c)** impossible today → new feature.

Screenshots are local dev output (`/*.png` at the repo root is git-ignored); re-capture with the
Playwright plugin if needed. Reference source snapshot: `curl https://busaheba-office-poc.vercel.app/js/events.jsx`.

### 2.1 Reference design tokens (from `tokens.css`, needed to map defaults)

| Token | Value | Used by the calendar for |
| --- | --- | --- |
| `--bg` / `--bg-soft` / `--surface` / `--surface-warm` / `--cream-soft` | `#FAF6EE` / `#F4ECDD` / `#FFFFFF` / `#FBF7F0` / `#F5EDE0` | page, header strips, grid surface, banner, today cell |
| `--crimson` / `--crimson-deep` / `--rose` / `--rose-tint` | `#D62246` / `#A8163A` / `#C97D85` / `#F2DCDE` | today dot & now line, Hijri numerals, default chip border, tinted chip bg |
| `--ok` / `--ok-soft`, `--warn` / `--warn-soft` | `#2F6E54`/`#DAE9DF`, `#B47A18`/`#F1E3C2` | "green" / "amber" event tones |
| `--ink` … `--ink-4`, `--line`, `--line-strong` | `#1F1A17` … `#9A8E85`, `#E8DECF`, `#D6C9B4` | text ramp, grid lines |
| `--font-display` / `--font-sans` / `--font-mono` / `--font-arabic` | Newsreader / Public Sans / JetBrains Mono / Amiri | Gregorian numerals & titles / body / time labels / Hijri |
| `--r-2` … `--r-4` | 6 / 8 / 12 px | chip, block, grid radii |

The reference is **light-only**; there is no dark theme to match. The reference has **no responsive
behaviour** — at 420px the month grid overflows the viewport. Narrow-width behaviour in this plan (P5)
is therefore new design, reviewed via Storybook, not matched against the reference.

---

## 3. Current-state gap table

Legend — **Status**: (a) supported today · (b) only via app-level hack → make it API · (c) not
possible → new feature. **Ref** cites the reference CSS selector (`events.css`) or JSX.

### 3.1 Toolbar / header (`.cal-head`)

| # | Reference behaviour / look | Ref | Package today | Status | Required change |
| --- | --- | --- | --- | --- | --- |
| T1 | Nav pill: `‹` `Today` `›` in one bordered group, 32px square buttons, Today has side borders | `.cal-head .nav` | Order is Today, then ‹ ›; buttons are individually bordered; no part on the group | b | Wrap in `part="nav-group"`; DOM order prev / today / next (§5.4 D1, accepted); style via parts |
| T2 | Title inline: Hijri "شوال ١٤٤٧" (Amiri 30px, crimson-deep, RTL, Arabic-Indic digits) then Gregorian "May 2026" (display serif 18px, muted, left border separator) | `.title-block h1 .hijri/.greg` | `.title` with `<small>` **stacked below**; single `part="title"`; Latin digits; transliterated month unless `locale="ar"` (which also flips all UI strings) | c | `title-layout="inline"`, parts `title-primary` / `title-secondary`, `numerals="arab"`, `names="ar"` decoupled from `locale`, `--hcal-title-*` props, `--hcal-font-family-display` |
| T3 | View switcher order Day · Week · Month, segmented style (soft bg, white active pill with shadow), no Agenda | `.segmented` | Month · Week · Day · Agenda, active = accent fill | b | `views="day week month"` (list + order); `--hcal-switch-bg`, `--hcal-switch-active-bg/fg/shadow` |
| T4 | Mode toggle (Calendar/List/Unassigned) + "New event" button live in the same header row | `.mode-toggle`, `.btn-accent` | No slot; host must render a second header row outside the component | c | Slots `toolbar-start`, `toolbar-end`, `subheader`; `toolbar="none"` to suppress the built-in toolbar entirely |
| T5 | Filter chip row below the header | `.cal-head .filters` | none | non-goal | Host places its own chips in `slot="subheader"` |
| T6 | Header typography: sans 12px Today, mono labels | — | `font: inherit` from `system-ui` | b | Declare `--hcal-font-family` on `:host` (currently referenced by `.title small` but **never declared** — bug), add `--hcal-font-family-mono` |

### 3.2 Month grid (`.cal-grid`, `.cal-dow`, `.cal-month`, `.cm-day`)

| # | Reference | Ref | Package today | Status | Required change |
| --- | --- | --- | --- | --- | --- |
| M1 | Grid surface: white, 1px `--line` border, 12px radius | `.cal-grid` | `--hcal-bg`, `--hcal-border`, `--hcal-radius` | a | none |
| M2 | Weekday header strip: soft bg, **Arabic name (Amiri 12px, crimson-deep, RTL) above English mono 9px uppercase**, left-aligned, vertical dividers, weekend muted | `.cal-dow .cell`, `.dow-ar`, `.dow-en`, `.weekend` | Centered 3-letter name in one language; no dividers; no weekend styling; `part="weekday"` only | c | `weekday-format="bilingual"`; parts `weekday-primary`, `weekday-secondary`; part token `weekend` (days from `weekend-days`); `--hcal-header-bg`, `--hcal-grid-line`, `--hcal-weekday-align` |
| M3 | Day cell is a full-height bordered box (right + bottom hairlines), padding 8/10px, min-height 112px, hover → soft bg | `.cm-day` | Cells are **not boxes**: `.week` is a CSS grid, the `<button class="day-head">` occupies row 1 only and chips float in lanes below; no cell borders; hover only on the number button; min-height 96px hard-coded | c | Add a per-column background layer `part="day-cell"` spanning all lanes (`grid-row: 1 / -1`); `--hcal-cell-min-height`, `--hcal-cell-padding`, `--hcal-cell-hover-bg`, `--hcal-grid-line` |
| M4 | Day numbers left-aligned: **Hijri 22px Amiri bold crimson-deep** + Gregorian 12px display serif muted, baseline row | `.primary-date .hijri-num/.greg-num` | Centered; primary 14px / secondary 9px; only `--hcal-font-family-arabic`; colors fixed to `--hcal-fg` / `--hcal-muted` | b | `day-number-align="start"`; `--hcal-day-primary-font-size/-color/-weight`, `--hcal-day-secondary-font-size/-color/-font-family`; `renderDayCell` for anything beyond |
| M5 | On the **1st of a Hijri month**, month name shown at the right of the head row (Amiri 11px) | `.hijri-month` | Only the Gregorian first gets a "1 Jul" marker, inside the secondary span | c | `month-marker="gregorian" (default) \| "hijri" \| "both" \| "none"`; part `day-month-marker` |
| M6 | Out-of-month cells: translucent cream bg, numbers 40% opacity | `.cm-day.other` | `opacity: .45` on the number button only | b | `--hcal-cell-out-bg`, `--hcal-cell-out-opacity`; part token `out` on `day-cell` |
| M7 | Today: **cell** bg cream-soft, 6px crimson dot top-right, numbers turn crimson (no pill) | `.cm-day.today` | Accent-filled pill around the primary number; `--hcal-today-bg` is **declared but never used** (bug) | b/c | `today-marker="pill" (default) \| "dot" \| "none"`; wire `--hcal-today-bg` to the cell; `--hcal-today-color`, `--hcal-today-indicator-color`; part `today-indicator`; token `today` on `day-cell` |
| M8 | Event chip: soft-tinted bg, **2px left border** in tone color, tone-deep text, 11px, radius 3px, padding 3/6/3/8, **mono time prefix** `10:00` (9.5px, tracked) then title, ellipsis, hover → cream; `draft` = transparent bg + dashed border | `.cm-day .ev`, `.ev.crimson/.amber/.green/.draft`, `.ev .time` | Solid `--_ev-color` fill, white text, title only, no border, no hover, no tooltip | c | `event-style="solid" (default) \| "tinted" \| "outline"` (+ per-event `style`); `event-time="auto\|none\|start\|start-duration\|range"`; parts `event-time`, `event-title`; per-event `variant` → part token `variant-<x>`; `--hcal-event-radius/-padding/-font-size/-border-width/-tint-alpha/-hover-bg/-fg`; native `title` tooltip |
| M9 | Max 3 chips then "+N more" (11px muted, left padding) | `.cm-day .more` | `max-events`, `part="more-link"` | a | none |
| M10 | Six rows always; `grid-auto-rows: minmax(112px, 1fr)` | `.cal-month` | Always 42 cells; `min-height: 96px` | a/b | `--hcal-cell-min-height` |
| M11 | Reference stacks events per day only (no spanning) | JSX | Multi-day spanning lanes | a (superset) | none — keep spanning |
| M12 | Clicking a cell: `cursor: pointer` (no handler in reference) | `.cm-day` | `date-click` | a | none |

### 3.3 Week view (`.wk-grid`)

| # | Reference | Ref | Package today | Status | Required change |
| --- | --- | --- | --- | --- | --- |
| W1 | Corner + header row on soft bg; header cell left-aligned: **Hijri numeral 24px Amiri bold crimson-deep** above `SUN · 11` mono uppercase; today header cream-soft | `.wk-head`, `.wk-head.today` | `.tg-col-head` centered, weekday above small numbers; `part="day"` (same name as month cells — ambiguous) | b | Parts `column-head` (keep `day` token for compat, §5.4 D2) with `today` token; `--hcal-header-bg`, `day-number-align`, `--hcal-font-family-mono` on `weekday` |
| W2 | Today **column** tinted | `.wk-col.today` | none | b | `--hcal-today-column-bg`; token `today` on `part="day-column"` |
| W3 | Hours 08:00–18:00, 24h labels, **56px per hour**, labels top-left inside the hour cell, 60px gutter on soft bg | `.wk-hours .hour` | `day-start/day-end/time-format` exist; slot = fixed 24px per 30 min; gutter 56px hard-coded; label centred on the hour line | a/b | `--hcal-hour-height` (default 48px), `--hcal-gutter-width`, `--hcal-gutter-bg`, `time-label-position="line" (default) \| "cell"`, part `time-label` |
| W4 | Grid fills the page; no inner scroll | `.wk-grid` | `.tg-body { max-height: 640px; overflow-y: auto }` | b | `--hcal-body-max-height` (default `640px`; `none` disables) |
| W5 | No all-day row (reference has only timed events) | — | All-day row always rendered (22px) | b | `allday-row="always" (default) \| "auto" \| "never"` |
| W6 | Event block: tinted bg, 2px left border, radius 4, padding 4/8; lines: **mono `10:00 · 60m`**, display-serif title 12px 500, **location** 10px muted; hover → translateX(1px) + shadow, z-index bump | `.wk-ev .time/.t/.loc` | Solid fill; title then `<small>` start time; no subtitle; no hover | c | `event-style="tinted"`, `event-time="start-duration"`, new `CalendarEvent.subtitle` (+ `eventFields.subtitle`), `CalendarEvent.durationMinutes`; parts `event-time/-title/-subtitle`; `--hcal-event-hover-shadow`, `--hcal-event-hover-transform` |
| W7 | Now line: 1px crimson + 7px dot | `.wk-now` | 2px `#ea4335` **hard-coded** | b | `--hcal-now-color`, `--hcal-now-width`, `--hcal-now-dot-size` |
| W8 | Hour slot hover → soft bg, click | `.hour-slot:hover` | `slot-click` per 30-min slot; hover exists | a | `slot-minutes="15\|30\|60"` for granularity parity (reference = 60); coarsens `slot-click` accordingly (accepted, §5.1) |

### 3.4 Day view (`.day-grid`)

| # | Reference | Ref | Package today | Status | Required change |
| --- | --- | --- | --- | --- | --- |
| D1 | **Banner header** on warm surface: Hijri full date 36px Amiri crimson-deep; `14 May 2026` display 18px + `WEDNESDAY` mono; right side **"2 events · 2.5 hours scheduled"** | `.day-head`, `.day-meta` | Same small centred column head as week view | c | `day-header="column" (default) \| "banner"`; parts `day-banner`, `day-banner-primary`, `day-banner-secondary`, `day-banner-weekday`, `day-banner-summary`; built-in summary with locale strings; slot `day-summary` to override |
| D2 | 80px gutter, 72px per hour, alternating hour-row shading | `.day-hours`, `.hour-slot:nth-child(odd)` | 56px / 48px / none | b | `--hcal-gutter-width`, `--hcal-hour-height`, `--hcal-slot-alt-bg` (host scopes per view via `hijri-calendar[view="day"]` — `view` already reflects) |
| D3 | Event card: 16px side insets, 3px left border, radius 8, padding 12/16; head row mono `10:30 · 90m` + **type tag** right (mono uppercase); title 18px display; `loc · N attendees` line | `.day-ev .head .time/.type`, `.title`, `.loc` | Same block as week | c | `CalendarEvent.tag` (+ `eventFields.tag`) — hook-only, no part of its own as shipped (§5.6); `--hcal-event-inset`; the fully custom layout is the motivating case for the `renderEvent` hook |
| D4 | Now line with **"Now · 13:30" label** | `.day-now .label` | line only | c | `now-indicator="line" (default) \| "line-label" \| "none"`; part `now-label` |

### 3.5 Cross-cutting

| # | Reference | Package today | Status | Required change |
| --- | --- | --- | --- | --- |
| X1 | Four font families (display / sans / mono / Arabic) | One Arabic prop + undeclared base prop | b | `--hcal-font-family`, `--hcal-font-family-display`, `--hcal-font-family-mono` (both default to `var(--hcal-font-family)`) |
| X2 | Hijri numerals in **Arabic-Indic digits**, Gregorian in Latin | Latin everywhere; no numeral utility in `hijri-core` | c | `numerals="latn" (default) \| "arab"` for Hijri numbers; `numerals-gregorian="latn" (default) \| "arab"` for Gregorian numbers and clock labels (§5.1 truth table); shared `formatNumerals()` in `hijri-core` |
| X3 | Arabic month/weekday names with **English UI** labels | `locale="ar"` switches names *and* UI strings | c | `names="translit\|ar"` (default: follows `locale`) |
| X4 | Arabic runs are `direction: rtl` inline within an LTR page | Whole component flips with `dir="rtl"` only | b | `dir="rtl"` is a property of a span's actual rendered content, not of which attribute is `arab`: emit it only on spans whose content is single-script Arabic (`names="ar"` name spans); a span mixing an Arabic-Indic numeral with a Latin month name/abbreviation (`day-secondary`, `day-primary` under `primary="gregorian"`, `title-primary` under mixed `names`/`numerals`) gets no `dir`, since Arabic-Indic digits render correctly inside an LTR run — implemented as a shared content-based gate, not per-span special-casing |
| X5 | Event tone from event type; `draft` status → dashed | Only `color` per event | c | `eventFields` values accept `string \| (raw) => unknown` so colour/style/variant can be **derived**; per-event `style`, `variant` |
| X6 | Backend events carry `duration_mins`, not `end` | `end` or +1h default | c | `CalendarEvent.durationMinutes` + `eventFields.durationMinutes`, honoured by `normalizeEvent` |
| X7 | App must fetch events for the visible range (it currently fetches page 1 of 10, unfiltered) | Host cannot know the visible range without recomputing it | c | `range-change` event with a defined contract (§5.3) + app-side `useEventsInRange` (§6 P7) |
| X8 | App shows a spinner while loading | No loading affordance | c | `loading` boolean attribute → `aria-busy`, part `loading`, slot `loading` |
| X9 | Responsive: reference has **no** narrow-width handling (grid overflows at 420px) | none | new design (decided in scope) | P5: size bands via `ResizeObserver`, month dot-mode, week/day horizontal scroll with sticky gutter |
| X10 | Transitions 120ms ease on hover | none | b | `--hcal-transition` |
| X11 | Weekend = Sat/Sun in the reference; some deployments use Fri/Sat | none | c | `weekend-days` attribute (default `"0 6"`) → `DayCell.isWeekend` / `TimeGridColumn.isWeekend` |
| X12 | Timezone | `timezone` attr exists (0.2.1) | a | none |

---

## 4. Design principles for the new API

1. **Additive and default-preserving.** Every new attribute has a default equal to today's behaviour;
   every new custom property defaults to today's literal value. A 0.2.x consumer upgrading sees no
   visual change except D1/D2/D3/D4 (§5.4, accepted).
2. **Attributes for structure, custom properties for appearance, parts for escape hatches.** If a
   trait changes *what DOM is rendered* (bilingual weekday, banner header, time prefix) it is an
   attribute. If it changes *how existing DOM looks* it is a `--hcal-*` property. `::part()` exists
   so hosts can go further, but the reference look must be reachable without it.
3. **Framework-agnostic and shadow-DOM-safe.** No Lit, no template libraries. Slots are native
   `<slot>` elements; render hooks return a `Node`. Nothing depends on light-DOM styles.
4. **View-core owns math, component owns DOM.** Weekend flags, duration→end resolution, field
   mapping with functions, and range computation go in `hijri-view-core`. Numeral formatting goes in
   `hijri-core`. Layout/CSS/resize handling stays in `hijri-calendar`.
5. **Parts use space-separated tokens** (`part="event tinted variant-draft"`), so hosts can select
   `::part(event variant-draft)`. Existing single-token parts keep their names.
6. **Naming.** Attributes are kebab-case with a camelCase property twin (existing pattern via
   `reflect()`). Custom properties are `--hcal-<region>-<trait>`.
7. **Hooks never break the calendar.** A hook that throws is caught, logged once, and the default
   renderer is used. Hook output is content-only: the component keeps ownership of the wrapping
   `<button>`, its `part` tokens, ARIA, click wiring and keyboard behaviour.

---

## 5. Proposed public API reference

### 5.1 Attributes / properties

Existing (unchanged): `view`, `date`, `locale`, `dir`, `week-start`, `day-start`, `day-end`,
`time-format`, `max-events`, `primary`, `secondary-position`, `timezone`; properties `events`,
`eventFields`, `isDateDisabled`.

New:

| Attribute (property) | Type | Default | Phase | Description |
| --- | --- | --- | --- | --- |
| `views` (`views`) | space-separated list of `month\|week\|day\|agenda` | `"month week day agenda"` | P0 | Which view buttons render, in which order. Unknown tokens ignored; the active `view` is always rendered even if absent from the list. |
| `toolbar` (`toolbar`) | `"full" \| "none"` | `"full"` | P0 | `none` removes the built-in toolbar (host drives `view`/`date` itself). Slots still render. |
| `title-layout` (`titleLayout`) | `"stacked" \| "inline"` | `"stacked"` | P1 | Gregorian subtitle below (today) or inline after the Hijri title with a separator. |
| `names` (`names`) | `"translit" \| "ar"` | follows `locale` | P1 | Hijri month & weekday names, independent of UI strings. |
| `numerals` (`numerals`) | `"latn" \| "arab"` | `"latn"` | P1 | Digit system for **Hijri** numbers: day numbers, Hijri year, title primary, agenda Hijri date, day-banner primary. |
| `numerals-gregorian` (`numeralsGregorian`) | `"latn" \| "arab"` | `"latn"` | P1 | Digit system for **Gregorian** numbers *and clock digits*: Gregorian day numbers, Gregorian year in the title/agenda/banner, time-gutter labels, `event-time` text, `now-label`. Month abbreviations ("Jul") are never transliterated. |
| `weekday-format` (`weekdayFormat`) | `"short" \| "long" \| "bilingual"` | `"short"` | P1 | `bilingual` renders the `names` weekday (primary) and the English abbreviation (secondary). |
| `weekend-days` (`weekendDays`) | space-separated day indices `0`(Sun)–`6`(Sat) | `"0 6"` | P1 | Days that receive the `weekend` part token and `--hcal-weekend-*` styling. Empty string = no weekend. Out-of-range/duplicate tokens ignored. |
| `day-number-align` (`dayNumberAlign`) | `"center" \| "start" \| "end"` | `"center"` | P2 | Alignment of the number row in month cells and time-grid column heads. |
| `month-marker` (`monthMarker`) | `"gregorian" \| "hijri" \| "both" \| "none"` | `"gregorian"` | P2 | Which calendar's first-of-month gets a month-name marker. |
| `today-marker` (`todayMarker`) | `"pill" \| "dot" \| "none"` | `"pill"` | P2 | Pill around the primary number (today) or a corner dot; `--hcal-today-bg` applies to the cell in all modes. |
| `event-style` (`eventStyle`) | `"solid" \| "tinted" \| "outline"` | `"solid"` (0.3.x) — **`"tinted"` at 1.0**, see §8.2 | P3 | Default chip/block rendering. Per-event `style` overrides. |
| `event-time` (`eventTime`) | `"auto" \| "none" \| "start" \| "start-duration" \| "range"` | `"auto"` | P3 | Time text on chips/blocks. `auto` = none in month, `start` in week/day (today's behaviour). |
| `slot-minutes` (`slotMinutes`) | `15 \| 30 \| 60` | `30` | P3 | Time-grid slot granularity. **Also the granularity of `slot-click`**: with `60`, `detail.gregorian` is always the hour start (`…T09:00`), never `…T09:30`. Accepted trade-off; hosts needing finer times collect them in their own UI. |
| `allday-row` (`alldayRow`) | `"always" \| "auto" \| "never"` | `"always"` | P3 | `auto` hides the row when no all-day event is in range. |
| `now-indicator` (`nowIndicator`) | `"line" \| "line-label" \| "none"` | `"line"` | P3 | Current-time line, optionally with a "Now · 13:30" label. |
| `time-label-position` (`timeLabelPosition`) | `"line" \| "cell"` | `"line"` | P3 | Gutter label centred on the hour line (today) or top-aligned inside the hour cell. |
| `day-header` (`dayHeader`) | `"column" \| "banner"` | `"column"` | P4 | Day view only: compact column head or full-width banner with summary. |
| `agenda-days` (`agendaDays`) | integer 1–366 | `30` | P4 | Agenda window length (currently a hard-coded constant). |
| `loading` (`loading`) | boolean | `false` | P4 | Sets `aria-busy="true"` on the grid, renders `part="loading"` + `slot="loading"` overlay. |
| `narrow-events` (`narrowEvents`) | `"dots" \| "scroll"` | `"dots"` | P5 | Month view at the `narrow` size band: collapse chips to coloured dots (tap cell → `date-click`), or keep the desktop layout and scroll horizontally. |
| — (`size`) | read-only `"wide" \| "medium" \| "narrow"` | measured | P5 | Current size band (see §5.9). Also exposed as a part token on `part="calendar"`. |
| — (`renderEvent`) | `(ctx: RenderEventContext) => Node \| string \| null` | `undefined` | P4 | Property only. Replaces the **inner content** of a chip/block/agenda item. `string` is inserted as text; `null` = default renderer. |
| — (`renderDayCell`) | `(ctx: RenderDayCellContext) => Node \| string \| null` | `undefined` | P4 | Property only. Replaces the **inner content** of the month-cell number button and time-grid column head (`part="day"`). `string` = text; `null` = default. Output must be non-interactive (it lives inside a `<button>`). |
| — (`visibleRange`) | read-only `RangeChangeDetail` | computed | P0 | Same object the last `range-change` carried. |

**Numerals truth table** (both attributes share `formatNumerals()` from `hijri-core`; Latin is the
untouched default so 0.2.x output is unchanged):

| `numerals` | `numerals-gregorian` | Hijri day/year/title | Gregorian day/year | Clock labels (`10:30`, gutter, `now-label`) | Month names |
| --- | --- | --- | --- | --- | --- |
| `latn` | `latn` (default) | `27 Shawwal 1447` | `14`, `May 2026` | `10:30` | per `names` / always Latin for Gregorian |
| `arab` | `latn` (reference look) | `٢٧ شوال ١٤٤٧` | `14`, `May 2026` | `10:30` | idem |
| `latn` | `arab` | `27 …` | `١٤`, `May ٢٠٢٦` | `١٠:٣٠` | idem |
| `arab` | `arab` | `٢٧ …` | `١٤`, `May ٢٠٢٦` | `١٠:٣٠` | idem |

`AM`/`PM` in `time-format="12"` stay Latin letters in all combinations (no Arabic meridiem strings
exist in the locale; add `meridiem` strings to `locale.ts` `ar` if requested later).

### 5.2 `CalendarEvent`, `EventFieldMap`, hook contexts

```ts
// hijri-view-core/src/types.ts
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  /** Used to derive `end` when `end` is absent (timed events only). */
  durationMinutes?: number;                 // P3
  allDay?: boolean;
  color?: string;
  /** Second text line (e.g. location). Rendered as part="event-subtitle" in week/day/agenda. */
  subtitle?: string;                        // P3
  /** Short label (e.g. event type). Hook-only: reaches hosts as ctx.event.tag, never rendered (§5.6). */
  tag?: string;                             // P3
  /** Per-event override of the component's `event-style`. */
  style?: "solid" | "tinted" | "outline";   // P3
  /** Free token exported as part="event variant-<variant>" and data-variant, for host ::part() styling. Must match /^[a-z0-9-]+$/. */
  variant?: string;                         // P3
  data?: unknown;
}

/** Values may be a source field name or a derive function over the raw object. */
export type EventFieldSource<T = unknown> = string | ((raw: Record<string, unknown>) => T);
export interface EventFieldMap {
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

// hijri-view-core/src/month.ts (existing DayCell gains one field)
export interface DayCell { /* …existing… */ isWeekend: boolean; }   // P1
export interface BuildOptions { /* …existing… */ weekendDays?: number[]; } // P1, default [0, 6]
// hijri-view-core/src/time-grid.ts
export interface TimeGridColumn { /* …existing… */ isWeekend: boolean; } // P1
export interface TimeGridOptions { /* …existing… */ weekendDays?: number[]; } // P1
```

```ts
// hijri-calendar/src/hijri-calendar.ts
export interface RenderEventContext {
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

export interface RenderDayCellContext {
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

**Hook contract (both hooks):** called during render for every instance; return `Node` (appended),
`string` (appended as a text node — never parsed as HTML), or `null` (default renderer). Must be
synchronous and side-effect free. The wrapper element stays component-owned: `<button part="event …">`
for `renderEvent`, `<button part="day …" role="gridcell">` for `renderDayCell`. Hook output therefore
inherits the button's `:focus-visible` ring, roving `tabindex`, `aria-label` and click handler; **do not
return interactive elements** (nested interactive content is invalid HTML and breaks the grid keyboard
model) — use `date-click` / `event-click` instead. Exceptions are caught, reported once per hook via
`console.warn`, and the default content is rendered. Interaction with the month-cell background layer
(P2): the `day-cell` layer is `z-index: 0`; the number button, chips and `more-link` are
`position: relative; z-index: 1`; hook output must not use `position: fixed/absolute` outside its
button (it would escape the cell). The focus ring must remain visible above the layer — guarded by a
test that the button's computed `z-index` ordering places it after `day-cell` in DOM and the layer has
`pointer-events: auto` only for its own click delegation.

### 5.3 Events

All events `bubbles: true, composed: true` (existing pattern).

| Event | `detail` | Phase | Fired when |
| --- | --- | --- | --- |
| `event-click`, `date-click`, `slot-click`, `more-click`, `view-change`, `date-change` | unchanged | — | existing |
| `range-change` | `RangeChangeDetail` (below) | P0 | see contract |

```ts
export interface RangeChangeDetail {
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

**`range-change` contract (what the component guarantees):**

1. **Initial fire.** Exactly one `range-change` with `reason: "init"` after the first render in
   `connectedCallback()` — synchronously, before `connectedCallback` returns. Hosts that attach
   listeners after mount can read the same object from the `visibleRange` property instead.
2. **Subsequent fires.** After any render whose computed range differs from the last emitted one:
   toolbar prev/next/today (`"navigate"`), view switch (`"view"`), and `date`, `view`, `week-start`,
   `agenda-days` attribute/property changes (`"attribute"`). Setting `events`, `eventFields`,
   `loading`, theming attributes or resizing never fires it.
3. **Dedupe.** At most one event per render; consecutive identical `{view,start,end}` never fire twice
   (so rapid prev/next that ends on the original month emits `A→B→A`, not `A→B→A→A`).
4. **No debounce inside the component.** Emission is synchronous and deterministic (tests depend on
   it). Rapid navigation therefore emits one event per click; hosts that fetch on it must key their
   query by `{start,end}` and let their data layer coalesce (TanStack Query's `queryKey` +
   `keepPreviousData` does this — see P7). The component does **not** cancel or coalesce fetches.
5. **Range definition per view.** Month: first cell of the 6×7 grid … last cell + 1 day (so leading
   and trailing out-of-month days are included — events there are rendered). Week: 7 columns from the
   `week-start`-aligned first day. Day: 1 day. Agenda: `agenda-days` from `date`.
6. Emitted **before** any timers start (the now-indicator interval) and independently of `timezone`;
   ranges are UTC-day based like the rest of the component.

### 5.4 Accepted default/visual changes (decided — no escape hatch, except D6's and D8's tokens)

- **D1 — toolbar order** becomes `‹ Today ›` (prev / today / next). Purely visual; parts unchanged.
  Ships in P0. Changeset text: "Toolbar navigation is now ‹ Today › (was Today ‹ ›) to match common
  calendar conventions; `::part(nav-prev|nav-today|nav-next)` selectors are unaffected."
- **D2 — `part="day"` on time-grid column heads** gains a second token `column-head`
  (`part="day column-head"`). Existing `::part(day)` selectors keep matching. Changeset text as above.
- **D3 — title DOM.** `.title small` is replaced by `<span part="title-secondary">` (the old `<small>`
  had no part). Selectors on the internal `<small>` were never public; changelog notes it anyway.
- **D4 — time-grid column-head numeral sizes.** The week/day column-head primary/secondary numerals
  change default size from 15px/10px to 14px/9px because `--hcal-day-primary-font-size` (default
  `14px`) and `--hcal-day-secondary-font-size` (default `9px`) now drive both the month `.day-head`
  and the time-grid `.tg-col-head` (§5.5). One token driving both heads was chosen over a second
  token or a per-view default. Purely visual; parts unchanged. Ships in P2. A consumer who wants the
  old time-grid size restores it with a one-line override: `--hcal-day-primary-font-size: 15px`.
- **D5 — event content order.** `event-time` renders **before** `event-title` inside every chip/
  block/agenda item's inner content (`<span part="event-time">…</span><span part="event-title">…</span>`),
  not after it. Because `event-time` defaults to `auto` (= `start` in week/day, none in month), this
  changes the default look of every timed week/day block: the clock text now sits above/before the
  title rather than after it. Purely visual; parts unchanged (`event-time` and `event-title` both
  existed as concepts, just unordered, before this phase). Ships in P3. A consumer who wants the old
  order has no escape hatch other than `renderEvent` (§5.2) — this is accepted, not configurable.
- **D6 — month-grid hairlines.** `part="day-cell"` carries `border-inline-end` and
  `border-block-end: 1px solid var(--hcal-grid-line)` (default `var(--hcal-border)`, i.e.
  visible), where pre-branch the month grid had `.week { border-bottom }` with
  `.week:last-child { border-bottom: none }` and **no vertical rules at all** (§3.2's gap table:
  "no cell borders"). Net for an existing 0.2.x consumer: 36 new vertical hairlines, plus a
  bottom hairline under the last week that abuts `.cal`'s own border and reads as a doubled edge.
  The border also moved from `.week` (content-box) to `.day-cell` (border-box), so the month body
  now renders roughly 5px shorter than 0.2.x at the same `--hcal-cell-min-height`. The reference
  design requires the grid, so it ships — but unlike D1–D5 it *does* have a restore path, because
  the colour is a token: `--hcal-grid-line: transparent` gives a fully borderless grid (that token
  drives only `.day-cell`'s two borders as shipped — see §5.5) — not the 0.2.x look, which still
  had horizontal rules between weeks. `::part(day-cell) { border-inline-end: none }` is the
  closest approximation to 0.2.x: it drops the vertical rules and keeps a horizontal rule under
  every week, including the last one, which 0.2.x didn't have. An exact 0.2.x grid isn't
  reachable through the public API — `.day-cell` carries no per-week token, and `.week` isn't an
  exposed part. Ships in P2.
- **D7 — agenda items carry the `event` part token.** Agenda rows emit
  `part="agenda-item event <solid|tinted|outline> <allday|timed>"`; pre-branch it was
  `part="agenda-item"`. Existing `::part(agenda-item)` rules still match, but every existing
  `hijri-calendar::part(event)` rule now *also* matches agenda rows, which have a different
  internal layout — and `::part(event)` is the first example in the docs' styling section, so it
  is the part a consumer is most likely to have styled. The token is load-bearing: the
  `[part~="event"][part~="tinted"|"outline"]` rules must reach agenda items for `event-style` to
  work there, so it stays. A host wanting the old scoping writes
  `hijri-calendar:not([view="agenda"])::part(event)` for chips/blocks and uses
  `::part(agenda-item)` for the row; adding a style token does *not* exclude agenda rows, since
  they carry it too. Ships in P3.
- **D8 — WCAG 2 AA color-contrast fix (post-launch, not part of P0–P5).** An accessibility audit
  (axe) against a real host surfaced ~40 "Serious" contrast violations in the default theme,
  traced to our own default token values, not the host's palette. Three changes, all in
  `styles.ts` only:
  - `--hcal-muted` darkens `#9aa0a6` → `#5b6572`. `#9aa0a6` measured ≈2.64:1 against `--hcal-bg`
    (`#fff`); AA requires 4.5:1 for normal text, and every consumer of this token (weekday
    labels, title secondary, day-secondary numbers, month marker, loading label, more-link,
    day-banner summary, allday label, gutter time labels, agenda Gregorian date/event-time) is
    smaller than the 18.66px/14px-bold large-text threshold, so none qualify for the 3:1
    allowance. `#5b6572` measures ≈5.92:1 on `--hcal-bg` and ≈5.16:1 on the default
    `--hcal-today-bg` tint (`color-mix(in srgb, var(--hcal-accent) 10%, transparent)` over
    white) — the binding constraint, since several `--hcal-muted` consumers (day-secondary
    number, month marker, day-banner summary) render on today cells too, and a value that only
    cleared 4.5:1 on white (e.g. `#6b7280`, ≈4.83:1 on white) measured only ≈4.22:1 on the
    today-bg tint. Restore the old (failing) look with
    `hijri-calendar { --hcal-muted: #9aa0a6; }` — not recommended, reintroduces the failure.
  - `--hcal-now-color` darkens `#ea4335` → `#c5321f`. It doubles as a decorative now-line/dot
    color (not subject to 1.4.3) and the text color of `part="now-label"` (10px,
    `now-indicator="line-label"`), where `#ea4335` measured ≈3.92:1 on white. `#c5321f` measures
    ≈5.45:1. Restore the old (failing) color with
    `hijri-calendar { --hcal-now-color: #ea4335; }` — not recommended.
  - **Opacity is no longer used for text de-emphasis.** `.day-head.out` previously applied
    `opacity: var(--hcal-cell-out-opacity)` (default `0.45`) to its whole subtree; the audit
    measured the result at 1.44:1 (secondary numbers) and 2.85:1 (primary numbers) — opacity
    multiplies whatever contrast deficit the underlying color has, which is why this failed even
    harder than `--hcal-muted` on its own. `.day-head.out`'s number spans and month marker now
    get an explicit `color: var(--hcal-cell-out-fg)` instead (new token, default
    `var(--hcal-muted)`, same ≈5.92:1/≈5.16:1 as above). `.dow [part~="weekday-secondary"]`
    similarly no longer carries `opacity: 0.8` on top of its already-muted inherited color (that
    compounded to ≈3.79:1 on white with the new `--hcal-muted`, still failing).
    **Deviation:** `--hcal-cell-out-opacity` stays declared (default `0.45`) so a host CSS rule
    referencing it doesn't error, but nothing in `styles.ts` consumes it anymore — a host that
    was overriding it to tune out-of-month dimming intensity gets no effect from that override
    post-upgrade, and should set `--hcal-cell-out-fg` instead. `--hcal-cell-out-bg` (the
    out-of-month cell *background*) is untouched by this change.

  Judgement call, left alone: `--hcal-day-secondary-font-size` stays at `9px` (D4, matching the
  reference design). WCAG sets no minimum font size, so this isn't itself a violation, but 9px
  text is harder to read and the contrast fix matters more at that size — noted for the user,
  not changed. Ships post-launch, `packages/hijri-calendar/src/styles.ts` and its tests only.

### 5.5 CSS custom properties

Defaults are today's literal values unless marked **new**. All declared on `:host`.

| Property | Default | Phase | Applies to |
| --- | --- | --- | --- |
| `--hcal-bg`, `--hcal-fg`, `--hcal-accent`, `--hcal-accent-fg`, `--hcal-border`, `--hcal-radius`, `--hcal-event-fg`, `--hcal-font-family-arabic` | existing | — | unchanged |
| `--hcal-muted` | `#5b6572` (was `#9aa0a6`) | P0 default; **darkened post-launch, see D8 (§5.4)** | see D8 for the contrast rationale |
| `--hcal-today-bg` | `color-mix(in srgb, var(--hcal-accent) 10%, transparent)` | P2 | **Now actually used**: month day-cell background, week/day column-head background when today |
| `--hcal-font-family` | `system-ui, sans-serif` **(declare; was referenced but undefined)** | P0 | base font |
| `--hcal-font-family-display` | `var(--hcal-font-family)` **new** | P1 | `title-secondary`, day-banner secondary, time-grid event title, the `agenda-date` Gregorian sub-label (Gregorian day-number spans are governed by `--hcal-day-secondary-font-family` instead, whose default preserves the Arabic family — see §7.1 for overriding it to the display serif) |
| `--hcal-font-family-mono` | `var(--hcal-font-family)` **new** | P1 | gutter labels, `event-time`, `weekday-secondary`, day-banner weekday |
| `--hcal-grid-line` | `var(--hcal-border)` **new** | P2 | month-cell hairlines (`part="day-cell"`'s `border-inline-end`/`border-block-end`) — as shipped this is its only use: the time-grid slot lines, gutter border and outer border all stay on `--hcal-border` |
| `--hcal-header-bg` | `transparent` **new** | P1 | weekday row, time-grid head row, all-day row background |
| `--hcal-gutter-bg` | `transparent` **new** | P3 | time gutter |
| `--hcal-gutter-width` | `56px` | P3 | time gutter |
| `--hcal-hour-height` | `48px` | P3 | one hour in the time grid (slot height = hour × slot-minutes/60) |
| `--hcal-body-max-height` | `640px` | P0 | time-grid body & agenda scroll container (`none` = unbounded) |
| `--hcal-slot-alt-bg` | `transparent` **new** | P3 | every second hour row |
| `--hcal-slot-hover-bg` | `color-mix(in srgb, var(--hcal-fg) 4%, transparent)` | P3 | hovered slot |
| `--hcal-cell-min-height` | `96px` | P0 | month week-row minimum (`wide` band) |
| `--hcal-cell-min-height-medium` | `72px` **new** | P5 | month week-row minimum at the `medium` band |
| `--hcal-cell-min-height-narrow` | `56px` **new** | P5 | month week-row minimum at the `narrow` band |
| `--hcal-cell-padding` | `4px` **new** | P2 | month cell inner padding |
| `--hcal-cell-hover-bg` | `color-mix(in srgb, var(--hcal-fg) 6%, transparent)` | P2 | hovered month cell (whole cell once `day-cell` exists) |
| `--hcal-cell-out-bg` | `transparent` **new** | P2 | out-of-month cell background |
| `--hcal-cell-out-opacity` | `0.45` | P2; **no longer consumed as of D8 (§5.4)** | declared for compatibility only — see D8 |
| `--hcal-cell-out-fg` | `var(--hcal-muted)` **new** | D8 (§5.4), post-launch | out-of-month day-number/month-marker text color, replacing the old opacity mechanism |
| `--hcal-weekend-bg` | `transparent` **new** | P2 | weekend cells/columns (days from `weekend-days`) |
| `--hcal-weekend-fg` | `inherit` **new** | P2 | weekend weekday labels |
| `--hcal-today-color` | `var(--hcal-accent)` **new** | P2 | primary number colour when today (dot/none modes) |
| `--hcal-today-indicator-color` | `var(--hcal-accent)` **new** | P2 | today dot |
| `--hcal-today-column-bg` | `transparent` **new** | P3 | today column in week view |
| `--hcal-day-primary-font-size` | `14px` | P2 | month; time-grid heads use `15px` today — unify to this token |
| `--hcal-day-primary-color` | `var(--hcal-fg)` | P2 | |
| `--hcal-day-primary-weight` | `600` | P2 | |
| `--hcal-day-secondary-font-size` | `9px` | P2 | |
| `--hcal-day-secondary-color` | `var(--hcal-muted)` | P2 | |
| `--hcal-day-secondary-font-family` | `var(--hcal-font-family-arabic)` | P2 | (reference wants display serif here) |
| `--hcal-month-marker-color` | `var(--hcal-muted)` **new** | P2 | |
| `--hcal-weekday-font-size` | `11px` | P1 | |
| `--hcal-weekday-color` | `var(--hcal-muted)` | P1 | |
| `--hcal-weekday-align` | `center` **new** | P1 | `start \| center \| end` |
| `--hcal-title-font-size` | `inherit` **new** | P1 | `title-primary` |
| `--hcal-title-color` | `var(--hcal-fg)` **new** | P1 | |
| `--hcal-title-secondary-font-size` | `11px` | P1 | |
| `--hcal-title-secondary-color` | `var(--hcal-muted)` | P1 | |
| `--hcal-title-separator` | `1px solid var(--hcal-border)` **new** | P1 | inline layout divider |
| `--hcal-switch-bg` | `transparent` **new** | P0 | view-switch container |
| `--hcal-switch-active-bg` | `var(--hcal-accent)` | P0 | pressed view button |
| `--hcal-switch-active-fg` | `var(--hcal-accent-fg)` | P0 | |
| `--hcal-switch-active-shadow` | `none` **new** | P0 | |
| `--hcal-button-radius` | `6px` | P0 | toolbar buttons |
| `--hcal-event-radius` | `4px` | P3 | chips & blocks |
| `--hcal-chip-padding` / `--hcal-block-padding` | `1px 6px` / `2px 6px` | P3 | month chips / timed blocks |
| `--hcal-event-font-size` | `11px` | P3 | |
| `--hcal-event-border-width` | `2px` **new** | P3 | left accent border in `tinted`/`outline` |
| `--hcal-event-tint-alpha` | `18%` **new** | P3 | `tinted` background = `color-mix(in srgb, <color> var(--hcal-event-tint-alpha), transparent)` |
| `--hcal-event-hover-bg` | `none` **new** | P3 | |
| `--hcal-event-hover-shadow` | `none` **new** | P3 | |
| `--hcal-event-hover-transform` | `none` **new** | P3 | |
| `--hcal-event-inset` | `2px` | P3 | horizontal inset of timed blocks |
| `--hcal-event-dot-size` | `6px` **new** | P5 | month dot-mode chips at `narrow` |
| `--hcal-column-min-width` | `120px` **new** | P5 | minimum width of a week/day column before horizontal scrolling engages |
| `--hcal-now-color` | `#c5321f` (was `#ea4335`) | P3 default; **darkened post-launch, see D8 (§5.4)** | |
| `--hcal-now-width` | `2px` | P3 | |
| `--hcal-now-dot-size` | `8px` | P3 | |
| `--hcal-banner-bg` | `var(--hcal-header-bg)` **new** | P4 | day banner |
| `--hcal-banner-padding` | `16px 20px` **new** | P4 | |
| `--hcal-banner-primary-font-size` | `28px` **new** | P4 | |
| `--hcal-transition` | `0ms` **new** | P2 | hover transitions (reference: `120ms cubic-bezier(.2,.7,.2,1)`) |

Size-band thresholds (P5) are **not** custom properties — see §5.9.

### 5.6 `::part()` names and tokens

Existing (kept): `toolbar`, `title`, `nav-today`, `nav-prev`, `nav-next`, `view-switch`, `view-btn`,
`weekday`, `day`, `day-primary`, `day-secondary`, `event`, `more-link`, `allday-row`, `time-gutter`,
`slot`, `now-indicator`, `agenda-day`, `agenda-item`.

New parts: `calendar` (the root `.cal`, carries the size token), `nav-group`, `title-primary`,
`title-secondary`, `subheader`, `weekday-primary`, `weekday-secondary`, `day-cell`, `day-numbers`,
`day-month-marker`, `today-indicator`, `column-head`, `day-column`, `time-label`, `allday-label`,
`event-time`, `event-title`, `event-subtitle`, `now-label`, `day-banner`,
`day-banner-primary`, `day-banner-secondary`, `day-banner-weekday`, `day-banner-summary`,
`agenda-date`, `agenda-when`, `loading`, `scroll` (the week/day horizontal scroll container).

No part for `CalendarEvent.tag` (§5.2): it is **hook-only**, surfaced as `ctx.event.tag` on
`renderEvent` and never rendered by the built-in renderers — an earlier draft of this section
listed `event-tag`, which nothing ever emitted; rendering it would have added visible text to
every tagged chip (another accepted deviation) for a feature no consumer has asked for. Likewise
there is no `event-dot` part: the `narrow-events="dots"` marker is an `event` part with a `dot`
token, `::part(event dot)` (final-review finding 4).

Tokens appended to parts where applicable: `today`, `out`, `weekend`, `disabled`,
`continues-before`, `continues-after` (month chips of a multi-day event), `allday`/`timed` (every
chip, block and agenda item), `dot` (the `narrow-events="dots"` marker),
`solid|tinted|outline`, `variant-<x>`, and on `calendar`: `wide|medium|narrow`.
Examples: `hijri-calendar::part(event outline variant-draft) { border-color: #9a8e85; }`,
`hijri-calendar::part(calendar narrow) { --hcal-radius: 0; }`.

### 5.7 Slots

| Slot | Rendered where | Phase |
| --- | --- | --- |
| `toolbar-start` | before the nav group | P0 |
| `toolbar-end` | after the view switch | P0 |
| `subheader` | between toolbar and grid (full width) | P0 |
| `day-summary` | right side of the day banner, replaces the built-in summary | P4 |
| `loading` | inside the loading overlay, replaces the default spinner text | P4 |

React: children with `slot="…"` pass through `createComponent` unchanged. Angular: the wrapper
template adds `<ng-content select="[slot=toolbar-start]">` etc. inside `<hijri-calendar>` (P0).

### 5.8 Locale additions (`packages/hijri-calendar/src/locale.ts`)

`durationLabel(digits)` ("60m" / "٦٠ د"), `nowLabel` ("Now"), `eventsCount(digits)` ("2 events"),
`hoursScheduled(digits)` ("2.5 hours scheduled"), `loadingLabel` ("Loading…"), `moreDotsLabel(digits)`
(aria-label for dot-mode cells, "3 events"). Both `translit` and `ar`.

**Execution correction:** each of these four functions takes a **digits string**, not a number.
The caller (`hijri-calendar.ts`) formats the number through `numG()` (`numerals-gregorian`,
per Ruling Y — duration/count/hour figures are clock-adjacent, so `locale` never decides their
digit system) *before* calling the locale function; the locale function only supplies the
fixed unit suffix around whatever digit string it receives (`` `${digits}m` ``,
`` `${digits} events` ``, etc.). A locale function must not re-parse or re-format its argument
as a number.

### 5.9 Responsive model (P5)

The component measures its own width with a `ResizeObserver` on the host and classifies it into a
**size band**; layout differences are driven by the band, not by viewport media queries (the calendar
is often inside a sidebar-constrained column, as in the reference app).

| Band | Host width | Rationale |
| --- | --- | --- |
| `wide` | ≥ 900px | Reference desktop layout (content column at 1200px viewport is ~890–930px wide with the 232px sidebar) |
| `medium` | 600–899px | Tablet / narrow desktop |
| `narrow` | < 600px | Phone; 420px viewport minus page padding ≈ 388px |

Thresholds are fixed literals (CSS cannot read custom properties inside container queries and the
component uses one mechanism only). They are exported as constants (`SIZE_BANDS`) for hosts that want
to mirror them. Fallback when `ResizeObserver` is unavailable (jsdom, very old browsers): `wide`.

Behaviour per band (defaults; all colours/sizes via §5.5 tokens):

| Region | `wide` | `medium` | `narrow` |
| --- | --- | --- | --- |
| Toolbar | one row | wraps: nav + title first row, view switch + slots second row | same as medium; view buttons grow to fill the row |
| Title | per `title-layout` | per `title-layout` | forced `stacked` |
| Weekday header | per `weekday-format` | same | `bilingual` drops `weekday-secondary`; `long` becomes `short` |
| Month cells | `--hcal-cell-min-height` | `--hcal-cell-min-height-medium`; secondary number keeps | `--hcal-cell-min-height-narrow`; `narrow-events="dots"`: chips replaced by `part="event dot"` coloured dots (max `max-events`, then a `+N` count), `more-link` hidden, whole cell is the tap target; `narrow-events="scroll"`: desktop layout inside `part="scroll"` with `min-width: 640px` and horizontal scrolling |
| Week/day grid | as today | columns shrink to `--hcal-column-min-width`; if 7 × min-width exceeds the host, the grid (head + all-day + body together, `part="scroll"`) scrolls horizontally with the time gutter **sticky** at `inset-inline-start: 0` and the column-head row sticky at top | same as medium (always scrolls at 7 columns × 120px = 840px + gutter) |
| Day banner | side-by-side | side-by-side | summary stacks below the date |
| Agenda | two-column rows | same | date stacks above items |
| Page-level overflow | never | never | never: the host element's `scrollWidth` never exceeds its `clientWidth`; all overflow is inside `part="scroll"` |

---

## 6. Work plan — phases and tasks

Each phase is independently shippable (own changeset). Tests follow the existing style: vitest +
jsdom, `mount()`/`sr()` helpers, assertions on shadow DOM structure, `part` attributes, `dataset`,
inline `style`, and emitted `detail`s. jsdom does not compute cascaded custom properties or layout, so
**visual** acceptance is via Storybook stories (added per phase) and, from P6 on, Playwright
screenshot tests. Run: `pnpm --filter @spezutil/hijri-calendar test`,
`pnpm --filter @spezutil/hijri-view-core test`, `pnpm --filter @spezutil/hijri-core test`,
`pnpm --filter @spezutil/hijri-calendar-react test`, `pnpm --filter @spezutil/hijri-calendar-angular build`
(the Angular gate is the ng-packagr build).

**Phase list**

| Phase | Title | Lands in |
| --- | --- | --- |
| P0 | Foundations, bug fixes, `range-change`, toolbar API & slots | hijri-calendar 0.3.0, react 0.2.0, angular 0.2.0 |
| P1 | Typography, names, numerals (Hijri + Gregorian), title, bilingual weekday header, `weekend-days` | hijri-core 0.2.0, hijri-view-core 0.2.0, hijri-calendar 0.3.0 |
| P2 | Month grid restructure (cell layer, alignment, markers, today modes) | hijri-calendar 0.3.0 |
| P3 | Event model & time-grid parity (styles, time text, duration, subtitle/tag/variant, slot minutes, now line) | hijri-view-core 0.2.0, hijri-calendar 0.3.0 |
| P4 | Day banner, render hooks (`renderEvent`, `renderDayCell`), loading, agenda window | hijri-calendar 0.3.0 |
| P5 | Responsive layout (size bands, dot mode, sticky-gutter scroll) | hijri-calendar 0.3.0 |
| P6 | Visual regression: Playwright screenshot tests for the Storybook `Editorial` stories + CI job | repo infra (no package version) |
| P7 | Consumer migration (`da-office-management-fe`), docs, storybook, README, release | app repo + docs; release of the above |

P0–P5 may be released together as 0.3.0 or incrementally (P0 alone would be a valid 0.3.0-pre or
0.2.3 — pick at release time via `pnpm changeset status`). P6 should be in place before P5 is
considered done (its acceptance is screenshot-based). P7 depends on all package phases and on the
backend filter (blocker for the app-side fetch task only).

### Phase 0 — Foundations & bug fixes

Tasks
1. Declare `--hcal-font-family` on `:host` and use it for `font-family` (`styles.ts`).
2. Tokenise sizes already hard-coded: `--hcal-cell-min-height`, `--hcal-body-max-height`,
   `--hcal-button-radius`, `--hcal-switch-*` (`styles.ts`).
3. `views` attribute + property; `renderToolbar()` iterates the parsed list; guarantees active view
   is present (`hijri-calendar.ts`).
4. `toolbar="none"`; `renderToolbar()` returns only the slot wrappers.
5. Slots `toolbar-start`, `toolbar-end`, `subheader`. Because `render()` rewrites
   `root.innerHTML`, `<slot>` elements must be re-emitted every render (fine — slotted light-DOM
   children persist).
6. `part="nav-group"` wrapper; toolbar order prev/today/next (D1); `part="calendar"` on `.cal`.
7. `range-change` per the §5.3 contract: compute the range in `renderMonth`/`renderTimeGrid`/
   `renderAgenda`, store `lastRange`, emit when `{view,start,end}` changed with the right `reason`
   (`setViewDate` → `navigate`, `setView` → `view`, `attributeChangedCallback` → `attribute`, first
   `connectedCallback` render → `init`). Add the `visibleRange` getter. Export `RangeChangeDetail`.
8. Native `title` attribute on chips/blocks/agenda items (`title, time` string).
9. Export new types from `index.ts`.

Files: `packages/hijri-calendar/src/hijri-calendar.ts`, `styles.ts`, `index.ts`; new test
`packages/hijri-calendar/src/toolbar.test.ts`, new `range-change.test.ts`; additions to
`hijri-calendar.test.ts`.

Acceptance
- `mount({views:"day week month"})` renders exactly 3 `[part~="view-btn"]` in that order;
  `views="week"` with `view="month"` renders 2 buttons (week + month).
- `toolbar="none"` → no `[part~="toolbar"]`, but `slot[name=subheader]` exists.
- `range-change` fires exactly once on connect (`reason:"init"`) for `date="2026-07-06"` month view,
  with `start` equal to the first grid cell's `data-date` and `end` equal to the last cell's date + 1
  day, both `yyyy-mm-dd`; `el.visibleRange` deep-equals the detail; `nav-next` fires
  `reason:"navigate"`; `nav-next` then `nav-prev` emits exactly 2 more events (A→B→A), never a
  duplicate; setting `el.events = […]` fires nothing; setting `el.setAttribute("view","week")`
  fires `reason:"view"`… no — attribute path fires `reason:"attribute"`; clicking the week button
  fires `reason:"view"` (two tests).
- `[part="nav-group"]` contains prev, today, next in DOM order.
- Chip has `title="Event a, 10 AM"`.
- All existing tests pass unchanged (`hijri-calendar.test.ts` "returns to today" uses
  `[part="nav-today"]` — unaffected by D1).

Wrappers
- React (`packages/hijri-calendar-react/src/index.ts`): add
  `onRangeChange: "range-change" as EventName<CustomEvent<RangeChangeDetail>>`; re-export
  `RangeChangeDetail`. Test in `index.test.tsx`: after mount, `visibleRange` (read via the ref) reflects
  `reason:"init"`; `onRangeChange` fires with `reason:"navigate"` after a subsequent `nav-next` click
  (R5 — `onRangeChange` cannot observe the `init` fire itself under `@lit/react`).
- Angular (`hijri-calendar.component.ts`): `@Input() views`, `@Input() toolbar`,
  `@Output() rangeChange`, template bindings `[views] [toolbar] (range-change)`; add
  `<ng-content select="[slot=toolbar-start]">`, `[slot=toolbar-end]`, `[slot=subheader]` inside
  `<hijri-calendar>`; export the type in `public-api.ts`.

Changesets: `@spezutil/hijri-calendar` **minor** (new API + D1/D2 note), wrappers minor.

### Phase 1 — Typography, names, numerals, title, weekday header, weekend days

Tasks
1. `hijri-core`: `formatNumerals(value: number | string, system: "latn" | "arab"): string` in
   `packages/hijri-core/src/format.ts` — maps every ASCII digit in the input to U+0660–U+0669 for
   `arab`, returns the input unchanged for `latn`; non-digit characters (":" "/" letters) pass through
   so it can be applied to `"10:30"` and `"1447"` alike. Export from `index.ts`. `formatHijri(h,
   pattern, opts?: { numerals?: "latn"|"arab"; monthNames?: string[] })`. Tests in `format.test.ts`.
2. `names` attribute; `resolveLocale()` split into UI strings (`locale`) and a name set (`names`);
   `this.names` getter defaults to `locale === "ar" ? "ar" : "translit"`.
3. `numerals` and `numerals-gregorian` attributes; two helpers `numH(n)` / `numG(s)` used at every
   Hijri / Gregorian-or-clock emission site respectively (see §5.1 truth table for the exact site
   list). `formatTimeLabel()` and `gregDayLabel()` / `gregSubtitle()` route through `numG`.
4. `title-layout`; title DOM becomes
   `<div class="title" part="title"><span part="title-primary" dir=…>…</span><span part="title-secondary">…</span></div>`
   (D3). Inline layout via `:host([title-layout="inline"]) .title { flex-direction: row; … }` with
   `--hcal-title-separator`.
5. `weekday-format`: `short` (today), `long`, `bilingual` (primary = `names` weekday, secondary =
   English 3-letter from `hijri-core` `weekdayNames`). DOM:
   `<div part="weekday [weekend]"><span part="weekday-primary">…</span><span part="weekday-secondary">…</span></div>`;
   `--hcal-weekday-align`, `--hcal-header-bg`.
6. `--hcal-font-family-display`, `--hcal-font-family-mono` declared and applied (§5.5 "Applies to").
7. `dir="rtl"` gate (X4): a property of the span's actual rendered content, not of which attribute is
   `arab` — only spans whose content is single-script Arabic (`names="ar"` name spans) get `dir="rtl"`;
   a span mixing an Arabic-Indic numeral with a Latin month name/abbreviation (`day-secondary`,
   `day-primary` under `primary="gregorian"`, `title-primary` under mixed `names`/`numerals`) gets
   none, since Arabic-Indic digits render correctly inside an LTR run. Implemented as a shared gate,
   not per-span special-casing.
8. `weekend-days`: parse to `number[]` (default `[0,6]`); pass as `weekendDays` to
   `buildCalendarMonthModel` / `buildMonthModel` / `buildTimeGridModel`. `hijri-view-core`: add
   `isWeekend` to `DayCell` and `TimeGridColumn`, computed from `getUTCDay()` against
   `opts.weekendDays ?? [0, 6]`. The datepicker also consumes `DayCell` — the new field is additive
   and ignored there.

Files: `hijri-core/src/{format,index}.ts` + `format.test.ts`;
`hijri-view-core/src/{month,time-grid,calendar-month,index}.ts` + `month.test.ts`,
`time-grid.test.ts`; `hijri-calendar/src/{hijri-calendar,styles,locale,index}.ts`; new
`hijri-calendar/src/typography.test.ts`, `weekend.test.ts`.

Acceptance
- `formatNumerals(1447,"arab") === "١٤٤٧"`; `formatNumerals("10:30","arab") === "١٠:٣٠"`;
  `formatNumerals("12","latn") === "12"`; `formatHijri(h,"D MMMM YYYY",{numerals:"arab"})` has no
  ASCII digits.
- `mount({date:"2026-07-06", numerals:"arab"})`: `[part="title-primary"]` contains Arabic-Indic
  digits; `[part="day-secondary"]` and gutter labels stay Latin. `numerals-gregorian="arab"` alone:
  `[part="day-secondary"]` for 2026-07-01 is `"١ Jul"`, week-view gutter first label is `"٠٨:٠٠"`
  under `time-format="24" day-start="8"`, `[part="title-primary"]` stays Latin. Both `arab`: all
  four sites Arabic-Indic, month abbreviation still `Jul`.
- `names="ar"` with default locale: title uses `arMonthNames`, `[part="nav-today"]` still "Today".
- `weekday-format="bilingual"` renders 7 `[part~="weekday-primary"]` + 7 `[part~="weekday-secondary"]`.
- Weekend: default → Sat/Sun weekday cells carry the `weekend` token and `week-start="1"` moves them
  to the end; `weekend-days="5 6"` → Fri/Sat carry it and Sun does not; `weekend-days=""` → none;
  in week view the matching `[part~="column-head"]` and `[part~="day-column"]` carry it too (P2 adds
  those parts — assert on `.tg-col-head` class `weekend` until then). `hijri-view-core`:
  `buildMonthModel(cal, view, {weekendDays:[5,6]})` marks exactly 12 of 42 cells `isWeekend`.
- `title-layout="inline"` reflects; `[part="title-secondary"]` exists in both layouts.

Wrappers: React — none (attributes pass through). Angular — `@Input()` `titleLayout`, `names`,
`numerals`, `numeralsGregorian`, `weekdayFormat`, `weekendDays` + bindings.

Changesets: `hijri-core` minor, `hijri-view-core` minor, `hijri-calendar` minor.

### Phase 2 — Month grid restructure

Tasks
1. Per-column background layer in `renderMonth()`: for each week row emit 7
   `<div part="day-cell [today] [out] [weekend] [disabled]" data-cell="i" style="grid-column:d+1; grid-row:1 / -1">`
   **before** the day-head buttons; `.day-cell { z-index:0 }`, heads/chips/more `position: relative;
   z-index: 1`. Clicking the layer fires `date-click` (same handler as the button); the
   `<button class="day-head" part="day">` stays for keyboard/a11y. Hover moves to
   `.day-cell:hover` (`--hcal-cell-hover-bg`). Use `data-cell` (not `data-i`) so existing
   `[data-i]` tests keep counting 42 buttons.
2. Cell borders: `.day-cell { border-inline-end / border-block-end: 1px solid var(--hcal-grid-line) }`,
   last column no end border; `.week` loses its bottom border.
3. `--hcal-cell-padding`, `--hcal-cell-out-bg`, `--hcal-cell-out-opacity`, `--hcal-weekend-bg`,
   `--hcal-weekend-fg`, `--hcal-transition`; minimal `overflow-x: auto` on `.cal` as a safety net
   (superseded by P5's `part="scroll"` containers but harmless).
4. `day-number-align` → `:host([day-number-align="start"]) .day-head, :host([day-number-align="start"]) .tg-col-head { justify-content:flex-start; align-items:flex-start }`.
5. `today-marker`: `pill` keeps today's rule; `dot` renders `<span part="today-indicator">` inside
   `day-cell` and colours the primary number with `--hcal-today-color`; `none` renders neither.
   `--hcal-today-bg` applied to `.day-cell.today` and `.tg-col-head.today` in **all** modes (fixes
   the no-op prop).
6. `month-marker`: `dayNumbersHtml()` gains a marker slot: `<span part="day-month-marker">` with the
   Hijri month name (`names`) when `hijri`/`both` and `cell.hijri.day === 1`; Gregorian "1 Jul" logic
   preserved for `gregorian`/`both`; `none` shows bare numbers. Wrap numbers in
   `<span part="day-numbers">` so the marker can be pushed to the far edge (`margin-inline-start:auto`).
7. Tokenise number typography (`--hcal-day-primary-*`, `--hcal-day-secondary-*`); unify time-grid
   head size to the same tokens (D4).
8. Column heads: `part="day column-head [today] [weekend]"` (D2); `part="day-column [today] [weekend]"`
   on `.tg-day-col`.

Files: `hijri-calendar/src/{hijri-calendar,styles}.ts`; new test `hijri-calendar/src/month-grid.test.ts`.

Acceptance
- 42 `[part~="day-cell"]` per month; the cell for today carries `today`; out-of-month cells carry
  `out`; with `weekend-days="5 6"` the `weekend` token lands on columns 6 and 7 for `week-start="0"`.
- Clicking a `day-cell` fires `date-click` with the same detail as clicking its button; disabled
  cells do not fire.
- `today-marker="dot"` → exactly one `[part="today-indicator"]` when today is in the grid; `none` → 0;
  default → 0 and `.day-head.today .num-primary` still present.
- `month-marker="hijri"` on `date="2026-07-06"`: the cell whose `hijri.day === 1` has
  `[part="day-month-marker"]` with the month name; `both` also keeps "1 Jul" in `day-secondary`;
  `none` → `day-secondary` text is bare `"1"` on 2026-07-01. Existing `day-numbers.test.ts` keeps
  passing with the default.
- Stacking/focus (R1): in DOM order every `[part~="day-cell"]` precedes its column's `[part~="day"]`
  button; `styles` contains `z-index: 1` for `.day-head`; a `:focus-visible` rule exists for
  `.day-head` and is not `outline: none`.
- Keyboard: arrow navigation tests in `wireGridKeyboard` still pass (buttons unchanged).

Wrappers: Angular `@Input()` `dayNumberAlign`, `monthMarker`, `todayMarker`. React none.

Storybook: add `Editorial/Month` story reproducing the reference month look with tokens only (§7.1).

### Phase 3 — Event model & time-grid parity

Tasks (view-core)
1. `types.ts`: add `durationMinutes`, `subtitle`, `tag`, `style`, `variant` (§5.2).
2. `events.ts`: `normalizeEvent` — when timed and `end` absent and `durationMinutes > 0`, `endMs =
   startMs + durationMinutes*60000`; `EventFieldMap` values `string | fn`; `mapEventFields` calls
   functions with the raw object; copy the new fields. Validate `variant` against `/^[a-z0-9-]+$/`
   (drop + `warnOnce` otherwise — it is interpolated into `part`).
3. `index.ts`: export `EventFieldSource`.
4. Tests: `events.test.ts` — duration→end, function mapping, variant sanitising.

Tasks (calendar)
5. `event-style` + per-event `style`: chips/blocks get tokens `solid|tinted|outline`; CSS:
   `tinted` → `background: color-mix(in srgb, var(--_ev-color, var(--hcal-accent)) var(--hcal-event-tint-alpha), transparent); color: var(--_ev-color, var(--hcal-accent)); border-inline-start: var(--hcal-event-border-width) solid var(--_ev-color, …)`;
   `outline` → transparent bg, `1px dashed` border + solid inline-start border.
6. `event-time` with `labels` computed once per event (start / end / duration / range) through
   `formatTimeLabel` (→ `numG`) + `loc.durationLabel`; DOM inside every chip/block/agenda item becomes
   `<span part="event-time">…</span><span part="event-title">…</span>[<span part="event-subtitle">…</span>]`.
   Month chips default to no time (`auto`).
7. `variant` → `part="event … variant-<v>"` and `data-variant`.
8. `slot-minutes`: replace the `30` literals in `renderTimeGrid` (gutter + slots + `hour-end`
   class → `slot-hour-end` when the slot ends on an hour); slot height =
   `calc(var(--hcal-hour-height) * <slotMinutes>/60)` via inline `--_slot-h`. Document the
   `slot-click` coarsening in the JSDoc of the getter and in `api.md`.
9. `allday-row`, `--hcal-gutter-width` (replace `56px` in the `cols` template string with
   `var(--hcal-gutter-width)`), `--hcal-gutter-bg`, `--hcal-slot-alt-bg`, `--hcal-today-column-bg`,
   `--hcal-event-inset`, `--hcal-event-hover-*`, `--hcal-now-*`, `time-label-position`,
   `now-indicator` (`line` / `none`; `line-label` in P4), `part="time-label"`, `part="allday-label"`.

Files: `hijri-view-core/src/{types,events,index}.ts` + `events.test.ts`;
`hijri-calendar/src/{hijri-calendar,styles,locale,index}.ts`; new `hijri-calendar/src/event-chip.test.ts`;
extend `time-grid-view.test.ts` (slot-minutes, gutter width, allday-row auto).

Acceptance
- `{start:"2026-07-06T10:00", durationMinutes:90}` in week view with the default 0–24 window
  positions a block with `style.height === "6.25%"` (90/1440) and the same `top` as an explicit
  `end:"2026-07-06T11:30"`.
- `eventFields={{ color: (r) => TONES[r.event_type] }}` yields `--_ev-color` per chip.
- `event-style="tinted"` → chip `part` contains `tinted`; per-event `style:"outline"` overrides to
  `outline`; `variant:"draft"` → `variant-draft` token and `data-variant="draft"`;
  `variant:"<img>"` is dropped with one console warning.
- `event-time="start-duration"` in week view → `[part="event-time"]` text `"10 AM · 90m"`
  (24h: `"10:00 · 90m"`; with `numerals-gregorian="arab"`: `"١٠:٠٠ · ٩٠m"` — duration unit stays as
  `loc.durationLabel` defines); month view default → no `event-time`; `event-time="start"` in month
  → present.
- `slot-minutes="60"` → 12 `[part~="slot"]` per column for `day-start=8 day-end=20`; clicking the
  09:xx slot yields `detail.gregorian === "2026-07-06T09:00"`; `slot-minutes="15"` → 48 slots and
  `"…T09:15"` for the second slot of the hour.
- `allday-row="auto"` with no all-day events → no `.tg-allday`; with one → present.
- Now line element has no inline colour; `styles` contains `var(--hcal-now-color)`.

Wrappers: React — re-export `EventFieldSource`. Angular — `@Input()` `eventStyle`, `eventTime`,
`slotMinutes`, `alldayRow`, `nowIndicator`, `timeLabelPosition`.

Storybook: `Editorial/Week`, `Editorial/Day`; `EventStyles` story showing solid/tinted/outline.

### Phase 4 — Day banner, render hooks, loading, agenda window

Tasks
1. `day-header="banner"`: in `renderTimeGrid(1)` when set, replace `.tg-head` with
   `<div part="day-banner [today]"><div><span part="day-banner-primary" dir=…>٢٧ شوال ١٤٤٧</span><span part="day-banner-secondary">14 May 2026</span><span part="day-banner-weekday">Wednesday</span></div><div part="day-banner-summary"><slot name="day-summary">2 events · 2.5 hours scheduled</slot></div></div>`.
   Summary = timed+all-day count and `sum(endMin-startMin)/60` formatted to one decimal via
   `loc.eventsCount`/`loc.hoursScheduled`, digits through `numG`. Tokens `--hcal-banner-*`.
2. `now-indicator="line-label"`: `<span part="now-label">Now · 13:30</span>` positioned on the line
   (uses `loc.nowLabel` + `formatTimeLabel(nowMin)`); re-rendered by the existing minute timer.
3. `renderEvent` property (contract §5.2): in each of the four emit sites, if the hook returns a
   `Node`/`string`, it is appended inside the `<button part="event …">` instead of the default spans.
   Because `render()` uses `innerHTML`, hook output is attached in a post-render pass keyed by the
   same `data-ev/tev/aev/gev` indices.
4. `renderDayCell` property (contract §5.2): same post-render pass keyed by `data-i` (month buttons)
   and a new `data-col` on `.tg-col-head`; output replaces `dayNumbersHtml()` content only. The
   `day-cell` layer, `today-indicator`, `more-link` and chips are untouched. Shared helper
   `applyHook(hook, ctx, target, fallbackHtml)` implements try/catch + `warnOnce` + string→text.
5. `loading` attribute: `aria-busy` on `[role="grid"]`/`.timegrid`/`.agenda`; overlay
   `<div part="loading"><slot name="loading">Loading…</slot></div>`; pointer-events none on the body.
6. `agenda-days` replaces `AGENDA_DAYS`; navigation step in `navigate()` uses it; `range-change`
   `reason:"attribute"` when it changes.
7. Agenda parts `agenda-date`, `agenda-when`; agenda items get the same `event-*` inner parts and
   `event-style` handling (dot stays for `solid`).

Files: `hijri-calendar/src/{hijri-calendar,styles,locale,index}.ts`; new `day-banner.test.ts`,
`render-hooks.test.ts`; extend `agenda-view.test.ts` (`agenda-days="7"` navigates by 7).

Acceptance
- `view="day" day-header="banner"` with two events (90 + 60 min) → `[part~="day-banner-summary"]`
  text `"2 events · 2.5 hours scheduled"`; `locale="ar"` gives the Arabic strings; no
  `.tg-col-head` rendered; `day-header` unset → `.tg-col-head` as today.
- `renderEvent = () => Object.assign(document.createElement("b"), {textContent:"X"})` → every
  `[part~="event"]` contains a `<b>`; returning `null` → default spans; `"plain"` → a text node, and
  `"<i>x</i>"` appears literally (not parsed); a throwing hook → default spans + exactly one
  `console.warn` across many events.
- `renderDayCell` returning `<b>` → every `[part~="day"]` button contains a `<b>` and **no**
  `[part="day-primary"]`; `[part~="day-cell"]`, `today-indicator` and chips are still present and
  unchanged; keyboard arrow navigation still works (existing test re-run with the hook set); the
  button keeps its `aria-label`. In week view the `.tg-col-head` content is replaced likewise.
- `loading` → `[aria-busy="true"]` and `[part="loading"]` present; removing the attribute removes them.
- `now-indicator="line-label"` with fake timers at 13:30 local → `[part="now-label"]` text
  `"Now · 1:30 PM"` (12h) / `"Now · 13:30"` (24h).

Wrappers: React — nothing structural (`renderEvent`/`renderDayCell` are properties; `@lit/react` sets
non-attribute props on the element); add tests that both props reach the shadow DOM; re-export
`RenderEventContext`, `RenderDayCellContext`. Angular — `@Input() renderEvent`, `renderDayCell`,
`dayHeader`, `agendaDays`, `loading`; `[renderEvent]`/`[renderDayCell]` property bindings; types in
`public-api.ts`.

### Phase 5 — Responsive layout (§5.9)

Tasks
1. `ResizeObserver` on the host in `connectedCallback` (disconnect in `disconnectedCallback`);
   classify `contentRect.width` into `wide|medium|narrow` with the fixed thresholds; store `size`;
   re-render only when the band changes. Export `SIZE_BANDS = { medium: 600, wide: 900 }`.
   Fallback `wide` when `ResizeObserver` is undefined. Read-only `size` property.
2. `part="calendar <band>"` on `.cal`; all band-specific CSS keyed on `.cal[data-size="…"]`.
3. Toolbar wrap rules for `medium`/`narrow`; title forced `stacked` at `narrow` (render-time, not
   CSS, so `title-secondary` exists in both layouts); `weekday-secondary` omitted and `long`→`short`
   at `narrow` (render-time).
4. Month: `--hcal-cell-min-height-medium/-narrow`; `narrow-events`: in `dots` mode `renderMonth()`
   emits, per day, up to `max-events` `<span part="event dot" style="--_ev-color:…">` inside the
   `day-cell` plus a `<span part="more-link">+N</span>` count (non-interactive), skips lane chips and
   `more-link` buttons, and the `day-cell` click is the only interaction (`date-click`); the day
   button's `aria-label` appends `loc.moreDotsLabel(n)`. `scroll` mode wraps `.month` in
   `<div part="scroll">` with `min-width: 640px; overflow-x: auto`.
5. Week/day: wrap `.tg-head`, `.tg-allday`, `.tg-body` in a single `<div part="scroll">` scroll
   container; `.tg-gutter, .tg-allday-label, .tg-head > :first-child { position: sticky; inset-inline-start: 0; z-index: 3; background: var(--hcal-gutter-bg, var(--hcal-bg)) }`;
   `.tg-head { position: sticky; top: 0; z-index: 4 }`; day columns `min-width: var(--hcal-column-min-width)`
   at `medium`/`narrow`. The vertical `--hcal-body-max-height` scroll stays on `.tg-body`.

   **Execution finding (post-hoc):** the `position: sticky; inset-inline-start: 0` rule above is
   *inert* for `.tg-gutter` in real browsers — `.tg-gutter` lives inside `.tg-body`, and `.tg-body`'s
   own pre-existing `overflow-y: auto` (needed for the unrelated vertical `--hcal-body-max-height`
   scroll) makes `.tg-body` the nearest scrolling ancestor CSS resolves the gutter's sticky inset
   against, even though `.tg-body` never scrolls horizontally itself — so the computed offset is
   always 0 and the gutter scrolls away with the content. `.tg-allday-label` and `.tg-head > :first-child`
   don't have this problem (neither lives inside a non-`visible`-overflow ancestor). The actual fix
   shipped is `wireStickyGutter()` in `hijri-calendar.ts`: on every `scroll` event of `part="scroll"`
   (rAF-throttled), it measures the pixel gap between the scroll container's edge and the gutter's
   current edge and cancels it with an inline `transform: translateX()`, RTL-aware. The CSS
   `position: sticky` declaration stays in `styles.ts` anyway — harmless, and documents intent for a
   future restructuring that removes the nested scroll box — but it is not what pins the gutter today.
   Any consumer-facing description of "the sticky time gutter" must describe the JS behaviour, not
   the CSS rule.
6. Day banner summary stacks at `narrow`; agenda date stacks at `narrow`.
7. `:host { max-width: 100%; min-width: 0; overflow: hidden }` so the host never widens its
   container; all overflow lives in `part="scroll"`.

Files: `hijri-calendar/src/{hijri-calendar,styles,index}.ts`; new `responsive.test.ts` with a
`ResizeObserver` stub (`globalThis.ResizeObserver = class { constructor(cb){…} observe(){ cb([{contentRect:{width}}]) } disconnect(){} }`).

Acceptance (unit, jsdom with the stub)
- Width 1000 → `size === "wide"`, `[part~="calendar"]` has token `wide`; 700 → `medium`; 400 →
  `narrow`; changing 700→720 does not re-render (spy on `render`), 700→590 does.
- `narrow` + default `narrow-events`: month renders `[part~="event"][part~="dot"]` spans, zero
  `<button part="event">`, `+N` text when events exceed `max-events`; clicking the `day-cell` fires
  `date-click`; `event-click` cannot fire (no chip buttons). `narrow-events="scroll"` → chip buttons
  present and `[part="scroll"]` wraps `.month`.
- `narrow` week view with an all-day event present (or `allday-row="always"`) → `[part="scroll"]`
  contains `.tg-head`, `.tg-allday` and `.tg-body`; with no all-day row, `[part="scroll"]` still wraps
  `.tg-head` and `.tg-body`; styles string contains `position: sticky` for `.tg-gutter`.
- `narrow` + `weekday-format="bilingual"` → no `weekday-secondary`; `title-layout="inline"` →
  `.title` lacks the inline class/attribute hook.
- No `ResizeObserver` (delete the global) → `size === "wide"`, no errors.

Acceptance (visual — P6 screenshot tests, `Editorial/*` stories)
- 1200px viewport (host ≈ 900px, `wide`): month/week/day match the reference screenshots
  (structure, fonts, colours) — baseline images reviewed by the user once, then locked.
- 768px (host ≈ 700px, `medium`): toolbar on two rows, month cells 72px, week columns ≥ 120px with a
  horizontal scrollbar on `part="scroll"` and the gutter visible when scrolled 200px to the right
  (Playwright scrolls the container before the second shot).
- 420px (host ≈ 388px, `narrow`): month shows dots; no horizontal scrollbar on `<body>`
  (`document.documentElement.scrollWidth === clientWidth`); week view scrolls inside `part="scroll"`
  with the gutter sticky; day banner summary stacked.

Wrappers: Angular `@Input() narrowEvents`. React none. Both re-export `SIZE_BANDS` type/const.

Storybook: `Editorial/Month|Week|Day` gain a `hostWidth` arg (wrapper `<div style="width:…">`)
with presets 900 / 700 / 388, and a `Responsive` story cycling all three.

### Phase 6 — Visual regression tests & CI

Context: the repo currently has **no CI test workflow** — `.github/workflows/` contains only
`docs.yml` (Pages deploy on push to main) and `release.yml` (manual publish). `pnpm test` is never run
in CI today. This phase adds the first one; the screenshot suite depends on it.

Tasks
1. `apps/storybook`: add `@playwright/test` devDependency, `playwright.config.ts` with
   `webServer: { command: "pnpm exec http-server storybook-static -p 6007 -s", url: "http://127.0.0.1:6007" }`
   (or `storybook dev` — prefer the static build for speed and determinism), `projects: [{ name:
   "chromium" }]` only, `expect.toHaveScreenshot` defaults `{ maxDiffPixelRatio: 0.01, animations:
   "disabled", caret: "hide" }`; scripts `"test:visual": "playwright test"`,
   `"test:visual:update": "playwright test --update-snapshots"`. Turbo: add a `test:visual` task
   depending on `build`.
2. Specs in `apps/storybook/tests/visual/editorial.spec.ts`: for each story
   `editorial--month|week|day` × viewport `{1200×800, 768×1024, 420×900}` navigate to
   `/iframe.html?id=<story>&viewMode=story`, wait for `hijri-calendar` to have `part~="calendar"` with
   the expected band token, `await expect(page).toHaveScreenshot(`${story}-${width}.png`)`; for week at
   768/420 also a second shot after `scrollLeft = 200` on `part="scroll"`. Total: 3 stories × 3
   viewports = 9, plus the 2 extra scrolled week shots (768 and 420) = **11 images** (a prior draft of
   this section said 21 — arithmetic error; corrected here and in §9).
3. Determinism: fonts. The `Editorial` stories must not load Google Fonts at test time. Vendor the
   OFL-licensed `Newsreader`, `Public Sans`, `JetBrains Mono` TTFs into `apps/storybook/public/fonts/`
   (Amiri is already embedded in the component) with `@font-face` in `.storybook/preview-head.html`,
   and their license files alongside — same OFL obligation as `assets/fonts/OFL-Amiri.txt`. Freeze
   time in the stories (`date="2026-07-06"` is already fixed; the now-line is hidden via
   `now-indicator="none"` in Editorial stories so the screenshots do not drift by the minute).
4. Baselines: committed under `apps/storybook/tests/visual/editorial.spec.ts-snapshots/` with
   Playwright's default `<name>-chromium-linux.png` naming. Generated **only** inside the CI
   container image `mcr.microsoft.com/playwright:v<pinned>-jammy` (locally via
   `docker run --rm -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v<pinned>-jammy pnpm --filter @spezutil/storybook test:visual:update`)
   so macOS rendering never pollutes them. Update workflow: run the docker command, review the diff
   images in the PR (Playwright's `test-results/` HTML report is uploaded as a CI artifact), commit
   the new baselines with a changeset-free commit prefixed `test(visual):`.
5. CI: new `.github/workflows/ci.yml` on `pull_request` and `push` to `main`: job `unit`
   (`pnpm install --frozen-lockfile`, `pnpm turbo run build --filter=./packages/*`, `pnpm turbo run
   test`, `pnpm turbo run lint`) and job `visual` (container `mcr.microsoft.com/playwright:v<pinned>-jammy`,
   `pnpm build --filter @spezutil/storybook...`, `pnpm --filter @spezutil/storybook test:visual`,
   `actions/upload-artifact` of `apps/storybook/playwright-report` on failure). Pin the Playwright
   version identically in `package.json` and the image tag.
6. Docs: a short `apps/storybook/tests/visual/README.md` with the update workflow.

Acceptance
- `ci.yml` green on a no-op PR; a deliberate `--hcal-accent` change in the `Editorial` story turns
  `visual` red with a diff artifact; `test:visual:update` in the container regenerates exactly the
  changed images.

Blocker note: P5's visual acceptance and §9 depend on this job existing; nothing in P0–P4 does.

Execution note (post-hoc): the infrastructure (this phase's tasks 1, 3, 5, 6 — Playwright config,
vendored OFL fonts, `ci.yml`) and the screenshot specs (task 2, `editorial.spec.ts`) landed in
separate passes. No baseline images exist in the repository as of this writing — task 4 forbids a
macOS-generated set, so the first run inside the pinned container generates them; until that run
happens, the `visual` CI job fails with "A snapshot doesn't exist" for every test, which is the
expected and verified local/pre-baseline state, not a regression.

### Phase 7 — Consumer migration, docs, release

Tasks
1. **Docs** (`apps/docs/docs/calendar/api.md`): add the tables from §5.1 (incl. the numerals truth
   table and the `slot-minutes`/`slot-click` note), §5.3 (`range-change` contract verbatim), §5.5,
   §5.6/5.7, §5.9; `getting-started.md`: "Fetching events for the visible range" using `range-change`;
   `recipes.mdx`: "Editorial theme (tokens only)", "Custom event content (`renderEvent`)", "Custom day
   numbers (`renderDayCell`)", "Fri/Sat weekend", "Phone layout"; `apps/docs/src/components/CalendarDemo.tsx`:
   accept the new props.
2. **Storybook** (`apps/storybook/stories/hijri-calendar.stories.ts`): argTypes for every new
   attribute; stories `Editorial/*`, `EventStyles`, `BilingualHeader`, `DayBanner`, `CustomRenderer`,
   `CustomDayCell`, `Loading`, `Responsive`, `Numerals` (four-combination grid).
3. **README** (`packages/hijri-calendar/README.md`): feature bullets, theming section listing the
   font-family trio, `eventFields` function example, `range-change` example, responsive note.
4. **Root `CLAUDE.md`**: extend the `hijri-calendar` bullet in "CSS custom properties" with
   `--hcal-font-family-display` / `--hcal-font-family-mono`; add a line about `formatNumerals` in
   `hijri-core`; mention `apps/storybook/public/fonts/` OFL fonts next to the Amiri paragraph.
5. **Changesets & release** per `RELEASING.md`: one changeset per phase, then `pnpm changeset status`
   → confirm `hijri-calendar 0.3.0`, `hijri-view-core 0.2.0`, `hijri-core 0.2.0`, both wrappers
   `0.2.0`. Watch the peer-dependency note: the Angular wrapper declares
   `@spezutil/hijri-calendar >=0.1.0 <2.0.0`, so a minor bump must **not** force-major it — verify in
   the status output before `pnpm version-packages`. CHANGELOG entries must include D1 through D7
   (§5.4) and the "1.0 will default `event-style` to `tinted`" notice (§8.2).
6. **`da-office-management-fe`** (separate repo; git-ignored here as a local clone):
   - Bump `@spezutil/hijri-calendar-react` to `^0.2.0` (pulls `hijri-calendar ^0.3.0`).
   - **Range-based fetching (blocked on backend filter, see below).** In `src/api/events.js` add
     ```js
     export function useEventsInRange(range, stage = 'assigned') {
       const params = new URLSearchParams({ status: stage, page_size: '500' });
       if (range) { params.set('start_at__gte', `${range.start}T00:00:00`); params.set('start_at__lt', `${range.end}T00:00:00`); }
       return useQuery({
         queryKey: ['events', 'range', stage, range?.start ?? null, range?.end ?? null],
         queryFn: () => api.get(`/events?${params}`),
         enabled: !!range,
         placeholderData: keepPreviousData,
       });
     }
     ```
     and stop passing the paginated `assigned` (page 1 of 10) into the calendar. `keepPreviousData`
     plus the range-keyed `queryKey` is the host-side coalescing the §5.3 contract expects; TanStack
     dedupes identical in-flight keys, so rapid prev/next never issues duplicate requests for the same
     range. Acceptance: navigating Jul→Aug→Jul issues 2 requests, not 3; the calendar shows every
     assigned event in the visible 6-week grid; the List and Unassigned tabs keep using the paginated
     `useEvents`. **Backend dependency:** the Django `/events` endpoint must accept
     `start_at__gte` / `start_at__lt` (ISO datetimes, tenant timezone) and a `page_size` large enough
     for a 6-week window (or `page_size=0` = unpaginated). This blocks *only this task*; all component
     work proceeds regardless.
   - Rewrite `src/modules/events/my-calendar.jsx` per §7.2; drive `view`/`date` from URL params
     instead of the hard-coded `"2026-07-06"`; wire `onRangeChange` → `setRange`.
   - Delete from `src/styles/events.css`: sections **"Calendar header"** (`.cal-page`, `.cal-head`
     and descendants **except** `.cal-head .filters`, `.filter-chip`, `.filter-label`, which move
     into the `subheader` slot content), **"Calendar grid"** (`.cal-grid`, `.cal-dow`, `.cal-month`,
     `.cm-day` and descendants), **"Week view"** (`.wk-*`), **"Day view"** (`.day-grid`, `.day-head`,
     `.day-body`, `.day-hours`, `.day-col`, `.day-ev`, `.day-now`), **"List view"** (`.list-view`,
     `.lv-*`, already dead). Keep `.mode-toggle`, `.segmented` (in `app.css`), drawers, forms,
     unassigned, links, media sections. Add the token block from §7.1 as
     `src/styles/calendar-theme.css`, imported in `main.jsx`.
   - Remove the stale `import { HijriCalendar } … from "@spezutil/hijri-calendar-react"` in
     `src/modules/events/index.jsx` (unused there).

---

## 7. Consumer mapping (what the app writes after this lands)

### 7.1 Token block — `da-office-management-fe/src/styles/calendar-theme.css`

```css
/* Maps the Busaheba editorial tokens onto <hijri-calendar>. No internal selectors. */
hijri-calendar {
  --hcal-bg: var(--surface);
  --hcal-fg: var(--ink);
  --hcal-muted: var(--ink-3);
  --hcal-accent: var(--crimson);
  --hcal-accent-fg: #fff;
  --hcal-border: var(--line);
  --hcal-grid-line: var(--line);
  --hcal-radius: var(--r-4);
  --hcal-transition: var(--t-fast) var(--ease);

  --hcal-font-family: var(--font-sans);
  --hcal-font-family-display: var(--font-display);
  --hcal-font-family-mono: var(--font-mono);
  --hcal-font-family-arabic: var(--font-arabic);

  --hcal-header-bg: var(--bg-soft);
  --hcal-gutter-bg: var(--bg-soft);
  --hcal-weekday-align: start;
  --hcal-weekday-color: var(--ink-3);
  --hcal-weekend-fg: var(--ink-4);

  --hcal-cell-min-height: 112px;
  --hcal-cell-min-height-medium: 84px;
  --hcal-cell-min-height-narrow: 56px;
  --hcal-cell-padding: 8px 10px 10px;
  --hcal-cell-hover-bg: var(--bg-soft);
  --hcal-cell-out-bg: rgba(244, 236, 221, 0.35);
  --hcal-cell-out-opacity: 0.4;
  --hcal-today-bg: var(--cream-soft);
  --hcal-today-color: var(--crimson);
  --hcal-today-indicator-color: var(--crimson);
  --hcal-today-column-bg: rgba(245, 237, 224, 0.4);

  --hcal-day-primary-font-size: 22px;
  --hcal-day-primary-color: var(--crimson-deep);
  --hcal-day-secondary-font-size: 12px;
  --hcal-day-secondary-color: var(--ink-3);
  --hcal-day-secondary-font-family: var(--font-display);
  --hcal-month-marker-color: var(--crimson-deep);

  --hcal-title-font-size: 30px;
  --hcal-title-color: var(--crimson-deep);
  --hcal-title-secondary-font-size: 18px;
  --hcal-title-secondary-color: var(--ink-3);

  --hcal-switch-bg: var(--bg-soft);
  --hcal-switch-active-bg: var(--surface);
  --hcal-switch-active-fg: var(--ink);
  --hcal-switch-active-shadow: var(--shadow-1);

  --hcal-event-radius: 3px;
  --hcal-event-tint-alpha: 18%;
  --hcal-event-hover-bg: var(--cream);
  --hcal-event-hover-shadow: var(--shadow-2);
  --hcal-event-dot-size: 6px;
  --hcal-column-min-width: 120px;
  --hcal-now-color: var(--crimson);
  --hcal-now-width: 1px;
  --hcal-body-max-height: none;
}
hijri-calendar[view="week"] { --hcal-hour-height: 56px; --hcal-gutter-width: 60px; }
hijri-calendar[view="day"]  { --hcal-hour-height: 72px; --hcal-gutter-width: 80px;
                              --hcal-slot-alt-bg: rgba(244, 236, 221, 0.18); --hcal-event-inset: 16px;
                              --hcal-event-radius: var(--r-3); --hcal-banner-bg: var(--surface-warm); }
/* Optional escape hatches, still public API: */
hijri-calendar::part(event outline) { color: var(--ink-3); border-color: var(--line-strong); }
hijri-calendar::part(calendar narrow) { --hcal-radius: var(--r-2); }
```

### 7.2 Component usage — `src/modules/events/my-calendar.jsx` (sketch)

```jsx
const TONE = { executive: "var(--crimson)", ceremonial: "var(--crimson)", standing: "var(--rose)",
               education: "var(--ok)", finance: "var(--warn)", site: "var(--rose)" };

const [range, setRange] = useState(null);
const { data } = useEventsInRange(range, 'assigned');   // P7 task; range-keyed, keepPreviousData

<HijriCalendar
  view={view} date={date}
  views="day week month"
  title-layout="inline" names="ar" numerals="arab" numerals-gregorian="latn"
  weekday-format="bilingual" weekend-days="0 6"
  day-number-align="start" month-marker="hijri" today-marker="dot"
  event-style="tinted" event-time="start" time-format="24" slot-minutes="60"
  day-start="8" day-end="19" allday-row="auto" day-header="banner" now-indicator="line-label"
  narrow-events="dots"
  timezone="Asia/Kolkata"
  eventFields={{
    start: "start_at",
    durationMinutes: "duration_mins",
    subtitle: "location_name",
    tag: "event_type_name",
    color: (e) => TONE[e.event_type] ?? "var(--rose)",
    style: (e) => (e.status === "unassigned" ? "outline" : undefined),
    variant: (e) => e.status,
  }}
  events={data?.results ?? []}
  loading={!data}
  onRangeChange={(e) => setRange({ start: e.detail.start, end: e.detail.end })}
  onEventClick={(e) => setParams({ id: e.detail.event.id })}
  onViewChange={(e) => setView(e.detail.view)}
  onDateChange={(e) => setDate(e.detail.date)}
>
  <div slot="toolbar-end">{/* mode toggle + New event button, unchanged app markup */}</div>
  <div slot="subheader">{/* filter chips */}</div>
</HijriCalendar>
```

Everything in that sketch is public API from §5; nothing depends on the component's internal DOM.

---

## 8. Decisions and risks

All questions raised in the first draft were approved on 2026-09-06 ("yes all required"). Each
resolution below is already propagated into §5 and §6; this section is the record.

### 8.1 Decisions

| # | Decision | Where it lands |
| --- | --- | --- |
| Q1 | **Range-driven fetching is in scope.** The component guarantees the `range-change` contract in §5.3 (initial `init` fire, dedupe on identical ranges, no internal debounce, per-view range definitions). The app replaces the paginated unfiltered call with `useEventsInRange` keyed by range. The backend `start_at__gte/lt` filter is a blocker for the **app-side task only**. | §5.3, P0 task 7, P7 task 6 |
| Q2 | **D1 and D2 accepted as-is**, no `nav-order` escape hatch. Changeset + CHANGELOG notes. | §5.4, P0 task 6, P2 task 8, P7 task 5 |
| Q3 | **`event-style` default stays `solid` in 0.3.x; flips to `tinted` at 1.0** (breaking visual change, sequenced). Recorded in §8.2 with the consumer migration note; announced in the 0.3.0 CHANGELOG. | §5.1, §8.2, P7 task 5 |
| Q4 | **Real responsive behaviour in scope** as its own phase: `ResizeObserver` size bands (900 / 600 px), month dot mode, week/day horizontal scroll with sticky gutter + sticky heads, acceptance at 1200 / 768 / 420. New tokens `--hcal-cell-min-height-medium/-narrow`, `--hcal-column-min-width`, `--hcal-event-dot-size`; new attribute `narrow-events`; read-only `size`; parts `calendar`, `scroll`, and a `dot` token on `event` (§5.6). | §5.9, P5 |
| Q5 | **`weekend-days` attribute in scope** (default `"0 6"`), plumbed through `DayCell.isWeekend` / `TimeGridColumn.isWeekend` with `weekendDays` options in `hijri-view-core`; Fri/Sat tests; Angular input. | §5.1, §5.2, P1 task 8 |
| Q6 | **`renderDayCell` in scope**, same `Node`/`string`/`null` contract and safety rules as `renderEvent`; content-only inside the component-owned `<button part="day">`; interaction with the P2 cell layer and focus/z-index rules specified. | §5.2, P4 task 4 |
| Q7 | **`numerals-gregorian` in scope**, independent of `numerals`; truth table in §5.1; both share `formatNumerals()` in `hijri-core`; clock digits follow `numerals-gregorian`; month abbreviations and AM/PM never transliterated. | §5.1, P1 tasks 1 & 3 |
| Q8 | **`slot-minutes` coarsens `slot-click`** — accepted and documented in the attribute table, the getter JSDoc and `api.md`. | §5.1, P3 task 8, P7 task 1 |
| Q9 | **Bundle growth accepted** (~4–5 KB CSS/JS on top of the ~500 KB embedded font). | — |
| Q10 | **Playwright screenshot tests in scope** for `Editorial/Month|Week|Day` × 1200/768/420 (+ scrolled week shots); live in `apps/storybook/tests/visual/`, run via `pnpm --filter @spezutil/storybook test:visual`, baselines generated only in the pinned Playwright container, new `ci.yml` with `unit` + `visual` jobs (the repo has no CI test workflow today). Depends on that job — it is created in P6. Fonts vendored (OFL) for determinism. | P6 |

### 8.2 Deferred to 1.0 (committed)

- **`event-style` default → `tinted`.** Migration note for the 1.0 CHANGELOG and README: consumers
  who want the 0.x look add `event-style="solid"` (or the React/Angular equivalent) — one attribute,
  no other change. `--hcal-event-fg` keeps applying to `solid` only. Storybook's default story will
  switch to `tinted` at the same time. Until 1.0, the 0.3.0 CHANGELOG carries: "In 1.0 the default
  `event-style` becomes `tinted`; set `event-style="solid"` explicitly if you depend on the current look."
- Consider making the size-band thresholds attributes if a consumer needs different breakpoints
  (would require rendering `styles` as a function of attributes).

### 8.3 Risks (accepted)

| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | The month-cell background layer (P2) changes stacking; chips/buttons need `position: relative; z-index: 1`; keyboard focus rings must stay visible above the layer; `renderDayCell` output lives inside that stacking context. | P2 acceptance asserts DOM order, `z-index: 1`, and a non-suppressed `:focus-visible` rule; hook contract forbids escaping positioning; P6 screenshot of a focused cell in the `Editorial/Month` story (add a `focus` step). |
| R2 | `innerHTML` re-render + post-render hook passes could be slow for very large event sets. | Fine for ≤ a few hundred events (measured against the reference's 16); virtualisation is explicitly out of scope; the `ResizeObserver` re-renders only on band change. |
| R3 | `EventFieldMap` accepting functions makes `eventFields` non-JSON-serialisable; Angular templates pass it as an object binding anyway. | Documented in `api.md`; string values keep working. |
| R4 (new) | Narrow-width design has **no reference** to match; the 768/420 baselines are self-referential. | Review the `Responsive` story with the user once before locking baselines (P5 → P6 hand-off checklist item). |
| R5 (new) | `range-change` on first render fires synchronously inside `connectedCallback`. `@lit/react@1.0.8`'s `createComponent` attaches `onRangeChange` inside a dependency-free `useLayoutEffect`, which React runs only after the ref callback fires post-commit — strictly after the custom element's `connectedCallback` and its synchronous `init` dispatch have already happened. So a React host misses the connect-time `init` event exactly as a vanilla host that adds its listener after `appendChild` does; the Angular wrapper's `(rangeChange)` binding has the same timing. | `visibleRange` property is the load-bearing catch-up path for React and Angular hosts too, not just vanilla ones; docs recipe shows all three. |
| R6 (new) | Vendoring three more OFL fonts into `apps/storybook/public/fonts/` adds license obligations. | Ship license files alongside, as done for Amiri; storybook is private and never published. |

---

## 9. Definition of done

- P0–P5 merged; `pnpm -r test`, `pnpm -r build` and the new `ci.yml` `unit` job green; Angular
  wrapper builds; every new attribute/property/event/part/slot in §5 has at least one vitest.
- P6 `visual` job green with 11 committed baselines (§6 P6 task 2); the `Editorial/*` 1200px baselines are visually
  indistinguishable from the three reference screenshots (month / week / day), produced with **only**
  the §7.1 token block and attributes; the 768/420 baselines were reviewed once by the user (R4).
- `apps/docs` API page lists every attribute, property, event, custom property, part and slot in §5,
  the numerals truth table, the `range-change` contract, the `slot-minutes` note, and the size-band
  table.
- Changesets applied; versions as in the header; CHANGELOGs mention D1, D2, D3, D4, D5, D6, D7 and
  the 1.0 `event-style` default change.
- `da-office-management-fe` PR deletes the five dead calendar sections of `events.css`, ships
  `calendar-theme.css` + the rewritten `my-calendar.jsx`, and fetches by visible range via
  `useEventsInRange` (merged once the backend filter exists; the token/markup parts of the PR can
  merge earlier behind the existing paginated data).
