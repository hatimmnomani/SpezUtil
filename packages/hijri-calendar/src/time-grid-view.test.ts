import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("places the now indicator using the local calendar day, not UTC", () => {
    vi.useFakeTimers();
    try {
      // 00:30 UTC on 20 July 2026 is 13:30 on 19 July in UTC-11 (Pago Pago) — a UTC-day
      // reading would put "now" on the 20th and miss the 19th's column entirely.
      vi.setSystemTime(new Date(Date.UTC(2026, 6, 20, 0, 30)));
      const el = mount({ date: "2026-07-19", view: "day", timezone: "Pacific/Pago_Pago" });
      expect(sr(el).querySelectorAll(".now-line").length).toBe(1);
      const wrongDay = mount({ date: "2026-07-20", view: "day", timezone: "Pacific/Pago_Pago" });
      expect(sr(wrongDay).querySelectorAll(".now-line").length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("slot-minutes", () => {
  it('default (30) renders 24 [part~="slot"] per column for the default 0-24 window', () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    const col = sr(el).querySelectorAll('[part~="day-column"]')[0]!;
    expect(col.querySelectorAll('[part~="slot"]').length).toBe(24 * 2);
  });

  it('slot-minutes="60" renders 12 slots per column for day-start=8 day-end=20, and slot-click coarsens to the hour start', () => {
    const el = mount({
      date: "2026-07-06",
      view: "week",
      "slot-minutes": "60",
      "day-start": "8",
      "day-end": "20",
    });
    const col = sr(el).querySelectorAll('[part~="day-column"]')[0]!;
    expect(col.querySelectorAll('[part~="slot"]').length).toBe(12);

    let detail: { gregorian: string } | null = null;
    el.addEventListener("slot-click", (e) => (detail = (e as CustomEvent).detail));
    const slot = sr(el).querySelector('[data-slot="2026-07-06T09:00"]') as HTMLElement;
    expect(slot).toBeTruthy();
    // With 60-minute slots there is no ...T09:30 slot to click at all.
    expect(sr(el).querySelector('[data-slot="2026-07-06T09:30"]')).toBeNull();
    slot.click();
    expect(detail!.gregorian).toBe("2026-07-06T09:00");
  });

  it('slot-minutes="15" renders 48 slots per column for day-start=8 day-end=20, with the second slot of the hour at :15', () => {
    const el = mount({
      date: "2026-07-06",
      view: "week",
      "slot-minutes": "15",
      "day-start": "8",
      "day-end": "20",
    });
    const col = sr(el).querySelectorAll('[part~="day-column"]')[0]!;
    expect(col.querySelectorAll('[part~="slot"]').length).toBe(48);
    expect(sr(el).querySelector('[data-slot="2026-07-06T09:15"]')).toBeTruthy();
  });

  it("an out-of-range slot-minutes value falls back to the default of 30", () => {
    const el = mount({ date: "2026-07-06", view: "week", "slot-minutes": "45" });
    expect(el.slotMinutes).toBe(30);
  });

  it("sets --_slot-h on .tg-body from --hcal-hour-height and the current slot-minutes", () => {
    const el = mount({ date: "2026-07-06", view: "week", "slot-minutes": "15" });
    const body = sr(el).querySelector(".tg-body") as HTMLElement;
    expect(body.getAttribute("style")).toContain("--_slot-h:calc(var(--hcal-hour-height) * 15 / 60)");
  });
});

describe("--hcal-gutter-width", () => {
  it("replaces the previously hard-coded 56px in the grid-template-columns of the head/allday/body rows", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    for (const sel of [".tg-head", ".tg-allday", ".tg-body"]) {
      const node = sr(el).querySelector(sel) as HTMLElement;
      expect(node.getAttribute("style")).toContain("var(--hcal-gutter-width)");
      expect(node.getAttribute("style")).not.toContain("56px");
    }
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toContain("--hcal-gutter-width: 56px;");
  });
});

describe("allday-row", () => {
  it('"auto" hides the row when no all-day event is in the visible range', () => {
    const el = mount({ date: "2026-07-06", view: "week", "allday-row": "auto" });
    expect(sr(el).querySelector(".tg-allday")).toBeNull();
  });

  it('"auto" shows the row once an all-day event is in range', () => {
    const el = mount({ date: "2026-07-06", view: "week", "allday-row": "auto" });
    el.events = [ev("a", "2026-07-06", "2026-07-07")];
    expect(sr(el).querySelector(".tg-allday")).toBeTruthy();
  });

  it('"never" hides the row even with an all-day event present', () => {
    const el = mount({ date: "2026-07-06", view: "week", "allday-row": "never" });
    el.events = [ev("a", "2026-07-06", "2026-07-07")];
    expect(sr(el).querySelector(".tg-allday")).toBeNull();
  });

  it('"always" (default) shows the row even with no all-day events, matching today\'s behaviour', () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    expect(sr(el).querySelector(".tg-allday")).toBeTruthy();
  });

  it("carries part=allday-label on the row's text label", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    expect(sr(el).querySelector('[part="allday-label"]')).toBeTruthy();
  });
});

describe("now-indicator", () => {
  it('"none" renders no now-line even in today\'s column', () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const el = mount({ date: todayIso, view: "week", "now-indicator": "none" });
    expect(sr(el).querySelectorAll(".now-line").length).toBe(0);
  });

  it("the now-line element carries no inline colour; the color comes from --hcal-now-color in styles", () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const el = mount({ date: todayIso, view: "week" });
    const nowLine = sr(el).querySelector(".now-line") as HTMLElement;
    expect(nowLine).toBeTruthy();
    expect(nowLine.style.getPropertyValue("background")).toBe("");
    expect(nowLine.getAttribute("style")).not.toMatch(/background/);
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toContain("var(--hcal-now-color)");
    expect(css).toContain("--hcal-now-color: #ea4335;");
  });
});

describe("time-label-position", () => {
  it("carries part=time-label on gutter hour labels", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    expect(sr(el).querySelectorAll('[part="time-label"]').length).toBeGreaterThan(0);
  });

  it('default ("line") and "cell" are both reachable, backed by a CSS variant selector', () => {
    const line = mount({ date: "2026-07-06", view: "week" });
    expect(line.timeLabelPosition).toBe("line");
    const cell = mount({ date: "2026-07-06", view: "week", "time-label-position": "cell" });
    expect(cell.timeLabelPosition).toBe("cell");
    const css = sr(cell).querySelector("style")!.textContent!;
    expect(css).toContain(':host([time-label-position="cell"])');
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
