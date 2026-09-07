import type { CalendarEvent, NormalizedEvent } from "./types";

const DAY_MS = 86400000;
const HOUR_MS = 3600000;

const warnedKeys = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
}

const ISO_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

function parseIsoUtc(iso: string): { ms: number; hasTime: boolean } {
  const m = ISO_RE.exec(iso);
  if (!m) return { ms: NaN, hasTime: false };
  const hasTime = m[4] !== undefined;
  if (hasTime && m[6]) {
    // Explicit offset/Z: a fully-qualified instant, not a bare wall-clock value — parse as-is.
    return { ms: new Date(iso).getTime(), hasTime: true };
  }
  const ms = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    hasTime ? Number(m[4]) : 0,
    hasTime ? Number(m[5]) : 0
  );
  return { ms, hasTime };
}

function floorToDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

/** `variant` is interpolated into a `part="event variant-<v>"` attribute — restrict it accordingly. */
const VARIANT_RE = /^[a-z0-9-]+$/;

/**
 * Drops an invalid `variant` (logging once per event id + value), so every event returned by
 * `normalizeEvent` — whether supplied directly or built via `mapEventFields` — is safe to
 * interpolate into a `part`/`data-variant` attribute downstream. Returns the same object
 * reference when there is nothing to strip, so unaffected events are not needlessly copied.
 */
function sanitizeVariant(event: CalendarEvent): CalendarEvent {
  if (event.variant === undefined || VARIANT_RE.test(event.variant)) return event;
  const key = `variant::${event.id ?? ""}::${event.variant}`;
  warnOnce(
    key,
    `[@spezutil/hijri-view-core] event ${event.id ? `"${event.id}"` : "(no id)"} has an invalid ` +
      `"variant" value: ${JSON.stringify(event.variant)} — expected to match /^[a-z0-9-]+$/ ` +
      `(it is interpolated into a "part" attribute). The variant has been dropped.`
  );
  const sanitized = { ...event };
  delete sanitized.variant;
  return sanitized;
}

export function normalizeEvent(event: CalendarEvent): NormalizedEvent {
  const sanitized = sanitizeVariant(event);
  const start = parseIsoUtc(sanitized.start);
  if (Number.isNaN(start.ms)) {
    const key = `${sanitized.id ?? ""}::${String(sanitized.start)}`;
    warnOnce(
      key,
      `[@spezutil/hijri-view-core] event ${sanitized.id ? `"${sanitized.id}"` : "(no id)"} ` +
        `${sanitized.title ? `"${sanitized.title}" ` : ""}has an unparseable "start" value: ${JSON.stringify(sanitized.start)} ` +
        `— expected "yyyy-mm-dd" or "yyyy-mm-ddTHH:mm" (optionally with a Z/offset suffix). ` +
        `This event will not be displayed. If your data uses a different field name, use eventFields to map it.`
    );
  }
  const allDay = sanitized.allDay ?? !start.hasTime;

  if (allDay) {
    const startMs = floorToDay(start.ms);
    const endParsed = sanitized.end ? parseIsoUtc(sanitized.end) : null;
    const endMs = endParsed ? floorToDay(endParsed.ms) + DAY_MS : startMs + DAY_MS;
    return { event: sanitized, startMs, endMs: Math.max(endMs, startMs + DAY_MS), allDay: true };
  }

  const startMs = start.ms;
  const endParsed = sanitized.end ? parseIsoUtc(sanitized.end) : null;
  let endMs: number;
  if (endParsed && endParsed.ms > startMs) {
    // An explicit, validly-ordered end always wins over durationMinutes.
    endMs = endParsed.ms;
  } else if (
    !sanitized.end &&
    typeof sanitized.durationMinutes === "number" &&
    sanitized.durationMinutes > 0
  ) {
    // end absent, durationMinutes present and positive: derive it. Non-positive values (and
    // end being present-but-invalid) fall through to the default below instead.
    endMs = startMs + sanitized.durationMinutes * 60000;
  } else {
    endMs = startMs + HOUR_MS;
  }
  return { event: sanitized, startMs, endMs, allDay: false };
}

/**
 * A source field on a host's raw event object: either its name (read verbatim from the raw
 * object) or a derive function invoked with the raw object to compute the value directly —
 * useful when the target value isn't a 1:1 field rename (e.g. a lookup by another field).
 */
export type EventFieldSource<T = unknown> = string | ((raw: Record<string, unknown>) => T);

/** Maps CalendarEvent field names to the source field names on a host's raw event objects. */
export interface EventFieldMap {
  id?: EventFieldSource<string>;
  title?: EventFieldSource<string>;
  start?: EventFieldSource<string>;
  end?: EventFieldSource<string>;
  durationMinutes?: EventFieldSource<number>;
  allDay?: EventFieldSource<boolean>;
  color?: EventFieldSource<string>;
  subtitle?: EventFieldSource<string>;
  tag?: EventFieldSource<string>;
  style?: EventFieldSource<CalendarEvent["style"]>;
  variant?: EventFieldSource<string>;
}

/**
 * Rebuilds a CalendarEvent from a raw host object using an EventFieldMap, e.g. when the
 * host's data uses `start_at` instead of `start`. A map value is either the source field's
 * name (read verbatim from the raw object) or a function called with the raw object to
 * derive the value directly. Omitted map keys default to the same-named field. The original
 * raw object is always attached as `data` so interaction handlers still get the full host
 * object back, not just the trimmed CalendarEvent shape.
 */
export function mapEventFields(
  raw: Record<string, unknown>,
  fields: EventFieldMap
): CalendarEvent {
  const get = (key: keyof EventFieldMap): unknown => {
    const source = fields[key];
    return typeof source === "function" ? source(raw) : raw[source ?? key];
  };
  return {
    id: get("id") as string,
    title: get("title") as string,
    start: get("start") as string,
    end: get("end") as string | undefined,
    durationMinutes: get("durationMinutes") as number | undefined,
    allDay: get("allDay") as boolean | undefined,
    color: get("color") as string | undefined,
    subtitle: get("subtitle") as string | undefined,
    tag: get("tag") as string | undefined,
    style: get("style") as CalendarEvent["style"] | undefined,
    variant: get("variant") as string | undefined,
    data: raw,
  };
}

/** Events overlapping [startMs, endMs); edge-touching events are excluded. */
export function eventsInRange(
  events: NormalizedEvent[],
  startMs: number,
  endMs: number
): NormalizedEvent[] {
  return events.filter((n) => n.startMs < endMs && n.endMs > startMs);
}
