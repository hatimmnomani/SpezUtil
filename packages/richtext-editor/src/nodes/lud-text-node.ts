import {
  $applyNodeReplacement,
  $isTextNode,
  TextNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
  type TextFormatType,
} from "lexical";
import { familyForLudFont, fontFamilyIn, isKnownLudFont, normalizeLudFontId, withFontFamily } from "../lud-fonts";

export type SerializedLudTextNode = Spread<{ ludFont: string }, SerializedTextNode>;

const FORMAT_TAGS: ReadonlyArray<[TextFormatType, string]> = [
  ["code", "code"],
  ["subscript", "sub"],
  ["superscript", "sup"],
  ["underline", "u"],
  ["strikethrough", "s"],
  ["italic", "i"],
  ["bold", "b"],
];

/**
 * Text typed for a legacy Lisan ud-Dawat font, stored EXACTLY as typed (never converted),
 * tagged with the codec profile id it was typed in. The profile's font-family is also kept
 * in `style`, so Lexical operations that spawn plain TextNodes (splitText, paste) carry the
 * font along and lud-sync.ts can restore the lud-text type.
 */
export class LudTextNode extends TextNode {
  __ludFont: string;

  static getType(): string {
    return "lud-text";
  }

  static clone(node: LudTextNode): LudTextNode {
    return new LudTextNode(node.__text, node.__ludFont, node.__key);
  }

  constructor(text: string, ludFont: string, key?: NodeKey) {
    super(text, key);
    this.__ludFont = normalizeLudFontId(ludFont);
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__ludFont = prevNode.__ludFont;
  }

  getLudFont(): string {
    return this.getLatest().__ludFont;
  }

  setLudFont(id: string): this {
    const self = this.getWritable();
    self.__ludFont = normalizeLudFontId(id);
    return self;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.setAttribute("data-lud-font", this.__ludFont);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const recreate = super.updateDOM(prevNode, dom, config);
    if (!recreate) dom.setAttribute("data-lud-font", this.__ludFont);
    return recreate;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (node: HTMLElement) =>
        node.hasAttribute("data-lud-font")
          ? { conversion: $convertLudSpan, priority: 1 as const }
          : null,
    };
  }

  exportDOM(): DOMExportOutput {
    const span = document.createElement("span");
    span.setAttribute("data-lud-font", this.getLudFont());
    const style = this.getStyle();
    if (style !== "") span.setAttribute("style", style);
    // NOT "pre-wrap"/"pre": @lexical/html's text importer special-cases any ancestor whose
    // white-space starts with "pre" (isNodePre / findParentPreDOMNode) into a raw multi-node
    // path that discards this span's forChild conversion, so re-importing the exported HTML
    // would silently keep the text as a plain TextNode instead of round-tripping to lud-text.
    // "break-spaces" preserves runs of spaces the same way pre-wrap would for a static render,
    // without tripping that special case.
    span.style.whiteSpace = "break-spaces";
    span.textContent = this.getTextContent();
    let element: HTMLElement = span;
    for (const [format, tag] of FORMAT_TAGS) {
      if (!this.hasFormat(format)) continue;
      const wrapper = document.createElement(tag);
      wrapper.append(element);
      element = wrapper;
    }
    return { element };
  }

  /** No style is pre-computed here: `updateFromJSON` derives the family only when the JSON has none. */
  static importJSON(serializedNode: SerializedLudTextNode): LudTextNode {
    return $applyNodeReplacement(new LudTextNode(serializedNode.text, serializedNode.ludFont)).updateFromJSON(
      serializedNode,
    );
  }

  /**
   * A stored node may carry no `font-family` (the backend writes the minimal shape, and hand-edited
   * JSON drops the redundant style): the profile family is restored so the text renders in its font
   * and lud-sync sees a family that agrees with `ludFont`. A family the JSON does carry is kept as
   * is, and nothing is written for a profile this build does not know (see `isKnownLudFont`).
   *
   * The minimal shape may omit `style` altogether (or send null): TextNode.updateFromJSON would copy
   * that into `__style` verbatim and every later style read would throw, so a non-string style is
   * read as "" first. `format`, `detail` and `mode` get the same TextNode defaults for the same reason.
   */
  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedLudTextNode>): this {
    // Typed as required, but genuinely absent on the backend's minimal JSON at runtime.
    const raw = serializedNode as Partial<LexicalUpdateJSON<SerializedLudTextNode>>;
    const self = super
      .updateFromJSON({
        ...serializedNode,
        style: typeof raw.style === "string" ? raw.style : "",
        format: typeof raw.format === "number" ? raw.format : 0,
        detail: typeof raw.detail === "number" ? raw.detail : 0,
        mode: raw.mode ?? "normal",
      })
      .setLudFont(serializedNode.ludFont);
    const ludFont = self.getLudFont();
    if (fontFamilyIn(self.getStyle()) === "" && isKnownLudFont(ludFont)) {
      self.setStyle(withFontFamily(self.getStyle(), familyForLudFont(ludFont)));
    }
    return self;
  }

  exportJSON(): SerializedLudTextNode {
    return { ...super.exportJSON(), type: "lud-text", ludFont: this.getLudFont() };
  }
}

function $convertLudSpan(element: HTMLElement): DOMConversionOutput {
  const ludFont = normalizeLudFontId(element.getAttribute("data-lud-font"));
  const extra = ["color", "background-color", "font-size"]
    .map((prop) => {
      const value = element.style.getPropertyValue(prop);
      return value === "" ? "" : `${prop}: ${value};`;
    })
    .filter((s) => s !== "")
    .join(" ");
  return {
    node: null,
    forChild: (child) => {
      if (!$isTextNode(child) || $isLudTextNode(child)) return child;
      const lud = $createLudTextNode(child.getTextContent(), ludFont);
      lud.setFormat(child.getFormat());
      if (extra !== "") lud.setStyle(`${lud.getStyle()} ${extra}`);
      return lud;
    },
  };
}

export function $createLudTextNode(text: string, ludFont: string): LudTextNode {
  const node = new LudTextNode(text, ludFont);
  node.setStyle(`font-family: ${familyForLudFont(node.__ludFont)};`);
  return $applyNodeReplacement(node);
}

export function $isLudTextNode(node: LexicalNode | null | undefined): node is LudTextNode {
  return node instanceof LudTextNode;
}
