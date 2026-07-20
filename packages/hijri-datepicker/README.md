# @spezutil/hijri-datepicker

Hijri-first date picker Web Component (Fatimid/Bohra calendar) with Gregorian dates as the secondary label. Zero dependencies beyond `@spezutil/hijri-core`, framework-agnostic, Shadow DOM.

- Modes: `single`, `range` (with hover preview), `multiple`
- Optional time picker (12/24h)
- `min`/`max`, disabled weekdays, custom `isDateDisabled`
- `primary="hijri|gregorian"` + `secondary-position` to control which numeral is prominent
- Abbreviated month marker ("1 Apr") when the Gregorian month changes mid-grid
- Keyboard navigation, ARIA grid semantics, RTL

React wrapper: [`@spezutil/hijri-datepicker-react`](https://www.npmjs.com/package/@spezutil/hijri-datepicker-react) · Angular wrapper: [`@spezutil/hijri-datepicker-angular`](https://www.npmjs.com/package/@spezutil/hijri-datepicker-angular)

## Install

```sh
npm install @spezutil/hijri-datepicker
```

## Usage

```html
<script type="module">
  import "@spezutil/hijri-datepicker";
</script>

<hijri-datepicker value="2026-07-06" min="2026-01-01" max="2026-12-31"></hijri-datepicker>

<script>
  document.querySelector("hijri-datepicker").addEventListener("change", (e) => {
    console.log(e.detail); // { mode: "single", hijri: {...}, gregorian: "2026-07-06" }
  });
</script>
```

"Today" (initial view, keyboard "go to today") resolves against the viewer's local timezone by default — set `timezone="Asia/Kolkata"` (IANA name) to pin it to a fixed zone regardless of viewer location.

Range mode:

```html
<hijri-datepicker mode="range" start="2026-07-01" end="2026-07-10"></hijri-datepicker>
```

## Theming

```css
hijri-datepicker {
  --dtp-accent: #7c3aed;
  --dtp-radius: 12px;
}
hijri-datepicker::part(day) { font-weight: 600; }
```

### Arabic font

The [Amiri](https://github.com/aliftype/amiri) typeface is embedded (base64, no files to host) and used by default for Hijri numerals, weekday labels, and the title. Amiri is © its authors, redistributed under the [SIL Open Font License 1.1](https://openfontlicense.org/) — the license text ships in this repository at `assets/fonts/OFL-Amiri.txt`.

Swap in any font by overriding the CSS custom properties (load the font yourself via `@font-face` or a font service):

```css
hijri-datepicker {
  --dtp-font-family-arabic: "My Custom Arabic Font", serif; /* numerals, Arabic text */
  --dtp-font-family: "Inter", system-ui, sans-serif;        /* everything else */
}
```

## Docs

Full API, recipes, and live demos: https://hatimmnomani.github.io/SpezUtil/

## License

Apache-2.0
