import { describe, expect, it } from "vitest";
import { arMonthNames, arWeekdayNames, translitMonthNames, weekdayNames } from "./locale";

describe("locale name arrays", () => {
  it("provides 12 month names per language", () => {
    expect(translitMonthNames).toHaveLength(12);
    expect(arMonthNames).toHaveLength(12);
  });

  it("provides 7 weekday names per language, Sunday first", () => {
    expect(weekdayNames).toHaveLength(7);
    expect(weekdayNames[0]).toBe("Sunday");
    expect(arWeekdayNames).toHaveLength(7);
    expect(arWeekdayNames[0]).toBe("الأحد");
  });
});
