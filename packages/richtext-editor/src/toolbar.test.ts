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
