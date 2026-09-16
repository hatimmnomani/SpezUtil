# @spezutil/hijri-core

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

## 0.1.3

### Patch Changes

- Fix "today"/"now" resolving against UTC instead of the viewer's local timezone, which could highlight the wrong day, jump the Today button to the wrong day, and misplace the current-time indicator near local midnight. `<hijri-calendar>` and `<hijri-datepicker>` now default to the viewer's local timezone and accept an optional `timezone` attribute/property (IANA name) to pin resolution to a fixed zone. Also fixes event date strings carrying an explicit UTC offset/`Z` suffix being misparsed as bare wall-clock values.

## 0.1.0

### Minor Changes

- Initial public release: zero-dependency Hijri (Fatimid/Bohra Misri) calendar engine, the
  `<hijri-datepicker>` Web Component (single/range/multiple selection + single-mode time picker), and
  React + Angular wrappers.
