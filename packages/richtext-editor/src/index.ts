import { SpezRichtext } from "./richtext-editor";

export { SpezRichtext } from "./richtext-editor";
export type { ChangeDetail } from "./richtext-editor";
export { exportHTML, importHTML } from "./html";
export { detectDirection, SET_DIRECTION_COMMAND } from "./direction";
export { insertHijriDate } from "./hijri-insert";
export { injectGlobalStyles, styles } from "./styles";
export { getLocaleStrings } from "./locale";
export type { EditorLocale, LocaleStrings } from "./locale";
export { ALL_TOOLBAR_GROUPS, DEFAULT_FONTS } from "./toolbar";
export type { FontOption, ToolbarGroup } from "./toolbar";
export {
  AyatNode,
  $createAyatNode,
  $isAyatNode,
  TranslitPairNode,
  TranslitLineNode,
  $createTranslitPairNode,
  $createTranslitLineNode,
  $isTranslitPairNode,
  $isTranslitLineNode,
  normalizeTranslitPair,
  HijriDateNode,
  $createHijriDateNode,
  $isHijriDateNode,
  formatHijriDate,
  DEFAULT_HIJRI_FORMAT,
  ImageNode,
  $createImageNode,
  $isImageNode,
  INSERT_IMAGE_COMMAND,
  EDITOR_NODES,
} from "./nodes";
export type {
  SerializedAyatNode,
  SerializedTranslitPairNode,
  SerializedTranslitLineNode,
  SerializedHijriDateNode,
  SerializedImageNode,
  InsertImagePayload,
  TranslitRole,
} from "./nodes";

if (typeof customElements !== "undefined" && !customElements.get("spez-richtext")) {
  customElements.define("spez-richtext", SpezRichtext);
}

declare global {
  interface HTMLElementTagNameMap {
    "spez-richtext": SpezRichtext;
  }
}
