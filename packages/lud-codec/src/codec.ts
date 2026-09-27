import { sequenceApplies } from "./chars";
import { getProfile, resolveProfile } from "./registry";
import type { LudOptions, LudProfile, LudSegment, LudSequence } from "./types";

function byTypedLengthDesc(profile: LudProfile): LudSequence[] {
  return [...profile.sequences].sort((a, b) => b.typed.length - a.typed.length);
}

function preserveRuns(profile: LudProfile): string[] {
  return [...profile.preserve].sort((a, b) => b.length - a.length);
}

/** Typed legacy-font text → Unicode. Unknown or disallowed-draft profile → text unchanged (with a warning). */
export function toUnicode(text: string, profileId: string, options: LudOptions = {}): string {
  if (!text) return "";
  const profile = resolveProfile(profileId, options);
  if (!profile) return text;
  const sequences = byTypedLengthDesc(profile);
  const preserve = preserveRuns(profile);
  let out = "";
  let i = 0;
  scan: while (i < text.length) {
    for (const run of preserve) {
      if (text.startsWith(run, i)) {
        out += run;
        i += run.length;
        continue scan;
      }
    }
    for (const s of sequences) {
      if (text.startsWith(s.typed, i) && sequenceApplies(s, text, i, i + s.typed.length)) {
        out += s.unicode;
        i += s.typed.length;
        continue scan;
      }
    }
    out += text.charAt(i);
    i++;
  }
  return out;
}

export const DEFAULT_FALLBACK_FONT = "Noto Naskh Arabic";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Unicode → what to draw with the profile's font. Only characters in missingGlyphs are rewritten:
 * to the first sequence (profile order) whose position fits, else into a fallback segment.
 * Unknown or disallowed-draft profile → one fallback segment holding the whole text.
 */
export function toDisplay(unicode: string, profileId: string, options: LudOptions = {}): LudSegment[] {
  if (!unicode) return [];
  const profile = resolveProfile(profileId, options);
  if (!profile) return [{ text: unicode, fallback: true }];
  const missing = new Set(profile.missingGlyphs);
  const segments: LudSegment[] = [];
  const push = (text: string, fallback: boolean) => {
    const last = segments[segments.length - 1];
    if (last && last.fallback === fallback) last.text += text;
    else segments.push({ text, fallback });
  };
  for (let i = 0; i < unicode.length; i++) {
    const ch = unicode.charAt(i);
    if (!missing.has(ch)) {
      push(ch, false);
      continue;
    }
    const seq = profile.sequences.find((s) => s.unicode === ch && sequenceApplies(s, unicode, i, i + 1));
    if (seq) push(seq.typed, false);
    else push(ch, true);
  }
  return segments;
}

export function toDisplayHtml(unicode: string, profileId: string, options: LudOptions = {}): string {
  const font = getProfile(profileId)?.fallbackFont ?? DEFAULT_FALLBACK_FONT;
  return toDisplay(unicode, profileId, options)
    .map((s) =>
      s.fallback
        ? `<span class="lud-fallback" style="font-family:&quot;${escapeHtml(font)}&quot;">${escapeHtml(s.text)}</span>`
        : escapeHtml(s.text),
    )
    .join("");
}
