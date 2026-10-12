/**
 * Monoline 16x16 icons for the table UI. They draw with `currentColor`, so they follow the button's
 * colour (and its pressed / disabled states) with no extra CSS. Built with createElementNS rather than
 * innerHTML so no markup is ever parsed.
 */
const SVG_NS = "http://www.w3.org/2000/svg";

type Shape = readonly [tag: "path" | "rect" | "circle", attrs: Readonly<Record<string, string | number>>];

const p = (d: string): Shape => ["path", { d }];
const r = (x: number, y: number, w: number, h: number, rx = 1.5): Shape => [
  "rect",
  { x, y, width: w, height: h, rx },
];
/** A translucent fill used to mark the row / column / cell an icon acts on. */
const band = (x: number, y: number, w: number, h: number): Shape => [
  "rect",
  { x, y, width: w, height: h, fill: "currentColor", "fill-opacity": 0.28, stroke: "none" },
];
const dot = (cx: number, cy: number): Shape => [
  "circle",
  { cx, cy, r: 1.15, fill: "currentColor", stroke: "none" },
];

const FRAME = r(2, 2, 12, 12);
const PLUS_TOP = p("M8 1.6V5.2M6.2 3.4H9.8");

export const TABLE_ICONS = {
  rowAbove: [r(2, 8, 12, 6), p("M2 11H14"), PLUS_TOP],
  rowBelow: [r(2, 2, 12, 6), p("M2 5H14"), p("M8 10.8V14.4M6.2 12.6H9.8")],
  colLeft: [r(8, 2, 6, 12), p("M8 6H14M8 10H14"), p("M1.6 8H5.2M3.4 6.2V9.8")],
  colRight: [r(2, 2, 6, 12), p("M2 6H8M2 10H8"), p("M10.8 8H14.4M12.6 6.2V9.8")],
  deleteRow: [FRAME, p("M2 6H14M2 10H14"), band(2, 6, 12, 4), p("M5.5 8H10.5")],
  deleteColumn: [FRAME, p("M6 2V14M10 2V14"), band(6, 2, 4, 12), p("M8 5.5V10.5")],
  deleteTable: [p("M3 4.5H13M6 4.5V3H10V4.5M4.4 4.5L5 13H11L11.6 4.5M7 7V10.5M9 7V10.5")],
  merge: [r(2, 3, 12, 10), p("M4 6.6L5.9 8L4 9.4M12 6.6L10.1 8L12 9.4M8 5V6.2M8 9.8V11")],
  split: [r(2, 3, 12, 10), p("M8 3V13"), p("M6.2 6.6L4.3 8L6.2 9.4M9.8 6.6L11.7 8L9.8 9.4")],
  headerRow: [FRAME, p("M2 6H14M2 10H14M6 6V14M10 6V14"), band(2, 2, 12, 4)],
  headerColumn: [FRAME, p("M6 2V14M10 2V14M6 6H14M6 10H14"), band(2, 2, 4, 12)],
  fill: [p("M3.6 9.6L8 5.2L12.4 9.6L8.4 13.6Z"), p("M5.6 3.6L8 6"), p("M13.6 10.6C14.3 11.5 14.6 12 14.6 12.5A1 1 0 0 1 12.6 12.5C12.6 12 12.9 11.5 13.6 10.6Z")],
  cellAlign: [p("M3 4H13M3 7H10M3 10H13M3 13H8")],
  alignStart: [p("M3 4H13M3 7H9M3 10H13M3 13H9")],
  alignCenter: [p("M3 4H13M5 7H11M3 10H13M5 13H11")],
  alignEnd: [p("M3 4H13M7 7H13M3 10H13M7 13H13")],
  alignJustify: [p("M3 4H13M3 7H13M3 10H13M3 13H10")],
  vTop: [FRAME, p("M5 5H11M5 7.5H9")],
  vMiddle: [FRAME, p("M5 6.4H11M5 9.6H9")],
  vBottom: [FRAME, p("M5 8.5H11M5 11H9")],
  plus: [p("M8 3.5V12.5M3.5 8H12.5")],
  gripH: [dot(4.5, 8), dot(8, 8), dot(11.5, 8)],
  gripV: [dot(8, 4.5), dot(8, 8), dot(8, 11.5)],
  chevron: [p("M4.5 6.5L8 10L11.5 6.5")],
  clear: [r(2, 4, 12, 8), p("M5.6 6.6L10.4 9.4M10.4 6.6L5.6 9.4")],
  arrowUp: [p("M8 13V3.5M4.2 7.3L8 3.5L11.8 7.3")],
  arrowDown: [p("M8 3V12.5M4.2 8.7L8 12.5L11.8 8.7")],
  arrowLeft: [p("M13 8H3.5M7.3 4.2L3.5 8L7.3 11.8")],
  arrowRight: [p("M3 8H12.5M8.7 4.2L12.5 8L8.7 11.8")],
  width: [p("M2.5 3V13M13.5 3V13M5 8H11M6.8 6.2L5 8L6.8 9.8M9.2 6.2L11 8L9.2 9.8")],
  table: [FRAME, p("M2 6H14M6 6V14")],
} as const satisfies Record<string, readonly Shape[]>;

export type TableIconName = keyof typeof TABLE_ICONS;

export function tableIcon(name: TableIconName): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.4");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("spez-rte-ticon", `spez-rte-ticon-${name}`);
  for (const [tag, attrs] of TABLE_ICONS[name]) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.append(el);
  }
  return svg;
}
