import * as React from "react";
import { createComponent, type EventName } from "@lit/react";
import {
  HijriCalendarElement,
  type EventClickDetail,
  type DateClickDetail,
  type SlotClickDetail,
  type MoreClickDetail,
  type ViewChangeDetail,
  type DateChangeDetail,
  type RangeChangeDetail,
} from "@spezutil/hijri-calendar";

export const HijriCalendar = createComponent({
  tagName: "hijri-calendar",
  elementClass: HijriCalendarElement,
  react: React,
  events: {
    onEventClick: "event-click" as EventName<CustomEvent<EventClickDetail>>,
    onDateClick: "date-click" as EventName<CustomEvent<DateClickDetail>>,
    onSlotClick: "slot-click" as EventName<CustomEvent<SlotClickDetail>>,
    onMoreClick: "more-click" as EventName<CustomEvent<MoreClickDetail>>,
    onViewChange: "view-change" as EventName<CustomEvent<ViewChangeDetail>>,
    onDateChange: "date-change" as EventName<CustomEvent<DateChangeDetail>>,
    onRangeChange: "range-change" as EventName<CustomEvent<RangeChangeDetail>>,
  },
});

export type {
  CalendarEvent,
  CalendarView,
  EventFieldSource,
  EventClickDetail,
  DateClickDetail,
  SlotClickDetail,
  MoreClickDetail,
  ViewChangeDetail,
  DateChangeDetail,
  RangeChangeDetail,
  RenderEventContext,
  RenderDayCellContext,
  HijriDate,
} from "@spezutil/hijri-calendar";
