import { getStyleObjectFromCSS } from "@lexical/selection";
import { DEFAULT_FALLBACK_FONT, getProfile, listProfiles } from "@spezutil/lud-codec";

/** ludFont value for text typed in the Unicode fallback font (not a codec profile). */
export const UNICODE_LUD_FONT = "unicode";

export interface LudFontOption {
  /** Codec profile id, or "unicode". Stored as `ludFont` on lud-text nodes. */
  id: string;
  label: string;
  /** CSS font-family value applied to the typed text. */
  family: string;
  /** True for draft codec profiles. Display never depends on confirmation. */
  draft: boolean;
}

const ID_PATTERN = /^[a-z0-9-]{1,40}$/;

const quote = (family: string) => `"${family.replace(/"/g, "")}"`;

/** Lowercase, drop quotes, parentheses, spaces, hyphens, underscores: "Al-Fatemi (Lisaan ud-Dawat)" → "alfatemilisaanuddawat". */
function normalize(family: string): string {
  return family.toLowerCase().replace(/["'()\s_-]/g, "");
}

export function firstFontFamily(css: string): string {
  const first = css.split(",")[0] ?? "";
  return first.trim().replace(/^["']|["']$/g, "").trim();
}

export function sameFamily(a: string, b: string): boolean {
  const na = normalize(firstFontFamily(a));
  return na !== "" && na === normalize(firstFontFamily(b));
}

export function isValidLudFontId(id: string): boolean {
  return ID_PATTERN.test(id);
}

/** Same rule as HandbookHtmlRenderer: an invalid id becomes "unicode". Valid unregistered ids are kept, never dropped. */
export function normalizeLudFontId(id: string | null | undefined): string {
  return typeof id === "string" && isValidLudFontId(id) ? id : UNICODE_LUD_FONT;
}

/** Called on every toolbar build, so profiles registered later via registerProfile show up. */
export function listLudFonts(): LudFontOption[] {
  const fonts: LudFontOption[] = listProfiles().map((p) => ({
    id: p.id,
    label: p.displayName,
    family: `${quote(p.fontFamily)}, ${quote(p.fallbackFont)}`,
    draft: p.status === "draft",
  }));
  fonts.push({
    id: UNICODE_LUD_FONT,
    label: "Unicode",
    family: quote(DEFAULT_FALLBACK_FONT),
    draft: false,
  });
  return fonts;
}

/**
 * True for `unicode` and for every registered profile. A valid id this build has no profile for
 * (a future or renamed profile, or one registered after the document loaded) is opaque: it is
 * stored and round-tripped, but no family is derived for it and it is never re-typed.
 */
export function isKnownLudFont(id: string): boolean {
  return id === UNICODE_LUD_FONT || getProfile(id) !== undefined;
}

/** The `font-family` value in an inline style, or "" when it has none. */
export function fontFamilyIn(style: string): string {
  return getStyleObjectFromCSS(style)["font-family"] ?? "";
}

/** `style` with `font-family: <family>;` in front; every other declaration is kept verbatim. */
export function withFontFamily(style: string, family: string): string {
  const rest = style.trim();
  return rest === "" ? `font-family: ${family};` : `font-family: ${family}; ${rest}`;
}

export function familyForLudFont(id: string): string {
  const profile = id === UNICODE_LUD_FONT ? undefined : getProfile(id);
  return profile
    ? `${quote(profile.fontFamily)}, ${quote(profile.fallbackFont)}`
    : quote(DEFAULT_FALLBACK_FONT);
}

export function ludFontForFamily(fontFamily: string): string | null {
  const key = normalize(firstFontFamily(fontFamily));
  if (key === "") return null;
  for (const p of listProfiles()) {
    if ([p.fontFamily, p.displayName, p.id].some((name) => normalize(name) === key)) return p.id;
  }
  return key === normalize(DEFAULT_FALLBACK_FONT) ? UNICODE_LUD_FONT : null;
}
