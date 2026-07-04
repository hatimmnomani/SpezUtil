---
title: Getting started
---

# Getting started

## Vanilla JS

```html
<script type="module">
  import "@digitaltakeoff/hijri-datepicker";
</script>

<hijri-datepicker value="2024-03-15" min="2024-01-01" max="2024-12-31"></hijri-datepicker>

<script>
  document.querySelector("hijri-datepicker").addEventListener("change", (e) => {
    console.log(e.detail); // { mode: "single", hijri, gregorian }
  });
</script>
```

## React

```tsx
import { HijriDatepicker, type ChangeDetail } from "@digitaltakeoff/hijri-datepicker-react";

export function Example() {
  return (
    <HijriDatepicker
      mode="range"
      start="2024-03-10"
      end="2024-03-18"
      onChange={(e) => console.log((e as CustomEvent<ChangeDetail>).detail)}
    />
  );
}
```

## Angular

```ts
import { Component } from "@angular/core";
import { HijriDatepickerComponent, type ChangeDetail } from "@digitaltakeoff/hijri-datepicker-angular";

@Component({
  standalone: true,
  imports: [HijriDatepickerComponent],
  template: `<hijri-datepicker-ng mode="multiple" value="2024-03-05,2024-03-12"
    (change)="onChange($event)"></hijri-datepicker-ng>`,
})
export class ExampleComponent {
  onChange(detail: ChangeDetail) {
    console.log(detail);
  }
}
```

See [Recipes](/datepicker/recipes) for live demos and the [API reference](/datepicker/api).
