# @spezutil/richtext-editor-react

React wrapper for [`@spezutil/richtext-editor`](https://www.npmjs.com/package/@spezutil/richtext-editor) — a rich-text editor Web Component for Arabic / Lisan-ud-Dawat content built on Lexical.

## Install

```sh
npm install @spezutil/richtext-editor-react
```

## Usage

```tsx
import { SpezRichtext } from "@spezutil/richtext-editor-react";

export function Editor() {
  return (
    <SpezRichtext
      placeholder="Start writing…"
      locale="ar"
      onChange={(e) => save(e.detail.json)}
    />
  );
}
```

All attributes, properties, events, and theming options are documented in the [core package README](https://www.npmjs.com/package/@spezutil/richtext-editor).

## License

Apache-2.0
