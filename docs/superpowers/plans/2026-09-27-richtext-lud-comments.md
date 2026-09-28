# SpezRichText: LuD text, comment marks, diagrams — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `@spezutil/richtext-editor` (and its Angular/React wrappers) with a `lud-text` node plus a LuD font picker, `CommentMarkNode` comment anchors with host events and highlight control, a Mermaid `DiagramNode`, and read-only comment highlighting. The Lexical JSON these produce must be exactly what the handbook backend's `HandbookHtmlRenderer` / `LexicalText` parse.

**Architecture:** `<spez-richtext>` is a plain `HTMLElement` custom element. It is **not** Lit, despite what the brief says. It renders in light DOM and wires vanilla Lexical 0.47 in `src/editor.ts`. Every feature below is a Lexical node plus a `register*` function that returns a disposer, added to `createEditorInstance`. The component adds only properties, methods and `CustomEvent`s on top.

`lud-text` is a `TextNode` subclass that **also keeps the profile's font-family in its `style`**. Lexical's `splitText` always creates plain `TextNode`s (`LexicalTextNode.ts:1069`), and paste, `$patchStyleText` and Google-Docs HTML all carry `font-family`. So two node transforms (text → lud-text and lud-text → text) keep `ludFont` and `font-family` in step, whichever path created the node. The typed text is never modified.

**Tech Stack:** TypeScript 5.6, Lexical 0.47 (`lexical`, `@lexical/mark` new, `@lexical/selection`, `@lexical/utils`, `@lexical/html`), `@spezutil/lud-codec` (workspace), `mermaid` ^11 (lazy `import()`), vitest 2 + jsdom 25, tsup, ng-packagr 19, `@lit/react`, Changesets.

**Spec:** `/Users/hatimnomani/code/mz-employee-handbook/docs/superpowers/specs/2026-09-27-employee-handbook-design.md` ("Comment anchoring", "Files, templates, workflows", "SpezRichText extensions"); `/Users/hatimnomani/code/mz-employee-handbook/docs/superpowers/specs/2026-09-27-portal-foundations-design.md` §1 "Storage". The backend contract being matched is in `/Users/hatimnomani/code/mz-employee-handbook/docs/superpowers/plans/2026-09-27-employee-handbook-api.md`: Global Constraints line 37, Task 7 `HandbookHtmlRenderer`, and Task 11 `LexicalText`.

## Global Constraints

- **LuD text is stored exactly as typed. It is never converted on input, save, paste, import or display.** No call to `toUnicode`/`toDisplay`/`toDisplayHtml` exists anywhere in `packages/richtext-editor/src` (checked by a grep in Task 15).
- `lud-text` JSON: `{"type":"lud-text","version":1,"ludFont":"<profileId>|unicode","text":"<as typed>","detail":0,"format":<bitmask>,"mode":"normal","style":"font-family: …;"}`. `ludFont` matches `^[a-z0-9-]{1,40}$` or is `"unicode"`. Anything else is stored as `"unicode"`, the same rule as `HandbookHtmlRenderer`.
- `lud-text` HTML: `<span data-lud-font="<ludFont>" style="…">text</span>`, wrapped in `<b>/<i>/<s>/<u>/<code>/<sub>/<sup>` for its formats. It is imported back from exactly that markup.
- Font picker entries come from `listProfiles()` of `@spezutil/lud-codec` **including drafts** (Al Kanz, Al-Fatemi, Kanz al-Marjaan), plus `Unicode`, which uses `DEFAULT_FALLBACK_FONT` (`"Noto Naskh Arabic"`). No font binaries are added to the repo. Only family names are referenced.
- `comment-mark` JSON: `{"type":"comment-mark","version":1,"ids":["<26-char ULID>", …],"children":[…],"direction":…,"format":"","indent":0}`. It must also import the backend's minimal `{"type":"comment-mark","version":1,"ids":[…],"children":[…]}` (the output of `LexicalText.TryWrap`).
- Mark ids are ULIDs: `^[0-9A-HJKMNP-TV-Z]{26}$` (the backend's `mark_id_invalid` rule).
- Anchor text follows backend `LexicalText.Plain` exactly. `text` and `lud-text` contribute their `text`. `linebreak` contributes `\n`. Every other node contributes only its children. `paragraph`, `heading`, `listitem`, `quote` and `tablecell` each end with `\n`. `prefix` = the last ≤ 32 chars before the quote. `suffix` = the first ≤ 32 chars after it. `quotedText` is 1–1,000 chars after trimming; anything else is rejected.
- Comment-mark HTML from the editor's own `getHTML()`: `<span data-thread-ids="<id> <id>">…</span>`. The public snapshot is rendered server-side as a bare `<span>`, so ids never reach public HTML.
- `diagram` JSON: `{"type":"diagram","version":1,"source":"<mermaid>","svg":"<svg…>","drawioKey":null|"<s3 key>"}`. `svg` must be non-empty before publish, or the backend returns 422 `render_failed`.
- Mermaid is always initialised with `htmlLabels: false` (top level and `flowchart`) and `securityLevel: "strict"`, because the server strips `foreignObject`.
- Diagram HTML: `<figure data-spez-type="diagram" data-drawio-key="…"><pre data-diagram="mermaid">source</pre><svg…/></figure>`.
- Events (bubbling, composed): `comment-requested` `{ markId, quotedText, prefix, suffix }`, `comment-clicked` `{ threadIds: string[] }`, `diagram-edit-requested` `{ nodeKey, source, drawioKey }`. The existing debounced `change` is the spec's "spez-change". No new change event is added.
- New toolbar groups `lud`, `comment` and `diagram` are **opt-in**. The default toolbar (no `toolbar` attribute) stays the 10 groups shipped in 0.4.0.
- Lexical packages stay version-matched at `^0.47.0`. Node ≥ 20, pnpm 9.12.
- Changesets: `minor` for `@spezutil/richtext-editor`, `@spezutil/richtext-editor-react` and `@spezutil/richtext-editor-angular`.

## Review Focus

- **Google Docs paste of Al Kanz text** (`<b style="font-weight:normal"><span style="font-family:'AL-KANZ'">…</span></b>`). Expected result: `lud-text` `al-kanz` with the characters byte-identical, including doubled letters such as `سس` and `}`. Pinned in Task 3.
- **Selection that ends mid-way through a lud-text run** (bold, comment or font change). Lexical splits it into a plain `TextNode`. Expected: both halves are still `lud-text` with the same `ludFont`. Pinned in Task 3 (`splitText` test) and Task 7 (mark over half a lud run).
- **Comment on a read-only published page.** The Lexical selection may be `null` there. Expected: `addCommentMark()` falls back to the DOM selection and still returns an anchor. Pinned in Task 8.
- **Backend-rewritten drafts.** Re-anchoring inserts a minimal `comment-mark` with no `format`/`indent`/`direction`. Expected: `setValue` loads it and `getJSON` re-emits valid element fields. Pinned in Task 5.
- **Diagram whose Mermaid source fails to parse, or that is edited again while a render is in flight.** Expected: the node shows the error and keeps `svg: ""`. A stale render result never overwrites a newer source. Pinned in Task 10.
- **Diagram SVG loaded from JSON is untrusted** (`<script>`, `onload`, external `href`). Expected: sanitized before insertion into the editor DOM. Pinned in Task 9.

---
## Known divergences from the handbook API plan (not fixed here — report to the backend owner)

The backend's Global Constraints (API plan line 37) list types this editor has **never** emitted. That is fine for the three new nodes, which match exactly. The **existing, already-published** nodes differ as follows:

| Editor 0.4.0 emits | Backend renderer expects | Consequence |
|---|---|---|
| `ayat`, an **element** with inline `children` | `ayat` leaf with `text`, `reference` | Renders an empty `<p>` and `<cite>`. The ayat text is lost. |
| `translit-pair` > `translit-line` (`role`) | `transliteration` leaf with `original`, `transliteration` | 422 `render_failed` on publish |
| `hijri-date` (TextNode, `hijri{year,month,day}`, `datePattern`, `text`) | `hijri-token` with `hijri` string, `gregorian` | 422 `render_failed` |
| `image` with `alt` | `image` with `altText` | alt text dropped |
| `autolink` (AutoLinkNode is registered) | only `link` | 422 if a pasted bare URL auto-links |

This plan does not rename published node types, because that would break every stored document. The backend renderer and `LexicalText` should switch to the as-built shapes above. Task 12's contract fixture, `packages/richtext-editor/contract/handbook-nodes.json`, is the file to copy into the backend tests.

## File Structure

`packages/richtext-editor/`
- `package.json` (modify): add deps `@lexical/mark ^0.47.0`, `@spezutil/lud-codec workspace:^`, `mermaid ^11.4.0`.
- `src/lud-fonts.ts` (create): LuD font options from the codec registry; family ↔ ludFont mapping; id validation.
- `src/nodes/lud-text-node.ts` (create): `LudTextNode`, JSON/HTML, `$createLudTextNode`, `$isLudTextNode`.
- `src/lud-sync.ts` (create): the two transforms that keep `ludFont` and `font-family` in step, with selection preserved.
- `src/comments/mark-id.ts` (create): ULID generator + validator.
- `src/comments/anchor.ts` (create): `$buildAnchorIndex`, `$commentAnchor`, following the backend `LexicalText.Plain` rules.
- `src/nodes/comment-mark-node.ts` (create): `CommentMarkNode` extends `MarkNode`.
- `src/comments/comments.ts` (create): commands, `registerComments` (wrap, remove, focus, click, highlight).
- `src/diagram/svg-sanitize.ts` (create): DOM allow-list SVG cleaner, mirroring `HandbookSvgSanitizer`.
- `src/diagram/renderer.ts` (create): lazy Mermaid renderer, `setDiagramRenderer`.
- `src/nodes/diagram-node.ts` (create): `DiagramNode` decorator.
- `src/diagram/diagrams.ts` (create): `INSERT_DIAGRAM_COMMAND`, `registerDiagrams` (render on mutation, stale guard, dblclick).
- `src/nodes/index.ts`, `src/editor.ts`, `src/toolbar.ts`, `src/locale.ts`, `src/styles.ts`, `src/richtext-editor.ts`, `src/index.ts` (modify).
- `contract/handbook-nodes.json` (create, generated by a test): the shared fixture.
- Tests live next to each source file as `*.test.ts`.

`packages/richtext-editor-react/src/index.ts`, `index.test.tsx` (modify): new events.
`packages/richtext-editor-angular/src/richtext-editor.component.ts`, `public-api.ts` (modify): new inputs, outputs and methods.
`apps/storybook/stories/richtext-editor.stories.ts` (modify), `apps/docs/docs/richtext/api.md` (modify), `.changeset/richtext-lud-comments-diagrams.md` (create).

Shared test helper, used verbatim by several tasks: `packages/richtext-editor/src/test-utils.ts` (created in Task 2).

---
### Task 1: Dependencies and the LuD font registry (`lud-fonts.ts`)

**Files:**
- Modify: `packages/richtext-editor/package.json`
- Create: `packages/richtext-editor/src/lud-fonts.ts`
- Test: `packages/richtext-editor/src/lud-fonts.test.ts`

**Interfaces:**
- Consumes: `listProfiles()`, `getProfile(id)`, `DEFAULT_FALLBACK_FONT` from `@spezutil/lud-codec`.
- Produces:
  - `const UNICODE_LUD_FONT = "unicode"`
  - `interface LudFontOption { id: string; label: string; family: string; draft: boolean }`
  - `listLudFonts(): LudFontOption[]`: profiles in registry order, then Unicode. `family` is `"<fontFamily>", "<fallbackFont>"`.
  - `isValidLudFontId(id: string): boolean`: `/^[a-z0-9-]{1,40}$/`
  - `normalizeLudFontId(id: string | null | undefined): string`: valid → id, else `"unicode"`
  - `familyForLudFont(id: string): string`: CSS font-family for a ludFont. Unknown or unicode → `"<DEFAULT_FALLBACK_FONT>"`.
  - `firstFontFamily(css: string): string`: first family of a font-family value, unquoted and trimmed
  - `ludFontForFamily(fontFamily: string): string | null`: maps the first family to a ludFont by normalized match on profile `fontFamily`, `displayName` or `id`. The fallback font maps to `"unicode"`. `null` otherwise.
  - `sameFamily(a: string, b: string): boolean`: compares normalized first families.

- [ ] **Step 1: Add dependencies and install**

In `packages/richtext-editor/package.json` `dependencies`, add three lines. Keep the keys alphabetical:

```json
    "@lexical/mark": "^0.47.0",
    "@spezutil/lud-codec": "workspace:^",
    "mermaid": "^11.4.0",
```

Run: `cd /Users/hatimnomani/code/SpezUtil-richtext && pnpm install && pnpm turbo run build --filter=@spezutil/richtext-editor^...`
Expected: install succeeds, then `@spezutil/hijri-core` and `@spezutil/lud-codec` build their `dist/`. The richtext tests resolve `@spezutil/lud-codec` through its `dist`, so re-run this build whenever lud-codec changes.

Verify the MarkNode API this plan relies on:
Run: `grep -n "constructor(ids\|excludeFromCopy\|insertNewAfter\|export function \$wrapSelectionInMarkNode\|export function \$unwrapMarkNode" packages/richtext-editor/node_modules/@lexical/mark/dist/LexicalMark.dev.mjs`
Expected: all five present. `$wrapSelectionInMarkNode(selection, isBackward, id, createNode?)` takes the 4th `createNode` argument.

- [ ] **Step 2: Write the failing test**

`packages/richtext-editor/src/lud-fonts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  UNICODE_LUD_FONT,
  familyForLudFont,
  firstFontFamily,
  isValidLudFontId,
  listLudFonts,
  ludFontForFamily,
  normalizeLudFontId,
  sameFamily,
} from "./lud-fonts";

describe("lud-fonts", () => {
  it("lists the three codec profiles (drafts included) then Unicode", () => {
    const fonts = listLudFonts();
    expect(fonts.map((f) => f.id)).toEqual(["al-kanz", "al-fatemi", "kanz-al-marjaan", "unicode"]);
    expect(fonts[0]).toEqual({
      id: "al-kanz",
      label: "Al Kanz",
      family: '"AL-KANZ", "Noto Naskh Arabic"',
      draft: false,
    });
    expect(fonts[1]!.draft).toBe(true);
    expect(fonts[3]).toEqual({ id: "unicode", label: "Unicode", family: '"Noto Naskh Arabic"', draft: false });
  });

  it("maps Google-Docs style font-family values to profiles", () => {
    expect(ludFontForFamily("'AL-KANZ', sans-serif")).toBe("al-kanz");
    expect(ludFontForFamily('"Al Kanz"')).toBe("al-kanz");
    expect(ludFontForFamily("AL-FATEMI-Lisaan-ud-Dawat")).toBe("al-fatemi");
    expect(ludFontForFamily("Kanz al-Marjaan")).toBe("kanz-al-marjaan");
    expect(ludFontForFamily('"Noto Naskh Arabic", serif')).toBe(UNICODE_LUD_FONT);
    expect(ludFontForFamily("Arial")).toBeNull();
    expect(ludFontForFamily("")).toBeNull();
  });

  it("validates ids like the backend renderer", () => {
    expect(isValidLudFontId("al-kanz")).toBe(true);
    expect(isValidLudFontId('" onmouseover="x')).toBe(false);
    expect(isValidLudFontId("")).toBe(false);
    expect(normalizeLudFontId('" onmouseover="x')).toBe("unicode");
    expect(normalizeLudFontId(undefined)).toBe("unicode");
    expect(normalizeLudFontId("kanz-al-lulu")).toBe("kanz-al-lulu"); // valid but unregistered: kept
  });

  it("resolves families for ids, with the fallback for unknown and unicode", () => {
    expect(familyForLudFont("al-kanz")).toBe('"AL-KANZ", "Noto Naskh Arabic"');
    expect(familyForLudFont("unicode")).toBe('"Noto Naskh Arabic"');
    expect(familyForLudFont("kanz-al-lulu")).toBe('"Noto Naskh Arabic"');
  });

  it("compares first families loosely", () => {
    expect(firstFontFamily(` "AL-KANZ" , serif`)).toBe("AL-KANZ");
    expect(sameFamily("'AL-KANZ'", '"AL-KANZ", "Noto Naskh Arabic"')).toBe(true);
    expect(sameFamily("Arial", "AL-KANZ")).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/lud-fonts.test.ts`
Expected: FAIL, `Failed to resolve import "./lud-fonts"`.

- [ ] **Step 4: Implement**

`packages/richtext-editor/src/lud-fonts.ts`:

```ts
import { DEFAULT_FALLBACK_FONT, getProfile, listProfiles } from "@spezutil/lud-codec";

/** ludFont value for text typed in the Unicode fallback font (not a codec profile). */
export const UNICODE_LUD_FONT = "unicode";

export interface LudFontOption {
  /** Codec profile id, or "unicode". Stored as `ludFont` on lud-text nodes. */
  id: string;
  label: string;
  /** CSS font-family value applied to the typed text. */
  family: string;
  /** True for draft codec profiles. Display never depends on confirmation. */
  draft: boolean;
}

const ID_PATTERN = /^[a-z0-9-]{1,40}$/;

const quote = (family: string) => `"${family.replace(/"/g, "")}"`;

