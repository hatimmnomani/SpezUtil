import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot, $selectAll } from "lexical";
import "./index";
import type { SpezRichtext } from "./richtext-editor";

beforeEach(() => {
  document.body.innerHTML = "";
});

// What kb-review's editorReadyJson used to patch up before handing the backend's JSON to the editor:
// element nodes without format/indent/direction, text nodes without detail/format/mode/style.
const MINIMAL = JSON.stringify({
  root: {
    type: "root", version: 1,
    children: [
      { type: "heading", tag: "h2", anchor: "marahil-nizaam", children: [{ type: "text", text: "Marahil" }] },
      {
        type: "paragraph",
        children: [
          { type: "lud-text", version: 1, text: "ثثر", ludFont: "al-kanz", format: 0, detail: 0, mode: "normal" },
          { type: "lud-text", text: "نسس", ludFont: "al-fatemi" },
          { type: "text", text: " x" },
        ],
      },
    ],
  },
});

describe("minimal backend JSON (no editorReadyJson)", () => {
  it("loads, renders the text, and survives a selection update and a save", () => {
    const el = document.createElement("spez-richtext") as SpezRichtext;
    document.body.appendChild(el);
    expect(() => el.setValue(MINIMAL)).not.toThrow();
    expect(el.querySelector("h2")!.id).toBe("marahil-nizaam");
    el.editor.getEditorState().read(() => expect($getRoot().getTextContent()).toBe("Marahil\n\nثثرنسس x"));
    expect(() => el.editor.update(() => $selectAll(), { discrete: true })).not.toThrow();
    const saved = JSON.parse(el.getJSON());
    expect(saved.root.children[0].anchor).toBe("marahil-nizaam");
    expect(saved.root.children[1].children[0].style).toBe('font-family: "AL-KANZ", "Noto Naskh Arabic";');
  });
});
