---
"@spezutil/hijri-view-core": minor
"@spezutil/hijri-calendar": minor
---

Event model additions and time-grid parity: chip/block style variants, configurable time text,
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
