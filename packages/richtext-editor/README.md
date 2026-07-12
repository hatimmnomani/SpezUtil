# @spezutil/richtext-editor

`<spez-richtext>` — a rich-text editor Web Component for **Arabic / Lisan-ud-Dawat** content, built on [Lexical](https://lexical.dev). Framework-agnostic: works in plain HTML, React, Angular, Vue, or anything that renders DOM.

- **Amiri Arabic font embedded** ([SIL OFL-1.1](https://openfontlicense.org/)) — applied automatically to Arabic codepoints via `unicode-range`, no font files to host, no configuration
- **Font selector in the toolbar** — end users can switch fonts per selection; the list is fully configurable via the `fonts` property
- **RTL-first** — per-paragraph direction auto-detected from the first strong character, logical (start/end) alignment, mirrored toolbar under `dir="rtl"`
- **Dawat content blocks**
  - **Ayat block** — distinctly styled container for Quranic ayat / kalemat nooraniyah
  - **Transliteration pair** — an Arabic line + its transliteration that move, edit, and export as one unit
  - **Hijri date token** — atomic inline date backed by [`@spezutil/hijri-core`](https://www.npmjs.com/package/@spezutil/hijri-core) (Bohra/Misri tabular calendar); stores the actual `{year, month, day}`, not just text
- Core formatting: bold / italic / underline / strikethrough, headings, quote, lists, alignment, undo/redo
- Links, images (by URL), tables
- Output: **Lexical JSON** (canonical, lossless) + **HTML** export/import
- Localized toolbar (`en`, `ar`)

Wrappers: [`@spezutil/richtext-editor-react`](https://www.npmjs.com/package/@spezutil/richtext-editor-react) · [`@spezutil/richtext-editor-angular`](https://www.npmjs.com/package/@spezutil/richtext-editor-angular)

## Install

```sh
npm install @spezutil/richtext-editor
```

## Quick start

```html
<script type="module">
  import "@spezutil/richtext-editor";
</script>

<spez-richtext placeholder="Start writing…"></spez-richtext>

<script>
  const editor = document.querySelector("spez-richtext");

  // Persist the canonical Lexical JSON (debounced ~150 ms while typing):
  editor.addEventListener("change", (e) => {
    save(e.detail.json);
  });

  // Restore it later:
  editor.value = savedJson;

  // Render outside the editor (email, static page, …):
  const html = editor.getHTML();
</script>
```

**Persist the JSON, render the HTML.** `value` / `e.detail.json` round-trips every feature losslessly (ayat blocks, translit pairs, hijri tokens keep their data). `getHTML()` produces tagged, self-describing markup (`data-spez-type="ayat"`, `data-spez-hijri="1446-9-17"`, …) that `setHTML()` / `initialHtml` can re-import.

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

Toolbar **📅** button. If [`@spezutil/hijri-datepicker`](https://www.npmjs.com/package/@spezutil/hijri-datepicker) is loaded on the page (optional peer dependency, detected at runtime — never imported), the button opens a date-picker popover; otherwise it inserts today's date:

```js
import "@spezutil/richtext-editor";
import "@spezutil/hijri-datepicker"; // optional — enables the picker popover
```

The token is atomic (deletes/moves as one unit) and exports as:

```html
<time data-spez-hijri="1446-9-17" data-spez-format="D MMMM YYYY">17 Ramadan al-Moazzam 1446</time>
```

Programmatic insertion: `editor.insertHijriDate({ year: 1446, month: 9, day: 17 }, "D MMMM YYYY")`.

## API

### Attributes

| Attribute | Values | Description |
| --- | --- | --- |
| `readonly` | boolean | Disables editing and hides the toolbar |
| `placeholder` | string | Shown while empty |
| `dir` | `rtl` \| `ltr` \| `auto` | Base direction (default `auto`; paragraphs still auto-detect) |
| `locale` | `en` \| `ar` | Toolbar language (default `en`) |
| `toolbar` | comma-separated groups or `none` | Groups: `history,block,font,inline,list,align,direction,insert` |
| `fonts` | comma-separated font families | Simple form of the font list, e.g. `fonts="Amiri, Tahoma, Arial"` (use the `fonts` *property* for labels and full font stacks) |

### Properties

| Property | Type | Description |
| --- | --- | --- |
| `value` | `string \| null` | Serialized Lexical editor state JSON (get/set; canonical persistence format) |
| `initialHtml` | `string \| null` | HTML applied on first init when no `value` was set |
| `fonts` | `FontOption[] \| null` | Toolbar font list — see [Font selector](#font-selector) |
| `editor` | `LexicalEditor` | Escape hatch for advanced use (custom commands, transforms, …) |

### Methods

| Method | Description |
| --- | --- |
| `getJSON()` | Current state as serialized Lexical JSON |
| `getHTML()` | Current content as HTML |
| `setValue(json)` | Replace content from serialized JSON |
| `setHTML(html)` | Replace content from HTML |
| `clear()` | Empty the editor |
| `focus()` | Focus the editable area |
| `insertHijriDate(date?, format?)` | Insert a Hijri date token at the caret (defaults to today) |

### Events

| Event | Detail | Notes |
| --- | --- | --- |
| `change` | `{ json: string; isEmpty: boolean }` | Debounced ~150 ms. HTML is **not** included (exporting walks the whole document) — call `getHTML()` on save/blur instead |
| `rte-ready` | — | Fired once after the editor initializes |

## Font selector

The toolbar's `font` group lets end users apply a font to the selected text (stored as an inline `font-family` style; survives HTML export/import). The default list is the embedded Amiri plus safe cross-platform stacks. Replace it via the `fonts` property, or spread `DEFAULT_FONTS` to extend it:

```js
import { DEFAULT_FONTS } from "@spezutil/richtext-editor";

const editor = document.querySelector("spez-richtext");
editor.fonts = [
  ...DEFAULT_FONTS,
  { label: "Scheherazade", family: '"Scheherazade New", serif' },
];
```

Custom fonts must be loaded on the page (your own `@font-face` or a font service) — the editor only applies the `font-family` value. Setting `fonts = null` restores the defaults. The simple attribute form `fonts="Amiri, Tahoma"` is also supported for plain-HTML usage.

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
| `--rte-font-family` | `"Amiri", system-ui, sans-serif` | Base text (Amiri only binds to Arabic codepoints) |
| `--rte-font-family-arabic` | `"Amiri", "Traditional Arabic", serif` | RTL blocks, ayat |
| `--rte-accent` | `#0b7d3e` | Buttons, links, focus states |
| `--rte-bg` / `--rte-fg` | `#ffffff` / `#1f2933` | Editor surface |
| `--rte-muted` | `#6b7280` | Placeholder, secondary text |
| `--rte-border` | `#d9dee4` | Borders |
| `--rte-radius` | `8px` | Corner radius |
| `--rte-toolbar-bg` | `#f7f8f9` | Toolbar background |
| `--rte-ayat-font-size` | `1.5em` | Ayat block text |
| `--rte-translit-color` | `var(--rte-muted)` | Latin transliteration line |

## Notes

- **Light DOM.** Unlike typical Web Components, `<spez-richtext>` renders in light DOM: Lexical's selection handling relies on `window.getSelection()`, which does not work inside shadow roots ([facebook/lexical#8125](https://github.com/facebook/lexical/issues/8125)). Styles are scoped under the `spez-rte-` class prefix and injected once per document, so they won't collide with your CSS.
- **Bundle size.** The embedded Amiri font adds ~500 KB (base64) to the bundle. In exchange the component is fully self-contained — no font hosting, no asset-path configuration, no FOUT on Arabic text.
- **Font license.** The embedded [Amiri](https://github.com/aliftype/amiri) typeface is © its authors and redistributed under the [SIL Open Font License 1.1](https://openfontlicense.org/); the license text ships in this repository at `assets/fonts/OFL-Amiri.txt`.
- **Lexical versions.** `lexical` and all `@lexical/*` packages are regular dependencies, version-matched. If your app also uses Lexical directly, keep it deduped to a single copy — two copies break Lexical's node identity checks.

## License

Apache-2.0
