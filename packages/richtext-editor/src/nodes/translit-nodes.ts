import {
  $applyNodeReplacement,
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  DELETE_CHARACTER_COMMAND,
  ElementNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type ParagraphNode,
  type PointType,
  type RangeSelection,
  type SerializedElementNode,
  type Spread,
} from "lexical";

export type TranslitRole = "arabic" | "latin";

export type SerializedTranslitPairNode = SerializedElementNode;

export type SerializedTranslitLineNode = Spread<{ role: TranslitRole }, SerializedElementNode>;

/**
 * Container pairing an Arabic line with its transliteration. The pair moves,
 * deletes, and exports as one unit; a node transform (registered in editor.ts)
 * keeps the arabic+latin line invariant.
 */
export class TranslitPairNode extends ElementNode {
  static getType(): string {
    return "translit-pair";
  }

  static clone(node: TranslitPairNode): TranslitPairNode {
    return new TranslitPairNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "spez-rte-translit";
    dom.setAttribute("data-spez-type", "translit-pair");
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (node: HTMLElement) =>
        node.getAttribute("data-spez-type") === "translit-pair"
          ? { conversion: $convertTranslitPairElement, priority: 2 as const }
          : null,
    };
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement("div");
    element.className = "spez-rte-translit";
    element.setAttribute("data-spez-type", "translit-pair");
    return { element };
  }

  static importJSON(serializedNode: SerializedTranslitPairNode): TranslitPairNode {
    return $createTranslitPairNode().updateFromJSON(serializedNode);
  }

  canIndent(): boolean {
    return false;
  }
}

export class TranslitLineNode extends ElementNode {
  __role: TranslitRole;

  static getType(): string {
    return "translit-line";
  }

  static clone(node: TranslitLineNode): TranslitLineNode {
    return new TranslitLineNode(node.__role, node.__key);
  }

  constructor(role: TranslitRole, key?: NodeKey) {
    super(key);
    this.__role = role;
  }

  getRole(): TranslitRole {
    return this.getLatest().__role;
  }

  setRole(role: TranslitRole): this {
    const self = this.getWritable();
    self.__role = role;
    return self;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("p");
    dom.className = "spez-rte-translit-line";
    dom.setAttribute("data-role", this.__role);
    dom.dir = this.__role === "arabic" ? "rtl" : "ltr";
    return dom;
  }

  updateDOM(prevNode: this): boolean {
    return prevNode.__role !== this.__role;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      p: (node: HTMLElement) => {
        const role = node.getAttribute("data-role");
        const inPair =
          node.parentElement?.getAttribute("data-spez-type") === "translit-pair";
        return inPair && (role === "arabic" || role === "latin")
          ? {
              conversion: (el: HTMLElement): DOMConversionOutput => ({
                node: $createTranslitLineNode(
                  el.getAttribute("data-role") === "arabic" ? "arabic" : "latin",
                ),
              }),
              priority: 2 as const,
            }
          : null;
      },
    };
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement("p");
    element.className = "spez-rte-translit-line";
    element.setAttribute("data-role", this.__role);
    element.dir = this.__role === "arabic" ? "rtl" : "ltr";
    return { element };
  }

  static importJSON(serializedNode: SerializedTranslitLineNode): TranslitLineNode {
    return $createTranslitLineNode(serializedNode.role).updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedTranslitLineNode>): this {
    return super.updateFromJSON(serializedNode).setRole(serializedNode.role ?? "arabic");
  }

  exportJSON(): SerializedTranslitLineNode {
    return { ...super.exportJSON(), role: this.getRole() };
  }

  /** Enter in the arabic line jumps to the latin line; Enter in the latin line exits the pair. */
  insertNewAfter(_selection: RangeSelection, restoreSelection?: boolean): ParagraphNode | null {
    if (this.getRole() === "arabic") {
      const next = this.getNextSibling();
      if ($isTranslitLineNode(next)) {
        next.selectStart();
        return null;
      }
    }
    const paragraph = $createParagraphNode();
    const pair = this.getParent();
    (pair ?? this).insertAfter(paragraph, restoreSelection);
    return paragraph;
  }

  canIndent(): boolean {
    return false;
  }
}

function $convertTranslitPairElement(): DOMConversionOutput {
  return { node: $createTranslitPairNode() };
}

export function $createTranslitPairNode(): TranslitPairNode {
  return $applyNodeReplacement(new TranslitPairNode());
}

export function $isTranslitPairNode(
  node: LexicalNode | null | undefined,
): node is TranslitPairNode {
  return node instanceof TranslitPairNode;
}

export function $createTranslitLineNode(role: TranslitRole): TranslitLineNode {
  return $applyNodeReplacement(new TranslitLineNode(role));
}

export function $isTranslitLineNode(
  node: LexicalNode | null | undefined,
): node is TranslitLineNode {
  return node instanceof TranslitLineNode;
}

/**
 * Replaces a pair with plain paragraphs (one per line, content moved over).
 * Returns the paragraphs in document order.
 */
