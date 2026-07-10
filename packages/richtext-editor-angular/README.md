# @spezutil/richtext-editor-angular

Angular wrapper for [`@spezutil/richtext-editor`](https://www.npmjs.com/package/@spezutil/richtext-editor) — a rich-text editor Web Component for Arabic / Lisan-ud-Dawat content built on Lexical.

## Install

```sh
npm install @spezutil/richtext-editor-angular
```

## Usage

```ts
import { Component } from "@angular/core";
import { SpezRichtextComponent } from "@spezutil/richtext-editor-angular";

@Component({
  standalone: true,
  imports: [SpezRichtextComponent],
  template: `
    <spez-richtext-ng
      placeholder="Start writing…"
      locale="ar"
      (change)="onChange($event)"
    ></spez-richtext-ng>
  `,
})
export class EditorPage {
  onChange(detail: { json: string; isEmpty: boolean }) {
    // persist detail.json
  }
}
```

All attributes, properties, events, and theming options are documented in the [core package README](https://www.npmjs.com/package/@spezutil/richtext-editor).

## License

Apache-2.0
