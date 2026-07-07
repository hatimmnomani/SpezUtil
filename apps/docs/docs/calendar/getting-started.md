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
