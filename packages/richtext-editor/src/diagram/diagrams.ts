import { mergeRegister } from "@lexical/utils";
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  HISTORY_MERGE_TAG,
  createCommand,
  type LexicalCommand,
  type LexicalEditor,
  type NodeKey,
} from "lexical";
import { $createDiagramNode, $isDiagramNode, DiagramNode } from "../nodes/diagram-node";
import { getDiagramRenderer } from "./renderer";

export const DEFAULT_DIAGRAM_SOURCE = "flowchart TD\n  A[Start] --> B[End]";

export const INSERT_DIAGRAM_COMMAND: LexicalCommand<{ source?: string; drawioKey?: string | null } | undefined> =
  createCommand("INSERT_DIAGRAM_COMMAND");

export interface DiagramEditDetail {
  nodeKey: string;
  source: string;
  drawioKey: string | null;
}

export interface DiagramHandlers {
  /** The user double-clicked a diagram in an editable editor; the host opens its editor UI. */
  onEditRequested(detail: DiagramEditDetail): void;
}

/** Shown when the renderer resolves but nothing survives sanitizing (no `<svg>` root, or an empty one). */
const UNUSABLE_SVG_MESSAGE = "The diagram renderer returned no usable SVG";
/** Shown for a rejection whose message is empty: an empty error would leave the node with no svg and no error, i.e. stuck. */
const FALLBACK_ERROR_MESSAGE = "Diagram render failed";

function renderErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message || FALLBACK_ERROR_MESSAGE;
}

/** Inserts at the selection (or appends to the root); returns the node key. */
export function $insertDiagram(source: string, drawioKey: string | null = null): NodeKey {
  const node = $createDiagramNode(source, "", drawioKey);
  if ($isRangeSelection($getSelection())) $insertNodes([node]);
  else $getRoot().append(node);
  return node.getKey();
}

/**
 * Renders every `DiagramNode` whose `svg` is empty (new, edited, or loaded unrendered) and writes the
 * sanitized result back into the node, and reports double-clicks to the host. Renders are keyed by
 * node key + source: a result is dropped if the source changed while it was in flight.
 */
export function registerDiagrams(editor: LexicalEditor, root: HTMLElement, handlers: DiagramHandlers): () => void {
  const inFlight = new Set<string>();
  let disposed = false;

  const apply = (key: NodeKey, source: string, change: (node: DiagramNode) => void) => {
    if (disposed) return;
    editor.update(
      () => {
        const node = $getNodeByKey(key);
        // Stale guard: the source was edited (or the node removed) while rendering.
        if ($isDiagramNode(node) && node.getSource() === source) change(node);
      },
      // The svg is derived from the source: it should not be its own undo step.
      { tag: HISTORY_MERGE_TAG },
    );
  };

  const render = (key: NodeKey, source: string) => {
    const token = `${key}\u0000${source}`;
    if (inFlight.has(token)) return;
    inFlight.add(token);
    // Called inside a promise chain so a host renderer that throws synchronously takes the rejection
    // branch too, instead of escaping the mutation listener with its token stuck in `inFlight`.
    Promise.resolve()
      .then(() => getDiagramRenderer()(source))
      .then(
        (svg) =>
          apply(key, source, (node) => {
            node.setSvg(svg); // sanitized inside the node
            // An empty result would look "unrendered" to the mutation listener and loop; record it instead.
            if (node.getSvg() === "") node.setRenderError(UNUSABLE_SVG_MESSAGE);
          }),
        (error: unknown) => apply(key, source, (node) => node.setRenderError(renderErrorMessage(error))),
      )
      .finally(() => inFlight.delete(token));
  };

  const onDblClick = (event: MouseEvent) => {
    if (!editor.isEditable()) return;
    const target = event.target as Node | null;
    if (target === null) return;
    const detail = editor.read((): DiagramEditDetail | null => {
      const node = $getNearestNodeFromDOMNode(target);
      return $isDiagramNode(node)
        ? { nodeKey: node.getKey(), source: node.getSource(), drawioKey: node.getDrawioKey() }
        : null;
    });
    if (detail !== null) handlers.onEditRequested(detail);
  };
  root.addEventListener("dblclick", onDblClick);

  return mergeRegister(
    editor.registerCommand(
      INSERT_DIAGRAM_COMMAND,
      (payload) => {
        $insertDiagram(payload?.source ?? DEFAULT_DIAGRAM_SOURCE, payload?.drawioKey ?? null);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    // Fires once for existing nodes on registration too, so a document loaded unrendered gets rendered.
    editor.registerMutationListener(DiagramNode, (mutations) => {
      editor.getEditorState().read(() => {
        for (const [key, mutation] of mutations) {
          if (mutation === "destroyed") continue;
          const node = $getNodeByKey(key);
          if (!$isDiagramNode(node)) continue;
          if (node.getSvg() === "" && node.getRenderError() === "" && node.getSource().trim() !== "") {
            render(key, node.getSource());
          }
        }
      });
    }),
    () => {
      disposed = true;
      root.removeEventListener("dblclick", onDblClick);
    },
  );
}
