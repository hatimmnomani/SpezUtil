import { afterEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted above the imports, so the fakes it closes over must be hoisted too (ruling F4).
const { initialize, render } = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(async (_id: string, source: string) => ({ svg: `<svg><text>${source}</text></svg>` })),
}));
vi.mock("mermaid", () => ({ default: { initialize, render } }));

import { MERMAID_CONFIG, getDiagramRenderer, setDiagramRenderer } from "./renderer";

afterEach(() => {
  setDiagramRenderer(null);
  vi.clearAllMocks();
});

/** A fresh copy of the module, so the memoised mermaid promise starts empty. */
async function freshRenderer(): Promise<typeof import("./renderer")> {
  vi.resetModules();
  return import("./renderer");
}

describe("diagram renderer", () => {
  it("lazily loads mermaid once, with htmlLabels off and strict security", async () => {
    const r = getDiagramRenderer();
    expect(initialize).not.toHaveBeenCalled();
    expect(await r("graph TD;A")).toBe("<svg><text>graph TD;A</text></svg>");
    await r("graph TD;B");
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize.mock.calls[0]![0]).toMatchObject({
      startOnLoad: false,
      securityLevel: "strict",
      htmlLabels: false,
      flowchart: { htmlLabels: false },
    });
    expect(MERMAID_CONFIG.htmlLabels).toBe(false);
    const ids = render.mock.calls.map((c) => c[0]);
    expect(new Set(ids).size).toBe(ids.length); // unique render ids
  });

  it("passes the source through unchanged and rejects when mermaid rejects", async () => {
    render.mockRejectedValueOnce(new Error("Parse error on line 1"));
    await expect(getDiagramRenderer()("graph TD;A-->")).rejects.toThrow("Parse error on line 1");
    expect(render).toHaveBeenCalledTimes(1);
    expect(render.mock.calls[0]![1]).toBe("graph TD;A-->");
  });

  it("can be replaced by the host and restored", async () => {
    const fake = vi.fn(async () => "<svg/>");
    setDiagramRenderer(fake);
    expect(await getDiagramRenderer()("x")).toBe("<svg/>");
    expect(render).not.toHaveBeenCalled();
    setDiagramRenderer(null);
    expect(getDiagramRenderer()).not.toBe(fake);
  });

  it("retries the mermaid load on the next render after initialize throws", async () => {
    const fresh = await freshRenderer();
    initialize.mockImplementationOnce(() => {
      throw new Error("init boom");
    });
    await expect(fresh.getDiagramRenderer()("graph TD;A")).rejects.toThrow("init boom");
    expect(render).not.toHaveBeenCalled();
    expect(await fresh.getDiagramRenderer()("graph TD;A")).toBe("<svg><text>graph TD;A</text></svg>");
    expect(initialize).toHaveBeenCalledTimes(2);
  });

  it("retries the mermaid load on the next render after the import itself fails", async () => {
    const fresh = await freshRenderer();
    vi.doMock("mermaid", () => {
      throw new Error("chunk load failed");
    });
    // vitest wraps a throwing factory in its own error, so only the rejection itself is asserted.
    await expect(fresh.getDiagramRenderer()("graph TD;A")).rejects.toThrow();
    expect(initialize).not.toHaveBeenCalled();
    vi.doMock("mermaid", () => ({ default: { initialize, render } }));
    expect(await fresh.getDiagramRenderer()("graph TD;A")).toBe("<svg><text>graph TD;A</text></svg>");
    expect(initialize).toHaveBeenCalledTimes(1);
  });
});
