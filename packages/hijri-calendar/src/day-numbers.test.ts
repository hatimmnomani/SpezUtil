import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createCalendar } from "@spezutil/hijri-core";
import { HijriCalendarElement } from "./hijri-calendar";

const cal = createCalendar();

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

function cellFor(el: HijriCalendarElement, iso: string): HTMLElement {
  return sr(el).querySelector(`[data-date="${iso}"]`) as HTMLElement;
}

describe("gregorian month-change marker", () => {
  it("shows the abbreviated month on the first of a Gregorian month in month view", () => {
    const el = mount({ date: "2026-07-06" });
    const first = cellFor(el, "2026-07-01");
    expect(first.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe("1 Jul");
    const second = cellFor(el, "2026-07-02");
    expect(second.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe("2");
  });

  it("shows the abbreviated month in week-view column headers on the first", () => {
    // week containing 2026-07-01 (Wednesday)
    const el = mount({ date: "2026-06-29", view: "week" });
    const heads = Array.from(sr(el).querySelectorAll(".tg-col-head"));
    const firstHead = heads.find((h) =>
      h.querySelector('[part="day-secondary"]')!.textContent!.includes("Jul")
    );
    expect(firstHead).toBeTruthy();
    expect(firstHead!.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe("1 Jul");
  });
});

describe("primary / secondary-position", () => {
  it("defaults to Hijri primary with Gregorian secondary", () => {
    const el = mount({ date: "2026-07-06" });
    const cell = cellFor(el, "2026-07-06");
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    expect(cell.querySelector('[part="day-primary"]')!.textContent!.trim()).toBe(String(h.day));
    expect(cell.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe("6");
  });

  it("swaps numbers when primary=gregorian", () => {
    const el = mount({ date: "2026-07-06", primary: "gregorian" });
    const cell = cellFor(el, "2026-07-06");
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    expect(cell.querySelector('[part="day-primary"]')!.textContent!.trim()).toBe("6");
    expect(cell.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe(String(h.day));
  });

  it("swaps time-grid column header numbers when primary=gregorian", () => {
    const el = mount({ date: "2026-07-06", view: "day", primary: "gregorian" });
    const head = sr(el).querySelector(".tg-col-head")!;
    expect(head.querySelector('[part="day-primary"]')!.textContent!.trim()).toBe("6");
  });

  it("omits the secondary number when secondary-position=hidden", () => {
    const el = mount({ date: "2026-07-06", "secondary-position": "hidden" });
    const cell = cellFor(el, "2026-07-06");
    expect(cell.querySelector('[part="day-secondary"]')).toBeNull();
  });

  it("reflects camelCase properties", () => {
    const el = mount({ date: "2026-07-06" });
    el.primary = "gregorian";
    el.secondaryPosition = "below";
    expect(el.getAttribute("primary")).toBe("gregorian");
    expect(el.getAttribute("secondary-position")).toBe("below");
    expect(el.primary).toBe("gregorian");
    expect(el.secondaryPosition).toBe("below");
  });

  it("re-renders when the attributes change", () => {
    const el = mount({ date: "2026-07-06" });
    el.setAttribute("primary", "gregorian");
    const cell = cellFor(el, "2026-07-06");
    expect(cell.querySelector('[part="day-primary"]')!.textContent!.trim()).toBe("6");
  });
});
