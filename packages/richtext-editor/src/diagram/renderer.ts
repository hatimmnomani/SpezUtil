/**
 * Turns diagram source into SVG markup. The default renders with Mermaid, loaded on first use through a
 * dynamic import so it stays out of the main bundle; a host can swap in its own renderer (or a test fake).
 * Callers are expected to pass the result through `sanitizeSvg` before storing it.
 */
export type DiagramRenderer = (source: string) => Promise<string>;

/**
 * htmlLabels off (top level and flowchart): the handbook server strips foreignObject, so HTML labels would
 * vanish on publish. securityLevel strict: no click handlers or embedded HTML in the diagram source.
 */
export const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: "strict",
  htmlLabels: false,
  flowchart: { htmlLabels: false },
} as const;

/** The slice of Mermaid's API this module uses; typed locally so mermaid's types stay out of our d.ts. */
type Mermaid = {
  initialize(config: Record<string, unknown>): void;
  render(id: string, source: string): Promise<{ svg: string }>;
};

let mermaidPromise: Promise<Mermaid> | null = null;
let renderCount = 0;

function loadMermaid(): Promise<Mermaid> {
  mermaidPromise ??= import("mermaid").then((mod) => {
    const mermaid = (mod as unknown as { default: Mermaid }).default;
    mermaid.initialize({ ...MERMAID_CONFIG, flowchart: { ...MERMAID_CONFIG.flowchart } });
    return mermaid;
  });
  return mermaidPromise;
}

const mermaidRenderer: DiagramRenderer = async (source) => {
  const mermaid = await loadMermaid();
  const { svg } = await mermaid.render(`spez-rte-mermaid-${++renderCount}`, source);
  return svg;
};

let current: DiagramRenderer = mermaidRenderer;

/** Replaces the renderer for every diagram in the page; `null` restores Mermaid. */
export function setDiagramRenderer(renderer: DiagramRenderer | null): void {
  current = renderer ?? mermaidRenderer;
}

export function getDiagramRenderer(): DiagramRenderer {
  return current;
}
