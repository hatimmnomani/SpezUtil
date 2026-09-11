import { arMonthNames, arWeekdayNames, translitMonthNames, weekdayNames } from "@spezutil/hijri-core";

export type LocaleName = "translit" | "ar";

/**
 * UI chrome strings (toolbar/labels), selected by the `locale` attribute. Independent of
 * the `names` attribute, which selects the Hijri month/weekday *name set* instead — see
 * `NameSet` / `resolveNames()` below.
 */
export interface CalendarLocale {
  todayLabel: string;
  moreLabel: (n: number) => string;
  allDayLabel: string;
  emptyLabel: string;
  viewLabels: Record<"month" | "week" | "day" | "agenda", string>;
  /**
   * Event duration on chips/blocks, e.g. "90m" / "90 د". Takes the digits **already
   * transliterated by the caller** (Ruling Y: duration is a clock-adjacent number, so
   * `numerals-gregorian` — not `locale` — is what decides its digit system, exactly like the
   * start/end clock labels). This function supplies only the locale-fixed unit suffix.
   */
  durationLabel: (digits: string) => string;
  /** "Now" prefix for the `now-indicator="line-label"` `part="now-label"` span. */
  nowLabel: string;
  /**
   * Day-banner summary event count, e.g. "2 events". Takes the digits already transliterated
   * by the caller (same Ruling Y contract as `durationLabel`: `numerals-gregorian`, not
   * `locale`, decides the digit system).
   */
  eventsCount: (digits: string) => string;
  /** Day-banner summary hours, e.g. "2.5 hours scheduled". Same digit contract as `eventsCount`. */
  hoursScheduled: (digits: string) => string;
  /** Default text of the `loading` overlay (`part="loading"`, `slot="loading"`). */
  loadingLabel: string;
  /**
   * Appended to a month day button's `aria-label` at the `narrow` size band under
   * `narrow-events="dots"` (§5.9), where the events themselves render as non-interactive dots
   * with no accessible text of their own, e.g. "3 events". Takes the digit(s) already
   * transliterated by the caller (same Ruling Y contract as `eventsCount`).
   */
  moreDotsLabel: (digits: string) => string;
}

const translit: CalendarLocale = {
  todayLabel: "Today",
  moreLabel: (n) => `+${n} more`,
  allDayLabel: "All day",
  emptyLabel: "No events",
  viewLabels: { month: "Month", week: "Week", day: "Day", agenda: "Agenda" },
  durationLabel: (digits) => `${digits}m`,
  nowLabel: "Now",
  eventsCount: (digits) => `${digits} events`,
  hoursScheduled: (digits) => `${digits} hours scheduled`,
  loadingLabel: "Loading…",
  moreDotsLabel: (digits) => `${digits} events`,
};

const ar: CalendarLocale = {
  todayLabel: "اليوم",
  moreLabel: (n) => `+${n} أخرى`,
  allDayLabel: "طوال اليوم",
  emptyLabel: "لا توجد أحداث",
  viewLabels: { month: "شهر", week: "أسبوع", day: "يوم", agenda: "جدول" },
  durationLabel: (digits) => `${digits} د`,
  nowLabel: "الآن",
  eventsCount: (digits) => `${digits} أحداث`,
  hoursScheduled: (digits) => `${digits} ساعة مجدولة`,
  loadingLabel: "جارٍ التحميل…",
  moreDotsLabel: (digits) => `${digits} أحداث`,
};

export function resolveLocale(name: string | null): CalendarLocale {
  return name === "ar" ? ar : translit;
}

/** Hijri month & weekday name set, selected by the `names` attribute. */
export interface NameSet {
  monthNames: string[];
  weekdayNames: string[];
}

const translitNames: NameSet = {
  monthNames: translitMonthNames,
  weekdayNames,
};

const arNames: NameSet = {
  monthNames: arMonthNames,
  weekdayNames: arWeekdayNames,
};

export function resolveNames(name: string | null): NameSet {
  return name === "ar" ? arNames : translitNames;
}
