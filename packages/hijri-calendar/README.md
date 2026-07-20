# @spezutil/hijri-calendar

Hijri-first interactive calendar view Web Component (Fatimid/Bohra calendar) — the Google-Calendar-style companion to [`@spezutil/hijri-datepicker`](https://www.npmjs.com/package/@spezutil/hijri-datepicker). Gregorian dates shown as the secondary label.

- Views: **month**, **week**, **day** (time grids), **agenda**
- Controlled event data: pass an `events` array, listen for `event-click`, `date-click`, `slot-click`, `more-click`, `view-change`, `date-change`
- Multi-day event spanning, per-event colors, "+N more" overflow, current-time indicator
- `locale="translit|ar"`, RTL, keyboard-navigable grid, ARIA semantics
- `primary="hijri|gregorian"` + `secondary-position` to control numeral prominence/placement
- Theming via `--hcal-*` CSS custom properties and `::part()` hooks

React wrapper: [`@spezutil/hijri-calendar-react`](https://www.npmjs.com/package/@spezutil/hijri-calendar-react) · Angular wrapper: [`@spezutil/hijri-calendar-angular`](https://www.npmjs.com/package/@spezutil/hijri-calendar-angular)

## Install

```sh
npm install @spezutil/hijri-calendar
```

## Usage

```html
<script type="module">
  import "@spezutil/hijri-calendar";
</script>

<hijri-calendar view="month" date="2026-07-06"></hijri-calendar>

<script>
  const cal = document.querySelector("hijri-calendar");
  cal.events = [
    { id: "1", title: "Design review", start: "2026-07-06T10:00", end: "2026-07-06T11:30", color: "#1a73e8" },
    { id: "2", title: "Conference", start: "2026-07-08", end: "2026-07-10" }, // all-day, end inclusive
  ];
  cal.addEventListener("event-click", (e) => console.log(e.detail.event));
  cal.addEventListener("slot-click", (e) => console.log(e.detail.gregorian)); // "2026-07-06T09:30"
</script>
```

Events use Gregorian ISO strings on the wire; every emitted detail carries both the Hijri and Gregorian date. `start`/`end` strings without an offset are treated as wall-clock values (matching the grid's own day/time layout); "today" and the current-time indicator resolve against the viewer's local timezone by default — set the `timezone` attribute/property (IANA name, e.g. `timezone="Asia/Kolkata"`) to pin them to a fixed zone regardless of viewer location.

## Theming

```css
hijri-calendar {
  --hcal-accent: #7c3aed;
  --hcal-radius: 14px;
}
hijri-calendar::part(event) { border-radius: 999px; }
```

### Arabic font

The [Amiri](https://github.com/aliftype/amiri) typeface is embedded (base64, no files to host) and used by default for Hijri numerals, weekday labels, and the month title. Amiri is © its authors, redistributed under the [SIL Open Font License 1.1](https://openfontlicense.org/) — the license text ships in this repository at `assets/fonts/OFL-Amiri.txt`.

Swap in any font by overriding the CSS custom properties (load the font yourself via `@font-face` or a font service):

```css
hijri-calendar {
  --hcal-font-family-arabic: "My Custom Arabic Font", serif; /* numerals, Arabic text */
  --hcal-font-family: "Inter", system-ui, sans-serif;        /* everything else */
}
```

## Docs

Full API, recipes, and live demos: https://hatimmnomani.github.io/SpezUtil/

## License

Apache-2.0
