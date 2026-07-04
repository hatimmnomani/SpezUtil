# Digital Takeoff UI Packages

Tree-shakeable, low-dependency UI packages for community software. Framework-agnostic
Web Components with optional React/Angular wrappers. Apache-2.0.

Currently focused on Dawoodi Bohra requirements; components are designed to extend to other
communities over time.

## Packages

| Package | Description |
| --- | --- |
| `@digitaltakeoff/hijri-core` | Zero-dependency Hijri (Fatimid/Bohra Misri) calendar engine. |
| `@digitaltakeoff/hijri-datepicker` | `<hijri-datepicker>` Web Component — Hijri primary, Gregorian secondary. |
| `@digitaltakeoff/hijri-datepicker-react` | React wrapper (`@lit/react`) with typed props + `onChange`. |
| `@digitaltakeoff/hijri-datepicker-angular` | Angular standalone component wrapper. |

## Quick start (Web Component)

```html
<script type="module">
  import "@digitaltakeoff/hijri-datepicker";
</script>

<hijri-datepicker value="2024-03-15" min="2024-01-01" max="2024-12-31"></hijri-datepicker>

<script>
  document.querySelector("hijri-datepicker")
    .addEventListener("change", (e) => console.log(e.detail.hijri, e.detail.gregorian));
</script>
```

### Modes

```html
<!-- range -->
<hijri-datepicker mode="range" start="2024-03-10" end="2024-03-18"></hijri-datepicker>

<!-- multiple -->
<hijri-datepicker mode="multiple" value="2024-03-05,2024-03-12"></hijri-datepicker>

<!-- single with time -->
<hijri-datepicker value="2024-03-15" enable-time time-format="12"></hijri-datepicker>
```

### React

```tsx
import { HijriDatepicker, type ChangeDetail } from "@digitaltakeoff/hijri-datepicker-react";

<HijriDatepicker
  mode="range"
  start="2024-03-10"
  end="2024-03-18"
  onChange={(e) => console.log((e as CustomEvent<ChangeDetail>).detail)}
/>;
```

### Angular

```ts
import { HijriDatepickerComponent } from "@digitaltakeoff/hijri-datepicker-angular";

// Add HijriDatepickerComponent to a standalone component's `imports`, then in the template:
// <hijri-datepicker-ng mode="multiple" value="2024-03-05,2024-03-12"
//   (change)="onChange($event)"></hijri-datepicker-ng>
```

## Quick start (engine only)

```ts
import { createCalendar, formatHijri } from "@digitaltakeoff/hijri-core";

const cal = createCalendar();
const hijri = cal.gregorianToHijri(new Date(Date.UTC(2024, 2, 15)));
console.log(formatHijri(hijri, "D MMMM YYYY"));
```

## Calendar accuracy

The engine uses the fixed tabular Fatimid/Misri algorithm (30-year cycle; leap years at
positions 2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29; odd months 30 days, even 29, Zilhaj 30 in
leap years), calibrated against authoritative anchor dates. A pluggable correction layer
(`corrections.json`, keyed by Gregorian ISO date) allows overrides where needed.

## Develop

```bash
pnpm install
pnpm build
pnpm test
pnpm --filter @digitaltakeoff/storybook dev   # component playground at http://localhost:6006
```

## Documentation

The docs site (Docusaurus) lives in `apps/docs`:

```bash
pnpm --filter @digitaltakeoff/docs dev     # local docs at http://localhost:3000
pnpm --filter @digitaltakeoff/docs build   # static build in apps/docs/build
```

It is deployed to GitHub Pages by `.github/workflows/docs.yml` on pushes to `main`.

## Status

Milestone M0–M5 complete: monorepo, `hijri-core` engine, `<hijri-datepicker>` (single/range/multiple
+ time), React + Angular wrappers, and a Docusaurus docs site with live demos. The npm release
pipeline (Changesets) is the remaining planned milestone.

## License

Apache-2.0
