---
"@spezutil/hijri-view-core": minor
"@spezutil/hijri-calendar": minor
"@spezutil/hijri-calendar-react": patch
"@spezutil/hijri-calendar-angular": minor
---

Add `month-grid="hijri" | "gregorian"` (`monthGrid`) to `<hijri-calendar>` and the matching `anchor` option on `buildMonthModel` / `buildCalendarMonthModel`. With `gregorian` the month view is framed around the Gregorian month containing `date` (grid, out-of-month cells, prev/next stepping) while every cell keeps its Hijri date and numerals; the title becomes the Hijri month range the Gregorian month spans. Default stays `hijri`, so existing consumers are unchanged.
