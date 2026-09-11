---
title: API reference
---

# API reference

## Modes

Set with the `mode` attribute/property: `single` (default), `range`, or `multiple`.

## Attributes & properties

Every attribute has a matching reflected property (e.g. `el.value`, `el.enableTime`).

| Attribute | Property | Type | Applies to | Description |
| --- | --- | --- | --- | --- |
| `value` | `value` | ISO date, datetime, or comma list | single, multiple | Selected date; datetime when time enabled; comma-separated list in multiple mode. |
| `start` | `start` | ISO date | range | Range start. |
| `end` | `end` | ISO date | range | Range end. |
| `mode` | `mode` | single \| range \| multiple | all | Selection mode. |
| `min` | `min` | ISO date | all | Earliest selectable date. |
| `max` | `max` | ISO date | all | Latest selectable date. |
| `disabled-weekdays` | `disabledWeekdays` | comma list (0=Sun..6=Sat, UTC) | all | Disabled weekdays. |
| `enable-time` | `enableTime` | boolean | single | Show the time picker. |
| `time-format` | `timeFormat` | 12 \| 24 | single | Time display format. |
| `dir` | `dir` | ltr \| rtl | all | Text direction. |
| `primary` | `primary` | hijri \| gregorian | all | Which day number is prominent in cells (default `hijri`). |
| `secondary-position` | `secondaryPosition` | end \| start \| above \| below \| hidden | all | Where the secondary number sits (default `below`), or hide it. |
| `numerals` | `numerals` | latn \| arab | all | Digit system for Hijri numbers (day numbers, Hijri year). Default `arab` (Arabic-Indic). |
| `numerals-gregorian` | `numeralsGregorian` | latn \| arab | all | Digit system for Gregorian numbers (secondary day numbers, Gregorian year). Default `latn`. Month abbreviations stay Latin. |
| `names` | `names` | translit \| ar | all | Hijri month and weekday names, transliterated (default) or Arabic. |
| `weekday-format` | `weekdayFormat` | narrow \| short | all | Weekday header labels: `narrow` ("Su", default) or `short` ("Sun"). Arabic names drop the definite article in both. |

When the Gregorian month changes inside the grid, the first of the month is labelled with its abbreviated name (e.g. "1 Apr").

### Theming

All visual traits are `--dtp-*` custom properties on the host (defaults are the stock look):
`--dtp-bg`, `--dtp-fg`, `--dtp-muted`, `--dtp-accent`, `--dtp-accent-fg`, `--dtp-border`, `--dtp-radius`,
`--dtp-cell-radius`, `--dtp-width`, `--dtp-padding`, `--dtp-gap`, `--dtp-shadow`, `--dtp-font-family`,
`--dtp-font-family-display`, `--dtp-font-family-mono`, `--dtp-font-family-arabic`, `--dtp-header-bg`,
`--dtp-hover-bg`, `--dtp-title-font-size`, `--dtp-title-color`, `--dtp-title-weight`,
`--dtp-title-secondary-font-size`, `--dtp-title-secondary-color`, `--dtp-weekday-font-size`,
`--dtp-weekday-color`, `--dtp-weekday-font-family`, `--dtp-day-primary-font-size`, `--dtp-day-primary-color`,
`--dtp-day-primary-weight`, `--dtp-day-secondary-font-size`, `--dtp-day-secondary-color`,
`--dtp-day-secondary-font-family`, `--dtp-out-color`, `--dtp-out-opacity`, `--dtp-today-color`,
`--dtp-selected-bg`, `--dtp-selected-fg`, `--dtp-range-bg`, `--dtp-input-border`.
Parts: `calendar`, `header`, `title`, `title-primary`, `title-secondary`, `nav-prev`, `nav-next`, `weekday`,
`day`, `day-primary`, `day-secondary`, `time`.

### isDateDisabled (property only)

```ts
el.isDateDisabled = (hijri, gregorian) => gregorian.getUTCDay() === 5; // disable Fridays
```

## Events

The element fires a `change` `CustomEvent` whose `detail` depends on the mode:

```ts
// single
{ mode: "single"; hijri: HijriDate; gregorian: string; time?: { hour: number; minute: number } }
// range
{ mode: "range"; start: { hijri; gregorian } | null; end: { hijri; gregorian } | null }
// multiple
{ mode: "multiple"; hijri: HijriDate[]; gregorian: string[] }
```

## Theming

Style via CSS custom properties on the host:

| Variable | Purpose |
| --- | --- |
| `--dtp-bg` | Calendar background. |
| `--dtp-fg` | Foreground text. |
| `--dtp-muted` | Muted / secondary text. |
| `--dtp-accent` | Selection / range accent. |
| `--dtp-accent-fg` | Text on accent. |
| `--dtp-radius` | Corner radius. |

`::part()` hooks: `day`, `day-primary`, `day-secondary`, `nav-prev`, `nav-next`, `time`.

```css
hijri-datepicker {
  --dtp-accent: #7c3aed;
}
hijri-datepicker::part(day) {
  font-weight: 600;
}
```
