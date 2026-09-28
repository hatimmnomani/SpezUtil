import {
  $createParagraphNode,
  $getRoot,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { createEditorInstance } from "./editor";

export function makeEditor(): { editor: LexicalEditor; root: HTMLElement } {
  const root = document.createElement("div");
  root.contentEditable = "true";
  document.body.appendChild(root);
  const { editor } = createEditorInstance(root);
  return { editor, root };
}

export function flushSync(editor: LexicalEditor): void {
  editor.update(() => {}, { discrete: true });
}

/** Replaces the document with one paragraph holding the given nodes. */
export function seedParagraph(editor: LexicalEditor, ...nodes: Array<() => LexicalNode>): void {
  editor.update(
    () => {
      const p = $createParagraphNode();
      p.append(...nodes.map((make) => make()));
      $getRoot().clear().append(p);
    },
    { discrete: true },
  );
}

export function firstParagraphChildren(editor: LexicalEditor): LexicalNode[] {
  return editor.getEditorState().read(() => ($getRoot().getFirstChild() as ElementNode).getChildren());
}
