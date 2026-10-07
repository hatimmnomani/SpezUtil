import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
} from "lexical";
import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import { $isListNode, type ListNode } from "@lexical/list";
import { $isLinkNode } from "@lexical/link";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import { $isAyatNode } from "./nodes/ayat-node";
import { getLocaleStrings, type EditorLocale, type LocaleStrings } from "./locale";
import { ARABIC_FONT_FAMILY } from "./font-arabic";
import type { DiagramEditDetail } from "./diagram/diagrams";
import { GROUP_LABEL_KEYS, type ResolvedToolbarLayout } from "./toolbar-config";
import { createIcon } from "./toolbar-icons";
import { ensureBuiltinToolbarItems } from "./toolbar-items";
import { createMoreMenu, type MoreMenu, type MoreSectionContent } from "./toolbar-more";
import { createOverflowController, type OverflowController, type OverflowGroup } from "./toolbar-overflow";
import { ariaKeyShortcuts, formatShortcut, installRovingToolbar, type RovingToolbar } from "./toolbar-a11y";
import { createPopoverOpener } from "./toolbar-popover";
import {
  getToolbarItem as lookupToolbarItem,
  listToolbarItems as listRegisteredToolbarItems,
  registerToolbarItem,
  type ToolbarItemContext,
  type ToolbarItemDefinition,
  type ToolbarSelectionState,
} from "./toolbar-registry";
import type { FontOption, FontSizeOption } from "./toolbar-types";

export {
  ALL_TOOLBAR_GROUPS,
  DEFAULT_TOOLBAR_GROUPS,
  DEFAULT_TOOLBAR_LAYOUT,
  LEGACY_TOOLBAR_LAYOUT,
  resolveToolbarLayout,
} from "./toolbar-config";
export type {
  ResolvedToolbarLayout,
  ToolbarConfig,
  ToolbarGroup,
  ToolbarGroupConfig,
  ToolbarMoreSection,
} from "./toolbar-config";
export type { FontOption, FontSizeOption, ToolbarMode } from "./toolbar-types";

export { registerToolbarItem };

/** The registered item with this id (built-ins included), or undefined. */
export function getToolbarItem(id: string): ToolbarItemDefinition | undefined {
  ensureBuiltinToolbarItems();
  return lookupToolbarItem(id);
}

/** Every registered item id, built-ins included. */
export function listToolbarItems(): readonly string[] {
  ensureBuiltinToolbarItems();
  return listRegisteredToolbarItems();
}
export { TOOLBAR_MODES } from "./toolbar-types";

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

export interface ToolbarInstance {
  element: HTMLElement;
  /** Re-fits the row to its current width now (the ResizeObserver does this on its own). */
  refreshLayout: (force?: boolean) => void;
  /** Ids of the groups currently collapsed into the More menu. */
  collapsedGroups: () => string[];
  /** Moves keyboard focus to the toolbar (its current tab stop). */
  focus: () => void;
  dispose: () => void;
}

const SECTION_TITLE_KEYS: Readonly<Record<string, keyof LocaleStrings>> = {
  text: "sectionTextStyle",
  paragraph: "sectionParagraph",
  insert: "sectionInsert",
};

const inMorePanel = (el: Element): boolean => el.closest(".spez-rte-more__panel") !== null;

