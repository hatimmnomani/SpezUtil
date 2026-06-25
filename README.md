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

## Status

Milestone M0–M2 complete: monorepo, `hijri-core` engine, single-date `<hijri-datepicker>`
(range/multi/time, React/Angular wrappers, Docusaurus, and the npm release pipeline are planned
follow-on milestones).

## License

Apache-2.0
