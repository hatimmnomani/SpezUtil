import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";
import { SpezRichtext } from "./index";

describe("SpezRichtext (React)", () => {
  it("renders the web component in light DOM", () => {
    const { container } = render(React.createElement(SpezRichtext, {}));
    const el = container.querySelector("spez-richtext")!;
    expect(el).not.toBeNull();
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector(".spez-rte-editor")).not.toBeNull();
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
});
