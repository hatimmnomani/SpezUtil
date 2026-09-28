import { SpezRichtext } from "./richtext-editor";

export { SpezRichtext } from "./richtext-editor";
export type { ChangeDetail } from "./richtext-editor";
export { exportHTML, importHTML } from "./html";
export { detectDirection, SET_DIRECTION_COMMAND } from "./direction";
export { insertHijriDate } from "./hijri-insert";
export { injectGlobalStyles, styles } from "./styles";
export { getLocaleStrings } from "./locale";
export type { EditorLocale, LocaleStrings } from "./locale";
export { ALL_TOOLBAR_GROUPS, DEFAULT_TOOLBAR_GROUPS, DEFAULT_FONTS, DEFAULT_FONT_SIZES } from "./toolbar";
export type { FontOption, FontSizeOption, ToolbarGroup } from "./toolbar";
export {
  ADD_COMMENT_MARK_COMMAND,
  REMOVE_COMMENT_MARK_COMMAND,
  FOCUS_COMMENT_MARK_COMMAND,
} from "./comments/comments";
export type { CommentClickDetail } from "./comments/comments";
export type { CommentRequestDetail } from "./comments/anchor";
export { generateMarkId, isMarkId } from "./comments/mark-id";
export { listLudFonts, UNICODE_LUD_FONT } from "./lud-fonts";
export type { LudFontOption } from "./lud-fonts";
export { INSERT_DIAGRAM_COMMAND, DEFAULT_DIAGRAM_SOURCE } from "./diagram/diagrams";
export type { DiagramEditDetail } from "./diagram/diagrams";
export { setDiagramRenderer, MERMAID_CONFIG } from "./diagram/renderer";
export type { DiagramRenderer } from "./diagram/renderer";
export { sanitizeSvg } from "./diagram/svg-sanitize";
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
  LudTextNode,
  $createLudTextNode,
  $isLudTextNode,
  CommentMarkNode,
  $createCommentMarkNode,
  $isCommentMarkNode,
  DiagramNode,
  $createDiagramNode,
  $isDiagramNode,
} from "./nodes";
export type {
  SerializedAyatNode,
  SerializedTranslitPairNode,
  SerializedTranslitLineNode,
  SerializedHijriDateNode,
  SerializedImageNode,
  InsertImagePayload,
  TranslitRole,
  SerializedLudTextNode,
  SerializedCommentMarkNode,
  SerializedDiagramNode,
} from "./nodes";

if (typeof customElements !== "undefined" && !customElements.get("spez-richtext")) {
  customElements.define("spez-richtext", SpezRichtext);
}

declare global {
  interface HTMLElementTagNameMap {
    "spez-richtext": SpezRichtext;
  }
}
