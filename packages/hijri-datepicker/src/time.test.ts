import { describe, expect, it } from "vitest";
import {
  parseTime,
  formatTime24,
  to12,
  from12,
  combineDateTime,
  splitDateTime,
} from "./time";

describe("time helpers", () => {
  it("parses valid times and rejects invalid", () => {
    expect(parseTime("14:30")).toEqual({ hour: 14, minute: 30 });
    expect(parseTime("9:05")).toEqual({ hour: 9, minute: 5 });
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("12:60")).toBeNull();
    expect(parseTime("nope")).toBeNull();
    expect(parseTime(null)).toBeNull();
  });

  it("formats 24h with padding", () => {
    expect(formatTime24({ hour: 9, minute: 5 })).toBe("09:05");
  });

  it("converts to/from 12h", () => {
    expect(to12(0)).toEqual({ hour12: 12, meridiem: "AM" });
    expect(to12(13)).toEqual({ hour12: 1, meridiem: "PM" });
    expect(from12(12, "AM")).toBe(0);
    expect(from12(1, "PM")).toBe(13);
    expect(from12(12, "PM")).toBe(12);
  });

  it("combines and splits date+time", () => {
    expect(combineDateTime("2024-03-15", { hour: 14, minute: 30 })).toBe(
      "2024-03-15T14:30"
    );
    expect(splitDateTime("2024-03-15T14:30")).toEqual({
      date: "2024-03-15",
      time: { hour: 14, minute: 30 },
    });
    expect(splitDateTime("2024-03-15")).toEqual({ date: "2024-03-15", time: null });
    expect(splitDateTime(null)).toEqual({ date: null, time: null });
  });
});
