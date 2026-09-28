import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { $getNodeByKey, $getRoot } from "lexical";
import { $isDiagramNode, type DiagramNode } from "../nodes/diagram-node";
import { flushSync, makeEditor } from "../test-utils";
import { setDiagramRenderer } from "./renderer";
import { $insertDiagram, DEFAULT_DIAGRAM_SOURCE, INSERT_DIAGRAM_COMMAND, registerDiagrams } from "./diagrams";

const svgFor = (s: string) => `<svg xmlns="http://www.w3.org/2000/svg"><text>${s}</text></svg>`;
const tick = () => new Promise((r) => setTimeout(r, 10));

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => setDiagramRenderer(null));

function setup() {
  const made = makeEditor();
  const onEditRequested = vi.fn();
  const dispose = registerDiagrams(made.editor, made.root, { onEditRequested });
  return { ...made, onEditRequested, dispose };
}

const svgOf = (editor: ReturnType<typeof makeEditor>["editor"]) =>
  editor.read(() => ($getRoot().getChildren().find($isDiagramNode) as DiagramNode | undefined)?.getSvg());
const errorOf = (editor: ReturnType<typeof makeEditor>["editor"]) =>
  editor.read(() => ($getRoot().getChildren().find($isDiagramNode) as DiagramNode | undefined)?.getRenderError());

