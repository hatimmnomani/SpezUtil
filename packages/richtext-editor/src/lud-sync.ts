import { $createTextNode, TextNode, type LexicalEditor } from "lexical";
import { getStyleObjectFromCSS } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import { familyForLudFont, ludFontForFamily, sameFamily } from "./lud-fonts";
import { $createLudTextNode, LudTextNode } from "./nodes/lud-text-node";

function fontFamilyOf(node: TextNode): string {
  return getStyleObjectFromCSS(node.getStyle())["font-family"] ?? "";
}

export function registerLudSync(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerNodeTransform(TextNode, (node) => {
      if (node.getType() !== "text") return;
      const ludFont = ludFontForFamily(fontFamilyOf(node));
      if (ludFont === null) return;
      const lud = $createLudTextNode(node.getTextContent(), ludFont);
      lud.setFormat(node.getFormat()).setStyle(node.getStyle()).setDetail(node.getDetail());
      // replace()'s selectPointOnNode keeps the selection's offset and only clamps it
      // when the new node's text is shorter; our replacement text is always
      // byte-identical to node's, so the caret offset survives untouched.
      node.replace(lud);
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
      const text = $createTextNode(node.getTextContent());
      text.setFormat(node.getFormat()).setStyle(node.getStyle()).setDetail(node.getDetail());
      // Same reasoning as above: identical text, so replace() preserves the caret offset.
      node.replace(text);
    }),
  );
}
