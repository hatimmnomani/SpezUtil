import { describe, expect, it } from "vitest";
import { createCalendar } from "@digitaltakeoff/hijri-core";
import { buildMonthModel } from "./render";

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
});
