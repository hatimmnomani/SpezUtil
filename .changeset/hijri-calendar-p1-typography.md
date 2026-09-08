---
"@spezutil/hijri-core": minor
"@spezutil/hijri-view-core": minor
"@spezutil/hijri-calendar": minor
---

Typography, independent Hijri/Gregorian numeral systems, decoupled name sets, a bilingual weekday
header, and configurable weekend days.

- **`@spezutil/hijri-core`**: new `formatNumerals(value, "latn" | "arab")` utility, transliterating
  ASCII digits to Arabic-Indic digits (and back) without touching any other character. Shared by
  every numeral-formatting call site in `hijri-calendar`.
- **`numerals`** (Hijri digits) and **`numerals-gregorian`** (Gregorian digits *and all
  clock-adjacent numbers* — time labels, event duration, day-banner counts) are independent
  attributes, both defaulting to `"latn"` so existing output is unchanged. Neither is decided by
  `locale`, which continues to control only UI chrome strings (toolbar labels, "+N more", etc.).
- **`names`** selects the Hijri month/weekday *name set* (`"translit"`/`"ar"`) independently of
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
