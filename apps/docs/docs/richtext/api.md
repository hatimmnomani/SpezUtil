---
title: API reference
---

# API reference

## Attributes

| Attribute | Values | Description |
| --- | --- | --- |
| `readonly` | boolean | Disables editing and hides the toolbar. |
| `placeholder` | string | Shown while empty. |
| `dir` | `rtl` \| `ltr` \| `auto` | Base direction (default `auto`; paragraphs still auto-detect from their first strong character). |
| `locale` | `en` \| `ar` | Toolbar language (default `en`). |
| `toolbar` | comma-separated groups or `none` | Groups: history, block, font, inline, color, list, indent, align, direction, insert (default set), plus opt-in lud, comment, diagram. |
| `fonts` | comma-separated font families | Simple form of the toolbar font list, e.g. `fonts="Amiri, Tahoma, Arial"`. Use the `fonts` *property* for labels and full font stacks. |

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `value` | `string \| null` | Serialized Lexical editor state JSON (get/set; canonical persistence format). |
| `initialHtml` | `string \| null` | HTML applied on first init when no `value` was set. |
| `fonts` | `FontOption[] \| null` | Toolbar font list (`{ label, family }[]`). Replaces the defaults; spread the exported `DEFAULT_FONTS` to extend them instead. `null` restores the defaults. |
| `editor` | `LexicalEditor` | Escape hatch for advanced use (custom commands, transforms, …). Throws before first connect. |
| `highlightMarks` | `string[] \| null` | Comment mark ids to highlight; `null` (default) highlights every mark. Marks not listed stay in the document but are not highlighted or clickable. |
| `activeMark` | `string \| null` | Mark id drawn as the active thread. |

## Methods

| Method | Description |
| --- | --- |
| `getJSON()` | Current state as serialized Lexical JSON. |
| `getHTML()` | Current content as HTML. |
| `setValue(json)` | Replace content from serialized JSON. |
| `setHTML(html)` | Replace content from HTML. |
| `clear()` | Empty the editor. |
| `focus()` | Focus the editable area. |
| `insertHijriDate(date?, format?)` | Insert a Hijri date token at the caret (defaults to today). |
| `addCommentMark(markId?)` | Wraps the selection (or, read-only, the DOM selection) in a comment mark. Fires `comment-requested`; returns `{ markId, quotedText, prefix, suffix }` or `null` (empty, blank or > 1,000 chars). A ULID is generated when `markId` is omitted. |
| `removeCommentMark(markId)` | Removes that id from every mark; unwraps marks left without ids. |
| `focusCommentMark(markId)` | Makes it the active mark and scrolls it into view. |
| `insertDiagram(source?, drawioKey?)` | Inserts a Mermaid diagram; returns its node key. Rendered to SVG (stored in the JSON). |
| `updateDiagram(nodeKey, { source?, drawioKey? })` | Changes a diagram; a new source re-renders, and re-submitting an unchanged source after a failed render retries it. `nodeKey` is a Lexical node key: valid for the current document only, invalidated by `value`/`setValue()`/`setHTML()` — do not store it across a reload. |

## Events

| Event | Detail | Notes |
| --- | --- | --- |
| `change` | `{ json: string; isEmpty: boolean }` | Debounced ~150 ms. HTML is **not** included (exporting walks the whole document) — call `getHTML()` on save/blur instead. |
| `rte-ready` | — | Fired once after the editor initializes. |
| `comment-requested` | `{ markId, quotedText, prefix, suffix }` | After a mark is added. `prefix`/`suffix` are the ≤ 32 characters around the quote in the handbook plain-text form (blocks end with `\n`). |
| `comment-clicked` | `{ threadIds: string[] }` | Click on a highlighted mark; innermost first. Works in read-only. |
| `diagram-edit-requested` | `{ nodeKey, source, drawioKey }` | Double-click on a diagram (editable only), or right after the toolbar inserts one. The host shows its own source editor and calls `updateDiagram`. |

## Dawat content blocks

### Ayat block

Toolbar **۞** button or the block dropdown. Renders centered, enlarged, RTL, in the Arabic font. Exports as:

```html
<blockquote data-spez-type="ayat" dir="rtl">…</blockquote>
```

### Transliteration pair

Toolbar **ت/t** button inserts a two-line unit — an Arabic line and a Latin (transliteration) line:

```html
<div data-spez-type="translit-pair">
  <p data-role="arabic" dir="rtl">العلم نور</p>
  <p data-role="latin" dir="ltr">al-ilmu noor</p>
</div>
```

Editing behavior (the pair is self-normalizing — it always has exactly one Arabic + one Latin line):

- **Enter** in the Arabic line → jumps to the Latin line; **Enter** in the Latin line → exits below the pair
- **Backspace** at the start of the Latin line → moves the caret to the Arabic line (never merges the two lines)
- **Backspace** at the start of the Arabic line → unwraps the pair into plain paragraphs
- **Backspace / Delete** in an all-empty pair → removes the whole pair
- Switching block type from the dropdown while inside a pair converts the pair into the chosen block

### Hijri date token

