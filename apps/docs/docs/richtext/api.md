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
| `toolbar` | comma-separated groups or `none` | The legacy group list: history, block, font, inline, color, list, indent, align, direction, insert, plus opt-in lud, comment, diagram. Setting it selects the `legacy` layout. `none` removes the toolbar. Prefer `toolbarConfig`; see [Toolbar](#toolbar). |
| `toolbar-layout` | `compact` \| `legacy` | `compact` (default): one row plus a More menu. `legacy`: the 0.5 flat, wrapping toolbar. |
| `toolbar-config` | JSON | The same object as the `toolbarConfig` property, for plain HTML. |
| `toolbar-mode` | `static` \| `sticky` \| `focus` | How the toolbar sits relative to the content (default `static`). |
| `toolbar-pinned` | boolean | In `focus` mode, keep the toolbar showing without focus. |
| `fonts` | comma-separated font families | Simple form of the toolbar font list, e.g. `fonts="Amiri, Tahoma, Arial"`. Use the `fonts` *property* for labels and full font stacks. |

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `value` | `string \| null` | Serialized Lexical editor state JSON (get/set; canonical persistence format). |
| `initialHtml` | `string \| null` | HTML applied on first init when no `value` was set. |
| `fonts` | `FontOption[] \| null` | Toolbar font list (`{ label, family }[]`). Replaces the defaults; spread the exported `DEFAULT_FONTS` to extend them instead. `null` restores the defaults. |
| `toolbarConfig` | `ToolbarConfig \| null` | Declarative toolbar layout; see [Toolbar](#toolbar). `null` restores the default. |
| `toolbarMode` | `'static' \| 'sticky' \| 'focus'` | Reflects `toolbar-mode`. Set it at any time, or call `setToolbarMode(mode)`. |
| `toolbarPinned` | `boolean` | Reflects `toolbar-pinned`. |
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

## Toolbar

New in 0.6. The toolbar is one compact row of icon buttons, grouped, with an overflow **More** menu.
Every control has an inline SVG icon (no icon font), an `aria-label`, and a tooltip that shows its
shortcut (Cmd on Apple platforms, Ctrl elsewhere). Toggles carry `aria-pressed`.

### Default layout

```
history | block | inline | color | lists | align-dir | insert | More
```

| Group | Items |
| --- | --- |
| `history` | `undo`, `redo` |
| `block` | `block` (paragraph / heading / quote / ayat select) |
| `inline` | `bold`, `italic`, `underline`, `clear-formatting` |
| `color` | `text-color`, `highlight-color` |
| `lists` | `bullet-list`, `number-list`, `outdent`, `indent` |
| `align-dir` | `align-start`, `align-center`, `align-end`, `dir-rtl`, `dir-ltr` |
| `insert` | `link`, `image`, `table`, `diagram` |
| More, text | `font-family`, `font-size`, `lud-font` ("Lisan ud-Dawat font"; empty option "Default"), `strikethrough`, `subscript`, `superscript`, `code` |
| More, paragraph | `align-justify`, `dir-auto` |
| More, insert | `hijri-date`, `ayat`, `transliteration` |
| opt-in | `comment` (group `comment`; add with `show: ["comment"]`) |

### Configuring it

```ts
el.toolbarConfig = {
  // Ordered groups. A string is a preset group; an object defines your own.
  groups: ["history", "block", { id: "text", items: ["bold", "italic"] }, "lists", "insert"],
  // The More menu: a list of item ids, explicit sections, or false for none.
  more: ["strikethrough", "code", "hijri-date"],
  hide: ["image"],        // remove items wherever they are
  show: ["comment"],      // add items that are not in the layout (into their home group, else More)
  collapse: ["insert", "lists"], // groups that give way to More as width shrinks, first listed first
  overflow: true,         // false: never collapse
};
```

`layout: "legacy"` starts from the 0.5 groups instead. `DEFAULT_TOOLBAR_LAYOUT` and
`LEGACY_TOOLBAR_LAYOUT` are exported so you can spread them and edit.

### Upgrading from 0.5

With nothing set, the toolbar is now the compact layout above. To keep the 0.5 layout (flat groups
that wrap, no More menu), set `toolbar-layout="legacy"`. An explicit `toolbar="a,b,c"` attribute is
unchanged: it selects the legacy layout with exactly those groups. In every layout the buttons draw
SVG icons instead of text glyphs, and a button's `title` now includes its shortcut
(`Bold (Ctrl+B)`): find buttons by `aria-label` or `data-item`, not by `title`.

### Responsive overflow

A `ResizeObserver` moves whole groups (the real elements, so their state and listeners come with
them) into the More menu, in `collapse` order, until the row fits, and moves them back when it grows.
When nothing is left to collapse the row wraps rather than clipping.

### Display mode

| Mode | Behaviour |
| --- | --- |
| `static` (default) | In the normal flow above the content. |
| `sticky` | Pinned to the top of its scroll container (`--rte-toolbar-sticky-top` sets the offset). |
| `focus` | Shown only while the editor has focus (or `toolbarPinned`), overlaid on the top of the content, so nothing shifts. |

```ts
el.setToolbarMode("focus");   // or el.toolbarMode = "focus", or toolbar-mode="focus"
el.toolbarPinned = true;
```

The package does not remember the choice; persist it in your app and set it on load.

### Keyboard

The toolbar is `role="toolbar"` with a roving tabindex: Tab enters it once, Left/Right (mirrored in
RTL) move between controls, Home/End jump to the ends, Escape returns to the text. From the text,
**Alt+F10** moves to the toolbar. In the More menu: Enter, Space or Down opens it and moves in, Up/Down
walk the buttons, Tab walks every control, Escape closes it and returns to its button.

### Right to left

Layout uses logical properties, so the toolbar mirrors under `dir="rtl"`. With `locale="ar"` and no
`dir` on the element, an Arabic toolbar reads right to left on its own. Icons that point toward the
start of the line (alignment, indent, bullets) mirror too.

### Adding your own items

```ts
import { registerToolbarItem, type SpezRichtext } from "@spezutil/richtext-editor";

registerToolbarItem({
  id: "clear-all",
  label: (t) => "Clear document",
  icon: "clear-formatting",
  shortcut: "mod+shift+K",
  create: (ctx) => ctx.button({ id: "clear-all", label: () => "Clear document", icon: "clear-formatting", shortcut: "mod+shift+K" },
    () => (ctx.host as SpezRichtext).clear()),
});
el.toolbarConfig = { groups: ["history", { id: "mine", items: ["clear-all"] }] };
```

Registering an id that already exists replaces the built-in (the "Insert table" button is the item
`table`, which is how table tooling hooks in). `sync(element, state, ctx)` runs after every update.

### Theming

Colours, spacing, radius and type come from custom properties with neutral defaults; set them on the
element or any ancestor.

| Property | Default | |
| --- | --- | --- |
| `--rte-toolbar-bg` | `#f7f8f9` | Toolbar background. |
| `--rte-toolbar-fg` | `var(--rte-fg)` | Icon and text colour. |
| `--rte-toolbar-muted` | `var(--rte-muted)` | Section titles, shortcuts. |
| `--rte-toolbar-border` / `--rte-toolbar-divider` | `var(--rte-border)` | Bottom edge / dividers between groups. |
| `--rte-toolbar-hover-bg` | accent at 10% | Hover. |
| `--rte-toolbar-active-bg` / `-fg` / `-border` | accent tints | Pressed and expanded. |
| `--rte-toolbar-focus-ring` | `var(--rte-accent)` | Keyboard focus outline. |
| `--rte-toolbar-field-bg` / `-fg` | `var(--rte-bg)` / `var(--rte-fg)` | Select controls. |
| `--rte-toolbar-radius` | `var(--rte-radius)` | Toolbar's top corners. |
| `--rte-control-radius` / `--rte-control-height` | `5px` / `28px` | Buttons and selects. |
| `--rte-toolbar-gap`, `-padding-block`, `-padding-inline` | `2px`, `6px`, `8px` | Spacing. |
| `--rte-toolbar-font-size`, `-label-size`, `-icon-size` | `0.85rem`, `0.75rem`, `1.125rem` | Type and icons. |
| `--rte-toolbar-height` | `2.5rem` | Row height reserved in `focus` mode. |
| `--rte-toolbar-z`, `--rte-toolbar-sticky-top` | `5`, `0px` | Stacking and pin offset. |
| `--rte-toolbar-shadow` | soft black | Focus-mode overlay. |
| `--rte-menu-bg` / `-fg` / `-border` / `-shadow` | base tokens | More menu. |
| `--rte-menu-min-width`, `--rte-menu-max-height` | `18rem`, `70vh` | More menu size. |

## Font selector

The `font-family` and `font-size` items (in the More menu by default) apply a font to the selected text (stored as an inline `font-family`
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
