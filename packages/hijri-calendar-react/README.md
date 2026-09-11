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

All element attributes are available as props — including the events-parity API (`views`, `titleLayout`, `names`, `numerals`, `numeralsGregorian`, `weekdayFormat`, `weekendDays`, `dayNumberAlign`, `monthMarker`, `todayMarker`, `eventStyle`, `eventTime`, `slotMinutes`, `alldayRow`, `nowIndicator`, `timeLabelPosition`, `dayHeader`, `agendaDays`, `loading`, `narrowEvents`, `renderEvent`, `renderDayCell`; see the [full reference](https://hatimmnomani.github.io/SpezUtil/calendar/api)) — and the seven CustomEvents map to typed callbacks (`onEventClick`, `onDateClick`, `onSlotClick`, `onMoreClick`, `onViewChange`, `onDateChange`, `onRangeChange`).

`onRangeChange` fires on every visible-range change **after mount**, but misses the connect-time
`init` fire — `@lit/react`'s `createComponent` attaches listeners in a `useLayoutEffect` that runs
after the custom element's `connectedCallback` (and its synchronous first `range-change`) has
already completed. Read the element's `visibleRange` property once, e.g. via a `ref`, for the
initial fetch; see [Fetching events for the visible range](https://hatimmnomani.github.io/SpezUtil/calendar/getting-started#fetching-events-for-the-visible-range) for the full pattern.

## Docs

https://hatimmnomani.github.io/SpezUtil/

## License

Apache-2.0
