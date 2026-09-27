import { MarkNode, type SerializedMarkNode } from "@lexical/mark";
import {
  $applyNodeReplacement,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type ElementNode,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type RangeSelection,
} from "lexical";
import { isMarkId } from "../comments/mark-id";

export type SerializedCommentMarkNode = SerializedMarkNode;

/**
 * Anchor of one or more handbook comment threads (ids = mark_id ULIDs, one per thread).
 * The component stores no threads; the host owns them. Copy/paste never carries marks
 * (MarkNode.excludeFromCopy), so a mark id cannot be duplicated by pasting.
 *
 * `excludeFromCopy('html')` is inherited (true) and deliberately not overridden: getHTML()
 * flattens comment marks entirely (ids are dropped, children render un-wrapped) for the same
 * reason paste can't duplicate an id. `<span data-thread-ids="…">` is therefore an IMPORT-ONLY
 * wire form — it re-anchors a mark that arrives from outside (e.g. the backend), it is never
 * something getHTML() produces.
 */
export class CommentMarkNode extends MarkNode {
  static getType(): string {
    return "comment-mark";
  }

  static clone(node: CommentMarkNode): CommentMarkNode {
    return new CommentMarkNode(node.__ids, node.__key);
  }

  constructor(ids: readonly string[] = [], key?: NodeKey) {
    super(ids, key);
  }

  static importJSON(serializedNode: SerializedCommentMarkNode): CommentMarkNode {
    return $createCommentMarkNode([]).updateFromJSON(serializedNode);
  }

  /**
   * The backend's LexicalText.TryWrap writes only {type, version, ids, children} — format,
   * indent and direction are typed as required by SerializedElementNode but may genuinely be
   * absent on that minimal JSON at runtime, so each falls back independently rather than via a
   * blanket spread-then-default (which `serializedNode`'s required-looking type would make TS
   * treat as dead code, even though the fallback is the whole point here).
   */
  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedCommentMarkNode>): this {
    return super.updateFromJSON({
      ...serializedNode,
      format: serializedNode.format ?? "",
      indent: serializedNode.indent ?? 0,
      direction: serializedNode.direction ?? null,
      ids: (serializedNode.ids ?? []).filter((id) => typeof id === "string"),
    });
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.classList.add("spez-rte-comment");
    element.setAttribute("data-thread-ids", this.__ids.join(" "));
    return element;
  }

  updateDOM(prevNode: this, element: HTMLElement, config: EditorConfig): boolean {
    super.updateDOM(prevNode, element, config);
    element.setAttribute("data-thread-ids", this.__ids.join(" "));
    return false;
  }

  /** Only reached for destination 'clone' (excludeFromCopy) — see class docstring. */
  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-thread-ids", this.getIDs().join(" "));
    return { element };
  }

  insertNewAfter(_selection: RangeSelection, restoreSelection = true): null | ElementNode {
    const mark = $createCommentMarkNode(this.__ids);
    this.insertAfter(mark, restoreSelection);
    return mark;
  }
}

/**
 * `@lexical/mark`'s `MarkNode.importDOM()` is typed to always return `null` (it registers no DOM
 * importer of its own) — narrower than the `DOMConversionMap | null` every other Lexical node
 * uses. Overriding it in the class body would trip TS2417: the `extends` static-side check
 * requires the override's return type to be a subtype of the base's (covariant), the reverse of
 * what widening `null` back to a real conversion map needs. Assigning it as a static property
 * straight after the class isn't subject to that check, only to a normal (also-cast) assignment.
 */
(CommentMarkNode as unknown as { importDOM(): DOMConversionMap | null }).importDOM =
  (): DOMConversionMap | null => ({
    span: (node: HTMLElement) => {
      const ids = (node.getAttribute("data-thread-ids") ?? "").split(/\s+/).filter((s) => s !== "");
      if (ids.length === 0 || !ids.every(isMarkId)) return null;
      return { conversion: () => ({ node: $createCommentMarkNode(ids) }), priority: 1 as const };
    },
  });

export function $createCommentMarkNode(ids: readonly string[]): CommentMarkNode {
  return $applyNodeReplacement(new CommentMarkNode(ids));
}

export function $isCommentMarkNode(node: LexicalNode | null | undefined): node is CommentMarkNode {
  return node instanceof CommentMarkNode;
}
