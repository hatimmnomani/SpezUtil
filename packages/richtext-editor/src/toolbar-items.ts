import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  HISTORY_MERGE_TAG,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type ElementFormatType,
  type LexicalEditor,
  type LexicalNode,
  type TextFormatType,
} from "lexical";
import { $createQuoteNode, type HeadingTagType } from "@lexical/rich-text";
import {
  $copyBlockFormatIndent,
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  $setBlocksType,
} from "@lexical/selection";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $createAnchorHeadingNode, $isAnchorHeadingNode } from "./nodes/heading-node";
import { $createAyatNode } from "./nodes/ayat-node";
import {
  $createTranslitLineNode,
  $createTranslitPairNode,
  $isTranslitPairNode,
  $unwrapTranslitPair,
  type TranslitPairNode,
} from "./nodes/translit-nodes";
import { INSERT_IMAGE_COMMAND } from "./nodes/image-node";
import { SET_DIRECTION_COMMAND } from "./direction";
import { openHijriDatePicker } from "./hijri-insert";
import { listLudFonts, ludFontForFamily } from "./lud-fonts";
import { ADD_COMMENT_MARK_COMMAND } from "./comments/comments";
import { $insertDiagram, DEFAULT_DIAGRAM_SOURCE, type DiagramEditDetail } from "./diagram/diagrams";
import {
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
  colorPopover,
  textInputPopover,
  toHexColor,
  type ColorProperty,
  type PaletteEntry,
} from "./toolbar-popover";
import {
  getToolbarItem,
  registerToolbarItem,
  type ToolbarItemContext,
  type ToolbarItemDefinition,
  type ToolbarSelectionState,
} from "./toolbar-registry";
import { tableToolbarItem } from "./toolbar-table";

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "quote" | "ayat";

/** Text formats the toolbar exposes as toggle buttons; "Clear formatting" turns off whichever are active. */
const CLEARABLE_TEXT_FORMATS: readonly TextFormatType[] = [
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "subscript",
  "superscript",
  "code",
];

/**
 * Translit pairs must be unwrapped before $setBlocksType: the selection's
 * nearest block is the line inside the pair, so $setBlocksType would create
 * the new block inside the pair and the normalizer would fold it right back.
 */
function $unwrapSelectedTranslitPairs(selection: ReturnType<typeof $getSelection>): void {
  if (!$isRangeSelection(selection)) return;
  const pairs = new Set<TranslitPairNode>();
  const collect = (start: LexicalNode | null) => {
    for (let node = start; node !== null; node = node.getParent()) {
      if ($isTranslitPairNode(node)) pairs.add(node);
    }
  };
  collect(selection.anchor.getNode());
  collect(selection.focus.getNode());
  for (const node of selection.getNodes()) collect(node);
  pairs.forEach($unwrapTranslitPair);
}

function $setBlock(editor: LexicalEditor, type: BlockType): void {
  editor.update(() => {
    $unwrapSelectedTranslitPairs($getSelection());
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    switch (type) {
      case "paragraph":
        $setBlocksType(selection, () => $createParagraphNode());
        break;
      case "quote":
        $setBlocksType(selection, () => $createQuoteNode());
        break;
      case "ayat":
        $setBlocksType(selection, () => $createAyatNode());
        break;
      default:
        // A level change (h2 → h3) replaces the node, so the handbook anchor is carried across.
        $setBlocksType(
          selection,
          () => $createAnchorHeadingNode(type as HeadingTagType),
          (prev, next) => {
            $copyBlockFormatIndent(prev, next);
            if ($isAnchorHeadingNode(prev) && $isAnchorHeadingNode(next)) next.setAnchor(prev.getAnchor());
          },
        );
    }
  });
  editor.focus();
}

