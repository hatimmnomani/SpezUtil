import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { sanitizeSvg } from "../diagram/svg-sanitize";
import { withUniqueRootId } from "../diagram/svg-scope";

export type SerializedDiagramNode = Spread<
  { source: string; svg: string; drawioKey: string | null },
  SerializedLexicalNode
>;

/**
 * The only way svg markup enters a node: a unique root id first (so the scoped stylesheet
 * follows it), then the allow-list sanitizer. Renderer output, JSON and HTML import all go
 * through here; nothing else may write `__svg`.
 */
function cleanDiagramSvg(svg: string): string {
  return sanitizeSvg(withUniqueRootId(svg));
}

/** Shown for stored JSON that carries neither a source nor an svg: there is nothing to render. */
export const MISSING_SOURCE_MESSAGE = "The diagram has no source";

/** Block Mermaid diagram. `svg` is what the editor rendered from `source`; the handbook API publishes it (sanitized). */
export class DiagramNode extends DecoratorNode<HTMLElement> {
  __source: string;
  /** Always sanitized: set only through `cleanDiagramSvg`. */
  __svg: string;
  __drawioKey: string | null;
  /** Transient: last render failure; never serialized. */
  __renderError: string;

  static getType(): string {
    return "diagram";
  }

  static clone(node: DiagramNode): DiagramNode {
    const clone = new DiagramNode(node.__source, node.__svg, node.__drawioKey, node.__key);
    clone.__renderError = node.__renderError;
    return clone;
  }

  /** `svg` must already be clean: only `clone` and `$createDiagramNode` call this. */
  constructor(source: string, svg = "", drawioKey: string | null = null, key?: NodeKey) {
    super(key);
    this.__source = source;
    this.__svg = svg;
    this.__drawioKey = drawioKey;
    this.__renderError = "";
  }

  getSource(): string {
    return this.getLatest().__source;
  }
  getSvg(): string {
    return this.getLatest().__svg;
  }
  getDrawioKey(): string | null {
    return this.getLatest().__drawioKey;
  }
  getRenderError(): string {
    return this.getLatest().__renderError;
  }

  /**
   * A changed source invalidates the rendered svg; `registerDiagrams` re-renders. The render error
   * is cleared even when the source is unchanged, so re-submitting the same text after a failed
   * render (a flaky Mermaid chunk load, a renderer outage) is a retry rather than a no-op.
   */
  setSource(source: string): this {
    const self = this.getWritable();
    if (self.__source !== source) {
      self.__source = source;
      self.__svg = "";
    }
    self.__renderError = "";
    return self;
  }
  /** Stores the sanitized svg (may be `""` if nothing usable survived). */
  setSvg(svg: string): this {
    const self = this.getWritable();
    self.__svg = cleanDiagramSvg(svg);
    self.__renderError = "";
    return self;
  }
  setDrawioKey(drawioKey: string | null): this {
    const self = this.getWritable();
    self.__drawioKey = drawioKey;
    return self;
  }
  setRenderError(message: string): this {
    const self = this.getWritable();
    self.__renderError = message;
    return self;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "spez-rte-diagram";
    dom.setAttribute("data-spez-type", "diagram");
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  decorate(): HTMLElement {
    const figure = document.createElement("figure");
    figure.className = "spez-rte-diagram-figure";
    // Inline as well as in styles.ts: a root-svg transform or margin must not paint over host content.
    figure.setAttribute("style", "overflow:hidden;contain:paint");
    if (this.__svg !== "") {
      figure.innerHTML = this.__svg; // always sanitized: see cleanDiagramSvg
    } else if (this.__renderError !== "") {
      const error = document.createElement("div");
      error.className = "spez-rte-diagram-error";
      error.textContent = this.__renderError;
      const pre = document.createElement("pre");
      pre.textContent = this.__source;
      figure.append(error, pre);
    } else {
      const pending = document.createElement("div");
      pending.className = "spez-rte-diagram-pending";
      pending.textContent = "…";
      figure.append(pending);
    }
    return figure;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      figure: (node: HTMLElement) =>
        node.getAttribute("data-spez-type") === "diagram"
          ? { conversion: $convertDiagramFigure, priority: 2 as const }
          : null,
      pre: (node: HTMLElement) =>
        node.getAttribute("data-diagram") === "mermaid" &&
        node.parentElement?.getAttribute("data-spez-type") !== "diagram"
          ? { conversion: $convertMermaidPre, priority: 2 as const }
          : null,
    };
  }

  exportDOM(): DOMExportOutput {
    const figure = document.createElement("figure");
    figure.setAttribute("data-spez-type", "diagram");
    const key = this.getDrawioKey();
    if (key !== null) figure.setAttribute("data-drawio-key", key);
    const pre = document.createElement("pre");
    pre.setAttribute("data-diagram", "mermaid");
    pre.textContent = this.getSource();
    figure.append(pre);
    const svg = this.getSvg();
    if (svg !== "") figure.insertAdjacentHTML("beforeend", svg); // sanitized
    return { element: figure };
  }

  /** Every field, the svg included, is applied by `updateFromJSON` so the svg is cleaned exactly once. */
  static importJSON(serializedNode: SerializedDiagramNode): DiagramNode {
    return $createDiagramNode("").updateFromJSON(serializedNode);
  }

  /**
   * A stored `svg` (server, clipboard) is untrusted: it goes through `setSvg`. A missing or non-string
   * `source` becomes `""`; with no svg either, the node records `MISSING_SOURCE_MESSAGE` instead of
   * showing the pending placeholder forever (the mutation listener never renders a blank source).
   */
  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedDiagramNode>): this {
    const self = super.updateFromJSON(serializedNode);
    self.setSource(typeof serializedNode.source === "string" ? serializedNode.source : "");
    self.setDrawioKey(serializedNode.drawioKey ?? null);
    if (serializedNode.svg) self.setSvg(serializedNode.svg);
    if (self.getSource().trim() === "" && self.getSvg() === "") self.setRenderError(MISSING_SOURCE_MESSAGE);
    return self;
  }

  exportJSON(): SerializedDiagramNode {
    return {
      ...super.exportJSON(),
      source: this.getSource(),
      svg: this.getSvg(),
      drawioKey: this.getDrawioKey(),
    };
  }
}

function $convertDiagramFigure(element: HTMLElement): DOMConversionOutput {
  const source = element.querySelector('pre[data-diagram="mermaid"]')?.textContent ?? "";
  const svg = element.querySelector("svg");
  // XML serialization, not outerHTML: it declares the SVG namespace the sanitizer requires and
  // never emits HTML-only entities (`&nbsp;`) that an XML parse would reject.
  const markup = svg !== null ? new XMLSerializer().serializeToString(svg) : "";
  // @lexical/html drops the DOM children of a non-element node, so the inner <pre> yields no second node.
  return { node: $createDiagramNode(source, markup, element.getAttribute("data-drawio-key")) };
}

function $convertMermaidPre(element: HTMLElement): DOMConversionOutput {
  return { node: $createDiagramNode(element.textContent ?? "") };
}

export function $createDiagramNode(source: string, svg = "", drawioKey: string | null = null): DiagramNode {
  return $applyNodeReplacement(new DiagramNode(source, cleanDiagramSvg(svg), drawioKey));
}

export function $isDiagramNode(node: LexicalNode | null | undefined): node is DiagramNode {
  return node instanceof DiagramNode;
}
