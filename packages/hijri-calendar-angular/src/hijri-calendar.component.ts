import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import "@spezutil/hijri-calendar";
import type {
  CalendarEvent,
  CalendarView,
  DateChangeDetail,
  DateClickDetail,
  EventClickDetail,
  MoreClickDetail,
  SlotClickDetail,
  ViewChangeDetail,
} from "@spezutil/hijri-calendar";

@Component({
  selector: "hijri-calendar-ng",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <hijri-calendar
      [view]="view"
      [date]="date"
      [locale]="locale"
      [dir]="dir"
      [weekStart]="weekStart"
      [dayStart]="dayStart"
      [dayEnd]="dayEnd"
      [timeFormat]="timeFormat"
      [maxEvents]="maxEvents"
      [primary]="primary"
      [secondaryPosition]="secondaryPosition"
      [events]="events"
      (event-click)="onEventClick($event)"
      (date-click)="onDateClick($event)"
      (slot-click)="onSlotClick($event)"
      (more-click)="onMoreClick($event)"
      (view-change)="onViewChange($event)"
      (date-change)="onDateChange($event)"
    ></hijri-calendar>
  `,
})
export class HijriCalendarComponent {
  @Input() view: CalendarView = "month";
  @Input() date: string | null = null;
  @Input() locale: string | null = null;
  @Input() dir: string | null = null;
  @Input() weekStart = 0;
  @Input() dayStart = 0;
  @Input() dayEnd = 24;
  @Input() timeFormat: string | null = null;
  @Input() maxEvents = 3;
  @Input() primary: "hijri" | "gregorian" = "hijri";
  @Input() secondaryPosition = "end";
  @Input() events: CalendarEvent[] = [];

  @Output() eventClick = new EventEmitter<EventClickDetail>();
  @Output() dateClick = new EventEmitter<DateClickDetail>();
  @Output() slotClick = new EventEmitter<SlotClickDetail>();
  @Output() moreClick = new EventEmitter<MoreClickDetail>();
  @Output() viewChange = new EventEmitter<ViewChangeDetail>();
  @Output() dateChange = new EventEmitter<DateChangeDetail>();

  onEventClick(event: Event): void {
    this.eventClick.emit((event as CustomEvent<EventClickDetail>).detail);
  }
  onDateClick(event: Event): void {
    this.dateClick.emit((event as CustomEvent<DateClickDetail>).detail);
  }
  onSlotClick(event: Event): void {
    this.slotClick.emit((event as CustomEvent<SlotClickDetail>).detail);
  }
  onMoreClick(event: Event): void {
    this.moreClick.emit((event as CustomEvent<MoreClickDetail>).detail);
  }
  onViewChange(event: Event): void {
    this.viewChange.emit((event as CustomEvent<ViewChangeDetail>).detail);
  }
  onDateChange(event: Event): void {
    this.dateChange.emit((event as CustomEvent<DateChangeDetail>).detail);
  }
}
