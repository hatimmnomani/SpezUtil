---
"@spezutil/hijri-calendar": minor
---

Day banner header, render hooks for fully custom content, a loading affordance, and a
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
