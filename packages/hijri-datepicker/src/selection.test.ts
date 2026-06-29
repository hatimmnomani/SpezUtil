import { describe, expect, it } from "vitest";
import { isMode, parseIsoList } from "./selection";

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

});
