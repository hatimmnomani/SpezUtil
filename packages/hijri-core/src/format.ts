import { translitMonthNames } from "./locale";
import type { HijriDate } from "./types";

function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

/**
 * Maps every ASCII digit (0-9) in `value` to its Arabic-Indic equivalent (U+0660-U+0669)
 * for `system: "arab"`; returns the input unchanged for `"latn"`. Non-digit characters
 * (":", "/", letters, spaces, ...) pass through untouched, so it can be applied safely to
 * a whole formatted string like "10:30" or "1447" without disturbing separators or names.
 */
export function formatNumerals(value: number | string, system: "latn" | "arab"): string {
  const s = String(value);
  if (system !== "arab") return s;
  return s.replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));
}

export function formatHijri(
  h: HijriDate,
  pattern: string,
  opts?: { numerals?: "latn" | "arab"; monthNames?: string[] }
): string {
  const numerals = opts?.numerals ?? "latn";
  const monthNames = opts?.monthNames ?? translitMonthNames;
  return pattern.replace(/YYYY|MMMM|MM|DD|M|D/g, (token) => {
    switch (token) {
      case "YYYY":
        return formatNumerals(h.year, numerals);
      case "MMMM":
        return monthNames[h.month - 1] ?? String(h.month);
      case "MM":
        return formatNumerals(pad(h.month, 2), numerals);
      case "M":
        return formatNumerals(h.month, numerals);
      case "DD":
        return formatNumerals(pad(h.day, 2), numerals);
      case "D":
        return formatNumerals(h.day, numerals);
      default:
        return token;
    }
  });
}

export function parseHijri(input: string, pattern: string): HijriDate {
  const tokens: string[] = [];
  const regexSrc = pattern.replace(/YYYY|MM|DD/g, (token) => {
    tokens.push(token);
    return token === "YYYY" ? "(\\d{1,4})" : "(\\d{1,2})";
  });
  const match = new RegExp("^" + regexSrc + "$").exec(input);
  if (!match) throw new Error(`Cannot parse "${input}" with pattern "${pattern}"`);
  const out: HijriDate = { year: 0, month: 1, day: 1 };
  tokens.forEach((token, i) => {
    const value = Number(match[i + 1]);
    if (token === "YYYY") out.year = value;
    else if (token === "MM") out.month = value;
    else if (token === "DD") out.day = value;
  });
  return out;
}
