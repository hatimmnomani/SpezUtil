import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";
import { SpezRichtext, type FontOption, type FontSizeOption } from "./index";

// Type-level parity with the Angular wrapper's public API: both re-export the toolbar option types.
const _fontSizeOption: FontSizeOption = { label: "16", size: "16px" };
const _fontOption: FontOption = { label: "Amiri", family: "Amiri" };
void _fontSizeOption;
void _fontOption;

describe("SpezRichtext (React)", () => {
  it("renders the web component in light DOM", () => {
    const { container } = render(React.createElement(SpezRichtext, {}));
    const el = container.querySelector("spez-richtext")!;
    expect(el).not.toBeNull();
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector(".spez-rte-editor")).not.toBeNull();
  });

  it("forwards the tableTools property", () => {
    const { container } = render(React.createElement(SpezRichtext, { tableTools: false }));
    const el = container.querySelector("spez-richtext")!;
    expect(el.tableTools).toBe(false);
  });

  it("forwards the initialHtml property", () => {
    const { container } = render(
      React.createElement(SpezRichtext, { initialHtml: "<p>Salaam</p>" }),
    );
    const el = container.querySelector("spez-richtext")!;
    expect(el.getHTML()).toContain("Salaam");
  });

  it("fires a typed onChange after an edit", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(React.createElement(SpezRichtext, { onChange }));
    const el = container.querySelector("spez-richtext")!;
    el.setHTML("<p>edited</p>");
    vi.advanceTimersByTime(300);
    expect(onChange).toHaveBeenCalledTimes(1);
    const detail = (onChange.mock.calls[0]![0] as CustomEvent).detail;
    expect(() => JSON.parse(detail.json)).not.toThrow();
    vi.useRealTimers();
  });

  it("forwards highlightMarks and fires onCommentClicked", () => {
    const A = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
    const onCommentClicked = vi.fn();
    const { container } = render(
      React.createElement(SpezRichtext, {
        highlightMarks: [A],
        initialHtml: `<p><span data-thread-ids="${A}">marked</span></p>`,
        onCommentClicked,
      }),
    );
    const el = container.querySelector("spez-richtext")!;
    expect(el.highlightMarks).toEqual([A]);
    const mark = el.querySelector<HTMLElement>("mark.spez-rte-comment")!;
    expect(mark.hasAttribute("data-visible")).toBe(true);
    mark.click();
    expect((onCommentClicked.mock.calls[0]![0] as CustomEvent).detail).toEqual({ threadIds: [A] });
  });

  it("fires onCommentRequested from addCommentMark", () => {
    const onCommentRequested = vi.fn();
    const { container } = render(React.createElement(SpezRichtext, { initialHtml: "<p>abc</p>", onCommentRequested }));
    const el = container.querySelector("spez-richtext")!;
    // Select "abc" through the DOM, as a reader would; addCommentMark falls back to it.
    const range = document.createRange();
    const text = el.querySelector(".spez-rte-editor p span")!.firstChild!;
    range.setStart(text, 0);
    range.setEnd(text, 3);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    el.addCommentMark();
    expect(onCommentRequested).toHaveBeenCalledTimes(1);
  });

  it("forwards the toolbar API: config, mode and pinning", () => {
    const { container, rerender } = render(
      React.createElement(SpezRichtext, {
        toolbarConfig: { groups: ["history", "inline"], more: false },
        toolbarMode: "sticky",
      } as never),
    );
    const el = container.querySelector("spez-richtext")!;
    expect([...el.querySelectorAll(".spez-rte-toolbar > .spez-rte-group")].map((g) => g.getAttribute("data-group"))).toEqual([
      "history",
      "inline",
    ]);
    expect(el.toolbarMode).toBe("sticky");
    rerender(React.createElement(SpezRichtext, { toolbarMode: "focus", toolbarPinned: true } as never));
    expect(el.toolbarMode).toBe("focus");
    expect(el.toolbarPinned).toBe(true);
  });
});
