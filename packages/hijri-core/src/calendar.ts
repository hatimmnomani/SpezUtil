import { dateToJd, jdToDate } from "./jd";
import {
  BOHRA_VARIANT,
  hijriToJd,
  isLeapYear,
  jdToHijri,
  monthLength,
} from "./tabular";
import defaultCorrections from "./corrections.json";
import type { CalendarOptions, CorrectionMap, HijriCalendar, HijriDate } from "./types";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function createCalendar(options: CalendarOptions = {}): HijriCalendar {
  const v = BOHRA_VARIANT;
  const corrections: CorrectionMap = {
    ...(defaultCorrections as CorrectionMap),
    ...(options.corrections ?? {}),
  };

  return {
    gregorianToHijri(date: Date): HijriDate {
      const override = corrections[toIsoDate(date)];
      if (override) return { ...override };
      const jd = dateToJd(new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
      )));
      return jdToHijri(v, jd);
    },
    hijriToGregorian(h: HijriDate): Date {
      return jdToDate(hijriToJd(v, h));
    },
    isLeapYear(year: number): boolean {
      return isLeapYear(v, year);
    },
    monthLength(year: number, month: number): number {
      return monthLength(v, year, month);
    },
  };
}
