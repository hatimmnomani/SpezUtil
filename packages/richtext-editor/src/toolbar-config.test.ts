import { describe, expect, it } from "vitest";
import "./index";
import {
  ALL_TOOLBAR_GROUPS,
  DEFAULT_TOOLBAR_GROUPS,
  DEFAULT_TOOLBAR_LAYOUT,
  LEGACY_TOOLBAR_LAYOUT,
  resolveToolbarLayout,
} from "./toolbar";
import { configFromGroupList } from "./toolbar-config";
import { listToolbarItems } from "./toolbar";

const ids = (groups: { items: string[] }[]): string[] => groups.flatMap((g) => g.items);

describe("resolveToolbarLayout: the default", () => {
  const layout = resolveToolbarLayout();

  it("is the compact layout with overflow on", () => {
    expect(layout.layout).toBe("compact");
    expect(layout.overflow).toBe(true);
  });

  it("has one compact row of logical groups", () => {
    expect(layout.groups.map((g) => g.id)).toEqual(["history", "block", "inline", "color", "lists", "align-dir", "insert"]);
    expect(layout.groups.find((g) => g.id === "inline")!.items).toEqual(["bold", "italic", "underline", "clear-formatting"]);
    expect(layout.groups.find((g) => g.id === "align-dir")!.items).toEqual([
      "align-start", "align-center", "align-end", "dir-rtl", "dir-ltr",
    ]);
  });

  it("puts Insert diagram in the insert group, and keeps comment out until asked for", () => {
    expect(layout.groups.find((g) => g.id === "insert")!.items).toContain("diagram");
    expect(ids(layout.groups)).not.toContain("comment");
  });

  it("keeps the low-use items in More", () => {
    const more = ids(layout.more);
    for (const id of [
      "strikethrough", "subscript", "superscript", "code", "align-justify", "dir-auto",
      "hijri-date", "ayat", "transliteration", "font-family", "font-size", "lud-font",
    ]) {
      expect(more, id).toContain(id);
    }
    expect(layout.more.map((s) => s.id)).toEqual(["text", "paragraph", "insert"]);
  });

  it("gives up direction and alignment first, then insert, colour and lists", () => {
    expect(layout.collapse).toEqual(["align-dir", "insert", "color", "lists"]);
  });

  it("places every item exactly once", () => {
    const all = [...ids(layout.groups), ...ids(layout.more)];
    expect(new Set(all).size).toBe(all.length);
  });

  it("is what DEFAULT_TOOLBAR_LAYOUT describes, so an app can start from it", () => {
    expect(resolveToolbarLayout(DEFAULT_TOOLBAR_LAYOUT)).toEqual(layout);
  });
});

