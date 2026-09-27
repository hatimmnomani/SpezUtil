import { describe, expect, it } from "vitest";
import { getProfile, listProfiles, registerProfile, resolveProfile } from "./registry";
import { parseProfile } from "./validate";
import { resolveProfile as resolveProfileFromEntryPoint } from "./index";

const minimal = {
  id: "test-font",
  displayName: "Test",
  status: "confirmed",
  fontFamily: "TEST",
  fontFiles: {},
  sequences: [{ typed: "ثث", unicode: "پ", confirmed: true }],
  missingGlyphs: [],
  preserve: [],
  fallbackFont: "Noto Naskh Arabic",
};

describe("registry", () => {
  it("bundles the three profiles", () => {
    expect(listProfiles().map((p) => p.id).sort()).toEqual(["al-fatemi", "al-kanz", "kanz-al-marjaan"]);
  });

  it("marks only al-kanz as confirmed", () => {
    expect(getProfile("al-kanz")?.status).toBe("confirmed");
    expect(getProfile("al-fatemi")?.status).toBe("draft");
    expect(getProfile("kanz-al-marjaan")?.status).toBe("draft");
  });

  it("carries the confirmed Al Kanz mapping", () => {
    const map = Object.fromEntries(getProfile("al-kanz")!.sequences.map((s) => [s.typed, s.unicode]));
    expect(map).toEqual({
      "ثث": "پ", "كك": "گ", "طط": "ٹ", "سس": "ے", "}": "ں",
      "ظظ": "ه", "حح": "چ", "صص": "ڈ", "ضض": "ڑ",
    });
    expect(getProfile("al-kanz")!.sequences.find((s) => s.typed === "سس")?.position).toBe("final");
  });

  it("warns and returns undefined for an unknown id", () => {
    const warnings: string[] = [];
    expect(resolveProfile("nope", { onWarning: (m) => warnings.push(m) })).toBeUndefined();
    expect(warnings).toEqual(['Unknown LuD profile "nope"']);
  });

  it("refuses a draft profile unless allowDraft", () => {
    const warnings: string[] = [];
    expect(resolveProfile("al-fatemi", { onWarning: (m) => warnings.push(m) })).toBeUndefined();
    expect(warnings).toEqual(['LuD profile "al-fatemi" is a draft; pass allowDraft to use it']);
    expect(resolveProfile("al-fatemi", { allowDraft: true })?.id).toBe("al-fatemi");
  });

  it("registers a new profile", () => {
    registerProfile(parseProfile(minimal));
    expect(getProfile("test-font")?.displayName).toBe("Test");
  });

  it("exports resolveProfile from the package's public entry point", () => {
    expect(resolveProfileFromEntryPoint("al-kanz")?.id).toBe("al-kanz");
  });
});

describe("parseProfile", () => {
  it.each([
    ["bad id", { ...minimal, id: "Bad Id" }, "id"],
    ["unicode longer than one char", { ...minimal, sequences: [{ typed: "ثث", unicode: "پپ", confirmed: true }] }, "unicode"],
    ["empty typed", { ...minimal, sequences: [{ typed: "", unicode: "پ", confirmed: true }] }, "typed"],
    ["bad position", { ...minimal, sequences: [{ typed: "ثث", unicode: "پ", position: "end", confirmed: true }] }, "position"],
    ["confirmed profile with unconfirmed sequence", { ...minimal, sequences: [{ typed: "ثث", unicode: "پ", confirmed: false }] }, "confirmed"],
    ["multi-char missing glyph", { ...minimal, missingGlyphs: ["ےے"] }, "missingGlyphs"],
    ["bad status", { ...minimal, status: "final" }, "status"],
  ])("rejects %s", (_name, raw, field) => {
    expect(() => parseProfile(raw)).toThrow(field);
  });
});
