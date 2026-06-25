import type { CalendarVariantConfig, HijriDate } from "./types";

// Epoch: 1 Muharram 1 AH = 15 July 622 CE (Julian). epochJd calibrated to 1948438.5
// against authoritative anchors (Lokhandwala Misri conversion tables). See anchors.test.ts.
export const BOHRA_VARIANT: CalendarVariantConfig = {
  epochJd: 1948438.5,
  leapYears: [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29],
};

export function isLeapYear(v: CalendarVariantConfig, year: number): boolean {
  const pos = mod(year - 1, 30) + 1;
  return v.leapYears.includes(pos);
}

export function monthLength(
  v: CalendarVariantConfig,
  year: number,
  month: number
): number {
  if (month === 12) return isLeapYear(v, year) ? 30 : 29;
  return month % 2 === 1 ? 30 : 29;
}

export function daysBeforeYear(v: CalendarVariantConfig, year: number): number {
  const y = year - 1;
  const fullCycles = Math.floor(y / 30);
  const remainder = mod(y, 30);
  let leapsInRemainder = 0;
  for (let pos = 1; pos <= remainder; pos++) {
    if (v.leapYears.includes(pos)) leapsInRemainder++;
  }
  const leaps = fullCycles * v.leapYears.length + leapsInRemainder;
  return y * 354 + leaps;
}

function daysBeforeMonth(
  v: CalendarVariantConfig,
  year: number,
  month: number
): number {
  let days = 0;
  for (let m = 1; m < month; m++) days += monthLength(v, year, m);
  return days;
}

export function hijriToJd(v: CalendarVariantConfig, h: HijriDate): number {
  return (
    v.epochJd + daysBeforeYear(v, h.year) + daysBeforeMonth(v, h.year, h.month) + (h.day - 1)
  );
}

export function jdToHijri(v: CalendarVariantConfig, jd: number): HijriDate {
  const dayCount = Math.floor(jd - v.epochJd);
  let year = Math.floor(dayCount / 354.3667) + 1;
  if (year < 1) year = 1;
  while (daysBeforeYear(v, year) > dayCount) year--;
  while (daysBeforeYear(v, year + 1) <= dayCount) year++;
  let remaining = dayCount - daysBeforeYear(v, year);
  let month = 1;
  while (month < 12 && remaining >= monthLength(v, year, month)) {
    remaining -= monthLength(v, year, month);
    month++;
  }
  return { year, month, day: remaining + 1 };
}

function mod(a: number, b: number): number {
  return a - b * Math.floor(a / b);
}
