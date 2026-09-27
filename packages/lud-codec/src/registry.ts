import alFatemi from "../profiles/al-fatemi.json";
import alKanz from "../profiles/al-kanz.json";
import kanzAlMarjaan from "../profiles/kanz-al-marjaan.json";
import type { LudOptions, LudProfile } from "./types";
import { parseProfile } from "./validate";

const registry = new Map<string, LudProfile>();

export function registerProfile(profile: LudProfile): void {
  registry.set(profile.id, parseProfile(profile));
}

for (const raw of [alKanz, alFatemi, kanzAlMarjaan]) registerProfile(parseProfile(raw));

export function getProfile(id: string): LudProfile | undefined {
  return registry.get(id);
}

export function listProfiles(): LudProfile[] {
  return [...registry.values()];
}

const defaultWarn = (message: string) => console.warn(message);

/** The profile a conversion may use, or undefined (with a warning) when it is unknown or a disallowed draft. */
export function resolveProfile(id: string, options: LudOptions = {}): LudProfile | undefined {
  const warn = options.onWarning ?? defaultWarn;
  const profile = registry.get(id);
  if (!profile) {
    warn(`Unknown LuD profile "${id}"`);
    return undefined;
  }
  if (profile.status === "draft" && !options.allowDraft) {
    warn(`LuD profile "${id}" is a draft; pass allowDraft to use it`);
    return undefined;
  }
  return profile;
}
