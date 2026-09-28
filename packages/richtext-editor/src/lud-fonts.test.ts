import { describe, expect, it } from "vitest";
import {
  UNICODE_LUD_FONT,
  familyForLudFont,
  firstFontFamily,
  isValidLudFontId,
  listLudFonts,
  ludFontForFamily,
  normalizeLudFontId,
  sameFamily,
} from "./lud-fonts";

describe("lud-fonts", () => {
  it("lists the three codec profiles (drafts included) then Unicode", () => {
    const fonts = listLudFonts();
    expect(fonts.map((f) => f.id)).toEqual(["al-kanz", "al-fatemi", "kanz-al-marjaan", "unicode"]);
    expect(fonts[0]).toEqual({
      id: "al-kanz",
      label: "Al Kanz",
      family: '"AL-KANZ", "Noto Naskh Arabic"',
      draft: false,
    });
    expect(fonts[1]!.draft).toBe(true);
    expect(fonts[3]).toEqual({ id: "unicode", label: "Unicode", family: '"Noto Naskh Arabic"', draft: false });
  });

  it("maps Google-Docs style font-family values to profiles", () => {
    expect(ludFontForFamily("'AL-KANZ', sans-serif")).toBe("al-kanz");
    expect(ludFontForFamily('"Al Kanz"')).toBe("al-kanz");
    expect(ludFontForFamily("AL-FATEMI-Lisaan-ud-Dawat")).toBe("al-fatemi");
    expect(ludFontForFamily("Kanz al-Marjaan")).toBe("kanz-al-marjaan");
    expect(ludFontForFamily('"Noto Naskh Arabic", serif')).toBe(UNICODE_LUD_FONT);
    expect(ludFontForFamily("Arial")).toBeNull();
    expect(ludFontForFamily("")).toBeNull();
  });

  it("validates ids like the backend renderer", () => {
    expect(isValidLudFontId("al-kanz")).toBe(true);
    expect(isValidLudFontId('" onmouseover="x')).toBe(false);
    expect(isValidLudFontId("")).toBe(false);
    expect(normalizeLudFontId('" onmouseover="x')).toBe("unicode");
    expect(normalizeLudFontId(undefined)).toBe("unicode");
    expect(normalizeLudFontId("kanz-al-lulu")).toBe("kanz-al-lulu"); // valid but unregistered: kept
  });

  it("resolves families for ids, with the fallback for unknown and unicode", () => {
    expect(familyForLudFont("al-kanz")).toBe('"AL-KANZ", "Noto Naskh Arabic"');
    expect(familyForLudFont("unicode")).toBe('"Noto Naskh Arabic"');
    expect(familyForLudFont("kanz-al-lulu")).toBe('"Noto Naskh Arabic"');
  });

  it("compares first families loosely", () => {
    expect(firstFontFamily(` "AL-KANZ" , serif`)).toBe("AL-KANZ");
    expect(sameFamily("'AL-KANZ'", '"AL-KANZ", "Noto Naskh Arabic"')).toBe(true);
    expect(sameFamily("Arial", "AL-KANZ")).toBe(false);
  });
});
