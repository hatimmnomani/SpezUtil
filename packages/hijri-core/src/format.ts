import { translitMonthNames } from "./locale";
import type { HijriDate } from "./types";

function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

export function formatHijri(h: HijriDate, pattern: string): string {
  return pattern.replace(/YYYY|MMMM|MM|DD|M|D/g, (token) => {
    switch (token) {
      case "YYYY":
        return String(h.year);
      case "MMMM":
        return translitMonthNames[h.month - 1] ?? String(h.month);
      case "MM":
        return pad(h.month, 2);
      case "M":
        return String(h.month);
      case "DD":
        return pad(h.day, 2);
      case "D":
        return String(h.day);
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
