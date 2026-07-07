# @spezutil/hijri-calendar-react

React wrapper for [`@spezutil/hijri-calendar`](https://www.npmjs.com/package/@spezutil/hijri-calendar) — the Hijri-first interactive calendar view Web Component (month, week, day, agenda).

## Install

```sh
npm install @spezutil/hijri-calendar-react
```

Requires `react` / `react-dom` >= 18.

## Usage

```tsx
import { HijriCalendar, type CalendarEvent } from "@spezutil/hijri-calendar-react";

export function Example() {
  const events: CalendarEvent[] = [
    { id: "1", title: "Standup", start: "2026-07-06T09:30", color: "#0b7d3e" },
    { id: "2", title: "Conference", start: "2026-07-08", end: "2026-07-10" },
  ];
  return (
    <HijriCalendar
      view="week"
      date="2026-07-06"
      events={events}
      onEventClick={(e) => console.log(e.detail.event)}
      onSlotClick={(e) => console.log(e.detail.gregorian)}
    />
  );
}
```

All element attributes are available as props; the six CustomEvents map to typed callbacks (`onEventClick`, `onDateClick`, `onSlotClick`, `onMoreClick`, `onViewChange`, `onDateChange`).

## Docs

https://hatimmnomani.github.io/SpezUtil/

## License

Apache-2.0
