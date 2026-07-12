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
| `toolbar` | comma-separated groups or `none` | Groups: `history`, `block`, `font`, `inline`, `list`, `align`, `direction`, `insert`. |
| `fonts` | comma-separated font families | Simple form of the toolbar font list, e.g. `fonts="Amiri, Tahoma, Arial"`. Use the `fonts` *property* for labels and full font stacks. |

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `value` | `string \| null` | Serialized Lexical editor state JSON (get/set; canonical persistence format). |
| `initialHtml` | `string \| null` | HTML applied on first init when no `value` was set. |
| `fonts` | `FontOption[] \| null` | Toolbar font list (`{ label, family }[]`). Replaces the defaults; spread the exported `DEFAULT_FONTS` to extend them instead. `null` restores the defaults. |
| `editor` | `LexicalEditor` | Escape hatch for advanced use (custom commands, transforms, …). Throws before first connect. |

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

## Events

| Event | Detail | Notes |
| --- | --- | --- |
| `change` | `{ json: string; isEmpty: boolean }` | Debounced ~150 ms. HTML is **not** included (exporting walks the whole document) — call `getHTML()` on save/blur instead. |
| `rte-ready` | — | Fired once after the editor initializes. |

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
