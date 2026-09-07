import {
  arMonthNames,
  arWeekdayNames,
  translitMonthNames,
  weekdayNames,
} from "@spezutil/hijri-core";

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
}

const translit: CalendarLocale = {
  todayLabel: "Today",
  moreLabel: (n) => `+${n} more`,
  allDayLabel: "All day",
  emptyLabel: "No events",
  viewLabels: { month: "Month", week: "Week", day: "Day", agenda: "Agenda" },
};

const ar: CalendarLocale = {
  todayLabel: "اليوم",
  moreLabel: (n) => `+${n} أخرى`,
  allDayLabel: "طوال اليوم",
  emptyLabel: "لا توجد أحداث",
  viewLabels: { month: "شهر", week: "أسبوع", day: "يوم", agenda: "جدول" },
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
