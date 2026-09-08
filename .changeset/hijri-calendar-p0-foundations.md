---
"@spezutil/hijri-calendar": minor
"@spezutil/hijri-calendar-react": minor
"@spezutil/hijri-calendar-angular": minor
---

Foundations for the events-parity API: a `range-change` event so hosts can fetch data for the
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

### Accepted visual changes (D1–D5)

Five small, deliberate visual changes ship across this 0.3.0 release (landing in different phases
of the same underlying work; listed together here for visibility). None have a configuration
escape hatch — each was judged an improvement, not left as a choice:

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
- **D5 — event content order.** `event-time` now renders *before* `event-title` in every
  chip/block/agenda item. Since `event-time` defaults to showing the start time in week/day views,
  this moves the clock text above/before the title in every timed block by default. Use
  `renderEvent` if you need a different order.

### Looking ahead to 1.0

`event-style` defaults to `"solid"` throughout the 0.3.x line — this release is visually inert
apart from D1–D5 above. **At 1.0, the default becomes `"tinted"`** (a soft tinted background with
a left accent border). If you depend on the current solid-fill look, start setting
`event-style="solid"` explicitly now; it already is the default, so this costs nothing today and
keeps your look unchanged after the 1.0 upgrade.
