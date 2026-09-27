import { $unwrapMarkNode, $wrapSelectionInMarkNode } from "@lexical/mark";
import { $dfs, mergeRegister } from "@lexical/utils";
import {
  $createRangeSelectionFromDom,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalCommand,
  type LexicalEditor,
  type RangeSelection,
} from "lexical";
import { $createCommentMarkNode, $isCommentMarkNode } from "../nodes/comment-mark-node";
import { $commentAnchor, isQuoteAcceptable, type CommentRequestDetail } from "./anchor";
import { generateMarkId } from "./mark-id";

export const ADD_COMMENT_MARK_COMMAND: LexicalCommand<{ markId?: string } | undefined> =
  createCommand("ADD_COMMENT_MARK_COMMAND");
export const REMOVE_COMMENT_MARK_COMMAND: LexicalCommand<string> = createCommand("REMOVE_COMMENT_MARK_COMMAND");
export const FOCUS_COMMENT_MARK_COMMAND: LexicalCommand<string> = createCommand("FOCUS_COMMENT_MARK_COMMAND");

export interface CommentClickDetail {
  threadIds: string[];
}

export interface CommentHandlers {
  onRequested(detail: CommentRequestDetail): void;
  onClicked(detail: CommentClickDetail): void;
}

export interface CommentsController {
  dispose(): void;
  setHighlight(ids: readonly string[] | null): void;
  setActive(id: string | null): void;
}

function $removeMarkId(id: string): void {
  for (const { node } of $dfs()) {
    if (!$isCommentMarkNode(node) || !node.hasID(id)) continue;
    node.deleteID(id);
    if (node.getIDs().length === 0) $unwrapMarkNode(node);
  }
}

/** Read-only editors may hold no Lexical selection; fall back to the DOM selection. */
function $commentSelection(editor: LexicalEditor): RangeSelection | null {
  const selection = $getSelection();
  if ($isRangeSelection(selection) && !selection.isCollapsed()) return selection;
  const dom = editor._window?.getSelection() ?? (typeof window !== "undefined" ? window.getSelection() : null);
  if (dom === null || dom.rangeCount === 0 || dom.isCollapsed) return null;
  const fromDom = $createRangeSelectionFromDom(dom, editor);
  return fromDom !== null && !fromDom.isCollapsed() ? fromDom : null;
}

const idsOf = (el: Element): string[] =>
  (el.getAttribute("data-thread-ids") ?? "").split(/\s+/).filter((s) => s !== "");

export function registerComments(
  editor: LexicalEditor,
  root: HTMLElement,
  handlers: CommentHandlers,
): CommentsController {
  let highlight: Set<string> | null = null;
  let active: string | null = null;
  let pending: CommentRequestDetail | null = null;

  const isVisible = (id: string) => highlight === null || highlight.has(id);

  const apply = () => {
    for (const el of root.querySelectorAll<HTMLElement>("mark.spez-rte-comment")) {
      const ids = idsOf(el);
      el.toggleAttribute("data-visible", ids.some(isVisible));
      el.toggleAttribute("data-active", active !== null && ids.includes(active) && isVisible(active));
    }
  };

  const onClick = (event: MouseEvent) => {
    const ids: string[] = [];
    let el = (event.target as Element | null)?.closest?.("mark.spez-rte-comment") ?? null;
    while (el !== null && root.contains(el)) {
      for (const id of idsOf(el)) if (isVisible(id) && !ids.includes(id)) ids.push(id);
      el = el.parentElement?.closest("mark.spez-rte-comment") ?? null;
    }
    if (ids.length > 0) handlers.onClicked({ threadIds: ids });
  };
  root.addEventListener("click", onClick);

  const dispose = mergeRegister(
    editor.registerCommand(
      ADD_COMMENT_MARK_COMMAND,
      (payload) => {
        const selection = $commentSelection(editor);
        if (selection === null) return false;
        const markId = payload?.markId ?? generateMarkId();
        $wrapSelectionInMarkNode(selection, selection.isBackward(), markId, (ids) => $createCommentMarkNode(ids));
        const detail = $commentAnchor(markId);
        if (detail === null || !isQuoteAcceptable(detail.quotedText)) {
          $removeMarkId(markId);
          return true;
        }
        pending = detail;
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      REMOVE_COMMENT_MARK_COMMAND,
      (id) => {
        $removeMarkId(id);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      FOCUS_COMMENT_MARK_COMMAND,
      (id) => {
        active = id;
        apply();
        const sel = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;
        const el = root.querySelector<HTMLElement>(`mark.spez-rte-comment[data-thread-ids~="${sel}"]`);
        el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerUpdateListener(() => {
      apply();
      if (pending !== null) {
        const detail = pending;
        pending = null;
        handlers.onRequested(detail);
      }
    }),
    () => root.removeEventListener("click", onClick),
  );

  return {
    dispose,
    setHighlight(ids) {
      highlight = ids === null ? null : new Set(ids);
      apply();
    },
    setActive(id) {
      active = id;
      apply();
    },
  };
}
