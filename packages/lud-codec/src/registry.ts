import alFatemi from "../profiles/al-fatemi.json";
import alKanz from "../profiles/al-kanz.json";
import kanzAlMarjaan from "../profiles/kanz-al-marjaan.json";
import type { LudOptions, LudProfile } from "./types";
import { parseProfile } from "./validate";

const registry = new Map<string, LudProfile>();

/**
 * Deep-freezes a parsed profile (the object itself, `sequences` and each sequence, `missingGlyphs`,
 * `preserve`, `fontFiles`) so a reference returned by getProfile/listProfiles cannot be mutated to
 * bypass the draft gate — e.g. `getProfile("al-fatemi").status = "confirmed"`. Copies each nested
 * array/object first, so freezing never reaches back into a caller's own objects.
 */
function freezeProfile(profile: LudProfile): LudProfile {
  const sequences = profile.sequences.map((s) => Object.freeze({ ...s }));
  const frozen: LudProfile = {
    ...profile,
    fontFiles: Object.freeze({ ...profile.fontFiles }),
    sequences: Object.freeze(sequences) as LudProfile["sequences"],
    missingGlyphs: Object.freeze([...profile.missingGlyphs]) as LudProfile["missingGlyphs"],
    preserve: Object.freeze([...profile.preserve]) as LudProfile["preserve"],
  };
  return Object.freeze(frozen);
}

/** Registers a profile. An id already in the registry is replaced — see the README. */
export function registerProfile(profile: LudProfile): void {
  registry.set(profile.id, freezeProfile(parseProfile(profile)));
}

for (const raw of [alKanz, alFatemi, kanzAlMarjaan]) registerProfile(parseProfile(raw));

export function getProfile(id: string): LudProfile | undefined {
  return registry.get(id);
}

export function listProfiles(): LudProfile[] {
  return [...registry.values()];
}

const defaultWarn = (message: string) => console.warn(message);

/** Profile ids already warned about in this process — resolveProfile warns at most once per id. */
const warnedProfileIds = new Set<string>();

function warnOnce(id: string, emit: () => void): void {
  if (warnedProfileIds.has(id)) return;
  warnedProfileIds.add(id);
  emit();
}

/** The profile a conversion may use, or undefined (with a warning) when it is unknown or a disallowed draft. */
export function resolveProfile(id: string, options: LudOptions = {}): LudProfile | undefined {
  const warn = options.onWarning ?? defaultWarn;
  const profile = registry.get(id);
  if (!profile) {
    warnOnce(id, () => warn(`Unknown LuD profile "${id}"`));
    return undefined;
  }
  if (profile.status === "draft" && !options.allowDraft) {
    warnOnce(id, () => warn(`LuD profile "${id}" is a draft; pass allowDraft to use it`));
    return undefined;
  }
  return profile;
}
