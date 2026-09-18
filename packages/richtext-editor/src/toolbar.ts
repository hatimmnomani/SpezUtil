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
  "indent",
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

/** One entry in the toolbar font-size selector. `size` is a CSS length (e.g. `"16px"`). */
export interface FontSizeOption {
  label: string;
  size: string;
}

export const DEFAULT_FONT_SIZES: readonly FontSizeOption[] = [
  { label: "12px", size: "12px" },
  { label: "14px", size: "14px" },
  { label: "16px", size: "16px" },
  { label: "18px", size: "18px" },
  { label: "20px", size: "20px" },
  { label: "24px", size: "24px" },
  { label: "28px", size: "28px" },
  { label: "32px", size: "32px" },
  { label: "36px", size: "36px" },
  { label: "48px", size: "48px" },
];

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "quote" | "ayat";

type ColorProperty = "color" | "background-color";

interface PaletteEntry {
  name: keyof LocaleStrings;
  value: string;
}

const TEXT_COLORS: readonly PaletteEntry[] = [
  { name: "colorBlack", value: "#000000" },
  { name: "colorDarkGray", value: "#4b5563" },
  { name: "colorGray", value: "#9ca3af" },
  { name: "colorBrown", value: "#6d4c41" },
  { name: "colorRed", value: "#c62828" },
  { name: "colorOrange", value: "#ef6c00" },
  { name: "colorYellow", value: "#f9a825" },
  { name: "colorGreen", value: "#2e7d32" },
  { name: "colorTeal", value: "#00838f" },
  { name: "colorBlue", value: "#1565c0" },
  { name: "colorPurple", value: "#6a1b9a" },
  { name: "colorPink", value: "#ad1457" },
];

const HIGHLIGHT_COLORS: readonly PaletteEntry[] = [
  { name: "colorYellow", value: "#fff59d" },
  { name: "colorOrange", value: "#ffe0b2" },
  { name: "colorRed", value: "#ffcdd2" },
  { name: "colorPink", value: "#f8bbd0" },
  { name: "colorPurple", value: "#e1bee7" },
  { name: "colorBlue", value: "#bbdefb" },
  { name: "colorTeal", value: "#b2dfdb" },
  { name: "colorGreen", value: "#c8e6c9" },
  { name: "colorBrown", value: "#d7ccc8" },
  { name: "colorGray", value: "#e0e0e0" },
  { name: "colorDarkGray", value: "#bdbdbd" },
  { name: "colorWhite", value: "#ffffff" },
];

const PALETTE_COLUMNS = 6;

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

interface ColorControl {
  button: HTMLButtonElement;
  swatch: HTMLElement;
  value: string;
}

interface ToolbarRefs {
  buttons: Map<string, HTMLButtonElement>;
  blockSelect: HTMLSelectElement | null;
  fontSelect: HTMLSelectElement | null;
  fontSizeSelect: HTMLSelectElement | null;
  colors: Map<ColorProperty, ColorControl>;
}

function button(
  label: string,
  title: string,
  onClick: (btn: HTMLButtonElement) => void,
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
  btn.addEventListener("click", () => onClick(btn));
  if (refKey) refs.buttons.set(refKey, btn);
  return btn;
}

/** `<input type="color">` only accepts `#rrggbb`; stored styles may be any CSS color. */
function toHexColor(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${[...v.slice(1)].map((c) => c + c).join("")}`;
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(v);
  if (rgb) {
    return `#${rgb
      .slice(1, 4)
      .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return null;
}

function group(name: ToolbarGroup, ...children: HTMLElement[]): HTMLElement {
  const div = document.createElement("div");
  div.className = "spez-rte-group";
  div.setAttribute("data-group", name);
  div.append(...children);
  return div;
}

const POPOVER_INSET = 8;

/**
 * Popover under the toolbar, aligned to `anchor`'s inline-start edge when
 * given (clamped inside the host); closes on Escape or outside pointerdown.
 */
