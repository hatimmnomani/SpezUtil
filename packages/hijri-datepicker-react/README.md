# @spezutil/hijri-datepicker-react

React wrapper for [`@spezutil/hijri-datepicker`](https://www.npmjs.com/package/@spezutil/hijri-datepicker) — the Hijri-first (Fatimid/Bohra) date picker Web Component.

## Install

```sh
npm install @spezutil/hijri-datepicker-react
```

Requires `react` / `react-dom` >= 18.

## Usage

```tsx
import { HijriDatepicker, type ChangeDetail } from "@spezutil/hijri-datepicker-react";

export function Example() {
  return (
    <HijriDatepicker
      mode="range"
      start="2026-07-01"
      end="2026-07-10"
      onChange={(e) => console.log((e as CustomEvent<ChangeDetail>).detail)}
    />
  );
}
```

All element attributes are available as props (`value`, `mode`, `min`, `max`, `enableTime`, `timeFormat`, `dir`, `primary`, `secondaryPosition`, …). `change` is mapped to a typed `onChange`.

## Docs

https://hatimmnomani.github.io/SpezUtil/

## License

Apache-2.0
