import { ensureBuiltinToolbarItems } from "./toolbar-items";
import { getToolbarItem } from "./toolbar-registry";

/* -------------------------------------------------------------------------- */
/* Legacy group names (the `toolbar="..."` attribute, kept since 0.1)         */
/* -------------------------------------------------------------------------- */

export const ALL_TOOLBAR_GROUPS = [
  "history",
  "block",
  "font",
  "lud",
  "inline",
  "color",
  "list",
  "indent",
  "align",
  "direction",
  "insert",
  "comment",
  "diagram",
] as const;

export type ToolbarGroup = (typeof ALL_TOOLBAR_GROUPS)[number];

/** Groups shown by the `legacy` layout when no `toolbar` attribute is set: the 0.4.0 toolbar. `lud`, `comment`, `diagram` are opt-in there. */
export const DEFAULT_TOOLBAR_GROUPS: readonly ToolbarGroup[] = ALL_TOOLBAR_GROUPS.filter(
  (g) => g !== "lud" && g !== "comment" && g !== "diagram",
);

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

/** A toolbar group: an ordered run of item ids drawn between two dividers. */
export interface ToolbarGroupConfig {
  /** Becomes `data-group`. A known preset id with no `items` uses the preset's items. */
  id: string;
  items?: readonly string[];
  /** Accessible name of the group, and its row label when it collapses into More. Defaults to the preset's. */
  label?: string;
}

/** A titled run of items inside the More menu. */
export interface ToolbarMoreSection {
  id: string;
  /** Heading shown above the section; defaults to a localised title for `text`, `paragraph` and `insert`. */
  label?: string;
  items: readonly string[];
}

/**
 * Declarative toolbar layout. Everything is optional: `{}` is the default compact layout.
 *
 * ```ts
 * el.toolbarConfig = {
 *   groups: ["history", "block", "inline", "lists", "align-dir", "insert"],
 *   more: ["strikethrough", "subscript", "superscript", "code"],
 *   hide: ["image"],
 *   collapse: ["insert", "align-dir"],
 * };
 * ```
 */
export interface ToolbarConfig {
  /** Which preset the config starts from. `compact` (default): one row plus a More menu. `legacy`: the 0.5 flat, wrapping toolbar. */
  layout?: "compact" | "legacy";
  /**
   * Ordered groups. A string names a preset group (`history`, `block`, `inline`, `color`, `lists`,
   * `align-dir`, `insert`, `comment` in `compact`; the old group names in `legacy`); an object defines
   * a custom group or overrides a preset's items.
   */
  groups?: readonly (string | ToolbarGroupConfig)[];
  /**
   * The More menu. An array of item ids (laid out in their default sections), an array of explicit
   * sections, or `false` for no More menu at all (then `overflow` cannot collapse groups either).
   */
  more?: readonly string[] | readonly ToolbarMoreSection[] | false;
  /** Item ids to remove wherever they appear. Applied after `groups` and `more`. */
  hide?: readonly string[];
  /** Item ids to add if they are not already present: into their home group, else into More. */
  show?: readonly string[];
  /** Group ids that give way to More when the toolbar is too narrow; the first listed goes first. Groups not listed never collapse. */
  collapse?: readonly string[];
  /** Collapse groups into More as width shrinks. Default true for `compact`, false for `legacy`. */
  overflow?: boolean;
}

export interface ResolvedToolbarGroup {
  id: string;
  label: string | null;
  items: string[];
}

export interface ResolvedMoreSection {
  id: string;
  label: string | null;
  items: string[];
}

export interface ResolvedToolbarLayout {
  layout: "compact" | "legacy";
  groups: ResolvedToolbarGroup[];
  more: ResolvedMoreSection[];
  collapse: string[];
  overflow: boolean;
}

/* -------------------------------------------------------------------------- */
/* Presets                                                                    */
/* -------------------------------------------------------------------------- */

interface Preset {
  /** Every group id the preset knows, with its items. */
  catalog: Record<string, readonly string[]>;
  /** The groups shown by default, in order. */
  defaults: readonly string[];
  more: readonly ToolbarMoreSection[];
  collapse: readonly string[];
  overflow: boolean;
}

