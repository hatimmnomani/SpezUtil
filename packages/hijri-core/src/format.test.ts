import { describe, expect, it } from "vitest";
import { formatHijri, parseHijri } from "./format";

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
});
