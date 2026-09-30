import { HeadingNode, type HeadingTagType, type SerializedHeadingNode } from "@lexical/rich-text";
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $setDirectionFromDOM,
  $setFormatFromDOM,
  isHTMLElement,
  setNodeIndentFromDOM,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type RangeSelection,
  type Spread,
} from "lexical";

/** `anchor` is optional: a heading without one serializes exactly like the stock HeadingNode. */
export type SerializedAnchorHeadingNode = Spread<{ anchor?: string }, SerializedHeadingNode>;

/** Same cap as the handbook API's HandbookLimits.SlugMax. */
const ANCHOR_ID_MAX = 160;

/**
 * The DOM id for a stored anchor, or null when it has no slug characters. Mirrors the handbook
 * API's HandbookSlug: ASCII lowercase letters and digits joined by single dashes, accents folded,
 * so an anchor the API accepts renders unchanged and anything else cannot inject markup.
 */
export function headingAnchorId(anchor: string | null | undefined): string | null {
  if (typeof anchor !== "string") return null;
  const slug = anchor
    .normalize("NFKD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const capped = slug.length > ANCHOR_ID_MAX ? slug.slice(0, ANCHOR_ID_MAX).replace(/-+$/, "") : slug;
  return capped === "" ? null : capped;
}

const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/**
 * The stock heading plus the handbook importer's explicit `anchor` (an id that may differ from
 * the text slug, e.g. dedup `-2` suffixes), which the stock HeadingNode drops on the first save.
 *
 * It keeps the type `heading` and REPLACES the stock class in EDITOR_NODES (Lexical cannot
 * register two classes for one type, and a node replacement would have to change the type).
 * `$isHeadingNode` still matches it; create headings with `$createAnchorHeadingNode`, because the
 * stock `$createHeadingNode` builds a class this editor does not register.
 *
 * The anchor is stored verbatim; only the rendered id is sanitised (`headingAnchorId`). A split
 * (Enter mid-heading) never copies it, so one anchor cannot become two ids.
 */
export class AnchorHeadingNode extends HeadingNode {
  __anchor: string | null;

  static getType(): string {
    return "heading";
  }

  static clone(node: AnchorHeadingNode): AnchorHeadingNode {
    const clone = new AnchorHeadingNode(node.__tag, node.__key);
    clone.__anchor = node.__anchor;
    return clone;
  }

  constructor(tag: HeadingTagType = "h1", key?: NodeKey) {
    super(tag, key);
    this.__anchor = null;
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__anchor = prevNode.__anchor;
  }

  getAnchor(): string | null {
    return this.getLatest().__anchor;
  }

  setAnchor(anchor: string | null | undefined): this {
    const self = this.getWritable();
    self.__anchor = typeof anchor === "string" && anchor !== "" ? anchor : null;
    return self;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    applyId(dom, this.__anchor);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const recreate = super.updateDOM(prevNode, dom, config);
    if (!recreate && prevNode.__anchor !== this.__anchor) applyId(dom, this.__anchor);
    return recreate;
  }

  static importDOM(): DOMConversionMap | null {
    const map: DOMConversionMap = { ...(HeadingNode.importDOM?.() ?? {}) };
    for (const tag of HEADING_TAGS) {
      map[tag] = () => ({ conversion: $convertHeadingElement, priority: 0 });
    }
    // The stock Google Docs title rule (span at 26pt) builds a stock HeadingNode.
    const stockSpan = map.span;
    map.span = (node: HTMLElement) => {
      const match = stockSpan?.(node);
      return match ? { ...match, conversion: () => ({ node: $createAnchorHeadingNode("h1") }) } : null;
    };
    return map;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const output = super.exportDOM(editor);
    if (isHTMLElement(output.element)) applyId(output.element, this.getAnchor());
    return output;
  }

  static importJSON(serializedNode: SerializedAnchorHeadingNode): AnchorHeadingNode {
    return $createAnchorHeadingNode(serializedNode.tag).updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedAnchorHeadingNode>): this {
    return super.updateFromJSON(serializedNode).setAnchor(serializedNode.anchor);
  }

  exportJSON(): SerializedAnchorHeadingNode {
    const json: SerializedAnchorHeadingNode = super.exportJSON();
    const anchor = this.getAnchor();
    if (anchor !== null) json.anchor = anchor;
    return json;
  }

  /** Stock logic, but the split-off heading is ours (and carries no anchor). */
  insertNewAfter(selection?: RangeSelection, restoreSelection = true): AnchorHeadingNode | ReturnType<typeof $createParagraphNode> {
    const anchorOffset = selection ? selection.anchor.offset : 0;
    const lastDesc = this.getLastDescendant();
    const isAtEnd =
      !lastDesc ||
      (selection && selection.anchor.key === lastDesc.getKey() && anchorOffset === lastDesc.getTextContentSize());
    const newElement = isAtEnd || !selection ? $createParagraphNode() : $createAnchorHeadingNode(this.getTag());
    newElement.setDirection(this.getDirection());
    this.insertAfter(newElement, restoreSelection);
    if (anchorOffset === 0 && !this.isEmpty() && selection) {
      const paragraph = $createParagraphNode();
      paragraph.select();
      this.replace(paragraph, true);
    }
    return newElement;
  }
}

function applyId(element: HTMLElement, anchor: string | null): void {
  const id = headingAnchorId(anchor);
  if (id === null) element.removeAttribute("id");
  else element.id = id;
}

/**
 * Same as the stock conversion (indent, alignment, direction). A pasted element's `id` is NOT
 * read as an anchor: anchors come from the handbook importer, not from arbitrary web pages.
 */
function $convertHeadingElement(element: HTMLElement): DOMConversionOutput {
  const tag = element.nodeName.toLowerCase() as HeadingTagType;
  const node = $createAnchorHeadingNode(tag);
  setNodeIndentFromDOM(element, node);
  $setFormatFromDOM(node, element);
  $setDirectionFromDOM(node, element);
  return { node };
}

export function $createAnchorHeadingNode(tag: HeadingTagType = "h1"): AnchorHeadingNode {
  return $applyNodeReplacement(new AnchorHeadingNode(tag));
}

export function $isAnchorHeadingNode(node: LexicalNode | null | undefined): node is AnchorHeadingNode {
  return node instanceof AnchorHeadingNode;
}
