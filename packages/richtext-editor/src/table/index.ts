import { mergeRegister } from "@lexical/utils";
import type { LexicalEditor } from "lexical";
import { registerTableKeyboard, type TableKeyboardHooks } from "./keyboard";
import { registerTablePaste } from "./paste";

/** Editor-level table behaviour that needs no DOM overlay: keyboard handling (and, below, paste). */
export function registerTableSupport(editor: LexicalEditor, hooks: TableKeyboardHooks = {}): () => void {
  return mergeRegister(registerTableKeyboard(editor, hooks), registerTablePaste(editor));
}
