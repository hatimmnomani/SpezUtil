# @spezutil/hijri-core

Zero-dependency Hijri (Fatimid/Bohra tabular) calendar engine: Hijri ↔ Gregorian conversion, month lengths, leap years, formatting/parsing, and localized month/weekday names.

Uses the arithmetic Misri calendar (30-year cycle, epoch JD 1948438.5) with an optional per-date corrections overlay. All conversions are UTC-based.

## Install

```sh
npm install @spezutil/hijri-core
```

## Usage

```ts
import { createCalendar, formatHijri } from "@spezutil/hijri-core";

const cal = createCalendar();

const hijri = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
// { year: 1448, month: 1, day: 22 }

const greg = cal.hijriToGregorian({ year: 1448, month: 1, day: 22 });

formatHijri(hijri, "D MMMM YYYY"); // "22 Moharram al-Haraam 1448"

cal.monthLength(1448, 1); // 30
cal.isLeapYear(1448);
```

Locale data: `translitMonthNames`, `arMonthNames`, `weekdayNames`, `arWeekdayNames`.

## Related packages

- [`@spezutil/hijri-datepicker`](https://www.npmjs.com/package/@spezutil/hijri-datepicker) — date picker Web Component
- [`@spezutil/hijri-calendar`](https://www.npmjs.com/package/@spezutil/hijri-calendar) — full calendar view Web Component

## Docs

https://hatimmnomani.github.io/SpezUtil/

## License

Apache-2.0