/** Lowercase, drop quotes, parentheses, spaces, hyphens, underscores: "Al-Fatemi (Lisaan ud-Dawat)" → "alfatemilisaanuddawat". */
function normalize(family: string): string {
  return family.toLowerCase().replace(/["'()\s_-]/g, "");
}

export function firstFontFamily(css: string): string {
  const first = css.split(",")[0] ?? "";
  return first.trim().replace(/^["']|["']$/g, "").trim();
}

export function sameFamily(a: string, b: string): boolean {
  const na = normalize(firstFontFamily(a));
  return na !== "" && na === normalize(firstFontFamily(b));
}

export function isValidLudFontId(id: string): boolean {
  return ID_PATTERN.test(id);
}

/** Same rule as HandbookHtmlRenderer: an invalid id becomes "unicode". Valid unregistered ids are kept, never dropped. */
export function normalizeLudFontId(id: string | null | undefined): string {
  return typeof id === "string" && isValidLudFontId(id) ? id : UNICODE_LUD_FONT;
}

/** Called on every toolbar build, so profiles registered later via registerProfile show up. */
export function listLudFonts(): LudFontOption[] {
  const fonts: LudFontOption[] = listProfiles().map((p) => ({
    id: p.id,
    label: p.displayName,
    family: `${quote(p.fontFamily)}, ${quote(p.fallbackFont)}`,
    draft: p.status === "draft",
  }));
  fonts.push({
    id: UNICODE_LUD_FONT,
    label: "Unicode",
    family: quote(DEFAULT_FALLBACK_FONT),
    draft: false,
  });
  return fonts;
}

export function familyForLudFont(id: string): string {
  const profile = id === UNICODE_LUD_FONT ? undefined : getProfile(id);
  return profile
    ? `${quote(profile.fontFamily)}, ${quote(profile.fallbackFont)}`
    : quote(DEFAULT_FALLBACK_FONT);
}

export function ludFontForFamily(fontFamily: string): string | null {
  const key = normalize(firstFontFamily(fontFamily));
  if (key === "") return null;
  for (const p of listProfiles()) {
    if ([p.fontFamily, p.displayName, p.id].some((name) => normalize(name) === key)) return p.id;
  }
  return key === normalize(DEFAULT_FALLBACK_FONT) ? UNICODE_LUD_FONT : null;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/lud-fonts.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/richtext-editor/package.json pnpm-lock.yaml packages/richtext-editor/src/lud-fonts.ts packages/richtext-editor/src/lud-fonts.test.ts
git commit -m "feat(richtext): LuD font registry from lud-codec profiles"
```

---
### Task 2: `LudTextNode`: JSON and HTML contract

**Files:**
- Create: `packages/richtext-editor/src/nodes/lud-text-node.ts`, `packages/richtext-editor/src/test-utils.ts`
- Modify: `packages/richtext-editor/src/nodes/index.ts` (register and export)
- Test: `packages/richtext-editor/src/nodes/lud-text-node.test.ts`

**Interfaces:**
- Consumes: `familyForLudFont`, `normalizeLudFontId` (Task 1); `createEditorInstance`, `exportHTML`, `importHTML` (existing).
- Produces:
  - `type SerializedLudTextNode = Spread<{ ludFont: string }, SerializedTextNode>`
  - `class LudTextNode extends TextNode` with `getType() === "lud-text"`, `getLudFont(): string`, `setLudFont(id: string): this`
  - `$createLudTextNode(text: string, ludFont: string): LudTextNode`. It sets style `font-family: <familyForLudFont>;`.
  - `$isLudTextNode(node): node is LudTextNode`
  - `test-utils.ts`: `makeEditor(): { editor, root }`, `flushSync(editor)`, `firstParagraphChildren(editor): LexicalNode[]` (inside a read), `seedParagraph(editor, ...nodes: (() => LexicalNode)[])`

- [ ] **Step 1: Write the shared test helper**

`packages/richtext-editor/src/test-utils.ts`. It is excluded from the build by `tsconfig` `exclude`, so add it there too. In `packages/richtext-editor/tsconfig.json` set `"exclude": ["src/**/*.test.ts", "src/test-utils.ts"]`.

```ts
import {
  $createParagraphNode,
  $getRoot,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { createEditorInstance } from "./editor";

export function makeEditor(): { editor: LexicalEditor; root: HTMLElement } {
  const root = document.createElement("div");
  root.contentEditable = "true";
  document.body.appendChild(root);
  const { editor } = createEditorInstance(root);
  return { editor, root };
}

export function flushSync(editor: LexicalEditor): void {
  editor.update(() => {}, { discrete: true });
}

/** Replaces the document with one paragraph holding the given nodes. */
export function seedParagraph(editor: LexicalEditor, ...nodes: Array<() => LexicalNode>): void {
  editor.update(
    () => {
      const p = $createParagraphNode();
      p.append(...nodes.map((make) => make()));
      $getRoot().clear().append(p);
    },
    { discrete: true },
  );
}

export function firstParagraphChildren(editor: LexicalEditor): LexicalNode[] {
  return editor.getEditorState().read(() => ($getRoot().getFirstChild() as ElementNode).getChildren());
}
```

- [ ] **Step 2: Write the failing test**

`packages/richtext-editor/src/nodes/lud-text-node.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot, type ElementNode } from "lexical";
import { exportHTML, importHTML } from "../html";
import { firstParagraphChildren, makeEditor, seedParagraph } from "../test-utils";
import { $createLudTextNode, $isLudTextNode, LudTextNode } from "./lud-text-node";

beforeEach(() => {
  document.body.innerHTML = "";
});

// Typed for the Al Kanz font: doubled letters and "}" stand for glyphs the font lacks.
const TYPED = "نسس ثثاك }";

describe("LudTextNode", () => {
  it("serializes to the fixed lud-text contract with the text exactly as typed", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode(TYPED, "al-kanz").toggleFormat("bold"));
    const json = editor.getEditorState().toJSON();
    const node = (json.root.children[0] as unknown as { children: unknown[] }).children[0];
    expect(node).toEqual({
      detail: 0,
      format: 1,
      mode: "normal",
      style: 'font-family: "AL-KANZ", "Noto Naskh Arabic";',
      text: TYPED,
      type: "lud-text",
      version: 1,
      ludFont: "al-kanz",
    });
  });

  it("round-trips through JSON without touching the text", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode(TYPED, "al-fatemi"));
    editor.setEditorState(editor.parseEditorState(JSON.stringify(editor.getEditorState().toJSON())));
    const [node] = firstParagraphChildren(editor);
    expect($isLudTextNode(node)).toBe(true);
    editor.getEditorState().read(() => {
      expect((node as LudTextNode).getLudFont()).toBe("al-fatemi");
      expect(node!.getTextContent()).toBe(TYPED);
    });
  });

  it("stores an invalid ludFont from JSON as unicode", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("x", "al-kanz"));
    // Style is swapped to the fallback family too, so the Task 3 sync transform agrees with "unicode".
    const json = JSON.stringify(editor.getEditorState().toJSON())
      .replace('"ludFont":"al-kanz"', '"ludFont":"\\" onmouseover=\\"x"')
      .replace('font-family: \\"AL-KANZ\\", \\"Noto Naskh Arabic\\";', 'font-family: \\"Noto Naskh Arabic\\";');
    editor.setEditorState(editor.parseEditorState(json));
    editor.getEditorState().read(() => {
      expect((firstParagraphChildren(editor)[0] as LudTextNode).getLudFont()).toBe("unicode");
    });
  });

  it("renders in the profile font and tags the DOM with data-lud-font", () => {
    const { editor, root } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode(TYPED, "al-kanz"));
    const span = root.querySelector<HTMLElement>("[data-lud-font]")!;
    expect(span.getAttribute("data-lud-font")).toBe("al-kanz");
    expect(span.style.fontFamily).toContain("AL-KANZ");
    expect(span.textContent).toBe(TYPED);
  });

  it("exports <span data-lud-font> and imports it back", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode(TYPED, "kanz-al-marjaan").toggleFormat("bold"));
    const html = exportHTML(editor);
    expect(html).toContain('data-lud-font="kanz-al-marjaan"');
    expect(html).toMatch(/<b><span data-lud-font="kanz-al-marjaan"[^>]*>نسس ثثاك }<\/span><\/b>/);

    importHTML(editor, html);
    editor.getEditorState().read(() => {
      const nodes = ($getRoot().getFirstChild() as ElementNode).getChildren();
      expect(nodes).toHaveLength(1);
      const node = nodes[0] as LudTextNode;
      expect($isLudTextNode(node)).toBe(true);
      expect(node.getLudFont()).toBe("kanz-al-marjaan");
      expect(node.getTextContent()).toBe(TYPED);
      expect(node.hasFormat("bold")).toBe(true);
    });
  });

  it("imports a hand-written span with an unknown valid id and keeps the id", () => {
    const { editor } = makeEditor();
    importHTML(editor, '<p><span data-lud-font="kanz-al-lulu">ككتاب</span></p>');
    editor.getEditorState().read(() => {
      const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
      expect(node.getLudFont()).toBe("kanz-al-lulu");
      expect(node.getTextContent()).toBe("ككتاب");
    });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/nodes/lud-text-node.test.ts`
Expected: FAIL, `Failed to resolve import "./lud-text-node"`.

- [ ] **Step 4: Implement the node**

`packages/richtext-editor/src/nodes/lud-text-node.ts`:

```ts
import {
  $applyNodeReplacement,
  $isTextNode,
  TextNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
  type TextFormatType,
} from "lexical";
import { familyForLudFont, normalizeLudFontId } from "../lud-fonts";

export type SerializedLudTextNode = Spread<{ ludFont: string }, SerializedTextNode>;

const FORMAT_TAGS: ReadonlyArray<[TextFormatType, string]> = [
  ["code", "code"],
  ["subscript", "sub"],
  ["superscript", "sup"],
  ["underline", "u"],
  ["strikethrough", "s"],
  ["italic", "i"],
  ["bold", "b"],
];

/**
 * Text typed for a legacy Lisan ud-Dawat font, stored EXACTLY as typed (never converted),
 * tagged with the codec profile id it was typed in. The profile's font-family is also kept
 * in `style`, so Lexical operations that spawn plain TextNodes (splitText, paste) carry the
 * font along and lud-sync.ts can restore the lud-text type.
 */
export class LudTextNode extends TextNode {
  __ludFont: string;

  static getType(): string {
    return "lud-text";
  }

  static clone(node: LudTextNode): LudTextNode {
    return new LudTextNode(node.__text, node.__ludFont, node.__key);
  }

  constructor(text: string, ludFont: string, key?: NodeKey) {
    super(text, key);
    this.__ludFont = normalizeLudFontId(ludFont);
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__ludFont = prevNode.__ludFont;
  }

  getLudFont(): string {
    return this.getLatest().__ludFont;
  }

  setLudFont(id: string): this {
    const self = this.getWritable();
    self.__ludFont = normalizeLudFontId(id);
    return self;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.setAttribute("data-lud-font", this.__ludFont);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const recreate = super.updateDOM(prevNode, dom, config);
    if (!recreate) dom.setAttribute("data-lud-font", this.__ludFont);
    return recreate;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (node: HTMLElement) =>
        node.hasAttribute("data-lud-font")
          ? { conversion: $convertLudSpan, priority: 1 as const }
          : null,
    };
  }

  exportDOM(): DOMExportOutput {
    const span = document.createElement("span");
    span.setAttribute("data-lud-font", this.getLudFont());
    const style = this.getStyle();
    if (style !== "") span.setAttribute("style", style);
    span.style.whiteSpace = "pre-wrap";
    span.textContent = this.getTextContent();
    let element: HTMLElement = span;
    for (const [format, tag] of FORMAT_TAGS) {
      if (!this.hasFormat(format)) continue;
      const wrapper = document.createElement(tag);
      wrapper.append(element);
      element = wrapper;
    }
    return { element };
  }

  static importJSON(serializedNode: SerializedLudTextNode): LudTextNode {
    return $createLudTextNode(serializedNode.text, serializedNode.ludFont).updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedLudTextNode>): this {
    return super.updateFromJSON(serializedNode).setLudFont(serializedNode.ludFont);
  }

  exportJSON(): SerializedLudTextNode {
    return { ...super.exportJSON(), type: "lud-text", ludFont: this.getLudFont() };
  }
}

function $convertLudSpan(element: HTMLElement): DOMConversionOutput {
  const ludFont = normalizeLudFontId(element.getAttribute("data-lud-font"));
  const extra = ["color", "background-color", "font-size"]
    .map((prop) => {
      const value = element.style.getPropertyValue(prop);
      return value === "" ? "" : `${prop}: ${value};`;
    })
    .filter((s) => s !== "")
    .join(" ");
  return {
    node: null,
    forChild: (child) => {
      if (!$isTextNode(child) || $isLudTextNode(child)) return child;
      const lud = $createLudTextNode(child.getTextContent(), ludFont);
      lud.setFormat(child.getFormat());
      if (extra !== "") lud.setStyle(`${lud.getStyle()} ${extra}`);
      return lud;
    },
  };
}

export function $createLudTextNode(text: string, ludFont: string): LudTextNode {
  const node = new LudTextNode(text, ludFont);
  node.setStyle(`font-family: ${familyForLudFont(node.__ludFont)};`);
  return $applyNodeReplacement(node);
}

export function $isLudTextNode(node: LexicalNode | null | undefined): node is LudTextNode {
  return node instanceof LudTextNode;
}
```

- [ ] **Step 5: Register and export the node**

In `packages/richtext-editor/src/nodes/index.ts`, add `import { LudTextNode } from "./lud-text-node";` and put `LudTextNode` at the end of `EDITOR_NODES`. Append these exports:

```ts
export { LudTextNode, $createLudTextNode, $isLudTextNode } from "./lud-text-node";
export type { SerializedLudTextNode } from "./lud-text-node";
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/nodes/lud-text-node.test.ts`
Expected: PASS (6 tests). If the export-regex test fails only on attribute order inside the span, keep the regex as written and change `exportDOM` so `data-lud-font` is set first. Do not loosen the contract.

Run: `pnpm --filter @spezutil/richtext-editor test`
Expected: the whole existing suite still passes.

- [ ] **Step 7: Commit**

```bash
git add packages/richtext-editor/src/nodes/lud-text-node.ts packages/richtext-editor/src/nodes/lud-text-node.test.ts packages/richtext-editor/src/nodes/index.ts packages/richtext-editor/src/test-utils.ts packages/richtext-editor/tsconfig.json
git commit -m "feat(richtext): lud-text node stored exactly as typed"
```

---
### Task 3: Keeping `ludFont` and `font-family` in step (`lud-sync.ts`), paste and split

**Files:**
- Create: `packages/richtext-editor/src/lud-sync.ts`
- Modify: `packages/richtext-editor/src/editor.ts` (register in `createEditorInstance`)
- Test: `packages/richtext-editor/src/lud-sync.test.ts`

**Interfaces:**
- Consumes: `ludFontForFamily`, `familyForLudFont`, `sameFamily`, `firstFontFamily` (Task 1); `LudTextNode`, `$createLudTextNode`, `$isLudTextNode` (Task 2).
- Produces: `registerLudSync(editor: LexicalEditor): () => void`. Rules:
  - A plain `text` node whose first font-family maps to a ludFont is replaced by `lud-text` with that ludFont. Text, format, style and detail are kept.
  - A `lud-text` whose first font-family no longer matches `familyForLudFont(ludFont)` is re-fonted if the new family maps to a ludFont. Otherwise it is replaced by a plain `text` node with the same text, format and style.
  - Selection points on a replaced node move to the replacement at the **same offset**.

- [ ] **Step 1: Write the failing test**

`packages/richtext-editor/src/lud-sync.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  type ElementNode,
} from "lexical";
import { $patchStyleText } from "@lexical/selection";
import { importHTML } from "./html";
import { $createLudTextNode, $isLudTextNode, type LudTextNode } from "./nodes/lud-text-node";
import { firstParagraphChildren, makeEditor, seedParagraph } from "./test-utils";

beforeEach(() => {
  document.body.innerHTML = "";
});

function describeNodes(editor: ReturnType<typeof makeEditor>["editor"]) {
  return editor.getEditorState().read(() =>
    firstParagraphChildren(editor).map((n) => ({
      type: n.getType(),
      text: n.getTextContent(),
      ludFont: $isLudTextNode(n) ? n.getLudFont() : null,
    })),
  );
}

