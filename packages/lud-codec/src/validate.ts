import type { LudPosition, LudProfile, LudSequence } from "./types";

const POSITIONS: readonly LudPosition[] = ["any", "initial", "medial", "final"];

function fail(id: string, reason: string): never {
  throw new Error(`Invalid LuD profile ${id}: ${reason}`);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

/** The one validation for a profile, used by the registry and by the schema tests. */
export function parseProfile(raw: unknown): LudProfile {
  if (typeof raw !== "object" || raw === null) fail("?", "not an object");
  const r = raw as Record<string, unknown>;
  const id = isString(r.id) ? r.id : "?";
  if (!/^[a-z0-9-]+$/.test(id)) fail(id, "id must match ^[a-z0-9-]+$");
  for (const key of ["displayName", "fontFamily", "fallbackFont"] as const) {
    if (!isString(r[key]) || (r[key] as string).length === 0) fail(id, `${key} must be a non-empty string`);
  }
  if (r.status !== "confirmed" && r.status !== "draft") fail(id, "status must be confirmed or draft");
  if (typeof r.fontFiles !== "object" || r.fontFiles === null) fail(id, "fontFiles must be an object");
  if (!Array.isArray(r.sequences)) fail(id, "sequences must be an array");
  const sequences: LudSequence[] = r.sequences.map((s: unknown, i: number) => {
    const q = s as Record<string, unknown>;
    if (!isString(q.typed) || q.typed.length === 0) fail(id, `sequences[${i}].typed must be non-empty`);
    if (!isString(q.unicode) || q.unicode.length !== 1) fail(id, `sequences[${i}].unicode must be one character`);
    if (q.position !== undefined && !POSITIONS.includes(q.position as LudPosition)) {
      fail(id, `sequences[${i}].position must be one of ${POSITIONS.join(", ")}`);
    }
    if (typeof q.confirmed !== "boolean") fail(id, `sequences[${i}].confirmed must be boolean`);
    if (r.status === "confirmed" && q.confirmed !== true) fail(id, `sequences[${i}] is not confirmed in a confirmed profile`);
    return {
      typed: q.typed,
      unicode: q.unicode,
      ...(q.position !== undefined ? { position: q.position as LudPosition } : {}),
      confirmed: q.confirmed,
      ...(isString(q.note) ? { note: q.note } : {}),
    };
  });
  if (!Array.isArray(r.missingGlyphs) || !r.missingGlyphs.every((g) => isString(g) && g.length === 1)) {
    fail(id, "missingGlyphs must be single characters");
  }
  if (!Array.isArray(r.preserve) || !r.preserve.every((p) => isString(p) && p.length > 0)) {
    fail(id, "preserve must be non-empty strings");
  }
  return {
    id,
    displayName: r.displayName as string,
    status: r.status,
    fontFamily: r.fontFamily as string,
    fontFiles: r.fontFiles as LudProfile["fontFiles"],
    sequences,
    missingGlyphs: r.missingGlyphs as string[],
    preserve: r.preserve as string[],
    fallbackFont: r.fallbackFont as string,
  };
}
