export type Mode = "single" | "range" | "multiple";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isMode(v: string | null): Mode {
  return v === "range" || v === "multiple" ? v : "single";
}

export function parseIsoList(v: string | null): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ISO_DATE.test(s));
}

export function toggleIso(list: string[], iso: string): string[] {
  const next = list.includes(iso) ? list.filter((x) => x !== iso) : [...list, iso];
  return next.sort();
}
