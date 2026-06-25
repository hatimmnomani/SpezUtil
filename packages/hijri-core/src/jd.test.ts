import { describe, expect, it } from "vitest";
import { dateToJd, jdToDate, gregorianToJd, jdToGregorian } from "./jd";

describe("julian day", () => {
  it("converts a known Gregorian date to JD", () => {
    expect(gregorianToJd(2000, 1, 1)).toBe(2451544.5);
  });

  it("round-trips JD <-> Gregorian", () => {
    const jd = gregorianToJd(1984, 6, 17);
    expect(jdToGregorian(jd)).toEqual({ year: 1984, month: 6, day: 17 });
  });

  it("round-trips a UTC Date <-> JD", () => {
    const d = new Date(Date.UTC(2010, 2, 15));
    expect(jdToDate(dateToJd(d)).toISOString()).toBe("2010-03-15T00:00:00.000Z");
  });
});
