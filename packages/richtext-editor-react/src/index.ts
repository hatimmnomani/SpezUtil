import * as React from "react";
import { createComponent, type EventName } from "@lit/react";
import {
  SpezRichtext as SpezRichtextElement,
  type ChangeDetail,
} from "@spezutil/richtext-editor";

export const SpezRichtext = createComponent({
  tagName: "spez-richtext",
  elementClass: SpezRichtextElement,
  react: React,
  events: {
    onChange: "change" as EventName<CustomEvent<ChangeDetail>>,
    onReady: "rte-ready" as EventName<CustomEvent<void>>,
  },
});

export type { ChangeDetail, EditorLocale, ToolbarGroup } from "@spezutil/richtext-editor";
