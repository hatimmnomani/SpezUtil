import { describe, expect, it } from "vitest";
import { toUnicode } from "./codec";

const quiet = { onWarning: () => {} };

describe("toUnicode (al-kanz)", () => {
  it.each([
    ["ثثر", "پر"],
    ["ككهر", "گهر"],
    ["سوطط", "سوٹ"],
    ["تفظظيمهم", "تفهيمهم"],
    ["صصا", "ڈا"],
    ["ضض", "ڑ"],
    ["حح", "چ"],
    ["ما}", "ماں"],
    ["نسس", "نے"],
  ])("converts %s", (typed, unicode) => {
    expect(toUnicode(typed, "al-kanz")).toBe(unicode);
  });

  it("leaves medial سس alone", () => {
    expect(toUnicode("سسب", "al-kanz")).toBe("سسب");
  });

  it("treats harakat as transparent for position", () => {
    expect(toUnicode("نسسَ", "al-kanz")).toBe("نےَ");
  });

  it("does not turn a brace after Latin into noon ghunna", () => {
    expect(toUnicode("a}", "al-kanz")).toBe("a}");
    expect(toUnicode("}", "al-kanz")).toBe("}");
  });

  it("preserves the tatweel run", () => {
    expect(toUnicode("ـــــ", "al-kanz")).toBe("ـــــ");
    expect(toUnicode("ثثـــــثث", "al-kanz")).toBe("پـــــپ");
  });

  it("scans left to right, longest first", () => {
    expect(toUnicode("ثثث", "al-kanz")).toBe("پث");
  });

  it("is idempotent on its own output", () => {
    const once = toUnicode("ثثر ككهر نسس ما}", "al-kanz");
    expect(toUnicode(once, "al-kanz")).toBe(once);
  });

  it("returns empty for empty", () => {
    expect(toUnicode("", "al-kanz")).toBe("");
  });

  it("returns text unchanged with a warning for an unknown profile", () => {
    const warnings: string[] = [];
    expect(toUnicode("ثثر", "nope", { onWarning: (m) => warnings.push(m) })).toBe("ثثر");
    expect(warnings).toHaveLength(1);
  });

  it("returns text unchanged for undefined or empty-string profile ids, same as unknown", () => {
    expect(toUnicode("ثثر", undefined as unknown as string, quiet)).toBe("ثثر");
    expect(toUnicode("ثثر", "", quiet)).toBe("ثثر");
  });

  it("warns at most once per profile id per process", () => {
    const warnings: string[] = [];
    const onWarning = (m: string) => warnings.push(m);
    toUnicode("ثثر", "warn-once-toUnicode", { onWarning });
    toUnicode("ثثر", "warn-once-toUnicode", { onWarning });
    toUnicode("ثثر", "warn-once-toUnicode", { onWarning });
    expect(warnings).toHaveLength(1);
  });

  it("ignores a draft profile unless allowDraft", () => {
    expect(toUnicode("ثثر", "kanz-al-marjaan", quiet)).toBe("ثثر");
    expect(toUnicode("ثثر", "kanz-al-marjaan", { allowDraft: true })).toBe("پر");
  });

  it("does not apply sequences a profile lacks", () => {
    expect(toUnicode("طط", "kanz-al-marjaan", { allowDraft: true })).toBe("طط");
  });
});
