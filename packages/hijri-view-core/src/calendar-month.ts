import type { HijriCalendar } from "@spezutil/hijri-core";
import type { CalendarEvent } from "./types";
import { buildMonthModel } from "./month";
import type { BuildOptions, DayCell } from "./month";
import { normalizeEvent } from "./events";

const DAY_MS = 86400000;

export interface EventSegment {
  event: CalendarEvent;
  weekIndex: number;
  /** 0-based column of the segment start within its week row. */
  startCol: number;
  /** Number of columns covered (1-7). */
  span: number;
  lane: number;
  /** Event started before this row (clipped at the row/grid edge). */
  continuesBefore: boolean;
  /** Event continues past this row. */
  continuesAfter: boolean;
}

export interface CalendarMonthModel {
  year: number;
  month: number;
  weeks: DayCell[][];
  /** Visible segments only (lane < maxLanes), ordered by week then lane. */
  segments: EventSegment[];
  /** overflow[week][col] = number of events hidden on that day. */
  overflow: number[][];
}

export interface CalendarMonthOptions extends BuildOptions {
  /** Max visible event lanes per week row before days overflow into "+N more". Default Infinity. */
  maxLanes?: number;
}

export function buildCalendarMonthModel(
  cal: HijriCalendar,
  view: { year: number; month: number },
  events: CalendarEvent[],
  opts: CalendarMonthOptions
): CalendarMonthModel {
  const grid = buildMonthModel(cal, view, opts);
  const gridStartMs = grid.weeks[0]![0]!.gregorian.getTime();
  const gridEndMs = gridStartMs + 42 * DAY_MS;
  const maxLanes = opts.maxLanes ?? Infinity;

  // Whole-row segments per event, before lane assignment.
  interface RawSegment {
    event: CalendarEvent;
    weekIndex: number;
    startCol: number;
    span: number;
    continuesBefore: boolean;
    continuesAfter: boolean;
    totalSpanDays: number;
    startMs: number;
  }

  const raw: RawSegment[] = [];
  for (const event of events) {
    const n = normalizeEvent(event);
    if (n.endMs <= gridStartMs || n.startMs >= gridEndMs) continue;
    // Day-index range covered by the event within the grid (end exclusive).
    const firstDay = Math.max(0, Math.floor((n.startMs - gridStartMs) / DAY_MS));
    const lastDay = Math.min(41, Math.ceil((n.endMs - gridStartMs) / DAY_MS) - 1);
    if (lastDay < firstDay) continue;
    const totalSpanDays = lastDay - firstDay + 1;
    for (let w = Math.floor(firstDay / 7); w <= Math.floor(lastDay / 7); w++) {
      const rowFirst = Math.max(firstDay, w * 7);
      const rowLast = Math.min(lastDay, w * 7 + 6);
      raw.push({
        event,
        weekIndex: w,
        startCol: rowFirst - w * 7,
        span: rowLast - rowFirst + 1,
        continuesBefore: rowFirst > firstDay || n.startMs < gridStartMs,
        continuesAfter: rowLast < lastDay,
        totalSpanDays,
        startMs: n.startMs,
      });
    }
  }

  // Lane assignment per week: longer events first, then earlier start.
  const overflow: number[][] = Array.from({ length: 6 }, () => Array(7).fill(0) as number[]);
  const segments: EventSegment[] = [];
  for (let w = 0; w < 6; w++) {
    const rows = raw
      .filter((s) => s.weekIndex === w)
      .sort(
        (a, b) =>
          b.totalSpanDays - a.totalSpanDays || a.startMs - b.startMs || a.startCol - b.startCol
      );
    const laneEnds: number[] = []; // per lane, first free column
    for (const s of rows) {
      let lane = laneEnds.findIndex((end) => end <= s.startCol);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = s.startCol + s.span;
      if (lane < maxLanes) {
        segments.push({
          event: s.event,
          weekIndex: s.weekIndex,
          startCol: s.startCol,
          span: s.span,
          lane,
          continuesBefore: s.continuesBefore,
          continuesAfter: s.continuesAfter,
        });
      } else {
        for (let c = s.startCol; c < s.startCol + s.span; c++) overflow[w]![c]!++;
      }
    }
  }

  segments.sort((a, b) => a.weekIndex - b.weekIndex || a.lane - b.lane || a.startCol - b.startCol);
  return { year: grid.year, month: grid.month, weeks: grid.weeks, segments, overflow };
}
