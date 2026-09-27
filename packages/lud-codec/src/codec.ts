import { sequenceApplies } from "./chars";
import { resolveProfile } from "./registry";
import type { LudOptions, LudProfile, LudSequence } from "./types";

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
