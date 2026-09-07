import { describe, expect, it } from "vitest";
import { formatHijri, formatNumerals, parseHijri } from "./format";

describe("format", () => {
  it("formats with tokens", () => {
    const s = formatHijri({ year: 1445, month: 9, day: 3 }, "D MMMM YYYY");
    expect(s).toBe("3 Ramadan al-Moazzam 1445");
  });

  it("formats numeric pattern with zero padding", () => {
    expect(formatHijri({ year: 1445, month: 9, day: 3 }, "DD/MM/YYYY")).toBe(
      "03/09/1445"
    );
  });

  it("parses a numeric pattern", () => {
    expect(parseHijri("03/09/1445", "DD/MM/YYYY")).toEqual({
      year: 1445,
      month: 9,
      day: 3,
    });
  });

  it("formats with an overridden month-name list", () => {
    const s = formatHijri(
      { year: 1445, month: 9, day: 3 },
      "D MMMM YYYY",
      { monthNames: ["Muharram", "Safar", "Rabi I", "Rabi II", "Jumada I", "Jumada II", "Rajab", "Shaban", "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah"] }
    );
    expect(s).toBe("3 Ramadan 1445");
  });

  it("formats with Arabic-Indic numerals when requested, leaving the month name alone", () => {
    const s = formatHijri({ year: 1447, month: 9, day: 27 }, "D MMMM YYYY", { numerals: "arab" });
    expect(s).toBe("٢٧ Ramadan al-Moazzam ١٤٤٧");
    expect(/[0-9]/.test(s)).toBe(false);
  });
});

describe("formatNumerals", () => {
  it("maps ASCII digits to Arabic-Indic for a plain number", () => {
    expect(formatNumerals(1447, "arab")).toBe("١٤٤٧");
  });

  it("maps digits within a mixed string, passing separators through unchanged", () => {
    expect(formatNumerals("10:30", "arab")).toBe("١٠:٣٠");
  });

  it("returns the input unchanged for latn", () => {
    expect(formatNumerals("12", "latn")).toBe("12");
    expect(formatNumerals(12, "latn")).toBe("12");
  });

  it("passes non-digit characters through untouched", () => {
    expect(formatNumerals("07/15", "arab")).toBe("٠٧/١٥");
  });
});
