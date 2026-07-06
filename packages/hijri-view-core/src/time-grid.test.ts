import { describe, expect, it } from "vitest";
import { createCalendar } from "@spezutil/hijri-core";
import { buildTimeGridModel } from "./time-grid";
import type { CalendarEvent } from "./types";

const cal = createCalendar();
// 2026-07-06 is a Monday.
const monday = new Date(Date.UTC(2026, 6, 6));

const ev = (id: string, start: string, end?: string): CalendarEvent => ({
  id,
  title: id,
  start,
  ...(end ? { end } : {}),
});

describe("buildTimeGridModel", () => {
  it("builds 7 columns anchored to the week containing the anchor date", () => {
    const model = buildTimeGridModel(cal, monday, 7, [], {});
    expect(model.columns).toHaveLength(7);
    expect(model.columns[0]!.gregorian.getUTCDay()).toBe(0);
    expect(model.columns[1]!.gregorian.toISOString().slice(0, 10)).toBe("2026-07-06");
    for (const col of model.columns) {
      expect(col.hijri).toEqual(cal.gregorianToHijri(col.gregorian));
    }
  });

  it("respects weekStart when anchoring the week", () => {
    const model = buildTimeGridModel(cal, monday, 7, [], { weekStart: 1 });
    expect(model.columns[0]!.gregorian.toISOString().slice(0, 10)).toBe("2026-07-06");
  });

  it("builds a single column for day view starting at the anchor", () => {
    const model = buildTimeGridModel(cal, monday, 1, [], {});
    expect(model.columns).toHaveLength(1);
    expect(model.columns[0]!.gregorian.toISOString().slice(0, 10)).toBe("2026-07-06");
  });

  it("positions a timed event with minutes from midnight", () => {
    const model = buildTimeGridModel(cal, monday, 1, [ev("a", "2026-07-06T09:30", "2026-07-06T11:00")], {});
    const p = model.columns[0]!.timed[0]!;
    expect(p.startMin).toBe(570);
    expect(p.endMin).toBe(660);
    expect(p.col).toBe(0);
    expect(p.colCount).toBe(1);
  });

  it("clips events to the visible day window", () => {
    const model = buildTimeGridModel(
      cal,
      monday,
      1,
      [ev("a", "2026-07-06T07:00", "2026-07-06T10:00")],
      { dayStartHour: 9, dayEndHour: 17 }
    );
    const p = model.columns[0]!.timed[0]!;
    expect(p.startMin).toBe(540);
    expect(p.endMin).toBe(600);
  });

  it("excludes timed events entirely outside the day window", () => {
    const model = buildTimeGridModel(
      cal,
      monday,
      1,
      [ev("a", "2026-07-06T06:00", "2026-07-06T08:00")],
      { dayStartHour: 9, dayEndHour: 17 }
    );
    expect(model.columns[0]!.timed).toHaveLength(0);
  });

  it("packs overlapping events into side-by-side columns", () => {
    const model = buildTimeGridModel(
      cal,
      monday,
      1,
      [ev("a", "2026-07-06T09:00", "2026-07-06T11:00"), ev("b", "2026-07-06T10:00", "2026-07-06T12:00")],
      {}
    );
    const timed = model.columns[0]!.timed;
    const a = timed.find((p) => p.event.id === "a")!;
    const b = timed.find((p) => p.event.id === "b")!;
    expect(a.col).not.toBe(b.col);
    expect(a.colCount).toBe(2);
    expect(b.colCount).toBe(2);
  });

  it("shares colCount across a transitive overlap cluster and reuses freed columns", () => {
    const model = buildTimeGridModel(
      cal,
      monday,
      1,
      [
        ev("a", "2026-07-06T09:00", "2026-07-06T11:00"),
        ev("b", "2026-07-06T10:00", "2026-07-06T12:00"),
        ev("c", "2026-07-06T11:00", "2026-07-06T13:00"),
      ],
      {}
    );
    const timed = model.columns[0]!.timed;
    const byId = Object.fromEntries(timed.map((p) => [p.event.id, p]));
    expect(byId["a"]!.col).toBe(0);
    expect(byId["b"]!.col).toBe(1);
    expect(byId["c"]!.col).toBe(0);
    for (const p of timed) expect(p.colCount).toBe(2);
  });

  it("keeps non-overlapping events full width", () => {
    const model = buildTimeGridModel(
      cal,
      monday,
      1,
      [ev("a", "2026-07-06T09:00", "2026-07-06T10:00"), ev("b", "2026-07-06T14:00", "2026-07-06T15:00")],
      {}
    );
    for (const p of model.columns[0]!.timed) {
      expect(p.col).toBe(0);
      expect(p.colCount).toBe(1);
    }
  });

  it("places all-day events in every covered column's allDay list", () => {
    const model = buildTimeGridModel(cal, monday, 7, [ev("a", "2026-07-06", "2026-07-08")], {});
    const covered = model.columns.map((c) => c.allDay.some((n) => n.event.id === "a"));
    expect(covered).toEqual([false, true, true, true, false, false, false]);
  });

  it("splits a timed event crossing midnight across both day columns", () => {
    const model = buildTimeGridModel(cal, monday, 7, [ev("a", "2026-07-06T22:00", "2026-07-07T02:00")], {});
    const mon = model.columns[1]!.timed.find((p) => p.event.id === "a")!;
    const tue = model.columns[2]!.timed.find((p) => p.event.id === "a")!;
    expect(mon.startMin).toBe(1320);
    expect(mon.endMin).toBe(1440);
    expect(tue.startMin).toBe(0);
    expect(tue.endMin).toBe(120);
  });

  it("marks today's column", () => {
    const model = buildTimeGridModel(cal, monday, 7, [], { today: monday });
    expect(model.columns.map((c) => c.isToday)).toEqual([false, true, false, false, false, false, false]);
  });
});
