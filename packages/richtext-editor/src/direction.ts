import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  ElementNode,
  ParagraphNode,
  type LexicalCommand,
  type LexicalEditor,
} from "lexical";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { mergeRegister } from "@lexical/utils";

const RTL_CHAR = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
const LTR_CHAR = /[A-Za-z\u00C0-\u024F]/;

/** First-strong-character direction detection. Returns null for neutral text. */
export function detectDirection(text: string): "rtl" | "ltr" | null {
  for (const ch of text) {
    if (RTL_CHAR.test(ch)) return "rtl";
    if (LTR_CHAR.test(ch)) return "ltr";
  }
  return null;
}

/** Set explicit direction on selected top-level blocks; null re-enables auto-detection. */
export const SET_DIRECTION_COMMAND: LexicalCommand<"rtl" | "ltr" | null> =
  createCommand("SET_DIRECTION_COMMAND");

/**
 * Lexical infers block direction from typed input, but not from programmatic
 * state changes (setValue / HTML import). This transform fills the gap.
 */
export function registerAutoDirection(editor: LexicalEditor): () => void {
  const transform = (node: ElementNode): void => {
    if (node.getDirection() !== null) return;
    const dir = detectDirection(node.getTextContent());
    if (dir !== null) node.setDirection(dir);
  };
  return mergeRegister(
    editor.registerNodeTransform(ParagraphNode, transform),
    editor.registerNodeTransform(HeadingNode, transform),
    editor.registerNodeTransform(QuoteNode, transform),
  );
}

export function registerDirectionCommand(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    SET_DIRECTION_COMMAND,
    (dir) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return false;
      const tops = new Set<ElementNode>();
      for (const node of selection.getNodes()) {
        const top = node.getTopLevelElement();
        if (top !== null && $isElementNode(top)) tops.add(top);
      }
      const anchorTop = selection.anchor.getNode().getTopLevelElement();
      if (anchorTop !== null && $isElementNode(anchorTop)) tops.add(anchorTop);
      for (const el of tops) {
        el.setDirection(dir);
        if (dir === null) {
          const detected = detectDirection(el.getTextContent());
          if (detected !== null) el.setDirection(detected);
        }
      }
      return true;
    },
    COMMAND_PRIORITY_EDITOR,
  );
}
