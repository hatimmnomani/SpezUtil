# Digital Takeoff UI Packages — Design Spec

**Date:** 2026-06-25
**Status:** Approved (design); pending spec review
**Scope:** Monorepo foundation + Hijri date picker (first component)

## 1. Goal

Build a public, open-source set of tree-shakeable UI packages under the **Digital Takeoff**
brand. Packages serve community-software needs (initially Dawoodi Bohra requirements) and are
designed to extend to other communities later. The first component is a feature-rich Hijri date
picker (Flatpickr-class) where **Hijri is the primary date and Gregorian is secondary**.

### Principles
- Minimal dependencies. Zero runtime deps in the core engine and the Web Component.
- Framework-agnostic core, usable from vanilla JS, React, and Angular.
- Per-export tree shaking (`"sideEffects": false`, ESM + CJS + types).
- Public repo: no sensitive or bulk-copied third-party data. Only derived facts.

## 2. Key Decisions

| Decision | Choice |
|---|---|
| Calendar engine | Tabular arithmetic algorithm + pluggable hand-verified correction table |
| Framework strategy | Web Component core + thin React/Angular wrappers |
| Monorepo tooling | pnpm workspaces + Turborepo |
| Build | tsup (ESM+CJS+types per package) |
| Test | vitest (engine units + jsdom component tests) |
| Docs | Docusaurus (guides/landing) + Storybook (live component playground) |
| Versioning/publish | Changesets |
| CI | GitHub Actions (lint/test/build) |
| npm scope | `@spezutil/*` |
| License | Apache-2.0 |
| i18n (v1) | English UI + Arabic Hijri month names + transliteration, RTL-aware |

## 3. Repository Layout

```
db-software-packages/
├── packages/
│   ├── hijri-core/                 # zero-dep engine (logic only, no DOM)
│   ├── hijri-datepicker/           # <hijri-datepicker> Web Component (zero runtime deps)
│   ├── hijri-datepicker-react/     # thin React wrapper
│   └── hijri-datepicker-angular/   # thin Angular wrapper
├── apps/
│   ├── storybook/                  # live component playground (a11y addon)
│   └── docs/                       # Docusaurus site
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .changeset/
├── .github/workflows/ci.yml
├── LICENSE                         # Apache-2.0
└── README.md
```

## 4. `@spezutil/hijri-core` — Engine

Pure functions. No dependencies. No DOM access.

### Public API (initial)
- `gregorianToHijri(date: Date): HijriDate`
- `hijriToGregorian(h: HijriDate): Date`
- `createCalendar(options: CalendarOptions): HijriCalendar`
- `formatHijri(h: HijriDate, pattern: string, locale?: Locale): string`
- `parseHijri(input: string, pattern: string): HijriDate`
- Locale data exports: `arMonthNames`, `translitMonthNames`, weekday names

### Types
```ts
interface HijriDate { year: number; month: number /* 1-12 */; day: number; }
interface CalendarOptions {
  variant?: 'bohra';                 // hook for future communities
  corrections?: CorrectionProvider;  // optional override layer
}
interface CorrectionProvider {
  // returns adjusted gregorian offset (days) or month-length overrides for a given hijri key
  correct(h: HijriDate): HijriDate | null;
}
```

### Algorithm
- Tabular Islamic arithmetic: 30-year leap cycle; odd months 30 days, even months 29,
  last month 30 in leap years.
- Epoch calibrated against known anchor dates verified from mumineencalendar.com.
- **Correction layer**: `corrections.json` ships a small set of hand-verified date overrides
  (derived facts only — specific date → corrected Hijri value). Engine is correct standalone;
  corrections layer on top when the tabular result deviates from the authoritative source.
  Provider is pluggable so the dataset can grow without code changes.

### Testing
- Unit tests (vitest) round-trip greg↔hijri across a wide year range.
- Anchor-date tests: a fixture of verified greg/hijri pairs must all pass.
- Correction-layer tests: with and without the override dataset.

## 5. `@spezutil/hijri-datepicker` — Web Component

Custom element `<hijri-datepicker>`. Zero runtime deps. Imports `hijri-core`.

### Display
- Month grid. Each day cell shows **Hijri primary (large), Gregorian secondary (small)**.
- Header: Hijri month/year navigation, "Today", optional Gregorian sub-label.

### Features
- Modes: `single` | `range` | `multiple`
- Time picker (hour/minute) — optional, attribute-gated
- Constraints: `min`, `max`, disabled dates, disabled weekdays, custom predicate function
- Keyboard navigation, ARIA roles/labels, focus management
- RTL support; Arabic + transliterated month names
- Hidden-input binding for vanilla `<form>` submission
- Events: `change`, `input` (CustomEvent with detail payload)
- Styling: CSS custom properties + `::part()` selectors

### API surface
- Attributes/properties: `value`, `mode`, `min`, `max`, `disabled-dates`, `disabled-weekdays`,
  `enable-time`, `locale`, `dir`, `inline`
- Property `isDateDisabled?: (date) => boolean` for custom predicates

## 6. Wrappers

- `@spezutil/hijri-datepicker-react` — thin wrapper mapping props↔attributes/properties
  and DOM events↔callbacks (`onChange`, `onInput`). No logic duplication.
- `@spezutil/hijri-datepicker-angular` — Angular component/directive binding
  inputs↔properties and `@Output()`↔events. `CUSTOM_ELEMENTS_SCHEMA` friendly.

## 7. Docs & Showcase

- **Storybook**: stories per mode/feature, a11y addon, controls for live props.
- **Docusaurus**: getting-started, per-framework integration guides, calendar-engine
  explanation, API reference. Links/embeds Storybook for live demos.

## 8. Build / Release

- tsup per package → ESM + CJS + `.d.ts`, `"sideEffects": false`.
- Turborepo pipeline: `build`, `test`, `lint`, `dev`.
- Changesets for semver + npm publishing.
- GitHub Actions CI: install → lint → test → build on PR/push.

## 9. Milestones (phasing)

Spec covers full feature set; implementation is phased to ship early.

1. **M0** — Monorepo skeleton (pnpm, turbo, tsconfig, license, CI shell).
2. **M1** — `hijri-core` engine + anchor/round-trip tests.
3. **M2** — `hijri-datepicker` Web Component, single-date mode + constraints + Storybook.
4. **M3** — Range, multi-date, time picker.
5. **M4** — React + Angular wrappers.
6. **M5** — Docusaurus site.
7. **M6** — Changesets release flow, first npm publish.

## 10. Non-Goals (v1)
- Full multi-language i18n framework (only EN UI + Arabic month names for v1).
- Astronomical/sighting-based calendar computation.
- Other communities' calendar variants (architecture leaves the `variant` hook; not implemented).
