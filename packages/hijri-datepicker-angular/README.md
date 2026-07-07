# @spezutil/hijri-datepicker-angular

Angular wrapper for [`@spezutil/hijri-datepicker`](https://www.npmjs.com/package/@spezutil/hijri-datepicker) — the Hijri-first (Fatimid/Bohra) date picker Web Component. Standalone component, Angular >= 17.

## Install

```sh
npm install @spezutil/hijri-datepicker-angular @spezutil/hijri-datepicker
```

## Usage

```ts
import { Component } from "@angular/core";
import { HijriDatepickerComponent, type ChangeDetail } from "@spezutil/hijri-datepicker-angular";

@Component({
  standalone: true,
  imports: [HijriDatepickerComponent],
  template: `<hijri-datepicker-ng
    mode="single"
    value="2026-07-06"
    (change)="onChange($event)"
  ></hijri-datepicker-ng>`,
})
export class ExampleComponent {
  onChange(detail: ChangeDetail) {
    console.log(detail);
  }
}
```

Inputs mirror the element attributes (`value`, `mode`, `min`, `max`, `enableTime`, `timeFormat`, `dir`, `primary`, `secondaryPosition`, …); `(change)` emits the typed detail.

## Docs

https://hatimmnomani.github.io/SpezUtil/

## License

Apache-2.0
