import type { HijriCalendar, HijriDate } from "@spezutil/hijri-core";

export interface DayCell {
  hijri: HijriDate;
  gregorian: Date;
  inCurrentMonth: boolean;
  selected: boolean;
  disabled: boolean;
  isToday: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  inRange: boolean;
  isWeekend: boolean;
}

export interface MonthModel {
  year: number;
  month: number;
  weeks: DayCell[][];
}

export interface BuildOptions {
  selected?: HijriDate | null;
  selectedList?: HijriDate[];
  rangeStart?: HijriDate | null;
  /** Effective end (committed end or hover preview); range band is drawn start..end inclusive of endpoints. */
  rangeEnd?: HijriDate | null;
  isDisabled?: (h: HijriDate, g: Date) => boolean;
  today?: Date;
  /** First day of week, 0=Sunday..6=Saturday. Default 0. */
  weekStart?: number;
  /** Day indices (0=Sunday..6=Saturday) that count as weekend. Default [0, 6]. */
  weekendDays?: number[];
  /**
   * Which calendar `view.year`/`view.month` refer to and which month the grid is framed around.
   * `"hijri"` (default): the 6×7 grid is built around that Hijri month and `inCurrentMonth`
   * flags its days. `"gregorian"`: `view` is a Gregorian year/month (1–12), the grid is framed
   * around that Gregorian month and `inCurrentMonth` flags its days — Hijri dates are still
   * computed per cell, so a Hijri-numeral calendar can be laid out month-by-Gregorian-month.
   */
  anchor?: MonthAnchor;
}

export type MonthAnchor = "hijri" | "gregorian";

export function sameHijri(a: HijriDate, b: HijriDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export function buildMonthModel(
  cal: HijriCalendar,
  view: { year: number; month: number },
  opts: BuildOptions
): MonthModel {
  const anchor: MonthAnchor = opts.anchor ?? "hijri";
  const firstGreg =
    anchor === "gregorian"
      ? new Date(Date.UTC(view.year, view.month - 1, 1))
      : cal.hijriToGregorian({ year: view.year, month: view.month, day: 1 });
  const weekStart = opts.weekStart ?? 0;
  const startOffset = (firstGreg.getUTCDay() - weekStart + 7) % 7;
  const gridStart = addDaysUtc(firstGreg, -startOffset);
  const todayHijri = opts.today ? cal.gregorianToHijri(opts.today) : null;
  const weekendDays = opts.weekendDays ?? [0, 6];

  const startT = opts.rangeStart ? cal.hijriToGregorian(opts.rangeStart).getTime() : null;
  const endT = opts.rangeEnd ? cal.hijriToGregorian(opts.rangeEnd).getTime() : null;
  const lo = startT !== null && endT !== null ? Math.min(startT, endT) : null;
  const hi = startT !== null && endT !== null ? Math.max(startT, endT) : null;

  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const g = addDaysUtc(gridStart, w * 7 + d);
      const t = g.getTime();
      const hijri = cal.gregorianToHijri(g);
      const selected =
        (opts.selected ? sameHijri(hijri, opts.selected) : false) ||
        (opts.selectedList ? opts.selectedList.some((s) => sameHijri(hijri, s)) : false);
      week.push({
        hijri,
        gregorian: g,
        inCurrentMonth:
          anchor === "gregorian"
            ? g.getUTCFullYear() === view.year && g.getUTCMonth() + 1 === view.month
            : hijri.year === view.year && hijri.month === view.month,
        selected,
        disabled: opts.isDisabled ? opts.isDisabled(hijri, g) : false,
        isToday: todayHijri ? sameHijri(hijri, todayHijri) : false,
        rangeStart: startT !== null && t === startT,
        rangeEnd: endT !== null && t === endT,
        inRange: lo !== null && hi !== null && t > lo && t < hi,
        isWeekend: weekendDays.includes(g.getUTCDay()),
      });
    }
    weeks.push(week);
  }
  return { year: view.year, month: view.month, weeks };
}
