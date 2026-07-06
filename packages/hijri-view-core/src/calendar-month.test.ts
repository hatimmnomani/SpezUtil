import { describe, expect, it } from "vitest";
import { createCalendar } from "@spezutil/hijri-core";
import { buildMonthModel } from "./month";
import { buildCalendarMonthModel } from "./calendar-month";
import type { CalendarEvent } from "./types";

const cal = createCalendar();
const view = { year: 1445, month: 9 };
const grid = buildMonthModel(cal, view, {});

function iso(week: number, col: number): string {
  return grid.weeks[week]![col]!.gregorian.toISOString().slice(0, 10);
}

const ev = (id: string, start: string, end?: string): CalendarEvent => ({
  id,
  title: id,
  start,
  ...(end ? { end } : {}),
});

describe("buildCalendarMonthModel", () => {
  it("places a single-day event in the right week/column with span 1", () => {
    const model = buildCalendarMonthModel(cal, view, [ev("a", `${iso(1, 2)}T10:00`)], {});
    expect(model.segments).toHaveLength(1);
    const seg = model.segments[0]!;
    expect(seg.weekIndex).toBe(1);
    expect(seg.startCol).toBe(2);
    expect(seg.span).toBe(1);
    expect(seg.lane).toBe(0);
  });

  it("spans a multi-day event across columns within a week", () => {
    const model = buildCalendarMonthModel(cal, view, [ev("a", iso(1, 1), iso(1, 3))], {});
    const seg = model.segments[0]!;
    expect(seg.startCol).toBe(1);
    expect(seg.span).toBe(3);
    expect(seg.continuesBefore).toBe(false);
    expect(seg.continuesAfter).toBe(false);
  });

  it("splits an event crossing a week boundary into per-week segments", () => {
    const model = buildCalendarMonthModel(cal, view, [ev("a", iso(1, 5), iso(2, 1))], {});
    expect(model.segments).toHaveLength(2);
    const [s1, s2] = model.segments;
    expect(s1!.weekIndex).toBe(1);
    expect(s1!.startCol).toBe(5);
    expect(s1!.span).toBe(2);
    expect(s1!.continuesAfter).toBe(true);
    expect(s2!.weekIndex).toBe(2);
    expect(s2!.startCol).toBe(0);
    expect(s2!.span).toBe(2);
    expect(s2!.continuesBefore).toBe(true);
  });

  it("stacks overlapping events into distinct lanes; longer spans get lower lanes", () => {
    const model = buildCalendarMonthModel(
      cal,
      view,
      [ev("short", `${iso(1, 2)}T09:00`), ev("long", iso(1, 1), iso(1, 4))],
      {}
    );
    const long = model.segments.find((s) => s.event.id === "long")!;
    const short = model.segments.find((s) => s.event.id === "short")!;
    expect(long.lane).toBe(0);
    expect(short.lane).toBe(1);
  });

  it("reuses lanes for non-overlapping events in the same week", () => {
    const model = buildCalendarMonthModel(
      cal,
      view,
      [ev("a", `${iso(1, 0)}T09:00`), ev("b", `${iso(1, 4)}T09:00`)],
      {}
    );
    expect(model.segments.every((s) => s.lane === 0)).toBe(true);
  });

  it("hides events beyond maxLanes and reports per-day overflow counts", () => {
    const d = iso(1, 2);
    const model = buildCalendarMonthModel(
      cal,
      view,
      [ev("a", `${d}T08:00`), ev("b", `${d}T09:00`), ev("c", `${d}T10:00`)],
      { maxLanes: 2 }
    );
    expect(model.segments).toHaveLength(2);
    expect(model.overflow[1]![2]).toBe(1);
    expect(model.overflow[1]![3]).toBe(0);
  });

  it("ignores events entirely outside the grid", () => {
    const model = buildCalendarMonthModel(cal, view, [ev("a", "1999-01-01")], {});
    expect(model.segments).toHaveLength(0);
  });

  it("clips events partially outside the grid and flags continuation", () => {
    const before = new Date(grid.weeks[0]![0]!.gregorian.getTime() - 2 * 86400000)
      .toISOString()
      .slice(0, 10);
    const model = buildCalendarMonthModel(cal, view, [ev("a", before, iso(0, 1))], {});
    const seg = model.segments[0]!;
    expect(seg.weekIndex).toBe(0);
    expect(seg.startCol).toBe(0);
    expect(seg.span).toBe(2);
    expect(seg.continuesBefore).toBe(true);
  });

  it("exposes the underlying week grid", () => {
    const model = buildCalendarMonthModel(cal, view, [], {});
    expect(model.weeks.length).toBe(6);
    expect(model.year).toBe(1445);
    expect(model.month).toBe(9);
  });
});