/** The compact layout's groups. Id order here is the default order. */
export const COMPACT_GROUPS: Readonly<Record<string, readonly string[]>> = {
  history: ["undo", "redo"],
  block: ["block"],
  inline: ["bold", "italic", "underline", "clear-formatting"],
  color: ["text-color", "highlight-color"],
  lists: ["bullet-list", "number-list", "outdent", "indent"],
  "align-dir": ["align-start", "align-center", "align-end", "dir-rtl", "dir-ltr"],
  insert: ["link", "image", "table", "diagram"],
  comment: ["comment"],
};

/** The compact layout's More menu: pickers first, then the low-use toggles, then the rare inserts. */
export const COMPACT_MORE: readonly ToolbarMoreSection[] = [
  {
    id: "text",
    items: ["font-family", "font-size", "lud-font", "strikethrough", "subscript", "superscript", "code"],
  },
  { id: "paragraph", items: ["align-justify", "dir-auto"] },
  { id: "insert", items: ["hijri-date", "ayat", "transliteration"] },
];

const LEGACY_GROUPS: Readonly<Record<string, readonly string[]>> = {
  history: ["undo", "redo"],
  block: ["block"],
  font: ["font-family", "font-size"],
  lud: ["lud-font"],
  inline: ["bold", "italic", "underline", "strikethrough", "subscript", "superscript", "code", "clear-formatting"],
  color: ["text-color", "highlight-color"],
  list: ["bullet-list", "number-list"],
  indent: ["indent", "outdent"],
  align: ["align-start", "align-center", "align-end", "align-justify"],
  direction: ["dir-rtl", "dir-ltr", "dir-auto"],
  insert: ["link", "image", "table", "hijri-date", "ayat", "transliteration"],
  comment: ["comment"],
  diagram: ["diagram"],
};

const PRESETS: Record<"compact" | "legacy", Preset> = {
  compact: {
    catalog: COMPACT_GROUPS,
    defaults: ["history", "block", "inline", "color", "lists", "align-dir", "insert"],
    more: COMPACT_MORE,
    // The handbook's order: direction and alignment give way first, then insert, colour, lists.
    collapse: ["align-dir", "insert", "color", "lists"],
    overflow: true,
  },
  legacy: {
    catalog: LEGACY_GROUPS,
    defaults: DEFAULT_TOOLBAR_GROUPS,
    more: [],
    collapse: [],
    overflow: false,
  },
};

/** The compact layout as a config object, for apps that want to start from it and edit. */
export const DEFAULT_TOOLBAR_LAYOUT: Readonly<Required<Pick<ToolbarConfig, "groups" | "more" | "collapse">>> = {
  groups: PRESETS.compact.defaults,
  more: COMPACT_MORE,
  collapse: PRESETS.compact.collapse,
};

/** The 0.5 layout as a config object. */
export const LEGACY_TOOLBAR_LAYOUT: Readonly<Required<Pick<ToolbarConfig, "groups" | "more" | "collapse">>> = {
  groups: DEFAULT_TOOLBAR_GROUPS,
  more: [],
  collapse: [],
};

/** Locale key holding a preset group's accessible name. */
export const GROUP_LABEL_KEYS: Readonly<Record<string, string>> = {
  history: "groupHistory",
  block: "groupBlock",
  inline: "groupInline",
  color: "groupColor",
  lists: "groupLists",
  "align-dir": "groupAlignDir",
  insert: "groupInsert",
  comment: "groupComment",
};

/* -------------------------------------------------------------------------- */
/* Resolution                                                                 */
/* -------------------------------------------------------------------------- */

const isSectionArray = (more: readonly unknown[]): more is readonly ToolbarMoreSection[] =>
  more.length > 0 && typeof more[0] === "object" && more[0] !== null;

/**
 * Turns a {@link ToolbarConfig} into concrete groups and sections: presets expanded, `hide`/`show`
 * applied, unknown item ids and empty groups dropped, an item kept only at its first position.
 * Pure apart from reading the item registry.
 */
