import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { $selectAll } from "lexical";
import "./index";
import {
  registerToolbarItem,
  styles,
  type SpezRichtext,
  type ToolbarConfig,
} from "./index";
import { ariaKeyShortcuts, formatShortcut } from "./toolbar-a11y";
import { TOOLBAR_ICONS } from "./toolbar-icons";

if (typeof Range !== "undefined" && !Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON() {} }) as DOMRect;
}

function create(attrs: Record<string, string> = {}, config?: ToolbarConfig): SpezRichtext {
  const el = document.createElement("spez-richtext");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (config) el.toolbarConfig = config;
  document.body.appendChild(el);
  return el;
}

const toolbarOf = (el: Element): HTMLElement => el.querySelector<HTMLElement>(".spez-rte-toolbar")!;
const item = (el: Element, id: string): HTMLElement => el.querySelector<HTMLElement>(`[data-item="${id}"]`)!;
const rowGroups = (el: Element): string[] =>
  [...toolbarOf(el).querySelectorAll(":scope > .spez-rte-group")].map((g) => g.getAttribute("data-group")!);
const panelOf = (el: Element): HTMLElement => el.querySelector<HTMLElement>(".spez-rte-more__panel")!;
const triggerOf = (el: Element): HTMLButtonElement => el.querySelector<HTMLButtonElement>(".spez-rte-more__btn")!;
const key = (target: Element, k: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const e = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
};

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("the default layout, built", () => {
  it("renders the compact groups in order, with More last", () => {
    const el = create();
    expect(rowGroups(el)).toEqual(["history", "block", "inline", "color", "lists", "align-dir", "insert"]);
    expect(toolbarOf(el).lastElementChild!.classList.contains("spez-rte-more")).toBe(true);
    expect(toolbarOf(el).classList.contains("spez-rte-toolbar--compact")).toBe(true);
  });

  it("holds the low-use controls in the More panel, moved intact", () => {
    const el = create();
    const panel = panelOf(el);
    for (const id of [
      "strikethrough", "subscript", "superscript", "code", "align-justify", "dir-auto",
      "hijri-date", "ayat", "transliteration", "font-family", "font-size", "lud-font",
    ]) {
      const matches = el.querySelectorAll(`[data-item="${id}"]`);
      expect(matches.length, id).toBe(1);
      expect(panel.contains(matches[0]!), id).toBe(true);
    }
  });

  it("puts Insert diagram in the insert group", () => {
    const el = create();
    expect(el.querySelector('[data-group="insert"] [data-item="diagram"]')).not.toBeNull();
    expect(el.querySelector('[data-group="diagram"]')).toBeNull();
  });

  it("labels the Lisan ud-Dawat picker and calls its empty option Default", () => {
    const el = create();
    const lud = item(el, "lud-font") as HTMLSelectElement;
    expect(lud.getAttribute("aria-label")).toBe("Lisan ud-Dawat font");
    expect(lud.closest(".spez-rte-more__row")!.textContent).toContain("Lisan ud-Dawat font");
    expect(lud.options[0]!.textContent).toBe("Default");
  });

  it("has no comment button until asked for", () => {
    expect(item(create(), "comment")).toBeNull();
    expect(item(create({}, { show: ["comment"] }), "comment")).not.toBeNull();
  });

  it("uses no icon font: every button draws an inline svg", () => {
    const el = create();
    expect(toolbarOf(el).querySelector(".material-icons, .fa, [class*='icon-font']")).toBeNull();
    const buttons = [...toolbarOf(el).querySelectorAll("button")];
    expect(buttons.length).toBeGreaterThan(20);
    for (const b of buttons) expect(b.querySelector("svg.spez-rte-icon"), b.getAttribute("aria-label")!).not.toBeNull();
  });

  it("only references icons that exist in the set", () => {
    const el = create({}, { show: ["comment"] });
    for (const svg of toolbarOf(el).querySelectorAll<SVGElement>("svg[data-icon]")) {
      expect(TOOLBAR_ICONS[svg.dataset.icon!], svg.dataset.icon!).toBeDefined();
    }
  });
});

