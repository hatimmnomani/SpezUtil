export interface HijriDate {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

/** Maps a Gregorian ISO date (yyyy-mm-dd) to its corrected Hijri value. */
export type CorrectionMap = Record<string, HijriDate>;

export interface CalendarVariantConfig {
  /** JD of 1 Muharram, year 1, for this variant. */
  epochJd: number;
  /** Cycle positions (1-30) that are leap years. */
  leapYears: number[];
}

export interface CalendarOptions {
  variant?: "bohra";
  /** Overrides layered on top of the tabular result, keyed by Gregorian ISO date. */
  corrections?: CorrectionMap;
}

export interface HijriCalendar {
  gregorianToHijri(date: Date): HijriDate;
  hijriToGregorian(h: HijriDate): Date;
  isLeapYear(year: number): boolean;
  monthLength(year: number, month: number): number;
}
