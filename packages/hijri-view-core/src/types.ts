/** Calendar event as supplied by the host application. Dates are Gregorian ISO strings. */
export interface CalendarEvent {
  id: string;
  title: string;
  /** "yyyy-mm-dd" (all-day) or "yyyy-mm-ddTHH:mm" (timed). */
  start: string;
  /** Exclusive for timed events, inclusive date for all-day. Defaults: +1h timed, same day all-day. */
  end?: string;
  allDay?: boolean;
  /** CSS color used as the event chip background. */
  color?: string;
  /** Opaque host payload, passed back in interaction event details. */
  data?: unknown;
}

/** Event with resolved UTC millisecond bounds; endMs is always exclusive. */
export interface NormalizedEvent {
  event: CalendarEvent;
  startMs: number;
  endMs: number;
  allDay: boolean;
}