describe("accessibility", () => {
  it("is a named horizontal toolbar landmark with named groups", () => {
    const el = create();
    const tb = toolbarOf(el);
    expect(tb.getAttribute("role")).toBe("toolbar");
    expect(tb.getAttribute("aria-orientation")).toBe("horizontal");
    expect(tb.getAttribute("aria-label")).toBe("Formatting");
    for (const g of tb.querySelectorAll(":scope > .spez-rte-group")) {
      expect(g.getAttribute("role")).toBe("group");
      expect(g.getAttribute("aria-label"), g.getAttribute("data-group")!).toBeTruthy();
    }
  });

  it("gives every control an accessible name and a tooltip", () => {
    const el = create({}, { show: ["comment"] });
    for (const c of toolbarOf(el).querySelectorAll<HTMLElement>("button, select")) {
      const name = c.getAttribute("aria-label");
      expect(name, c.outerHTML.slice(0, 80)).toBeTruthy();
      expect(c.title, name!).toContain(name!);
    }
  });

  it("shows the shortcut in the tooltip and exposes aria-keyshortcuts", () => {
    const el = create();
    const bold = item(el, "bold");
    expect(bold.getAttribute("aria-label")).toBe("Bold");
    expect(bold.title).toMatch(/^Bold \((⌘|Ctrl\+)B\)$/);
    expect(bold.getAttribute("aria-keyshortcuts")).toMatch(/^(Meta|Control)\+B$/);
    expect(item(el, "redo").title).toMatch(/\((⌘⇧Z|Ctrl\+Shift\+Z)\)/);
    expect(item(el, "indent").title).toBe("Indent (Tab)");
    expect(item(el, "link").title).toBe("Link");
  });

  it("writes shortcuts as Cmd on Apple platforms and Ctrl elsewhere", () => {
    expect(formatShortcut("mod+B", true)).toBe("⌘B");
    expect(formatShortcut("mod+shift+Z", true)).toBe("⌘⇧Z");
    expect(formatShortcut("mod+B", false)).toBe("Ctrl+B");
    expect(formatShortcut("mod+shift+Z", false)).toBe("Ctrl+Shift+Z");
    expect(formatShortcut("shift+Tab", false)).toBe("Shift+Tab");
    expect(ariaKeyShortcuts("mod+shift+Z", true)).toBe("Meta+Shift+Z");
    expect(ariaKeyShortcuts("mod+B", false)).toBe("Control+B");
  });

  it("marks toggles with aria-pressed, off to start with, and keeps it in step with the selection", () => {
    const el = create();
    const bold = item(el, "bold");
    expect(bold.getAttribute("aria-pressed")).toBe("false");
    el.setHTML("<p>hello</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    (bold as HTMLButtonElement).click();
    el.editor.update(() => {}, { discrete: true });
    expect(bold.getAttribute("aria-pressed")).toBe("true");
    expect(item(el, "italic").getAttribute("aria-pressed")).toBe("false");
  });

  it("marks popover buttons with aria-haspopup and aria-expanded", () => {
    const el = create();
    for (const id of ["link", "image", "table", "text-color", "highlight-color", "hijri-date"]) {
      expect(item(el, id).getAttribute("aria-haspopup"), id).toBe("dialog");
      expect(item(el, id).getAttribute("aria-expanded"), id).toBe("false");
    }
  });

  describe("roving tabindex", () => {
    const stops = (el: Element): HTMLElement[] =>
      [...toolbarOf(el).querySelectorAll<HTMLElement>("button, select")].filter(
        (c) => c.tabIndex === 0 && !c.closest(".spez-rte-more__panel"),
      );

    it("has exactly one tab stop in the row; the closed More panel is hidden, so it adds none", () => {
      const el = create();
      expect(stops(el).length).toBe(1);
      expect(panelOf(el).hidden).toBe(true);
    });

    it("skips disabled controls: undo and redo start disabled, so the stop is the block select", () => {
      const el = create();
      expect(stops(el)[0]).toBe(item(el, "block"));
    });

    it("moves with the arrow keys, wrapping at the ends, and Home/End jump", () => {
      const el = create();
      const block = item(el, "block");
      block.focus();
      key(block, "ArrowRight");
      expect(document.activeElement).toBe(item(el, "bold"));
      expect(stops(el)).toEqual([item(el, "bold")]);
      key(document.activeElement!, "ArrowLeft");
      expect(document.activeElement).toBe(block);
      key(document.activeElement!, "ArrowLeft"); // wraps to the last control: More
      expect(document.activeElement).toBe(triggerOf(el));
      key(document.activeElement!, "ArrowRight");
      expect(document.activeElement).toBe(block);
      key(document.activeElement!, "End"); // a select leaves Home/End to itself
      expect(document.activeElement).toBe(block);
      item(el, "bold").focus();
      key(item(el, "bold"), "End");
      expect(document.activeElement).toBe(triggerOf(el));
      key(triggerOf(el), "Home");
      expect(document.activeElement).toBe(block);
    });

    it("never steals Up/Down from a select", () => {
      const el = create();
      const block = item(el, "block");
      block.focus();
      const e = key(block, "ArrowDown");
      expect(e.defaultPrevented).toBe(false);
    });

    it("mirrors the arrows under dir=rtl", () => {
      const el = create({ dir: "rtl" });
      const block = item(el, "block");
      block.focus();
      key(block, "ArrowLeft");
      expect(document.activeElement).toBe(item(el, "bold"));
    });

    it("lets Escape hand focus back to the editor", () => {
      const el = create();
      const spy = vi.spyOn(el.editor, "focus");
      const block = item(el, "block");
      block.focus();
      key(block, "Escape");
      expect(spy).toHaveBeenCalled();
    });

    it("Alt+F10 in the text moves focus to the toolbar", () => {
      const el = create();
      const editable = el.querySelector<HTMLElement>(".spez-rte-editor")!;
      editable.focus();
      const e = key(editable, "F10", { altKey: true });
      expect(e.defaultPrevented).toBe(true);
      expect(toolbarOf(el).contains(document.activeElement)).toBe(true);
    });
  });
});

describe("the More menu", () => {
  it("starts closed and toggles with aria-expanded", () => {
    const el = create();
    const trigger = triggerOf(el);
    expect(panelOf(el).hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-haspopup")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(panelOf(el).id);
    trigger.click();
    expect(panelOf(el).hidden).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.click();
    expect(panelOf(el).hidden).toBe(true);
  });

  it("opens from the keyboard (Enter/Space clicks with no pointer) and moves into the menu", () => {
    const el = create();
    triggerOf(el).click(); // detail 0, as a keyboard-driven click
    expect(panelOf(el).contains(document.activeElement)).toBe(true);
  });

  it("opens with ArrowDown on the button and focuses the first control", () => {
    const el = create();
    const trigger = triggerOf(el);
    trigger.focus();
    const e = key(trigger, "ArrowDown");
    expect(e.defaultPrevented).toBe(true);
    expect(panelOf(el).hidden).toBe(false);
    expect(document.activeElement).toBe(item(el, "font-family"));
  });

  it("walks the buttons with Up/Down and closes on Escape, returning focus to the button", () => {
    const el = create();
    triggerOf(el).click();
    const strike = item(el, "strikethrough");
    strike.focus();
    key(strike, "ArrowDown");
    expect(document.activeElement).toBe(item(el, "subscript"));
    key(document.activeElement!, "ArrowUp");
    expect(document.activeElement).toBe(strike);
    key(strike, "Escape");
    expect(panelOf(el).hidden).toBe(true);
    expect(document.activeElement).toBe(triggerOf(el));
  });

  describe("Escape after a mouse open (focus never moved into the menu)", () => {
    const mouseOpen = (el: SpezRichtext) =>
      triggerOf(el).dispatchEvent(new MouseEvent("click", { detail: 1, bubbles: true, cancelable: true }));

    it("closes from the editor and returns focus to the button", () => {
      const el = create();
      const editable = el.querySelector<HTMLElement>(".spez-rte-editor")!;
      editable.focus();
      mouseOpen(el);
      expect(panelOf(el).hidden).toBe(false);
      expect(panelOf(el).contains(document.activeElement)).toBe(false);
      const seenByEditor = vi.fn();
      editable.addEventListener("keydown", seenByEditor);
      key(editable, "Escape");
      expect(panelOf(el).hidden).toBe(true);
      expect(triggerOf(el).getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(triggerOf(el));
      // Consumed: the editor's own Escape handling (leaving a table, say) must not also run.
      expect(seenByEditor).not.toHaveBeenCalled();
    });

    it("closes when nothing at all has focus", () => {
      const el = create();
      mouseOpen(el);
      key(document.body, "Escape");
      expect(panelOf(el).hidden).toBe(true);
      expect(document.activeElement).toBe(triggerOf(el));
    });

    it("ignores an Escape aimed at something else on the page", () => {
      const el = create();
      const other = document.createElement("input");
      document.body.append(other);
      mouseOpen(el);
      key(other, "Escape");
      expect(panelOf(el).hidden).toBe(false);
    });

    it("stops listening once closed (an Escape then reaches the editor)", () => {
      const el = create();
      const editable = el.querySelector<HTMLElement>(".spez-rte-editor")!;
      mouseOpen(el);
      triggerOf(el).click();
      expect(panelOf(el).hidden).toBe(true);
      const seenByEditor = vi.fn();
      editable.addEventListener("keydown", seenByEditor);
      key(editable, "Escape");
      expect(seenByEditor).toHaveBeenCalledTimes(1);
    });
  });

  it("closes when focus leaves it", () => {
    const el = create();
    triggerOf(el).click();
    const outside = document.createElement("button");
    document.body.append(outside);
    item(el, "strikethrough").focus();
    outside.focus();
    // jsdom reports relatedTarget on focusout
    expect(panelOf(el).hidden).toBe(true);
  });

  it("closes on an outside press", () => {
    const el = create();
    triggerOf(el).click();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(panelOf(el).hidden).toBe(true);
  });

  it("a moved control still works, then the menu closes", () => {
    const el = create();
    el.setHTML("<p>hello</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    triggerOf(el).click();
    (item(el, "strikethrough") as HTMLButtonElement).click();
    el.editor.update(() => {}, { discrete: true });
    expect(item(el, "strikethrough").getAttribute("aria-pressed")).toBe("true");
    expect(panelOf(el).hidden).toBe(true);
  });

  it("clicking a row's label presses its control", () => {
    const el = create();
    el.setHTML("<p>hello</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    triggerOf(el).click();
    const label = item(el, "code").closest(".spez-rte-more__row")!.querySelector<HTMLElement>(".spez-rte-more__label")!;
    label.click();
    el.editor.update(() => {}, { discrete: true });
    expect(item(el, "code").getAttribute("aria-pressed")).toBe("true");
  });

  it("shows a dot on the button while something inside is switched on", () => {
    const el = create();
    el.setHTML("<p>hello</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    expect(triggerOf(el).hasAttribute("data-active")).toBe(false);
    (item(el, "strikethrough") as HTMLButtonElement).click();
    el.editor.update(() => {}, { discrete: true });
    // MutationObserver callbacks are microtasks.
    return Promise.resolve().then(() => expect(triggerOf(el).hasAttribute("data-active")).toBe(true));
  });

  it("does not count a collapsed group's default state as something switched on", () => {
    const el = create();
    el.setHTML("<p>x</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    return Promise.resolve().then(() => expect(triggerOf(el).hasAttribute("data-active")).toBe(false));
  });

  it("hides the button when it would be empty", () => {
    const el = create({}, { more: false });
    expect(el.querySelector(".spez-rte-more")).toBeNull();
  });
});

describe("configuration through the element", () => {
  it("takes groups from the toolbarConfig property, live", () => {
    const el = create({}, { groups: ["history", { id: "mine", items: ["bold", "link"] }], more: false });
    expect(rowGroups(el)).toEqual(["history", "mine"]);
    el.toolbarConfig = { groups: ["inline"], more: false };
    expect(rowGroups(el)).toEqual(["inline"]);
    el.toolbarConfig = null;
    expect(rowGroups(el)).toContain("insert");
  });

  it("takes the same config as JSON from the toolbar-config attribute", () => {
    const el = create({ "toolbar-config": JSON.stringify({ groups: ["lists"], more: false }) });
    expect(rowGroups(el)).toEqual(["lists"]);
  });

  it("ignores a toolbar-config attribute that is not valid JSON", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = create({ "toolbar-config": "{nope" });
    expect(rowGroups(el)).toContain("insert");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("hides and shows items", () => {
    const el = create({}, { hide: ["image", "table"], show: ["comment"] });
    expect(item(el, "image")).toBeNull();
    expect(item(el, "table")).toBeNull();
    expect(item(el, "comment")).not.toBeNull();
  });

  it("toolbar=none still removes the toolbar, whatever the config says", () => {
    const el = create({ toolbar: "none" }, { groups: ["history"] });
    expect(el.querySelector(".spez-rte-toolbar")).toBeNull();
  });

  it("builds nothing when the config leaves nothing", () => {
    const el = create({}, { groups: [], more: false });
    expect(el.querySelector(".spez-rte-toolbar")).toBeNull();
  });

  it("places an item registered through the registry", () => {
    const clicked = vi.fn();
    registerToolbarItem({
      id: "test-custom",
      label: () => "Custom thing",
      icon: "diagram",
      shortcut: "mod+K",
      create: (ctx) => ctx.button({ id: "test-custom", label: () => "Custom thing", icon: "diagram", shortcut: "mod+K" }, clicked),
    });
    const el = create({}, { groups: ["history", { id: "extras", items: ["test-custom"] }], more: false });
    const btn = item(el, "test-custom") as HTMLButtonElement;
    expect(btn.closest('[data-group="extras"]')).not.toBeNull();
    expect(btn.title).toMatch(/^Custom thing \((⌘K|Ctrl\+K)\)$/);
    btn.click();
    expect(clicked).toHaveBeenCalledOnce();
  });

  it("lets a registered item sync from the selection", () => {
    const sync = vi.fn();
    registerToolbarItem({
      id: "test-sync",
      label: () => "Sync",
      icon: "code",
      create: (ctx) => ctx.button({ id: "test-sync", label: () => "Sync", icon: "code" }, () => {}),
      sync,
    });
    const el = create({}, { groups: [{ id: "extras", items: ["test-sync"] }], more: false });
    el.setHTML("<p>x</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    expect(sync).toHaveBeenCalled();
    expect(sync.mock.calls.at(-1)![1]).toMatchObject({ blockType: "paragraph", listType: null });
  });
});

describe("the legacy layout", () => {
  it("is selected by toolbar-layout=legacy and renders the 0.5 groups with no More menu", () => {
    const el = create({ "toolbar-layout": "legacy" });
    expect(rowGroups(el)).toEqual([
      "history", "block", "font", "inline", "color", "list", "indent", "align", "direction", "insert",
    ]);
    expect(el.querySelector(".spez-rte-more")).toBeNull();
    expect(toolbarOf(el).classList.contains("spez-rte-toolbar--legacy")).toBe(true);
  });

  it("is also what an explicit toolbar=\"...\" attribute selects, so existing markup keeps its groups", () => {
    const el = create({ toolbar: "history,inline,insert" });
    expect(rowGroups(el)).toEqual(["history", "inline", "insert"]);
    expect(el.querySelector(".spez-rte-more")).toBeNull();
    // The strikethrough button sits in the inline row, as it always did.
    expect(el.querySelector('[data-group="inline"] [data-item="strikethrough"]')).not.toBeNull();
  });

  it("can read the toolbar attribute against the compact groups", () => {
    const el = create({ toolbar: "history,lists", "toolbar-layout": "compact" });
    expect(rowGroups(el)).toEqual(["history", "lists"]);
  });
});

describe("display modes", () => {
  it("is static by default and reflects the mode on the element", () => {
    const el = create();
    expect(el.toolbarMode).toBe("static");
    expect(el.dataset.toolbarMode).toBe("static");
  });

  it("starts in the mode named by the toolbar-mode attribute", () => {
    expect(create({ "toolbar-mode": "sticky" }).dataset.toolbarMode).toBe("sticky");
    expect(create({ "toolbar-mode": "focus" }).dataset.toolbarMode).toBe("focus");
  });

  it("changes at runtime through setToolbarMode and the property", () => {
    const el = create();
    el.setToolbarMode("sticky");
    expect(el.dataset.toolbarMode).toBe("sticky");
    expect(el.getAttribute("toolbar-mode")).toBe("sticky");
    el.toolbarMode = "focus";
    expect(el.dataset.toolbarMode).toBe("focus");
    expect(el.toolbarMode).toBe("focus");
    el.setToolbarMode("static");
    expect(el.dataset.toolbarMode).toBe("static");
  });

  it("falls back to static for a value it does not know", () => {
    const el = create({ "toolbar-mode": "floaty" });
    expect(el.toolbarMode).toBe("static");
    expect(el.dataset.toolbarMode).toBe("static");
    el.setToolbarMode("nope" as never);
    expect(el.toolbarMode).toBe("static");
  });

  it("pins the toolbar in focus mode with toolbarPinned", () => {
    const el = create({ "toolbar-mode": "focus" });
    expect(el.hasAttribute("data-toolbar-pinned")).toBe(false);
    el.toolbarPinned = true;
    expect(el.hasAttribute("data-toolbar-pinned")).toBe(true);
    expect(el.getAttribute("toolbar-pinned")).toBe("");
    el.toolbarPinned = false;
    expect(el.hasAttribute("data-toolbar-pinned")).toBe(false);
  });

  it("keeps the toolbar in the DOM in every mode, so the mode changes nothing about its content", () => {
    const el = create();
    const before = toolbarOf(el);
    el.setToolbarMode("focus");
    expect(toolbarOf(el)).toBe(before);
  });

  it("ships CSS for each mode: sticky pins, focus overlays without shifting content", () => {
    expect(styles).toMatch(/\[data-toolbar-mode="sticky"\][^{]*\{[^}]*position: sticky/);
    expect(styles).toMatch(/\[data-toolbar-mode="focus"\] > \.spez-rte-toolbar \{[^}]*margin-block-end: calc\(-1 \* var\(--rte-toolbar-height\)\)/);
    expect(styles).toMatch(/\[data-toolbar-mode="focus"\]:focus-within > \.spez-rte-toolbar/);
    expect(styles).toMatch(/\[data-toolbar-mode="focus"\] \.spez-rte-shell \{[^}]*padding-block-start/);
  });

  it("focusToolbar() moves focus into the toolbar", () => {
    const el = create();
    el.focusToolbar();
    expect(toolbarOf(el).contains(document.activeElement)).toBe(true);
  });
});

describe("right to left", () => {
  it("mirrors an Arabic toolbar when the element sets no direction", () => {
    const el = create({ locale: "ar" });
    expect(toolbarOf(el).dir).toBe("rtl");
    expect(toolbarOf(el).getAttribute("aria-label")).toBe("التنسيق");
    expect(item(el, "bold").getAttribute("aria-label")).toBe("غامق");
  });

  it("follows an explicit dir on the element instead", () => {
    const el = create({ locale: "ar", dir: "ltr" });
    expect(toolbarOf(el).hasAttribute("dir")).toBe(false);
  });

  it("leaves an English toolbar and the legacy layout alone", () => {
    expect(toolbarOf(create()).hasAttribute("dir")).toBe(false);
    expect(toolbarOf(create({ locale: "ar", "toolbar-layout": "legacy" })).hasAttribute("dir")).toBe(false);
  });

  it("flags the direction-sensitive icons so CSS mirrors them", () => {
    const el = create();
    for (const id of ["align-start", "align-end", "indent", "outdent", "bullet-list"]) {
      expect(item(el, id).querySelector(".spez-rte-icon--flip"), id).not.toBeNull();
    }
    expect(item(el, "align-center").querySelector(".spez-rte-icon--flip")).toBeNull();
    expect(item(el, "dir-rtl").querySelector(".spez-rte-icon--flip")).toBeNull();
  });

  it("uses logical CSS for the toolbar, so nothing is pinned to left or right", () => {
    const toolbarCss = styles.slice(styles.indexOf(".spez-rte-toolbar {"), styles.indexOf(".spez-rte-shell {"));
    expect(toolbarCss).not.toMatch(/\b(margin|padding|border)-(left|right)\b/);
    expect(toolbarCss).not.toMatch(/\b(left|right):\s/);
  });

  it("translates every new label", () => {
    const el = create({ locale: "ar" });
    for (const c of toolbarOf(el).querySelectorAll<HTMLElement>("button, select")) {
      expect(c.getAttribute("aria-label"), c.dataset.item).not.toMatch(/^[A-Za-z]+( [A-Za-z-]+)*$/);
    }
  });
});

describe("theming", () => {
  it("exposes the toolbar's colours, spacing, radius and type as custom properties with neutral defaults", () => {
    for (const token of [
      "--rte-toolbar-bg", "--rte-toolbar-fg", "--rte-toolbar-border", "--rte-toolbar-divider",
      "--rte-toolbar-hover-bg", "--rte-toolbar-active-bg", "--rte-toolbar-active-fg", "--rte-toolbar-focus-ring",
      "--rte-toolbar-field-bg", "--rte-toolbar-field-fg", "--rte-toolbar-radius", "--rte-control-radius", "--rte-control-height", "--rte-toolbar-gap",
      "--rte-toolbar-padding-block", "--rte-toolbar-padding-inline",
      "--rte-toolbar-font-size", "--rte-toolbar-label-size", "--rte-toolbar-icon-size",
      "--rte-menu-bg", "--rte-menu-border", "--rte-menu-shadow", "--rte-toolbar-z", "--rte-toolbar-sticky-top",
    ]) {
      expect(styles, token).toContain(`${token}:`);
    }
  });

  it("draws toolbar chrome with tokens only, never a literal colour", () => {
    const toolbarCss = styles.slice(styles.indexOf(".spez-rte-toolbar {"), styles.indexOf(".spez-rte-shell {"));
    const stripped = toolbarCss.replace(/rgba\(0, 0, 0, [0-9.]+\)/g, ""); // neutral black shadows
    expect(stripped).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("responsive overflow", () => {
  type Observer = { cb: () => void };
  const observers: Observer[] = [];
  let width = 1000;
  const WIDTHS: Record<string, number> = {
    history: 60, block: 100, inline: 120, color: 70, lists: 100, "align-dir": 150, insert: 120,
  };

  beforeEach(() => {
    observers.length = 0;
    width = 1000;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          observers.push({ cb });
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });
  afterEach(() => vi.unstubAllGlobals());

  /** jsdom has no layout: model the row's width from the groups it currently holds. */
  function mount(config?: ToolbarConfig): SpezRichtext {
    const el = create({}, config);
    const tb = toolbarOf(el);
    Object.defineProperty(tb, "clientWidth", { configurable: true, get: () => width });
    Object.defineProperty(tb, "scrollWidth", {
      configurable: true,
      get: () =>
        [...tb.children].reduce((sum, c) => {
          const h = c as HTMLElement;
          if (h.hidden) return sum;
          if (h.classList.contains("spez-rte-more")) return sum + 32;
          return sum + (WIDTHS[h.getAttribute("data-group") ?? ""] ?? 0);
        }, 0),
    });
    return el;
  }
  const resize = (w: number): void => {
    width = w;
    observers.forEach((o) => o.cb());
  };
  const collapsed = (el: Element): string[] =>
    [...panelOf(el).querySelectorAll(".spez-rte-more__responsive [data-group]")].map((g) => g.getAttribute("data-group")!);

  it("keeps everything in the row while it fits", () => {
    const el = mount();
    resize(1000);
    expect(rowGroups(el)).toEqual(["history", "block", "inline", "color", "lists", "align-dir", "insert"]);
    expect(collapsed(el)).toEqual([]);
    expect(panelOf(el).querySelector<HTMLElement>(".spez-rte-more__section--responsive")!.hidden).toBe(true);
  });

  it("gives groups up to More, direction and alignment first, as the row narrows", () => {
    const el = mount();
    resize(700);
    expect(collapsed(el)).toEqual(["align-dir"]);
    resize(540);
    expect(collapsed(el)).toEqual(["align-dir", "insert"]);
    expect(rowGroups(el)).toEqual(["history", "block", "inline", "color", "lists"]);
    expect(panelOf(el).querySelector<HTMLElement>(".spez-rte-more__section--responsive")!.hidden).toBe(false);
    expect(toolbarOf(el).hasAttribute("data-collapsed")).toBe(true);
  });

  it("moves the groups themselves, so their controls still work from inside More", () => {
    const el = mount();
    const bold = item(el, "bold");
    const rtl = item(el, "dir-rtl");
    resize(540);
    expect(item(el, "dir-rtl")).toBe(rtl);
    expect(panelOf(el).contains(rtl)).toBe(true);
    expect(item(el, "bold")).toBe(bold);
    expect(el.querySelectorAll('[data-item="dir-rtl"]').length).toBe(1);
  });

  it("labels each collapsed group in the menu", () => {
    const el = mount();
    resize(540);
    const labels = [...panelOf(el).querySelectorAll(".spez-rte-more__row--group > .spez-rte-more__label")].map((l) => l.textContent);
    expect(labels).toEqual(["Alignment and direction", "Insert"]);
  });

  it("takes them back, in their original place, when the row widens", () => {
    const el = mount();
    resize(540);
    resize(1000);
    expect(rowGroups(el)).toEqual(["history", "block", "inline", "color", "lists", "align-dir", "insert"]);
    expect(collapsed(el)).toEqual([]);
    expect(toolbarOf(el).hasAttribute("data-collapsed")).toBe(false);
  });

  it("collapses in the configured order", () => {
    const el = mount({ collapse: ["lists", "color"] });
    resize(560);
    expect(collapsed(el)).toEqual(["lists", "color"]);
    expect(rowGroups(el)).toContain("align-dir");
  });

  it("never collapses a group that is not in the collapse list", () => {
    const el = mount();
    resize(120);
    expect(rowGroups(el)).toEqual(["history", "block", "inline"]);
  });

  it("wraps rather than clips when nothing is left to collapse, and unwraps when it fits", () => {
    const el = mount();
    resize(120);
    expect(toolbarOf(el).classList.contains("spez-rte-toolbar--wrap")).toBe(true);
    resize(1000);
    expect(toolbarOf(el).classList.contains("spez-rte-toolbar--wrap")).toBe(false);
  });

  it("does not collapse when overflow is off", () => {
    const el = mount({ overflow: false });
    resize(300);
    expect(collapsed(el)).toEqual([]);
    expect(rowGroups(el)).toContain("insert");
  });

  it("does nothing while the toolbar has no width (hidden tab)", () => {
    const el = mount();
    resize(0);
    expect(collapsed(el)).toEqual([]);
  });

  it("puts controls that moved into More back in the natural tab order", () => {
    const el = mount();
    resize(540);
    // Groups moved into the menu leave the row's roving order and rejoin the natural tab order.
    for (const c of panelOf(el).querySelectorAll<HTMLElement>("button, select")) {
      expect(c.getAttribute("tabindex"), c.dataset.item).toBeNull();
    }
    const rowStops = [...toolbarOf(el).querySelectorAll<HTMLElement>("button, select")].filter(
      (c) => c.tabIndex === 0 && !c.closest(".spez-rte-more__panel"),
    );
    expect(rowStops.length).toBe(1);
  });

  it("shows the More button for collapsed groups even when the menu has no controls of its own", () => {
    const el = mount({ more: undefined, groups: ["history", "block", "inline", "color", "lists", "align-dir", "insert"], hide: [
      "font-family", "font-size", "lud-font", "strikethrough", "subscript", "superscript", "code", "align-justify", "dir-auto", "hijri-date", "ayat", "transliteration",
    ] });
    resize(1000);
    expect(el.querySelector<HTMLElement>(".spez-rte-more")!.hidden).toBe(true);
    resize(540);
    expect(el.querySelector<HTMLElement>(".spez-rte-more")!.hidden).toBe(false);
  });
});
