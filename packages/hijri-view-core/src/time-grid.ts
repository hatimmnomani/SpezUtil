import type { HijriCalendar, HijriDate } from "@spezutil/hijri-core";
import type { CalendarEvent, NormalizedEvent } from "./types";
import { normalizeEvent } from "./events";
import { addDaysUtc, sameHijri } from "./month";

const DAY_MS = 86400000;
const MIN_MS = 60000;

export interface PositionedEvent {
  event: CalendarEvent;
  /** Minutes from midnight, clipped to the visible day window. */
  startMin: number;
  endMin: number;
  /** Overlap-packing column and total columns in this event's cluster. */
  col: number;
  colCount: number;
}

export interface TimeGridColumn {
  hijri: HijriDate;
  /** Day start, UTC midnight. */
  gregorian: Date;
  isToday: boolean;
  allDay: NormalizedEvent[];
  timed: PositionedEvent[];
}

export interface TimeGridModel {
  columns: TimeGridColumn[];
  dayStartHour: number;
  dayEndHour: number;
}

export interface TimeGridOptions {
  dayStartHour?: number;
  dayEndHour?: number;
  weekStart?: number;
  today?: Date;
}

function floorToDayUtc(date: Date): Date {
  return new Date(Math.floor(date.getTime() / DAY_MS) * DAY_MS);
}

/** Classic overlap column-packing: greedy column per cluster of transitively overlapping events. */
function packColumns(
  items: { startMin: number; endMin: number }[]
): { col: number; colCount: number }[] {
  const order = items
    .map((item, i) => ({ ...item, i }))
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const result: { col: number; colCount: number }[] = items.map(() => ({ col: 0, colCount: 1 }));

  let cluster: typeof order = [];
  let clusterEnd = -1;
  const flush = () => {
    if (!cluster.length) return;
    const laneEnds: number[] = [];
    const cols: number[] = [];
    for (const item of cluster) {
      let col = laneEnds.findIndex((end) => end <= item.startMin);
      if (col === -1) {
        col = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[col] = item.endMin;
      cols.push(col);
    }
    cluster.forEach((item, k) => {
      result[item.i] = { col: cols[k]!, colCount: laneEnds.length };
    });
    cluster = [];
  };

  for (const item of order) {
    if (cluster.length && item.startMin >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flush();
  return result;
}

export function buildTimeGridModel(
  cal: HijriCalendar,
  anchorDate: Date,
  dayCount: number,
  events: CalendarEvent[],
  opts: TimeGridOptions
): TimeGridModel {
  const dayStartHour = opts.dayStartHour ?? 0;
  const dayEndHour = opts.dayEndHour ?? 24;
  const anchorDay = floorToDayUtc(anchorDate);
  const first =
    dayCount === 7
      ? addDaysUtc(anchorDay, -((anchorDay.getUTCDay() - (opts.weekStart ?? 0) + 7) % 7))
      : anchorDay;
  const todayHijri = opts.today ? cal.gregorianToHijri(opts.today) : null;
  const normalized = events.map(normalizeEvent);

  const columns: TimeGridColumn[] = [];
  for (let d = 0; d < dayCount; d++) {
    const dayStart = addDaysUtc(first, d);
    const dayStartMs = dayStart.getTime();
    const winStartMs = dayStartMs + dayStartHour * 60 * MIN_MS;
    const winEndMs = dayStartMs + dayEndHour * 60 * MIN_MS;
    const hijri = cal.gregorianToHijri(dayStart);

    const allDay = normalized.filter(
      (n) => n.allDay && n.startMs < dayStartMs + DAY_MS && n.endMs > dayStartMs
    );

    const timedRaw = normalized
      .filter((n) => !n.allDay && n.startMs < winEndMs && n.endMs > winStartMs)
      .map((n) => ({
        event: n.event,
        startMin: Math.round((Math.max(n.startMs, winStartMs) - dayStartMs) / MIN_MS),
        endMin: Math.round((Math.min(n.endMs, winEndMs) - dayStartMs) / MIN_MS),
      }));
    const packed = packColumns(timedRaw);
    const timed = timedRaw.map((t, i) => ({ ...t, ...packed[i]! }));

    columns.push({
      hijri,
      gregorian: dayStart,
      isToday: todayHijri ? sameHijri(hijri, todayHijri) : false,
      allDay,
      timed,
    });
  }

  return { columns, dayStartHour, dayEndHour };
}
