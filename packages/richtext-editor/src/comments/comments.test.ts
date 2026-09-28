import { beforeEach, describe, expect, it, vi } from "vitest";
import { $createTextNode, $getRoot, $setSelection, type ElementNode, type TextNode } from "lexical";
import { $createLudTextNode, $isLudTextNode } from "../nodes/lud-text-node";
import { $createCommentMarkNode, $isCommentMarkNode } from "../nodes/comment-mark-node";
import { flushSync, makeEditor, seedParagraph } from "../test-utils";
import {
  $commentSelection,
  ADD_COMMENT_MARK_COMMAND,
  FOCUS_COMMENT_MARK_COMMAND,
  REMOVE_COMMENT_MARK_COMMAND,
  registerComments,
} from "./comments";

const A = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
const B = "01J9ZX3M4Q8R2S5T7V9W0XYZAC";

beforeEach(() => {
  document.body.innerHTML = "";
});

function setup() {
  const { editor, root } = makeEditor();
  const onRequested = vi.fn();
  const onClicked = vi.fn();
  const controller = registerComments(editor, root, { onRequested, onClicked });
  return { editor, root, onRequested, onClicked, controller };
}

function selectText(editor: ReturnType<typeof makeEditor>["editor"], index: number, from: number, to: number) {
  editor.update(
    () => {
      const node = ($getRoot().getFirstChild() as ElementNode).getChildren()[index] as TextNode;
      node.select(from, to);
    },
    { discrete: true },
  );
}

