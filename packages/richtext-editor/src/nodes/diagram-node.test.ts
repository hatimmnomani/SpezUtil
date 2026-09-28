import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot } from "lexical";
import { exportHTML, importHTML } from "../html";
import { makeEditor } from "../test-utils";
import { $createDiagramNode, $isDiagramNode, DiagramNode, type SerializedDiagramNode } from "./diagram-node";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><text>A</text></svg>';
const ROOT_ID = /^spez-rte-mermaid-[0-9A-HJKMNP-TV-Z]{26}$/;
/** Every attack the sanitizer must catch, in one document. */
const EVIL = [
  '<svg xmlns="http://www.w3.org/2000/svg" id="mermaid-1" onload="x()">',
  "<script>a()</script>",
  '<style>#mermaid-1 ~ body{display:none} #mermaid-1 rect{fill:url(https://evil/p.png)} #mermaid-1 .ok{fill:red}</style>',
  '<image href="https://evil/x.png"/>',
  '<rect class="ok"/>',
  "</svg>",
].join("");

beforeEach(() => {
  document.body.innerHTML = "";
});

function seed(node: () => DiagramNode) {
  const made = makeEditor();
  made.editor.update(() => $getRoot().clear().append(node()), { discrete: true });
  return made;
}

const firstJson = (editor: ReturnType<typeof makeEditor>["editor"]) =>
  editor.getEditorState().toJSON().root.children[0] as unknown as SerializedDiagramNode;

const expectClean = (svg: string, rootId: string) => {
  expect(svg).not.toMatch(/onload|script|evil|body|<image/);
  expect(svg).toContain(`<rect class="ok"`);
  expect(svg).toContain(`#${rootId} .ok{fill:red;}`);
};

