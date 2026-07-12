---
title: Getting started
---

# Getting started

`<spez-richtext>` is a rich-text editor Web Component for **Arabic / Lisan-ud-Dawat** content,
built on [Lexical](https://lexical.dev). It ships the Amiri Arabic font embedded (applied
automatically to Arabic codepoints), auto-detects paragraph direction, and adds Dawat content
blocks: ayat blocks, transliteration pairs, and atomic Hijri date tokens.

## Vanilla JS

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

**Persist the JSON, render the HTML.** `value` / `e.detail.json` round-trips every feature
losslessly (ayat blocks, translit pairs, hijri tokens keep their data). `getHTML()` produces
tagged, self-describing markup (`data-spez-type="ayat"`, `data-spez-hijri="1446-9-17"`, …) that
`setHTML()` / `initialHtml` can re-import.

## React

```tsx
import { SpezRichtext, type ChangeDetail } from "@spezutil/richtext-editor-react";

export function Example() {
  return (
    <SpezRichtext
      placeholder="Start writing…"
      onChange={(e) => console.log((e as CustomEvent<ChangeDetail>).detail)}
    />
  );
}
```

## Angular

```ts
import { Component } from "@angular/core";
import { SpezRichtextComponent, type ChangeDetail } from "@spezutil/richtext-editor-angular";

@Component({
  standalone: true,
  imports: [SpezRichtextComponent],
  template: `<spez-richtext-ng placeholder="Start writing…" locale="ar" dir="rtl"
    (change)="onChange($event)"></spez-richtext-ng>`,
})
export class ExampleComponent {
  onChange(detail: ChangeDetail) {
    console.log(detail);
  }
}
```

## Hijri date picker popover (optional)

The toolbar **📅** button inserts a Hijri date token. If
[`@spezutil/hijri-datepicker`](/datepicker/getting-started) is loaded on the page (optional peer
dependency, detected at runtime — never imported), the button opens a date-picker popover;
otherwise it inserts today's date:

```js
import "@spezutil/richtext-editor";
import "@spezutil/hijri-datepicker"; // optional — enables the picker popover
```

See [Recipes](/richtext/recipes) for live demos and the [API reference](/richtext/api).