Toolbar **📅** button. Atomic (deletes/moves as one unit), backed by
[`@spezutil/hijri-core`](/engine/hijri-core) — it stores the actual `{year, month, day}`, not just
text. Exports as:

```html
<time data-spez-hijri="1446-9-17" data-spez-format="D MMMM YYYY">17 Ramadan al-Moazzam 1446</time>
```

Programmatic insertion:

```ts
editor.insertHijriDate({ year: 1446, month: 9, day: 17 }, "D MMMM YYYY");
```

If `@spezutil/hijri-datepicker` is loaded on the page, the toolbar button opens a date-picker
popover instead of inserting today's date directly.

## Font selector

The toolbar's `font` group applies a font to the selected text (stored as an inline `font-family`
style; survives HTML export/import). The default list is the embedded Amiri plus safe
cross-platform stacks. Configure it with the `fonts` property:

```ts
import { DEFAULT_FONTS } from "@spezutil/richtext-editor";

editor.fonts = [
  ...DEFAULT_FONTS,
  { label: "Scheherazade", family: '"Scheherazade New", serif' },
];
```

Custom fonts must be loaded on the page (your own `@font-face` or a font service) — the editor
only applies the `font-family` value.

## Theming

All styling hangs off CSS custom properties on the host element:

```css
spez-richtext {
  --rte-accent: #7c3aed;
  --rte-font-family-arabic: "My Arabic Font", serif;
  --rte-ayat-font-size: 1.75em;
}
```

| Property | Default | Applies to |
| --- | --- | --- |
| `--rte-font-family` | `"Amiri", system-ui, sans-serif` | Base text (Amiri only binds to Arabic codepoints). |
| `--rte-font-family-arabic` | `"Amiri", "Traditional Arabic", serif` | RTL blocks, ayat. |
| `--rte-accent` | `#0b7d3e` | Buttons, links, focus states. |
| `--rte-bg` / `--rte-fg` | `#ffffff` / `#1f2933` | Editor surface. |
| `--rte-muted` | `#6b7280` | Placeholder, secondary text. |
| `--rte-border` | `#d9dee4` | Borders. |
| `--rte-radius` | `8px` | Corner radius. |
| `--rte-toolbar-bg` | `#f7f8f9` | Toolbar background. |
| `--rte-ayat-font-size` | `1.5em` | Ayat block text. |
| `--rte-translit-color` | `var(--rte-muted)` | Latin transliteration line. |

## Notes

- **Light DOM.** Unlike typical Web Components, `<spez-richtext>` renders in light DOM: Lexical's
  selection handling relies on `window.getSelection()`, which does not work inside shadow roots
  ([facebook/lexical#8125](https://github.com/facebook/lexical/issues/8125)). Styles are scoped
  under the `spez-rte-` class prefix and injected once per document, so they won't collide with
  your CSS.
- **Bundle size.** The embedded Amiri font adds ~500 KB (base64) to the bundle. In exchange the
  component is fully self-contained — no font hosting, no asset-path configuration, no FOUT on
  Arabic text.
- **Font license.** The embedded [Amiri](https://github.com/aliftype/amiri) typeface is © its
  authors, redistributed under the [SIL Open Font License 1.1](https://openfontlicense.org/);
  the license text ships in the repository at `assets/fonts/OFL-Amiri.txt`.
- **Lexical versions.** `lexical` and all `@lexical/*` packages are regular dependencies,
  version-matched. If your app also uses Lexical directly, keep it deduped to a single copy — two
  copies break Lexical's node identity checks.

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
published by the handbook API. In a `readonly` editor, rendering a stored diagram whose `svg` is
empty does not fire `change`; in an editable editor it does, so the svg is persisted with the draft.

The rendered diagram is wrapped in a container that clips it to its own box —
`figure[data-spez-type="diagram"] { overflow: hidden; contain: paint }` — so a malicious or
malformed root `<svg>` (transforms, negative margins) cannot paint over host content. Each inserted
diagram gets a unique `spez-rte-mermaid-<ulid>` root id, so two diagrams on the same page cannot
style each other through scoped `<style>` rules. A host that supplies its own renderer via
`setDiagramRenderer` must give its root `<svg>` a `mermaid-` or `spez-rte-` prefixed id — anything
else has its `<style>` content stripped — and every renderer result is run back through the same
SVG sanitizer before it is stored, so this holds for host renderers too. The sanitizer (also applied
on HTML import of `figure[data-spez-type="diagram"]`) is the XSS boundary for diagram content: it
strips scripts, event handlers, `foreignObject`, external references and out-of-scope `<style>`
rules before anything reaches the DOM.

## Readonly behavior

With the `readonly` attribute, editing and the toolbar are disabled, but the component is not
inert: `highlightMarks`/`activeMark` still control which comment marks are highlighted and active,
clicking a highlighted mark still fires `comment-clicked`, and `addCommentMark`/`removeCommentMark`/
`focusCommentMark` still work — `addCommentMark` wraps the current DOM selection instead of a
Lexical selection. The host decides whether to expose a "Comment" affordance of its own (e.g. the
handbook's public reader) since the toolbar itself is hidden.
