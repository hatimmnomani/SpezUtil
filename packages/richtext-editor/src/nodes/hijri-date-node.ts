import {
  $applyNodeReplacement,
  TextNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
} from "lexical";
import { arMonthNames, formatHijri, type HijriDate } from "@spezutil/hijri-core";

export const DEFAULT_HIJRI_FORMAT = "D MMMM YYYY";

export type SerializedHijriDateNode = Spread<
  { hijri: HijriDate; datePattern: string },
  SerializedTextNode
>;

export function formatHijriDate(
  hijri: HijriDate,
  format: string = DEFAULT_HIJRI_FORMAT,
  locale: "en" | "ar" = "en",
): string {
  if (locale === "ar" && format.includes("MMMM")) {
    // \u0000 passes through formatHijri untouched and cannot occur in real text.
    return formatHijri(hijri, format.replace(/MMMM/g, "\u0000")).replace(
      /\u0000/g,
      arMonthNames[hijri.month - 1] ?? String(hijri.month),
    );
  }
  return formatHijri(hijri, format);
}

/**
 * Atomic inline Hijri date (token-mode TextNode): deletes as one unit and
 * round-trips the actual {year, month, day} payload through JSON and HTML,
 * not just its formatted string.
 */
export class HijriDateNode extends TextNode {
  __hijri: HijriDate;
  __datePattern: string;

  static getType(): string {
    return "hijri-date";
  }

  static clone(node: HijriDateNode): HijriDateNode {
    return new HijriDateNode(node.__hijri, node.__datePattern, node.__text, node.__key);
  }

  constructor(hijri: HijriDate, format: string, text?: string, key?: NodeKey) {
    super(text ?? formatHijriDate(hijri, format), key);
    this.__hijri = { ...hijri };
    this.__datePattern = format;
  }

  getHijri(): HijriDate {
    return { ...this.getLatest().__hijri };
  }

  getFormatPattern(): string {
    return this.getLatest().__datePattern;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.classList.add("spez-rte-hijri-date");
    return dom;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      time: (node: HTMLElement) =>
        node.hasAttribute("data-spez-hijri")
          ? { conversion: $convertHijriDateElement, priority: 2 as const }
          : null,
    };
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const { year, month, day } = this.__hijri;
    const element = document.createElement("time");
    element.className = "spez-rte-hijri-date";
    element.setAttribute("data-spez-hijri", `${year}-${month}-${day}`);
    element.setAttribute("data-spez-format", this.__datePattern);
    element.textContent = this.getTextContent();
    return { element };
  }

  static importJSON(serializedNode: SerializedHijriDateNode): HijriDateNode {
    return $createHijriDateNode(serializedNode.hijri, serializedNode.datePattern).updateFromJSON(
      serializedNode,
    );
  }

  exportJSON(): SerializedHijriDateNode {
    return { ...super.exportJSON(), hijri: this.getHijri(), datePattern: this.getFormatPattern() };
  }
}

function $convertHijriDateElement(element: HTMLElement): DOMConversionOutput {
  const raw = element.getAttribute("data-spez-hijri") ?? "";
  const [year = 0, month = 1, day = 1] = raw.split("-").map(Number);
  const format = element.getAttribute("data-spez-format") ?? DEFAULT_HIJRI_FORMAT;
  const node = $createHijriDateNode({ year, month, day }, format);
  const text = element.textContent;
  if (text) node.setTextContent(text);
  return { node };
}

export function $createHijriDateNode(
  hijri: HijriDate,
  format: string = DEFAULT_HIJRI_FORMAT,
  locale: "en" | "ar" = "en",
): HijriDateNode {
  const node = new HijriDateNode(hijri, format, formatHijriDate(hijri, format, locale));
  node.setMode("token");
  return $applyNodeReplacement(node);
}

export function $isHijriDateNode(node: LexicalNode | null | undefined): node is HijriDateNode {
  return node instanceof HijriDateNode;
}
