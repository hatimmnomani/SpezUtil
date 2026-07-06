import type { HijriCalendar, HijriDate } from "@spezutil/hijri-core";
import type { CalendarEvent, NormalizedEvent } from "./types";
import { normalizeEvent } from "./events";
import { addDaysUtc } from "./month";

const DAY_MS = 86400000;

export interface AgendaDay {
  hijri: HijriDate;
  /** Day start, UTC midnight. */
  gregorian: Date;
  /** All-day items first, then timed items sorted by start. */
  items: NormalizedEvent[];
}

export interface AgendaModel {
  days: AgendaDay[];
}

export function buildAgendaModel(
  cal: HijriCalendar,
  startDate: Date,
  dayCount: number,
  events: CalendarEvent[]
): AgendaModel {
  const first = new Date(Math.floor(startDate.getTime() / DAY_MS) * DAY_MS);
  const normalized = events.map(normalizeEvent);

  const days: AgendaDay[] = [];
  for (let d = 0; d < dayCount; d++) {
    const dayStart = addDaysUtc(first, d);
    const dayStartMs = dayStart.getTime();
    const items = normalized
      .filter((n) => n.startMs < dayStartMs + DAY_MS && n.endMs > dayStartMs)
      .sort(
        (a, b) => Number(b.allDay) - Number(a.allDay) || a.startMs - b.startMs
      );
    if (!items.length) continue;
    days.push({ hijri: cal.gregorianToHijri(dayStart), gregorian: dayStart, items });
  }
  return { days };
}
