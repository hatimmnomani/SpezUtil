# @spezutil/hijri-calendar

Hijri-first interactive calendar view Web Component (Fatimid/Bohra calendar) — the Google-Calendar-style companion to [`@spezutil/hijri-datepicker`](https://www.npmjs.com/package/@spezutil/hijri-datepicker). Gregorian dates shown as the secondary label.

- Views: **month**, **week**, **day** (time grids), **agenda**; `views` + `toolbar="none"` to pick which view buttons render or drive the toolbar from the host entirely
- Controlled event data: pass an `events` array, listen for `event-click`, `date-click`, `slot-click`, `more-click`, `view-change`, `date-change`, `range-change`
- `range-change` tells you the visible date range so you can fetch only what's on screen — see [Fetching events for the visible range](#fetching-events-for-the-visible-range)
- Multi-day event spanning, per-event colors/`subtitle`/`tag`/`variant`, `durationMinutes`, "+N more" overflow, current-time indicator (optionally labelled)
- Three event chip/block styles (`event-style="solid|tinted|outline"`) and configurable time text (`event-time`); **note:** the default `event-style` stays `"solid"` through 0.3.x and becomes `"tinted"` at 1.0 — see [Theming](#theming)
- `locale="translit|ar"` for UI chrome, `names="translit|ar"` for Hijri month/weekday names (independently), `numerals`/`numerals-gregorian` for Arabic-Indic vs. Latin digits (see the [API reference](https://hatimmnomani.github.io/SpezUtil/calendar/api) for the full numerals truth table), RTL, keyboard-navigable grid, ARIA semantics
- `primary="hijri|gregorian"` + `secondary-position` to control numeral prominence/placement; `weekday-format="bilingual"`, `day-number-align`, `month-marker`, `today-marker` for further structural control
- `weekend-days` for a non-Sat/Sun weekend (e.g. `weekend-days="5 6"` for Fri/Sat)
- `renderEvent` / `renderDayCell` render hooks for fully custom chip/block/agenda-item and day-number content, without losing the component's ARIA/keyboard/click handling
- `day-header="banner"` day-view banner with an "N events · X hours scheduled" summary; `loading` boolean for a busy overlay
- **Responsive by host width, not viewport:** the component measures its own width with a `ResizeObserver` and adapts (toolbar wrapping, cell sizing, month dot-mode vs. horizontal scroll, sticky time gutter) at fixed `wide`/`medium`/`narrow` bands — see [Responsive](#responsive)
- Theming via `--hcal-*` CSS custom properties and `::part()` hooks

React wrapper: [`@spezutil/hijri-calendar-react`](https://www.npmjs.com/package/@spezutil/hijri-calendar-react) · Angular wrapper: [`@spezutil/hijri-calendar-angular`](https://www.npmjs.com/package/@spezutil/hijri-calendar-angular)

## Install

```sh
npm install @spezutil/hijri-calendar
```

## Usage

```html
<script type="module">
  import "@spezutil/hijri-calendar";
</script>

<hijri-calendar view="month" date="2026-07-06"></hijri-calendar>

<script>
  const cal = document.querySelector("hijri-calendar");
  cal.events = [
    { id: "1", title: "Design review", start: "2026-07-06T10:00", end: "2026-07-06T11:30", color: "#1a73e8" },
    { id: "2", title: "Conference", start: "2026-07-08", end: "2026-07-10" }, // all-day, end inclusive
  ];
  cal.addEventListener("event-click", (e) => console.log(e.detail.event));
  cal.addEventListener("slot-click", (e) => console.log(e.detail.gregorian)); // "2026-07-06T09:30"
</script>
```

Events use Gregorian ISO strings on the wire; every emitted detail carries both the Hijri and Gregorian date. `start`/`end` strings without an offset are treated as wall-clock values (matching the grid's own day/time layout); "today" and the current-time indicator resolve against the viewer's local timezone by default — set the `timezone` attribute/property (IANA name, e.g. `timezone="Asia/Kolkata"`) to pin them to a fixed zone regardless of viewer location.

### Mapping your own event shape

If your data doesn't use `start`/`end`/etc. field names, set `eventFields` instead of pre-mapping every event by hand — omitted keys default to the same-named field, and the original object is still passed back as `event.data` in click handlers:

```js
cal.eventFields = { start: "start_at", end: "end_at" };
cal.events = apiResponse; // objects have start_at/end_at, not start/end
```

Each field can also be a **function** over the raw object, for values that need deriving rather than renaming — e.g. mapping a backend `event_type` enum onto a chip color:

```js
const TONES = { standing: "#2F6E54", executive: "#D62246", assign: "#B47A18" };

cal.eventFields = {
  start: "start_at",
  end: "end_at",
  color: (raw) => TONES[raw.event_type] ?? "#9A8E85",
  variant: (raw) => raw.status, // e.g. "draft" -> part="event variant-draft"
};
```

### Fetching events for the visible range

`cal.events` is host-controlled — the component never fetches on its own. Listen for
`range-change` to know exactly which dates are on screen and fetch only that window, instead of
an unfiltered or fixed-page list:

```js
cal.addEventListener("range-change", (e) => {
  const { start, end } = e.detail; // "yyyy-mm-dd", end exclusive
  fetchEvents(start, end).then((events) => (cal.events = events));
});
```

The component fires exactly one `range-change` (`reason: "init"`) synchronously inside
`connectedCallback()`, **before** a listener attached after `appendChild` (which includes every
React/Angular wrapper host — `@lit/react`'s `createComponent` wires listeners in a
`useLayoutEffect` that runs after `connectedCallback` has already completed) can hear it. Read the
`cal.visibleRange` property once for that first fetch, then rely on the event for everything after
(navigation, view switches, `date`/`view` changes):

```js
if (cal.visibleRange) fetchEvents(cal.visibleRange.start, cal.visibleRange.end).then((e) => (cal.events = e));
cal.addEventListener("range-change", (e) => {
  fetchEvents(e.detail.start, e.detail.end).then((events) => (cal.events = events));
});
```

The component never debounces or coalesces `range-change` itself — rapid prev/next fires one
event per click by design. Key your query by `{start, end}` and let your data layer (e.g. TanStack
Query's `queryKey` + `keepPreviousData`) dedupe/coalesce instead. Full contract:
[API reference](https://hatimmnomani.github.io/SpezUtil/calendar/api#range-change-contract).

## Theming

```css
hijri-calendar {
  --hcal-accent: #7c3aed;
  --hcal-radius: 14px;
}
hijri-calendar::part(event) { border-radius: 999px; }
```

Full custom-property list (colors, sizes, the event/time-grid/day-banner tokens): see the
[API reference](https://hatimmnomani.github.io/SpezUtil/calendar/api#css-custom-properties). Note
that `event-style` defaults to `"solid"` through the 0.3.x line and **becomes `"tinted"` at 1.0** —
if you depend on the current solid-fill look, set `event-style="solid"` explicitly now so the 1.0
upgrade is a no-op for you.

### Font families

Four independent `--hcal-font-family*` tokens, each falling back to the previous one so setting
just the base font is enough for a coherent look, but every text region is individually
overridable:

```css
hijri-calendar {
  --hcal-font-family: "Inter", system-ui, sans-serif;              /* base: toolbar, weekday header, body text */
  --hcal-font-family-arabic: "My Custom Arabic Font", serif;       /* Hijri numerals/day numbers, Arabic-name spans */
  --hcal-font-family-display: "Newsreader", Georgia, serif;        /* title-secondary, day-banner secondary, timed-block event title, agenda-date Gregorian sub-label */
  --hcal-font-family-mono: "JetBrains Mono", ui-monospace, monospace; /* gutter labels, event-time, weekday-secondary, day-banner weekday */
}
```

`--hcal-font-family-display` and `--hcal-font-family-mono` both default to
`var(--hcal-font-family)`, so declaring only the base font already looks intentional; add the
other two for the full "editorial" four-family type ramp. One exception: the **Gregorian
day-number span** is governed by `--hcal-day-secondary-font-family` (default
`var(--hcal-font-family-arabic)`), not `--hcal-font-family-display` — set it explicitly if you
want that number in the display serif instead:

```css
hijri-calendar {
  --hcal-day-secondary-font-family: var(--hcal-font-family-display);
}
```

### Arabic font

The [Amiri](https://github.com/aliftype/amiri) typeface is embedded (base64, no files to host) and used by default for Hijri numerals, weekday labels, and the month title. Amiri is © its authors, redistributed under the [SIL Open Font License 1.1](https://openfontlicense.org/) — the license text ships in this repository at `assets/fonts/OFL-Amiri.txt`.

Swap in any font by overriding the CSS custom properties (load the font yourself via `@font-face` or a font service):

```css
hijri-calendar {
  --hcal-font-family-arabic: "My Custom Arabic Font", serif; /* numerals, Arabic text */
  --hcal-font-family: "Inter", system-ui, sans-serif;        /* everything else */
}
```

## Responsive

The component measures its own **host width** (not the viewport) with a `ResizeObserver` and
classifies it into `wide` (≥900px) / `medium` (600–899px) / `narrow` (<600px), so it adapts
correctly inside a sidebar-constrained column just as well as a full-width page. At `narrow`,
month-view event chips collapse to non-interactive colored dots by default
(`narrow-events="dots"`; set `narrow-events="scroll"` to keep the desktop chip layout and scroll
horizontally instead), the toolbar wraps, and week/day views scroll horizontally with the time
gutter kept visually pinned. That pinning is done in JavaScript, not CSS — `.tg-gutter` has a
`position: sticky` rule, but it's inert on its own (it sits inside `.tg-body`, whose unrelated
vertical scroll makes it the nearest scrolling ancestor CSS resolves the sticky inset against), so
the actual pinning happens via `wireStickyGutter()`, a scroll-driven `transform: translateX()`.
No configuration needed on your end — it's automatic — but if you're inspecting the shadow DOM and
wondering why the `position: sticky` rule "doesn't do anything," that's why.

```css
hijri-calendar {
  --hcal-cell-min-height-medium: 72px;  /* month cells at the `medium` band */
  --hcal-cell-min-height-narrow: 56px;  /* month cells at the `narrow` band */
  --hcal-column-min-width: 120px;       /* week/day column width before scrolling engages */
}
```

## Docs

Full API, recipes, and live demos: https://hatimmnomani.github.io/SpezUtil/

## License

Apache-2.0
