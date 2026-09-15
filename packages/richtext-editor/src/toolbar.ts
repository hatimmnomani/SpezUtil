import {
  $createParagraphNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type ElementFormatType,
  type LexicalEditor,
  type LexicalNode,
  type TextFormatType,
} from "lexical";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  $setBlocksType,
} from "@lexical/selection";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  ListNode,
} from "@lexical/list";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import { $createAyatNode, $isAyatNode } from "./nodes/ayat-node";
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
import { getLocaleStrings, type EditorLocale, type LocaleStrings } from "./locale";
import { ARABIC_FONT_FAMILY } from "./font-arabic";

export const ALL_TOOLBAR_GROUPS = [
  "history",
  "block",
  "font",
  "inline",
  "color",
  "list",
  "align",
  "direction",
  "insert",
] as const;

export type ToolbarGroup = (typeof ALL_TOOLBAR_GROUPS)[number];

/** One entry in the toolbar font selector. `family` is a CSS font-family value. */
export interface FontOption {
  label: string;
  family: string;
}

/**
 * Default font list: the embedded Arabic font first, then stacks that are
 * safe cross-platform with good Arabic coverage, then Latin/system choices.
 */
export const DEFAULT_FONTS: readonly FontOption[] = [
  { label: ARABIC_FONT_FAMILY, family: `"${ARABIC_FONT_FAMILY}", serif` },
  { label: "Traditional Arabic", family: '"Traditional Arabic", serif' },
  { label: "Tahoma", family: "Tahoma, sans-serif" },
  { label: "Arial", family: "Arial, sans-serif" },
  { label: "Georgia", family: "Georgia, serif" },
  { label: "Monospace", family: "monospace" },
];

/** One entry in the toolbar colour swatches. `value` is a CSS color value. */
export interface ColorOption {
  label: string;
  value: string;
}

/**
 * Default palette, shared by the text-colour and highlight controls. A fixed
 * list rather than a free picker: authored content has to stay inside the
 * host's design, and an arbitrary picker produces unreadable pairings and
 * unpredictable exported HTML. Dark inks first (they read as text colours),
 * then light tints (they read as highlights).
 */
