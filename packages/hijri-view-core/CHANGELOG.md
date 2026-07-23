# @spezutil/hijri-view-core

## 0.1.4

### Patch Changes

- Add `eventFields` mapping so hosts whose event objects use different field names (e.g. `start_at` instead of `start`) don't need to pre-map their data by hand — `<hijri-calendar>` does the renaming itself, and the original object is still passed through as `event.data`. Also fixes a silent-failure trap: an event with a missing or unparseable `start` now emits a `console.warn` (once per event) instead of just vanishing with no error.

## 0.1.3

### Patch Changes

- Fix "today"/"now" resolving against UTC instead of the viewer's local timezone, which could highlight the wrong day, jump the Today button to the wrong day, and misplace the current-time indicator near local midnight. `<hijri-calendar>` and `<hijri-datepicker>` now default to the viewer's local timezone and accept an optional `timezone` attribute/property (IANA name) to pin resolution to a fixed zone. Also fixes event date strings carrying an explicit UTC offset/`Z` suffix being misparsed as bare wall-clock values.
- Updated dependencies
  - @spezutil/hijri-core@0.1.3
