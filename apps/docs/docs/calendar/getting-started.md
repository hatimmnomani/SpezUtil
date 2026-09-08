---
title: Getting started
---

# Getting started

`<hijri-calendar>` is a Hijri-first interactive calendar view: month, week, day and agenda views, with Gregorian dates shown as the secondary label. You pass events in; the component fires events back when the user interacts (controlled data flow — the host app owns the data).

All dates on the wire are **Gregorian ISO strings** (`yyyy-mm-dd` or `yyyy-mm-ddTHH:mm`); Hijri dates are derived for display and included in every event detail. Days are mapped at **UTC midnight** — the tabular calendar does not model sunset-based day starts.

## Vanilla JS

```html
<script type="module">
  import "@spezutil/hijri-calendar";
</script>

<hijri-calendar view="month" date="2026-07-06"></hijri-calendar>

<script>
  const cal = document.querySelector("hijri-calendar");
  cal.events = [
    { id: "1", title: "Design review", start: "2026-07-06T10:00", end: "2026-07-06T11:30", color: "#1a73e8" },
    { id: "2", title: "Conference", start: "2026-07-08", end: "2026-07-10" }, // all-day, end inclusive
  ];
  cal.addEventListener("event-click", (e) => {
    console.log(e.detail); // { event, hijri, gregorian }
  });
  cal.addEventListener("slot-click", (e) => {
    // user clicked an empty time slot — e.g. open your "create meeting" dialog
    console.log(e.detail.gregorian); // "2026-07-06T09:30"
  });
</script>
```

## React

```tsx
import { HijriCalendar, type CalendarEvent } from "@spezutil/hijri-calendar-react";

export function Example() {
  const events: CalendarEvent[] = [
    { id: "1", title: "Standup", start: "2026-07-06T09:30", color: "#0b7d3e" },
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

## Angular

```ts
import { Component } from "@angular/core";
import { HijriCalendarComponent, type EventClickDetail } from "@spezutil/hijri-calendar-angular";

@Component({
  standalone: true,
  imports: [HijriCalendarComponent],
  template: `<hijri-calendar-ng
    view="month"
    date="2026-07-06"
    [events]="events"
    (eventClick)="onEventClick($event)"
  ></hijri-calendar-ng>`,
})
export class ExampleComponent {
  events = [{ id: "1", title: "Majlis", start: "2026-07-09T18:00" }];
  onEventClick(detail: EventClickDetail) {
    console.log(detail);
  }
}
```

See [Recipes](/calendar/recipes) for live demos and the [API reference](/calendar/api).

## Fetching events for the visible range

`<hijri-calendar>` doesn't know your data source — it tells you what date range is on screen via
the `range-change` event (full contract: [API reference](/calendar/api#range-change-contract)),
and you fetch for it. This replaces the common anti-pattern of fetching an unfiltered/paginated
list and hoping it covers the visible month.

```html
<hijri-calendar id="cal"></hijri-calendar>

<script type="module">
  import "@spezutil/hijri-calendar";

  const cal = document.getElementById("cal");
  cal.addEventListener("range-change", (e) => {
    const { start, end } = e.detail; // "yyyy-mm-dd", end exclusive
    fetchEvents(start, end).then((events) => (cal.events = events));
  });
</script>
```

Because the listener above is attached **after** the element exists but the component fires its
first `range-change` (`reason: "init"`) synchronously inside `connectedCallback()`, a listener
added after `appendChild` — which is exactly what happens here — misses that first event. Read
`cal.visibleRange` once up front to catch up, then let the listener handle everything after:

```js
const initial = cal.visibleRange; // same shape as a range-change detail, or null pre-render
if (initial) fetchEvents(initial.start, initial.end).then((events) => (cal.events = events));
cal.addEventListener("range-change", (e) => {
  const { start, end } = e.detail;
  fetchEvents(start, end).then((events) => (cal.events = events));
});
```

### React / Angular: the same caveat applies on mount, not just to "late" vanilla listeners

It's tempting to assume `onRangeChange`/`(rangeChange)` alone is enough in a wrapper, since the
JSX/template looks like it wires the listener before the element exists. It doesn't work that way
in practice: `@lit/react`'s `createComponent` (which `@spezutil/hijri-calendar-react` uses)
attaches DOM event listeners inside a `useLayoutEffect`, and React only runs that **after** the
ref callback fires post-commit — strictly after the custom element's `connectedCallback` (and
therefore its synchronous `init` `range-change`) has already run. The Angular wrapper's
`(range-change)` binding has the same timing. So **every** wrapper host misses the connect-time
`init` event exactly like a vanilla host whose listener is added after `appendChild` — read
`visibleRange` on mount for the first fetch, and use `onRangeChange`/`rangeChange` only for
everything that happens afterward (navigation, view switches, `date`/`view` changes):

```tsx
import { useEffect, useRef, useState } from "react";
import { HijriCalendar, type CalendarEvent, type RangeChangeDetail } from "@spezutil/hijri-calendar-react";

export function EventsCalendar() {
  const ref = useRef<InstanceType<typeof HijriCalendar>>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const fetchRange = (range: RangeChangeDetail) => {
    fetchEvents(range.start, range.end).then(setEvents);
  };

  useEffect(() => {
    // Catches the connect-time "init" range that onRangeChange below will never see.
    const initial = ref.current?.visibleRange;
    if (initial) fetchRange(initial);
  }, []);

  return (
    <HijriCalendar
      ref={ref}
      view="month"
      events={events}
      onRangeChange={(e) => fetchRange(e.detail)}
    />
  );
}
```

The Angular equivalent reads `@ViewChild(HijriCalendarComponent)`'s underlying element's
`visibleRange` in `ngAfterViewInit`, then relies on `(rangeChange)` for everything after.

### Coalescing rapid navigation

The component does not debounce or coalesce `range-change` — rapid prev/next emits one event per
click, by design (see the contract's determinism clause). Let your data layer coalesce instead;
with TanStack Query, key the query by the range and use `keepPreviousData` so duplicate/overlapping
requests for the same range are deduped and the grid never flashes empty while refetching:

```ts
function useEventsInRange(range: { start: string; end: string } | null) {
  return useQuery({
    queryKey: ["events", "range", range?.start ?? null, range?.end ?? null],
    queryFn: () => fetchEvents(range!.start, range!.end),
    enabled: !!range,
    placeholderData: keepPreviousData,
  });
}
```
