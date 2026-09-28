import { beforeEach, describe, expect, it, vi } from "vitest";
import { $getRoot, type ElementNode, type TextNode } from "lexical";
import "./index";
import type { SpezRichtext } from "./richtext-editor";

const A = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
const B = "01J9ZX3M4Q8R2S5T7V9W0XYZAC";

function create(attrs: Record<string, string> = {}): SpezRichtext {
  const el = document.createElement("spez-richtext");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function select(el: SpezRichtext, from: number, to: number) {
  el.editor.update(
    () => (($getRoot().getFirstChild() as ElementNode).getFirstChild() as TextNode).select(from, to),
    { discrete: true },
  );
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("<spez-richtext> comments", () => {
  it("addCommentMark fires comment-requested and returns the same detail", () => {
    const el = create();
    el.setHTML("<p>Students must attend daily.</p>");
    select(el, 14, 26);
    const handler = vi.fn();
    el.addEventListener("comment-requested", handler);
    const detail = el.addCommentMark(A);
    expect(detail).toEqual({ markId: A, quotedText: "attend daily", prefix: "Students must ", suffix: ".\n" });
    expect(handler.mock.calls[0]![0].detail).toEqual(detail);
    expect(el.getJSON()).toContain('"type":"comment-mark"');
  });

  it("returns null and fires nothing for a collapsed selection", () => {
    const el = create();
    el.setHTML("<p>abc</p>");
    select(el, 1, 1);
    const handler = vi.fn();
    el.addEventListener("comment-requested", handler);
    expect(el.addCommentMark(A)).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it("the comment toolbar button is opt-in and adds a mark", () => {
    expect(create().querySelector('[data-group="comment"]')).toBeNull();
    const el = create({ toolbar: "comment" });
    el.setHTML("<p>abc</p>");
    select(el, 0, 3);
    const handler = vi.fn();
    el.addEventListener("comment-requested", handler);
    el.querySelector<HTMLButtonElement>('[data-group="comment"] button')!.click();
    el.editor.update(() => {}, { discrete: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("read-only: highlights only highlightMarks, emits comment-clicked, and still anchors from the DOM selection", () => {
    const el = create();
    el.setValue(
      JSON.stringify({
        root: {
          type: "root", version: 1, direction: null, format: "", indent: 0,
          children: [{
            type: "paragraph", version: 1, direction: null, format: "", indent: 0, textFormat: 0, textStyle: "",
            children: [
              { type: "comment-mark", version: 1, ids: [A], children: [{ type: "text", version: 1, text: "first", detail: 0, format: 0, mode: "normal", style: "" }] },
              { type: "text", version: 1, text: " middle ", detail: 0, format: 0, mode: "normal", style: "" },
              { type: "comment-mark", version: 1, ids: [B], children: [{ type: "text", version: 1, text: "second", detail: 0, format: 0, mode: "normal", style: "" }] },
            ],
          }],
        },
      }),
    );
    el.readonly = true;
    el.highlightMarks = [B];
    el.activeMark = B;
    const a = el.querySelector<HTMLElement>(`mark[data-thread-ids="${A}"]`)!;
    const b = el.querySelector<HTMLElement>(`mark[data-thread-ids="${B}"]`)!;
    expect(a.hasAttribute("data-visible")).toBe(false);
    expect(b.hasAttribute("data-visible")).toBe(true);
    expect(b.hasAttribute("data-active")).toBe(true);

    const clicked = vi.fn();
    el.addEventListener("comment-clicked", clicked);
    a.click();
    expect(clicked).not.toHaveBeenCalled(); // invisible thread
    b.click();
    expect(clicked.mock.calls[0]![0].detail).toEqual({ threadIds: [B] });

    // Reader selects " middle " in the DOM; Lexical holds no selection in read-only.
    const textNode = a.nextSibling!.firstChild ?? a.nextSibling!;
    const range = document.createRange();
    range.setStart(textNode, 1);
    range.setEnd(textNode, 7);
    const domSel = window.getSelection()!;
    domSel.removeAllRanges();
    domSel.addRange(range);
    el.editor.update(() => { /* drop any Lexical selection */ }, { discrete: true });
    const detail = el.addCommentMark();
    expect(detail?.quotedText).toBe("middle");
    expect(detail?.prefix).toBe("first ");
  });
});
