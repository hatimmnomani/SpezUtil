import { html } from "lit-html";
import "@spezutil/hijri-calendar";
import type { CalendarEvent, RenderDayCellContext, RenderEventContext } from "@spezutil/hijri-calendar";

export default {
  title: "Components/HijriCalendar",
  argTypes: {
    // Existing (unchanged)
    view: { control: "radio", options: ["month", "week", "day", "agenda"] },
    date: { control: "text" },
    locale: { control: "radio", options: ["translit", "ar"] },
    dir: { control: "radio", options: ["ltr", "rtl"] },
    weekStart: { control: { type: "number", min: 0, max: 6 } },
    dayStart: { control: { type: "number", min: 0, max: 23 } },
    dayEnd: { control: { type: "number", min: 1, max: 24 } },
    timeFormat: { control: "radio", options: ["12", "24"] },
    maxEvents: { control: { type: "number", min: 1, max: 6 } },
    primary: { control: "radio", options: ["hijri", "gregorian"] },
    secondaryPosition: {
      control: "radio",
      options: ["end", "start", "above", "below", "hidden"],
    },
    timezone: { control: "text" },

    // Events-parity API — new attributes (Phase 0-5)
    views: { control: "text" },
    toolbar: { control: "radio", options: ["full", "none"] },
    titleLayout: { control: "radio", options: ["stacked", "inline"] },
    names: { control: "radio", options: ["translit", "ar"] },
    numerals: { control: "radio", options: ["latn", "arab"] },
    numeralsGregorian: { control: "radio", options: ["latn", "arab"] },
    weekdayFormat: { control: "radio", options: ["short", "long", "bilingual"] },
    weekendDays: { control: "text" },
    dayNumberAlign: { control: "radio", options: ["center", "start", "end"] },
    monthMarker: { control: "radio", options: ["gregorian", "hijri", "both", "none"] },
    todayMarker: { control: "radio", options: ["pill", "dot", "none"] },
    eventStyle: { control: "radio", options: ["solid", "tinted", "outline"] },
    eventTime: {
      control: "radio",
      options: ["auto", "none", "start", "start-duration", "range"],
    },
    slotMinutes: { control: "radio", options: [15, 30, 60] },
    alldayRow: { control: "radio", options: ["always", "auto", "never"] },
    nowIndicator: { control: "radio", options: ["line", "line-label", "none"] },
    timeLabelPosition: { control: "radio", options: ["line", "cell"] },
    dayHeader: { control: "radio", options: ["column", "banner"] },
    agendaDays: { control: { type: "number", min: 1, max: 366 } },
    loading: { control: "boolean" },
    narrowEvents: { control: "radio", options: ["dots", "scroll"] },
  },
};

interface Args {
  view?: string;
  date?: string;
  locale?: string;
  dir?: string;
  weekStart?: number;
  dayStart?: number;
  dayEnd?: number;
  timeFormat?: string;
  maxEvents?: number;
  primary?: string;
  secondaryPosition?: string;
  timezone?: string;
  views?: string;
  toolbar?: string;
  titleLayout?: string;
  names?: string;
  numerals?: string;
  numeralsGregorian?: string;
  weekdayFormat?: string;
  weekendDays?: string;
  dayNumberAlign?: string;
  monthMarker?: string;
  todayMarker?: string;
  eventStyle?: string;
  eventTime?: string;
  slotMinutes?: number;
  alldayRow?: string;
  nowIndicator?: string;
  timeLabelPosition?: string;
  dayHeader?: string;
  agendaDays?: number;
  loading?: boolean;
  narrowEvents?: string;
  events?: CalendarEvent[];
}

const sampleEvents: CalendarEvent[] = [
  { id: "1", title: "Standup", start: "2026-07-06T09:30", end: "2026-07-06T09:45", color: "#0b7d3e" },
  { id: "2", title: "Design review", start: "2026-07-06T10:00", end: "2026-07-06T11:30", color: "#1a73e8" },
  { id: "3", title: "Lunch with Ali", start: "2026-07-06T12:30", end: "2026-07-06T13:30", color: "#f9ab00" },
  { id: "4", title: "Sprint planning", start: "2026-07-07T14:00", end: "2026-07-07T16:00", color: "#1a73e8" },
  { id: "5", title: "Conference", start: "2026-07-08", end: "2026-07-10", color: "#9334e6" },
  { id: "6", title: "1:1 with Fatema", start: "2026-07-09T15:00", color: "#d93025" },
  { id: "7", title: "Majlis", start: "2026-07-09T18:00", end: "2026-07-09T20:00", color: "#0b7d3e" },
  { id: "8", title: "Release cut", start: "2026-07-10T11:00", color: "#d93025" },
  { id: "9", title: "Urs", start: "2026-07-15", color: "#9334e6" },
  { id: "10", title: "Retro", start: "2026-07-17T16:00", end: "2026-07-17T17:00", color: "#1a73e8" },
];

