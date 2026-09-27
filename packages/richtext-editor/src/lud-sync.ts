import { $getSelection, $isRangeSelection, $createTextNode, TextNode, type LexicalEditor } from "lexical";
import { getStyleObjectFromCSS } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import { familyForLudFont, ludFontForFamily, sameFamily } from "./lud-fonts";
import { $createLudTextNode, LudTextNode } from "./nodes/lud-text-node";

function fontFamilyOf(node: TextNode): string {
  return getStyleObjectFromCSS(node.getStyle())["font-family"] ?? "";
}

/** node.replace() moves the caret to the end; keep the exact offsets instead. */
function $replaceKeepingSelection(from: TextNode, to: TextNode): void {
  const selection = $getSelection();
  const fromKey = from.getKey();
  const points =
    $isRangeSelection(selection)
      ? [selection.anchor, selection.focus]
          .filter((p) => p.key === fromKey && p.type === "text")
          .map((p) => ({ point: p, offset: p.offset }))
      : [];
  to.setFormat(from.getFormat()).setStyle(from.getStyle()).setDetail(from.getDetail());
  from.replace(to);
  for (const { point, offset } of points) point.set(to.getKey(), offset, "text");
}

export function registerLudSync(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerNodeTransform(TextNode, (node) => {
      if (node.getType() !== "text") return;
      const ludFont = ludFontForFamily(fontFamilyOf(node));
      if (ludFont === null) return;
      const lud = $createLudTextNode(node.getTextContent(), ludFont);
      $replaceKeepingSelection(node, lud);
    }),
    editor.registerNodeTransform(LudTextNode, (node) => {
      if (node.getTextContent() === "") {
        node.remove();
        return;
      }
      const family = fontFamilyOf(node);
      if (sameFamily(family, familyForLudFont(node.getLudFont()))) return;
      const ludFont = ludFontForFamily(family);
      if (ludFont !== null) {
        node.setLudFont(ludFont);
        return;
      }
      $replaceKeepingSelection(node, $createTextNode(node.getTextContent()));
    }),
  );
}
