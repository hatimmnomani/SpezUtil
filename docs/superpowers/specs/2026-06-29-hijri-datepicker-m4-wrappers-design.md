# Hijri Datepicker M4 — React & Angular Wrappers

**Date:** 2026-06-29
**Status:** Approved (design)
**Scope:** Ship thin React and Angular wrapper packages around the existing `<hijri-datepicker>` Web Component, plus the small element changes needed to support framework property-binding.

## 1. Goal

Idiomatic, typed usage of the picker in React and Angular apps without duplicating logic. Wrappers
are thin: they map framework props ↔ element properties and the `change` event ↔ a typed callback.

## 2. Decisions

| Topic | Decision |
| --- | --- |
| React wrapper | `@lit/react` `createComponent` (adds `@lit/react` dep; `react`/`react-dom` as peers) |
| Angular wrapper | Standalone component built with **ng-packagr** (Angular Package Format) |
| API surface | Typed props mirroring element attributes + a typed `onChange(detail)` / `(change)` output |
| Element change | Add reflecting **property accessors** so framework property-bindings drive the element; export a typed `ChangeDetail` union from `@spezutil/hijri-datepicker` |

## 3. Why element changes are needed

`@lit/react` and Angular property bindings assign **DOM properties** (`el.value = x`), but the M0–M3
element only reads **attributes** via `getAttribute`. To make property assignment reactive, the
element gains getter/setter accessors that reflect to the corresponding attributes (so the existing
`observedAttributes` → `attributeChangedCallback` → render path still drives everything). This also
improves vanilla DX (`el.value = "2024-03-15"`).

Reflected properties (property → attribute):
`value→value`, `start→start`, `end→end`, `mode→mode`, `min→min`, `max→max`, `dir→dir`,
`timeFormat→time-format`, `disabledWeekdays→disabled-weekdays`, `enableTime→enable-time` (boolean).

## 4. Exported types (from `@spezutil/hijri-datepicker`)

```ts
export interface SingleChangeDetail { mode: "single"; hijri: HijriDate; gregorian: string; time?: Time; }
export interface RangeEndpoint { hijri: HijriDate; gregorian: string; }
export interface RangeChangeDetail { mode: "range"; start: RangeEndpoint | null; end: RangeEndpoint | null; }
export interface MultipleChangeDetail { mode: "multiple"; hijri: HijriDate[]; gregorian: string[]; }
export type ChangeDetail = SingleChangeDetail | RangeChangeDetail | MultipleChangeDetail;
```

## 5. Packages

### `@spezutil/hijri-datepicker-react`
- `createComponent({ tagName: "hijri-datepicker", elementClass: HijriDatepicker, react: React, events: { onChange: "change" } })`.
- Exports `HijriDatepicker` (the React component) + re-exports `ChangeDetail` and related types.
- deps: `@lit/react`; peers: `react`, `react-dom`, `@spezutil/hijri-datepicker`.
- Built with tsup (ESM+CJS+types), `react`/`react-dom`/`@lit/react`/the element externalized.
- Test (vitest + jsdom + @testing-library/react): renders with props, clicking a day fires
  `onChange` with a typed `single` detail; `value` prop drives the rendered selection.

### `@spezutil/hijri-datepicker-angular`
- Standalone `HijriDatepickerComponent` (selector `hijri-datepicker-ng`) with `CUSTOM_ELEMENTS_SCHEMA`.
- `@Input()`s mirror the reflected properties; `@Output() change = EventEmitter<ChangeDetail>` wired
  from the element's `change` event (`$event.detail`).
- Imports the element package for side-effect registration.
- deps/peers: `@angular/core`, `@angular/common`, `@spezutil/hijri-datepicker`.
- Built with **ng-packagr** (`ng-package.json`, `tsconfig.lib.json`, `public-api.ts`).
- Verification: ng-packagr build succeeds (AOT-compatible output). A TestBed render smoke test if the
  jsdom/zone setup is reasonable; otherwise build success + `tsc` is the gate (documented).

## 6. Non-goals (M4)
- Storybook stories for the wrappers (web-components Storybook can't host them cleanly; revisit with
  per-framework docs in M5).
- SSR-specific handling.
- npm publishing (M6).

## 7. Backward compatibility
- Property accessors are additive; attribute-only usage (M0–M3) is unchanged. Existing element tests
  must keep passing.
