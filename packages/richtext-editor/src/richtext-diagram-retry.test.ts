import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./index";
import type { SpezRichtext } from "./richtext-editor";

// The mermaid fakes are registered per test with vi.doMock, so the FIRST dynamic import('mermaid')
// made by the default renderer can be made to fail and the next one to succeed (ruling F4 shape).
const { initialize, render } = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(async (id: string, source: string) => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" id="${id}"><text>${source}</text></svg>`,
  })),
}));

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.doUnmock("mermaid");
  vi.clearAllMocks();
});

describe("<spez-richtext> diagram render retry (final review I3)", () => {
  it("renders on updateDiagram with the same source after the first import('mermaid') failed", async () => {
    vi.doMock("mermaid", () => {
      throw new Error("chunk load failed");
    });
    const el = document.createElement("spez-richtext") as SpezRichtext;
    document.body.appendChild(el);
    const key = el.insertDiagram("graph TD;A");
    await vi.waitFor(() => expect(el.querySelector(".spez-rte-diagram-error")).not.toBeNull());
    expect(render).not.toHaveBeenCalled();
    expect(el.getJSON()).toContain('"svg":""');

    // The chunk is reachable now (CDN hiccup over); the host re-submits the unchanged source.
    vi.doMock("mermaid", () => ({ default: { initialize, render } }));
    expect(el.updateDiagram(key, { source: "graph TD;A" })).toBe(true);
    await vi.waitFor(() => expect(el.getJSON()).toContain("<text>graph TD;A</text>"));
    expect(render).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(el.querySelector(".spez-rte-diagram-error")).toBeNull();
  });
});
