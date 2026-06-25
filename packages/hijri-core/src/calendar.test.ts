import { describe, expect, it } from "vitest";
import { createCalendar } from "./calendar";

describe("createCalendar", () => {
  it("round-trips gregorian <-> hijri", () => {
    const cal = createCalendar();
    const d = new Date(Date.UTC(2024, 0, 15));
    const h = cal.gregorianToHijri(d);
    expect(cal.hijriToGregorian(h).toISOString()).toBe(d.toISOString());
  });

  it("applies a correction override keyed by gregorian ISO date", () => {
    const cal = createCalendar({
      corrections: { "2024-01-15": { year: 1445, month: 7, day: 3 } },
    });
    const h = cal.gregorianToHijri(new Date(Date.UTC(2024, 0, 15)));
    expect(h).toEqual({ year: 1445, month: 7, day: 3 });
  });

  it("exposes leap-year and month-length helpers", () => {
    const cal = createCalendar();
    expect(cal.isLeapYear(2)).toBe(true);
    expect(cal.monthLength(1, 1)).toBe(30);
  });
});
