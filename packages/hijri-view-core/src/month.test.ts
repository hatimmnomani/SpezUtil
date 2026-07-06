import { describe, expect, it } from "vitest";
import { createCalendar } from "@spezutil/hijri-core";
import { buildMonthModel } from "./month";

describe("buildMonthModel", () => {
  const cal = createCalendar();

  it("returns 6 weeks of 7 cells", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {});
    expect(model.weeks.length).toBe(6);
    for (const week of model.weeks) expect(week.length).toBe(7);
  });

  it("flags cells inside vs outside the target month", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {});
    const inMonth = model.weeks.flat().filter((c) => c.inCurrentMonth);
    expect(inMonth.length).toBe(cal.monthLength(1445, 9));
    expect(inMonth[0].hijri.day).toBe(1);
  });

  it("marks selected and disabled cells", () => {
    const selected = { year: 1445, month: 9, day: 5 };
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {
      selected,
      isDisabled: (h) => h.day === 7,
    });
    const cells = model.weeks.flat();
    expect(cells.some((c) => c.selected && c.hijri.day === 5)).toBe(true);
    expect(cells.some((c) => c.disabled && c.hijri.day === 7 && c.inCurrentMonth)).toBe(true);
  });

  it("marks multiple-selected cells from selectedList", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {
      selectedList: [
        { year: 1445, month: 9, day: 3 },
        { year: 1445, month: 9, day: 8 },
      ],
    });
    const sel = model.weeks.flat().filter((c) => c.selected && c.inCurrentMonth);
    expect(sel.map((c) => c.hijri.day).sort((a, b) => a - b)).toEqual([3, 8]);
  });

  it("marks range endpoints and the in-between band", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {
      rangeStart: { year: 1445, month: 9, day: 5 },
      rangeEnd: { year: 1445, month: 9, day: 9 },
    });
    const cells = model.weeks.flat();
    expect(cells.some((c) => c.rangeStart && c.hijri.day === 5)).toBe(true);
    expect(cells.some((c) => c.rangeEnd && c.hijri.day === 9)).toBe(true);
    const band = cells.filter((c) => c.inRange && c.inCurrentMonth).map((c) => c.hijri.day);
    expect(band.sort((a, b) => a - b)).toEqual([6, 7, 8]);
  });

  it("starts grid on the configured weekStart day", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, { weekStart: 1 });
    for (const week of model.weeks) {
      expect(week[0]!.gregorian.getUTCDay()).toBe(1);
    }
    const inMonth = model.weeks.flat().filter((c) => c.inCurrentMonth);
    expect(inMonth.length).toBe(cal.monthLength(1445, 9));
    expect(inMonth[0]!.hijri.day).toBe(1);
  });

  it("defaults weekStart to Sunday", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {});
    expect(model.weeks[0]![0]!.gregorian.getUTCDay()).toBe(0);
  });

  it("normalizes a reversed range (end before start)", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {
      rangeStart: { year: 1445, month: 9, day: 9 },
      rangeEnd: { year: 1445, month: 9, day: 5 },
    });
    const band = model.weeks.flat().filter((c) => c.inRange && c.inCurrentMonth).map((c) => c.hijri.day);
    expect(band.sort((a, b) => a - b)).toEqual([6, 7, 8]);
  });
});
