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

export function normalizeEvent(event: CalendarEvent): NormalizedEvent {
  const start = parseIsoUtc(event.start);
  if (Number.isNaN(start.ms)) {
    const key = `${event.id ?? ""}::${String(event.start)}`;
    warnOnce(
      key,
      `[@spezutil/hijri-view-core] event ${event.id ? `"${event.id}"` : "(no id)"} ` +
        `${event.title ? `"${event.title}" ` : ""}has an unparseable "start" value: ${JSON.stringify(event.start)} ` +
        `— expected "yyyy-mm-dd" or "yyyy-mm-ddTHH:mm" (optionally with a Z/offset suffix). ` +
        `This event will not be displayed. If your data uses a different field name, use eventFields to map it.`
    );
  }
  const allDay = event.allDay ?? !start.hasTime;

  if (allDay) {
    const startMs = floorToDay(start.ms);
    const endParsed = event.end ? parseIsoUtc(event.end) : null;
    const endMs = endParsed ? floorToDay(endParsed.ms) + DAY_MS : startMs + DAY_MS;
    return { event, startMs, endMs: Math.max(endMs, startMs + DAY_MS), allDay: true };
  }

  const startMs = start.ms;
  const endParsed = event.end ? parseIsoUtc(event.end) : null;
  const endMs = endParsed && endParsed.ms > startMs ? endParsed.ms : startMs + HOUR_MS;
  return { event, startMs, endMs, allDay: false };
}

/** Maps CalendarEvent field names to the source field names on a host's raw event objects. */
export interface EventFieldMap {
  id?: string;
  title?: string;
  start?: string;
  end?: string;
  allDay?: string;
  color?: string;
}

/**
 * Rebuilds a CalendarEvent from a raw host object using an EventFieldMap, e.g. when the
 * host's data uses `start_at` instead of `start`. Omitted map keys default to the
 * same-named field. The original raw object is always attached as `data` so interaction
 * handlers still get the full host object back, not just the trimmed CalendarEvent shape.
 */
export function mapEventFields(
  raw: Record<string, unknown>,
  fields: EventFieldMap
): CalendarEvent {
  const get = (key: keyof EventFieldMap): unknown => raw[fields[key] ?? key];
  return {
    id: get("id") as string,
    title: get("title") as string,
    start: get("start") as string,
    end: get("end") as string | undefined,
    allDay: get("allDay") as boolean | undefined,
    color: get("color") as string | undefined,
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
