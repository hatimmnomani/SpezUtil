import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HijriCalendarElement } from "./hijri-calendar";

beforeAll(() => {
  if (!customElements.get("hijri-calendar")) {
    customElements.define("hijri-calendar", HijriCalendarElement);
  }
});

beforeEach(() => {
  document.body.innerHTML = "";
});

function mount(attrs: Record<string, string> = {}): HijriCalendarElement {
  const el = document.createElement("hijri-calendar") as HijriCalendarElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function sr(el: HTMLElement): ShadowRoot {
  return el.shadowRoot!;
}

function weekdayCells(el: HijriCalendarElement): HTMLElement[] {
  return Array.from(sr(el).querySelectorAll<HTMLElement>('.dow-row [part~="weekday"]'));
}

function isWeekendCell(c: HTMLElement): boolean {
  return (c.getAttribute("part") ?? "").split(/\s+/).includes("weekend");
}

describe("<hijri-calendar> weekend-days (month view weekday header)", () => {
  it("marks Sat/Sun as weekend by default", () => {
    const el = mount({ date: "2026-07-06" });
    const cells = weekdayCells(el);
    expect(cells.length).toBe(7);
    const weekendTitles = cells.filter(isWeekendCell).map((c) => c.getAttribute("title"));
    expect(weekendTitles.sort()).toEqual(["Saturday", "Sunday"]);
  });

  it("moves the weekend columns to the end of the row when week-start=1", () => {
    const el = mount({ date: "2026-07-06", "week-start": "1" });
    const cells = weekdayCells(el);
    const weekendIdx = cells.map((c, i) => (isWeekendCell(c) ? i : -1)).filter((i) => i !== -1);
    expect(weekendIdx).toEqual([5, 6]);
  });

  it('weekend-days="5 6" marks Friday and Saturday, not Sunday', () => {
    const el = mount({ date: "2026-07-06", "weekend-days": "5 6" });
    const cells = weekdayCells(el);
    const weekendTitles = cells.filter(isWeekendCell).map((c) => c.getAttribute("title"));
    expect(weekendTitles.sort()).toEqual(["Friday", "Saturday"]);
  });

  it('weekend-days="" disables the weekend token entirely', () => {
    const el = mount({ date: "2026-07-06", "weekend-days": "" });
    const cells = weekdayCells(el);
    expect(cells.some(isWeekendCell)).toBe(false);
  });

  it("ignores out-of-range and duplicate tokens", () => {
    const el = mount({ date: "2026-07-06", "weekend-days": "6 6 9 -1 6" });
    expect(el.weekendDays).toEqual([6]);
  });

  it("reflects the weekendDays property to the attribute", () => {
    const el = mount({ date: "2026-07-06" });
    el.weekendDays = [5, 6];
    expect(el.getAttribute("weekend-days")).toBe("5 6");
    expect(el.weekendDays).toEqual([5, 6]);
  });
});

describe("<hijri-calendar> weekend-days (week view)", () => {
  it("carries a weekend class on .tg-col-head for the matching columns (P2 adds the part token)", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    const heads = Array.from(sr(el).querySelectorAll(".tg-col-head"));
    expect(heads.length).toBe(7);
    expect(heads.map((h) => h.classList.contains("weekend"))).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    // The nested weekday cell inside the column head carries the same weekend part token.
    expect(heads[0]!.querySelector('[part~="weekday"]')!.getAttribute("part")).toContain("weekend");
  });

  it('weekend-days="5 6" marks the Friday/Saturday columns instead', () => {
    const el = mount({ date: "2026-07-06", view: "week", "weekend-days": "5 6" });
    const heads = Array.from(sr(el).querySelectorAll(".tg-col-head"));
    expect(heads.map((h) => h.classList.contains("weekend"))).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
  });
});
