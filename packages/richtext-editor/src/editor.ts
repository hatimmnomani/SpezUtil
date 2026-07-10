import {
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createEditor,
  type LexicalEditor,
} from "lexical";
import { registerRichText } from "@lexical/rich-text";
import { registerList } from "@lexical/list";
import { createEmptyHistoryState, registerHistory } from "@lexical/history";
import { registerTablePlugin, registerTableSelectionObserver } from "@lexical/table";
import { $toggleLink, TOGGLE_LINK_COMMAND, type LinkAttributes } from "@lexical/link";
import { mergeRegister } from "@lexical/utils";
import { EDITOR_NODES, TranslitPairNode, normalizeTranslitPair } from "./nodes";
import { $createImageNode, INSERT_IMAGE_COMMAND } from "./nodes/image-node";
import { registerAutoDirection, registerDirectionCommand } from "./direction";

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
    () => editor.setRootElement(null),
  );
  return { editor, dispose };
}
