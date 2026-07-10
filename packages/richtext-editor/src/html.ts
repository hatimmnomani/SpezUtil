import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $getRoot, $insertNodes, type LexicalEditor } from "lexical";

export function exportHTML(editor: LexicalEditor): string {
  return editor.read(() => $generateHtmlFromNodes(editor));
}

export function importHTML(editor: LexicalEditor, html: string): void {
  editor.update(
    () => {
      const dom = new DOMParser().parseFromString(html, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      root.select();
      $insertNodes(nodes);
    },
    { discrete: true },
  );
}