describe("comment commands", () => {
  it("wraps the selection and reports markId, quote and context", () => {
    const { editor, onRequested } = setup();
    seedParagraph(editor, () => $createTextNode("Students must attend daily."));
    selectText(editor, 0, 14, 26);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    expect(onRequested).toHaveBeenCalledWith({
      markId: A,
      quotedText: "attend daily",
      prefix: "Students must ",
      suffix: ".\n",
    });
    const para = editor.getEditorState().toJSON().root.children[0] as any;
    expect(para.children.map((c: any) => c.type)).toEqual(["text", "comment-mark", "text"]);
  });

  it("generates a ULID when no markId is given", () => {
    const { editor, onRequested } = setup();
    seedParagraph(editor, () => $createTextNode("abc"));
    selectText(editor, 0, 0, 3);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, undefined);
    flushSync(editor);
    expect(onRequested.mock.calls[0]![0].markId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("refuses collapsed, blank and over-long selections without leaving a mark", () => {
    const { editor, onRequested } = setup();
    seedParagraph(editor, () => $createTextNode("   " + "x".repeat(1001)));
    selectText(editor, 0, 1, 1);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    selectText(editor, 0, 0, 3);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    selectText(editor, 0, 0, 1004);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    expect(onRequested).not.toHaveBeenCalled();
    expect(JSON.stringify(editor.getEditorState().toJSON())).not.toContain("comment-mark");
  });

  it("marks half of a lud-text run and both halves stay lud-text", () => {
    const { editor, onRequested } = setup();
    seedParagraph(editor, () => $createLudTextNode("ثثاك طط", "al-kanz"));
    selectText(editor, 0, 0, 3);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    expect(onRequested.mock.calls[0]![0].quotedText).toBe("ثثا");
    editor.getEditorState().read(() => {
      const [mark, rest] = ($getRoot().getFirstChild() as ElementNode).getChildren();
      expect($isCommentMarkNode(mark)).toBe(true);
      expect($isLudTextNode((mark as ElementNode).getFirstChild())).toBe(true);
      expect($isLudTextNode(rest)).toBe(true);
    });
  });

  it("removes one id and unwraps marks left with none", () => {
    const { editor } = setup();
    seedParagraph(editor, () => $createTextNode("hello world"));
    selectText(editor, 0, 0, 11);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    editor.dispatchCommand(REMOVE_COMMENT_MARK_COMMAND, A);
    flushSync(editor);
    const json = JSON.stringify(editor.getEditorState().toJSON());
    expect(json).not.toContain("comment-mark");
    expect(editor.read(() => $getRoot().getTextContent())).toBe("hello world");
  });

  it("highlights only the given ids and flags the active one", () => {
    const { editor, root, controller } = setup();
    seedParagraph(editor, () => $createTextNode("one two"));
    selectText(editor, 0, 0, 3);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    selectText(editor, 1, 1, 4);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: B });
    flushSync(editor);
    const byId = (id: string) => root.querySelector<HTMLElement>(`mark[data-thread-ids~="${id}"]`)!;
    expect(byId(A).hasAttribute("data-visible")).toBe(true); // null = all
    controller.setHighlight([B]);
    expect(byId(A).hasAttribute("data-visible")).toBe(false);
    expect(byId(B).hasAttribute("data-visible")).toBe(true);
    editor.dispatchCommand(FOCUS_COMMENT_MARK_COMMAND, B);
    flushSync(editor);
    expect(byId(B).hasAttribute("data-active")).toBe(true);
  });

  it("reports the visible thread ids under a click, nested marks included", () => {
    const { editor, root, onClicked, controller } = setup();
    seedParagraph(editor, () => $createTextNode("hello world"));
    selectText(editor, 0, 0, 11);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    editor.update(
      () => {
        const mark = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as ElementNode;
        (mark.getFirstChild() as TextNode).select(6, 11);
      },
      { discrete: true },
    );
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: B });
    flushSync(editor);
    root.querySelector<HTMLElement>(`mark[data-thread-ids="${B}"]`)!.click();
    expect(onClicked).toHaveBeenLastCalledWith({ threadIds: [B, A] });
    controller.setHighlight([A]);
    root.querySelector<HTMLElement>(`mark[data-thread-ids="${B}"]`)!.click();
    expect(onClicked).toHaveBeenLastCalledWith({ threadIds: [A] });
  });

  it("ignores a malformed FOCUS id instead of throwing", () => {
    const { editor } = setup();
    seedParagraph(editor, () => $createTextNode("hello world"));
    selectText(editor, 0, 0, 11);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    expect(() => {
      editor.dispatchCommand(FOCUS_COMMENT_MARK_COMMAND, 'not-a-ulid"]');
      flushSync(editor);
    }).not.toThrow();
  });

  it("stops responding to commands and clicks after dispose", () => {
    const { editor, root, onRequested, onClicked, controller } = setup();
    seedParagraph(editor, () => $createTextNode("hello world"));
    selectText(editor, 0, 0, 11);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    expect(onRequested).toHaveBeenCalledTimes(1);
    const markEl = root.querySelector<HTMLElement>(`mark[data-thread-ids="${A}"]`)!;

    controller.dispose();

    editor.dispatchCommand(REMOVE_COMMENT_MARK_COMMAND, A);
    flushSync(editor);
    expect(JSON.stringify(editor.getEditorState().toJSON())).toContain("comment-mark"); // unaffected: handler is gone

    markEl.click();
    expect(onClicked).not.toHaveBeenCalled();
    expect(onRequested).toHaveBeenCalledTimes(1);
  });

  it("removes one id from a two-id mark and keeps it wrapped with the other", () => {
    // A node holding two ids can arise from importing the backend's minimal
    // {type:"comment-mark", ids:[...]} JSON (global constraint 7); build that state directly
    // rather than via two ADD dispatches, which nest a new mark instead of merging ids.
    const { editor } = setup();
    seedParagraph(editor, () => {
      const mark = $createCommentMarkNode([A, B]);
      mark.append($createTextNode("hello world"));
      return mark;
    });
    editor.dispatchCommand(REMOVE_COMMENT_MARK_COMMAND, A);
    flushSync(editor);
    const para = editor.getEditorState().toJSON().root.children[0] as any;
    expect(para.children).toHaveLength(1);
    expect(para.children[0].type).toBe("comment-mark");
    expect(para.children[0].ids).toEqual([B]);
    expect(editor.read(() => $getRoot().getTextContent())).toBe("hello world");
  });

  it("$commentSelection falls back to the DOM selection when Lexical holds none", () => {
    const { editor, root } = makeEditor();
    seedParagraph(editor, () => $createTextNode("hello world"));
    flushSync(editor);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNode = walker.nextNode() as Text;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    const domSel = window.getSelection()!;
    domSel.removeAllRanges();
    domSel.addRange(range);

    let sawFallback = false;
    let text: string | null = null;
    editor.update(
      () => {
        // Drop any Lexical selection in the same update; $commentSelection must still
        // find one by reading the DOM selection set up above.
        $setSelection(null);
        const fallback = $commentSelection(editor);
        sawFallback = fallback !== null;
        text = fallback?.getTextContent() ?? null;
      },
      { discrete: true },
    );

    expect(sawFallback).toBe(true);
    expect(text).toBe("hello");
  });
});
