/**
 * The toolbar's icon set: one style (24x24 grid, 1.75 stroke, round caps and joins, `currentColor`),
 * drawn inline so the editor needs no icon font, no network request and no CSP exception.
 *
 * Each icon is a list of SVG path strings. A path starting with `!` is a "dot": it is drawn with a heavier
 * stroke so a zero-length segment reads as a round dot.
 *
 * Direction-sensitive icons come in a `-rtl` variant (the arrow of the text-direction buttons points
 * the way the text runs). Icons whose meaning is "toward the start of the line" are flagged `flip` by
 * their toolbar item and mirrored by CSS under `dir=rtl`.
 */
export const TOOLBAR_ICONS: Readonly<Record<string, readonly string[]>> = {
  undo: ["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
  redo: ["m15 14 5-5-5-5", "M20 9H9.5a5.5 5.5 0 0 0 0 11H13"],
  bold: ["M7 5h6a3.5 3.5 0 0 1 0 7H7z", "M7 12h7.5a3.5 3.5 0 0 1 0 7H7z"],
  italic: ["M10 5h8", "M6 19h8", "m14 5-4 14"],
  underline: ["M7 4v7a5 5 0 0 0 10 0V4", "M5 20h14"],
  strikethrough: ["M4 12h16", "M16.5 7.5C16 5.8 14.3 5 12 5c-2.6 0-4.5 1.2-4.5 3.2 0 1.2.6 2 1.8 2.6", "M7.5 16.5C8 18.2 9.8 19 12 19c2.6 0 4.5-1.2 4.5-3.2 0-.7-.2-1.2-.6-1.7"],
  subscript: ["m4 5 8 8", "m12 5-8 8", "M20 20h-4c0-1.5 4-2.5 4-4.5a2 2 0 0 0-4 0"],
  superscript: ["m4 11 8 8", "m12 11-8 8", "M20 10h-4c0-1.5 4-2.5 4-4.5a2 2 0 0 0-4 0"],
  code: ["m16 18 6-6-6-6", "m8 6-6 6 6 6"],
  "clear-formatting": ["M4 7V4h13v3", "M9 20h4", "m11.5 4-2 16", "m15 14 5 5", "m20 14-5 5"],
  "text-color": ["M6 16 12 4l6 12", "M8.3 12h7.4"],
  highlight: ["m14 4 6 6-8 8H6v-6z", "m11.5 6.5 6 6"],
  "bullet-list": ["M9 6h11", "M9 12h11", "M9 18h11", "!M4.5 6h.01", "!M4.5 12h.01", "!M4.5 18h.01"],
  "number-list": ["M10 6h10", "M10 12h10", "M10 18h10", "M4 5l1.2-1v4", "M4 11.3a1.4 1.4 0 0 1 2.8 0c0 1-2.8 1.8-2.8 3.2h2.9", "M4 16.6h2.6l-1.3 1.4a1.3 1.3 0 1 1-1.3 2"],
  outdent: ["M3 5h18", "M11 10h10", "M11 15h10", "M3 20h18", "m7 9-3 3 3 3"],
  indent: ["M3 5h18", "M11 10h10", "M11 15h10", "M3 20h18", "m4 9 3 3-3 3"],
  "align-start": ["M4 6h16", "M4 12h10", "M4 18h14"],
  "align-center": ["M4 6h16", "M7 12h10", "M5 18h14"],
  "align-end": ["M4 6h16", "M10 12h10", "M6 18h14"],
  "align-justify": ["M4 6h16", "M4 12h16", "M4 18h16"],
  "dir-ltr": ["M13 4v9", "M17 4v9", "M13 4H9.5a3.5 3.5 0 0 0 0 7H13", "M4 19h16", "m17 16 3 3-3 3"],
  "dir-rtl": ["M13 4v9", "M17 4v9", "M13 4H9.5a3.5 3.5 0 0 0 0 7H13", "M20 19H4", "m7 16-3 3 3 3"],
  "dir-auto": ["m7 3-4 4 4 4", "M3 7h14", "m17 13 4 4-4 4", "M21 17H7"],
  link: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
  image: ["M4 5h16v14H4z", "m4 16 5-5 4 4 2-2 5 5", "!M15.5 9.5h.01"],
  table: ["M4 5h16v14H4z", "M4 10h16", "M4 14.5h16", "M10 5v14"],
  "hijri-date": ["M4 6h16v14H4z", "M4 11h16", "M8 3v4", "M16 3v4"],
  ayat: ["M12 7c-2-1.5-5-2-8-1.5v12.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5.5C17 5 14 5.5 12 7z", "M12 7v12"],
  transliteration: ["M4 6h9", "M8.5 4v2", "M6 6c.5 3 3 5.5 6 7", "M12 6c-.5 3-3 5.5-6 7", "m13 20 4-9 4 9", "M14.6 17h4.8"],
  comment: ["M4 4h16v12H9l-5 4z", "M12 7v6", "M9 10h6"],
  diagram: ["M4 4h6v5H4z", "M14 4h6v5h-6z", "M9 15h6v5H9z", "M7 9v3h10V9", "M12 12v3"],
  more: ["!M5 12h.01", "!M12 12h.01", "!M19 12h.01"],
  chevron: ["m6 9 6 6 6-6"],
};

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Builds an icon element. Built with `createElementNS`, never `innerHTML`, so it works under a Trusted
 * Types policy. Unknown names return an empty (but still sized) svg rather than throwing.
 */
export function createIcon(name: string, options: { flip?: boolean } = {}): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "1em");
  svg.setAttribute("height", "1em");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", options.flip ? "spez-rte-icon spez-rte-icon--flip" : "spez-rte-icon");
  svg.dataset.icon = name;
  for (const raw of TOOLBAR_ICONS[name] ?? []) {
    const path = document.createElementNS(SVG_NS, "path");
    const dot = raw.startsWith("!");
    path.setAttribute("d", dot ? raw.slice(1) : raw);
    if (dot) path.setAttribute("stroke-width", "3.4");
    svg.append(path);
  }
  return svg;
}
