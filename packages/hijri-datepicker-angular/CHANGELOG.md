# @spezutil/hijri-datepicker-angular

## 0.1.4

### Patch Changes

- Fix "today"/"now" resolving against UTC instead of the viewer's local timezone, which could highlight the wrong day, jump the Today button to the wrong day, and misplace the current-time indicator near local midnight. `<hijri-calendar>` and `<hijri-datepicker>` now default to the viewer's local timezone and accept an optional `timezone` attribute/property (IANA name) to pin resolution to a fixed zone. Also fixes event date strings carrying an explicit UTC offset/`Z` suffix being misparsed as bare wall-clock values.

## 0.1.3

### Patch Changes

- Widen the Web Component peer dependency range to `>=0.1.0 <2.0.0` so the
  wrapper installs cleanly alongside 0.2.x (and later 0.x) component releases.

## 0.1.0

### Minor Changes

- Initial public release: zero-dependency Hijri (Fatimid/Bohra Misri) calendar engine, the
  `<hijri-datepicker>` Web Component (single/range/multiple selection + single-mode time picker), and
  React + Angular wrappers.

### Patch Changes

- Updated dependencies
  - @spezutil/hijri-datepicker@0.1.0