export function buildToolbar(
  editor: LexicalEditor,
  host: HTMLElement,
  layout: ResolvedToolbarLayout,
  locale: EditorLocale,
  fonts: readonly FontOption[] = DEFAULT_FONTS,
  fontSizes: readonly FontSizeOption[] = DEFAULT_FONT_SIZES,
  onDiagramInserted?: (detail: DiagramEditDetail) => void,
): ToolbarInstance {
  ensureBuiltinToolbarItems();
  const t: LocaleStrings = getLocaleStrings(locale);
  const toolbar = document.createElement("div");
  toolbar.className = `spez-rte-toolbar spez-rte-toolbar--${layout.layout}`;
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-orientation", "horizontal");
  toolbar.setAttribute("aria-label", t.toolbarLabel);
  // Arabic is first-class: with no explicit `dir` on the element, an Arabic toolbar reads right to left.
  if (layout.layout === "compact" && locale === "ar" && !host.hasAttribute("dir")) toolbar.dir = "rtl";

  const openPopover = createPopoverOpener(host, toolbar);
  const ctx: ToolbarItemContext = {
    editor,
    host,
    toolbar,
    locale,
    t,
    fonts,
    fontSizes,
    openPopover,
    emitDiagramEdit: (detail) => onDiagramInserted?.(detail),
    button: (item, onClick, options = {}) => {
      const label = item.label(t);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.append(createIcon(item.icon ?? item.id, { flip: item.flip }));
      btn.setAttribute("aria-label", label);
      btn.title = item.shortcut ? `${label} (${formatShortcut(item.shortcut)})` : label;
      if (item.shortcut) btn.setAttribute("aria-keyshortcuts", ariaKeyShortcuts(item.shortcut));
      if (options.popup) {
        btn.setAttribute("aria-haspopup", "dialog");
        btn.setAttribute("aria-expanded", "false");
      }
      if (options.toggle) btn.setAttribute("aria-pressed", "false");
      // Preserve the editor selection: buttons must not steal focus on click.
      btn.addEventListener("pointerdown", (event) => event.preventDefault());
      btn.addEventListener("click", () => onClick(btn));
      return btn;
    },
  };

  const built = new Map<string, { def: ToolbarItemDefinition; element: HTMLElement }>();
  const create = (id: string): { def: ToolbarItemDefinition; element: HTMLElement } | null => {
    const def = lookupToolbarItem(id);
    if (!def) return null;
    const element = def.create(ctx);
    if (!element) return null;
    element.dataset.item = def.id;
    const entry = { def, element };
    built.set(id, entry);
    return entry;
  };

  const groupElements = new Map<string, HTMLElement>();
  for (const g of layout.groups) {
    const el = document.createElement("div");
    el.className = "spez-rte-group";
    el.setAttribute("data-group", g.id);
    const labelKey = GROUP_LABEL_KEYS[g.id];
    const label = g.label ?? (labelKey ? (t as unknown as Record<string, string>)[labelKey] : undefined);
    if (label) {
      el.setAttribute("role", "group");
      el.setAttribute("aria-label", label);
    }
    for (const id of g.items) {
      const entry = create(id);
      if (entry) el.append(entry.element);
    }
    if (el.childElementCount === 0) continue;
    groupElements.set(g.id, el);
    toolbar.append(el);
  }

  // The More menu: its own controls, plus whatever overflows out of the row.
  const sections: MoreSectionContent[] = [];
  for (const s of layout.more) {
    const entries = s.items.flatMap((id) => {
      const entry = create(id);
      return entry
        ? [{ element: entry.element, label: entry.def.label(t), shortcut: entry.def.shortcut }]
        : [];
    });
    const titleKey = SECTION_TITLE_KEYS[s.id];
    sections.push({ id: s.id, title: s.label ?? (titleKey ? t[titleKey] : null), entries });
  }
  const collapsible: OverflowGroup[] = layout.overflow
    ? layout.collapse.flatMap((id) => {
        const element = groupElements.get(id);
        if (!element) return [];
        const source = layout.groups.find((g) => g.id === id);
        const key = GROUP_LABEL_KEYS[id];
        const label = source?.label ?? (key ? (t as unknown as Record<string, string>)[key] : undefined) ?? id;
        return [{ id, element, label }];
      })
    : [];
  const moreHasContent = sections.some((s) => s.entries.length > 0);
  let more: MoreMenu | null = null;
  if (moreHasContent || collapsible.length > 0) {
    more = createMoreMenu(t, sections);
    toolbar.append(more.root);
  }

  const roving: RovingToolbar = installRovingToolbar(toolbar, {
    excludeWithin: inMorePanel,
    onEscape: () => editor.focus(),
  });

  let overflow: OverflowController | null = null;
  if (more && collapsible.length > 0) {
    overflow = createOverflowController({
      toolbar,
      more,
      groups: collapsible,
      moreHasContent,
      onChange: () => roving.refresh(),
    });
  } else if (more) {
    more.root.hidden = !moreHasContent;
  }

  const syncState = (): void => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const anchorNode = selection.anchor.getNode();
      const topLevel = anchorNode.getTopLevelElement();
      let blockType = "paragraph";
      let listType: ToolbarSelectionState["listType"] = null;
      if ($isHeadingNode(topLevel)) blockType = topLevel.getTag();
      else if ($isQuoteNode(topLevel)) blockType = "quote";
      else if ($isAyatNode(topLevel)) blockType = "ayat";
      else if ($isListNode(topLevel)) {
        const nearestList = $findMatchingParent(anchorNode, $isListNode) as ListNode | null;
        const type = (nearestList ?? topLevel).getListType();
        listType = type === "number" ? "number" : "bullet";
      }
      const state: ToolbarSelectionState = {
        selection,
        anchorNode,
        topLevel,
        blockType,
        listType,
        direction: topLevel !== null && $isElementNode(topLevel) ? (topLevel.getDirection() ?? null) : null,
        inLink: $findMatchingParent(anchorNode, $isLinkNode) !== null,
      };
      for (const { def, element } of built.values()) def.sync?.(element, state, ctx);
    });
  };

  const setDisabled = (id: string, disabled: boolean): void => {
    const el = built.get(id)?.element as HTMLButtonElement | undefined;
    if (!el || el.disabled === disabled) return;
    el.disabled = disabled;
    roving.refresh();
  };
  setDisabled("undo", true);
  setDisabled("redo", true);

  const dispose = mergeRegister(
    editor.registerUpdateListener(syncState),
    editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setDisabled("undo", !payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setDisabled("redo", !payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    // Alt+F10 (the WAI-ARIA convention) moves from the text to the toolbar; Escape comes back.
    editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.key !== "F10" || !event.altKey) return false;
        event.preventDefault();
        roving.focus();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
  );
  syncState();

  return {
    element: toolbar,
    refreshLayout: (force = true) => overflow?.update(force),
    collapsedGroups: () => overflow?.collapsed() ?? [],
    focus: () => roving.focus(),
    dispose: () => {
      dispose();
      overflow?.dispose();
      roving.dispose();
      more?.dispose();
    },
  };
}
