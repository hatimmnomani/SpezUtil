import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { $getRoot } from "lexical";
import "./index";
import type { SpezRichtext } from "./richtext-editor";

function create(attrs: Record<string, string> = {}): SpezRichtext {
  const el = document.createElement("spez-richtext");
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("<spez-richtext>", () => {
  it("is registered and renders in light DOM (no shadow root)", () => {
    const el = create();
    expect(customElements.get("spez-richtext")).toBeDefined();
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector(".spez-rte-toolbar")).not.toBeNull();
    expect(el.querySelector('[contenteditable="true"]')).not.toBeNull();
  });

  it("injects the global stylesheet exactly once for multiple instances", () => {
    create();
    create();
    expect(document.querySelectorAll("#spez-rte-styles")).toHaveLength(1);
  });

  it("round-trips content through the value property", () => {
    const a = create();
    a.setHTML("<p>Hello world</p>");
    const json = a.value;
    expect(json).toBeTruthy();
    expect(() => JSON.parse(json!)).not.toThrow();

    const b = create();
    b.value = json;
    expect(b.getHTML()).toContain("Hello world");
  });

  it("buffers value set before connect", () => {
    const a = create();
    a.setHTML("<p>Buffered</p>");
    const json = a.value!;

    const b = document.createElement("spez-richtext");
    b.value = json;
    expect(b.value).toBe(json);
    document.body.appendChild(b);
    expect(b.getHTML()).toContain("Buffered");
  });

  it("applies initialHtml on first connect when no value was set", () => {
    const el = document.createElement("spez-richtext");
    el.initialHtml = "<p>From HTML</p>";
    document.body.appendChild(el);
    expect(el.getHTML()).toContain("From HTML");
  });

  it("emits a debounced change event with parseable JSON", () => {
    vi.useFakeTimers();
    const el = create();
    const handler = vi.fn();
    el.addEventListener("change", handler);
    el.setHTML("<p>typed</p>");
    expect(handler).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.isEmpty).toBe(false);
    expect(() => JSON.parse(detail.json)).not.toThrow();
  });

  it("does not emit change for programmatic value sets", () => {
    vi.useFakeTimers();
    const a = create();
    a.setHTML("<p>src</p>");
    const json = a.value!;
    vi.advanceTimersByTime(300);

    const b = create();
    const handler = vi.fn();
    b.addEventListener("change", handler);
    b.value = json;
    vi.advanceTimersByTime(300);
    expect(handler).not.toHaveBeenCalled();
  });

  it("readonly disables editing and hides the toolbar via CSS attr hook", () => {
    const el = create();
    el.readonly = true;
    expect(el.editor.isEditable()).toBe(false);
    expect(el.querySelector('[contenteditable="false"]')).not.toBeNull();
    el.readonly = false;
    expect(el.editor.isEditable()).toBe(true);
  });

  it("filters toolbar groups via the toolbar attribute", () => {
    const el = create({ toolbar: "inline,history" });
    const groups = [...el.querySelectorAll(".spez-rte-group")].map((g) =>
      g.getAttribute("data-group"),
    );
    expect(groups.sort()).toEqual(["history", "inline"]);
  });

  it("hides the toolbar entirely with toolbar=none", () => {
    const el = create({ toolbar: "none" });
    expect(el.querySelector(".spez-rte-toolbar")).toBeNull();
  });

  it("clear() empties the document", () => {
    const el = create();
    el.setHTML("<p>content</p>");
    el.clear();
    const text = el.editor.getEditorState().read(() => $getRoot().getTextContent());
    expect(text).toBe("");
  });

  it("preserves content across disconnect/reconnect", () => {
    const el = create();
    el.setHTML("<p>Survives</p>");
    el.remove();
    document.body.appendChild(el);
    expect(el.getHTML()).toContain("Survives");
  });

  it("shows the placeholder only while empty", () => {
    const el = create({ placeholder: "Type here" });
    const placeholder = el.querySelector(".spez-rte-placeholder") as HTMLElement;
    expect(placeholder.textContent).toBe("Type here");
    expect(placeholder.style.display).not.toBe("none");
    el.setHTML("<p>text</p>");
    expect(placeholder.style.display).toBe("none");
  });
});
