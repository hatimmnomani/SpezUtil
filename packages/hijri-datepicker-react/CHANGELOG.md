# @spezutil/hijri-datepicker-react

## 0.1.4

### Patch Changes

- bab7db2: `<hijri-datepicker>` gains `numerals="arab" | "latn"` (**default now `arab`** — Hijri day numbers and the Hijri year render in Arabic-Indic digits; set `numerals="latn"` for the previous Latin look), `numerals-gregorian` (default `latn`), `names="translit" | "ar"` (Arabic month/weekday names) and `weekday-format="narrow" | "short"`. Every visual trait is now a `--dtp-*` custom property with the stock value as default (`--dtp-border`, `--dtp-width`, `--dtp-hover-bg`, title/weekday/day-number size+colour tokens, selected/range/today colours, `--dtp-font-family` which was referenced but never declared), and the header/title/weekday elements expose `::part()` names (`calendar`, `header`, `title`, `title-primary`, `title-secondary`, `weekday`).
- Updated dependencies [9691578]
- Updated dependencies [bab7db2]
  - @spezutil/hijri-datepicker@0.3.0

## 0.1.3

### Patch Changes

- Updated dependencies [0534a7a]
  - @spezutil/hijri-datepicker@0.2.0

## 0.1.0

### Minor Changes

- Initial public release: zero-dependency Hijri (Fatimid/Bohra Misri) calendar engine, the
  `<hijri-datepicker>` Web Component (single/range/multiple selection + single-mode time picker), and
  React + Angular wrappers.

### Patch Changes

- Updated dependencies
  - @spezutil/hijri-datepicker@0.1.0
