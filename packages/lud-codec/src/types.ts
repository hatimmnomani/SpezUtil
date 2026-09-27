/** Where in a word a typed sequence must sit for the font to ligate it. Isolated satisfies both initial and final. */
export type LudPosition = "any" | "initial" | "medial" | "final";

export interface LudSequence {
  /** What the user types for the legacy font, e.g. "ثث". */
  typed: string;
  /** The single Unicode character it stands for, e.g. "پ". */
  unicode: string;
  /** Defaults to "any". */
  position?: LudPosition;
  /** True only when a person has confirmed the meaning. */
  confirmed: boolean;
  note?: string;
}

export interface LudProfile {
  id: string;
  displayName: string;
  /** "draft" profiles are ignored unless the caller passes allowDraft. */
  status: "confirmed" | "draft";
  /** CSS font-family the consumer declares with @font-face. */
  fontFamily: string;
  /** File names only. This package ships no font binaries. */
  fontFiles: { woff2?: string; ttf?: string };
  sequences: LudSequence[];
  /** Unicode characters this font has no glyph for. */
  missingGlyphs: string[];
  /** Runs kept verbatim in both directions. */
  preserve: string[];
  fallbackFont: string;
}

export interface LudSegment {
  text: string;
  /** True when the text must be drawn in the profile's fallbackFont. */
  fallback: boolean;
}

export interface LudOptions {
  allowDraft?: boolean;
  onWarning?: (message: string) => void;
}