function insertTranslitPair(editor: LexicalEditor): void {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const pair = $createTranslitPairNode();
    const arabic = $createTranslitLineNode("arabic");
    const latin = $createTranslitLineNode("latin");
    pair.append(arabic, latin);
    const top = selection.anchor.getNode().getTopLevelElement();
    if (top !== null) top.insertAfter(pair);
    else selection.insertNodes([pair]);
    arabic.selectStart();
  });
}


/* -------------------------------------------------------------------------- */
/* Item definitions                                                           */
/* -------------------------------------------------------------------------- */

type ButtonItem = Omit<ToolbarItemDefinition, "create"> & {
  onClick: (ctx: ToolbarItemContext, button: HTMLButtonElement) => void;
  popup?: boolean;
  toggle?: boolean;
};

function buttonItem(spec: ButtonItem): ToolbarItemDefinition {
  const { onClick, popup, toggle, ...def } = spec;
  return {
    ...def,
    create: (ctx) => ctx.button(def, (btn) => onClick(ctx, btn), { popup, toggle }),
  };
}

const pressedWhen = (test: (s: ToolbarSelectionState) => boolean): ToolbarItemDefinition["sync"] =>
  (el, state) => el.setAttribute("aria-pressed", String(test(state)));

const formatItem = (
  id: string,
  format: TextFormatType,
  label: ToolbarItemDefinition["label"],
  extra: Partial<ToolbarItemDefinition> = {},
): ToolbarItemDefinition =>
  buttonItem({
    id,
    label,
    icon: id,
    toggle: true,
    home: "inline",
    moreSection: "text",
    onClick: (ctx) => {
      ctx.editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    sync: pressedWhen((s) => s.selection.hasFormat(format)),
    ...extra,
  });

const alignItem = (
  id: string,
  type: ElementFormatType,
  label: ToolbarItemDefinition["label"],
  extra: Partial<ToolbarItemDefinition> = {},
): ToolbarItemDefinition =>
  buttonItem({
    id,
    label,
    icon: id,
    toggle: true,
    home: "align-dir",
    moreSection: "paragraph",
    onClick: (ctx) => {
      ctx.editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, type);
    },
    sync: (el, s) => {
      // Only an explicit alignment reads as pressed; a block never aligned (the default) shows none.
      el.setAttribute("aria-pressed", String(s.topLevel?.getFormatType() === type));
    },
    ...extra,
  });

const directionItem = (
  id: string,
  direction: "rtl" | "ltr" | null,
  label: ToolbarItemDefinition["label"],
  pressed?: (s: ToolbarSelectionState) => boolean,
): ToolbarItemDefinition =>
  buttonItem({
    id,
    label,
    icon: id,
    home: "align-dir",
    moreSection: "paragraph",
    toggle: pressed !== undefined,
    onClick: (ctx) => {
      ctx.editor.dispatchCommand(SET_DIRECTION_COMMAND, direction);
    },
    sync: pressed ? pressedWhen(pressed) : undefined,
  });

/** A `<select>` built the same way for font family, size and LuD font. */
function selectItem(
  ctx: ToolbarItemContext,
  label: string,
  defaultLabel: string,
  options: readonly { value: string; label: string; family?: string }[],
  apply: (value: string) => void,
): HTMLSelectElement {
  const select = document.createElement("select");
  select.title = label;
  select.setAttribute("aria-label", label);
  const none = document.createElement("option");
  none.value = "";
  none.textContent = defaultLabel;
  select.append(none);
  for (const o of options) {
    const option = document.createElement("option");
    option.value = o.value;
    option.textContent = o.label;
    if (o.family) option.style.fontFamily = o.family;
    select.append(option);
  }
  select.addEventListener("change", () => {
    apply(select.value);
    ctx.editor.focus();
  });
  return select;
}

const patchStyle = (editor: LexicalEditor, style: Record<string, string | null>): void => {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    $patchStyleText(selection, style);
  });
};