export const DEFAULT_COLORS: readonly ColorOption[] = [
  { label: "Black", value: "#1f2933" },
  { label: "Grey", value: "#6b7280" },
  { label: "Red", value: "#c62828" },
  { label: "Orange", value: "#e07b00" },
  { label: "Green", value: "#0b7d3e" },
  { label: "Teal", value: "#0f766e" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Purple", value: "#6b21a8" },
  { label: "Yellow", value: "#fff3a3" },
  { label: "Mint", value: "#d7f5e3" },
  { label: "Sky", value: "#dbeafe" },
  { label: "White", value: "#ffffff" },
];

/** The two CSS properties the colour controls patch onto the selection. */
type ColorProperty = "color" | "background-color";

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "quote" | "ayat";

interface ToolbarRefs {
  buttons: Map<string, HTMLButtonElement>;
  blockSelect: HTMLSelectElement | null;
  fontSelect: HTMLSelectElement | null;
  colorBars: Map<ColorProperty, HTMLElement>;
}

function button(
  label: string,
  title: string,
  onClick: () => void,
  refs: ToolbarRefs,
  refKey?: string,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.title = title;
  btn.setAttribute("aria-label", title);
  // Preserve the editor selection: buttons must not steal focus on click.
  btn.addEventListener("pointerdown", (event) => event.preventDefault());
  btn.addEventListener("click", onClick);
  if (refKey) refs.buttons.set(refKey, btn);
  return btn;
}

function group(name: ToolbarGroup, ...children: HTMLElement[]): HTMLElement {
  const div = document.createElement("div");
  div.className = "spez-rte-group";
  div.setAttribute("data-group", name);
  div.append(...children);
  return div;
}

/** Popover anchored under the toolbar; closes on Escape or outside pointerdown. */
function createPopoverOpener(host: HTMLElement, toolbar: HTMLElement) {
  let activeClose: (() => void) | null = null;
  return (content: HTMLElement, onClose?: () => void): (() => void) => {
    activeClose?.();
    const pop = document.createElement("div");
    pop.className = "spez-rte-popover";
    pop.style.insetBlockStart = `${toolbar.offsetTop + toolbar.offsetHeight + 2}px`;
    pop.style.insetInlineStart = "8px";
    pop.append(content);
    host.append(pop);
    const onPointerDown = (event: Event) => {
      if (!pop.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const close = () => {
      if (activeClose === close) activeClose = null;
      pop.remove();
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      onClose?.();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    activeClose = close;
    const input = pop.querySelector("input");
    if (input) input.focus();
    return close;
  };
}

function textInputPopover(
  placeholder: string,
  submitLabel: string,
  onSubmit: (value: string) => void,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.display = "contents";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  const ok = document.createElement("button");
  ok.type = "button";
  ok.textContent = submitLabel;
  const submit = () => {
    const value = input.value.trim();
    if (value) onSubmit(value);
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  });
  ok.addEventListener("click", submit);
  wrap.append(input, ok);
  return wrap;
}

/**
 * Grid of fixed colour swatches, plus a leading "none" swatch that clears the
 * property. Swatches are buttons like the rest of the toolbar, so they keep
 * the editor selection by cancelling the default pointerdown focus shift.
 */
/**
 * Canonical form of a CSS colour, through the DOM's own parser.
 *
 * The palette stores what the author wrote (`#c62828`), but a colour that has been
 * through an HTML save/load cycle comes back normalised (`rgb(198, 40, 40)`) — see
 * the import allowlist in nodes/text-style.ts. Comparing the two as raw strings marks
 * a freshly-picked colour as active and the same colour loaded from storage as not,
 * so both sides are put through one lens first. Returns "" for an unparseable value.
 */
function canonicalColor(value: string): string {
  if (value === "") return "";
  const probe = document.createElement("span");
  probe.style.color = value;
  return probe.style.color;
}

function swatchGrid(
  colors: readonly ColorOption[],
  noneLabel: string,
  current: string,
  onPick: (value: string | null) => void,
): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "spez-rte-swatches";
  grid.setAttribute("role", "group");
  const swatch = (label: string, value: string | null) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = value === null ? "spez-rte-swatch spez-rte-swatch-none" : "spez-rte-swatch";
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.setAttribute(
      "aria-pressed",
      String(value === null ? current === "" : canonicalColor(value) === canonicalColor(current)),
    );
    if (value !== null) btn.style.background = value;
    btn.addEventListener("pointerdown", (event) => event.preventDefault());
    btn.addEventListener("click", () => onPick(value));
    return btn;
  };
  grid.append(swatch(noneLabel, null), ...colors.map((c) => swatch(c.label, c.value)));
  return grid;
}

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
        $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
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

export interface ToolbarInstance {
  element: HTMLElement;
  dispose: () => void;
}

export function buildToolbar(
  editor: LexicalEditor,
  host: HTMLElement,
  groups: readonly ToolbarGroup[],
  locale: EditorLocale,
  fonts: readonly FontOption[] = DEFAULT_FONTS,
  colors: readonly ColorOption[] = DEFAULT_COLORS,
): ToolbarInstance {
  const t: LocaleStrings = getLocaleStrings(locale);
  const refs: ToolbarRefs = {
    buttons: new Map(),
    blockSelect: null,
    fontSelect: null,
    colorBars: new Map(),
  };
  const toolbar = document.createElement("div");
  toolbar.className = "spez-rte-toolbar";
  toolbar.setAttribute("role", "toolbar");
  const openPopover = createPopoverOpener(host, toolbar);
  const format = (type: TextFormatType) => () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);
  };
  const align = (type: ElementFormatType) => () => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, type);
  };
  const colorControl = (property: ColorProperty, glyph: string, title: string) => {
    const btn = button(glyph, title, () => {
      const current = editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return "";
        return $getSelectionStyleValueForProperty(selection, property, "");
      });
      const grid = swatchGrid(colors, t.colorNone, current, (value) => {
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;
          $patchStyleText(selection, { [property]: value });
        });
        editor.focus();
        close();
      });
      const close = openPopover(grid, () => btn.setAttribute("aria-expanded", "false"));
      btn.setAttribute("aria-expanded", "true");
      (grid.firstElementChild as HTMLElement | null)?.focus();
    }, refs);
    btn.classList.add("spez-rte-color-button");
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    // Bar under the glyph, mirroring the colour currently on the selection.
    const bar = document.createElement("span");
    bar.className = "spez-rte-color-bar";
    btn.append(bar);
    refs.colorBars.set(property, bar);
    return btn;
  };

  for (const name of groups) {
    switch (name) {
      case "history":
        toolbar.append(
          group(
            name,
            button("↶", t.undo, () => editor.dispatchCommand(UNDO_COMMAND, undefined), refs, "undo"),
            button("↷", t.redo, () => editor.dispatchCommand(REDO_COMMAND, undefined), refs, "redo"),
          ),
        );
        break;
      case "block": {
        const select = document.createElement("select");
        select.title = t.paragraph;
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
        select.addEventListener("change", () => $setBlock(editor, select.value as BlockType));
        refs.blockSelect = select;
        toolbar.append(group(name, select));
        break;
      }
      case "font": {
        if (fonts.length === 0) break;
        const select = document.createElement("select");
        select.title = t.font;
        select.setAttribute("aria-label", t.font);
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = t.fontDefault;
        select.append(defaultOption);
        for (const { label, family } of fonts) {
          const option = document.createElement("option");
          option.value = family;
          option.textContent = label;
          option.style.fontFamily = family;
          select.append(option);
        }
        select.addEventListener("change", () => {
          const family = select.value;
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            $patchStyleText(selection, { "font-family": family === "" ? null : family });
          });
          editor.focus();
        });
        refs.fontSelect = select;
        toolbar.append(group(name, select));
        break;
      }
      case "inline":
        toolbar.append(
          group(
            name,
            button("B", t.bold, format("bold"), refs, "bold"),
            button("I", t.italic, format("italic"), refs, "italic"),
            button("U", t.underline, format("underline"), refs, "underline"),
            button("S", t.strikethrough, format("strikethrough"), refs, "strikethrough"),
          ),
        );
        break;
      case "color": {
        if (colors.length === 0) break;
        toolbar.append(
          group(
            name,
            colorControl("color", "A", t.textColor),
            colorControl("background-color", "🖍", t.highlight),
          ),
        );
        break;
      }
      case "list":
        toolbar.append(
          group(
            name,
            button("•", t.bulletList, () => {
              const active = refs.buttons.get("bullet")?.getAttribute("aria-pressed") === "true";
              editor.dispatchCommand(
                active ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
                undefined,
              );
            }, refs, "bullet"),
            button("1.", t.numberList, () => {
              const active = refs.buttons.get("number")?.getAttribute("aria-pressed") === "true";
              editor.dispatchCommand(
                active ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
                undefined,
              );
            }, refs, "number"),
          ),
        );
        break;
      case "align":
        toolbar.append(
          group(
            name,
            button("⇤", t.alignStart, align("start"), refs),
            button("↔", t.alignCenter, align("center"), refs),
            button("⇥", t.alignEnd, align("end"), refs),
            button("⟺", t.alignJustify, align("justify"), refs),
          ),
        );
        break;
      case "direction":
        toolbar.append(
          group(
            name,
            button("RTL", t.dirRtl, () => editor.dispatchCommand(SET_DIRECTION_COMMAND, "rtl"), refs, "rtl"),
            button("LTR", t.dirLtr, () => editor.dispatchCommand(SET_DIRECTION_COMMAND, "ltr"), refs, "ltr"),
            button("A↔", t.dirAuto, () => editor.dispatchCommand(SET_DIRECTION_COMMAND, null), refs),
          ),
        );
        break;
      case "insert":
        toolbar.append(
          group(
            name,
            button("🔗", t.link, () => {
              if (refs.buttons.get("link")?.getAttribute("aria-pressed") === "true") {
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
                return;
              }
              const close = openPopover(
                textInputPopover(t.linkPlaceholder, t.insert, (url) => {
                  editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
                  close();
                }),
              );
            }, refs, "link"),
            button("🖼", t.image, () => {
              const close = openPopover(
                textInputPopover(t.imagePlaceholder, t.insert, (src) => {
                  editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src });
                  close();
                }),
              );
            }, refs),
            button("⊞", t.table, () => {
              const wrap = document.createElement("div");
              wrap.style.display = "contents";
              const rows = document.createElement("input");
              rows.type = "number";
              rows.min = "1";
              rows.value = "3";
              const rowsLabel = document.createElement("label");
              rowsLabel.append(`${t.rows}:`, rows);
              const cols = document.createElement("input");
              cols.type = "number";
              cols.min = "1";
              cols.value = "3";
              const colsLabel = document.createElement("label");
              colsLabel.append(`${t.columns}:`, cols);
              const ok = document.createElement("button");
              ok.type = "button";
              ok.textContent = t.insert;
              ok.addEventListener("click", () => {
                editor.dispatchCommand(INSERT_TABLE_COMMAND, {
                  rows: rows.value || "3",
                  columns: cols.value || "3",
                });
                close();
              });
              wrap.append(rowsLabel, colsLabel, ok);
              const close = openPopover(wrap);
            }, refs),
            button("📅", t.hijriDate, () => {
              openHijriDatePicker(editor, locale, openPopover);
            }, refs),
            button("۞", t.ayat, () => $setBlock(editor, "ayat"), refs),
            button("ت/t", t.translit, () => insertTranslitPair(editor), refs),
          ),
        );
        break;
    }
  }

  const setPressed = (key: string, pressed: boolean) => {
    refs.buttons.get(key)?.setAttribute("aria-pressed", String(pressed));
  };

  const syncState = () => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      setPressed("bold", selection.hasFormat("bold"));
      setPressed("italic", selection.hasFormat("italic"));
      setPressed("underline", selection.hasFormat("underline"));
      setPressed("strikethrough", selection.hasFormat("strikethrough"));

      const anchorNode = selection.anchor.getNode();
      const top = anchorNode.getTopLevelElement();
      let blockType: BlockType = "paragraph";
      let listType: "bullet" | "number" | null = null;
      if ($isHeadingNode(top)) blockType = top.getTag() as BlockType;
      else if ($isQuoteNode(top)) blockType = "quote";
      else if ($isAyatNode(top)) blockType = "ayat";
      else if ($isListNode(top)) {
        const nearestList = $findMatchingParent(anchorNode, $isListNode) as ListNode | null;
        const type = (nearestList ?? top).getListType();
        listType = type === "number" ? "number" : "bullet";
      }
      if (refs.blockSelect) refs.blockSelect.value = blockType;

      if (refs.fontSelect) {
        const family = $getSelectionStyleValueForProperty(selection, "font-family", "");
        // Unknown families (e.g. pasted content) fall back to the default row.
        refs.fontSelect.value = family;
        if (refs.fontSelect.value !== family) refs.fontSelect.value = "";
      }
      for (const [property, bar] of refs.colorBars) {
        const value = $getSelectionStyleValueForProperty(selection, property, "");
        bar.style.background = value === "" ? "transparent" : value;
      }
      setPressed("bullet", listType === "bullet");
      setPressed("number", listType === "number");

      const dir = top !== null && $isElementNode(top) ? top.getDirection() : null;
      setPressed("rtl", dir === "rtl");
      setPressed("ltr", dir === "ltr");

      const linkParent = $findMatchingParent(anchorNode, $isLinkNode);
      setPressed("link", linkParent !== null);
    });
  };

  const dispose = mergeRegister(
    editor.registerUpdateListener(syncState),
    editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        const undo = refs.buttons.get("undo");
        if (undo) undo.disabled = !payload;
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        const redo = refs.buttons.get("redo");
        if (redo) redo.disabled = !payload;
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
  );
  const undoBtn = refs.buttons.get("undo");
  const redoBtn = refs.buttons.get("redo");
  if (undoBtn) undoBtn.disabled = true;
  if (redoBtn) redoBtn.disabled = true;
  syncState();

  return { element: toolbar, dispose };
}
