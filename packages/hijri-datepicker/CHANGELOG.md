# @spezutil/hijri-datepicker

## 0.2.1

### Patch Changes

- Fix "today"/"now" resolving against UTC instead of the viewer's local timezone, which could highlight the wrong day, jump the Today button to the wrong day, and misplace the current-time indicator near local midnight. `<hijri-calendar>` and `<hijri-datepicker>` now default to the viewer's local timezone and accept an optional `timezone` attribute/property (IANA name) to pin resolution to a fixed zone. Also fixes event date strings carrying an explicit UTC offset/`Z` suffix being misparsed as bare wall-clock values.
- Updated dependencies
  - @spezutil/hijri-core@0.1.3
  - @spezutil/hijri-view-core@0.1.3

## 0.2.0

### Minor Changes

- 0534a7a: Replace the embedded Al-Kanz Arabic font with Amiri (SIL Open Font License 1.1).

  Al-Kanz was removed because no redistribution license exists for it. Amiri is
  OFL-1.1 licensed, which permits embedding and redistribution; the license text
  ships in the repository at `assets/fonts/OFL-Amiri.txt`.

  The default value of the Arabic font CSS custom properties
  (`--hcal-font-family-arabic`, `--dtp-font-family-arabic`,
  `--rte-font-family-arabic`, `--rte-font-family`) changes from `"Al-Kanz", …` to
  `"Amiri", …`. Consumers who relied on the embedded Al-Kanz should load their own
  licensed copy and override the custom property.

## 0.1.3

### Patch Changes

- Regenerate the embedded Al-Kanz font module with typed exports for smaller declaration output.

## 0.1.0

### Minor Changes

- Initial public release: zero-dependency Hijri (Fatimid/Bohra Misri) calendar engine, the
  `<hijri-datepicker>` Web Component (single/range/multiple selection + single-mode time picker), and
  React + Angular wrappers.

### Patch Changes

- Updated dependencies
  - @spezutil/hijri-core@0.1.0