export function resolveToolbarLayout(config: ToolbarConfig = {}): ResolvedToolbarLayout {
  ensureBuiltinToolbarItems();
  const layout = config.layout === "legacy" ? "legacy" : "compact";
  const preset = PRESETS[layout];
  const hidden = new Set(config.hide ?? []);
  const seen = new Set<string>();
  const known = (id: string): boolean => getToolbarItem(id) !== undefined;
  // An item is placed at most once, only if it exists and is not hidden.
  const take = (ids: readonly string[]): string[] => {
    const out: string[] = [];
    for (const id of ids) {
      if (!known(id) || hidden.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  };

  const groupSpecs: (string | ToolbarGroupConfig)[] = [...(config.groups ?? preset.defaults)];
  const groups: ResolvedToolbarGroup[] = [];
  for (const spec of groupSpecs) {
    const cfg: ToolbarGroupConfig = typeof spec === "string" ? { id: spec } : spec;
    if (typeof cfg?.id !== "string" || cfg.id === "") continue;
    const items = cfg.items ?? preset.catalog[cfg.id];
    if (!items) continue; // an unknown preset id with no items of its own
    groups.push({ id: cfg.id, label: cfg.label ?? null, items: [...items] });
  }

  let sections: { id: string; label: string | null; items: string[] }[];
  if (config.more === false) {
    sections = [];
  } else if (config.more === undefined) {
    sections = preset.more.map((s) => ({ id: s.id, label: s.label ?? null, items: [...s.items] }));
  } else if (isSectionArray(config.more)) {
    sections = config.more.map((s) => ({ id: s.id, label: s.label ?? null, items: [...s.items] }));
  } else {
    sections = [];
    for (const id of config.more as readonly string[]) {
      const section = getToolbarItem(id)?.moreSection ?? "insert";
      let target = sections.find((s) => s.id === section);
      if (!target) {
        target = { id: section, label: null, items: [] };
        sections.push(target);
      }
      target.items.push(id);
    }
  }

  // Groups claim their items first so an id listed in both places stays in the toolbar row.
  for (const g of groups) g.items = take(g.items);
  for (const s of sections) s.items = take(s.items);

  for (const id of config.show ?? []) {
    const def = getToolbarItem(id);
    if (!def || seen.has(id)) continue;
    hidden.delete(id);
    let home = def.home ? groups.find((g) => g.id === def.home) : undefined;
    // A preset group that is not in the layout yet (e.g. `comment`) is created for the item.
    if (!home && def.home && preset.catalog[def.home]) {
      home = { id: def.home, label: null, items: [] };
      groups.push(home);
    }
    if (home) {
      seen.add(id);
      home.items.push(id);
      continue;
    }
    if (config.more === false) continue;
    const sectionId = def.moreSection ?? "insert";
    let target = sections.find((s) => s.id === sectionId);
    if (!target) {
      target = { id: sectionId, label: null, items: [] };
      sections.push(target);
    }
    seen.add(id);
    target.items.push(id);
  }

  const liveGroups = groups.filter((g) => g.items.length > 0);
  const liveIds = new Set(liveGroups.map((g) => g.id));
  const overflow = (config.overflow ?? preset.overflow) && config.more !== false;
  return {
    layout,
    groups: liveGroups,
    more: sections.filter((s) => s.items.length > 0),
    collapse: (config.collapse ?? preset.collapse).filter((id) => liveIds.has(id)),
    overflow,
  };
}

/**
 * Maps the `toolbar="a,b,c"` attribute (and its `none` value) to a config. The attribute has always
 * listed groups by name, so it selects the `legacy` preset unless a layout is given explicitly.
 */
export function configFromGroupList(attr: string, layout?: "compact" | "legacy"): ToolbarConfig | null {
  if (attr.trim() === "none") return null;
  const base = layout ?? "legacy";
  const catalog = PRESETS[base].catalog;
  const requested = attr.split(",").map((s) => s.trim());
  // Preserve the canonical group order, as the attribute always did.
  const order = base === "legacy" ? (ALL_TOOLBAR_GROUPS as readonly string[]) : Object.keys(catalog);
  return { layout: base, groups: order.filter((g) => requested.includes(g) && g in catalog) };
}
