import {
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  createEditor,
  TextNode,
  type DOMConversionMap,
  type LexicalEditor,
} from "lexical";
import { registerRichText } from "@lexical/rich-text";
import { registerList } from "@lexical/list";
import { createEmptyHistoryState, registerHistory } from "@lexical/history";
import { registerTablePlugin, registerTableSelectionObserver } from "@lexical/table";
import { $toggleLink, TOGGLE_LINK_COMMAND, type LinkAttributes } from "@lexical/link";
import { mergeRegister } from "@lexical/utils";
import {
  EDITOR_NODES,
  TranslitPairNode,
  normalizeTranslitPair,
  registerTranslitDeletion,
} from "./nodes";
import { $createImageNode, INSERT_IMAGE_COMMAND } from "./nodes/image-node";
import { registerAutoDirection, registerDirectionCommand } from "./direction";

/**
 * Lexical's HTML import only maps text *formats* (bold, italic, …) from
 * inline styles; it drops presentational styles like font-family. Wrap
 * TextNode's importers so those survive the toolbar's export → import
 * round-trip.
 */
const IMPORTED_TEXT_STYLES = ["font-family"] as const;

function $importTextStyles(): DOMConversionMap {
  const importMap: DOMConversionMap = {};
  for (const [tag, importer] of Object.entries(TextNode.importDOM() ?? {})) {
    importMap[tag] = (node) => {
      const original = importer(node);
      if (original === null) return null;
      return {
        ...original,
        conversion: (element) => {
          const output = original.conversion(element);
          if (output === null || output.forChild === undefined) return output;
          const styles = IMPORTED_TEXT_STYLES.map((prop) => {
            const value = element.style.getPropertyValue(prop);
            return value === "" ? "" : `${prop}: ${value};`;
          })
            .join(" ")
            .trim();
          if (styles === "") return output;
          const { forChild } = output;
          return {
            ...output,
            forChild: (child, parent) => {
              const result = forChild(child, parent);
              if ($isTextNode(result)) {
                result.setStyle(`${result.getStyle()} ${styles}`.trim());
              }
              return result;
            },
          };
        },
      };
    };
  }
  return importMap;
}

const theme = {
  text: {
    bold: "spez-rte-bold",
    italic: "spez-rte-italic",
    underline: "spez-rte-underline",
    strikethrough: "spez-rte-strikethrough",
  },
  quote: "spez-rte-quote",
  link: "spez-rte-link",
};

/** Mounts DecoratorNode outputs (ImageNode) into their container elements. */
function registerDecoratorMounter(editor: LexicalEditor): () => void {
  return editor.registerDecoratorListener<HTMLElement>((decorators) => {
    for (const [key, element] of Object.entries(decorators)) {
      const container = editor.getElementByKey(key);
      if (container !== null && element.parentElement !== container) {
        container.replaceChildren(element);
      }
    }
  });
}

function registerLinkCommand(editor: LexicalEditor): () => void {
  return editor.registerCommand<string | ({ url: string } & LinkAttributes) | null>(
    TOGGLE_LINK_COMMAND,
    (payload) => {
      if (payload === null || typeof payload === "string") {
        $toggleLink(payload);
      } else {
        const { url, ...attributes } = payload;
        $toggleLink(url, attributes);
      }
      return true;
    },
    COMMAND_PRIORITY_EDITOR,
  );
}

function registerImageCommand(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    INSERT_IMAGE_COMMAND,
    (payload) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return false;
      $insertNodes([$createImageNode(payload.src, payload.alt ?? "")]);
      return true;
    },
    COMMAND_PRIORITY_EDITOR,
  );
}

export interface EditorInstance {
  editor: LexicalEditor;
  dispose: () => void;
}

export function createEditorInstance(rootElement: HTMLElement): EditorInstance {
  const editor = createEditor({
    namespace: "spez-richtext",
    nodes: EDITOR_NODES,
    theme,
    html: { import: $importTextStyles() },
    onError: (error) => {
      throw error;
    },
  });
  editor.setRootElement(rootElement);
  const dispose = mergeRegister(
    registerRichText(editor),
    registerHistory(editor, createEmptyHistoryState(), 300),
    registerList(editor),
    registerTablePlugin(editor),
    registerTableSelectionObserver(editor),
    registerLinkCommand(editor),
    registerImageCommand(editor),
    registerDecoratorMounter(editor),
    registerAutoDirection(editor),
    registerDirectionCommand(editor),
    editor.registerNodeTransform(TranslitPairNode, normalizeTranslitPair),
    registerTranslitDeletion(editor),
    () => editor.setRootElement(null),
  );
  return { editor, dispose };
}
