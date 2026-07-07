import {
  arMonthNames,
  arWeekdayNames,
  translitMonthNames,
  weekdayNames,
} from "@spezutil/hijri-core";

export type LocaleName = "translit" | "ar";

export interface CalendarLocale {
  monthNames: string[];
  weekdayNames: string[];
  todayLabel: string;
  moreLabel: (n: number) => string;
  allDayLabel: string;
  emptyLabel: string;
  viewLabels: Record<"month" | "week" | "day" | "agenda", string>;
}

const translit: CalendarLocale = {
  monthNames: translitMonthNames,
  weekdayNames,
  todayLabel: "Today",
  moreLabel: (n) => `+${n} more`,
  allDayLabel: "All day",
  emptyLabel: "No events",
  viewLabels: { month: "Month", week: "Week", day: "Day", agenda: "Agenda" },
};

const ar: CalendarLocale = {
  monthNames: arMonthNames,
  weekdayNames: arWeekdayNames,
  todayLabel: "اليوم",
  moreLabel: (n) => `+${n} أخرى`,
  allDayLabel: "طوال اليوم",
  emptyLabel: "لا توجد أحداث",
  viewLabels: { month: "شهر", week: "أسبوع", day: "يوم", agenda: "جدول" },
};

export function resolveLocale(name: string | null): CalendarLocale {
  return name === "ar" ? ar : translit;
}