describe("resolveToolbarLayout: configuration", () => {
  it("honours the order of the groups it is given", () => {
    const l = resolveToolbarLayout({ groups: ["insert", "history"] });
    expect(l.groups.map((g) => g.id)).toEqual(["insert", "history"]);
  });

  it("accepts custom groups, and overrides a preset group's items", () => {
    const l = resolveToolbarLayout({
      groups: ["history", { id: "mine", items: ["bold", "link"], label: "Mine" }, { id: "inline", items: ["italic"] }],
    });
    expect(l.groups.map((g) => [g.id, g.items])).toEqual([
      ["history", ["undo", "redo"]],
      ["mine", ["bold", "link"]],
      ["inline", ["italic"]],
    ]);
    expect(l.groups[1]!.label).toBe("Mine");
  });

  it("drops unknown groups and unknown items", () => {
    const l = resolveToolbarLayout({ groups: ["history", "nope", { id: "x", items: ["bold", "nonexistent"] }] });
    expect(l.groups.map((g) => [g.id, g.items])).toEqual([["history", ["undo", "redo"]], ["x", ["bold"]]]);
  });

  it("drops a group whose items are all gone", () => {
    const l = resolveToolbarLayout({ hide: ["undo", "redo"] });
    expect(l.groups.map((g) => g.id)).not.toContain("history");
  });

  it("hides an item wherever it is, in a group or in More", () => {
    const l = resolveToolbarLayout({ hide: ["bold", "strikethrough"] });
    expect(ids(l.groups)).not.toContain("bold");
    expect(ids(l.more)).not.toContain("strikethrough");
    expect(ids(l.groups)).toContain("italic");
  });

  it("shows an item into its home group", () => {
    const l = resolveToolbarLayout({ groups: ["inline"], more: false, show: ["strikethrough"] });
    expect(l.groups[0]!.items).toEqual(["bold", "italic", "underline", "clear-formatting", "strikethrough"]);
  });

  it("shows an opt-in item by creating its preset group", () => {
    const l = resolveToolbarLayout({ show: ["comment"] });
    expect(l.groups.at(-1)).toMatchObject({ id: "comment", items: ["comment"] });
  });

  it("lets show win over hide for the same item, back in its home group", () => {
    const l = resolveToolbarLayout({ hide: ["code"], show: ["code"] });
    expect(l.groups.find((g) => g.id === "inline")!.items).toContain("code");
    expect(ids(l.more)).not.toContain("code");
  });

  it("shows an item whose home group is not in the layout into More", () => {
    const l = resolveToolbarLayout({ groups: ["history"], show: ["font-size"] });
    expect(ids(l.more)).toContain("font-size");
  });

  it("takes More as a plain list, sectioning by the items' defaults", () => {
    const l = resolveToolbarLayout({ groups: ["history"], more: ["code", "ayat", "dir-auto"] });
    expect(l.more.map((s) => [s.id, s.items])).toEqual([
      ["text", ["code"]],
      ["insert", ["ayat"]],
      ["paragraph", ["dir-auto"]],
    ]);
  });

  it("takes More as explicit sections", () => {
    const l = resolveToolbarLayout({ more: [{ id: "rare", label: "Rare", items: ["ayat", "code"] }] });
    expect(l.more).toEqual([{ id: "rare", label: "Rare", items: ["ayat", "code"] }]);
  });

  it("more: false removes the menu and with it overflow", () => {
    const l = resolveToolbarLayout({ more: false });
    expect(l.more).toEqual([]);
    expect(l.overflow).toBe(false);
  });

  it("keeps an item at its first position when it is listed twice", () => {
    const l = resolveToolbarLayout({ groups: [{ id: "a", items: ["bold"] }, { id: "b", items: ["bold", "italic"] }], more: ["bold"] });
    expect(l.groups.map((g) => g.items)).toEqual([["bold"], ["italic"]]);
    expect(l.more).toEqual([]);
  });

  it("only collapses groups that exist", () => {
    const l = resolveToolbarLayout({ groups: ["history", "insert"], collapse: ["insert", "lists", "ghost"] });
    expect(l.collapse).toEqual(["insert"]);
  });

  it("overflow can be switched off", () => {
    expect(resolveToolbarLayout({ overflow: false }).overflow).toBe(false);
  });

  it("sees items registered after the module loaded", () => {
    expect(listToolbarItems()).toContain("table");
    expect(listToolbarItems()).toContain("bold");
  });
});

describe("the legacy layout", () => {
  it("is the 0.5 toolbar: flat groups, no More, no overflow", () => {
    const l = resolveToolbarLayout({ layout: "legacy" });
    expect(l.groups.map((g) => g.id)).toEqual([...DEFAULT_TOOLBAR_GROUPS]);
    expect(l.more).toEqual([]);
    expect(l.overflow).toBe(false);
  });

  it("keeps lud, comment and diagram opt-in, and understands their old group names", () => {
    const l = resolveToolbarLayout({ layout: "legacy", groups: [...ALL_TOOLBAR_GROUPS] });
    expect(l.groups.map((g) => g.id)).toEqual([...ALL_TOOLBAR_GROUPS]);
    expect(l.groups.find((g) => g.id === "direction")!.items).toEqual(["dir-rtl", "dir-ltr", "dir-auto"]);
  });

  it("is what LEGACY_TOOLBAR_LAYOUT describes", () => {
    expect(resolveToolbarLayout({ layout: "legacy", ...LEGACY_TOOLBAR_LAYOUT }).groups.map((g) => g.id)).toEqual([
      ...DEFAULT_TOOLBAR_GROUPS,
    ]);
  });
});

describe("configFromGroupList (the toolbar attribute)", () => {
  it("selects the legacy layout, in canonical group order", () => {
    expect(configFromGroupList("inline, history")).toEqual({ layout: "legacy", groups: ["history", "inline"] });
  });

  it("drops names it does not know and honours none", () => {
    expect(configFromGroupList("history,bogus")).toEqual({ layout: "legacy", groups: ["history"] });
    expect(configFromGroupList("none")).toBeNull();
  });

  it("reads compact group ids when the compact layout is asked for", () => {
    expect(configFromGroupList("insert,history,lists", "compact")).toEqual({
      layout: "compact",
      groups: ["history", "lists", "insert"],
    });
  });
});
