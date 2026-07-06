import { describe, expect, it } from "vitest";
import { createCalendar } from "@spezutil/hijri-core";
import { buildAgendaModel } from "./agenda";
import type { CalendarEvent } from "./types";

const cal = createCalendar();
const start = new Date(Date.UTC(2026, 6, 6));

const ev = (id: string, startIso: string, end?: string): CalendarEvent => ({
  id,
  title: id,
  start: startIso,
  ...(end ? { end } : {}),
});

describe("buildAgendaModel", () => {
  it("groups events by day and skips empty days", () => {
    const model = buildAgendaModel(cal, start, 7, [
      ev("a", "2026-07-06T10:00"),
      ev("b", "2026-07-08T09:00"),
      ev("c", "2026-07-08T14:00"),
    ]);
    expect(model.days).toHaveLength(2);
    expect(model.days[0]!.gregorian.toISOString().slice(0, 10)).toBe("2026-07-06");
    expect(model.days[1]!.items.map((i) => i.event.id)).toEqual(["b", "c"]);
    expect(model.days[0]!.hijri).toEqual(cal.gregorianToHijri(model.days[0]!.gregorian));
  });

  it("excludes events outside the window", () => {
    const model = buildAgendaModel(cal, start, 7, [ev("late", "2026-07-20T10:00")]);
    expect(model.days).toHaveLength(0);
  });

  it("repeats a multi-day event on each covered day, all-day items first", () => {
    const model = buildAgendaModel(cal, start, 7, [
      ev("stay", "2026-07-07", "2026-07-08"),
      ev("meet", "2026-07-07T08:00"),
    ]);
    expect(model.days).toHaveLength(2);
    expect(model.days[0]!.items.map((i) => i.event.id)).toEqual(["stay", "meet"]);
    expect(model.days[1]!.items.map((i) => i.event.id)).toEqual(["stay"]);
  });

  it("sorts timed items by start time within a day", () => {
    const model = buildAgendaModel(cal, start, 7, [
      ev("later", "2026-07-06T15:00"),
      ev("earlier", "2026-07-06T08:00"),
    ]);
    expect(model.days[0]!.items.map((i) => i.event.id)).toEqual(["earlier", "later"]);
  });
});
