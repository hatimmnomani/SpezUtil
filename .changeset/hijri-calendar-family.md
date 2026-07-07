---
"@spezutil/hijri-view-core": minor
"@spezutil/hijri-calendar": minor
"@spezutil/hijri-calendar-react": minor
"@spezutil/hijri-calendar-angular": minor
"@spezutil/hijri-core": minor
"@spezutil/hijri-datepicker": minor
"@spezutil/hijri-datepicker-angular": minor
---

New Hijri calendar view component family.

- `@spezutil/hijri-calendar`: `<hijri-calendar>` Web Component — Hijri-first month/week/day/agenda views, controlled `events` data with `event-click`/`date-click`/`slot-click`/`more-click`/`view-change`/`date-change` events, `--hcal-*` CSS custom properties + parts, per-event colors, `locale="translit|ar"`, RTL, keyboard-navigable month grid, current-time indicator.
- `@spezutil/hijri-calendar-react`, `@spezutil/hijri-calendar-angular`: framework wrappers.
- `@spezutil/hijri-view-core`: new shared pure view-model package (month grid, event normalization, month event lanes/overflow, time-grid overlap packing, agenda grouping).
- `@spezutil/hijri-core`: adds `arWeekdayNames` export.
- `@spezutil/hijri-datepicker`: month-grid model now re-exported from `@spezutil/hijri-view-core`; new `primary="hijri|gregorian"` and `secondary-position="end|start|above|below|hidden"` attributes; the first of each Gregorian month is labelled with its abbreviated name ("1 Apr"); new `day-primary`/`day-secondary` parts.
- Both components: `primary`/`secondary-position` control which day numeral (Hijri or Gregorian) is prominent and where the secondary sits.
