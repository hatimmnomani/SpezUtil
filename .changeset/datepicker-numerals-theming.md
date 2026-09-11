---
"@spezutil/hijri-datepicker": minor
"@spezutil/hijri-datepicker-react": patch
"@spezutil/hijri-datepicker-angular": minor
---

`<hijri-datepicker>` gains `numerals="arab" | "latn"` (**default now `arab`** — Hijri day numbers and the Hijri year render in Arabic-Indic digits; set `numerals="latn"` for the previous Latin look), `numerals-gregorian` (default `latn`), `names="translit" | "ar"` (Arabic month/weekday names) and `weekday-format="narrow" | "short"`. Every visual trait is now a `--dtp-*` custom property with the stock value as default (`--dtp-border`, `--dtp-width`, `--dtp-hover-bg`, title/weekday/day-number size+colour tokens, selected/range/today colours, `--dtp-font-family` which was referenced but never declared), and the header/title/weekday elements expose `::part()` names (`calendar`, `header`, `title`, `title-primary`, `title-secondary`, `weekday`).
