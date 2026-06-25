import type { HijriCalendar, HijriDate } from "@digitaltakeoff/hijri-core";

export interface DayCell {
  hijri: HijriDate;
  gregorian: Date;
  inCurrentMonth: boolean;
  selected: boolean;
  disabled: boolean;
  isToday: boolean;
}

export interface MonthModel {
  year: number;
  month: number;
  weeks: DayCell[][];
}

export interface BuildOptions {
  selected?: HijriDate | null;
  isDisabled?: (h: HijriDate, g: Date) => boolean;
  today?: Date;
}

function sameHijri(a: HijriDate, b: HijriDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export function buildMonthModel(
  cal: HijriCalendar,
  view: { year: number; month: number },
  opts: BuildOptions
): MonthModel {
  const firstGreg = cal.hijriToGregorian({ year: view.year, month: view.month, day: 1 });
  const startOffset = firstGreg.getUTCDay();
  const gridStart = addDaysUtc(firstGreg, -startOffset);
  const todayHijri = opts.today ? cal.gregorianToHijri(opts.today) : null;

  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const g = addDaysUtc(gridStart, w * 7 + d);
      const hijri = cal.gregorianToHijri(g);
      week.push({
        hijri,
        gregorian: g,
        inCurrentMonth: hijri.year === view.year && hijri.month === view.month,
        selected: opts.selected ? sameHijri(hijri, opts.selected) : false,
        disabled: opts.isDisabled ? opts.isDisabled(hijri, g) : false,
        isToday: todayHijri ? sameHijri(hijri, todayHijri) : false,
      });
    }
    weeks.push(week);
  }
  return { year: view.year, month: view.month, weeks };
}
