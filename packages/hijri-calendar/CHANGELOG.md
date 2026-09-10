# @spezutil/hijri-calendar

## 0.3.0

### Minor Changes

- 5d1d377: Foundations for the events-parity API: a `range-change` event so hosts can fetch data for the
  visible date range instead of guessing, a `views`/`toolbar` API for controlling the built-in
  toolbar (or removing it entirely), and `toolbar-start`/`toolbar-end`/`subheader` slots for host
  chrome (filter chips, a "New event" button, etc.) alongside the calendar.

  - **`range-change`** fires with `{ view, start, end, hijriStart, hijriEnd, reason }` — once
    synchronously on connect (`reason: "init"`), then on navigation/view/attribute changes that
    alter the visible range, deduped so an unchanged range never fires twice. The component never
    debounces or coalesces it itself; key your data-fetching by `{start, end}` and let your data
    layer (e.g. TanStack Query's `queryKey` + `keepPreviousData`) coalesce. **Wrapper hosts (React
    via `@spezutil/hijri-calendar-react`, Angular via `@spezutil/hijri-calendar-angular`) always miss
    the connect-time `init` fire** — both wrappers attach their event listeners after
    `connectedCallback` has already run — so read the new `visibleRange` property once on mount for
    the first fetch, then rely on `onRangeChange`/`(rangeChange)` for everything after. See the
    [getting-started guide](https://hatimmnomani.github.io/SpezUtil/calendar/getting-started#fetching-events-for-the-visible-range).
  - New `views` attribute picks which view buttons render and in what order; `toolbar="none"`
    removes the built-in toolbar so a host can drive `view`/`date` itself (e.g. from URL params).
  - New slots `toolbar-start`, `toolbar-end`, `subheader` for host-owned chrome next to the
    built-in toolbar.
  - `--hcal-font-family` is now actually declared on `:host` (it was referenced by internal styles
    but never given a default before — a latent bug, now fixed) and several previously hard-coded
    sizes (`--hcal-cell-min-height`, `--hcal-body-max-height`, `--hcal-button-radius`,
    `--hcal-switch-*`) are now overridable custom properties, all defaulting to their previous
    literal values.

  ### Accepted visual changes (D1–D9)

  Nine small, deliberate visual changes ship across this 0.3.0 release (landing in different phases
  of the same underlying work, plus two post-launch fixes — an accessibility fix and a numerals
  default flip; listed together here for visibility). Only D6, D8 and D9 have configuration escape
  hatches (D8's is a "restore the old, failing look" hatch, not recommended) — the others were each
  judged an improvement, not left as a choice:

  - **D1 — toolbar order** is now `‹ Today ›` (prev / today / next), was `Today ‹ ›`.
    `::part(nav-prev|nav-today|nav-next)` selectors are unaffected.
  - **D2 — time-grid column heads** gain a second `part` token: `part="day column-head"`. Existing
    `::part(day)` selectors keep matching.
  - **D3 — title DOM.** The internal `<small>` inside `.title` is replaced by
    `<span part="title-secondary">`; the old `<small>` had no public part.
  - **D4 — time-grid column-head numeral sizes** shrink from 15px/10px to 14px/9px, because
    `--hcal-day-primary-font-size`/`--hcal-day-secondary-font-size` now drive both the month day
    head and the time-grid column head with one token pair. Restore the old size with
    `--hcal-day-primary-font-size: 15px` (this now also affects month cells, since the token is
    shared).
  - **D5 — event content order.** `event-time` now renders _before_ `event-title` in every
    chip/block/agenda item. Since `event-time` defaults to showing the start time in week/day views,
    this moves the clock text above/before the title in every timed block by default. Use
    `renderEvent` if you need a different order.
  - **D6 — month-grid hairlines.** Month cells now draw a full grid (vertical rules between columns
    and a horizontal rule under every week, `1px solid var(--hcal-grid-line)`), where 0.2.x had a
    rule between weeks only and no vertical rules at all. `hijri-calendar { --hcal-grid-line:
transparent; }` takes the month-cell hairlines back off. See the P2 entry for the details.
  - **D7 — agenda items are `event` parts.** Agenda rows now emit
    `part="agenda-item event <style> <allday|timed>"`, so an existing `::part(event)` rule also
    matches agenda rows. See the P3 entry for the details.
  - **D8 — WCAG 2 AA color-contrast fix.** An accessibility audit found the default theme failing
    color contrast (WCAG 1.4.3) at ~40 element instances in the audited page, traced to our own
    default token values; reduced to the distinct text/background pairs behind them, 20 of the 21
    pairs we then checked in the default theme were failing and all 20 now pass.
    `--hcal-muted` darkens `#9aa0a6` → `#5b6572` (was ≈2.64:1 on `--hcal-bg`, now ≈5.92:1, and
    ≈5.16:1 on the default `--hcal-today-bg` tint, which several `--hcal-muted` consumers also
    render on). `--hcal-now-color` darkens `#ea4335` → `#c5321f` (the `part="now-label"` text was
    ≈3.92:1, now ≈5.45:1). Out-of-month day numbers and the bilingual weekday secondary label no
    longer use `opacity` for de-emphasis — opacity multiplies whatever contrast deficit the
    underlying color already has (the audit measured out-of-month numbers as low as 1.44:1) — and
    instead use a new **`--hcal-cell-out-fg`** token (default `var(--hcal-muted)`) applied as a
    solid color. `hijri-calendar { --hcal-muted: #9aa0a6; --hcal-now-color: #ea4335; }` puts the two
    old **color values** back (reintroducing their AA failures; not recommended). It does **not**
    restore the old out-of-month rendering, and nothing can: `opacity: 0.45` applied over a subtree
    containing two different base colors, so the primary number rendered as an effective `#989898`
    and the secondary as `#d2d4d7`, and one `--hcal-cell-out-fg` token cannot produce two different
    values. Set `--hcal-cell-out-fg` to pick a single out-of-month text color instead. The same goes
    for the `opacity: 0.8` removed from `weekday-secondary` — the opacity-based de-emphasis has no
    restore path. **Deviation:**
    `--hcal-cell-out-opacity` (default `0.45`) stays declared for compatibility but is no longer
    consumed anywhere in `styles.ts` — a host tuning out-of-month dimming via that property should
    switch to `--hcal-cell-out-fg` instead. `--hcal-day-secondary-font-size` stays at its 9px
    default (D4) — not itself a WCAG violation, but worth knowing the contrast fix matters more at
    that size.
  - **D9 — `numerals` now defaults to `"arab"` (post-launch, replacing P1's original `"latn"`
    default).** Hijri day numbers, the Hijri year, the title primary, the agenda Hijri date and the
    day-banner primary now render Arabic-Indic digits with no attribute set. The component's whole
    purpose is displaying Hijri dates, and Latin was the wrong default for that audience — the
    original P1 default-preservation call weighed backward compatibility too heavily.
    `numerals-gregorian` is untouched and keeps its own `"latn"` default, so Gregorian numbers,
    clock digits (time labels, event duration, day-banner counts) and month abbreviations (`Jul`)
    stay Latin — exactly the reference "editorial" pairing, now the default instead of an opt-in.
    Unlike D6/D8, the restore path is an attribute, not a custom property (this is a digit
    _system_, not a color or size token): `numerals="latn"` on the host element fully restores the
    pre-D9, all-Latin look. See the P1 entry above for the full rationale.

  ### Looking ahead to 1.0

  `event-style` defaults to `"solid"` throughout the 0.3.x line — this release is visually inert
  apart from D1–D9 above. **At 1.0, the default becomes `"tinted"`** (a soft tinted background with
  a left accent border). If you depend on the current solid-fill look, start setting
  `event-style="solid"` explicitly now; it already is the default, so this costs nothing today and
  keeps your look unchanged after the 1.0 upgrade.

- 5d1d377: Typography, independent Hijri/Gregorian numeral systems, decoupled name sets, a bilingual weekday
  header, and configurable weekend days.

  - **`@spezutil/hijri-core`**: new `formatNumerals(value, "latn" | "arab")` utility, transliterating
    ASCII digits to Arabic-Indic digits without touching any other character (`"latn"` returns the
    value unchanged — it is an output formatter, not a two-way converter). Shared by every
    numeral-formatting call site in `hijri-calendar`.
  - **`numerals`** (Hijri digits) and **`numerals-gregorian`** (Gregorian digits _and all
    clock-adjacent numbers_ — time labels, event duration, day-banner counts) are independent
    attributes. Neither is decided by `locale`, which continues to control only UI chrome strings
    (toolbar labels, "+N more", etc.). `numerals-gregorian` defaults to `"latn"`, unchanged from
    0.2.x.
  - **D9 (post-launch, replacing this changeset's original `numerals` default) — `numerals` now
    defaults to `"arab"`, not `"latn"`.** Hijri day numbers, the Hijri year, the title primary, the
    agenda Hijri date and the day-banner primary now render **Arabic-Indic digits out of the box**;
    0.3.0 initially shipped `numerals` defaulting to `"latn"` to keep 0.2.x output byte-for-byte
    unchanged, but that weighed backward compatibility too heavily for a component whose entire
    purpose is displaying Hijri dates — Arabic-Indic numerals ended up appearing only where a
    consumer opted in explicitly (the three `Editorial/*` Storybook stories), which is not what
    anyone actually wanted from a Hijri calendar. `numerals-gregorian` is **not** affected by this
    change and keeps its `"latn"` default above, so Gregorian numbers, clock digits (time labels,
    event duration, day-banner counts) and month abbreviations (`Jul`) stay Latin — this combination
    (`numerals="arab"`, `numerals-gregorian="latn"`) is exactly the reference "editorial" pairing,
    now the default instead of an opt-in. If you need the pre-fix, all-Latin look, set
    `numerals="latn"` explicitly on the host element — that one attribute fully restores it.
  - **`names`** selects the Hijri month/weekday _name set_ (`"translit"`/`"ar"`) independently of
    `locale` — set `names="ar"` for genuine Arabic month/weekday names while keeping English toolbar
    labels, or any other combination.
  - **`weekday-format="bilingual"`** renders the `names` weekday above its English abbreviation.
  - **`title-layout="inline"`** puts the Gregorian sub-title after the Hijri title with a separator
    instead of stacked below it (**D3**: the internal `<small>` this replaces is now
    `<span part="title-secondary">`).
  - **`weekend-days`** (default `"0 6"`, i.e. Sat/Sun) marks weekend columns/cells with the
    `weekend` part token and `--hcal-weekend-*` styling; set `weekend-days="5 6"` for a Fri/Sat
    weekend, or `weekend-days=""` to disable weekend styling. Plumbed through new `isWeekend` fields
    on `hijri-view-core`'s `DayCell`/`TimeGridColumn`.
  - New font-family custom properties `--hcal-font-family-display` and `--hcal-font-family-mono`
    (both defaulting to `--hcal-font-family`) round out a four-family type ramp alongside the
    existing `--hcal-font-family-arabic`.

- 5d1d377: Month grid restructure: a real per-cell background layer, configurable day-number alignment,
  month-boundary markers, and a "today" mode that doesn't require a pill.

  - New `part="day-cell"` background layer spans each month-cell's full height (previously only the
    number button had a hit target/background), with `--hcal-cell-padding`, `--hcal-cell-hover-bg`,
    `--hcal-cell-out-bg`/`--hcal-cell-out-opacity`, `--hcal-weekend-bg`/`--hcal-weekend-fg`.
  - **Month-grid ARIA structure (post-launch a11y fix, no visual change).** An axe audit reported a
    Critical `aria-required-children` violation: the week `role="row"` owned the event chips, the
    `part="more-link"` buttons and the `part="day-cell"` layers, none of which is a permitted child
    of a row. The month grid is now `grid` → one `rowgroup` per week → a day `row` of exactly seven
    `gridcell`s (each holding that day's background layer and `part="day"` button) plus, for weeks
    that have events, **one `row` per event lane and one for the more-links**, whose `gridcell`s
    carry the chips — so every event stays a focusable, announced `<button>` (hiding that layer with
    `aria-hidden` would have silenced the audit at the cost of keyboard access). Chip cells report
    the days they cover via `aria-colindex`/`aria-colspan`, against `aria-colcount="7"` on the grid;
    a row per lane is what keeps those indices increasing and non-overlapping within each row, as
    ARIA 1.2 requires. Every row also declares its `aria-rowindex` against `aria-rowcount` on the
    grid, because the number of body rows varies with how many weeks have events. Two consequences
    for hosts: the `part="day"` button no longer carries `role="gridcell"` itself (its wrapper does,
    so the button reports its native `button` role), and in week/day views the weekday label is no
    longer a `role="columnheader"` — those views have no grid/table semantics for a `columnheader`
    to belong to, which was a second Critical violation (`aria-required-parent`). No `::part()`
    name, token, attribute, event or rendered pixel changes: every element's rendered box was
    measured identical in Chromium before and after, at wide/medium/narrow, LTR and RTL.
  - **Fixed: keyboard activation of month-view event chips and "+N more" links.** The month grid's
    arrow-key handler listens on the grid, so keys from the chips and more-link buttons bubbled to
    it; it treated any event that did not originate in a day cell as if the roving day button were
    focused, so `Enter` or `Space` on a focused chip called `preventDefault()` and emitted
    `date-click` for an unrelated day instead of letting the chip's own activation fire
    `event-click`. Chips and more-links were reachable by <kbd>Tab</kbd> and impossible to activate
    by keyboard. The handler now ignores keys that do not come from a day cell, and no longer
    default-prevents keys it does not handle. Day-cell arrow navigation and `Enter`/`Space` are
    unchanged.
  - **`day-number-align`** (`"center"` default, `"start"`, `"end"`) controls day-number alignment in
    month cells and time-grid column heads.
  - **`month-marker`** (`"gregorian"` default, `"hijri"`, `"both"`, `"none"`) controls which
    calendar's first-of-month gets a name marker in day cells/column heads.
  - **`today-marker`** (`"pill"` default, `"dot"`, `"none"`) — a corner dot is now an alternative to
    the accent pill around today's number. `--hcal-today-bg` is now actually wired to the cell/
    column-head background (previously declared but unused).
  - **D6**: the month grid now draws **real grid lines**. `part="day-cell"` carries
    `border-inline-end` and `border-block-end: 1px solid var(--hcal-grid-line)`, and
    `--hcal-grid-line` defaults to `var(--hcal-border)`, so the lines are visible by default. In
    0.2.x the month grid had a horizontal rule _between_ weeks only (none under the last week) and
    no vertical rules whatsoever — so upgrading adds 36 vertical hairlines, plus a horizontal
    hairline under the last week that abuts the calendar's own outer border and reads as a doubled
    bottom edge. The border also moved from `.week` (content-box) to `.day-cell` (border-box), so
    the month body now renders roughly 5px shorter than 0.2.x at the same `--hcal-cell-min-height`.
    `hijri-calendar { --hcal-grid-line: transparent; }` gives a fully borderless grid — not the
    0.2.x look, which still had horizontal rules between weeks (the token drives only
    `part="day-cell"`'s borders — the time-grid slot lines and gutter border are on `--hcal-border`
    and are unaffected). `hijri-calendar::part(day-cell) { border-inline-end: none; }` is the
    closest approximation to 0.2.x: it drops the vertical rules and keeps a horizontal rule under
    every week, including the last one, which 0.2.x didn't have. An exact 0.2.x grid isn't
    reachable through the public API — `.day-cell` carries no per-week token, and `.week` isn't an
    exposed part.
  - **D2**: time-grid column heads gain a second `part` token, `part="day column-head"` (existing
    `::part(day)` selectors are unaffected).
  - **D4**: time-grid column-head numerals shrink from 15px/10px to 14px/9px default size, because
    `--hcal-day-primary-font-size`/`--hcal-day-secondary-font-size` (`14px`/`9px`) now drive both the
    month day head and the time-grid column head. Restore the old time-grid size with
    `--hcal-day-primary-font-size: 15px` (note this now also affects month cells, since the token is
    shared between both).

- 5d1d377: Event model additions and time-grid parity: chip/block style variants, configurable time text,
  duration-derived end times, per-event subtitle/tag/variant, slot granularity, and a themeable
  now-line.

  - **`CalendarEvent`** gains `durationMinutes` (derives `end` for timed events when `end` is
    absent), `subtitle` (second text line, e.g. location), `tag` (short label, e.g. event type),
    `style` (per-event override of `event-style`), and `variant` (a free `/^[a-z0-9-]+$/` token
    exported as `part="event variant-<x>"` + `data-variant`, for `::part()` targeting). `eventFields`
    values may now be **functions** over the raw object, not just field-name strings — for deriving
    a color/style/variant instead of just renaming a field.
  - **`event-style`** (`"solid"` default, `"tinted"`, `"outline"`) controls chip/block rendering;
    `event.style` overrides it per event. **The default stays `"solid"` through 0.3.x and becomes
    `"tinted"` at 1.0** — see below.
  - **`event-time`** (`"auto"` default = none in month / start in week-day, `"none"`, `"start"`,
    `"start-duration"`, `"range"`) controls the time text rendered on chips/blocks.
  - Every chip, block and agenda item now also carries an `allday` or `timed` `part` token (and
    month chips of a multi-day event carry `continues-before`/`continues-after`), so `::part()` can
    tell them apart. `CalendarEvent.tag` is **hook-only**: it reaches you as `ctx.event.tag` in
    `renderEvent` and is never rendered by the built-in renderers.
  - **D7**: agenda rows are now `event` parts —
    `part="agenda-item event <solid|tinted|outline> <allday|timed>"`, where 0.2.x emitted
    `part="agenda-item"` alone. `::part(agenda-item)` rules are unaffected, but an existing
    `::part(event)` rule written for chips/blocks **now also matches agenda rows**, which have a
    different internal layout. The token is what lets `event-style` reach the agenda view, so it
    stays; scope a chips-only rule by view instead —
    `hijri-calendar:not([view="agenda"])::part(event)` — and style the row itself through
    `::part(agenda-item)`. Adding a style token does not narrow the match: `::part(event solid)`
    matches agenda rows too.
  - **D5**: inside every chip/block/agenda item, `event-time` now renders **before**
    `event-title` (`<span part="event-time">…</span><span part="event-title">…</span>`), not after.
    Because `event-time` defaults to showing the start time in week/day views, this changes the
    default look of every timed block — the clock text sits above/before the title. There is no
    attribute to restore the previous order; use `renderEvent` for a fully custom layout.
  - **`slot-minutes`** (`15`/`30`/`60`, default `30`) sets time-grid slot granularity — and also the
    granularity of `slot-click`: at `60`, `detail.gregorian` is always the hour start, never a
    half-hour. This is an accepted trade-off, not a bug.
  - **`allday-row`** (`"always"` default, `"auto"`, `"never"`); **`now-indicator`**
    (`"line"` default, `"line-label"`, `"none"`); **`time-label-position`**
    (`"line"` default, `"cell"`). New now-line custom properties `--hcal-now-color`,
    `--hcal-now-width`, `--hcal-now-dot-size` (previously hard-coded), plus
    `--hcal-gutter-bg`/`-width`, `--hcal-hour-height`, `--hcal-slot-alt-bg`,
    `--hcal-slot-hover-bg`, `--hcal-today-column-bg`, and the full `--hcal-event-*` styling set
    (radius, padding, border width, tint alpha, hover states, inset).

  ### `event-style` will default to `tinted` at 1.0

  This release keeps `event-style="solid"` as the default (visually inert apart from D5 above and
  the other accepted changes in the 0.3.0 CHANGELOG). **At 1.0, the default becomes `"tinted"`.** If
  you depend on the current solid-fill look, set `event-style="solid"` explicitly now — it costs
  nothing today (it's already the default) and keeps working identically after the 1.0 upgrade.

- 5d1d377: Day banner header, render hooks for fully custom content, a loading affordance, and a
  configurable agenda window.

  - **`day-header="banner"`** (day view only) replaces the compact column head with a full-width
    banner: large Hijri date, Gregorian date + weekday, and a computed "N events · X hours
    scheduled" summary (`part="day-banner-summary"`, overridable via `slot="day-summary"`).
    `now-indicator="line-label"` adds a "Now · 13:30" label on the current-time line
    (`part="now-label"`).
  - **`renderEvent`** and **`renderDayCell`** properties let a host fully customize chip/block/
    agenda-item content and day-cell/column-head number content, respectively — the component keeps
    ownership of the wrapping `<button>`, ARIA, focus ring, and click handling; hook output is
    content-only (`Node`, `string`, or `null` for the default). A throwing hook is caught, logged
    once via `console.warn`, and falls back to the default renderer — a hook can never break the
    calendar.
  - **`loading`** boolean attribute sets `aria-busy="true"` on the grid/timegrid/agenda and renders a
    `part="loading"` overlay (`slot="loading"` to replace its default text).
  - **`agenda-days`** (default `30`) replaces the previously hard-coded agenda window length.

- 5d1d377: Responsive layout: the component now measures its own width (not the viewport) and adapts, so it
  behaves correctly inside a sidebar-constrained column as well as a full-width page.

  - A `ResizeObserver` on the host classifies its width into a size band — `wide` (≥900px),
    `medium` (600–899px), `narrow` (<600px) — exposed as a read-only `size` property and a part
    token on `part="calendar"` (e.g. `part="calendar narrow"`). Thresholds are fixed literals,
    exported as `SIZE_BANDS`, since a CSS container query can't read a custom property. Falls back
    to `wide` when `ResizeObserver` is unavailable.
  - At `medium`/`narrow`, the toolbar wraps to two rows, month cells shrink
    (`--hcal-cell-min-height-medium`/`-narrow`), and week/day columns shrink toward
    `--hcal-column-min-width`, scrolling horizontally inside `part="scroll"` once 7 columns no
    longer fit — with the time gutter kept visually pinned in place while the body scrolls under it.
    That pinning is done in JavaScript (`wireStickyGutter()`), not CSS: the shipped
    `position: sticky` rule on the gutter is inert on its own, because the gutter sits inside a box
    whose own vertical `overflow-y: auto` (needed for the unrelated `--hcal-body-max-height` scroll)
    becomes the nearest scrolling ancestor CSS resolves its horizontal sticky inset against.
  - **`narrow-events`** (`"dots"` default, `"scroll"`) controls month view at the `narrow` band:
    collapse event chips to non-interactive colored dots (tap the cell for `date-click`; new
    `--hcal-event-dot-size`), or keep the desktop chip layout and scroll horizontally.
  - The host element never causes page-level horizontal overflow — `:host { max-width: 100%; }` and
    every scrollable region lives inside `part="scroll"`.

### Patch Changes

- Updated dependencies [5d1d377]
- Updated dependencies [5d1d377]
  - @spezutil/hijri-core@0.2.0
  - @spezutil/hijri-view-core@0.2.0

## 0.2.2

### Patch Changes

- Add `eventFields` mapping so hosts whose event objects use different field names (e.g. `start_at` instead of `start`) don't need to pre-map their data by hand — `<hijri-calendar>` does the renaming itself, and the original object is still passed through as `event.data`. Also fixes a silent-failure trap: an event with a missing or unparseable `start` now emits a `console.warn` (once per event) instead of just vanishing with no error.
- Updated dependencies
  - @spezutil/hijri-view-core@0.1.4

## 0.2.1

### Patch Changes

- Fix "today"/"now" resolving against UTC instead of the viewer's local timezone, which could highlight the wrong day, jump the Today button to the wrong day, and misplace the current-time indicator near local midnight. `<hijri-calendar>` and `<hijri-datepicker>` now default to the viewer's local timezone and accept an optional `timezone` attribute/property (IANA name) to pin resolution to a fixed zone. Also fixes event date strings carrying an explicit UTC offset/`Z` suffix being misparsed as bare wall-clock values.
- Updated dependencies
  - @spezutil/hijri-core@0.1.3
  - @spezutil/hijri-view-core@0.1.3

## 0.2.0

### Minor Changes

- 0534a7a: Replace the embedded Al-Kanz Arabic font with Amiri (SIL Open Font License 1.1).

  Al-Kanz was removed because no redistribution license exists for it. Amiri is
  OFL-1.1 licensed, which permits embedding and redistribution; the license text
  ships in the repository at `assets/fonts/OFL-Amiri.txt`.

  The default value of the Arabic font CSS custom properties
  (`--hcal-font-family-arabic`, `--dtp-font-family-arabic`,
  `--rte-font-family-arabic`, `--rte-font-family`) changes from `"Al-Kanz", …` to
  `"Amiri", …`. Consumers who relied on the embedded Al-Kanz should load their own
  licensed copy and override the custom property.

## 0.1.3

### Patch Changes

- Regenerate the embedded Al-Kanz font module with typed exports for smaller declaration output.
