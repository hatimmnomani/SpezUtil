# @spezutil/hijri-view-core

## 0.2.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [5d1d377]
  - @spezutil/hijri-core@0.2.0

## 0.1.4

### Patch Changes

- Add `eventFields` mapping so hosts whose event objects use different field names (e.g. `start_at` instead of `start`) don't need to pre-map their data by hand — `<hijri-calendar>` does the renaming itself, and the original object is still passed through as `event.data`. Also fixes a silent-failure trap: an event with a missing or unparseable `start` now emits a `console.warn` (once per event) instead of just vanishing with no error.

## 0.1.3

### Patch Changes

- Fix "today"/"now" resolving against UTC instead of the viewer's local timezone, which could highlight the wrong day, jump the Today button to the wrong day, and misplace the current-time indicator near local midnight. `<hijri-calendar>` and `<hijri-datepicker>` now default to the viewer's local timezone and accept an optional `timezone` attribute/property (IANA name) to pin resolution to a fixed zone. Also fixes event date strings carrying an explicit UTC offset/`Z` suffix being misparsed as bare wall-clock values.
- Updated dependencies
  - @spezutil/hijri-core@0.1.3
