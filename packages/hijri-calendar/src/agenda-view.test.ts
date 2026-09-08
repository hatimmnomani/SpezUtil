import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createCalendar, translitMonthNames } from "@spezutil/hijri-core";
import type { CalendarEvent } from "@spezutil/hijri-view-core";
import { HijriCalendarElement, type RangeChangeDetail } from "./hijri-calendar";

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

describe("agenda view", () => {
  it("groups events by day with Hijri-first headings, skipping empty days", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    el.events = [ev("a", "2026-07-06T10:00"), ev("b", "2026-07-10T09:00")];
    const days = sr(el).querySelectorAll('[part="agenda-day"]');
    expect(days.length).toBe(2);
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    expect(days[0]!.textContent).toContain(String(h.day));
    expect(days[0]!.textContent).toContain(translitMonthNames[h.month - 1]);
  });

  it("shows an empty message when no events fall in the window", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    el.events = [];
    expect(sr(el).querySelector(".agenda-empty")).toBeTruthy();
  });

  it("excludes events outside the 30-day window", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    el.events = [ev("far", "2026-09-01T10:00")];
    expect(sr(el).querySelectorAll('[part="agenda-day"]').length).toBe(0);
  });

  it("fires event-click when an agenda item is clicked", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    el.events = [ev("a", "2026-07-06T10:00")];
    let detail: { event: CalendarEvent } | null = null;
    el.addEventListener("event-click", (e) => (detail = (e as CustomEvent).detail));
    // Agenda items now also carry event-style part tokens (P4: "agenda-item event solid"), so
    // this is a ~= (space-separated tokens) match rather than an exact one — see event-chip.test.ts
    // for the analogous month/week chip precedent from P3.
    (sr(el).querySelector('[part~="agenda-item"]') as HTMLButtonElement).click();
    expect(detail!.event.id).toBe("a");
  });

  it("navigates by 30 days", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    (sr(el).querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    expect(el.getAttribute("date")).toBe("2026-08-05");
  });
});

describe("agenda-days", () => {
  it('defaults to 30 (agendaDays property) and "excludes events outside the window" still holds', () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    expect(el.agendaDays).toBe(30);
  });

  it('agenda-days="7" narrows the window (a day 8 days out is excluded) and navigates by 7 days', () => {
    const el = mount({ date: "2026-07-06", view: "agenda", "agenda-days": "7" });
    expect(el.agendaDays).toBe(7);
    el.events = [ev("in", "2026-07-10T09:00"), ev("out", "2026-07-14T09:00")];
    expect(sr(el).querySelectorAll('[part="agenda-day"]').length).toBe(1);

    (sr(el).querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    expect(el.getAttribute("date")).toBe("2026-07-13");
  });

  it("an out-of-range agenda-days value falls back to the default of 30", () => {
    const el = mount({ date: "2026-07-06", view: "agenda", "agenda-days": "0" });
    expect(el.agendaDays).toBe(30);
    const tooLarge = mount({ date: "2026-07-06", view: "agenda", "agenda-days": "400" });
    expect(tooLarge.agendaDays).toBe(30);
  });

  it('changing agenda-days fires range-change with reason "attribute" (it changes the visible range)', () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    const events: RangeChangeDetail[] = [];
    el.addEventListener("range-change", (e) => events.push((e as CustomEvent).detail));
    el.setAttribute("agenda-days", "7");
    expect(events.length).toBe(1);
    expect(events[0]!.reason).toBe("attribute");
    expect(events[0]!.view).toBe("agenda");
  });
});

describe("agenda parts and event-style", () => {
  it("carries part=agenda-date on the per-day date heading", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    el.events = [ev("a", "2026-07-06T10:00")];
    expect(sr(el).querySelector('[part="agenda-date"]')).toBeTruthy();
  });

  it("carries part=agenda-when alongside event-time on the agenda item's time span", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    el.events = [ev("a", "2026-07-06T10:00")];
    const when = sr(el).querySelector('[part~="agenda-when"]');
    expect(when).toBeTruthy();
    expect((when!.getAttribute("part") ?? "").split(/\s+/)).toEqual(
      expect.arrayContaining(["event-time", "agenda-when"])
    );
  });

  it('default "solid" event-style keeps the color dot and no tinted/outline part token', () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    el.events = [ev("a", "2026-07-06T10:00")];
    const item = sr(el).querySelector('[part~="agenda-item"]')!;
    expect(item.querySelector(".dot")).toBeTruthy();
    expect((item.getAttribute("part") ?? "").split(/\s+/)).toEqual(
      expect.arrayContaining(["agenda-item", "event", "solid"])
    );
  });

  it('"tinted"/"outline" event-style hides the dot and carries the matching part token', () => {
    const tinted = mount({ date: "2026-07-06", view: "agenda", "event-style": "tinted" });
    tinted.events = [ev("a", "2026-07-06T10:00")];
    const tintedItem = sr(tinted).querySelector('[part~="agenda-item"]')!;
    expect(tintedItem.querySelector(".dot")).toBeNull();
    expect((tintedItem.getAttribute("part") ?? "").split(/\s+/)).toContain("tinted");

    const outline = mount({ date: "2026-07-06", view: "agenda", "event-style": "outline" });
    outline.events = [ev("b", "2026-07-06T10:00")];
    const outlineItem = sr(outline).querySelector('[part~="agenda-item"]')!;
    expect(outlineItem.querySelector(".dot")).toBeNull();
    expect((outlineItem.getAttribute("part") ?? "").split(/\s+/)).toContain("outline");
  });
});
