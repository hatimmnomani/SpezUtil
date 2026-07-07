import { html } from "lit-html";
import "@spezutil/hijri-calendar";
import type { CalendarEvent } from "@spezutil/hijri-calendar";

export default {
  title: "Components/HijriCalendar",
  argTypes: {
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