const Template = (args: Args) => html`
  <hijri-calendar
    style="max-width: 960px"
    view=${args.view ?? "month"}
    date=${args.date ?? "2026-07-06"}
    locale=${args.locale ?? "translit"}
    dir=${args.dir ?? "ltr"}
    week-start=${args.weekStart ?? 0}
    day-start=${args.dayStart ?? 0}
    day-end=${args.dayEnd ?? 24}
    time-format=${args.timeFormat ?? "12"}
    max-events=${args.maxEvents ?? 3}
    primary=${args.primary ?? "hijri"}
    secondary-position=${args.secondaryPosition ?? "end"}
    .events=${args.events ?? sampleEvents}
    @event-click=${(e: CustomEvent) => console.log("event-click", e.detail)}
    @date-click=${(e: CustomEvent) => console.log("date-click", e.detail)}
    @slot-click=${(e: CustomEvent) => console.log("slot-click", e.detail)}
    @more-click=${(e: CustomEvent) => console.log("more-click", e.detail)}
    @view-change=${(e: CustomEvent) => console.log("view-change", e.detail)}
    @date-change=${(e: CustomEvent) => console.log("date-change", e.detail)}
    @range-change=${(e: CustomEvent) => console.log("range-change", e.detail)}
  ></hijri-calendar>
`;

export const Month = Template.bind({});
(Month as any).args = {};

export const Week = Template.bind({});
(Week as any).args = { view: "week", dayStart: 7, dayEnd: 21 };

export const Day = Template.bind({});
(Day as any).args = { view: "day", dayStart: 7, dayEnd: 21 };

export const Agenda = Template.bind({});
(Agenda as any).args = { view: "agenda" };

export const ArabicRtl = Template.bind({});
(ArabicRtl as any).args = { locale: "ar", dir: "rtl" };

export const GregorianPrimary = Template.bind({});
(GregorianPrimary as any).args = { primary: "gregorian", secondaryPosition: "below" };

export const Themed = () => html`
  <style>
    .themed-cal {
      --hcal-accent: #7c3aed;
      --hcal-bg: #faf5ff;
      --hcal-radius: 14px;
      --hcal-border: #ddd6fe;
      max-width: 960px;
    }
    .themed-cal::part(event) {
      border-radius: 999px;
    }
  </style>
  <hijri-calendar class="themed-cal" date="2026-07-06" .events=${sampleEvents}></hijri-calendar>
`;

/**
 * `weekday-format="bilingual"` renders the `names` weekday name (primary) and the English
 * abbreviation (secondary) stacked in the weekday header — independent of `locale`, which only
 * controls toolbar/UI chrome strings. Paired with `names="ar"` here to show genuine Arabic
 * weekday names above their English abbreviations, the combination the "editorial" reference
 * theme uses (see Editorial/Month and the docs recipe).
 */
export const BilingualHeader = () => html`
  <hijri-calendar
    style="max-width: 960px"
    date="2026-07-06"
    names="ar"
    weekday-format="bilingual"
    .events=${sampleEvents}
  ></hijri-calendar>
`;

const dayBannerEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Design review",
    start: "2026-07-06T10:00",
    end: "2026-07-06T11:30",
    color: "#1a73e8",
    subtitle: "Room 4B",
  },
  {
    id: "2",
    title: "Sprint planning",
    start: "2026-07-06T14:00",
    end: "2026-07-06T15:00",
    color: "#0b7d3e",
    tag: "Planning",
  },
];

/**
 * `day-header="banner"` (day view only) replaces the compact column head with a full-width
 * banner: the Hijri date large, the Gregorian date + weekday, and a computed "N events · X hours
 * scheduled" summary (`part="day-banner-summary"`, overridable via `slot="day-summary"`).
 */
