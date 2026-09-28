import { $createTextNode, TextNode, type LexicalEditor } from "lexical";
import { mergeRegister } from "@lexical/utils";
import { familyForLudFont, fontFamilyIn, isKnownLudFont, ludFontForFamily, sameFamily } from "./lud-fonts";
import { $createLudTextNode, LudTextNode } from "./nodes/lud-text-node";

function fontFamilyOf(node: TextNode): string {
  return fontFamilyIn(node.getStyle());
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
    // `ludFont` is the stored truth; `style.font-family` is the user-facing copy of it, and the
    // user edits only the copy. A node whose profile this build does not know is opaque and never
    // touched (`isKnownLudFont`): re-typing it from a family that maps to nothing would lose the
    // tag. A stored node with no family at all never reaches here with one missing, because
    // `LudTextNode.updateFromJSON` restores it on load, so an empty family here means the user
    // cleared the font (the picker's "None") and the node is demoted like any other unmapped family.
    editor.registerNodeTransform(LudTextNode, (node) => {
      if (node.getTextContent() === "") {
        node.remove();
        return;
      }
      const current = node.getLudFont();
      if (!isKnownLudFont(current)) return;
      const family = fontFamilyOf(node);
      if (sameFamily(family, familyForLudFont(current))) return;
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