export function $unwrapTranslitPair(pair: TranslitPairNode): ParagraphNode[] {
  const paragraphs: ParagraphNode[] = [];
  let anchor: LexicalNode = pair;
  for (const line of pair.getChildren()) {
    const paragraph = $createParagraphNode();
    if (line instanceof ElementNode) {
      line.getChildren().forEach((child) => paragraph.append(child));
    } else {
      paragraph.append(line);
    }
    anchor.insertAfter(paragraph);
    anchor = paragraph;
    paragraphs.push(paragraph);
  }
  pair.remove();
  return paragraphs;
}

function $findTranslitLine(node: LexicalNode | null): TranslitLineNode | null {
  for (let current = node; current !== null; current = current.getParent()) {
    if ($isTranslitLineNode(current)) return current;
  }
  return null;
}

function $isAtElementStart(element: ElementNode, point: PointType): boolean {
  if (point.offset !== 0) return false;
  const node = point.getNode();
  if (node.is(element)) return true;
  const first = element.getFirstDescendant();
  return first !== null && first.is(node);
}

function $isAtElementEnd(element: ElementNode, point: PointType): boolean {
  const node = point.getNode();
  if (node.is(element)) return point.offset === element.getChildrenSize();
  const last = element.getLastDescendant();
  if (last === null || !last.is(node)) return false;
  return point.offset === node.getTextContentSize();
}

/**
 * Deletion around translit pairs. Without this, `deleteCharacter` merges a
 * line across the pair boundary and the normalizer immediately resurrects the
 * emptied line, so the pair can never be removed:
 * - backspace/forward-delete in an all-empty pair removes the whole pair
 * - backspace at the start of the latin line (or forward delete at the end of
 *   the arabic line) just moves the caret between lines instead of merging
 * - backspace at the start of the arabic line unwraps the pair into paragraphs
 * - forward delete at the end of the block before a pair steps into the pair
 */
export function registerTranslitDeletion(editor: LexicalEditor): () => void {
  return editor.registerCommand<boolean>(
    DELETE_CHARACTER_COMMAND,
    (isBackward) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
      const anchor = selection.anchor;
      const line = $findTranslitLine(anchor.getNode());

      if (line !== null) {
        const pair = line.getParent();
        if (!$isTranslitPairNode(pair)) return false;
        const atBoundary = isBackward
          ? $isAtElementStart(line, anchor)
          : $isAtElementEnd(line, anchor);
        if (!atBoundary) return false;

        if (pair.getTextContent().trim() === "") {
          const paragraph = $createParagraphNode();
          pair.replace(paragraph);
          paragraph.select();
          return true;
        }
        const sibling = isBackward ? line.getPreviousSibling() : line.getNextSibling();
        if ($isTranslitLineNode(sibling)) {
          if (isBackward) sibling.selectEnd();
          else sibling.selectStart();
          return true;
        }
        if (isBackward) {
          const paragraphs = $unwrapTranslitPair(pair);
          paragraphs[0]?.selectStart();
          return true;
        }
        return false;
      }

      if (!isBackward) {
        // Forward delete at the end of the block before a pair: step into the
        // pair instead of merging its arabic line up into this block.
        const top = anchor.getNode().getTopLevelElement();
        if (top !== null && $isAtElementEnd(top, anchor)) {
          const next = top.getNextSibling();
          if ($isTranslitPairNode(next)) {
            const first = next.getFirstChild();
            if (first instanceof ElementNode) first.selectStart();
            return true;
          }
        }
      }
      return false;
    },
    COMMAND_PRIORITY_LOW,
  );
}

/**
 * Keeps every TranslitPairNode holding exactly one arabic + one latin line
 * (in that order); an emptied pair removes itself.
 */
export function normalizeTranslitPair(node: TranslitPairNode): void {
  const children = node.getChildren();
  if (children.length === 0) {
    node.remove();
    return;
  }
  let arabic: TranslitLineNode | null = null;
  let latin: TranslitLineNode | null = null;
  for (const child of children) {
    if ($isTranslitLineNode(child)) {
      if (child.getRole() === "arabic" && arabic === null) {
        arabic = child;
        continue;
      }
      if (child.getRole() === "latin" && latin === null) {
        latin = child;
        continue;
      }
    }
  }
  for (const child of children) {
    if (child === arabic || child === latin) continue;
    // Fold strays (duplicate lines, pasted paragraphs) into the arabic line.
    if (arabic !== null && child instanceof ElementNode) {
      child.getChildren().forEach((grandchild) => arabic!.append(grandchild));
      child.remove();
    } else if (arabic !== null) {
      arabic.append(child);
    }
  }
  if (arabic === null) {
    arabic = $createTranslitLineNode("arabic");
    const first = node.getFirstChild();
    if (first !== null) first.insertBefore(arabic);
    else node.append(arabic);
  }
  if (latin === null) {
    latin = $createTranslitLineNode("latin");
    arabic.insertAfter(latin);
  }
}
