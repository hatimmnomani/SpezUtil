# @spezutil/hijri-calendar-angular

## 0.2.0

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

## 0.1.5

### Patch Changes

- Add `eventFields` mapping so hosts whose event objects use different field names (e.g. `start_at` instead of `start`) don't need to pre-map their data by hand — `<hijri-calendar>` does the renaming itself, and the original object is still passed through as `event.data`. Also fixes a silent-failure trap: an event with a missing or unparseable `start` now emits a `console.warn` (once per event) instead of just vanishing with no error.

## 0.1.4

### Patch Changes

- Fix "today"/"now" resolving against UTC instead of the viewer's local timezone, which could highlight the wrong day, jump the Today button to the wrong day, and misplace the current-time indicator near local midnight. `<hijri-calendar>` and `<hijri-datepicker>` now default to the viewer's local timezone and accept an optional `timezone` attribute/property (IANA name) to pin resolution to a fixed zone. Also fixes event date strings carrying an explicit UTC offset/`Z` suffix being misparsed as bare wall-clock values.

## 0.1.3

### Patch Changes

- Widen the Web Component peer dependency range to `>=0.1.0 <2.0.0` so the
  wrapper installs cleanly alongside 0.2.x (and later 0.x) component releases.
