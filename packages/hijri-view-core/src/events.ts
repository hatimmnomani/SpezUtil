import type { CalendarEvent, NormalizedEvent } from "./types";

const DAY_MS = 86400000;
const HOUR_MS = 3600000;

function parseIsoUtc(iso: string): { ms: number; hasTime: boolean } {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(iso);
  if (!m) return { ms: NaN, hasTime: false };
  const hasTime = m[4] !== undefined;
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

/** Events overlapping [startMs, endMs); edge-touching events are excluded. */
export function eventsInRange(
  events: NormalizedEvent[],
  startMs: number,
  endMs: number
): NormalizedEvent[] {
  return events.filter((n) => n.startMs < endMs && n.endMs > startMs);
}
