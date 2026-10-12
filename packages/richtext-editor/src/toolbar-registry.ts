import type {
  ElementNode,
  LexicalEditor,
  LexicalNode,
  RangeSelection,
} from "lexical";
import type { DiagramEditDetail } from "./diagram/diagrams";
import type { EditorLocale, LocaleStrings } from "./locale";
import type { FontOption, FontSizeOption } from "./toolbar-types";

/** Where a popover opened by a toolbar control is anchored; see {@link ToolbarItemContext.openPopover}. */
export type PopoverOpener = (content: HTMLElement, anchor?: HTMLElement) => () => void;

/** What the selection looks like right now; handed to every item's `sync`. */
export interface ToolbarSelectionState {
  selection: RangeSelection;
  anchorNode: LexicalNode;
  /** The top-level block holding the anchor, or null. */
  topLevel: ElementNode | null;
  /** `paragraph`, `h1`..`h3`, `quote` or `ayat`. */
  blockType: string;
  listType: "bullet" | "number" | null;
  direction: "ltr" | "rtl" | null;
  inLink: boolean;
}

export interface ToolbarItemContext {
  editor: LexicalEditor;
  /** The `<spez-richtext>` element. */
  host: HTMLElement;
  /** The toolbar element the item will live in (it may be moved into the More menu later). */
  toolbar: HTMLElement;
  locale: EditorLocale;
  t: LocaleStrings;
  fonts: readonly FontOption[];
  fontSizes: readonly FontSizeOption[];
  /** Opens a popover under the toolbar; closes on Escape or an outside press. Returns its closer. */
  openPopover: PopoverOpener;
  /** Raises the host's `diagram-edit-requested` event. */
  emitDiagramEdit: (detail: DiagramEditDetail) => void;
  /**
   * The standard toolbar button for `item`: an inline icon, an `aria-label`, a tooltip carrying the
   * keyboard shortcut and a pointerdown guard so pressing it never steals the editor's selection.
   * Pass `popup: true` when the click opens a popover (sets `aria-haspopup`), `toggle: true` for a
   * control with an on/off state (starts at `aria-pressed="false"`; your `sync` keeps it current).
   */
  button: (
    item: Pick<ToolbarItemDefinition, "id" | "label" | "icon" | "shortcut" | "flip">,
    onClick: (button: HTMLButtonElement) => void,
    options?: { popup?: boolean; toggle?: boolean },
  ) => HTMLButtonElement;
}

/**
 * One control that can be placed in the toolbar or its More menu. Built-in items are registered
 * with the same API, so a package or app can add (or replace) items with {@link registerToolbarItem}
 * and then place them with the layout config, e.g. `groups: [{ id: "tables", items: ["table"] }]`.
 */
export interface ToolbarItemDefinition {
  /** Stable id used by the layout config, `data-item` and the roving-tabindex order. */
  id: string;
  /** Localised accessible name; also the More-menu row label and the tooltip's first part. */
  label: (t: LocaleStrings) => string;
  /** Key into {@link TOOLBAR_ICONS}. Required for buttons; selects may omit it. */
  icon?: string;
  /** `mod+B`, `mod+shift+Z`, `Tab`: `mod` is Cmd on Apple platforms and Ctrl elsewhere. */
  shortcut?: string;
  /** Mirror the icon under `dir=rtl` (it points toward the start of the line). */
  flip?: boolean;
  /** Group `show` puts the item into when it is absent from the layout. Default: More. */
  home?: string;
  /** Which More-menu section lists it (`text`, `paragraph`, `insert`, or any other id). Default `insert`. */
  moreSection?: string;
  /** Not part of any default layout; added only by `show` or by naming it in a group. */
  optIn?: boolean;
  /** Builds the control. Return null to omit it (e.g. an empty font list). */
  create: (ctx: ToolbarItemContext) => HTMLElement | null;
  /** Runs inside an editor-state read after every update that has a range selection. */
  sync?: (element: HTMLElement, state: ToolbarSelectionState, ctx: ToolbarItemContext) => void;
}

const registry = new Map<string, ToolbarItemDefinition>();

/** Adds an item, or replaces the one registered under the same id. Takes effect on the next toolbar build. */
export function registerToolbarItem(definition: ToolbarItemDefinition): void {
  registry.set(definition.id, definition);
}

export function getToolbarItem(id: string): ToolbarItemDefinition | undefined {
  return registry.get(id);
}

/** Every registered item id, in registration order. */
export function listToolbarItems(): readonly string[] {
  return [...registry.keys()];
}
