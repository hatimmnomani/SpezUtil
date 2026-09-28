import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./index";
import { setDiagramRenderer } from "./index";
import type { SpezRichtext } from "./richtext-editor";

function create(attrs: Record<string, string> = {}): SpezRichtext {
  const el = document.createElement("spez-richtext");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
  setDiagramRenderer(async (s) => `<svg xmlns="http://www.w3.org/2000/svg"><text>${s}</text></svg>`);
});
afterEach(() => setDiagramRenderer(null));

describe("<spez-richtext> diagrams", () => {
  it("insertDiagram renders and persists source + svg in the JSON", async () => {
    const el = create();
    el.insertDiagram("graph TD;A");
    await vi.waitFor(() => expect(el.getJSON()).toContain("<text>graph TD;A</text>"));
    const diagram = JSON.parse(el.getJSON()).root.children.find((c: any) => c.type === "diagram");
    expect(diagram).toMatchObject({ type: "diagram", source: "graph TD;A", drawioKey: null });
  });

  it("updateDiagram changes source and re-renders; unknown key is false", async () => {
    const el = create();
    const key = el.insertDiagram("a");
    await vi.waitFor(() => expect(el.getJSON()).toContain("<text>a</text>"));
    expect(el.updateDiagram(key, { source: "b", drawioKey: "x.drawio" })).toBe(true);
    await vi.waitFor(() => expect(el.getJSON()).toContain("<text>b</text>"));
    expect(el.getJSON()).toContain('"drawioKey":"x.drawio"');
    expect(el.updateDiagram("nope", { source: "c" })).toBe(false);
  });

  it("toolbar button is opt-in, inserts the default diagram and asks the host to edit it", () => {
    expect(create().querySelector('[data-group="diagram"]')).toBeNull();
    const el = create({ toolbar: "diagram" });
    const handler = vi.fn();
    el.addEventListener("diagram-edit-requested", handler);
    el.querySelector<HTMLButtonElement>('[data-group="diagram"] button')!.click();
    el.editor.update(() => {}, { discrete: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].detail.source).toContain("flowchart TD");
  });

  it("double-click in read-only does not request an edit", async () => {
    const el = create();
    el.insertDiagram("a");
    el.readonly = true;
    const handler = vi.fn();
    el.addEventListener("diagram-edit-requested", handler);
    el.querySelector(".spez-rte-diagram")!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("sanitizes svg from a malicious host renderer before it reaches the live DOM", async () => {
    setDiagramRenderer(
      async () =>
        '<svg xmlns="http://www.w3.org/2000/svg" onload="window.__diagramPwned=true">' +
        "<script>window.__diagramPwned=true</script><rect/></svg>",
    );
    const el = create();
    el.insertDiagram("a");
    await vi.waitFor(() => expect(el.querySelector(".spez-rte-diagram svg")).not.toBeNull());
    const figure = el.querySelector(".spez-rte-diagram-figure")!;
    expect(figure.innerHTML).not.toContain("<script");
    expect(figure.innerHTML).not.toContain("onload");
    expect((window as unknown as { __diagramPwned?: boolean }).__diagramPwned).toBeUndefined();
  });
});
