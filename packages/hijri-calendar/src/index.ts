import { HijriCalendarElement } from "./hijri-calendar";

export { HijriCalendarElement } from "./hijri-calendar";
export type {
  CalendarView,
  SecondaryPosition,
  EventClickDetail,
  DateClickDetail,
  SlotClickDetail,
  MoreClickDetail,
  ViewChangeDetail,
  DateChangeDetail,
} from "./hijri-calendar";
export type {
  CalendarEvent,
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
