import type { LudSequence } from "./types";

/** Arabic-script letters, tatweel included (it joins). Harakat are not letters. */
export function isArabicLetter(ch: string | undefined): boolean {
  if (ch === undefined || ch.length === 0) return false;
  const c = ch.charCodeAt(0);
  return (
    (c >= 0x0620 && c <= 0x064a) ||
    (c >= 0x066e && c <= 0x06d3) ||
    c === 0x06d5 ||
    c === 0x06ee ||
    c === 0x06ef ||
    (c >= 0x06fa && c <= 0x06fc) ||
    c === 0x06ff
  );
}

/** Combining marks that do not end a word: harakat, superscript alef, Quranic annotation marks. */
export function isMark(ch: string | undefined): boolean {
  if (ch === undefined || ch.length === 0) return false;
  const c = ch.charCodeAt(0);
  return (c >= 0x064b && c <= 0x065f) || c === 0x0670 || (c >= 0x06d6 && c <= 0x06ed);
}

function before(text: string, start: number): string | undefined {
  let j = start - 1;
  while (j >= 0 && isMark(text.charAt(j))) j--;
  return j >= 0 ? text.charAt(j) : undefined;
}

function after(text: string, end: number): string | undefined {
  let j = end;
  while (j < text.length && isMark(text.charAt(j))) j++;
  return j < text.length ? text.charAt(j) : undefined;
}

/**
 * Whether sequence `s`, occupying text[start, end), may be converted there.
 * - A sequence that does not start with an Arabic letter (e.g. "}") needs an Arabic letter before it.
 * - initial = no Arabic letter before; final = no Arabic letter after; medial = neither. Marks are skipped.
 * Positions are judged on the string passed in, never on partially converted output.
 */
export function sequenceApplies(s: LudSequence, text: string, start: number, end: number): boolean {
  const prevIsLetter = isArabicLetter(before(text, start));
  if (!isArabicLetter(s.typed.charAt(0)) && !prevIsLetter) return false;
  const atStart = !prevIsLetter;
  const atEnd = !isArabicLetter(after(text, end));
  switch (s.position ?? "any") {
    case "initial":
      return atStart;
    case "final":
      return atEnd;
    case "medial":
      return !atStart && !atEnd;
    default:
      return true;
  }
}
