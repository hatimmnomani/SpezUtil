import { beforeEach, describe, expect, it } from "vitest";
import { $createTextNode, $getRoot, $isParagraphNode, $selectAll } from "lexical";
import { $isHeadingNode } from "@lexical/rich-text";
import "./index";
import { $isAyatNode } from "./nodes/ayat-node";
import {
  $createTranslitLineNode,
  $createTranslitPairNode,
  $isTranslitPairNode,
} from "./nodes/translit-nodes";
import type { SpezRichtext } from "./richtext-editor";

function create(attrs: Record<string, string> = {}): SpezRichtext {
  const el = document.createElement("spez-richtext");
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  document.body.appendChild(el);
  return el;
}

function clickButton(el: SpezRichtext, title: string): void {
  const btn = [...el.querySelectorAll<HTMLButtonElement>(".spez-rte-toolbar button")].find(
    (b) => b.title === title,
  );
  expect(btn, `toolbar button "${title}"`).toBeDefined();
  btn!.click();
  flush(el);
}

/** Flush Lexical's batched update before reading state. */
function flush(el: SpezRichtext): void {
  el.editor.update(() => {}, { discrete: true });
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("toolbar", () => {
  it("bold button applies bold to the selection", () => {
    const el = create();
    el.setHTML("<p>hello</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    clickButton(el, "Bold");
    const hasBold = el.editor.getEditorState().read(() => {
      const text = $getRoot().getAllTextNodes()[0]!;
      return text.hasFormat("bold");
    });
    expect(hasBold).toBe(true);
  });

  it("block select turns the paragraph into a heading", () => {
    const el = create();
    el.setHTML("<p>title</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    const select = el.querySelector<HTMLSelectElement>(".spez-rte-toolbar select")!;
    select.value = "h2";
    select.dispatchEvent(new Event("change"));
    flush(el);
    el.editor.getEditorState().read(() => {
      const first = $getRoot().getFirstChild();
      expect($isHeadingNode(first)).toBe(true);
    });
  });

  it("ayat insert button wraps the block in an AyatNode", () => {
    const el = create();
    el.setHTML("<p>بسم الله</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    clickButton(el, "Ayat block");
    el.editor.getEditorState().read(() => {
      expect($isAyatNode($getRoot().getFirstChild())).toBe(true);
    });
  });

  it("block select converts an ayat block back to a paragraph", () => {
    const el = create();
    el.setHTML('<blockquote data-spez-type="ayat">بسم الله</blockquote>');
    el.editor.update(() => $selectAll(), { discrete: true });
    const select = el.querySelector<HTMLSelectElement>(".spez-rte-toolbar select")!;
    select.value = "paragraph";
    select.dispatchEvent(new Event("change"));
    flush(el);
    el.editor.getEditorState().read(() => {
      const first = $getRoot().getFirstChild();
      expect($isParagraphNode(first)).toBe(true);
      expect(first!.getTextContent()).toBe("بسم الله");
    });
  });

  function seedPairAndSelect(el: SpezRichtext): void {
    el.editor.update(
      () => {
        const pair = $createTranslitPairNode();
        const arabic = $createTranslitLineNode("arabic");
        arabic.append($createTextNode("العلم نور"));
        const latin = $createTranslitLineNode("latin");
        latin.append($createTextNode("al-ilmu noor"));
        pair.append(arabic, latin);
        $getRoot().clear().append(pair);
        arabic.selectStart();
      },
      { discrete: true },
    );
  }

  it("block select converts a translit pair into paragraphs", () => {
    const el = create();
    seedPairAndSelect(el);
    const select = el.querySelector<HTMLSelectElement>(".spez-rte-toolbar select")!;
    select.value = "paragraph";
    select.dispatchEvent(new Event("change"));
    flush(el);
    el.editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children.some($isTranslitPairNode)).toBe(false);
      expect(children.map((c) => c.getTextContent())).toEqual(["العلم نور", "al-ilmu noor"]);
    });
  });

  it("block select converts a translit pair into headings", () => {
    const el = create();
    seedPairAndSelect(el);
    const select = el.querySelector<HTMLSelectElement>(".spez-rte-toolbar select")!;
    select.value = "h2";
    select.dispatchEvent(new Event("change"));
    flush(el);
    el.editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children.some($isTranslitPairNode)).toBe(false);
      expect($isHeadingNode(children[0])).toBe(true);
      expect(children[0]!.getTextContent()).toBe("العلم نور");
    });
  });

  it("undo button starts disabled", () => {
    const el = create();
    const undo = [...el.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => b.title === "Undo",
    )!;
    expect(undo.disabled).toBe(true);
  });

  it("uses Arabic labels for locale=ar", () => {
    const el = create({ locale: "ar" });
    const bold = [...el.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => b.textContent === "B",
    )!;
    expect(bold.title).toBe("غامق");
  });
});

