# @spezutil/hijri-calendar-angular

Angular wrapper for [`@spezutil/hijri-calendar`](https://www.npmjs.com/package/@spezutil/hijri-calendar) — the Hijri-first interactive calendar view Web Component (month, week, day, agenda). Standalone component, Angular >= 17.

## Install

```sh
npm install @spezutil/hijri-calendar-angular @spezutil/hijri-calendar
```

## Usage

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
    (slotClick)="onSlotClick($event)"
  ></hijri-calendar-ng>`,
})
export class ExampleComponent {
  events = [{ id: "1", title: "Majlis", start: "2026-07-09T18:00" }];
  onEventClick(detail: EventClickDetail) {
    console.log(detail);
  }
  onSlotClick(detail: { gregorian: string }) {
    console.log(detail.gregorian);
  }
}
```

Inputs mirror the element attributes/properties (`view`, `date`, `locale`, `dir`, `weekStart`, `dayStart`, `dayEnd`, `timeFormat`, `maxEvents`, `primary`, `secondaryPosition`, `timezone`, `events`, `eventFields`) plus the full events-parity API (`views`, `toolbar`, `titleLayout`, `names`, `numerals`, `numeralsGregorian`, `weekdayFormat`, `weekendDays`, `dayNumberAlign`, `monthMarker`, `todayMarker`, `eventStyle`, `eventTime`, `slotMinutes`, `alldayRow`, `nowIndicator`, `timeLabelPosition`, `dayHeader`, `agendaDays`, `loading`, `narrowEvents`, `renderEvent`, `renderDayCell`; see the [full reference](https://hatimmnomani.github.io/SpezUtil/calendar/api)); outputs emit the typed details (`eventClick`, `dateClick`, `slotClick`, `moreClick`, `viewChange`, `dateChange`, `rangeChange`). Slots `toolbar-start`, `toolbar-end`, and `subheader` are exposed via `<ng-content select="[slot=...]">` inside `<hijri-calendar-ng>`.

`(rangeChange)` fires on every visible-range change **after** the component initializes, but
misses the connect-time `init` fire the same way the React wrapper does — read the underlying
element's `visibleRange` property (e.g. via `@ViewChild` in `ngAfterViewInit`) for the initial
fetch. See [Fetching events for the visible range](https://hatimmnomani.github.io/SpezUtil/calendar/getting-started#fetching-events-for-the-visible-range).

## Docs

https://hatimmnomani.github.io/SpezUtil/

## License

Apache-2.0
