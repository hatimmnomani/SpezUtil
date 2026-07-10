# @spezutil/richtext-editor

Rich-text editor Web Component for Arabic / Lisan-ud-Dawat content, built on [Lexical](https://lexical.dev). Ships the Al-Kanz Arabic font embedded (applied automatically to Arabic text via `unicode-range`), per-paragraph RTL/LTR auto-direction, and content blocks for dawat material.

- Core formatting: bold/italic/underline/strikethrough, headings, quote, lists, alignment (logical start/end — RTL-correct), undo/redo
- Per-paragraph direction auto-detected from the first strong character; explicit RTL/LTR/Auto toolbar toggle
- **Ayat block** — distinctly styled container for Quranic ayat / kalemat nooraniyah
- **Transliteration pair** — Arabic line + transliteration line that move and export as one unit
- **Hijri date token** — atomic inline date backed by [`@spezutil/hijri-core`](https://www.npmjs.com/package/@spezutil/hijri-core); round-trips the actual `{year, month, day}` payload
- Links, images (by URL), tables
- Output: Lexical JSON (canonical) + HTML export/import
- Localized toolbar (`en`, `ar`)

React wrapper: [`@spezutil/richtext-editor-react`](https://www.npmjs.com/package/@spezutil/richtext-editor-react) · Angular wrapper: [`@spezutil/richtext-editor-angular`](https://www.npmjs.com/package/@spezutil/richtext-editor-angular)

## Install

```sh
npm install @spezutil/richtext-editor
```

## Usage

```html
<script type="module">
  import "@spezutil/richtext-editor";
</script>

<spez-richtext placeholder="Start writing…"></spez-richtext>

<script>
  const editor = document.querySelector("spez-richtext");
  editor.addEventListener("change", (e) => {
    console.log(e.detail.json); // serialized Lexical state — store this
  });
  // On save:
  const html = editor.getHTML(); // for rendering outside the editor
</script>
```

### Hijri date picking

The toolbar's Hijri-date button inserts today's date by default. If [`@spezutil/hijri-datepicker`](https://www.npmjs.com/package/@spezutil/hijri-datepicker) is loaded on the page (optional peer dependency, detected at runtime), the button opens a date-picker popover instead:

```js
import "@spezutil/richtext-editor";
import "@spezutil/hijri-datepicker"; // optional — enables the picker popover
```

## API

### Attributes

| Attribute | Values | Description |
| --- | --- | --- |
| `readonly` | boolean | Disables editing and hides the toolbar |
| `placeholder` | string | Shown while empty |
| `dir` | `rtl` \| `ltr` \| `auto` | Base direction (default `auto`; paragraphs still auto-detect) |
| `locale` | `en` \| `ar` | Toolbar language (default `en`) |
| `toolbar` | comma-separated groups or `none` | Groups: `history,block,inline,list,align,direction,insert` |

### Properties

- `value: string | null` — serialized Lexical editor state JSON (get/set; canonical persistence format)
- `initialHtml: string | null` — HTML applied on first init when no `value` was set
- `editor: LexicalEditor` — escape hatch for advanced use

### Methods

`getJSON()`, `getHTML()`, `setValue(json)`, `setHTML(html)`, `clear()`, `focus()`, `insertHijriDate(date?, format?)`

### Events

- `change` — `CustomEvent<{ json: string; isEmpty: boolean }>`, debounced ~150 ms. HTML is **not** included (exporting it walks the whole document); call `getHTML()` on save/blur instead.
- `rte-ready` — fired once after the editor initializes.

## Theming

```css
spez-richtext {
  --rte-accent: #7c3aed;
  --rte-font-family-arabic: "My Arabic Font", serif;
  --rte-ayat-font-size: 1.75em;
}
```

Also available: `--rte-font-family`, `--rte-bg`, `--rte-fg`, `--rte-muted`, `--rte-border`, `--rte-radius`, `--rte-toolbar-bg`, `--rte-translit-color`.

## Light DOM

Unlike the other SpezUtil components, `<spez-richtext>` renders in **light DOM**: Lexical's selection handling relies on `window.getSelection()`, which does not work inside shadow roots. Styles are scoped under the `spez-rte-` class prefix and injected once per document.

## License

Apache-2.0
