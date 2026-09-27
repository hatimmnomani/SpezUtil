import { $getRoot, $isElementNode, type LexicalNode } from "lexical";
import { $isCommentMarkNode } from "../nodes/comment-mark-node";

export const ANCHOR_CONTEXT_CHARS = 32;
export const MAX_QUOTE_CHARS = 1000;

export interface CommentRequestDetail {
  markId: string;
  quotedText: string;
  prefix: string;
  suffix: string;
}

/** Keep in lockstep with LexicalText.Blocks in the handbook API (Services/Handbook/Comments/LexicalText.cs). */
const BLOCKS = new Set(["paragraph", "heading", "listitem", "quote", "tablecell"]);

export interface AnchorIndex {
  plain: string;
  marks: Map<string, { start: number; end: number }>;
}

export function $buildAnchorIndex(): AnchorIndex {
  const parts: string[] = [];
  let length = 0;
  const marks = new Map<string, { start: number; end: number }>();
  const push = (s: string) => {
    parts.push(s);
    length += s.length;
  };
  const walk = (node: LexicalNode): void => {
    if (!$isElementNode(node)) return;
    for (const child of node.getChildren()) {
      const type = child.getType();
      if (type === "text" || type === "lud-text") {
        push(child.getTextContent());
      } else if (type === "linebreak") {
        push("\n");
      } else {
        const start = length;
        walk(child);
        if ($isCommentMarkNode(child)) {
          for (const id of child.getIDs()) {
            const seen = marks.get(id);
            marks.set(id, { start: seen ? Math.min(seen.start, start) : start, end: length });
          }
        }
        if (BLOCKS.has(type)) push("\n");
      }
    }
  };
  walk($getRoot());
  return { plain: parts.join(""), marks };
}

export function $commentAnchor(markId: string): CommentRequestDetail | null {
  const { plain, marks } = $buildAnchorIndex();
  const range = marks.get(markId);
  if (range === undefined) return null;
  return {
    markId,
    quotedText: plain.slice(range.start, range.end),
    prefix: plain.slice(Math.max(0, range.start - ANCHOR_CONTEXT_CHARS), range.start),
    suffix: plain.slice(range.end, range.end + ANCHOR_CONTEXT_CHARS),
  };
}

export function isQuoteAcceptable(quotedText: string): boolean {
  const n = quotedText.trim().length;
  return n >= 1 && n <= MAX_QUOTE_CHARS;
}
