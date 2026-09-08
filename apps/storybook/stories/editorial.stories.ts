import { html } from "lit-html";
import "@spezutil/hijri-calendar";
import type { CalendarEvent } from "@spezutil/hijri-calendar";

/**
 * "Editorial" stories reproduce the reference Events-tab design using only the documented
 * `--hcal-*` custom properties and attributes — no `::part()` rules. They are the visual
 * acceptance surface for the events-parity plan and the screenshot baseline target for later
 * phases (see plan §7.1 / task-6). Token values below come from the reference `tokens.css`
 * (plan §2.1): warm cream surfaces, crimson accent, a display/sans/mono/Arabic type ramp.
 *
 * Every story also sets the reference's *structural* attributes, not just its color tokens:
 * Arabic-Indic Hijri numerals (`numerals="arab"`), genuine Arabic month/weekday names
 * (`names="ar"`), a bilingual weekday header, an inline Gregorian sub-title, start-aligned day
 * numbers, a Hijri month marker, and a dotted today indicator. Column order (Sun..Sat,
 * left-to-right) is driven by `week-start` alone and is never affected by the Arabic name set or
 * numeral system — see the "column order invariant" test in typography.test.ts, which pins this
 * down so a later phase can't regress it.
 */
export default {
  title: "Editorial",
};

const sampleEvents: CalendarEvent[] = [
  { id: "1", title: "Standup", start: "2026-07-06T09:30", end: "2026-07-06T09:45", color: "#2F6E54" },
  { id: "2", title: "Design review", start: "2026-07-06T10:00", end: "2026-07-06T11:30", color: "#D62246" },
  { id: "3", title: "Lunch with Ali", start: "2026-07-06T12:30", end: "2026-07-06T13:30", color: "#B47A18" },
  { id: "4", title: "Sprint planning", start: "2026-07-07T14:00", end: "2026-07-07T16:00", color: "#D62246" },
  { id: "5", title: "Conference", start: "2026-07-08", end: "2026-07-10", color: "#2F6E54" },
  { id: "6", title: "1:1 with Fatema", start: "2026-07-09T15:00", color: "#B47A18" },
  { id: "7", title: "Majlis", start: "2026-07-09T18:00", end: "2026-07-09T20:00", color: "#2F6E54" },
  { id: "8", title: "Release cut", start: "2026-07-10T11:00", color: "#D62246" },
  { id: "9", title: "Urs", start: "2026-07-15", color: "#B47A18" },
  { id: "10", title: "Retro", start: "2026-07-17T16:00", end: "2026-07-17T17:00", color: "#2F6E54" },
];

// The reference type ramp (plan §2.1: --font-display/--font-sans/--font-mono). Fallback
// stacks only for now — the OFL TTFs are vendored locally in a later phase (task-6) so
// screenshot tests never depend on a network font fetch; --hcal-font-family-arabic keeps the
// component's own embedded Amiri default, unchanged.
const EDITORIAL_STYLE = `
  .editorial-cal {
    max-width: 960px;
    --hcal-bg: #FFFFFF;
    --hcal-fg: #1F1A17;
    --hcal-muted: #9A8E85;
    --hcal-accent: #D62246;
    --hcal-accent-fg: #FFFFFF;
    --hcal-border: #E8DECF;
    --hcal-radius: 12px;
    --hcal-button-radius: 6px;
    --hcal-today-bg: #FBF7F0;
    --hcal-grid-line: #E8DECF;
    --hcal-header-bg: #F4ECDD;
    --hcal-weekend-bg: #FAF6EE;
    --hcal-cell-hover-bg: color-mix(in srgb, #D62246 6%, transparent);
    --hcal-font-family: "Public Sans", system-ui, sans-serif;
    --hcal-font-family-display: "Newsreader", Georgia, serif;
    --hcal-font-family-mono: "JetBrains Mono", ui-monospace, monospace;
    --hcal-day-secondary-font-family: var(--hcal-font-family-display);
  }
`;

export const Month = () => html`
  <style>${EDITORIAL_STYLE}</style>
  <hijri-calendar
    class="editorial-cal"
    view="month"
    date="2026-07-06"
    locale="translit"
    dir="ltr"
    numerals="arab"
    names="ar"
    weekday-format="bilingual"
    title-layout="inline"
    day-number-align="start"
    month-marker="hijri"
    today-marker="dot"
    week-start="0"
    .events=${sampleEvents}
  ></hijri-calendar>
`;

export const Week = () => html`
  <style>${EDITORIAL_STYLE}</style>
  <hijri-calendar
    class="editorial-cal"
    view="week"
    date="2026-07-06"
    locale="translit"
    dir="ltr"
    numerals="arab"
    names="ar"
    weekday-format="bilingual"
    title-layout="inline"
    day-number-align="start"
    week-start="0"
    now-indicator="none"
    event-style="tinted"
    event-time="start-duration"
    slot-minutes="30"
    allday-row="auto"
    time-label-position="line"
    .events=${sampleEvents}
  ></hijri-calendar>
`;

export const Day = () => html`
  <style>${EDITORIAL_STYLE}</style>
  <hijri-calendar
    class="editorial-cal"
    view="day"
    date="2026-07-06"
    locale="translit"
    dir="ltr"
    numerals="arab"
    names="ar"
    weekday-format="bilingual"
    title-layout="inline"
    day-number-align="start"
    week-start="0"
    now-indicator="none"
    event-style="tinted"
    event-time="start-duration"
    slot-minutes="30"
    allday-row="auto"
    time-label-position="line"
    .events=${sampleEvents}
  ></hijri-calendar>
`;

const EVENT_STYLE_LABEL_CSS = `
  .event-style-row { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-start; }
  .event-style-col h4 { font: 600 13px "Public Sans", system-ui, sans-serif; color: #1F1A17; margin: 0 0 8px; }
  .event-style-col .editorial-cal { max-width: 360px; }
`;

export const EventStyles = () => html`
  <style>${EDITORIAL_STYLE}${EVENT_STYLE_LABEL_CSS}</style>
  <div class="event-style-row">
    <div class="event-style-col">
      <h4>Solid (0.3.x default)</h4>
      <hijri-calendar
        class="editorial-cal"
        view="week"
        date="2026-07-06"
        day-start="8"
        day-end="18"
        now-indicator="none"
        event-style="solid"
        event-time="start-duration"
        .events=${sampleEvents}
      ></hijri-calendar>
    </div>
    <div class="event-style-col">
      <h4>Tinted (1.0 default)</h4>
      <hijri-calendar
        class="editorial-cal"
        view="week"
        date="2026-07-06"
        day-start="8"
        day-end="18"
        now-indicator="none"
        event-style="tinted"
        event-time="start-duration"
        .events=${sampleEvents}
      ></hijri-calendar>
    </div>
    <div class="event-style-col">
      <h4>Outline</h4>
      <hijri-calendar
        class="editorial-cal"
        view="week"
        date="2026-07-06"
        day-start="8"
        day-end="18"
        now-indicator="none"
        event-style="outline"
        event-time="start-duration"
        .events=${sampleEvents}
      ></hijri-calendar>
    </div>
  </div>
`;
