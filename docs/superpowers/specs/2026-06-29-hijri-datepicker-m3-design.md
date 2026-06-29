# Hijri Datepicker M3 — Range, Multi-date, Time Picker

**Date:** 2026-06-29
**Status:** Approved (design)
**Scope:** Extend `@digitaltakeoff/hijri-datepicker` with range, multiple-date, and time-picker modes. No new packages.

## 1. Goal

Bring the picker toward Flatpickr parity by adding selection modes and time. Single-date behavior
(M2) stays fully backward-compatible.

## 2. Decisions

| Topic | Decision |
| --- | --- |
| Mode switch | `mode` attribute: `single` (default) \| `range` \| `multiple` |
| Single value | `value` attribute (ISO date, or ISO datetime when time enabled) — unchanged |
| Range value | `start` + `end` attributes (ISO dates) |
| Multiple value | `value` attribute = comma-separated ISO date list |
| Range UX | Two-click (start, then end) with live hover preview of the in-between band; a click after a complete range restarts |
| Time picker | `enable-time` boolean attr; `time-format="12"\|"24"` (default `24`); hour+minute steppers, AM/PM when 12h |
| Time + modes | Time supported only in `single` mode for M3; ignored in range/multiple |
| `change` detail | Always includes `mode`; shape varies per mode (see §5) |

## 3. Files

- Modify `src/render.ts` — extend `DayCell` (`rangeStart`, `rangeEnd`, `inRange`) and `BuildOptions`
  (`rangeStart`, `rangeEnd`, `hoverDate`, `selectedList`); compute the flags.
- Create `src/selection.ts` (pure) — value encode/decode per mode, range normalization. Keeps the
  element class focused on DOM + state.
- Create `src/time.ts` (pure) — parse/format clock time, 12/24h + AM/PM, combine date+time ISO.
- Modify `src/hijri-datepicker.ts` — `mode` state machine, range hover painting, time-picker render
  + wiring, unified `change` event.
- Modify `src/styles.ts` — range band highlight, time-picker row.
- Modify `apps/storybook/stories/hijri-datepicker.stories.ts` — Range, Multiple, WithTime stories.
- Tests alongside each module.

## 4. Behavior

### Range
- First click sets `start`, clears `end`. Hovering a later in-month cell previews the band
  (`inRange`) up to the hovered cell (effective end = `end ?? hoverDate`).
- Second click sets `end` (normalized so start ≤ end by Gregorian time). Emits `change`.
- A click when both `start` and `end` are set restarts (new `start`, `end` cleared).
- Disabled cells are not selectable as endpoints.

### Multiple
- Click toggles a date in/out of the selected list. Each toggle emits `change` with the full list.
- `value` reflects the sorted comma-separated ISO list.

### Time (single mode only)
- When `enable-time`, a time row shows below the grid: hour + minute steppers; when
  `time-format="12"`, hours render 1–12 with an AM/PM toggle; otherwise 0–23.
- Selecting a day or changing time updates `value` to `YYYY-MM-DDTHH:mm` and emits `change`.

## 5. `change` event detail

```ts
// single
{ mode: "single", hijri: HijriDate, gregorian: string /* ISO date or datetime */, time?: { hour: number; minute: number } }
// range
{ mode: "range", start: { hijri: HijriDate; gregorian: string } | null,
                  end:   { hijri: HijriDate; gregorian: string } | null }
// multiple
{ mode: "multiple", hijri: HijriDate[], gregorian: string[] }
```

## 6. Accessibility
- Range endpoints get `aria-selected="true"`; in-range cells get `aria-current="false"` and a
  visual band only (not announced as selected). Multiple-selected cells get `aria-selected="true"`.
- Time steppers are `<input type="number">` with labels; AM/PM is a labelled toggle button with
  `aria-pressed`.
- Keyboard day navigation (M2 roving tabindex) unchanged; Enter/Space select per current mode.

## 7. Non-goals (M3)
- Time in range/multiple modes.
- Seconds.
- Preset ranges / shortcuts.
- Multiple-month side-by-side view.

## 8. Backward compatibility
- Default `mode="single"` reproduces M2 exactly. Existing `value`, `min`, `max`,
  `disabled-weekdays`, `dir`, `isDateDisabled` keep working in all modes.
