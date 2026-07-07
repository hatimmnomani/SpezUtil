# @spezutil/hijri-view-core

Pure, DOM-free view-model builders for Hijri calendar UIs. Powers `@spezutil/hijri-datepicker` and `@spezutil/hijri-calendar`; use it directly to build your own Hijri calendar UI in any framework.

## Install

```sh
npm install @spezutil/hijri-view-core @spezutil/hijri-core
```

## What's inside

```ts
import {
  buildMonthModel,          // 6x7 Hijri month grid (selection/range/today/disabled flags, weekStart)
  buildCalendarMonthModel,  // month grid + event lane layout (multi-day segments, overflow counts)
  buildTimeGridModel,       // week/day time grid (all-day rows, overlap column packing)
  buildAgendaModel,         // events grouped by day, Hijri-labelled
  normalizeEvent,           // CalendarEvent -> UTC ms bounds (all-day/timed rules)
  eventsInRange,
} from "@spezutil/hijri-view-core";
```

Events use Gregorian ISO strings on the wire (`"2026-07-06"` or `"2026-07-06T10:00"`); Hijri dates are derived via `@spezutil/hijri-core`. Everything is pure functions over plain data — trivially testable, framework-agnostic.

## Docs

https://hatimmnomani.github.io/SpezUtil/

## License

Apache-2.0
