import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createCalendar } from "@spezutil/hijri-core";
import type { CalendarEvent } from "@spezutil/hijri-view-core";
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

const ev = (id: string, start: string, end?: string): CalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  ...(end ? { end } : {}),
});

describe("week view", () => {
  it("renders 7 day columns with Hijri-first headers", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    const heads = sr(el).querySelectorAll(".tg-col-head");
    expect(heads.length).toBe(7);
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 5)));
    expect(heads[0]!.textContent).toContain(String(h.day));
    expect(sr(el).querySelectorAll(".tg-day-col").length).toBe(7);
  });

  it("renders hour labels honoring day-start/day-end and time-format", () => {
    const el = mount({
      date: "2026-07-06",
      view: "week",
      "day-start": "9",
      "day-end": "17",
      "time-format": "24",
    });
    const labels = Array.from(sr(el).querySelectorAll(".tg-gutter span")).map(
      (s) => s.textContent
    );
    expect(labels[0]).toBe("09:00");
    expect(labels[labels.length - 1]).toBe("16:00");
    expect(labels.length).toBe(8);
  });

  it("positions a timed event block and fires event-click", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.events = [ev("a", "2026-07-06T06:00", "2026-07-06T12:00")];
    const block = sr(el).querySelector('[part~="event"]') as HTMLElement;
    expect(block).toBeTruthy();
    expect(block.style.top).toBe("25%");
    expect(block.style.height).toBe("25%");
    let detail: { event: CalendarEvent } | null = null;
    el.addEventListener("event-click", (e) => (detail = (e as CustomEvent).detail));
    block.click();
    expect(detail!.event.id).toBe("a");
  });

  it("splits side-by-side overlapping events", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.events = [
      ev("a", "2026-07-06T09:00", "2026-07-06T11:00"),
      ev("b", "2026-07-06T10:00", "2026-07-06T12:00"),
    ];
    const blocks = Array.from(sr(el).querySelectorAll<HTMLElement>('[part~="event"]'));
    expect(blocks.length).toBe(2);
    expect(blocks[0]!.style.width).toBe("50%");
    expect(blocks[0]!.style.left).not.toBe(blocks[1]!.style.left);
  });

  it("shows all-day events in the all-day row", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.events = [ev("a", "2026-07-06", "2026-07-07")];
    const allday = sr(el).querySelectorAll(".tg-allday-col [part~='event']");
    expect(allday.length).toBe(2);
  });

  it("fires slot-click with the 30-minute slot start datetime", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    let detail: { gregorian: string; hijri: { day: number } } | null = null;
    el.addEventListener("slot-click", (e) => (detail = (e as CustomEvent).detail));
    const slot = sr(el).querySelector('[data-slot="2026-07-06T09:30"]') as HTMLElement;
    slot.click();
    expect(detail!.gregorian).toBe("2026-07-06T09:30");
    expect(detail!.hijri).toEqual(cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6))));
  });

  it("shows a now indicator only in today's column", () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const el = mount({ date: todayIso, view: "week" });
    expect(sr(el).querySelectorAll(".now-line").length).toBe(1);
    const past = mount({ date: "2020-01-01", view: "week" });
    expect(sr(past).querySelectorAll(".now-line").length).toBe(0);
  });
});

describe("day view", () => {
  it("renders a single column anchored at the date", () => {
    const el = mount({ date: "2026-07-06", view: "day" });
    expect(sr(el).querySelectorAll(".tg-day-col").length).toBe(1);
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    expect(sr(el).querySelector(".tg-col-head")!.textContent).toContain(String(h.day));
  });

  it("navigates by one day", () => {
    const el = mount({ date: "2026-07-06", view: "day" });
    (sr(el).querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    expect(el.getAttribute("date")).toBe("2026-07-07");
  });
});
