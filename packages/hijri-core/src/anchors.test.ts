import { describe, expect, it } from "vitest";
import { createCalendar } from "./calendar";

// Pairs verified against the authoritative Misri conversion tables
// (Prof. Mujtaba Lokhandwala, "Conversion of dates from the Gregorian Calendar
// to the Misri Calendar and vice versa"). Months are 1-based (Muharram = 1).
const ANCHORS: { greg: string; hijri: { year: number; month: number; day: number } }[] = [
  // 20 Jumadassani 1378 == 31 Dec 1958 (worked Example 1 in the source)
  { greg: "1958-12-31", hijri: { year: 1378, month: 6, day: 20 } },
  // 18 Shaban 1375 == 30 Mar 1956 (worked Example 2 in the source)
  { greg: "1956-03-30", hijri: { year: 1375, month: 8, day: 18 } },
  // 12 Rabi al-Awwal 1439 == 30 Nov 2017
  { greg: "2017-11-30", hijri: { year: 1439, month: 3, day: 12 } },
];

describe("anchor calibration", () => {
  const cal = createCalendar();

  it("has authoritative anchors to test", () => {
    expect(ANCHORS.length).toBeGreaterThanOrEqual(3);
  });

  for (const a of ANCHORS) {
    it(`maps ${a.greg} -> ${a.hijri.year}-${a.hijri.month}-${a.hijri.day}`, () => {
      const [y, m, d] = a.greg.split("-").map(Number) as [number, number, number];
      const got = cal.gregorianToHijri(new Date(Date.UTC(y, m - 1, d)));
      expect(got).toEqual(a.hijri);
    });

    it(`round-trips ${a.greg} back to gregorian`, () => {
      const back = cal.hijriToGregorian(a.hijri);
      expect(back.toISOString().slice(0, 10)).toBe(a.greg);
    });
  }
});