describe("lud sync", () => {
  it("turns Google-Docs pasted AL-KANZ text into lud-text, byte-identical", () => {
    const { editor } = makeEditor();
    importHTML(
      editor,
      '<b style="font-weight:normal" id="docs-internal-guid-1"><p dir="rtl"><span style="font-family:\'AL-KANZ\';font-size:14pt">نسس }حح ظظ</span><span style="font-family:Arial"> ok</span></p></b>',
    );
    expect(describeNodes(editor)).toEqual([
      { type: "lud-text", text: "نسس }حح ظظ", ludFont: "al-kanz" },
      { type: "text", text: " ok", ludFont: null },
    ]);
  });

  it("tags pasted Noto Naskh Arabic (proper Unicode Urdu) as unicode", () => {
    const { editor } = makeEditor();
    importHTML(editor, '<p><span style="font-family:\'Noto Naskh Arabic\'">حاضرین</span></p>');
    expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "حاضرین", ludFont: "unicode" }]);
  });

  it("keeps both halves as lud-text when Lexical splits the node", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("ثثاك طط", "al-kanz"));
    editor.update(
      () => {
        const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
        node.splitText(3);
      },
      { discrete: true },
    );
    expect(describeNodes(editor)).toEqual([
      { type: "lud-text", text: "ثثا", ludFont: "al-kanz" },
      { type: "lud-text", text: "ك طط", ludFont: "al-kanz" },
    ]);
  });

  it("reverts lud-text to text when its font-family is cleared", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("ككتاب", "al-kanz"));
    editor.update(
      () => {
        const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
        node.select(0, node.getTextContentSize());
        const selection = $getSelection();
        if ($isRangeSelection(selection)) $patchStyleText(selection, { "font-family": null });
      },
      { discrete: true },
    );
    expect(describeNodes(editor)).toEqual([{ type: "text", text: "ككتاب", ludFont: null }]);
  });

  it("re-fonts lud-text when another LuD family is applied", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("ككتاب", "al-kanz"));
    editor.update(
      () => {
        const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
        node.setStyle('font-family: "AL-FATEMI-Lisaan-ud-Dawat";');
      },
      { discrete: true },
    );
    expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "ككتاب", ludFont: "al-fatemi" }]);
  });

  it("keeps the caret offset when a node is replaced", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createTextNode("abcdef"));
    editor.update(
      () => {
        const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild()!;
        if ($isTextNode(node)) {
          node.select(4, 4);
          node.setStyle('font-family: "AL-KANZ";');
        }
      },
      { discrete: true },
    );
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) throw new Error("expected range selection");
      expect($isLudTextNode(selection.anchor.getNode())).toBe(true);
      expect(selection.anchor.offset).toBe(4);
    });
  });

  it("leaves a valid unregistered ludFont alone", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createLudTextNode("x", "kanz-al-lulu"));
    expect(describeNodes(editor)).toEqual([{ type: "lud-text", text: "x", ludFont: "kanz-al-lulu" }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/lud-sync.test.ts`
Expected: FAIL. The paste test gets `type: "text"` for the Al Kanz run, and the split test gets `type: "text"` for the second half.

- [ ] **Step 3: Implement**

`packages/richtext-editor/src/lud-sync.ts`:

```ts
import { $getSelection, $isRangeSelection, $createTextNode, TextNode, type LexicalEditor } from "lexical";
import { getStyleObjectFromCSS } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import { familyForLudFont, ludFontForFamily, sameFamily } from "./lud-fonts";
import { $createLudTextNode, LudTextNode } from "./nodes/lud-text-node";

function fontFamilyOf(node: TextNode): string {
  return getStyleObjectFromCSS(node.getStyle())["font-family"] ?? "";
}

/** node.replace() moves the caret to the end; keep the exact offsets instead. */
function $replaceKeepingSelection(from: TextNode, to: TextNode): void {
  const selection = $getSelection();
  const fromKey = from.getKey();
  const points =
    $isRangeSelection(selection)
      ? [selection.anchor, selection.focus]
          .filter((p) => p.key === fromKey && p.type === "text")
          .map((p) => ({ point: p, offset: p.offset }))
      : [];
  to.setFormat(from.getFormat()).setStyle(from.getStyle()).setDetail(from.getDetail());
  from.replace(to);
  for (const { point, offset } of points) point.set(to.getKey(), offset, "text");
}

export function registerLudSync(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerNodeTransform(TextNode, (node) => {
      if (node.getType() !== "text") return;
      const ludFont = ludFontForFamily(fontFamilyOf(node));
      if (ludFont === null) return;
      const lud = $createLudTextNode(node.getTextContent(), ludFont);
      $replaceKeepingSelection(node, lud);
    }),
    editor.registerNodeTransform(LudTextNode, (node) => {
      const family = fontFamilyOf(node);
      if (sameFamily(family, familyForLudFont(node.getLudFont()))) return;
      const ludFont = ludFontForFamily(family);
      if (ludFont !== null) {
        node.setLudFont(ludFont);
        return;
      }
      $replaceKeepingSelection(node, $createTextNode(node.getTextContent()));
    }),
  );
}
```

In `packages/richtext-editor/src/editor.ts`, add `import { registerLudSync } from "./lud-sync";` and put `registerLudSync(editor),` right after `registerTranslitDeletion(editor),` in the `mergeRegister(...)` list.

The pasted Google-Docs span reaches the text-node transform with `font-family` already in its style. That comes from the existing `$importTextStyles` wrapper in `editor.ts`, so no clipboard code changes. If the paste test shows the style missing, check that `IMPORTED_TEXT_STYLES` still contains `"font-family"`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/lud-sync.test.ts src/nodes/lud-text-node.test.ts`
Expected: PASS (7 + 6).

Run: `pnpm --filter @spezutil/richtext-editor test`
Expected: all pass. The existing toolbar font tests use Amiri/Arial, which map to no ludFont.

- [ ] **Step 5: Commit**

```bash
git add packages/richtext-editor/src/lud-sync.ts packages/richtext-editor/src/lud-sync.test.ts packages/richtext-editor/src/editor.ts
git commit -m "feat(richtext): keep lud-text in sync with font-family across paste and split"
```

---
### Task 4: Toolbar LuD font picker and opt-in toolbar groups

**Files:**
- Modify: `packages/richtext-editor/src/toolbar.ts` (groups, `lud` case, sync), `packages/richtext-editor/src/locale.ts` (new strings), `packages/richtext-editor/src/richtext-editor.ts` (`#toolbarGroups`), `packages/richtext-editor/src/index.ts` (exports)
- Test: `packages/richtext-editor/src/toolbar-lud.test.ts`

**Interfaces:**
- Consumes: `listLudFonts`, `ludFontForFamily` (Task 1); `registerLudSync` (Task 3, already wired).
- Produces:
  - `ALL_TOOLBAR_GROUPS` gains `"lud"` after `"font"`, and `"comment"`, `"diagram"` at the end.
  - `DEFAULT_TOOLBAR_GROUPS: readonly ToolbarGroup[]`: exactly the 0.4.0 list (`history, block, font, inline, color, list, indent, align, direction, insert`). The component uses it when the `toolbar` attribute is absent.
  - Locale keys (en/ar): `ludFont`, `ludFontNone`, `ludFontDraft`, `comment`, `diagram`.
  - Toolbar `select` inside `[data-group="lud"]`. Option values are `""` (none) plus `listLudFonts()` ids. `change` patches `font-family` to the option's family, or to `null` for none.
  - Tasks 8 and 11 add their buttons in the `comment` / `diagram` cases, so leave both as `break;` stubs here with the case labels present.

- [ ] **Step 1: Write the failing test**

`packages/richtext-editor/src/toolbar-lud.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot, $getSelection, $isRangeSelection, type ElementNode, type TextNode } from "lexical";
import "./index";
import { $isLudTextNode, type LudTextNode } from "./nodes/lud-text-node";
import type { SpezRichtext } from "./richtext-editor";

if (typeof Range !== "undefined" && !Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON() {} }) as DOMRect;
}

function create(toolbar?: string): SpezRichtext {
  const el = document.createElement("spez-richtext");
  if (toolbar) el.setAttribute("toolbar", toolbar);
  document.body.appendChild(el);
  return el;
}

function flush(el: SpezRichtext) {
  el.editor.update(() => {}, { discrete: true });
}

function ludSelect(el: SpezRichtext): HTMLSelectElement {
  const s = el.querySelector<HTMLSelectElement>('.spez-rte-toolbar [data-group="lud"] select');
  expect(s, "lud select").not.toBeNull();
  return s!;
}

function choose(el: SpezRichtext, value: string) {
  const s = ludSelect(el);
  s.value = value;
  s.dispatchEvent(new Event("change"));
  flush(el);
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("LuD font picker", () => {
  it("is opt-in: the default toolbar is unchanged", () => {
    const el = create();
    const groups = [...el.querySelectorAll(".spez-rte-group")].map((g) => g.getAttribute("data-group"));
    expect(groups).toEqual(["history", "block", "font", "inline", "color", "list", "indent", "align", "direction", "insert"]);
  });

  it("lists Al Kanz, Al-Fatemi, Kanz al-Marjaan and Unicode, marking drafts", () => {
    const el = create("lud");
    const options = [...ludSelect(el).options].map((o) => [o.value, o.textContent]);
    expect(options[0]).toEqual(["", "None"]);
    expect(options.map((o) => o[0])).toEqual(["", "al-kanz", "al-fatemi", "kanz-al-marjaan", "unicode"]);
    expect(options[2]![1]).toContain("(draft)");
  });

  it("wraps the selection in lud-text without changing the text", () => {
    const el = create("lud");
    el.setHTML("<p>نسس ككتاب</p>");
    el.editor.update(
      () => {
        const t = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as TextNode;
        t.select(0, t.getTextContentSize());
      },
      { discrete: true },
    );
    choose(el, "al-kanz");
    el.editor.getEditorState().read(() => {
      const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild()!;
      expect($isLudTextNode(node)).toBe(true);
      expect((node as LudTextNode).getLudFont()).toBe("al-kanz");
      expect(node.getTextContent()).toBe("نسس ككتاب");
    });
    expect(ludSelect(el).value).toBe("al-kanz");
  });

  it("typing after choosing a font at a collapsed caret continues in that font", () => {
    const el = create("lud");
    el.setHTML("<p>abc</p>");
    el.editor.update(() => ($getRoot().getFirstChild() as ElementNode).selectEnd(), { discrete: true });
    choose(el, "kanz-al-marjaan");
    el.editor.update(
      () => {
        const s = $getSelection();
        if ($isRangeSelection(s)) s.insertText("ثثا");
      },
      { discrete: true },
    );
    el.editor.getEditorState().read(() => {
      const nodes = ($getRoot().getFirstChild() as ElementNode).getChildren();
      expect(nodes.map((n) => [n.getType(), n.getTextContent()])).toEqual([
        ["text", "abc"],
        ["lud-text", "ثثا"],
      ]);
    });
  });

  it("choosing None turns lud-text back into plain text", () => {
    const el = create("lud");
    el.setHTML('<p><span data-lud-font="al-kanz">ككتاب</span></p>');
    el.editor.update(
      () => {
        const t = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as LudTextNode;
        t.select(0, t.getTextContentSize());
      },
      { discrete: true },
    );
    choose(el, "");
    el.editor.getEditorState().read(() => {
      const node = ($getRoot().getFirstChild() as ElementNode).getFirstChild()!;
      expect(node.getType()).toBe("text");
      expect(node.getTextContent()).toBe("ككتاب");
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/toolbar-lud.test.ts`
Expected: FAIL. The opt-in test passes already, and the others fail with `lud select: expected null not to be null`.

- [ ] **Step 3: Add locale strings**

In `packages/richtext-editor/src/locale.ts`, add to `interface LocaleStrings` after `translitLatinPlaceholder: string;`:

```ts
  ludFont: string;
  ludFontNone: string;
  ludFontDraft: string;
  comment: string;
  diagram: string;
```

Add to the `en` table: `ludFont: "LuD font", ludFontNone: "None", ludFontDraft: "(draft)", comment: "Comment", diagram: "Diagram",`
Add to the `ar` table: `ludFont: "خط لسان الدعوة", ludFontNone: "بلا", ludFontDraft: "(مسودة)", comment: "تعليق", diagram: "مخطط",`

- [ ] **Step 4: Opt-in groups**

In `packages/richtext-editor/src/toolbar.ts`, replace the `ALL_TOOLBAR_GROUPS` declaration with:

```ts
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

/** Groups shown when no `toolbar` attribute is set: the 0.4.0 toolbar. `lud`, `comment`, `diagram` are opt-in. */
export const DEFAULT_TOOLBAR_GROUPS: readonly ToolbarGroup[] = ALL_TOOLBAR_GROUPS.filter(
  (g) => g !== "lud" && g !== "comment" && g !== "diagram",
);
```

In `packages/richtext-editor/src/richtext-editor.ts` `#toolbarGroups()`, change `if (attr === null || attr.trim() === "") return ALL_TOOLBAR_GROUPS;` to `return DEFAULT_TOOLBAR_GROUPS;`, and import `DEFAULT_TOOLBAR_GROUPS` from `./toolbar`. The attribute filter still uses `ALL_TOOLBAR_GROUPS`, so `toolbar="lud,comment"` works. In `src/index.ts`, change the toolbar export line to `export { ALL_TOOLBAR_GROUPS, DEFAULT_TOOLBAR_GROUPS, DEFAULT_FONTS, DEFAULT_FONT_SIZES } from "./toolbar";`.

- [ ] **Step 5: The `lud` select and its state sync**

In `toolbar.ts`, add `import { listLudFonts, ludFontForFamily } from "./lud-fonts";` and add `ludSelect: HTMLSelectElement | null;` to `ToolbarRefs`. Initialise it with `ludSelect: null`. Add these cases to the `switch (name)` in `buildToolbar`, after the `font` case:

```ts
      case "lud": {
        const select = document.createElement("select");
        select.title = t.ludFont;
        select.setAttribute("aria-label", t.ludFont);
        const none = document.createElement("option");
        none.value = "";
        none.textContent = t.ludFontNone;
        select.append(none);
        const families = new Map<string, string>();
        for (const font of listLudFonts()) {
          const option = document.createElement("option");
          option.value = font.id;
          option.textContent = font.draft ? `${font.label} ${t.ludFontDraft}` : font.label;
          option.style.fontFamily = font.family;
          families.set(font.id, font.family);
          select.append(option);
        }
        select.addEventListener("change", () => {
          const family = families.get(select.value) ?? null;
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            // lud-sync.ts turns text carrying a LuD family into lud-text (and back).
            $patchStyleText(selection, { "font-family": family });
          });
          editor.focus();
        });
        refs.ludSelect = select;
        toolbar.append(group(name, select));
        break;
      }
      case "comment":
        break;
      case "diagram":
        break;
```

In `syncState`, after the `refs.fontSelect` block, add:

```ts
      if (refs.ludSelect) {
        const family = $getSelectionStyleValueForProperty(selection, "font-family", "");
        refs.ludSelect.value = ludFontForFamily(family) ?? "";
        if (refs.ludSelect.value !== (ludFontForFamily(family) ?? "")) refs.ludSelect.value = "";
      }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/toolbar-lud.test.ts`
Expected: PASS (5 tests).

Run: `pnpm --filter @spezutil/richtext-editor test`
Expected: all pass. `richtext-editor.test.ts` "filters toolbar groups" still gets `["history","inline"]`.

- [ ] **Step 7: Commit**

```bash
git add packages/richtext-editor/src/toolbar.ts packages/richtext-editor/src/locale.ts packages/richtext-editor/src/richtext-editor.ts packages/richtext-editor/src/index.ts packages/richtext-editor/src/toolbar-lud.test.ts
git commit -m "feat(richtext): opt-in LuD font picker in the toolbar"
```

---
### Task 5: Mark ids and `CommentMarkNode`

**Files:**
- Create: `packages/richtext-editor/src/comments/mark-id.ts`, `packages/richtext-editor/src/nodes/comment-mark-node.ts`
- Modify: `packages/richtext-editor/src/nodes/index.ts`, `packages/richtext-editor/src/editor.ts` (theme)
- Test: `packages/richtext-editor/src/comments/mark-id.test.ts`, `packages/richtext-editor/src/nodes/comment-mark-node.test.ts`

**Interfaces:**
- Consumes: `MarkNode`, `SerializedMarkNode` from `@lexical/mark`; test utils (Task 2).
- Produces:
  - `generateMarkId(now?: number, random?: (bytes: Uint8Array) => Uint8Array): string`: 26-char Crockford ULID
  - `isMarkId(id: string): boolean`: `/^[0-9A-HJKMNP-TV-Z]{26}$/`
  - `type SerializedCommentMarkNode = SerializedMarkNode` (type `"comment-mark"`)
  - `class CommentMarkNode extends MarkNode` (`getType() === "comment-mark"`). DOM is `<mark class="spez-rte-comment" data-thread-ids="a b">`. HTML export is `<span data-thread-ids="a b">`.
  - `$createCommentMarkNode(ids: readonly string[]): CommentMarkNode`, `$isCommentMarkNode(node): node is CommentMarkNode`

- [ ] **Step 1: Write the failing tests**

`packages/richtext-editor/src/comments/mark-id.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateMarkId, isMarkId } from "./mark-id";

describe("mark ids", () => {
  it("are 26-char Crockford ULIDs accepted by the backend rule", () => {
    const id = generateMarkId();
    expect(id).toHaveLength(26);
    expect(isMarkId(id)).toBe(true);
  });

  it("encode the timestamp first so ids sort by creation time", () => {
    const zero = () => new Uint8Array(10);
    expect(generateMarkId(0, zero)).toBe("00000000000000000000000000");
    expect(generateMarkId(1, zero).slice(0, 10)).toBe("0000000001");
    expect(generateMarkId(1_700_000_000_000, zero) < generateMarkId(1_700_000_000_001, zero)).toBe(true);
  });

  it("rejects non-ULIDs", () => {
    expect(isMarkId("not-a-ulid")).toBe(false);
    expect(isMarkId("0000000000000000000000000I")).toBe(false); // I is not Crockford
  });
});
```

`packages/richtext-editor/src/nodes/comment-mark-node.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { $createTextNode, $getRoot, type ElementNode } from "lexical";
import { exportHTML, importHTML } from "../html";
import { makeEditor, seedParagraph } from "../test-utils";
import { $createCommentMarkNode, $isCommentMarkNode, type CommentMarkNode } from "./comment-mark-node";

const A = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
const B = "01J9ZX3M4Q8R2S5T7V9W0XYZAC";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("CommentMarkNode", () => {
  it("serializes as comment-mark with ids and children", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createTextNode("Students must "), () =>
      $createCommentMarkNode([A]).append($createTextNode("attend daily")),
    );
    const para = editor.getEditorState().toJSON().root.children[0] as unknown as { children: any[] };
    expect(para.children[1]).toEqual({
      children: [expect.objectContaining({ type: "text", text: "attend daily" })],
      direction: null,
      format: "",
      indent: 0,
      type: "comment-mark",
      version: 1,
      ids: [A],
    });
  });

  it("loads the backend's minimal re-anchor mark (no format/indent/direction)", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createTextNode("attend daily"));
    const state = editor.getEditorState().toJSON() as any;
    const text = state.root.children[0].children[0];
    state.root.children[0].children = [{ type: "comment-mark", version: 1, ids: [A], children: [text] }];
    editor.setEditorState(editor.parseEditorState(JSON.stringify(state)));
    const again = editor.getEditorState().toJSON() as any;
    expect(again.root.children[0].children[0]).toMatchObject({ type: "comment-mark", ids: [A], format: "", indent: 0 });
  });

  it("renders a highlightable <mark> carrying the thread ids", () => {
    const { editor, root } = makeEditor();
    seedParagraph(editor, () => $createCommentMarkNode([A, B]).append($createTextNode("x")));
    const mark = root.querySelector("mark.spez-rte-comment")!;
    expect(mark.getAttribute("data-thread-ids")).toBe(`${A} ${B}`);
    editor.update(
      () => {
        const m = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as CommentMarkNode;
        m.deleteID(B);
      },
      { discrete: true },
    );
    expect(root.querySelector("mark.spez-rte-comment")!.getAttribute("data-thread-ids")).toBe(A);
  });

  it("exports <span data-thread-ids> and imports it back", () => {
    const { editor } = makeEditor();
    seedParagraph(editor, () => $createCommentMarkNode([A]).append($createTextNode("marked")));
    const html = exportHTML(editor);
    expect(html).toContain(`<span data-thread-ids="${A}">`);
    expect(html).not.toContain("<mark");
    importHTML(editor, html);
    editor.getEditorState().read(() => {
      const m = ($getRoot().getFirstChild() as ElementNode).getFirstChild();
      expect($isCommentMarkNode(m)).toBe(true);
      expect((m as CommentMarkNode).getIDs()).toEqual([A]);
      expect(m!.getTextContent()).toBe("marked");
    });
  });

  it("ignores span data-thread-ids values that are not ULIDs", () => {
    const { editor } = makeEditor();
    importHTML(editor, '<p><span data-thread-ids="bad ids">x</span></p>');
    editor.getEditorState().read(() => {
      expect($isCommentMarkNode(($getRoot().getFirstChild() as ElementNode).getFirstChild())).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/comments/mark-id.test.ts src/nodes/comment-mark-node.test.ts`
Expected: FAIL, `Failed to resolve import "./mark-id"` / `"./comment-mark-node"`.

- [ ] **Step 3: Implement mark ids**

`packages/richtext-editor/src/comments/mark-id.ts`:

```ts
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const MARK_ID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

const defaultRandom = (bytes: Uint8Array): Uint8Array => crypto.getRandomValues(bytes);

/** ULID: 48-bit ms timestamp (10 chars) + 80 random bits (16 chars), Crockford base32. */
export function generateMarkId(
  now: number = Date.now(),
  random: (bytes: Uint8Array) => Uint8Array = defaultRandom,
): string {
  let time = "";
  let t = Math.max(0, Math.floor(now));
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[t % 32]! + time;
    t = Math.floor(t / 32);
  }
  const bytes = random(new Uint8Array(10));
  let rand = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      rand += CROCKFORD[(buffer >> bits) & 31]!;
    }
    buffer &= (1 << bits) - 1;
  }
  return time + rand;
}

export function isMarkId(id: string): boolean {
  return MARK_ID.test(id);
}
```

- [ ] **Step 4: Implement the node**

`packages/richtext-editor/src/nodes/comment-mark-node.ts`:

```ts
import { MarkNode, type SerializedMarkNode } from "@lexical/mark";
import {
  $applyNodeReplacement,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type ElementNode,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type RangeSelection,
} from "lexical";
import { isMarkId } from "../comments/mark-id";

export type SerializedCommentMarkNode = SerializedMarkNode;

/**
 * Anchor of one or more handbook comment threads (ids = mark_id ULIDs, one per thread).
 * The component stores no threads; the host owns them. Copy/paste never carries marks
 * (MarkNode.excludeFromCopy), so a mark id cannot be duplicated by pasting.
 */
export class CommentMarkNode extends MarkNode {
  static getType(): string {
    return "comment-mark";
  }

  static clone(node: CommentMarkNode): CommentMarkNode {
    return new CommentMarkNode(node.__ids, node.__key);
  }

  constructor(ids: readonly string[] = [], key?: NodeKey) {
    super(ids, key);
  }

  static importJSON(serializedNode: SerializedCommentMarkNode): CommentMarkNode {
    return $createCommentMarkNode([]).updateFromJSON(serializedNode);
  }

  /** The backend's LexicalText.TryWrap writes only {type, version, ids, children}. */
  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedCommentMarkNode>): this {
    return super.updateFromJSON({
      format: "",
      indent: 0,
      direction: null,
      ...serializedNode,
      ids: (serializedNode.ids ?? []).filter((id) => typeof id === "string"),
    });
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.classList.add("spez-rte-comment");
    element.setAttribute("data-thread-ids", this.__ids.join(" "));
    return element;
  }

  updateDOM(prevNode: this, element: HTMLElement, config: EditorConfig): boolean {
    super.updateDOM(prevNode, element, config);
    element.setAttribute("data-thread-ids", this.__ids.join(" "));
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (node: HTMLElement) => {
        const ids = (node.getAttribute("data-thread-ids") ?? "").split(/\s+/).filter((s) => s !== "");
        if (ids.length === 0 || !ids.every(isMarkId)) return null;
        return { conversion: () => ({ node: $createCommentMarkNode(ids) }), priority: 1 as const };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-thread-ids", this.getIDs().join(" "));
    return { element };
  }

  insertNewAfter(_selection: RangeSelection, restoreSelection = true): null | ElementNode {
    const mark = $createCommentMarkNode(this.__ids);
    this.insertAfter(mark, restoreSelection);
    return mark;
  }
}

export function $createCommentMarkNode(ids: readonly string[]): CommentMarkNode {
  return $applyNodeReplacement(new CommentMarkNode(ids));
}

export function $isCommentMarkNode(node: LexicalNode | null | undefined): node is CommentMarkNode {
  return node instanceof CommentMarkNode;
}
```

- [ ] **Step 5: Register, theme, export**

`packages/richtext-editor/src/nodes/index.ts`: import `CommentMarkNode` and append it to `EDITOR_NODES`. Append:

```ts
export { CommentMarkNode, $createCommentMarkNode, $isCommentMarkNode } from "./comment-mark-node";
export type { SerializedCommentMarkNode } from "./comment-mark-node";
```

`packages/richtext-editor/src/editor.ts` `theme`: add `mark: "spez-rte-comment", markOverlap: "spez-rte-comment-overlap",`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/comments/mark-id.test.ts src/nodes/comment-mark-node.test.ts`
Expected: PASS (3 + 5).

Run: `pnpm --filter @spezutil/richtext-editor test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/richtext-editor/src/comments/mark-id.ts packages/richtext-editor/src/comments/mark-id.test.ts packages/richtext-editor/src/nodes/comment-mark-node.ts packages/richtext-editor/src/nodes/comment-mark-node.test.ts packages/richtext-editor/src/nodes/index.ts packages/richtext-editor/src/editor.ts
git commit -m "feat(richtext): CommentMarkNode with ULID thread ids"
```

---
### Task 6: Anchor text (`anchor.ts`), matching backend `LexicalText.Plain`

**Files:**
- Create: `packages/richtext-editor/src/comments/anchor.ts`
- Test: `packages/richtext-editor/src/comments/anchor.test.ts`

**Interfaces:**
- Consumes: `$isCommentMarkNode` (Task 5), `$createLudTextNode` (Task 2), `$createHijriDateNode` (existing).
- Produces:
  - `const ANCHOR_CONTEXT_CHARS = 32`, `const MAX_QUOTE_CHARS = 1000`
  - `interface CommentRequestDetail { markId: string; quotedText: string; prefix: string; suffix: string }`
  - `$buildAnchorIndex(): { plain: string; marks: Map<string, { start: number; end: number }> }`. Must run inside a read or update. `start` is the first occurrence of the id and `end` the last, across nested or split marks.
  - `$commentAnchor(markId: string): CommentRequestDetail | null`. Returns null when the id has no mark.
  - `isQuoteAcceptable(quotedText: string): boolean`. True when the trimmed length is between 1 and 1000.

- [ ] **Step 1: Write the failing test**

`packages/richtext-editor/src/comments/anchor.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { $createLineBreakNode, $createParagraphNode, $createTextNode, $getRoot } from "lexical";
import { $createHeadingNode } from "@lexical/rich-text";
import { $createCommentMarkNode } from "../nodes/comment-mark-node";
import { $createLudTextNode } from "../nodes/lud-text-node";
import { $createHijriDateNode } from "../nodes/hijri-date-node";
import { makeEditor } from "../test-utils";
import { $buildAnchorIndex, $commentAnchor, isQuoteAcceptable } from "./anchor";

const M = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";

beforeEach(() => {
  document.body.innerHTML = "";
});

function seed(build: () => void) {
  const { editor } = makeEditor();
  editor.update(() => {
    $getRoot().clear();
    build();
  }, { discrete: true });
  return editor;
}

describe("anchor index (mirrors backend LexicalText.Plain)", () => {
  it("joins blocks with newlines, like CommentReanchorerTests.Plain_text_joins_blocks_with_newlines", () => {
    const editor = seed(() => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode("Hello "), $createTextNode("world").toggleFormat("bold")),
        $createParagraphNode().append($createTextNode("Second")),
      );
    });
    expect(editor.read(() => $buildAnchorIndex().plain)).toBe("Hello world\nSecond\n");
  });

  it("counts lud-text and linebreaks, skips hijri-date tokens, ends headings with \\n", () => {
    const editor = seed(() => {
      $getRoot().append(
        $createHeadingNode("h2").append($createTextNode("Title")),
        $createParagraphNode().append(
          $createLudTextNode("نسس", "al-kanz"),
          $createLineBreakNode(),
          $createHijriDateNode({ year: 1447, month: 1, day: 1 }, "D MMMM YYYY"),
          $createTextNode("end"),
        ),
      );
    });
    expect(editor.read(() => $buildAnchorIndex().plain)).toBe("Title\nنسس\nend\n");
  });

  it("returns quote with exactly 32 chars of context each side", () => {
    const before = "a".repeat(40);
    const after = "b".repeat(40);
    const editor = seed(() => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode(before),
          $createCommentMarkNode([M]).append($createTextNode("QUOTE")),
          $createTextNode(after),
        ),
      );
    });
    expect(editor.read(() => $commentAnchor(M))).toEqual({
      markId: M,
      quotedText: "QUOTE",
      prefix: "a".repeat(32),
      suffix: "b".repeat(32),
    });
  });

  it("returns fewer context chars at page edges (suffix includes the block newline)", () => {
    const editor = seed(() => {
      $getRoot().append(
        $createParagraphNode().append($createCommentMarkNode([M]).append($createTextNode("Only"))),
      );
    });
    expect(editor.read(() => $commentAnchor(M))).toEqual({ markId: M, quotedText: "Only", prefix: "", suffix: "\n" });
  });

  it("spans every occurrence of an id split across blocks", () => {
    const editor = seed(() => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode("x "), $createCommentMarkNode([M]).append($createTextNode("one"))),
        $createParagraphNode().append($createCommentMarkNode([M]).append($createTextNode("two")), $createTextNode(" y")),
      );
    });
    expect(editor.read(() => $commentAnchor(M))!.quotedText).toBe("one\ntwo");
  });

  it("is null for an unknown id", () => {
    const editor = seed(() => $getRoot().append($createParagraphNode()));
    expect(editor.read(() => $commentAnchor(M))).toBeNull();
  });

  it("accepts 1..1000 trimmed chars", () => {
    expect(isQuoteAcceptable("  ")).toBe(false);
    expect(isQuoteAcceptable("x")).toBe(true);
    expect(isQuoteAcceptable("x".repeat(1000))).toBe(true);
    expect(isQuoteAcceptable("x".repeat(1001))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/comments/anchor.test.ts`
Expected: FAIL, `Failed to resolve import "./anchor"`.

- [ ] **Step 3: Implement**

`packages/richtext-editor/src/comments/anchor.ts`:

```ts
import { $getRoot, $isElementNode, type LexicalNode } from "lexical";
import { $isCommentMarkNode } from "../nodes/comment-mark-node";

export const ANCHOR_CONTEXT_CHARS = 32;
export const MAX_QUOTE_CHARS = 1000;

export interface CommentRequestDetail {
  markId: string;
  quotedText: string;
  prefix: string;
  suffix: string;
}

/** Keep in lockstep with LexicalText.Blocks in the handbook API (Services/Handbook/Comments/LexicalText.cs). */
const BLOCKS = new Set(["paragraph", "heading", "listitem", "quote", "tablecell"]);

export interface AnchorIndex {
  plain: string;
  marks: Map<string, { start: number; end: number }>;
}

export function $buildAnchorIndex(): AnchorIndex {
  const parts: string[] = [];
  let length = 0;
  const marks = new Map<string, { start: number; end: number }>();
  const push = (s: string) => {
    parts.push(s);
    length += s.length;
  };
  const walk = (node: LexicalNode): void => {
    if (!$isElementNode(node)) return;
    for (const child of node.getChildren()) {
      const type = child.getType();
      if (type === "text" || type === "lud-text") {
        push(child.getTextContent());
      } else if (type === "linebreak") {
        push("\n");
      } else {
        const start = length;
        walk(child);
        if ($isCommentMarkNode(child)) {
          for (const id of child.getIDs()) {
            const seen = marks.get(id);
            marks.set(id, { start: seen ? Math.min(seen.start, start) : start, end: length });
          }
        }
        if (BLOCKS.has(type)) push("\n");
      }
    }
  };
  walk($getRoot());
  return { plain: parts.join(""), marks };
}

export function $commentAnchor(markId: string): CommentRequestDetail | null {
  const { plain, marks } = $buildAnchorIndex();
  const range = marks.get(markId);
  if (range === undefined) return null;
  return {
    markId,
    quotedText: plain.slice(range.start, range.end),
    prefix: plain.slice(Math.max(0, range.start - ANCHOR_CONTEXT_CHARS), range.start),
    suffix: plain.slice(range.end, range.end + ANCHOR_CONTEXT_CHARS),
  };
}

export function isQuoteAcceptable(quotedText: string): boolean {
  const n = quotedText.trim().length;
  return n >= 1 && n <= MAX_QUOTE_CHARS;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/comments/anchor.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/richtext-editor/src/comments/anchor.ts packages/richtext-editor/src/comments/anchor.test.ts
git commit -m "feat(richtext): comment anchor text matching the handbook re-anchorer"
```

---
### Task 7: Comment commands and controller (`comments.ts`)

**Files:**
- Create: `packages/richtext-editor/src/comments/comments.ts`
- Modify: `packages/richtext-editor/src/styles.ts` (highlight CSS)
- Test: `packages/richtext-editor/src/comments/comments.test.ts`

**Interfaces:**
- Consumes: `$createCommentMarkNode`, `$isCommentMarkNode` (Task 5); `generateMarkId` (Task 5); `$commentAnchor`, `isQuoteAcceptable`, `CommentRequestDetail` (Task 6); `$wrapSelectionInMarkNode`, `$unwrapMarkNode` from `@lexical/mark`.
- Produces:
  - `ADD_COMMENT_MARK_COMMAND: LexicalCommand<{ markId?: string } | undefined>`
  - `REMOVE_COMMENT_MARK_COMMAND: LexicalCommand<string>`
  - `FOCUS_COMMENT_MARK_COMMAND: LexicalCommand<string>`
  - `interface CommentClickDetail { threadIds: string[] }`
  - `interface CommentHandlers { onRequested(detail: CommentRequestDetail): void; onClicked(detail: CommentClickDetail): void }`
  - `interface CommentsController { dispose(): void; setHighlight(ids: readonly string[] | null): void; setActive(id: string | null): void }`
  - `registerComments(editor: LexicalEditor, root: HTMLElement, handlers: CommentHandlers): CommentsController`
  - Highlight DOM contract: `mark.spez-rte-comment[data-visible]` when highlighted (`null` = all visible), plus `[data-active]` for the active id.

- [ ] **Step 1: Write the failing test**

`packages/richtext-editor/src/comments/comments.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { $createTextNode, $getRoot, type ElementNode, type TextNode } from "lexical";
import { $createLudTextNode, $isLudTextNode } from "../nodes/lud-text-node";
import { $isCommentMarkNode } from "../nodes/comment-mark-node";
import { flushSync, makeEditor, seedParagraph } from "../test-utils";
import {
  ADD_COMMENT_MARK_COMMAND,
  FOCUS_COMMENT_MARK_COMMAND,
  REMOVE_COMMENT_MARK_COMMAND,
  registerComments,
} from "./comments";

const A = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
const B = "01J9ZX3M4Q8R2S5T7V9W0XYZAC";

beforeEach(() => {
  document.body.innerHTML = "";
});

function setup() {
  const { editor, root } = makeEditor();
  const onRequested = vi.fn();
  const onClicked = vi.fn();
  const controller = registerComments(editor, root, { onRequested, onClicked });
  return { editor, root, onRequested, onClicked, controller };
}

function selectText(editor: ReturnType<typeof makeEditor>["editor"], index: number, from: number, to: number) {
  editor.update(
    () => {
      const node = ($getRoot().getFirstChild() as ElementNode).getChildren()[index] as TextNode;
      node.select(from, to);
    },
    { discrete: true },
  );
}

describe("comment commands", () => {
  it("wraps the selection and reports markId, quote and context", () => {
    const { editor, onRequested } = setup();
    seedParagraph(editor, () => $createTextNode("Students must attend daily."));
    selectText(editor, 0, 14, 26);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    expect(onRequested).toHaveBeenCalledWith({
      markId: A,
      quotedText: "attend daily",
      prefix: "Students must ",
      suffix: ".\n",
    });
    const para = editor.getEditorState().toJSON().root.children[0] as any;
    expect(para.children.map((c: any) => c.type)).toEqual(["text", "comment-mark", "text"]);
  });

  it("generates a ULID when no markId is given", () => {
    const { editor, onRequested } = setup();
    seedParagraph(editor, () => $createTextNode("abc"));
    selectText(editor, 0, 0, 3);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, undefined);
    flushSync(editor);
    expect(onRequested.mock.calls[0]![0].markId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("refuses collapsed, blank and over-long selections without leaving a mark", () => {
    const { editor, onRequested } = setup();
    seedParagraph(editor, () => $createTextNode("   " + "x".repeat(1001)));
    selectText(editor, 0, 1, 1);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    selectText(editor, 0, 0, 3);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    selectText(editor, 0, 0, 1004);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    expect(onRequested).not.toHaveBeenCalled();
    expect(JSON.stringify(editor.getEditorState().toJSON())).not.toContain("comment-mark");
  });

  it("marks half of a lud-text run and both halves stay lud-text", () => {
    const { editor, onRequested } = setup();
    seedParagraph(editor, () => $createLudTextNode("ثثاك طط", "al-kanz"));
    selectText(editor, 0, 0, 3);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    expect(onRequested.mock.calls[0]![0].quotedText).toBe("ثثا");
    editor.getEditorState().read(() => {
      const [mark, rest] = ($getRoot().getFirstChild() as ElementNode).getChildren();
      expect($isCommentMarkNode(mark)).toBe(true);
      expect($isLudTextNode((mark as ElementNode).getFirstChild())).toBe(true);
      expect($isLudTextNode(rest)).toBe(true);
    });
  });

  it("removes one id and unwraps marks left with none", () => {
    const { editor } = setup();
    seedParagraph(editor, () => $createTextNode("hello world"));
    selectText(editor, 0, 0, 11);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    editor.dispatchCommand(REMOVE_COMMENT_MARK_COMMAND, A);
    flushSync(editor);
    const json = JSON.stringify(editor.getEditorState().toJSON());
    expect(json).not.toContain("comment-mark");
    expect(editor.read(() => $getRoot().getTextContent())).toBe("hello world");
  });

  it("highlights only the given ids and flags the active one", () => {
    const { editor, root, controller } = setup();
    seedParagraph(editor, () => $createTextNode("one two"));
    selectText(editor, 0, 0, 3);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    selectText(editor, 1, 1, 4);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: B });
    flushSync(editor);
    const byId = (id: string) => root.querySelector<HTMLElement>(`mark[data-thread-ids~="${id}"]`)!;
    expect(byId(A).hasAttribute("data-visible")).toBe(true); // null = all
    controller.setHighlight([B]);
    expect(byId(A).hasAttribute("data-visible")).toBe(false);
    expect(byId(B).hasAttribute("data-visible")).toBe(true);
    editor.dispatchCommand(FOCUS_COMMENT_MARK_COMMAND, B);
    flushSync(editor);
    expect(byId(B).hasAttribute("data-active")).toBe(true);
  });

  it("reports the visible thread ids under a click, nested marks included", () => {
    const { editor, root, onClicked, controller } = setup();
    seedParagraph(editor, () => $createTextNode("hello world"));
    selectText(editor, 0, 0, 11);
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: A });
    flushSync(editor);
    editor.update(
      () => {
        const mark = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as ElementNode;
        (mark.getFirstChild() as TextNode).select(6, 11);
      },
      { discrete: true },
    );
    editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, { markId: B });
    flushSync(editor);
    root.querySelector<HTMLElement>(`mark[data-thread-ids="${B}"]`)!.click();
    expect(onClicked).toHaveBeenLastCalledWith({ threadIds: [B, A] });
    controller.setHighlight([A]);
    root.querySelector<HTMLElement>(`mark[data-thread-ids="${B}"]`)!.click();
    expect(onClicked).toHaveBeenLastCalledWith({ threadIds: [A] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/comments/comments.test.ts`
Expected: FAIL, `Failed to resolve import "./comments"`.

- [ ] **Step 3: Implement**

`packages/richtext-editor/src/comments/comments.ts`:

```ts
import { $unwrapMarkNode, $wrapSelectionInMarkNode } from "@lexical/mark";
import { $dfs, mergeRegister } from "@lexical/utils";
import {
  $createRangeSelectionFromDom,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalCommand,
  type LexicalEditor,
  type RangeSelection,
} from "lexical";
import { $createCommentMarkNode, $isCommentMarkNode } from "../nodes/comment-mark-node";
import { $commentAnchor, isQuoteAcceptable, type CommentRequestDetail } from "./anchor";
import { generateMarkId } from "./mark-id";

export const ADD_COMMENT_MARK_COMMAND: LexicalCommand<{ markId?: string } | undefined> =
  createCommand("ADD_COMMENT_MARK_COMMAND");
export const REMOVE_COMMENT_MARK_COMMAND: LexicalCommand<string> = createCommand("REMOVE_COMMENT_MARK_COMMAND");
export const FOCUS_COMMENT_MARK_COMMAND: LexicalCommand<string> = createCommand("FOCUS_COMMENT_MARK_COMMAND");

export interface CommentClickDetail {
  threadIds: string[];
}

export interface CommentHandlers {
  onRequested(detail: CommentRequestDetail): void;
  onClicked(detail: CommentClickDetail): void;
}

export interface CommentsController {
  dispose(): void;
  setHighlight(ids: readonly string[] | null): void;
  setActive(id: string | null): void;
}

function $removeMarkId(id: string): void {
  for (const { node } of $dfs()) {
    if (!$isCommentMarkNode(node) || !node.hasID(id)) continue;
    node.deleteID(id);
    if (node.getIDs().length === 0) $unwrapMarkNode(node);
  }
}

/** Read-only editors may hold no Lexical selection; fall back to the DOM selection. */
function $commentSelection(editor: LexicalEditor): RangeSelection | null {
  const selection = $getSelection();
  if ($isRangeSelection(selection) && !selection.isCollapsed()) return selection;
  const dom = editor._window?.getSelection() ?? (typeof window !== "undefined" ? window.getSelection() : null);
  if (dom === null || dom.rangeCount === 0 || dom.isCollapsed) return null;
  const fromDom = $createRangeSelectionFromDom(dom, editor);
  return fromDom !== null && !fromDom.isCollapsed() ? fromDom : null;
}

const idsOf = (el: Element): string[] =>
  (el.getAttribute("data-thread-ids") ?? "").split(/\s+/).filter((s) => s !== "");

export function registerComments(
  editor: LexicalEditor,
  root: HTMLElement,
  handlers: CommentHandlers,
): CommentsController {
  let highlight: Set<string> | null = null;
  let active: string | null = null;
  let pending: CommentRequestDetail | null = null;

  const isVisible = (id: string) => highlight === null || highlight.has(id);

  const apply = () => {
    for (const el of root.querySelectorAll<HTMLElement>("mark.spez-rte-comment")) {
      const ids = idsOf(el);
      el.toggleAttribute("data-visible", ids.some(isVisible));
      el.toggleAttribute("data-active", active !== null && ids.includes(active) && isVisible(active));
    }
  };

  const onClick = (event: MouseEvent) => {
    const ids: string[] = [];
    let el = (event.target as Element | null)?.closest?.("mark.spez-rte-comment") ?? null;
    while (el !== null && root.contains(el)) {
      for (const id of idsOf(el)) if (isVisible(id) && !ids.includes(id)) ids.push(id);
      el = el.parentElement?.closest("mark.spez-rte-comment") ?? null;
    }
    if (ids.length > 0) handlers.onClicked({ threadIds: ids });
  };
  root.addEventListener("click", onClick);

  const dispose = mergeRegister(
    editor.registerCommand(
      ADD_COMMENT_MARK_COMMAND,
      (payload) => {
        const selection = $commentSelection(editor);
        if (selection === null) return false;
        const markId = payload?.markId ?? generateMarkId();
        $wrapSelectionInMarkNode(selection, selection.isBackward(), markId, (ids) => $createCommentMarkNode(ids));
        const detail = $commentAnchor(markId);
        if (detail === null || !isQuoteAcceptable(detail.quotedText)) {
          $removeMarkId(markId);
          return true;
        }
        pending = detail;
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      REMOVE_COMMENT_MARK_COMMAND,
      (id) => {
        $removeMarkId(id);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      FOCUS_COMMENT_MARK_COMMAND,
      (id) => {
        active = id;
        apply();
        const el = root.querySelector<HTMLElement>(`mark.spez-rte-comment[data-thread-ids~="${CSS.escape(id)}"]`);
        el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerUpdateListener(() => {
      apply();
      if (pending !== null) {
        const detail = pending;
        pending = null;
        handlers.onRequested(detail);
      }
    }),
    () => root.removeEventListener("click", onClick),
  );

  return {
    dispose,
    setHighlight(ids) {
      highlight = ids === null ? null : new Set(ids);
      apply();
    },
    setActive(id) {
      active = id;
      apply();
    },
  };
}
```

If `CSS.escape` is undefined in jsdom, drop it. ULIDs contain only `[0-9A-Z]`, so they need no escaping, but keep a guard: `const sel = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;`. Also check that `editor._window` exists on `LexicalEditor` in 0.47 (`grep -n "_window" node_modules/lexical/dist/LexicalEditor.d.ts`). If it does not, use `window.getSelection()` only.

Append to the `styles` template in `packages/richtext-editor/src/styles.ts`, before the closing backtick:

```css
.spez-rte {
  --rte-comment-bg: rgba(255, 212, 0, 0.28);
  --rte-comment-active-bg: rgba(255, 170, 0, 0.55);
}
.spez-rte mark.spez-rte-comment {
  background: transparent;
  color: inherit;
}
.spez-rte mark.spez-rte-comment[data-visible] {
  background: var(--rte-comment-bg);
  border-bottom: 2px solid rgba(255, 170, 0, 0.8);
  cursor: pointer;
}
.spez-rte mark.spez-rte-comment[data-active] {
  background: var(--rte-comment-active-bg);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/comments/comments.test.ts`
Expected: PASS (7 tests). If the nested-click order comes back `[A, B]`, the walk is going outermost-first. Keep innermost-first (`[B, A]`) and fix the loop, because the host opens the innermost thread.

- [ ] **Step 5: Commit**

```bash
git add packages/richtext-editor/src/comments/comments.ts packages/richtext-editor/src/comments/comments.test.ts packages/richtext-editor/src/styles.ts
git commit -m "feat(richtext): add/remove/focus comment marks, click and highlight control"
```

---
### Task 8: `<spez-richtext>` comment API, toolbar button, read-only highlighting

**Files:**
- Modify: `packages/richtext-editor/src/richtext-editor.ts`, `packages/richtext-editor/src/toolbar.ts` (`comment` case), `packages/richtext-editor/src/index.ts`
- Test: `packages/richtext-editor/src/richtext-comments.test.ts`

**Interfaces:**
- Consumes: `registerComments`, commands, `CommentClickDetail` (Task 7); `CommentRequestDetail` (Task 6).
- Produces on `SpezRichtext`:
  - `highlightMarks: readonly string[] | null` (property; `null`, the default, highlights all)
  - `activeMark: string | null` (property)
  - `addCommentMark(markId?: string): CommentRequestDetail | null`. Wraps the current selection, falling back to the DOM selection. It fires `comment-requested` and returns the same detail, or `null` when refused. It works in `readonly` too: the host decides whether to save.
  - `removeCommentMark(markId: string): void`, `focusCommentMark(markId: string): void`
  - Events `comment-requested` (`CustomEvent<CommentRequestDetail>`) and `comment-clicked` (`CustomEvent<CommentClickDetail>`), both `bubbles` and `composed`.
  - Toolbar group `comment`: one button (`💬`, title `t.comment`) that dispatches `ADD_COMMENT_MARK_COMMAND`.
  - `index.ts` exports `ADD_COMMENT_MARK_COMMAND`, `REMOVE_COMMENT_MARK_COMMAND`, `FOCUS_COMMENT_MARK_COMMAND`, `generateMarkId`, `isMarkId`, and the types `CommentRequestDetail`, `CommentClickDetail`, plus the Task 5 node exports.

- [ ] **Step 1: Write the failing test**

`packages/richtext-editor/src/richtext-comments.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { $getRoot, type ElementNode, type TextNode } from "lexical";
import "./index";
import type { SpezRichtext } from "./richtext-editor";

const A = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
const B = "01J9ZX3M4Q8R2S5T7V9W0XYZAC";

function create(attrs: Record<string, string> = {}): SpezRichtext {
  const el = document.createElement("spez-richtext");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function select(el: SpezRichtext, from: number, to: number) {
  el.editor.update(
    () => (($getRoot().getFirstChild() as ElementNode).getFirstChild() as TextNode).select(from, to),
    { discrete: true },
  );
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("<spez-richtext> comments", () => {
  it("addCommentMark fires comment-requested and returns the same detail", () => {
    const el = create();
    el.setHTML("<p>Students must attend daily.</p>");
    select(el, 14, 26);
    const handler = vi.fn();
    el.addEventListener("comment-requested", handler);
    const detail = el.addCommentMark(A);
    expect(detail).toEqual({ markId: A, quotedText: "attend daily", prefix: "Students must ", suffix: ".\n" });
    expect(handler.mock.calls[0]![0].detail).toEqual(detail);
    expect(el.getJSON()).toContain('"type":"comment-mark"');
  });

  it("returns null and fires nothing for a collapsed selection", () => {
    const el = create();
    el.setHTML("<p>abc</p>");
    select(el, 1, 1);
    const handler = vi.fn();
    el.addEventListener("comment-requested", handler);
    expect(el.addCommentMark(A)).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it("the comment toolbar button is opt-in and adds a mark", () => {
    expect(create().querySelector('[data-group="comment"]')).toBeNull();
    const el = create({ toolbar: "comment" });
    el.setHTML("<p>abc</p>");
    select(el, 0, 3);
    const handler = vi.fn();
    el.addEventListener("comment-requested", handler);
    el.querySelector<HTMLButtonElement>('[data-group="comment"] button')!.click();
    el.editor.update(() => {}, { discrete: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("read-only: highlights only highlightMarks, emits comment-clicked, and still anchors from the DOM selection", () => {
    const el = create();
    el.setValue(
      JSON.stringify({
        root: {
          type: "root", version: 1, direction: null, format: "", indent: 0,
          children: [{
            type: "paragraph", version: 1, direction: null, format: "", indent: 0, textFormat: 0, textStyle: "",
            children: [
              { type: "comment-mark", version: 1, ids: [A], children: [{ type: "text", version: 1, text: "first", detail: 0, format: 0, mode: "normal", style: "" }] },
              { type: "text", version: 1, text: " middle ", detail: 0, format: 0, mode: "normal", style: "" },
              { type: "comment-mark", version: 1, ids: [B], children: [{ type: "text", version: 1, text: "second", detail: 0, format: 0, mode: "normal", style: "" }] },
            ],
          }],
        },
      }),
    );
    el.readonly = true;
    el.highlightMarks = [B];
    el.activeMark = B;
    const a = el.querySelector<HTMLElement>(`mark[data-thread-ids="${A}"]`)!;
    const b = el.querySelector<HTMLElement>(`mark[data-thread-ids="${B}"]`)!;
    expect(a.hasAttribute("data-visible")).toBe(false);
    expect(b.hasAttribute("data-visible")).toBe(true);
    expect(b.hasAttribute("data-active")).toBe(true);

    const clicked = vi.fn();
    el.addEventListener("comment-clicked", clicked);
    a.click();
    expect(clicked).not.toHaveBeenCalled(); // invisible thread
    b.click();
    expect(clicked.mock.calls[0]![0].detail).toEqual({ threadIds: [B] });

    // Reader selects " middle " in the DOM; Lexical holds no selection in read-only.
    const textNode = a.nextSibling!.firstChild ?? a.nextSibling!;
    const range = document.createRange();
    range.setStart(textNode, 1);
    range.setEnd(textNode, 7);
    const domSel = window.getSelection()!;
    domSel.removeAllRanges();
    domSel.addRange(range);
    el.editor.update(() => { /* drop any Lexical selection */ }, { discrete: true });
    const detail = el.addCommentMark();
    expect(detail?.quotedText).toBe("middle");
    expect(detail?.prefix).toBe("first ");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/richtext-comments.test.ts`
Expected: FAIL, `el.addCommentMark is not a function`.

- [ ] **Step 3: Implement in the component**

In `packages/richtext-editor/src/richtext-editor.ts`:

Imports:

```ts
import {
  ADD_COMMENT_MARK_COMMAND,
  FOCUS_COMMENT_MARK_COMMAND,
  REMOVE_COMMENT_MARK_COMMAND,
  registerComments,
  type CommentClickDetail,
  type CommentsController,
} from "./comments/comments";
import type { CommentRequestDetail } from "./comments/anchor";
```

Fields next to the other private fields:

```ts
  #comments: CommentsController | null = null;
  #highlightMarks: readonly string[] | null = null;
  #activeMark: string | null = null;
  #lastCommentRequest: CommentRequestDetail | null = null;
```

Properties and methods (put them after `setHTML`):

```ts
  /** Thread mark ids to highlight; null (default) highlights every mark. */
  get highlightMarks(): readonly string[] | null {
    return this.#highlightMarks;
  }

  set highlightMarks(ids: readonly string[] | null) {
    this.#highlightMarks = ids === null ? null : ids.filter((id) => typeof id === "string");
    this.#comments?.setHighlight(this.#highlightMarks);
  }

  get activeMark(): string | null {
    return this.#activeMark;
  }

  set activeMark(id: string | null) {
    this.#activeMark = id;
    this.#comments?.setActive(id);
  }

  /**
   * Wraps the current selection (or, in read-only mode, the DOM selection) in a comment mark.
   * Fires `comment-requested` and returns its detail; null when the selection is empty,
   * blank or longer than 1,000 characters.
   */
  addCommentMark(markId?: string): CommentRequestDetail | null {
    this.#lastCommentRequest = null;
    this.editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, markId === undefined ? undefined : { markId });
    this.editor.update(() => {}, { discrete: true });
    return this.#lastCommentRequest;
  }

  removeCommentMark(markId: string): void {
    this.editor.dispatchCommand(REMOVE_COMMENT_MARK_COMMAND, markId);
    this.editor.update(() => {}, { discrete: true });
  }

  focusCommentMark(markId: string): void {
    this.#activeMark = markId;
    this.editor.dispatchCommand(FOCUS_COMMENT_MARK_COMMAND, markId);
  }
```

In `connectedCallback`, right after `this.#disposeEditor = dispose;`:

```ts
    this.#comments = registerComments(editor, editable, {
      onRequested: (detail) => {
        this.#lastCommentRequest = detail;
        this.dispatchEvent(new CustomEvent<CommentRequestDetail>("comment-requested", { bubbles: true, composed: true, detail }));
      },
      onClicked: (detail) =>
        this.dispatchEvent(new CustomEvent<CommentClickDetail>("comment-clicked", { bubbles: true, composed: true, detail })),
    });
    this.#comments.setHighlight(this.#highlightMarks);
    this.#comments.setActive(this.#activeMark);
```

In `disconnectedCallback`, before `this.#disposeEditor?.();`, add `this.#comments?.dispose(); this.#comments = null;`.

- [ ] **Step 4: The toolbar button**

In `packages/richtext-editor/src/toolbar.ts`, import `ADD_COMMENT_MARK_COMMAND` from `./comments/comments` and replace the `case "comment": break;` stub with:

```ts
      case "comment":
        toolbar.append(
          group(
            name,
            button("💬", t.comment, () => editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, undefined), refs, "comment"),
          ),
        );
        break;
```

- [ ] **Step 5: Exports**

In `packages/richtext-editor/src/index.ts`:

```ts
export {
  ADD_COMMENT_MARK_COMMAND,
  REMOVE_COMMENT_MARK_COMMAND,
  FOCUS_COMMENT_MARK_COMMAND,
} from "./comments/comments";
export type { CommentClickDetail } from "./comments/comments";
export type { CommentRequestDetail } from "./comments/anchor";
export { generateMarkId, isMarkId } from "./comments/mark-id";
export { listLudFonts, UNICODE_LUD_FONT } from "./lud-fonts";
export type { LudFontOption } from "./lud-fonts";
```

Also add `LudTextNode, $createLudTextNode, $isLudTextNode, CommentMarkNode, $createCommentMarkNode, $isCommentMarkNode` to the existing `export { … } from "./nodes"` list, and `SerializedLudTextNode, SerializedCommentMarkNode` to the `export type { … } from "./nodes"` list.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/richtext-comments.test.ts`
Expected: PASS (4 tests). If the read-only DOM-selection case fails because `$createRangeSelectionFromDom` returns null, check that the Range's text node is the one Lexical rendered: `a.nextSibling` is the `<span>` for " middle ", and its `firstChild` is the DOM text. Fix the test's node lookup, not the fallback.

Run: `pnpm --filter @spezutil/richtext-editor test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/richtext-editor/src/richtext-editor.ts packages/richtext-editor/src/toolbar.ts packages/richtext-editor/src/index.ts packages/richtext-editor/src/richtext-comments.test.ts
git commit -m "feat(richtext): comment-mark API, events and read-only highlighting on <spez-richtext>"
```

---
### Task 9: SVG sanitizer and lazy Mermaid renderer

**Files:**
- Create: `packages/richtext-editor/src/diagram/svg-sanitize.ts`, `packages/richtext-editor/src/diagram/renderer.ts`
- Test: `packages/richtext-editor/src/diagram/svg-sanitize.test.ts`, `packages/richtext-editor/src/diagram/renderer.test.ts`

**Interfaces:**
- Consumes: `mermaid` (dynamic `import("mermaid")`).
- Produces:
  - `sanitizeSvg(svg: string): string`: cleaned `<svg…>` markup, or `""` when the input is empty, too large (> 2,000,000 chars), unparseable, has a DOCTYPE, or its root is not `svg`. It uses the same allow-list as `HandbookSvgSanitizer`.
  - `type DiagramRenderer = (source: string) => Promise<string>`
  - `MERMAID_CONFIG`: `{ startOnLoad: false, securityLevel: "strict", htmlLabels: false, flowchart: { htmlLabels: false } }`
  - `setDiagramRenderer(renderer: DiagramRenderer | null): void` (null restores Mermaid), `getDiagramRenderer(): DiagramRenderer`

- [ ] **Step 1: Write the failing tests**

`packages/richtext-editor/src/diagram/svg-sanitize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./svg-sanitize";

const NS = 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';

describe("sanitizeSvg (mirrors HandbookSvgSanitizer)", () => {
  it.each(["<script>alert(1)</script>", "<foreignObject><div>x</div></foreignObject>", '<iframe src="https://x"/>'])(
    "removes %s with its content",
    (inner) => {
      const clean = sanitizeSvg(`<svg ${NS}>${inner}<rect width="1"/></svg>`);
      expect(clean).not.toMatch(/script|foreignObject|iframe/);
      expect(clean).toContain("<rect");
    },
  );

  it("strips event attributes and external or javascript hrefs, keeps fragment refs", () => {
    const clean = sanitizeSvg(
      `<svg ${NS} onload="x()"><use xlink:href="https://evil/x.svg#a"/><use href="#marker"/><a href="javascript:x"><text>t</text></a></svg>`,
    );
    expect(clean).not.toMatch(/onload|evil|javascript/);
    expect(clean).toContain('href="#marker"');
  });

  it("strips @import and external url() but keeps class rules and url(#id)", () => {
    const clean = sanitizeSvg(
      `<svg ${NS}><style>@import url(https://x/a.css); .node rect { fill: #fff; } .e { background: url(https://x/p.png) }</style><rect style="fill:url(#g)"/></svg>`,
    );
    expect(clean).not.toContain("@import");
    expect(clean).not.toContain("https://x");
    expect(clean).toContain(".node rect");
    expect(clean).toContain("url(#g)");
  });

  it("rejects doctype, garbage and non-svg roots", () => {
    expect(sanitizeSvg('<!DOCTYPE svg [<!ENTITY x "y">]><svg/>')).toBe("");
    expect(sanitizeSvg("not svg")).toBe("");
    expect(sanitizeSvg("<html/>")).toBe("");
    expect(sanitizeSvg("")).toBe("");
  });
});
```

`packages/richtext-editor/src/diagram/renderer.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

const initialize = vi.fn();
const render = vi.fn(async (_id: string, source: string) => ({ svg: `<svg><text>${source}</text></svg>` }));
vi.mock("mermaid", () => ({ default: { initialize, render } }));

import { MERMAID_CONFIG, getDiagramRenderer, setDiagramRenderer } from "./renderer";

afterEach(() => setDiagramRenderer(null));

describe("diagram renderer", () => {
  it("lazily loads mermaid once, with htmlLabels off and strict security", async () => {
    const r = getDiagramRenderer();
    expect(initialize).not.toHaveBeenCalled();
    expect(await r("graph TD;A")).toBe("<svg><text>graph TD;A</text></svg>");
    await r("graph TD;B");
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize.mock.calls[0]![0]).toMatchObject({
      startOnLoad: false,
      securityLevel: "strict",
      htmlLabels: false,
      flowchart: { htmlLabels: false },
    });
    expect(MERMAID_CONFIG.htmlLabels).toBe(false);
    const ids = render.mock.calls.map((c) => c[0]);
    expect(new Set(ids).size).toBe(ids.length); // unique render ids
  });

  it("can be replaced by the host and restored", async () => {
    const fake = vi.fn(async () => "<svg/>");
    setDiagramRenderer(fake);
    expect(await getDiagramRenderer()("x")).toBe("<svg/>");
    setDiagramRenderer(null);
    expect(getDiagramRenderer()).not.toBe(fake);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/diagram`
Expected: FAIL, `Failed to resolve import "./svg-sanitize"` / `"./renderer"`.

- [ ] **Step 3: Implement the sanitizer**

`packages/richtext-editor/src/diagram/svg-sanitize.ts`:

```ts
const MAX_CHARS = 2_000_000;

/** Same list as HandbookSvgSanitizer.Elements (handbook API). */
const ELEMENTS = new Set([
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan",
  "defs", "marker", "style", "title", "desc", "clipPath", "linearGradient", "radialGradient", "stop",
  "pattern", "mask", "use", "symbol", "a",
]);

const UNSAFE_CSS = /@import[^;]*;?|expression\s*\(|url\(\s*['"]?(?!#)[^)]*\)/gi;

function clean(element: Element): void {
  for (const child of [...element.children]) {
    if (!ELEMENTS.has(child.localName)) {
      child.remove();
      continue;
    }
    clean(child);
  }
  for (const attr of [...element.attributes]) {
    const name = attr.localName;
    const value = attr.value;
    if (
      name.toLowerCase().startsWith("on") ||
      /javascript:/i.test(value) ||
      (name === "href" && !value.startsWith("#"))
    ) {
      element.removeAttributeNode(attr);
      continue;
    }
    if (name === "style") attr.value = value.replace(UNSAFE_CSS, "");
  }
  if (element.localName === "style") element.textContent = (element.textContent ?? "").replace(UNSAFE_CSS, "");
}

export function sanitizeSvg(svg: string): string {
  if (typeof svg !== "string" || svg.trim() === "" || svg.length > MAX_CHARS) return "";
  if (/<!DOCTYPE/i.test(svg)) return "";
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root === null || root.localName !== "svg" || doc.getElementsByTagName("parsererror").length > 0) return "";
  clean(root);
  return new XMLSerializer().serializeToString(root);
}
```

- [ ] **Step 4: Implement the renderer**

`packages/richtext-editor/src/diagram/renderer.ts`:

```ts
export type DiagramRenderer = (source: string) => Promise<string>;

/** htmlLabels off: the handbook server strips foreignObject, so HTML labels would vanish on publish. */
export const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: "strict",
  htmlLabels: false,
  flowchart: { htmlLabels: false },
} as const;

type Mermaid = {
  initialize(config: Record<string, unknown>): void;
  render(id: string, source: string): Promise<{ svg: string }>;
};

let mermaidPromise: Promise<Mermaid> | null = null;
let renderCount = 0;

function loadMermaid(): Promise<Mermaid> {
  mermaidPromise ??= import("mermaid").then((mod) => {
    const mermaid = (mod as unknown as { default: Mermaid }).default;
    mermaid.initialize({ ...MERMAID_CONFIG, flowchart: { ...MERMAID_CONFIG.flowchart } });
    return mermaid;
  });
  return mermaidPromise;
}

const mermaidRenderer: DiagramRenderer = async (source) => {
  const mermaid = await loadMermaid();
  const { svg } = await mermaid.render(`spez-rte-mermaid-${++renderCount}`, source);
  return svg;
};

let current: DiagramRenderer = mermaidRenderer;

export function setDiagramRenderer(renderer: DiagramRenderer | null): void {
  current = renderer ?? mermaidRenderer;
}

export function getDiagramRenderer(): DiagramRenderer {
  return current;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/diagram`
Expected: PASS (6 + 2). If jsdom serializes the `xlink:href` removal differently, the assertion is only that `evil` is absent. Keep it.

- [ ] **Step 6: Commit**

```bash
git add packages/richtext-editor/src/diagram/svg-sanitize.ts packages/richtext-editor/src/diagram/svg-sanitize.test.ts packages/richtext-editor/src/diagram/renderer.ts packages/richtext-editor/src/diagram/renderer.test.ts
git commit -m "feat(richtext): SVG sanitizer and lazy Mermaid renderer (htmlLabels off)"
```

---
### Task 10: `DiagramNode` and rendering on change (`diagrams.ts`)

**Files:**
- Create: `packages/richtext-editor/src/nodes/diagram-node.ts`, `packages/richtext-editor/src/diagram/diagrams.ts`
- Modify: `packages/richtext-editor/src/nodes/index.ts`, `packages/richtext-editor/src/styles.ts`
- Test: `packages/richtext-editor/src/nodes/diagram-node.test.ts`, `packages/richtext-editor/src/diagram/diagrams.test.ts`

**Interfaces:**
- Consumes: `sanitizeSvg`, `getDiagramRenderer`, `setDiagramRenderer` (Task 9); `makeEditor`, `flushSync` (Task 2).
- Produces:
  - `type SerializedDiagramNode = Spread<{ source: string; svg: string; drawioKey: string | null }, SerializedLexicalNode>`
  - `class DiagramNode extends DecoratorNode<HTMLElement>` (`getType() === "diagram"`, block), with getters `getSource()`, `getSvg()`, `getDrawioKey()`, `getRenderError()`. Setters: `setSource(s)` (clears svg and error when changed), `setSvg(svg)` (stores `sanitizeSvg(svg)`), `setDrawioKey(k)`, `setRenderError(msg)`. The error is transient: cloned but never serialized.
  - `$createDiagramNode(source: string, svg?: string, drawioKey?: string | null): DiagramNode`, `$isDiagramNode(node)`
  - `const DEFAULT_DIAGRAM_SOURCE = "flowchart TD\n  A[Start] --> B[End]"`
  - `INSERT_DIAGRAM_COMMAND: LexicalCommand<{ source?: string; drawioKey?: string | null } | undefined>`
  - `interface DiagramEditDetail { nodeKey: string; source: string; drawioKey: string | null }`
  - `registerDiagrams(editor: LexicalEditor, root: HTMLElement, handlers: { onEditRequested(detail: DiagramEditDetail): void }): () => void`
  - `$insertDiagram(source: string, drawioKey?: string | null): string`: the new node key. It inserts at the selection, or appends to root when there is none.

- [ ] **Step 1: Write the failing node test**

`packages/richtext-editor/src/nodes/diagram-node.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot } from "lexical";
import { exportHTML, importHTML } from "../html";
import { makeEditor } from "../test-utils";
import { $createDiagramNode, $isDiagramNode, type DiagramNode } from "./diagram-node";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><text>A</text></svg>';

beforeEach(() => {
  document.body.innerHTML = "";
});

function seed(node: () => DiagramNode) {
  const made = makeEditor();
  made.editor.update(() => $getRoot().clear().append(node()), { discrete: true });
  return made;
}

describe("DiagramNode", () => {
  it("serializes to the diagram contract", () => {
    const { editor } = seed(() => $createDiagramNode("graph TD;A", SVG, "uploads/handbook/x.drawio"));
    expect(editor.getEditorState().toJSON().root.children[0]).toEqual({
      type: "diagram",
      version: 1,
      source: "graph TD;A",
      svg: SVG,
      drawioKey: "uploads/handbook/x.drawio",
    });
  });

  it("never stores unsanitized SVG", () => {
    const { editor } = seed(() =>
      $createDiagramNode("x", '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><script>a()</script><rect/></svg>'),
    );
    const svg = (editor.getEditorState().toJSON().root.children[0] as any).svg as string;
    expect(svg).not.toMatch(/onload|script/);
    expect(svg).toContain("<rect");
  });

  it("setSource clears a stale svg and error; the error is not serialized", () => {
    const { editor } = seed(() => $createDiagramNode("a", SVG));
    editor.update(() => {
      const node = $getRoot().getFirstChild() as DiagramNode;
      node.setRenderError("boom");
      node.setSource("b");
    }, { discrete: true });
    const json = editor.getEditorState().toJSON().root.children[0] as any;
    expect(json).toEqual({ type: "diagram", version: 1, source: "b", svg: "", drawioKey: null });
    expect(JSON.stringify(json)).not.toContain("boom");
  });

  it("decorates with the sanitized svg, or the error text", () => {
    const { editor, root } = seed(() => $createDiagramNode("a", SVG));
    expect(root.querySelector(".spez-rte-diagram svg")).not.toBeNull();
    editor.update(() => ($getRoot().getFirstChild() as DiagramNode).setSource("broken").setRenderError("Parse error"), {
      discrete: true,
    });
    expect(root.querySelector(".spez-rte-diagram-error")!.textContent).toContain("Parse error");
  });

  it("exports figure > pre[data-diagram=mermaid] + svg and imports it back", () => {
    const { editor } = seed(() => $createDiagramNode("graph TD;A-->B", SVG, "k"));
    const html = exportHTML(editor);
    expect(html).toContain('data-spez-type="diagram"');
    expect(html).toContain('<pre data-diagram="mermaid">graph TD;A--&gt;B</pre>');
    importHTML(editor, html);
    editor.getEditorState().read(() => {
      const node = $getRoot().getFirstChild();
      expect($isDiagramNode(node)).toBe(true);
      expect((node as DiagramNode).getSource()).toBe("graph TD;A-->B");
      expect((node as DiagramNode).getSvg()).toContain("<text>A</text>");
      expect((node as DiagramNode).getDrawioKey()).toBe("k");
    });
  });

  it("imports a bare <pre data-diagram=mermaid> with no svg", () => {
    const { editor } = makeEditor();
    importHTML(editor, '<pre data-diagram="mermaid">graph LR;X</pre>');
    editor.getEditorState().read(() => {
      const node = $getRoot().getFirstChild() as DiagramNode;
      expect($isDiagramNode(node)).toBe(true);
      expect(node.getSource()).toBe("graph LR;X");
      expect(node.getSvg()).toBe("");
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/nodes/diagram-node.test.ts`
Expected: FAIL, `Failed to resolve import "./diagram-node"`.

- [ ] **Step 3: Implement the node**

`packages/richtext-editor/src/nodes/diagram-node.ts`:

```ts
import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { sanitizeSvg } from "../diagram/svg-sanitize";

export type SerializedDiagramNode = Spread<
  { source: string; svg: string; drawioKey: string | null },
  SerializedLexicalNode
>;

/** Block Mermaid diagram. `svg` is what the editor rendered from `source`; the handbook API publishes it (sanitized). */
export class DiagramNode extends DecoratorNode<HTMLElement> {
  __source: string;
  __svg: string;
  __drawioKey: string | null;
  /** Transient: last render failure; never serialized. */
  __renderError: string;

  static getType(): string {
    return "diagram";
  }

  static clone(node: DiagramNode): DiagramNode {
    const clone = new DiagramNode(node.__source, node.__svg, node.__drawioKey, node.__key);
    clone.__renderError = node.__renderError;
    return clone;
  }

  constructor(source: string, svg = "", drawioKey: string | null = null, key?: NodeKey) {
    super(key);
    this.__source = source;
    this.__svg = svg;
    this.__drawioKey = drawioKey;
    this.__renderError = "";
  }

  getSource(): string {
    return this.getLatest().__source;
  }
  getSvg(): string {
    return this.getLatest().__svg;
  }
  getDrawioKey(): string | null {
    return this.getLatest().__drawioKey;
  }
  getRenderError(): string {
    return this.getLatest().__renderError;
  }

  setSource(source: string): this {
    const self = this.getWritable();
    if (self.__source !== source) {
      self.__source = source;
      self.__svg = "";
      self.__renderError = "";
    }
    return self;
  }
  setSvg(svg: string): this {
    const self = this.getWritable();
    self.__svg = sanitizeSvg(svg);
    self.__renderError = "";
    return self;
  }
  setDrawioKey(drawioKey: string | null): this {
    const self = this.getWritable();
    self.__drawioKey = drawioKey;
    return self;
  }
  setRenderError(message: string): this {
    const self = this.getWritable();
    self.__renderError = message;
    return self;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "spez-rte-diagram";
    dom.setAttribute("data-spez-type", "diagram");
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  decorate(): HTMLElement {
    const figure = document.createElement("figure");
    figure.className = "spez-rte-diagram-figure";
    if (this.__svg !== "") {
      figure.innerHTML = this.__svg; // already sanitized by setSvg/importers
    } else if (this.__renderError !== "") {
      const error = document.createElement("div");
      error.className = "spez-rte-diagram-error";
      error.textContent = this.__renderError;
      const pre = document.createElement("pre");
      pre.textContent = this.__source;
      figure.append(error, pre);
    } else {
      const pending = document.createElement("div");
      pending.className = "spez-rte-diagram-pending";
      pending.textContent = "…";
      figure.append(pending);
    }
    return figure;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      figure: (node: HTMLElement) =>
        node.getAttribute("data-spez-type") === "diagram"
          ? { conversion: $convertDiagramFigure, priority: 2 as const }
          : null,
      pre: (node: HTMLElement) =>
        node.getAttribute("data-diagram") === "mermaid" &&
        node.parentElement?.getAttribute("data-spez-type") !== "diagram"
          ? { conversion: $convertMermaidPre, priority: 2 as const }
          : null,
    };
  }

  exportDOM(): DOMExportOutput {
    const figure = document.createElement("figure");
    figure.setAttribute("data-spez-type", "diagram");
    const key = this.getDrawioKey();
    if (key !== null) figure.setAttribute("data-drawio-key", key);
    const pre = document.createElement("pre");
    pre.setAttribute("data-diagram", "mermaid");
    pre.textContent = this.getSource();
    figure.append(pre);
    if (this.getSvg() !== "") figure.insertAdjacentHTML("beforeend", this.getSvg());
    return { element: figure };
  }

  static importJSON(serializedNode: SerializedDiagramNode): DiagramNode {
    return $createDiagramNode(serializedNode.source ?? "", serializedNode.svg ?? "", serializedNode.drawioKey ?? null)
      .updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedDiagramNode>): this {
    return super.updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedDiagramNode {
    return {
      ...super.exportJSON(),
      source: this.getSource(),
      svg: this.getSvg(),
      drawioKey: this.getDrawioKey(),
    };
  }
}

function $convertDiagramFigure(element: HTMLElement): DOMConversionOutput {
  const source = element.querySelector('pre[data-diagram="mermaid"]')?.textContent ?? "";
  const svg = element.querySelector("svg");
  return {
    node: $createDiagramNode(source, svg ? svg.outerHTML : "", element.getAttribute("data-drawio-key")),
  };
}

function $convertMermaidPre(element: HTMLElement): DOMConversionOutput {
  return { node: $createDiagramNode(element.textContent ?? "") };
}

export function $createDiagramNode(source: string, svg = "", drawioKey: string | null = null): DiagramNode {
  return $applyNodeReplacement(new DiagramNode(source, sanitizeSvg(svg), drawioKey));
}

export function $isDiagramNode(node: LexicalNode | null | undefined): node is DiagramNode {
  return node instanceof DiagramNode;
}
```

When the figure conversion returns a node, the `<pre>` inside it must not produce a second node. The `pre` matcher already skips a `<pre>` whose parent is the diagram figure. If Lexical still visits the children, return `{ node, after: () => [] }` from `$convertDiagramFigure` so the children are dropped.

Register: in `nodes/index.ts`, import `DiagramNode`, append it to `EDITOR_NODES`, and append:

```ts
export { DiagramNode, $createDiagramNode, $isDiagramNode } from "./diagram-node";
export type { SerializedDiagramNode } from "./diagram-node";
```

Styles, appended to `styles.ts`:

```css
.spez-rte .spez-rte-diagram { margin: 0.75em 0; }
.spez-rte .spez-rte-diagram-figure { margin: 0; overflow-x: auto; text-align: center; }
.spez-rte .spez-rte-diagram-figure svg { max-width: 100%; height: auto; }
.spez-rte .spez-rte-diagram-error { color: #c62828; font-size: 0.875em; }
.spez-rte .spez-rte-diagram-pending { color: var(--rte-muted); }
```

- [ ] **Step 4: Run the node tests**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/nodes/diagram-node.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing render/insert test**

`packages/richtext-editor/src/diagram/diagrams.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { $getNodeByKey, $getRoot } from "lexical";
import { $isDiagramNode, type DiagramNode } from "../nodes/diagram-node";
import { flushSync, makeEditor } from "../test-utils";
import { setDiagramRenderer } from "./renderer";
import { $insertDiagram, INSERT_DIAGRAM_COMMAND, registerDiagrams } from "./diagrams";

const svgFor = (s: string) => `<svg xmlns="http://www.w3.org/2000/svg"><text>${s}</text></svg>`;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => setDiagramRenderer(null));

function setup() {
  const made = makeEditor();
  const onEditRequested = vi.fn();
  const dispose = registerDiagrams(made.editor, made.root, { onEditRequested });
  return { ...made, onEditRequested, dispose };
}

const svgOf = (editor: ReturnType<typeof makeEditor>["editor"]) =>
  editor.read(() => ($getRoot().getChildren().find($isDiagramNode) as DiagramNode | undefined)?.getSvg());

describe("registerDiagrams", () => {
  it("renders a new diagram and stores the svg in the node", async () => {
    setDiagramRenderer(async (s) => svgFor(s));
    const { editor } = setup();
    editor.dispatchCommand(INSERT_DIAGRAM_COMMAND, { source: "graph TD;A" });
    flushSync(editor);
    await vi.waitFor(() => expect(svgOf(editor)).toContain("<text>graph TD;A</text>"));
  });

  it("does not re-render a loaded diagram that already has svg", async () => {
    const renderer = vi.fn(async (s: string) => svgFor(s));
    setDiagramRenderer(renderer);
    const { editor } = setup();
    editor.update(() => { $getRoot().clear(); $insertDiagram("x"); }, { discrete: true });
    await vi.waitFor(() => expect(svgOf(editor)).toContain("<text>x</text>"));
    const json = JSON.stringify(editor.getEditorState().toJSON());
    renderer.mockClear();
    editor.setEditorState(editor.parseEditorState(json));
    flushSync(editor);
    await new Promise((r) => setTimeout(r, 10));
    expect(renderer).not.toHaveBeenCalled();
  });

  it("records a render failure without svg", async () => {
    setDiagramRenderer(async () => {
      throw new Error("Parse error on line 1");
    });
    const { editor } = setup();
    editor.update(() => { $getRoot().clear(); $insertDiagram("graph ???"); }, { discrete: true });
    await vi.waitFor(() =>
      expect(editor.read(() => ($getRoot().getFirstChild() as DiagramNode).getRenderError())).toContain("Parse error"),
    );
    expect(svgOf(editor)).toBe("");
  });

  it("ignores a stale render when the source changed meanwhile", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    setDiagramRenderer(async (s) => {
      if (s === "old") await gate;
      return svgFor(s);
    });
    const { editor } = setup();
    let key = "";
    editor.update(() => { $getRoot().clear(); key = $insertDiagram("old"); }, { discrete: true });
    editor.update(() => ($getNodeByKey(key) as DiagramNode).setSource("new"), { discrete: true });
    await vi.waitFor(() => expect(svgOf(editor)).toContain("<text>new</text>"));
    release();
    await new Promise((r) => setTimeout(r, 10));
    expect(svgOf(editor)).toContain("<text>new</text>");
  });

  it("double-click asks the host to edit, only when editable", () => {
    setDiagramRenderer(async (s) => svgFor(s));
    const { editor, root, onEditRequested } = setup();
    let key = "";
    editor.update(() => { $getRoot().clear(); key = $insertDiagram("graph TD;A", "k.drawio"); }, { discrete: true });
    const dom = root.querySelector<HTMLElement>(".spez-rte-diagram")!;
    dom.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(onEditRequested).toHaveBeenCalledWith({ nodeKey: key, source: "graph TD;A", drawioKey: "k.drawio" });
    editor.setEditable(false);
    dom.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(onEditRequested).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/diagram/diagrams.test.ts`
Expected: FAIL, `Failed to resolve import "./diagrams"`.

- [ ] **Step 7: Implement**

`packages/richtext-editor/src/diagram/diagrams.ts`:

```ts
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  HISTORY_MERGE_TAG,
  createCommand,
  type LexicalCommand,
  type LexicalEditor,
  type NodeKey,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import { $createDiagramNode, $isDiagramNode, DiagramNode } from "../nodes/diagram-node";
import { getDiagramRenderer } from "./renderer";

export const DEFAULT_DIAGRAM_SOURCE = "flowchart TD\n  A[Start] --> B[End]";

export const INSERT_DIAGRAM_COMMAND: LexicalCommand<{ source?: string; drawioKey?: string | null } | undefined> =
  createCommand("INSERT_DIAGRAM_COMMAND");

export interface DiagramEditDetail {
  nodeKey: string;
  source: string;
  drawioKey: string | null;
}

/** Inserts at the selection (or appends to the root); returns the node key. */
export function $insertDiagram(source: string, drawioKey: string | null = null): NodeKey {
  const node = $createDiagramNode(source, "", drawioKey);
  if ($isRangeSelection($getSelection())) $insertNodes([node]);
  else $getRoot().append(node);
  return node.getKey();
}

export function registerDiagrams(
  editor: LexicalEditor,
  root: HTMLElement,
  handlers: { onEditRequested(detail: DiagramEditDetail): void },
): () => void {
  const inFlight = new Set<string>();

  const render = (key: NodeKey, source: string) => {
    const token = `${key}\u0000${source}`;
    if (inFlight.has(token)) return;
    inFlight.add(token);
    getDiagramRenderer()(source).then(
      (svg) => apply(key, source, (node) => node.setSvg(svg)),
      (error: unknown) =>
        apply(key, source, (node) => node.setRenderError(error instanceof Error ? error.message : String(error))),
    ).finally(() => inFlight.delete(token));
  };

  const apply = (key: NodeKey, source: string, change: (node: DiagramNode) => void) => {
    editor.update(
      () => {
        const node = $getNodeByKey(key);
        // Stale guard: the source was edited (or the node removed) while rendering.
        if ($isDiagramNode(node) && node.getSource() === source) change(node);
      },
      { tag: HISTORY_MERGE_TAG },
    );
  };

  const onDblClick = (event: MouseEvent) => {
    if (!editor.isEditable()) return;
    const target = event.target as Node | null;
    if (target === null) return;
    const detail = editor.read(() => {
      const node = $getNearestNodeFromDOMNode(target);
      return $isDiagramNode(node)
        ? { nodeKey: node.getKey(), source: node.getSource(), drawioKey: node.getDrawioKey() }
        : null;
    });
    if (detail !== null) handlers.onEditRequested(detail);
  };
  root.addEventListener("dblclick", onDblClick);

  return mergeRegister(
    editor.registerCommand(
      INSERT_DIAGRAM_COMMAND,
      (payload) => {
        $insertDiagram(payload?.source ?? DEFAULT_DIAGRAM_SOURCE, payload?.drawioKey ?? null);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerMutationListener(DiagramNode, (mutations) => {
      editor.getEditorState().read(() => {
        for (const [key, mutation] of mutations) {
          if (mutation === "destroyed") continue;
          const node = $getNodeByKey(key);
          if (!$isDiagramNode(node)) continue;
          if (node.getSvg() === "" && node.getRenderError() === "" && node.getSource().trim() !== "") {
            render(key, node.getSource());
          }
        }
      });
    }),
    () => root.removeEventListener("dblclick", onDblClick),
  );
}
```

In `packages/richtext-editor/src/editor.ts`, **do not** register `registerDiagrams`, because it needs host handlers. The component registers it in Task 11. The node itself is already in `EDITOR_NODES`.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/nodes/diagram-node.test.ts src/diagram`
Expected: PASS. The double-click test relies on `$getNearestNodeFromDOMNode` resolving the decorator container. If it returns `null` for the inner `<figure>`, walk up with `target.parentElement?.closest(".spez-rte-diagram")` first and pass that element.

- [ ] **Step 9: Commit**

```bash
git add packages/richtext-editor/src/nodes/diagram-node.ts packages/richtext-editor/src/nodes/diagram-node.test.ts packages/richtext-editor/src/nodes/index.ts packages/richtext-editor/src/diagram/diagrams.ts packages/richtext-editor/src/diagram/diagrams.test.ts packages/richtext-editor/src/styles.ts
git commit -m "feat(richtext): Mermaid DiagramNode with stored svg and stale-render guard"
```

---
### Task 11: `<spez-richtext>` diagram API and toolbar button

**Files:**
- Modify: `packages/richtext-editor/src/richtext-editor.ts`, `packages/richtext-editor/src/toolbar.ts` (`diagram` case), `packages/richtext-editor/src/index.ts`
- Test: `packages/richtext-editor/src/richtext-diagrams.test.ts`

**Interfaces:**
- Consumes: `registerDiagrams`, `$insertDiagram`, `INSERT_DIAGRAM_COMMAND`, `DEFAULT_DIAGRAM_SOURCE`, `DiagramEditDetail` (Task 10); `setDiagramRenderer`, `DiagramRenderer` (Task 9).
- Produces on `SpezRichtext`:
  - `insertDiagram(source?: string, drawioKey?: string | null): string`. Returns the node key.
  - `updateDiagram(nodeKey: string, patch: { source?: string; drawioKey?: string | null }): boolean`. Returns false when the key is not a diagram.
  - Event `diagram-edit-requested` (`CustomEvent<DiagramEditDetail>`), fired on double-click when editable and after the toolbar inserts a diagram.
  - Toolbar group `diagram`: a `◇` button, title `t.diagram`, that inserts `DEFAULT_DIAGRAM_SOURCE`.
  - `index.ts` exports `DiagramNode`, `$createDiagramNode`, `$isDiagramNode`, `SerializedDiagramNode`, `INSERT_DIAGRAM_COMMAND`, `DEFAULT_DIAGRAM_SOURCE`, `setDiagramRenderer`, `MERMAID_CONFIG`, `sanitizeSvg`, and the types `DiagramRenderer`, `DiagramEditDetail`.

- [ ] **Step 1: Write the failing test**

`packages/richtext-editor/src/richtext-diagrams.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./index";
import { setDiagramRenderer } from "./index";
import type { SpezRichtext } from "./richtext-editor";

function create(attrs: Record<string, string> = {}): SpezRichtext {
  const el = document.createElement("spez-richtext");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
  setDiagramRenderer(async (s) => `<svg xmlns="http://www.w3.org/2000/svg"><text>${s}</text></svg>`);
});
afterEach(() => setDiagramRenderer(null));

describe("<spez-richtext> diagrams", () => {
  it("insertDiagram renders and persists source + svg in the JSON", async () => {
    const el = create();
    el.insertDiagram("graph TD;A");
    await vi.waitFor(() => expect(el.getJSON()).toContain("<text>graph TD;A</text>"));
    const diagram = JSON.parse(el.getJSON()).root.children.find((c: any) => c.type === "diagram");
    expect(diagram).toMatchObject({ type: "diagram", source: "graph TD;A", drawioKey: null });
  });

  it("updateDiagram changes source and re-renders; unknown key is false", async () => {
    const el = create();
    const key = el.insertDiagram("a");
    await vi.waitFor(() => expect(el.getJSON()).toContain("<text>a</text>"));
    expect(el.updateDiagram(key, { source: "b", drawioKey: "x.drawio" })).toBe(true);
    await vi.waitFor(() => expect(el.getJSON()).toContain("<text>b</text>"));
    expect(el.getJSON()).toContain('"drawioKey":"x.drawio"');
    expect(el.updateDiagram("nope", { source: "c" })).toBe(false);
  });

  it("toolbar button is opt-in, inserts the default diagram and asks the host to edit it", () => {
    expect(create().querySelector('[data-group="diagram"]')).toBeNull();
    const el = create({ toolbar: "diagram" });
    const handler = vi.fn();
    el.addEventListener("diagram-edit-requested", handler);
    el.querySelector<HTMLButtonElement>('[data-group="diagram"] button')!.click();
    el.editor.update(() => {}, { discrete: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].detail.source).toContain("flowchart TD");
  });

  it("double-click in read-only does not request an edit", async () => {
    const el = create();
    el.insertDiagram("a");
    el.readonly = true;
    const handler = vi.fn();
    el.addEventListener("diagram-edit-requested", handler);
    el.querySelector(".spez-rte-diagram")!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/richtext-diagrams.test.ts`
Expected: FAIL, `setDiagramRenderer is not exported` / `el.insertDiagram is not a function`.

- [ ] **Step 3: Implement**

`richtext-editor.ts` imports:

```ts
import { $getNodeByKey } from "lexical";
import { $insertDiagram, registerDiagrams, type DiagramEditDetail } from "./diagram/diagrams";
import { $isDiagramNode } from "./nodes/diagram-node";
```

(Merge `$getNodeByKey` into the existing `lexical` import line.)

Add a field `#disposeDiagrams: (() => void) | null = null;`. In `connectedCallback`, after the `registerComments` block:

```ts
    this.#disposeDiagrams = registerDiagrams(editor, editable, {
      onEditRequested: (detail) => this.#emitDiagramEdit(detail),
    });
```

In `disconnectedCallback`, next to the comments disposal: `this.#disposeDiagrams?.(); this.#disposeDiagrams = null;`.

Methods:

```ts
  insertDiagram(source?: string, drawioKey: string | null = null): string {
    let key = "";
    this.editor.update(
      () => {
        key = $insertDiagram(source ?? DEFAULT_DIAGRAM_SOURCE, drawioKey);
      },
      { discrete: true },
    );
    return key;
  }

  updateDiagram(nodeKey: string, patch: { source?: string; drawioKey?: string | null }): boolean {
    let found = false;
    this.editor.update(
      () => {
        const node = $getNodeByKey(nodeKey);
        if (!$isDiagramNode(node)) return;
        found = true;
        if (patch.source !== undefined) node.setSource(patch.source);
        if (patch.drawioKey !== undefined) node.setDrawioKey(patch.drawioKey);
      },
      { discrete: true },
    );
    return found;
  }

  #emitDiagramEdit(detail: DiagramEditDetail): void {
    this.dispatchEvent(new CustomEvent<DiagramEditDetail>("diagram-edit-requested", { bubbles: true, composed: true, detail }));
  }
```

Import `DEFAULT_DIAGRAM_SOURCE` from `./diagram/diagrams` as well.

The toolbar has no host reference for events, so pass one through. Add an optional last parameter to `buildToolbar`, `onDiagramInserted?: (detail: DiagramEditDetail) => void`, and give `#buildToolbar()` in the component `(detail) => this.#emitDiagramEdit(detail)` as that argument. Replace the `case "diagram": break;` stub with:

```ts
      case "diagram":
        toolbar.append(
          group(
            name,
            button("◇", t.diagram, () => {
              let detail: DiagramEditDetail | null = null;
              editor.update(
                () => {
                  const nodeKey = $insertDiagram(DEFAULT_DIAGRAM_SOURCE);
                  detail = { nodeKey, source: DEFAULT_DIAGRAM_SOURCE, drawioKey: null };
                },
                { discrete: true },
              );
              if (detail !== null) onDiagramInserted?.(detail);
            }, refs, "diagram"),
          ),
        );
        break;
```

with `import { $insertDiagram, DEFAULT_DIAGRAM_SOURCE, type DiagramEditDetail } from "./diagram/diagrams";` in `toolbar.ts`.

`index.ts` additions:

```ts
export { INSERT_DIAGRAM_COMMAND, DEFAULT_DIAGRAM_SOURCE } from "./diagram/diagrams";
export type { DiagramEditDetail } from "./diagram/diagrams";
export { setDiagramRenderer, MERMAID_CONFIG } from "./diagram/renderer";
export type { DiagramRenderer } from "./diagram/renderer";
export { sanitizeSvg } from "./diagram/svg-sanitize";
```

Also add `DiagramNode, $createDiagramNode, $isDiagramNode` to the `./nodes` export list and `SerializedDiagramNode` to the `./nodes` type exports.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/richtext-diagrams.test.ts`
Expected: PASS (4 tests).

Run: `pnpm --filter @spezutil/richtext-editor test && pnpm --filter @spezutil/richtext-editor lint`
Expected: all tests pass and `tsc --noEmit` is clean.

- [ ] **Step 5: Commit**

```bash
git add packages/richtext-editor/src/richtext-editor.ts packages/richtext-editor/src/toolbar.ts packages/richtext-editor/src/index.ts packages/richtext-editor/src/richtext-diagrams.test.ts
git commit -m "feat(richtext): insertDiagram/updateDiagram and diagram-edit-requested"
```

---
### Task 12: Handbook contract fixture (shared with the API)

**Files:**
- Create: `packages/richtext-editor/src/handbook-contract.test.ts`, `packages/richtext-editor/contract/handbook-nodes.json` (written by the test on the first run, then committed)
- Modify: `packages/richtext-editor/package.json` (`files` adds `"contract"`, so the fixture ships and the API can copy it from `node_modules`)

**Interfaces:**
- Consumes: the nodes from Tasks 2, 5 and 10.
- Produces: `contract/handbook-nodes.json`, a full Lexical document holding one `lud-text` (bold, `al-kanz`), one `comment-mark` wrapping a `text` and a `lud-text`, and one `diagram`. Each is pinned field-for-field below.

- [ ] **Step 1: Write the test**

`packages/richtext-editor/src/handbook-contract.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";
import { $createCommentMarkNode } from "./nodes/comment-mark-node";
import { $createDiagramNode } from "./nodes/diagram-node";
import { $createLudTextNode } from "./nodes/lud-text-node";
import { makeEditor } from "./test-utils";

const MARK = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><text>A</text></svg>';

/**
 * Node JSON consumed by the handbook API (HandbookHtmlRenderer, LexicalText, KB ToUnicode).
 * Changing any expectation here is a breaking change for mahadalzahrawebapi: update
 * contract/handbook-nodes.json there too.
 */
describe("handbook node contract", () => {
  it("pins lud-text, comment-mark and diagram exactly", async () => {
    const { editor } = makeEditor();
    editor.update(
      () => {
        $getRoot().clear().append(
          $createParagraphNode().append(
            $createLudTextNode("نسس", "al-kanz").toggleFormat("bold"),
            $createCommentMarkNode([MARK]).append($createTextNode("attend "), $createLudTextNode("ثثا", "al-kanz")),
          ),
          $createDiagramNode("graph TD;A", SVG, null),
        );
      },
      { discrete: true },
    );
    const state = editor.getEditorState().toJSON();
    const [para, diagram] = state.root.children as any[];
    const [lud, mark] = para.children;

    expect(lud).toEqual({
      detail: 0, format: 1, mode: "normal",
      style: 'font-family: "AL-KANZ", "Noto Naskh Arabic";',
      text: "نسس", type: "lud-text", version: 1, ludFont: "al-kanz",
    });
    expect(mark).toMatchObject({ type: "comment-mark", version: 1, ids: [MARK], format: "", indent: 0 });
    expect(mark.children.map((c: any) => c.type)).toEqual(["text", "lud-text"]);
    expect(diagram).toEqual({ type: "diagram", version: 1, source: "graph TD;A", svg: SVG, drawioKey: null });

    await expect(JSON.stringify(state, null, 2) + "\n").toMatchFileSnapshot("../contract/handbook-nodes.json");
  });
});
```

- [ ] **Step 2: Run it (first run writes the fixture)**

Run: `pnpm --filter @spezutil/richtext-editor exec vitest run src/handbook-contract.test.ts`
Expected: PASS. `packages/richtext-editor/contract/handbook-nodes.json` is created. Open it and confirm it holds the three node objects above.

Run it again with `-- --ci` (or `CI=1`): `CI=1 pnpm --filter @spezutil/richtext-editor exec vitest run src/handbook-contract.test.ts`
Expected: PASS, and the snapshot matches unchanged.

- [ ] **Step 3: Ship the fixture**

In `packages/richtext-editor/package.json`, set `"files": ["dist", "contract"]`.

- [ ] **Step 4: Commit**

```bash
git add packages/richtext-editor/src/handbook-contract.test.ts packages/richtext-editor/contract/handbook-nodes.json packages/richtext-editor/package.json
git commit -m "test(richtext): pin the handbook node JSON contract as a shared fixture"
```

---

### Task 13: React wrapper events

**Files:**
- Modify: `packages/richtext-editor-react/src/index.ts`
- Test: `packages/richtext-editor-react/src/index.test.tsx`

**Interfaces:**
- Consumes: `CommentRequestDetail`, `CommentClickDetail`, `DiagramEditDetail`, `LudFontOption`, `DEFAULT_TOOLBAR_GROUPS` (Tasks 4, 8, 11).
- Produces: `SpezRichtext` React component with the new events `onCommentRequested`, `onCommentClicked` and `onDiagramEditRequested`. `highlightMarks` and `activeMark` pass through as element properties, because `@lit/react` sets any known element property. Type re-exports of the above.

- [ ] **Step 1: Write the failing test**

Append to `packages/richtext-editor-react/src/index.test.tsx` inside the `describe`:

```tsx
  it("forwards highlightMarks and fires onCommentClicked", () => {
    const A = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
    const onCommentClicked = vi.fn();
    const { container } = render(
      React.createElement(SpezRichtext, {
        highlightMarks: [A],
        initialHtml: `<p><span data-thread-ids="${A}">marked</span></p>`,
        onCommentClicked,
      }),
    );
    const el = container.querySelector("spez-richtext")!;
    expect(el.highlightMarks).toEqual([A]);
    const mark = el.querySelector<HTMLElement>("mark.spez-rte-comment")!;
    expect(mark.hasAttribute("data-visible")).toBe(true);
    mark.click();
    expect((onCommentClicked.mock.calls[0]![0] as CustomEvent).detail).toEqual({ threadIds: [A] });
  });

  it("fires onCommentRequested from addCommentMark", () => {
    const onCommentRequested = vi.fn();
    const { container } = render(React.createElement(SpezRichtext, { initialHtml: "<p>abc</p>", onCommentRequested }));
    const el = container.querySelector("spez-richtext")!;
    // Select "abc" through the DOM, as a reader would; addCommentMark falls back to it.
    const range = document.createRange();
    const text = el.querySelector(".spez-rte-editor p span")!.firstChild!;
    range.setStart(text, 0);
    range.setEnd(text, 3);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    el.addCommentMark();
    expect(onCommentRequested).toHaveBeenCalledTimes(1);
  });

- [ ] **Step 2: Run to verify failure**

Run: `pnpm turbo run build --filter=@spezutil/richtext-editor && pnpm --filter @spezutil/richtext-editor-react test`
Expected: the new tests FAIL because `onCommentClicked` is never called. The existing three still pass. The React wrapper resolves the editor through its `dist`, so rebuild the editor first.

- [ ] **Step 3: Implement**

Replace `packages/richtext-editor-react/src/index.ts` with:

```ts
import * as React from "react";
import { createComponent, type EventName } from "@lit/react";
import {
  SpezRichtext as SpezRichtextElement,
  type ChangeDetail,
  type CommentClickDetail,
  type CommentRequestDetail,
  type DiagramEditDetail,
} from "@spezutil/richtext-editor";

export const SpezRichtext = createComponent({
  tagName: "spez-richtext",
  elementClass: SpezRichtextElement,
  react: React,
  events: {
    onChange: "change" as EventName<CustomEvent<ChangeDetail>>,
    onReady: "rte-ready" as EventName<CustomEvent<void>>,
    onCommentRequested: "comment-requested" as EventName<CustomEvent<CommentRequestDetail>>,
    onCommentClicked: "comment-clicked" as EventName<CustomEvent<CommentClickDetail>>,
    onDiagramEditRequested: "diagram-edit-requested" as EventName<CustomEvent<DiagramEditDetail>>,
  },
});

export { DEFAULT_FONTS, DEFAULT_TOOLBAR_GROUPS, listLudFonts, setDiagramRenderer } from "@spezutil/richtext-editor";
export type {
  ChangeDetail,
  CommentClickDetail,
  CommentRequestDetail,
  DiagramEditDetail,
  DiagramRenderer,
  EditorLocale,
  FontOption,
  LudFontOption,
  ToolbarGroup,
} from "@spezutil/richtext-editor";
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @spezutil/richtext-editor-react test && pnpm --filter @spezutil/richtext-editor-react lint`
Expected: PASS (5 tests), and tsc is clean.

- [ ] **Step 5: Commit**

```bash
git add packages/richtext-editor-react/src/index.ts packages/richtext-editor-react/src/index.test.tsx
git commit -m "feat(richtext-react): comment and diagram events"
```

---

### Task 14: Angular wrapper inputs, outputs and methods

**Files:**
- Modify: `packages/richtext-editor-angular/src/richtext-editor.component.ts`, `packages/richtext-editor-angular/src/public-api.ts`

**Interfaces:**
- Consumes: the element API from Tasks 8 and 11.
- Produces on `SpezRichtextComponent`:
  - `@Input() highlightMarks: string[] | null`, `@Input() activeMark: string | null`, `@Input() fontSizes: FontSizeOption[] | null`
  - `@Output() commentRequested: EventEmitter<CommentRequestDetail>`, `@Output() commentClicked: EventEmitter<CommentClickDetail>`, `@Output() diagramEditRequested: EventEmitter<DiagramEditDetail>`
  - Methods delegating to the element: `addCommentMark(markId?)`, `removeCommentMark(id)`, `focusCommentMark(id)`, `insertDiagram(source?, drawioKey?)`, `updateDiagram(key, patch)`, `getJSON()`, plus a `get element(): SpezRichtext` getter.

The package's verification gate is its ng-packagr build (`test` is an echo), so the build is this task's test.

- [ ] **Step 1: Implement**

Replace `packages/richtext-editor-angular/src/richtext-editor.component.ts` with:

```ts
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import "@spezutil/richtext-editor";
import type {
  ChangeDetail,
  CommentClickDetail,
  CommentRequestDetail,
  DiagramEditDetail,
  FontOption,
  FontSizeOption,
  SpezRichtext,
} from "@spezutil/richtext-editor";

@Component({
  selector: "spez-richtext-ng",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <spez-richtext
      #el
      [value]="value"
      [initialHtml]="initialHtml"
      [attr.readonly]="readonly ? '' : null"
      [attr.placeholder]="placeholder"
      [attr.dir]="dir"
      [attr.locale]="locale"
      [attr.toolbar]="toolbar"
      [fonts]="fonts"
      [fontSizes]="fontSizes"
      [highlightMarks]="highlightMarks"
      [activeMark]="activeMark"
      (change)="onChange($event)"
      (rte-ready)="onReady($event)"
      (comment-requested)="commentRequested.emit($any($event).detail)"
      (comment-clicked)="commentClicked.emit($any($event).detail)"
      (diagram-edit-requested)="diagramEditRequested.emit($any($event).detail)"
    ></spez-richtext>
  `,
})
export class SpezRichtextComponent {
  /** Serialized Lexical editor state JSON. */
  @Input() value: string | null = null;
  /** HTML applied on first init when no value is set. */
  @Input() initialHtml: string | null = null;
  @Input() readonly = false;
  @Input() placeholder: string | null = null;
  @Input() dir: string | null = null;
  @Input() locale: string | null = null;
  /** Comma-separated groups; add `lud`, `comment`, `diagram` to opt in. */
  @Input() toolbar: string | null = null;
  /** Toolbar font list; replaces the defaults (spread DEFAULT_FONTS to extend). */
  @Input() fonts: FontOption[] | null = null;
  @Input() fontSizes: FontSizeOption[] | null = null;
  /** Thread mark ids to highlight; null highlights all. */
  @Input() highlightMarks: string[] | null = null;
  @Input() activeMark: string | null = null;

  @Output() change = new EventEmitter<ChangeDetail>();
  @Output() ready = new EventEmitter<void>();
  @Output() commentRequested = new EventEmitter<CommentRequestDetail>();
  @Output() commentClicked = new EventEmitter<CommentClickDetail>();
  @Output() diagramEditRequested = new EventEmitter<DiagramEditDetail>();

  @ViewChild("el", { static: true }) private elRef!: ElementRef<SpezRichtext>;

  get element(): SpezRichtext {
    return this.elRef.nativeElement;
  }

  addCommentMark(markId?: string): CommentRequestDetail | null {
    return this.element.addCommentMark(markId);
  }
  removeCommentMark(markId: string): void {
    this.element.removeCommentMark(markId);
  }
  focusCommentMark(markId: string): void {
    this.element.focusCommentMark(markId);
  }
  insertDiagram(source?: string, drawioKey: string | null = null): string {
    return this.element.insertDiagram(source, drawioKey);
  }
  updateDiagram(nodeKey: string, patch: { source?: string; drawioKey?: string | null }): boolean {
    return this.element.updateDiagram(nodeKey, patch);
  }
  getJSON(): string {
    return this.element.getJSON();
  }

  onChange(event: Event): void {
    this.change.emit((event as CustomEvent<ChangeDetail>).detail);
  }

  onReady(_event: Event): void {
    this.ready.emit();
  }
}
```

Replace `packages/richtext-editor-angular/src/public-api.ts` with:

```ts
export { SpezRichtextComponent } from "./richtext-editor.component";
export { DEFAULT_FONTS, DEFAULT_TOOLBAR_GROUPS, listLudFonts, setDiagramRenderer } from "@spezutil/richtext-editor";
export type {
  ChangeDetail,
  CommentClickDetail,
  CommentRequestDetail,
  DiagramEditDetail,
  DiagramRenderer,
  EditorLocale,
  FontOption,
  FontSizeOption,
  LudFontOption,
  ToolbarGroup,
} from "@spezutil/richtext-editor";
```

`FontSizeOption` is already exported from `@spezutil/richtext-editor`'s `index.ts` (`export type { FontOption, FontSizeOption, ToolbarGroup } from "./toolbar"`). Leave that line as it is.

- [ ] **Step 2: Build and lint (the verification gate)**

Run: `pnpm turbo run build --filter=@spezutil/richtext-editor-angular && pnpm --filter @spezutil/richtext-editor-angular lint`
Expected: ng-packagr prints `Built @spezutil/richtext-editor-angular`, and tsc is clean. `$any($event)` is required in the template because `$event` is typed `Event`.

- [ ] **Step 3: Commit**

```bash
git add packages/richtext-editor-angular/src/richtext-editor.component.ts packages/richtext-editor-angular/src/public-api.ts
git commit -m "feat(richtext-angular): highlightMarks/activeMark inputs, comment and diagram outputs"
```

---
### Task 15: Docs, Storybook stories, changeset, full verification

**Files:**
- Modify: `apps/docs/docs/richtext/api.md`, `apps/storybook/stories/richtext-editor.stories.ts`, `apps/storybook/package.json` (no dependency change is needed: storybook already depends on `@spezutil/richtext-editor`)
- Create: `.changeset/richtext-lud-comments-diagrams.md`
- Modify: `CLAUDE.md` (the `richtext-editor` bullet)

**Interfaces:**
- Consumes: everything above. Produces nothing new in code.

- [ ] **Step 1: API docs**

In `apps/docs/docs/richtext/api.md`:

Add these rows to the **Attributes** table. Replace the `toolbar` row's description with: `Groups: history, block, font, inline, color, list, indent, align, direction, insert (default set), plus opt-in lud, comment, diagram.`

Add to **Properties**:

```md
| `highlightMarks` | `string[] \| null` | Comment mark ids to highlight; `null` (default) highlights every mark. Marks not listed stay in the document but are not highlighted or clickable. |
| `activeMark` | `string \| null` | Mark id drawn as the active thread. |
```

Add to **Methods**:

```md
| `addCommentMark(markId?)` | Wraps the selection (or, read-only, the DOM selection) in a comment mark. Fires `comment-requested`; returns `{ markId, quotedText, prefix, suffix }` or `null` (empty, blank or > 1,000 chars). A ULID is generated when `markId` is omitted. |
| `removeCommentMark(markId)` | Removes that id from every mark; unwraps marks left without ids. |
| `focusCommentMark(markId)` | Makes it the active mark and scrolls it into view. |
| `insertDiagram(source?, drawioKey?)` | Inserts a Mermaid diagram; returns its node key. Rendered to SVG (stored in the JSON). |
| `updateDiagram(nodeKey, { source?, drawioKey? })` | Changes a diagram; a new source re-renders. |
```

Add to **Events**:

```md
| `comment-requested` | `{ markId, quotedText, prefix, suffix }` | After a mark is added. `prefix`/`suffix` are the ≤ 32 characters around the quote in the handbook plain-text form (blocks end with `\n`). |
| `comment-clicked` | `{ threadIds: string[] }` | Click on a highlighted mark; innermost first. Works in read-only. |
| `diagram-edit-requested` | `{ nodeKey, source, drawioKey }` | Double-click on a diagram (editable only), or right after the toolbar inserts one. The host shows its own source editor and calls `updateDiagram`. |
```

Append a section:

````md
## Lisan ud-Dawat fonts

The opt-in `lud` toolbar group lists every `@spezutil/lud-codec` profile (drafts included; display
does not depend on confirmation) plus **Unicode**. Text in a LuD font is stored **exactly as typed**
(never converted) as a `lud-text` node:

```json
{ "type": "lud-text", "ludFont": "al-kanz", "text": "نسس", "format": 0, "style": "font-family: \"AL-KANZ\", \"Noto Naskh Arabic\";", "detail": 0, "mode": "normal", "version": 1 }
```

HTML: `<span data-lud-font="al-kanz">نسس</span>`. Pasting from Google Docs keeps the typed characters
and maps the span's `font-family` to the profile. This package ships **no font files** — declare
`@font-face` for `AL-KANZ`, `AL-FATEMI-Lisaan-ud-Dawat`, `kanz-al-marjaan` and `Noto Naskh Arabic` in the host.

## Comment marks

`comment-mark` element nodes carry `ids` (26-char ULIDs, one per thread). The component stores no
threads. Every surface that parses this JSON with Lexical must register `CommentMarkNode`,
`LudTextNode` and `DiagramNode`; importing `@spezutil/richtext-editor` does that via `EDITOR_NODES`.

## Diagrams

`diagram` decorator nodes store Mermaid `source`, the rendered `svg` and an optional `drawioKey`.
Mermaid is loaded on first use with `htmlLabels: false` and `securityLevel: "strict"`. Swap the
renderer with `setDiagramRenderer(fn)`. A diagram whose `svg` is empty (render failed) cannot be
published by the handbook API.
````

- [ ] **Step 2: Storybook stories**

Append to `apps/storybook/stories/richtext-editor.stories.ts`:

```ts
const A = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
const B = "01J9ZX3M4Q8R2S5T7V9W0XYZAC";

export const LudFonts = () => {
  const el = document.createElement("spez-richtext");
  el.setAttribute("toolbar", "history,block,font,lud,inline");
  el.initialHtml = [
    '<p><span data-lud-font="al-kanz">نسس ثثاك }</span> — Al Kanz, typed text kept as-is</p>',
    '<p><span data-lud-font="al-fatemi">ككتاب</span> — Al-Fatemi (draft profile)</p>',
    '<p><span data-lud-font="unicode">حاضرین</span> — Unicode fallback</p>',
  ].join("");
  return html`${el}`;
};

export const CommentReview = () => {
  const el = document.createElement("spez-richtext");
  el.setAttribute("toolbar", "history,inline,comment");
  el.initialHtml = `<p>Students must <span data-thread-ids="${A}">attend daily</span> and <span data-thread-ids="${B}">revise weekly</span>.</p>`;
  const log = document.createElement("pre");
  el.addEventListener("comment-requested", (e) => (log.textContent = JSON.stringify((e as CustomEvent).detail, null, 2)));
  el.addEventListener("comment-clicked", (e) => {
    const [id] = (e as CustomEvent<{ threadIds: string[] }>).detail.threadIds;
    el.activeMark = id ?? null;
    log.textContent = JSON.stringify((e as CustomEvent).detail);
  });
  return html`${el}${log}`;
};

export const ReadOnlyHighlights = () => {
  const el = document.createElement("spez-richtext");
  el.setAttribute("readonly", "");
  el.initialHtml = `<p>Only <span data-thread-ids="${A}">this thread</span> is visible; <span data-thread-ids="${B}">this one</span> is not.</p>`;
  el.highlightMarks = [A];
  return html`${el}`;
};

export const Diagram = () => {
  const el = document.createElement("spez-richtext");
  el.setAttribute("toolbar", "history,block,diagram");
  el.addEventListener("rte-ready", () => el.insertDiagram("flowchart TD\n  Jadeed --> Muraja'at --> Tasmi"), { once: true });
  el.addEventListener("diagram-edit-requested", (e) => {
    const { nodeKey, source } = (e as CustomEvent<{ nodeKey: string; source: string }>).detail;
    const next = window.prompt("Mermaid source", source);
    if (next !== null) el.updateDiagram(nodeKey, { source: next });
  });
  return html`${el}`;
};
```

Add to the manual QA checklist array in the default export:
`"- LuD picker: typing continues in the chosen font; Google Docs paste in Al Kanz keeps the typed text", "- Comment: select, 💬, highlight appears; click a mark fires comment-clicked", "- Diagram renders; double-click opens the edit prompt; no foreignObject in the SVG",`.

- [ ] **Step 3: Changeset and CLAUDE.md**

`.changeset/richtext-lud-comments-diagrams.md`:

```md
---
"@spezutil/richtext-editor": minor
"@spezutil/richtext-editor-react": minor
"@spezutil/richtext-editor-angular": minor
---

LuD text, comment marks and diagrams for `<spez-richtext>`:

- `lud-text` node (text stored exactly as typed, `ludFont` = lud-codec profile id or `unicode`), `<span data-lud-font>` HTML, and an opt-in `lud` toolbar font picker; Google Docs paste in a LuD font keeps the typed text.
- `CommentMarkNode` (`comment-mark`, ULID `ids`), `addCommentMark`/`removeCommentMark`/`focusCommentMark`, `highlightMarks`/`activeMark`, `comment-requested`/`comment-clicked` events, opt-in `comment` toolbar button; works in read-only.
- `DiagramNode` (Mermaid `source` + rendered `svg` + `drawioKey`), lazy Mermaid with `htmlLabels: false`, `insertDiagram`/`updateDiagram`, `diagram-edit-requested`, opt-in `diagram` toolbar button.
- The default toolbar is unchanged; new groups are opt-in. Wrappers expose the new inputs and events.
- `contract/handbook-nodes.json` ships the node JSON contract shared with the handbook API.
```

In `/Users/hatimnomani/code/SpezUtil-richtext/CLAUDE.md`, extend the `richtext-editor` bullet with this sentence: "Also `lud-text` (LuD text stored exactly as typed, via `@spezutil/lud-codec`), `comment-mark` (`@lexical/mark`) and Mermaid `diagram` nodes. Their JSON is a contract with the handbook API (`packages/richtext-editor/contract/handbook-nodes.json`), and any surface that parses the JSON must register `EDITOR_NODES`. `mermaid` is a regular dependency loaded by dynamic `import()`."

- [ ] **Step 4: Full verification**

Run: `cd /Users/hatimnomani/code/SpezUtil-richtext && pnpm turbo run build lint test --filter=@spezutil/richtext-editor... --filter=@spezutil/lud-codec`
Expected: every package builds, lints and tests green, including the Angular ng-packagr build.

Run: `grep -rnE "toUnicode|toDisplay" packages/richtext-editor/src`
Expected: no output. LuD text is never converted.

Run: `grep -c "import(\"mermaid\")" packages/richtext-editor/dist/index.js`
Expected: `1`. Mermaid stays a lazy chunk and is not inlined. Also confirm `dist/index.js` is under 1.2 MB (`ls -l`), since it was ~0.6 MB with the embedded Amiri font.

Run: `pnpm --filter @spezutil/storybook build`
Expected: the build succeeds. Then run `pnpm --filter @spezutil/storybook dev`, open the four new stories and go through the QA checklist lines added in Step 2.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/docs/richtext/api.md apps/storybook/stories/richtext-editor.stories.ts .changeset/richtext-lud-comments-diagrams.md CLAUDE.md
git commit -m "docs(richtext): LuD fonts, comment marks, diagrams; stories and changeset"
```
