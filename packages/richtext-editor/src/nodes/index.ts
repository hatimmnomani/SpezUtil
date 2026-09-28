import type { Klass, LexicalNode } from "lexical";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { AyatNode } from "./ayat-node";
import { CommentMarkNode } from "./comment-mark-node";
import { DiagramNode } from "./diagram-node";
import { HijriDateNode } from "./hijri-date-node";
import { ImageNode } from "./image-node";
import { LudTextNode } from "./lud-text-node";
import { TranslitLineNode, TranslitPairNode } from "./translit-nodes";

export const EDITOR_NODES: Array<Klass<LexicalNode>> = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  AyatNode,
  TranslitPairNode,
  TranslitLineNode,
  HijriDateNode,
  ImageNode,
  LudTextNode,
  CommentMarkNode,
  DiagramNode,
];

export { AyatNode, $createAyatNode, $isAyatNode } from "./ayat-node";
export type { SerializedAyatNode } from "./ayat-node";
export {
  TranslitPairNode,
  TranslitLineNode,
  $createTranslitPairNode,
  $createTranslitLineNode,
  $isTranslitPairNode,
  $isTranslitLineNode,
  $unwrapTranslitPair,
  normalizeTranslitPair,
  registerTranslitDeletion,
} from "./translit-nodes";
export type {
  SerializedTranslitPairNode,
  SerializedTranslitLineNode,
  TranslitRole,
} from "./translit-nodes";
export {
  HijriDateNode,
  $createHijriDateNode,
  $isHijriDateNode,
  formatHijriDate,
  DEFAULT_HIJRI_FORMAT,
} from "./hijri-date-node";
export type { SerializedHijriDateNode } from "./hijri-date-node";
export {
  ImageNode,
  $createImageNode,
  $isImageNode,
  INSERT_IMAGE_COMMAND,
} from "./image-node";
export type { SerializedImageNode, InsertImagePayload } from "./image-node";
export { LudTextNode, $createLudTextNode, $isLudTextNode } from "./lud-text-node";
export type { SerializedLudTextNode } from "./lud-text-node";
export { CommentMarkNode, $createCommentMarkNode, $isCommentMarkNode } from "./comment-mark-node";
export type { SerializedCommentMarkNode } from "./comment-mark-node";
export { DiagramNode, $createDiagramNode, $isDiagramNode } from "./diagram-node";
export type { SerializedDiagramNode } from "./diagram-node";
