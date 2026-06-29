import { describe, expect, it } from "vitest";
import { isMode, parseIsoList, toggleIso } from "./selection";

describe("selection helpers", () => {
  it("normalizes mode attribute", () => {
    expect(isMode("range")).toBe("range");
    expect(isMode("multiple")).toBe("multiple");
    expect(isMode("single")).toBe("single");
    expect(isMode(null)).toBe("single");
    expect(isMode("bogus")).toBe("single");
  });

  it("parses and filters a comma ISO list", () => {
    expect(parseIsoList("2024-03-10, 2024-03-12 ,bad")).toEqual([
      "2024-03-10",
      "2024-03-12",
    ]);
    expect(parseIsoList(null)).toEqual([]);
    expect(parseIsoList("")).toEqual([]);
  });

  it("toggles an iso in/out and keeps the list sorted", () => {
    expect(toggleIso(["2024-03-12"], "2024-03-10")).toEqual([
      "2024-03-10",
      "2024-03-12",
    ]);
    expect(toggleIso(["2024-03-10", "2024-03-12"], "2024-03-12")).toEqual([
      "2024-03-10",
    ]);
  });
});
