const GREGORIAN_EPOCH = 1721425.5;
const UNIX_JD = 2440587.5;

export function isGregorianLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function gregorianToJd(year: number, month: number, day: number): number {
  return (
    GREGORIAN_EPOCH -
    1 +
    365 * (year - 1) +
    Math.floor((year - 1) / 4) -
    Math.floor((year - 1) / 100) +
    Math.floor((year - 1) / 400) +
    Math.floor(
      (367 * month - 362) / 12 +
        (month <= 2 ? 0 : isGregorianLeap(year) ? -1 : -2) +
        day
    )
  );
}

export interface YMD {
  year: number;
  month: number;
  day: number;
}

export function jdToGregorian(jd: number): YMD {
  const wjd = Math.floor(jd - 0.5) + 0.5;
  const depoch = wjd - GREGORIAN_EPOCH;
  const quadricent = Math.floor(depoch / 146097);
  const dqc = mod(depoch, 146097);
  const cent = Math.floor(dqc / 36524);
  const dcent = mod(dqc, 36524);
  const quad = Math.floor(dcent / 1461);
  const dquad = mod(dcent, 1461);
  const yindex = Math.floor(dquad / 365);
  let year = quadricent * 400 + cent * 100 + quad * 4 + yindex;
  if (!(cent === 4 || yindex === 4)) year += 1;
  const yearday = wjd - gregorianToJd(year, 1, 1);
  const leapAdj =
    wjd < gregorianToJd(year, 3, 1) ? 0 : isGregorianLeap(year) ? 1 : 2;
  const month = Math.floor(((yearday + leapAdj) * 12 + 373) / 367);
  const day = wjd - gregorianToJd(year, month, 1) + 1;
  return { year, month, day };
}

export function dateToJd(date: Date): number {
  return date.getTime() / 86400000 + UNIX_JD;
}

export function jdToDate(jd: number): Date {
  return new Date(Math.round((jd - UNIX_JD) * 86400000));
}

function mod(a: number, b: number): number {
  return a - b * Math.floor(a / b);
}
