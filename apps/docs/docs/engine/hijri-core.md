---
title: hijri-core engine
---

# hijri-core

`@digitaltakeoff/hijri-core` is the zero-dependency calendar engine behind the picker. Use it
directly for conversions and formatting.

```ts
import { createCalendar, formatHijri, parseHijri } from "@digitaltakeoff/hijri-core";

const cal = createCalendar();
const h = cal.gregorianToHijri(new Date(Date.UTC(2024, 2, 15)));
formatHijri(h, "D MMMM YYYY"); // e.g. "5 Ramadan al-Moazzam 1445"
cal.hijriToGregorian(h); // back to a Date
```

## The Misri / Fatimid algorithm

The Dawoodi Bohra calendar is a fixed **tabular** calendar, fully determined by a leap-year cycle and
an epoch:

- 30-year cycle with leap years at positions **2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29**.
- Odd months are 30 days, even months 29; in a leap year the 12th month (Zilhaj) has 30 days.
- Epoch: 1 Muharram, year 1 corresponds to 15 July 622 CE, calibrated against authoritative anchor
  dates (Lokhandwala Misri conversion tables).

## Correction layer

`createCalendar({ corrections })` accepts overrides keyed by Gregorian ISO date, layered on top of
the tabular result for any date that must match an authoritative source exactly:

```ts
const cal = createCalendar({
  corrections: { "2024-01-15": { year: 1445, month: 7, day: 3 } },
});
```

## Formatting tokens

`formatHijri` supports `YYYY`, `MMMM` (month name), `MM`, `M`, `DD`, `D`. `parseHijri` parses the
numeric tokens (`YYYY`, `MM`, `DD`).
