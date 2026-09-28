import { describe, expect, it } from "vitest";
import { escapeHtml, toDisplay, toDisplayHtml } from "./codec";

const span = (t: string) =>
  `<span class="lud-fallback" style="font-family:&quot;Noto Naskh Arabic&quot;">${t}</span>`;

describe("toDisplay (al-kanz)", () => {
  it("writes the typed sequence for a missing glyph", () => {
    expect(toDisplay("نے", "al-kanz")).toEqual([{ text: "نسس", fallback: false }]);
    expect(toDisplay("سوٹ", "al-kanz")).toEqual([{ text: "سوطط", fallback: false }]);
    expect(toDisplay("ماں", "al-kanz")).toEqual([{ text: "ما}", fallback: false }]);
  });

  it("keeps characters the font draws natively", () => {
    expect(toDisplay("پر", "al-kanz")).toEqual([{ text: "پر", fallback: false }]);
    expect(toDisplay("تفهيمهم", "al-kanz")).toEqual([{ text: "تفهيمهم", fallback: false }]);
  });

  it("falls back for a missing glyph with no sequence", () => {
    expect(toDisplay("ہم", "al-kanz")).toEqual([
      { text: "ہ", fallback: true },
      { text: "م", fallback: false },
    ]);
  });

  it("falls back when the sequence position does not fit", () => {
    expect(toDisplay("ےب", "al-kanz")).toEqual([
      { text: "ے", fallback: true },
      { text: "ب", fallback: false },
    ]);
  });

  it("merges adjacent segments of the same kind", () => {
    expect(toDisplay("ہھم", "al-kanz")).toEqual([
      { text: "ہھ", fallback: true },
      { text: "م", fallback: false },
    ]);
  });

  it("returns no segments for empty", () => {
    expect(toDisplay("", "al-kanz")).toEqual([]);
  });

  it("renders an unknown profile entirely in the fallback font", () => {
    expect(toDisplay("پر", "nope", { onWarning: () => {} })).toEqual([{ text: "پر", fallback: true }]);
  });
});

describe("toDisplayHtml", () => {
  it("wraps fallback segments and escapes text", () => {
    expect(toDisplayHtml("ہم", "al-kanz")).toBe(`${span("ہ")}م`);
    expect(toDisplayHtml("<a>&'\"", "al-kanz")).toBe("&lt;a&gt;&amp;&#39;&quot;");
  });

  it("uses the default fallback font for an unknown profile", () => {
    expect(toDisplayHtml("پ", "nope", { onWarning: () => {} })).toBe(span("پ"));
  });

  it("escapes in the documented order", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});