/** Sets a select to `value`, falling back to the default row when the value is not one of its options. */
function setSelectValue(select: HTMLSelectElement, value: string): void {
  select.value = value;
  if (select.value !== value) select.value = "";
}

function colorItem(
  id: "text-color" | "highlight-color",
  property: ColorProperty,
  palette: readonly PaletteEntry[],
): ToolbarItemDefinition {
  const def: ToolbarItemDefinition = {
    id,
    label: (t) => (property === "color" ? t.textColor : t.highlightColor),
    icon: property === "color" ? "text-color" : "highlight",
    home: "color",
    create: (ctx) => {
      const apply = (value: string | null, merge: boolean): void => {
        ctx.editor.update(
          () => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            $patchStyleText(selection, { [property]: value });
          },
          merge ? { tag: HISTORY_MERGE_TAG } : undefined,
        );
      };
      const btn = ctx.button(
        def,
        (self) => {
          const close = ctx.openPopover(
            colorPopover(property, palette, self.getAttribute("data-value") ?? "", ctx.t, apply, () => {
              close();
              ctx.editor.focus();
            }),
            self,
          );
        },
        { popup: true },
      );
      btn.classList.add("spez-rte-color-btn");
      btn.dataset.property = property;
      const glyph = document.createElement("span");
      glyph.className = "spez-rte-color-glyph";
      glyph.append(...Array.from(btn.childNodes));
      const bar = document.createElement("span");
      bar.className = "spez-rte-color-bar";
      btn.append(glyph, bar);
      return btn;
    },
    sync: (el, s) => {
      const value = $getSelectionStyleValueForProperty(s.selection, property, "");
      const bar = el.querySelector<HTMLElement>(".spez-rte-color-bar");
      if (bar) bar.style.background = value;
      if (value === "") el.removeAttribute("data-value");
      else el.setAttribute("data-value", value);
    },
  };
  return def;
}

const listItem = (id: "bullet-list" | "number-list"): ToolbarItemDefinition =>
  buttonItem({
    id,
    label: (t) => (id === "bullet-list" ? t.bulletList : t.numberList),
    icon: id,
    flip: id === "bullet-list",
    toggle: true,
    home: "lists",
    onClick: (ctx, btn) => {
      const active = btn.getAttribute("aria-pressed") === "true";
      ctx.editor.dispatchCommand(
        active ? REMOVE_LIST_COMMAND : id === "bullet-list" ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
        undefined,
      );
    },
    sync: pressedWhen((s) => s.listType === (id === "bullet-list" ? "bullet" : "number")),
  });

