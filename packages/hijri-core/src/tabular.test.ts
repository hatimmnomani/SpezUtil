import { describe, expect, it } from "vitest";
import {
  BOHRA_VARIANT,
  isLeapYear,
  monthLength,
  hijriToJd,
  jdToHijri,
} from "./tabular";

describe("fatimid tabular", () => {
  it("identifies leap years in the cycle", () => {
    expect(isLeapYear(BOHRA_VARIANT, 2)).toBe(true);
    expect(isLeapYear(BOHRA_VARIANT, 8)).toBe(true);
    expect(isLeapYear(BOHRA_VARIANT, 1)).toBe(false);
    expect(isLeapYear(BOHRA_VARIANT, 30)).toBe(false);
  });

  it("computes month lengths", () => {
    expect(monthLength(BOHRA_VARIANT, 1, 1)).toBe(30);
    expect(monthLength(BOHRA_VARIANT, 1, 2)).toBe(29);
    expect(monthLength(BOHRA_VARIANT, 2, 12)).toBe(30);
    expect(monthLength(BOHRA_VARIANT, 1, 12)).toBe(29);
  });

  it("round-trips hijri <-> jd for many dates", () => {
    for (let y = 1400; y <= 1460; y++) {
      for (const m of [1, 6, 12]) {
        const h = { year: y, month: m, day: 15 };
        expect(jdToHijri(BOHRA_VARIANT, hijriToJd(BOHRA_VARIANT, h))).toEqual(h);
      }
    }
  });

  it("first day of year 1 is the epoch JD", () => {
    expect(hijriToJd(BOHRA_VARIANT, { year: 1, month: 1, day: 1 })).toBe(
      BOHRA_VARIANT.epochJd
    );
  });
});
