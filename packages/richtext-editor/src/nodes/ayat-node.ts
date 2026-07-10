import {
  $applyNodeReplacement,
  $createParagraphNode,
  ElementNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type ParagraphNode,
  type RangeSelection,
  type SerializedElementNode,
} from "lexical";

export type SerializedAyatNode = SerializedElementNode;

function $convertAyatElement(): DOMConversionOutput {
  return { node: $createAyatNode() };
}

/**
 * Block container for Quranic ayat / kalemat nooraniyah. Behaves like a quote
 * (inline children, Enter at end exits to a paragraph) with distinct styling.
 */
export class AyatNode extends ElementNode {
  static getType(): string {
    return "ayat";
  }

  static clone(node: AyatNode): AyatNode {
    return new AyatNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
    // Ayat content is always Arabic; fix the direction in editor state so the
    // reconciler renders dir="rtl" instead of falling back to dir="auto".
    this.__dir = "rtl";
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "spez-rte-ayat";
    dom.dir = "rtl";
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    const match = (node: HTMLElement) =>
      node.getAttribute("data-spez-type") === "ayat"
        ? { conversion: $convertAyatElement, priority: 2 as const }
        : null;
    return { blockquote: match, div: match };
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement("blockquote");
    element.className = "spez-rte-ayat";
    element.setAttribute("data-spez-type", "ayat");
    element.dir = "rtl";
    return { element };
  }

  static importJSON(serializedNode: SerializedAyatNode): AyatNode {
    return $createAyatNode().updateFromJSON(serializedNode);
  }

  insertNewAfter(_selection: RangeSelection, restoreSelection?: boolean): ParagraphNode {
    const paragraph = $createParagraphNode();
    paragraph.setDirection(this.getDirection());
    this.insertAfter(paragraph, restoreSelection);
    return paragraph;
  }

  collapseAtStart(): boolean {
    const paragraph = $createParagraphNode();
    this.getChildren().forEach((child) => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }

  canIndent(): boolean {
    return false;
  }
}

export function $createAyatNode(): AyatNode {
  return $applyNodeReplacement(new AyatNode());
}

export function $isAyatNode(node: LexicalNode | null | undefined): node is AyatNode {
  return node instanceof AyatNode;
}
