---
"@spezutil/hijri-calendar": minor
---

Month grid restructure: a real per-cell background layer, configurable day-number alignment,
month-boundary markers, and a "today" mode that doesn't require a pill.

- New `part="day-cell"` background layer spans each month-cell's full height (previously only the
  number button had a hit target/background), with `--hcal-cell-padding`, `--hcal-cell-hover-bg`,
  `--hcal-cell-out-bg`/`--hcal-cell-out-opacity`, `--hcal-weekend-bg`/`--hcal-weekend-fg`.
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
  0.2.x the month grid had a horizontal rule *between* weeks only (none under the last week) and
  no vertical rules whatsoever — so upgrading adds 36 vertical hairlines, plus a horizontal
  hairline under the last week that abuts the calendar's own outer border and reads as a doubled
  bottom edge. Restore the borderless look with `hijri-calendar { --hcal-grid-line: transparent; }`
  (the token drives only `part="day-cell"`'s borders — the time-grid slot lines and gutter border
  are on `--hcal-border` and are unaffected); to keep the new grid but drop only the doubled
  bottom edge, use `hijri-calendar::part(day-cell) { border-block-end: none; }`.
- **D2**: time-grid column heads gain a second `part` token, `part="day column-head"` (existing
  `::part(day)` selectors are unaffected).
- **D4**: time-grid column-head numerals shrink from 15px/10px to 14px/9px default size, because
  `--hcal-day-primary-font-size`/`--hcal-day-secondary-font-size` (`14px`/`9px`) now drive both the
  month day head and the time-grid column head. Restore the old time-grid size with
  `--hcal-day-primary-font-size: 15px` (note this now also affects month cells, since the token is
  shared between both).
