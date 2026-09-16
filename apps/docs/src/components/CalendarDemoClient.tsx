import React, { useState } from "react";
import {
  HijriCalendar,
  type CalendarEvent,
  type RenderEventContext,
  type RenderDayCellContext,
} from "@spezutil/hijri-calendar-react";

export interface CalendarDemoProps {
  view?: string;
  date?: string;
  locale?: string;
  dir?: string;
  weekStart?: number;
  dayStart?: number;
  dayEnd?: number;
  timeFormat?: string;
  maxEvents?: number;
  events?: CalendarEvent[];
  // Events-parity API (Phase 0-5) — all optional, all default to today's behaviour.
  titleLayout?: string;
  names?: string;
  numerals?: string;
  numeralsGregorian?: string;
  weekdayFormat?: string;
  weekendDays?: string;
  dayNumberAlign?: string;
  monthMarker?: string;
  todayMarker?: string;
  eventStyle?: string;
  eventTime?: string;
  slotMinutes?: number;
  alldayRow?: string;
  nowIndicator?: string;
  timeLabelPosition?: string;
  dayHeader?: string;
  agendaDays?: number;
  loading?: boolean;
  narrowEvents?: string;
  toolbar?: string;
  views?: string;
  renderEvent?: (ctx: RenderEventContext) => Node | string | null;
  renderDayCell?: (ctx: RenderDayCellContext) => Node | string | null;
  /** Demo-only: wraps the calendar in a fixed-width host div (recipes use this to show the `narrow`/`medium` size bands without resizing the browser). */
  hostWidth?: number;
  /** Demo-only: extra inline styles (typically `--hcal-*` custom properties) on the wrapping host div — recipes use this for theming without a separate `<style>` block. */
  hostStyle?: React.CSSProperties;
}

const defaultEvents: CalendarEvent[] = [
  { id: "1", title: "Standup", start: "2026-07-06T09:30", end: "2026-07-06T09:45", color: "#0b7d3e" },
  { id: "2", title: "Design review", start: "2026-07-06T10:00", end: "2026-07-06T11:30", color: "#1a73e8" },
  { id: "3", title: "Lunch with Ali", start: "2026-07-06T12:30", end: "2026-07-06T13:30", color: "#f9ab00" },
  { id: "4", title: "Sprint planning", start: "2026-07-07T14:00", end: "2026-07-07T16:00", color: "#1a73e8" },
  { id: "5", title: "Conference", start: "2026-07-08", end: "2026-07-10", color: "#9334e6" },
  { id: "6", title: "Majlis", start: "2026-07-09T18:00", end: "2026-07-09T20:00", color: "#0b7d3e" },
  { id: "7", title: "Urs", start: "2026-07-15", color: "#9334e6" },
];

export default function CalendarDemoClient(props: CalendarDemoProps): JSX.Element {
  const [out, setOut] = useState("(interact with the calendar)");
  const log = (label: string) => (e: Event) =>
    setOut(`${label}: ${JSON.stringify((e as CustomEvent).detail)}`);
  const { events, hostWidth, hostStyle, ...rest } = props;
  const wrapperStyle: React.CSSProperties = {
    ...(hostWidth ? { width: hostWidth, maxWidth: "100%" } : undefined),
    ...hostStyle,
  };
  return (
    <div className="hijri-demo">
      <div style={wrapperStyle}>
        <HijriCalendar
          {...rest}
          events={events ?? defaultEvents}
          onEventClick={log("event-click")}
          onDateClick={log("date-click")}
          onSlotClick={log("slot-click")}
          onMoreClick={log("more-click")}
          onViewChange={log("view-change")}
          onDateChange={log("date-change")}
          onRangeChange={log("range-change")}
        />
      </div>
      <pre style={{ marginTop: 8 }}>{out}</pre>
    </div>
  );
}
