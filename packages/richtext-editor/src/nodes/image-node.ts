import {
  $applyNodeReplacement,
  createCommand,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";

export interface InsertImagePayload {
  src: string;
  alt?: string;
}

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand("INSERT_IMAGE_COMMAND");

export type SerializedImageNode = Spread<{ src: string; alt: string }, SerializedLexicalNode>;

/** Block image referenced by URL. */
export class ImageNode extends DecoratorNode<HTMLElement> {
  __src: string;
  __alt: string;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__key);
  }

  constructor(src: string, alt: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }

  getSrc(): string {
    return this.getLatest().__src;
  }

  getAlt(): string {
    return this.getLatest().__alt;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "spez-rte-image";
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  decorate(): HTMLElement {
    const img = document.createElement("img");
    img.src = this.__src;
    img.alt = this.__alt;
    return img;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({ conversion: $convertImageElement, priority: 0 as const }),
    };
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement("img");
    element.setAttribute("src", this.__src);
    if (this.__alt) element.setAttribute("alt", this.__alt);
    return { element };
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode(serializedNode.src, serializedNode.alt).updateFromJSON(
      serializedNode,
    );
  }

  exportJSON(): SerializedImageNode {
    return { ...super.exportJSON(), src: this.getSrc(), alt: this.getAlt() };
  }
}

function $convertImageElement(element: HTMLElement): DOMConversionOutput {
  const img = element as HTMLImageElement;
  return { node: $createImageNode(img.getAttribute("src") ?? "", img.getAttribute("alt") ?? "") };
}

export function $createImageNode(src: string, alt = ""): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, alt));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
