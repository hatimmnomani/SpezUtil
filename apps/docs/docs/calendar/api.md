---
title: API reference
---

# `<hijri-calendar>` API

## Attributes

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `view` | `month \| week \| day \| agenda` | `month` | Active view. |
| `date` | ISO date | today | Focused date; determines the shown month/week/day/agenda window. |
| `locale` | `translit \| ar` | `translit` | Transliterated Fatimid or Arabic month/weekday names and UI labels. |
| `dir` | `ltr \| rtl` | `ltr` | Text direction. |
| `week-start` | `0–6` | `0` | First day of week (0 = Sunday). |
| `day-start` | `0–23` | `0` | First visible hour in week/day views. |
| `day-end` | `1–24` | `24` | Last visible hour (exclusive) in week/day views. |
| `time-format` | `12 \| 24` | `12` | Hour label / event time format. |
| `max-events` | number | `3` | Visible event lanes per month-view week before days collapse into "+N more". |
| `primary` | `hijri \| gregorian` | `hijri` | Which day number is prominent in day cells and time-grid headers. |
| `secondary-position` | `end \| start \| above \| below \| hidden` | `end` | Where the secondary day number sits relative to the primary (or hide it). |

Every attribute has a matching camelCase property (`weekStart`, `dayStart`, `dayEnd`, `timeFormat`, `maxEvents`, `locale`, `view`, `date`).

## Properties (JS only)

| Property | Type | Description |
| --- | --- | --- |
| `events` | `CalendarEvent[]` | The events to display. Setting it re-renders. |
| `isDateDisabled` | `(hijri, gregorian) => boolean` | Marks month-view day cells disabled. |

### `CalendarEvent`

```ts
interface CalendarEvent {
  id: string;
  title: string;
  start: string;   // "yyyy-mm-dd" (all-day) or "yyyy-mm-ddTHH:mm" (timed), Gregorian
  end?: string;    // timed: exclusive; all-day: inclusive date. Defaults: +1h / same day
  allDay?: boolean; // derived from `start` when omitted
  color?: string;  // chip/block background (any CSS color)
  data?: unknown;  // your payload, passed back in event details
}
```

## Events

All events bubble and are `composed`.

| Event | `detail` | Fired when |
| --- | --- | --- |
| `event-click` | `{ event, hijri, gregorian }` | An event chip/block/agenda item is clicked. |
| `date-click` | `{ hijri, gregorian }` | A month-view day cell is clicked. |
| `slot-click` | `{ hijri, gregorian }` | An empty 30-minute slot is clicked in week/day view (`gregorian` is the slot start datetime). |
| `more-click` | `{ hijri, gregorian, events }` | A "+N more" link is clicked (`events` = all events that day). |
| `view-change` | `{ view }` | The user switches views. |
| `date-change` | `{ date }` | The user navigates (today/prev/next). |

The host can also drive `view`/`date` by setting the attributes — nav events are only fired for user interaction.

## Styling

### CSS custom properties

```css
hijri-calendar {
  --hcal-bg: #fff;
  --hcal-fg: #1a1a1a;
  --hcal-muted: #9aa0a6;
  --hcal-accent: #0b7d3e;
  --hcal-accent-fg: #fff;
  --hcal-border: #e0e0e0;
  --hcal-radius: 8px;
  --hcal-today-bg: /* today highlight */;
  --hcal-event-fg: #fff;
}
```

### Parts

Use `::part()` to restyle any region:

`toolbar`, `title`, `nav-today`, `nav-prev`, `nav-next`, `view-switch`, `view-btn`,
`weekday`, `day`, `day-primary`, `day-secondary`, `event`, `more-link`,
`allday-row`, `time-gutter`, `slot`, `now-indicator`, `agenda-day`, `agenda-item`.

```css
hijri-calendar::part(event) {
  border-radius: 999px;
  font-weight: 600;
}
```

Per-event colors come from the `color` field on the event itself.

## Accessibility

- Month grid uses `role="grid"` / `row` / `gridcell` with roving `tabindex` and arrow-key navigation; Enter/Space activates.
- Every day cell is labelled with both the Hijri and Gregorian date.
- Event chips are real `<button>`s labelled with title + time.
- The current time indicator in week/day views is decorative (`part="now-indicator"`).

## Semantics notes

- Hijri↔Gregorian conversion uses the tabular Bohra (Fatimid/Misri) calendar from [`@spezutil/hijri-core`](/engine/hijri-core).
- Days switch at **UTC midnight**. Sunset-based day boundaries (maghrib) are not modelled; if your community convention counts the night before, shift your event dates accordingly.
- Multi-day all-day events treat `end` as **inclusive** (like Google Calendar's UI, unlike its API).
- When the Gregorian month changes mid-grid, the first of the month is labelled with its abbreviated name ("1 Jul") in month-view cells and week/day column headers.
