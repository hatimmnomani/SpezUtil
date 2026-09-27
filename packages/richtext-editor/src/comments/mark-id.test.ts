import { describe, expect, it } from "vitest";
import { generateMarkId, isMarkId } from "./mark-id";

describe("mark ids", () => {
  it("are 26-char Crockford ULIDs accepted by the backend rule", () => {
    const id = generateMarkId();
    expect(id).toHaveLength(26);
    expect(isMarkId(id)).toBe(true);
  });

  it("encode the timestamp first so ids sort by creation time", () => {
    const zero = () => new Uint8Array(10);
    expect(generateMarkId(0, zero)).toBe("00000000000000000000000000");
    expect(generateMarkId(1, zero).slice(0, 10)).toBe("0000000001");
    expect(generateMarkId(1_700_000_000_000, zero) < generateMarkId(1_700_000_000_001, zero)).toBe(true);
  });

  it("rejects non-ULIDs", () => {
    expect(isMarkId("not-a-ulid")).toBe(false);
    expect(isMarkId("0000000000000000000000000I")).toBe(false); // I is not Crockford
  });
});