describe("toolbar font selector", () => {
  function fontSelect(el: SpezRichtext): HTMLSelectElement {
    const select = el.querySelector<HTMLSelectElement>(
      '.spez-rte-toolbar [data-group="font"] select',
    );
    expect(select, "font select").not.toBeNull();
    return select!;
  }

  it("renders the default font list plus a default row", () => {
    const el = create();
    const options = [...fontSelect(el).options];
    expect(options[0]!.value).toBe("");
    expect(options.map((o) => o.textContent)).toContain("Amiri");
    expect(options.length).toBeGreaterThan(3);
  });

  it("applies the chosen font-family to the selection", () => {
    const el = create();
    el.setHTML("<p>hello</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    const select = fontSelect(el);
    select.value = "Tahoma, sans-serif";
    select.dispatchEvent(new Event("change"));
    flush(el);
    const style = el.editor.getEditorState().read(() => {
      return $getRoot().getAllTextNodes()[0]!.getStyle();
    });
    expect(style).toContain("font-family: Tahoma, sans-serif");
  });

  it("exports and re-imports the inline font-family via HTML", () => {
    const el = create();
    el.setHTML("<p>hello</p>");
    el.editor.update(() => $selectAll(), { discrete: true });
    const select = fontSelect(el);
    select.value = "Georgia, serif";
    select.dispatchEvent(new Event("change"));
    flush(el);
    const html = el.getHTML();
    expect(html).toContain("font-family: Georgia, serif");
    // Import into a fresh editor — a focused editor trips jsdom's missing
    // layout APIs inside Lexical's scroll-into-view.
    const el2 = create();
    el2.setHTML(html);
    const style = el2.editor.getEditorState().read(() => {
      return $getRoot().getAllTextNodes()[0]!.getStyle();
    });
    expect(style).toContain("font-family: Georgia, serif");
  });

  it("fonts property replaces the default list", () => {
    const el = create();
    el.fonts = [{ label: "My Font", family: '"My Font", serif' }];
    const options = [...fontSelect(el).options];
    expect(options.map((o) => o.textContent)).toEqual(["Default", "My Font"]);
  });

  it("fonts attribute provides a simple comma-separated list", () => {
    const el = create({ fonts: "Amiri, Tahoma" });
    const options = [...fontSelect(el).options];
    expect(options.map((o) => o.value)).toEqual(["", "Amiri", "Tahoma"]);
  });

  it("fonts property drops malformed entries", () => {
    const el = create();
    el.fonts = [
      { label: "Good", family: "Georgia, serif" },
      { label: "NoFamily", family: "" },
      // deliberately malformed: consumers pass plain JS
      { label: 3 } as unknown as { label: string; family: string },
    ];
    const options = [...fontSelect(el).options];
    expect(options.map((o) => o.textContent)).toEqual(["Default", "Good"]);
  });

  it("uses Arabic label for the font control when locale=ar", () => {
    const el = create({ locale: "ar" });
    expect(fontSelect(el).title).toBe("الخط");
  });
});

describe("toolbar color controls", () => {
  function colorButton(el: SpezRichtext, property: "color" | "background-color"): HTMLButtonElement {
    const btn = el.querySelector<HTMLButtonElement>(
      `.spez-rte-toolbar [data-group="color"] button[data-property="${property}"]`,
    );
    expect(btn, `color button "${property}"`).not.toBeNull();
    return btn!;
  }

  function popover(el: SpezRichtext): HTMLElement {
    const pop = el.querySelector<HTMLElement>(".spez-rte-popover");
    expect(pop, "color popover").not.toBeNull();
    return pop!;
  }

  function firstTextStyle(el: SpezRichtext): string {
    return el.editor.getEditorState().read(() => $getRoot().getAllTextNodes()[0]!.getStyle());
  }

  function selectAllText(el: SpezRichtext, html = "<p>hello</p>"): void {
    el.setHTML(html);
    el.editor.update(() => $selectAll(), { discrete: true });
  }

  it("renders text and highlight color buttons in the color group", () => {
    const el = create();
    expect(colorButton(el, "color").title).toBe("Text color");
    expect(colorButton(el, "background-color").title).toBe("Highlight color");
  });

  it("opens a palette popover anchored to the button", () => {
    const el = create();
    const btn = colorButton(el, "color");
    btn.click();
    const pop = popover(el);
    expect(pop.querySelectorAll(".spez-rte-swatch").length).toBe(12);
    expect(pop.querySelector<HTMLInputElement>('input[type="color"]')).not.toBeNull();
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(el.querySelector(".spez-rte-popover")).toBeNull();
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("swatch applies the text color to the selection and closes the popover", () => {
    const el = create();
    selectAllText(el);
    colorButton(el, "color").click();
    const swatch = popover(el).querySelector<HTMLButtonElement>('.spez-rte-swatch[data-value="#c62828"]')!;
    swatch.click();
    flush(el);
    expect(firstTextStyle(el)).toContain("color: #c62828");
    expect(el.querySelector(".spez-rte-popover")).toBeNull();
  });

  it("swatch applies the highlight color as background-color", () => {
    const el = create();
    selectAllText(el);
    colorButton(el, "background-color").click();
    popover(el).querySelector<HTMLButtonElement>('.spez-rte-swatch[data-value="#fff59d"]')!.click();
    flush(el);
    expect(firstTextStyle(el)).toContain("background-color: #fff59d");
  });

  it("custom color input applies its value on input", () => {
    const el = create();
    selectAllText(el);
    colorButton(el, "color").click();
    const input = popover(el).querySelector<HTMLInputElement>('input[type="color"]')!;
    input.value = "#123456";
    input.dispatchEvent(new Event("input"));
    flush(el);
    expect(firstTextStyle(el)).toContain("color: #123456");
    input.dispatchEvent(new Event("change"));
    expect(el.querySelector(".spez-rte-popover")).toBeNull();
  });

  // CSSStyleDeclaration serializes hex colors as rgb() on export, so imported
  // styles may carry either form.
  const RED = /color: (#c62828|rgb\(198, 40, 40\))/;
  const BLUE = /color: (#1565c0|rgb\(21, 101, 192\))/;

  it("reset removes the color from the selection", () => {
    const el = create();
    selectAllText(el, '<p><span style="color: #c62828">hello</span></p>');
    expect(firstTextStyle(el)).toMatch(RED);
    colorButton(el, "color").click();
    popover(el).querySelector<HTMLButtonElement>(".spez-rte-color-reset")!.click();
    flush(el);
    expect(firstTextStyle(el)).not.toContain("color");
  });

  it("syncs the swatch bar and data-value to the selection's current color", () => {
    const el = create();
    const btn = colorButton(el, "color");
    expect(btn.hasAttribute("data-value")).toBe(false);
    selectAllText(el, '<p><span style="color: #1565c0">hello</span></p>');
    expect(`color: ${btn.getAttribute("data-value")}`).toMatch(BLUE);
    expect(btn.querySelector<HTMLElement>(".spez-rte-color-bar")!.style.background).toBe(
      "rgb(21, 101, 192)",
    );
    btn.click();
    const pressed = popover(el).querySelector<HTMLButtonElement>('.spez-rte-swatch[aria-pressed="true"]');
    expect(pressed?.dataset.value).toBe("#1565c0");
    expect(popover(el).querySelector<HTMLInputElement>('input[type="color"]')!.value).toBe("#1565c0");
  });

  it("exports and re-imports text and highlight colors via HTML", () => {
    const el = create();
    selectAllText(el);
    colorButton(el, "color").click();
    popover(el).querySelector<HTMLButtonElement>('.spez-rte-swatch[data-value="#2e7d32"]')!.click();
    flush(el);
    el.editor.update(() => $selectAll(), { discrete: true });
    colorButton(el, "background-color").click();
    popover(el).querySelector<HTMLButtonElement>('.spez-rte-swatch[data-value="#bbdefb"]')!.click();
    flush(el);
    const GREEN = /(^|[^-])color: (#2e7d32|rgb\(46, 125, 50\))/;
    const LIGHT_BLUE = /background-color: (#bbdefb|rgb\(187, 222, 251\))/;
    const html = el.getHTML();
    expect(html).toMatch(GREEN);
    expect(html).toMatch(LIGHT_BLUE);
    const el2 = create();
    el2.setHTML(html);
    const style = firstTextStyle(el2);
    expect(style).toMatch(GREEN);
    expect(style).toMatch(LIGHT_BLUE);
  });

  it("is omitted when the toolbar attribute excludes the color group", () => {
    const el = create({ toolbar: "inline,list" });
    expect(el.querySelector('[data-group="color"]')).toBeNull();
    expect(el.querySelector('[data-group="inline"]')).not.toBeNull();
  });

  it("uses Arabic labels for locale=ar", () => {
    const el = create({ locale: "ar" });
    expect(colorButton(el, "color").title).toBe("لون النص");
    expect(colorButton(el, "background-color").title).toBe("لون التظليل");
    colorButton(el, "color").click();
    const red = popover(el).querySelector<HTMLButtonElement>('.spez-rte-swatch[data-value="#c62828"]')!;
    expect(red.title).toBe("أحمر");
  });
});
