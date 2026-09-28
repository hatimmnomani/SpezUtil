import * as React from "react";
import { createComponent, type EventName } from "@lit/react";
import {
  SpezRichtext as SpezRichtextElement,
  type ChangeDetail,
  type CommentClickDetail,
  type CommentRequestDetail,
  type DiagramEditDetail,
} from "@spezutil/richtext-editor";

export const SpezRichtext = createComponent({
  tagName: "spez-richtext",
  elementClass: SpezRichtextElement,
  react: React,
  events: {
    onChange: "change" as EventName<CustomEvent<ChangeDetail>>,
    onReady: "rte-ready" as EventName<CustomEvent<void>>,
    onCommentRequested: "comment-requested" as EventName<CustomEvent<CommentRequestDetail>>,
    onCommentClicked: "comment-clicked" as EventName<CustomEvent<CommentClickDetail>>,
    onDiagramEditRequested: "diagram-edit-requested" as EventName<CustomEvent<DiagramEditDetail>>,
  },
});

export { DEFAULT_FONTS, DEFAULT_TOOLBAR_GROUPS, listLudFonts, setDiagramRenderer } from "@spezutil/richtext-editor";
export type {
  ChangeDetail,
  CommentClickDetail,
  CommentRequestDetail,
  DiagramEditDetail,
  DiagramRenderer,
  EditorLocale,
  FontOption,
  FontSizeOption,
  LudFontOption,
  ToolbarGroup,
} from "@spezutil/richtext-editor";