export const DayBanner = Template.bind({});
(DayBanner as any).args = {
  view: "day",
  dayHeader: "banner",
  dayStart: 8,
  dayEnd: 18,
  events: dayBannerEvents,
};

/**
 * `renderEvent` replaces a chip/block/agenda item's inner content only — the component keeps
 * ownership of the wrapping `<button>`, ARIA and click wiring. Here every timed block gets a
 * two-line custom layout (an emoji-prefixed title, then the pre-formatted time label from
 * `ctx.labels`) instead of the default `event-time` + `event-title` spans.
 */
export const CustomRenderer = () => html`
  <hijri-calendar
    style="max-width: 960px"
    view="week"
    date="2026-07-06"
    day-start="7"
    day-end="21"
    .events=${sampleEvents}
    .renderEvent=${(ctx: RenderEventContext) => {
      const el = document.createElement("div");
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.gap = "2px";
      const title = document.createElement("span");
      title.textContent = `📌 ${ctx.event.title}`;
      const time = document.createElement("span");
      time.style.opacity = "0.8";
      time.textContent = ctx.labels.start;
      el.append(title, time);
      return el;
    }}
  ></hijri-calendar>
`;

/**
 * `renderDayCell` replaces the month-cell number button's inner content (and, in week/day, the
 * time-grid column head's). Here days with events get a bold day number and a small dot count;
 * output stays non-interactive since it renders inside a component-owned `<button>`.
 */
export const CustomDayCell = () => html`
  <hijri-calendar
    style="max-width: 960px"
    date="2026-07-06"
    .events=${sampleEvents}
    .renderDayCell=${(ctx: RenderDayCellContext) => {
      const el = document.createElement("div");
      el.style.fontWeight = ctx.events.length > 0 ? "700" : "400";
      el.textContent = ctx.labels.primary;
      if (ctx.events.length > 0) {
        const dot = document.createElement("span");
        dot.textContent = ` ·${ctx.events.length}`;
        dot.style.fontSize = "9px";
        dot.style.opacity = "0.7";
        el.append(dot);
      }
      return el;
    }}
  ></hijri-calendar>
`;

/**
 * The `loading` boolean attribute sets `aria-busy="true"` on the grid and renders a
 * `part="loading"` overlay (default text from `loc.loadingLabel`; override via `slot="loading"`).
 */
export const Loading = Template.bind({});
(Loading as any).args = { loading: true };

/**
 * Four-combination grid of `numerals` × `numerals-gregorian` (see the API reference's numerals
 * truth table): Hijri and Gregorian digit systems are independent, and neither is decided by
 * `locale`. `arab`/`latn` (top-right) is the default since D9 — it's also the reference
 * "editorial" look; `latn`/`latn` (top-left) is the pre-0.3.0-D9 all-Latin look, still available
 * by setting `numerals="latn"` explicitly.
 */
export const Numerals = () => {
  const combos: Array<{ label: string; numerals: "latn" | "arab"; numeralsGregorian: "latn" | "arab" }> = [
    { label: "numerals=latn, numerals-gregorian=latn (pre-D9 default)", numerals: "latn", numeralsGregorian: "latn" },
    { label: "numerals=arab, numerals-gregorian=latn (default since D9; editorial)", numerals: "arab", numeralsGregorian: "latn" },
    { label: "numerals=latn, numerals-gregorian=arab", numerals: "latn", numeralsGregorian: "arab" },
    { label: "numerals=arab, numerals-gregorian=arab", numerals: "arab", numeralsGregorian: "arab" },
  ];
  return html`
    <style>
      .numerals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .numerals-cell h4 { font: 600 12px system-ui, sans-serif; margin: 0 0 8px; }
      .numerals-cell hijri-calendar { max-width: 460px; }
    </style>
    <div class="numerals-grid">
      ${combos.map(
        (c) => html`
          <div class="numerals-cell">
            <h4>${c.label}</h4>
            <hijri-calendar
              view="week"
              date="2026-07-06"
              day-start="8"
              day-end="18"
              numerals=${c.numerals}
              numerals-gregorian=${c.numeralsGregorian}
              event-time="start-duration"
              .events=${sampleEvents}
            ></hijri-calendar>
          </div>
        `
      )}
    </div>
  `;
};
