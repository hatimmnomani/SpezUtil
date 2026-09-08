---
"@spezutil/hijri-calendar": minor
---

Responsive layout: the component now measures its own width (not the viewport) and adapts, so it
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
