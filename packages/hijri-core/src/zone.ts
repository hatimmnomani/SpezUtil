/**
 * Resolves "now" into calendar-day / minutes-since-midnight components, in a given
 * IANA timezone (default: viewer's local zone). Used to align "today"/"now" with the
 * same wall-clock encoding convention (Date.UTC(y, m, d, ...)) that event strings and
 * grid arithmetic already use — see CalendarEvent / month.ts / time-grid.ts.
 */

function zonedParts(now: Date, timeZone?: string): { y: number; m: number; d: number; hh: number; mm: number } {
  if (!timeZone) {
    return {
      y: now.getFullYear(),
      m: now.getMonth() + 1,
      d: now.getDate(),
      hh: now.getHours(),
      mm: now.getMinutes(),
    };
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), hh: get("hour"), mm: get("minute") };
}

/** "Today" encoded as Date.UTC(y, m, d) — matching the wall-clock day encoding used elsewhere. */
export function zonedTodayUtc(timeZone?: string): Date {
  const { y, m, d } = zonedParts(new Date(), timeZone);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Minutes since local midnight, in the given zone (or viewer's local zone by default). */
export function zonedNowMinutes(timeZone?: string): number {
  const { hh, mm } = zonedParts(new Date(), timeZone);
  return hh * 60 + mm;
}