describe("DiagramNode", () => {
  it("serializes to the diagram contract", () => {
    const { editor } = seed(() => $createDiagramNode("graph TD;A", SVG, "uploads/handbook/x.drawio"));
    const json = firstJson(editor);
    expect(Object.keys(json).sort()).toEqual(["drawioKey", "source", "svg", "type", "version"]);
    expect(json).toMatchObject({ type: "diagram", version: 1, source: "graph TD;A", drawioKey: "uploads/handbook/x.drawio" });
    // The stored svg is the sanitized input under a unique root id (see svg-scope.ts).
    expect(json.svg).toContain("<text>A</text>");
    expect(json.svg).toMatch(/id="spez-rte-mermaid-[0-9A-HJKMNP-TV-Z]{26}"/);
  });

  it("never stores unsanitized SVG", () => {
    const { editor } = seed(() =>
      $createDiagramNode("x", '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><script>a()</script><rect/></svg>'),
    );
    const svg = firstJson(editor).svg;
    expect(svg).not.toMatch(/onload|script/);
    expect(svg).toContain("<rect");
  });

  it("setSource clears a stale svg and error; the error is not serialized", () => {
    const { editor } = seed(() => $createDiagramNode("a", SVG));
    editor.update(
      () => {
        const node = $getRoot().getFirstChild() as DiagramNode;
        node.setRenderError("boom");
        node.setSource("b");
      },
      { discrete: true },
    );
    const json = firstJson(editor);
    expect(json).toEqual({ type: "diagram", version: 1, source: "b", svg: "", drawioKey: null });
    expect(JSON.stringify(json)).not.toContain("boom");
  });

  it("loads JSON without a source as an empty source with a render error, never a pending spinner (final review M11)", () => {
    const { editor, root } = makeEditor();
    const state = {
      root: {
        type: "root", version: 1, direction: null, format: "", indent: 0,
        children: [
          { type: "diagram", version: 1 },
          { type: "diagram", version: 1, source: 42, svg: "", drawioKey: null },
          { type: "diagram", version: 1, source: "   ", svg: "", drawioKey: null },
        ],
      },
    };
    editor.setEditorState(editor.parseEditorState(JSON.stringify(state)));
    editor.update(() => {}, { discrete: true });
    const nodes = editor.read(() => $getRoot().getChildren() as DiagramNode[]);
    // A missing or non-string source becomes ""; a stored blank one is kept verbatim.
    expect(editor.read(() => nodes.map((n) => n.getSource()))).toEqual(["", "", "   "]);
    for (const node of nodes) {
      expect(editor.read(() => [node.getSvg(), node.getDrawioKey()])).toEqual(["", null]);
      expect(editor.read(() => node.getRenderError())).toBe("The diagram has no source");
    }
    expect(root.querySelectorAll(".spez-rte-diagram-pending")).toHaveLength(0);
    expect(root.querySelectorAll(".spez-rte-diagram-error")).toHaveLength(3);
    const json = editor.getEditorState().toJSON().root.children as unknown as SerializedDiagramNode[];
    expect(json[0]).toEqual({ type: "diagram", version: 1, source: "", svg: "", drawioKey: null });
  });

  it("keeps a stored svg when the JSON has no source (the svg is what the reader sees)", () => {
    const { editor } = makeEditor();
    const state = {
      root: {
        type: "root", version: 1, direction: null, format: "", indent: 0,
        children: [{ type: "diagram", version: 1, svg: SVG }],
      },
    };
    editor.setEditorState(editor.parseEditorState(JSON.stringify(state)));
    const node = editor.read(() => $getRoot().getFirstChild() as DiagramNode);
    expect(editor.read(() => node.getSvg())).toContain("<text>A</text>");
    expect(editor.read(() => node.getRenderError())).toBe("");
  });

  it("decorates with the sanitized svg, or the error text", () => {
    const { editor, root } = seed(() => $createDiagramNode("a", SVG));
    expect(root.querySelector(".spez-rte-diagram svg")).not.toBeNull();
    editor.update(() => ($getRoot().getFirstChild() as DiagramNode).setSource("broken").setRenderError("Parse error"), {
      discrete: true,
    });
    expect(root.querySelector(".spez-rte-diagram-error")!.textContent).toContain("Parse error");
  });

  it("wraps the rendered svg in a paint-contained, overflow-hidden figure", () => {
    const { root } = seed(() => $createDiagramNode("a", SVG));
    const figure = root.querySelector<HTMLElement>(".spez-rte-diagram-figure")!;
    expect(figure.getAttribute("style")).toContain("overflow:hidden");
    expect(figure.getAttribute("style")).toContain("contain:paint");
    expect(figure.querySelector("svg")).not.toBeNull();
  });

  it("exports figure > pre[data-diagram=mermaid] + svg and imports it back", () => {
    const { editor } = seed(() => $createDiagramNode("graph TD;A-->B", SVG, "k"));
    const html = exportHTML(editor);
    expect(html).toContain('data-spez-type="diagram"');
    expect(html).toContain('<pre data-diagram="mermaid">graph TD;A--&gt;B</pre>');
    importHTML(editor, html);
    editor.getEditorState().read(() => {
      const node = $getRoot().getFirstChild();
      expect($isDiagramNode(node)).toBe(true);
      expect((node as DiagramNode).getSource()).toBe("graph TD;A-->B");
      expect((node as DiagramNode).getSvg()).toContain("<text>A</text>");
      expect((node as DiagramNode).getDrawioKey()).toBe("k");
    });
  });

  it("imports a bare <pre data-diagram=mermaid> with no svg", () => {
    const { editor } = makeEditor();
    importHTML(editor, '<pre data-diagram="mermaid">graph LR;X</pre>');
    editor.getEditorState().read(() => {
      const node = $getRoot().getFirstChild() as DiagramNode;
      expect($isDiagramNode(node)).toBe(true);
      expect(node.getSource()).toBe("graph LR;X");
      expect(node.getSvg()).toBe("");
    });
  });

  describe("every svg path is sanitized under a unique root id", () => {
    it("setSvg", () => {
      const { editor, root } = seed(() => $createDiagramNode("a"));
      editor.update(() => ($getRoot().getFirstChild() as DiagramNode).setSvg(EVIL), { discrete: true });
      const svg = editor.read(() => ($getRoot().getFirstChild() as DiagramNode).getSvg());
      const rootId = root.querySelector("svg")!.getAttribute("id")!;
      expect(rootId).toMatch(ROOT_ID);
      expectClean(svg, rootId);
      expect(root.querySelector(".spez-rte-diagram script")).toBeNull();
    });

    it("importJSON of a stored svg from the server or clipboard", () => {
      const { editor, root } = makeEditor();
      const state = {
        root: {
          type: "root", version: 1, direction: null, format: "", indent: 0,
          children: [{ type: "diagram", version: 1, source: "a", svg: EVIL, drawioKey: null }],
        },
      };
      editor.setEditorState(editor.parseEditorState(JSON.stringify(state)));
      editor.update(() => {}, { discrete: true });
      const rootId = root.querySelector("svg")!.getAttribute("id")!;
      expect(rootId).toMatch(ROOT_ID);
      expectClean(firstJson(editor).svg, rootId);
      expect(root.querySelector(".spez-rte-diagram script")).toBeNull();
    });

    it("updateFromJSON with a stored svg", () => {
      const { editor } = seed(() => $createDiagramNode("a"));
      editor.update(
        () => {
          const node = $getRoot().getFirstChild() as DiagramNode;
          node.updateFromJSON({ type: "diagram", version: 1, source: "a", svg: EVIL, drawioKey: "k" });
        },
        { discrete: true },
      );
      const json = firstJson(editor);
      expect(json.drawioKey).toBe("k");
      const rootId = /id="([^"]+)"/.exec(json.svg)![1]!;
      expect(rootId).toMatch(ROOT_ID);
      expectClean(json.svg, rootId);
    });

    it("HTML import of figure[data-spez-type=diagram]", () => {
      const { editor, root } = makeEditor();
      importHTML(
        editor,
        `<figure data-spez-type="diagram" data-drawio-key="k"><pre data-diagram="mermaid">graph TD;A</pre>${EVIL}</figure>`,
      );
      const { isDiagram, source, svg } = editor.read(() => {
        const node = $getRoot().getFirstChild() as DiagramNode;
        return { isDiagram: $isDiagramNode(node), source: node.getSource(), svg: node.getSvg() };
      });
      expect(isDiagram).toBe(true);
      expect(source).toBe("graph TD;A");
      const rootId = root.querySelector("svg")!.getAttribute("id")!;
      expect(rootId).toMatch(ROOT_ID);
      expectClean(svg, rootId);
      // The inner <pre> must not become a second node.
      expect(editor.read(() => $getRoot().getChildrenSize())).toBe(1);
    });

    it("exported HTML carries the sanitized svg only", () => {
      const { editor } = seed(() => $createDiagramNode("a", EVIL));
      const html = exportHTML(editor);
      expect(html).not.toMatch(/onload|script|evil|<image/);
      expect(html).toContain('<rect class="ok"');
      expect(html).toMatch(/<figure data-spez-type="diagram"><pre data-diagram="mermaid">a<\/pre><svg /);
    });
  });

  it("gives two diagrams rendered as mermaid-1 distinct ids so their styles cannot cross", () => {
    const one = '<svg xmlns="http://www.w3.org/2000/svg" id="mermaid-1"><style>#mermaid-1 rect{fill:red}</style><rect/></svg>';
    const { editor, root } = makeEditor();
    editor.update(() => $getRoot().clear().append($createDiagramNode("a", one), $createDiagramNode("b", one)), {
      discrete: true,
    });
    const ids = [...root.querySelectorAll("svg")].map((s) => s.getAttribute("id"));
    expect(ids).toHaveLength(2);
    expect(ids[0]).toMatch(ROOT_ID);
    expect(ids[1]).toMatch(ROOT_ID);
    expect(ids[0]).not.toBe(ids[1]);
    const styles = [...root.querySelectorAll("svg style")].map((s) => s.textContent);
    expect(styles[0]).toContain(`#${ids[0]} rect`);
    expect(styles[1]).toContain(`#${ids[1]} rect`);
    expect(editor.read(() => $getRoot().getChildren().every($isDiagramNode))).toBe(true);
    expect(DiagramNode.getType()).toBe("diagram");
  });
});