export const BUILTIN_TOOLBAR_ITEMS: readonly ToolbarItemDefinition[] = [
  buttonItem({
    id: "undo",
    label: (t) => t.undo,
    icon: "undo",
    shortcut: "mod+Z",
    home: "history",
    onClick: (ctx) => {
      ctx.editor.dispatchCommand(UNDO_COMMAND, undefined);
    },
  }),
  buttonItem({
    id: "redo",
    label: (t) => t.redo,
    icon: "redo",
    shortcut: "mod+shift+Z",
    home: "history",
    onClick: (ctx) => {
      ctx.editor.dispatchCommand(REDO_COMMAND, undefined);
    },
  }),
  {
    id: "block",
    label: (t) => t.blockStyle,
    home: "block",
    create: (ctx) => {
      const { t } = ctx;
      const select = document.createElement("select");
      select.title = t.blockStyle;
      select.setAttribute("aria-label", t.blockStyle);
      const options: Array<[BlockType, string]> = [
        ["paragraph", t.paragraph],
        ["h1", t.heading1],
        ["h2", t.heading2],
        ["h3", t.heading3],
        ["quote", t.quote],
        ["ayat", t.ayat],
      ];
      for (const [value, label] of options) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.append(option);
      }
      select.addEventListener("change", () => $setBlock(ctx.editor, select.value as BlockType));
      return select;
    },
    sync: (el, s) => {
      (el as HTMLSelectElement).value = s.blockType;
    },
  },
  {
    id: "font-family",
    label: (t) => t.font,
    home: "font",
    moreSection: "text",
    create: (ctx) => {
      if (ctx.fonts.length === 0) return null;
      return selectItem(
        ctx,
        ctx.t.font,
        ctx.t.fontDefault,
        ctx.fonts.map((f) => ({ value: f.family, label: f.label, family: f.family })),
        (family) => patchStyle(ctx.editor, { "font-family": family === "" ? null : family }),
      );
    },
    sync: (el, s) => setSelectValue(el as HTMLSelectElement, $getSelectionStyleValueForProperty(s.selection, "font-family", "")),
  },
  {
    id: "font-size",
    label: (t) => t.fontSize,
    home: "font",
    moreSection: "text",
    create: (ctx) => {
      if (ctx.fontSizes.length === 0) return null;
      return selectItem(
        ctx,
        ctx.t.fontSize,
        ctx.t.fontDefault,
        ctx.fontSizes.map((f) => ({ value: f.size, label: f.label })),
        (size) => patchStyle(ctx.editor, { "font-size": size === "" ? null : size }),
      );
    },
    sync: (el, s) => setSelectValue(el as HTMLSelectElement, $getSelectionStyleValueForProperty(s.selection, "font-size", "")),
  },
  {
    id: "lud-font",
    label: (t) => t.ludFont,
    home: "lud",
    moreSection: "text",
    create: (ctx) => {
      const fonts = listLudFonts();
      const families = new Map(fonts.map((f) => [f.id, f.family]));
      return selectItem(
        ctx,
        ctx.t.ludFont,
        ctx.t.ludFontNone,
        fonts.map((f) => ({
          value: f.id,
          label: f.draft ? `${f.label} ${ctx.t.ludFontDraft}` : f.label,
          family: f.family,
        })),
        // lud-sync.ts turns text carrying a LuD family into lud-text (and back).
        (id) => patchStyle(ctx.editor, { "font-family": families.get(id) ?? null }),
      );
    },
    sync: (el, s) => {
      const family = $getSelectionStyleValueForProperty(s.selection, "font-family", "");
      setSelectValue(el as HTMLSelectElement, ludFontForFamily(family) ?? "");
    },
  },
  formatItem("bold", "bold", (t) => t.bold, { shortcut: "mod+B" }),
  formatItem("italic", "italic", (t) => t.italic, { shortcut: "mod+I" }),
  formatItem("underline", "underline", (t) => t.underline, { shortcut: "mod+U" }),
  formatItem("strikethrough", "strikethrough", (t) => t.strikethrough),
  formatItem("subscript", "subscript", (t) => t.subscript),
  formatItem("superscript", "superscript", (t) => t.superscript),
  formatItem("code", "code", (t) => t.inlineCode),
  buttonItem({
    id: "clear-formatting",
    label: (t) => t.clearFormatting,
    icon: "clear-formatting",
    home: "inline",
    onClick: (ctx) => {
      ctx.editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        for (const fmt of CLEARABLE_TEXT_FORMATS) {
          if (selection.hasFormat(fmt)) ctx.editor.dispatchCommand(FORMAT_TEXT_COMMAND, fmt);
        }
        $patchStyleText(selection, {
          "font-family": null,
          "font-size": null,
          color: null,
          "background-color": null,
        });
      });
      ctx.editor.focus();
    },
  }),
  colorItem("text-color", "color", TEXT_COLORS),
  colorItem("highlight-color", "background-color", HIGHLIGHT_COLORS),
  listItem("bullet-list"),
  listItem("number-list"),
  buttonItem({
    id: "outdent",
    label: (t) => t.outdent,
    icon: "outdent",
    flip: true,
    shortcut: "shift+Tab",
    home: "lists",
    onClick: (ctx) => {
      ctx.editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
    },
  }),
  buttonItem({
    id: "indent",
    label: (t) => t.indent,
    icon: "indent",
    flip: true,
    shortcut: "Tab",
    home: "lists",
    onClick: (ctx) => {
      ctx.editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
    },
  }),
  alignItem("align-start", "start", (t) => t.alignStart, { flip: true }),
  alignItem("align-center", "center", (t) => t.alignCenter),
  alignItem("align-end", "end", (t) => t.alignEnd, { flip: true }),
  alignItem("align-justify", "justify", (t) => t.alignJustify),
  directionItem("dir-rtl", "rtl", (t) => t.dirRtl, (s) => s.direction === "rtl"),
  directionItem("dir-ltr", "ltr", (t) => t.dirLtr, (s) => s.direction === "ltr"),
  directionItem("dir-auto", null, (t) => t.dirAuto),
  buttonItem({
    id: "link",
    label: (t) => t.link,
    icon: "link",
    toggle: true,
    popup: true,
    home: "insert",
    onClick: (ctx, btn) => {
      if (btn.getAttribute("aria-pressed") === "true") {
        ctx.editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        return;
      }
      const close = ctx.openPopover(
        textInputPopover(ctx.t.linkPlaceholder, ctx.t.insert, (url) => {
          ctx.editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
          close();
        }),
        btn,
      );
    },
    sync: pressedWhen((s) => s.inLink),
  }),
  buttonItem({
    id: "image",
    label: (t) => t.image,
    icon: "image",
    popup: true,
    home: "insert",
    onClick: (ctx, btn) => {
      const close = ctx.openPopover(
        textInputPopover(ctx.t.imagePlaceholder, ctx.t.insert, (src) => {
          ctx.editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src });
          close();
        }),
        btn,
      );
    },
  }),
  tableToolbarItem,
  buttonItem({
    id: "hijri-date",
    label: (t) => t.hijriDate,
    icon: "hijri-date",
    popup: true,
    home: "insert",
    moreSection: "insert",
    onClick: (ctx, btn) => {
      openHijriDatePicker(ctx.editor, ctx.locale, (content) => ctx.openPopover(content, btn));
    },
  }),
  buttonItem({
    id: "ayat",
    label: (t) => t.ayat,
    icon: "ayat",
    home: "insert",
    moreSection: "insert",
    onClick: (ctx) => $setBlock(ctx.editor, "ayat"),
  }),
  buttonItem({
    id: "transliteration",
    label: (t) => t.translit,
    icon: "transliteration",
    home: "insert",
    moreSection: "insert",
    onClick: (ctx) => insertTranslitPair(ctx.editor),
  }),
  buttonItem({
    id: "comment",
    label: (t) => t.comment,
    icon: "comment",
    home: "comment",
    optIn: true,
    onClick: (ctx) => {
      ctx.editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, undefined);
    },
  }),
  buttonItem({
    id: "diagram",
    label: (t) => t.diagram,
    icon: "diagram",
    home: "insert",
    onClick: (ctx) => {
      let detail: DiagramEditDetail | null = null;
      ctx.editor.update(
        () => {
          const nodeKey = $insertDiagram(DEFAULT_DIAGRAM_SOURCE);
          detail = { nodeKey, source: DEFAULT_DIAGRAM_SOURCE, drawioKey: null };
        },
        { discrete: true },
      );
      if (detail !== null) ctx.emitDiagramEdit(detail);
    },
  }),
];

/**
 * Registers the built-in items that nobody has registered under that id yet (so an app's replacement,
 * registered earlier, survives). Called explicitly rather than as a module side effect: the package is
 * marked side-effect-free, and a bundler would drop a bare registration loop.
 */
export function ensureBuiltinToolbarItems(): void {
  for (const item of BUILTIN_TOOLBAR_ITEMS) if (!getToolbarItem(item.id)) registerToolbarItem(item);
}

