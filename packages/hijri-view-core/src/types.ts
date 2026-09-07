/** Calendar event as supplied by the host application. Dates are Gregorian ISO strings. */
export interface CalendarEvent {
  id: string;
  title: string;
  /** "yyyy-mm-dd" (all-day) or "yyyy-mm-ddTHH:mm" (timed). */
  start: string;
  /** Exclusive for timed events, inclusive date for all-day. Defaults: +1h timed, same day all-day. */
  end?: string;
  /**
   * Used to derive `end` when `end` is absent, for timed events only. Ignored when `end` is
   * present, and ignored (falls back to the default +1h duration) when not a positive number.
   */
  durationMinutes?: number;
  allDay?: boolean;
  /** CSS color used as the event chip background. */
  color?: string;
  /** Second text line (e.g. location). Rendered as part="event-subtitle" in week/day/agenda. */
  subtitle?: string;
  /** Short label (e.g. event type). Rendered as part="event-tag" in day banner cards / renderEvent ctx. */
  tag?: string;
  /** Per-event override of the component's `event-style`. */
  style?: "solid" | "tinted" | "outline";
  /**
   * Free token exported as part="event variant-<variant>" and data-variant, for host ::part()
   * styling. Must match /^[a-z0-9-]+$/ — values that don't are dropped (with a console warning)
   * because they are interpolated into a `part` attribute.
   */
  variant?: string;
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