describe("registerDiagrams", () => {
  it("renders a new diagram and stores the svg in the node", async () => {
    setDiagramRenderer(async (s) => svgFor(s));
    const { editor } = setup();
    editor.dispatchCommand(INSERT_DIAGRAM_COMMAND, { source: "graph TD;A" });
    flushSync(editor);
    await vi.waitFor(() => expect(svgOf(editor)).toContain("<text>graph TD;A</text>"));
  });

  it("inserts the default source when the command has no payload", async () => {
    setDiagramRenderer(async (s) => svgFor(s));
    const { editor } = setup();
    editor.dispatchCommand(INSERT_DIAGRAM_COMMAND, undefined);
    flushSync(editor);
    expect(editor.read(() => ($getRoot().getChildren().find($isDiagramNode) as DiagramNode).getSource())).toBe(
      DEFAULT_DIAGRAM_SOURCE,
    );
    expect(DEFAULT_DIAGRAM_SOURCE).toBe("flowchart TD\n  A[Start] --> B[End]");
  });

  it("does not re-render a loaded diagram that already has svg", async () => {
    const renderer = vi.fn(async (s: string) => svgFor(s));
    setDiagramRenderer(renderer);
    const { editor } = setup();
    editor.update(
      () => {
        $getRoot().clear();
        $insertDiagram("x");
      },
      { discrete: true },
    );
    await vi.waitFor(() => expect(svgOf(editor)).toContain("<text>x</text>"));
    const json = JSON.stringify(editor.getEditorState().toJSON());
    renderer.mockClear();
    editor.setEditorState(editor.parseEditorState(json));
    flushSync(editor);
    await tick();
    expect(renderer).not.toHaveBeenCalled();
  });

  it("records a render failure without svg", async () => {
    setDiagramRenderer(async () => {
      throw new Error("Parse error on line 1");
    });
    const { editor } = setup();
    editor.update(
      () => {
        $getRoot().clear();
        $insertDiagram("graph ???");
      },
      { discrete: true },
    );
    await vi.waitFor(() =>
      expect(editor.read(() => ($getRoot().getFirstChild() as DiagramNode).getRenderError())).toContain("Parse error"),
    );
    expect(svgOf(editor)).toBe("");
  });

  it("ignores a stale render when the source changed meanwhile", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    setDiagramRenderer(async (s) => {
      if (s === "old") await gate;
      return svgFor(s);
    });
    const { editor } = setup();
    let key = "";
    editor.update(
      () => {
        $getRoot().clear();
        key = $insertDiagram("old");
      },
      { discrete: true },
    );
    editor.update(() => ($getNodeByKey(key) as DiagramNode).setSource("new"), { discrete: true });
    await vi.waitFor(() => expect(svgOf(editor)).toContain("<text>new</text>"));
    release();
    await tick();
    expect(svgOf(editor)).toContain("<text>new</text>");
  });

  it("sanitizes a host renderer's output and gives it a unique root id", async () => {
    setDiagramRenderer(
      async () =>
        '<svg xmlns="http://www.w3.org/2000/svg" id="mermaid-1" onload="x()"><script>a()</script>' +
        "<style>#mermaid-1 ~ body{display:none} #mermaid-1 rect{fill:red}</style><rect/></svg>",
    );
    const { editor, root } = setup();
    editor.update(
      () => {
        $getRoot().clear();
        $insertDiagram("a");
        $insertDiagram("b");
      },
      { discrete: true },
    );
    await vi.waitFor(() => expect(root.querySelectorAll(".spez-rte-diagram svg")).toHaveLength(2));
    const ids = [...root.querySelectorAll("svg")].map((s) => s.getAttribute("id")!);
    expect(ids[0]).toMatch(/^spez-rte-mermaid-[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(ids[0]).not.toBe(ids[1]);
    for (const svg of editor.read(() => $getRoot().getChildren().map((n) => (n as DiagramNode).getSvg()))) {
      expect(svg).not.toMatch(/onload|script|body/);
      expect(svg).toContain("rect{fill:red;}");
    }
    expect(root.querySelector("script")).toBeNull();
  });

  it("records an error, and does not loop, when the renderer returns nothing usable", async () => {
    const renderer = vi.fn(async () => "<div>not svg</div>");
    setDiagramRenderer(renderer);
    const { editor } = setup();
    editor.update(
      () => {
        $getRoot().clear();
        $insertDiagram("a");
      },
      { discrete: true },
    );
    await vi.waitFor(() => expect(errorOf(editor)).not.toBe(""));
    await tick();
    expect(svgOf(editor)).toBe("");
    expect(renderer).toHaveBeenCalledTimes(1);
  });

  it("does not render a blank source, and skips destroyed nodes", async () => {
    const renderer = vi.fn(async (s: string) => svgFor(s));
    setDiagramRenderer(renderer);
    const { editor } = setup();
    editor.update(
      () => {
        $getRoot().clear();
        $insertDiagram("   ");
      },
      { discrete: true },
    );
    editor.update(() => $getRoot().clear(), { discrete: true });
    await tick();
    expect(renderer).not.toHaveBeenCalled();
  });

  it("stops applying results after dispose", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    setDiagramRenderer(async (s) => {
      await gate;
      return svgFor(s);
    });
    const { editor, dispose } = setup();
    editor.update(
      () => {
        $getRoot().clear();
        $insertDiagram("late");
      },
      { discrete: true },
    );
    dispose();
    release();
    await tick();
    expect(svgOf(editor)).toBe("");
  });

  it("double-click asks the host to edit, only when editable", () => {
    setDiagramRenderer(async (s) => svgFor(s));
    const { editor, root, onEditRequested } = setup();
    let key = "";
    editor.update(
      () => {
        $getRoot().clear();
        key = $insertDiagram("graph TD;A", "k.drawio");
      },
      { discrete: true },
    );
    const dom = root.querySelector<HTMLElement>(".spez-rte-diagram")!;
    dom.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(onEditRequested).toHaveBeenCalledWith({ nodeKey: key, source: "graph TD;A", drawioKey: "k.drawio" });
    editor.setEditable(false);
    dom.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(onEditRequested).toHaveBeenCalledTimes(1);
  });

  it("double-click inside the rendered svg resolves to the diagram node", async () => {
    setDiagramRenderer(async (s) => svgFor(s));
    const { editor, root, onEditRequested } = setup();
    editor.update(
      () => {
        $getRoot().clear();
        $insertDiagram("graph TD;A");
      },
      { discrete: true },
    );
    await vi.waitFor(() => expect(root.querySelector(".spez-rte-diagram svg text")).not.toBeNull());
    root.querySelector(".spez-rte-diagram svg text")!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(onEditRequested).toHaveBeenCalledTimes(1);
    expect(onEditRequested.mock.calls[0]![0]).toMatchObject({ source: "graph TD;A", drawioKey: null });
  });
});
