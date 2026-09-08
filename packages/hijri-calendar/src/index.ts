import { HijriCalendarElement } from "./hijri-calendar";

export { HijriCalendarElement, SIZE_BANDS } from "./hijri-calendar";
export type {
  CalendarView,
  SecondaryPosition,
  EventStyle,
  EventTimeMode,
  SlotMinutes,
  AlldayRowMode,
  NowIndicatorMode,
  TimeLabelPosition,
  DayHeaderMode,
  SizeBand,
  NarrowEventsMode,
  RenderEventContext,
  RenderEventHook,
  RenderDayCellContext,
  RenderDayCellHook,
  EventClickDetail,
  DateClickDetail,
  SlotClickDetail,
  MoreClickDetail,
  ViewChangeDetail,
  DateChangeDetail,
  RangeChangeDetail,
} from "./hijri-calendar";
export type {
  CalendarEvent,
  EventFieldMap,
  EventFieldSource,
  HijriDate,
} from "@spezutil/hijri-view-core";

if (typeof customElements !== "undefined" && !customElements.get("hijri-calendar")) {
  customElements.define("hijri-calendar", HijriCalendarElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "hijri-calendar": HijriCalendarElement;
  }
}