function createPopoverOpener(host: HTMLElement, toolbar: HTMLElement) {
  let activeClose: (() => void) | null = null;
  return (content: HTMLElement, anchor?: HTMLElement): (() => void) => {
    activeClose?.();
    const pop = document.createElement("div");
    pop.className = "spez-rte-popover";
    pop.style.insetBlockStart = `${toolbar.offsetTop + toolbar.offsetHeight + 2}px`;
    pop.append(content);
    host.append(pop);
    let start = POPOVER_INSET;
    if (anchor) {
      const hostRect = host.getBoundingClientRect();
      const rect = anchor.getBoundingClientRect();
      const rtl = getComputedStyle(host).direction === "rtl";
      start = rtl ? hostRect.right - rect.right : rect.left - hostRect.left;
      start = Math.max(POPOVER_INSET, Math.min(start, host.clientWidth - pop.offsetWidth - POPOVER_INSET));
      anchor.setAttribute("aria-expanded", "true");
    }
    pop.style.insetInlineStart = `${start}px`;
    const onPointerDown = (event: Event) => {
      if (!pop.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const close = () => {
      if (activeClose === close) activeClose = null;
      pop.remove();
      anchor?.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    activeClose = close;
    const focusTarget = pop.querySelector<HTMLElement>("[data-autofocus], input");
    if (focusTarget) focusTarget.focus();
    return close;
  };
}

type PopoverOpener = ReturnType<typeof createPopoverOpener>;

function colorPopover(
  property: ColorProperty,
  palette: readonly PaletteEntry[],
  current: string,
  t: LocaleStrings,
  apply: (value: string | null, merge: boolean) => void,
  done: () => void,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "spez-rte-color-popover";
  wrap.dataset.property = property;

  const grid = document.createElement("div");
  grid.className = "spez-rte-color-grid";
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", property === "color" ? t.textColor : t.highlightColor);
  const currentHex = toHexColor(current);
  const swatches: HTMLButtonElement[] = [];
  for (const { name, value } of palette) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "spez-rte-swatch";
    swatch.style.setProperty("--swatch", value);
    swatch.title = t[name];
    swatch.setAttribute("aria-label", t[name]);
    swatch.setAttribute("aria-pressed", String(value === currentHex));
    swatch.dataset.value = value;
    swatch.addEventListener("click", () => {
      apply(value, false);
      done();
    });
    swatches.push(swatch);
    grid.append(swatch);
  }
  (swatches.find((s) => s.getAttribute("aria-pressed") === "true") ?? swatches[0])?.setAttribute(
    "data-autofocus",
    "",
  );
  grid.addEventListener("keydown", (event) => {
    const index = swatches.indexOf(event.target as HTMLButtonElement);
    if (index === -1) return;
    const rtl = getComputedStyle(grid).direction === "rtl";
    const delta: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowDown: PALETTE_COLUMNS,
      ArrowUp: -PALETTE_COLUMNS,
    };
    const step = delta[event.key];
    if (step === undefined) return;
    const next = swatches[index + step];
    if (next) {
      event.preventDefault();
      next.focus();
    }
  });

  const actions = document.createElement("div");
  actions.className = "spez-rte-color-actions";

  const custom = document.createElement("label");
  custom.className = "spez-rte-color-custom";
  const preview = document.createElement("span");
  preview.className = "spez-rte-color-preview";
  const input = document.createElement("input");
  input.type = "color";
  input.value = currentHex ?? (property === "color" ? "#000000" : "#ffff00");
  input.setAttribute("aria-label", t.customColor);
  preview.style.setProperty("--swatch", input.value);
  // Browsers fire `input` continuously while the native picker is open; the
  // first pick creates one history entry and later ones merge into it, so
  // undo reverts the whole picking session at once.
  let picking = false;
  let lastApplied: string | null = null;
  const applyCustom = () => {
    if (input.value === lastApplied) return;
    lastApplied = input.value;
    preview.style.setProperty("--swatch", input.value);
    apply(input.value, picking);
    picking = true;
  };
  input.addEventListener("input", applyCustom);
  input.addEventListener("change", () => {
    applyCustom();
    done();
  });
  custom.append(preview, input, document.createTextNode(t.customColor));

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "spez-rte-color-reset";
  reset.textContent = t.resetColor;
  reset.addEventListener("click", () => {
    apply(null, false);
    done();
  });

  actions.append(custom, reset);
  wrap.append(grid, actions);
  return wrap;
}

function colorControl(
  editor: LexicalEditor,
  property: ColorProperty,
  palette: readonly PaletteEntry[],
  t: LocaleStrings,
  openPopover: PopoverOpener,
  refs: ToolbarRefs,
): HTMLButtonElement {
  const title = property === "color" ? t.textColor : t.highlightColor;
  const apply = (value: string | null, merge: boolean) => {
    editor.update(
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $patchStyleText(selection, { [property]: value });
      },
      merge ? { tag: HISTORY_MERGE_TAG } : undefined,
    );
  };
  const btn = button("", title, (self) => {
    const control = refs.colors.get(property)!;
    const close = openPopover(
      colorPopover(property, palette, control.value, t, apply, () => {
        close();
        editor.focus();
      }),
      self,
    );
  }, refs);
  btn.className = "spez-rte-color-btn";
  btn.dataset.property = property;
  btn.setAttribute("aria-haspopup", "dialog");
  btn.setAttribute("aria-expanded", "false");
  const glyph = document.createElement("span");
  glyph.className = "spez-rte-color-glyph";
  glyph.textContent = "A";
  const swatch = document.createElement("span");
  swatch.className = "spez-rte-color-bar";
  btn.append(glyph, swatch);
  refs.colors.set(property, { button: btn, swatch, value: "" });
  return btn;
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
  fontSizes: readonly FontSizeOption[] = DEFAULT_FONT_SIZES,
): ToolbarInstance {
  const t: LocaleStrings = getLocaleStrings(locale);
  const refs: ToolbarRefs = {
    buttons: new Map(),
    blockSelect: null,
    fontSelect: null,
    fontSizeSelect: null,
    colors: new Map(),
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
        const children: HTMLElement[] = [];
        if (fonts.length > 0) {
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
          children.push(select);
        }
        if (fontSizes.length > 0) {
          const sizeSelect = document.createElement("select");
          sizeSelect.title = t.fontSize;
          sizeSelect.setAttribute("aria-label", t.fontSize);
          const defaultOption = document.createElement("option");
          defaultOption.value = "";
          defaultOption.textContent = t.fontDefault;
          sizeSelect.append(defaultOption);
          for (const { label, size } of fontSizes) {
            const option = document.createElement("option");
            option.value = size;
            option.textContent = label;
            sizeSelect.append(option);
          }
          sizeSelect.addEventListener("change", () => {
            const size = sizeSelect.value;
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              $patchStyleText(selection, { "font-size": size === "" ? null : size });
            });
            editor.focus();
          });
          refs.fontSizeSelect = sizeSelect;
          children.push(sizeSelect);
        }
        if (children.length > 0) toolbar.append(group(name, ...children));
        break;
      }
      case "inline": {
        const clearBtn = button("⌫", t.clearFormatting, () => {
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            for (const fmt of CLEARABLE_TEXT_FORMATS) {
              if (selection.hasFormat(fmt)) editor.dispatchCommand(FORMAT_TEXT_COMMAND, fmt);
            }
            $patchStyleText(selection, {
              "font-family": null,
              "font-size": null,
              color: null,
              "background-color": null,
            });
          });
          editor.focus();
        }, refs);
        clearBtn.classList.add("spez-rte-clear-btn");
        toolbar.append(
          group(
            name,
            button("B", t.bold, format("bold"), refs, "bold"),
            button("I", t.italic, format("italic"), refs, "italic"),
            button("U", t.underline, format("underline"), refs, "underline"),
            button("S", t.strikethrough, format("strikethrough"), refs, "strikethrough"),
            button("x₂", t.subscript, format("subscript"), refs, "subscript"),
            button("x²", t.superscript, format("superscript"), refs, "superscript"),
            button("</>", t.inlineCode, format("code"), refs, "code"),
            clearBtn,
          ),
        );
        break;
      }
      case "color":
        toolbar.append(
          group(
            name,
            colorControl(editor, "color", TEXT_COLORS, t, openPopover, refs),
            colorControl(editor, "background-color", HIGHLIGHT_COLORS, t, openPopover, refs),
          ),
        );
        break;
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
      case "indent":
        toolbar.append(
          group(
            name,
            button("⇥|", t.indent, () => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined), refs),
            button("|⇤", t.outdent, () => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined), refs),
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
            button("🔗", t.link, (self) => {
              if (self.getAttribute("aria-pressed") === "true") {
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
                return;
              }
              const close = openPopover(
                textInputPopover(t.linkPlaceholder, t.insert, (url) => {
                  editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
                  close();
                }),
                self,
              );
            }, refs, "link"),
            button("🖼", t.image, (self) => {
              const close = openPopover(
                textInputPopover(t.imagePlaceholder, t.insert, (src) => {
                  editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src });
                  close();
                }),
                self,
              );
            }, refs),
            button("⊞", t.table, (self) => {
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
              const close = openPopover(wrap, self);
            }, refs),
            button("📅", t.hijriDate, (self) => {
              openHijriDatePicker(editor, locale, (content) => openPopover(content, self));
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
      setPressed("subscript", selection.hasFormat("subscript"));
      setPressed("superscript", selection.hasFormat("superscript"));
      setPressed("code", selection.hasFormat("code"));

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
      if (refs.fontSizeSelect) {
        const size = $getSelectionStyleValueForProperty(selection, "font-size", "");
        // Unknown sizes (e.g. pasted content) fall back to the default row.
        refs.fontSizeSelect.value = size;
        if (refs.fontSizeSelect.value !== size) refs.fontSizeSelect.value = "";
      }
      for (const [property, control] of refs.colors) {
        const value = $getSelectionStyleValueForProperty(selection, property, "");
        control.value = value;
        control.swatch.style.background = value;
        if (value === "") control.button.removeAttribute("data-value");
        else control.button.setAttribute("data-value", value);
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
