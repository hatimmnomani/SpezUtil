import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CalendarEvent } from "@spezutil/hijri-view-core";
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

const ev = (id: string, start: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  ...extra,
});

describe('<hijri-calendar> day-header="banner"', () => {
  it("renders part=day-banner with primary/secondary/weekday spans and a summary, and no .tg-col-head", () => {
    const el = mount({ date: "2026-05-14", view: "day", "day-header": "banner" });
    el.events = [
      ev("a", "2026-05-14T09:00", { durationMinutes: 90 }),
      ev("b", "2026-05-14T14:00", { durationMinutes: 60 }),
    ];
    expect(sr(el).querySelector(".tg-col-head")).toBeNull();
    const banner = sr(el).querySelector('[part~="day-banner"]');
    expect(banner).toBeTruthy();
    expect(sr(el).querySelector('[part="day-banner-primary"]')).toBeTruthy();
    expect(sr(el).querySelector('[part="day-banner-secondary"]')).toBeTruthy();
    expect(sr(el).querySelector('[part="day-banner-weekday"]')).toBeTruthy();
    const summary = sr(el).querySelector('[part~="day-banner-summary"]')!;
    expect(summary.textContent!.trim()).toBe("2 events · 2.5 hours scheduled");
  });

  it('locale="ar" gives the Arabic summary/label strings', () => {
    const el = mount({ date: "2026-05-14", view: "day", "day-header": "banner", locale: "ar" });
    el.events = [
      ev("a", "2026-05-14T09:00", { durationMinutes: 90 }),
      ev("b", "2026-05-14T14:00", { durationMinutes: 60 }),
    ];
    const summary = sr(el).querySelector('[part~="day-banner-summary"]')!.textContent!;
    expect(summary).toMatch(/[؀-ۿ]/);
  });

  it('day-banner-primary carries dir="rtl" when names="ar" (single-script Arabic), and none by default (translit)', () => {
    const withAr = mount({ date: "2026-05-14", view: "day", "day-header": "banner", names: "ar" });
    expect(sr(withAr).querySelector('[part="day-banner-primary"]')!.getAttribute("dir")).toBe(
      "rtl"
    );

    const withTranslit = mount({ date: "2026-05-14", view: "day", "day-header": "banner" });
    expect(
      sr(withTranslit).querySelector('[part="day-banner-primary"]')!.getAttribute("dir")
    ).toBeNull();
  });

  it('day-header unset (default "column") renders .tg-col-head as today and no day-banner', () => {
    const el = mount({ date: "2026-05-14", view: "day" });
    expect(sr(el).querySelector(".tg-col-head")).toBeTruthy();
    expect(sr(el).querySelector('[part~="day-banner"]')).toBeNull();
  });

  it('day-header="banner" has no effect outside day view (week view keeps all 7 column heads)', () => {
    const el = mount({ date: "2026-05-14", view: "week", "day-header": "banner" });
    expect(sr(el).querySelectorAll(".tg-col-head").length).toBe(7);
    expect(sr(el).querySelector('[part~="day-banner"]')).toBeNull();
  });

  it("shows a zero summary when there are no events", () => {
    const el = mount({ date: "2026-05-14", view: "day", "day-header": "banner" });
    const summary = sr(el).querySelector('[part~="day-banner-summary"]')!;
    expect(summary.textContent!.trim()).toBe("0 events · 0.0 hours scheduled");
  });

  it('carries "today" as a second part token when the shown day is today', () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const el = mount({ date: todayIso, view: "day", "day-header": "banner" });
    const banner = sr(el).querySelector('[part~="day-banner"]')!;
    expect(banner.getAttribute("part")!.split(/\s+/)).toEqual(
      expect.arrayContaining(["day-banner", "today"])
    );

    const past = mount({ date: "2020-01-01", view: "day", "day-header": "banner" });
    const pastBanner = sr(past).querySelector('[part~="day-banner"]')!;
    expect(pastBanner.getAttribute("part")!.split(/\s+/)).not.toContain("today");
  });

  it('the day-summary slot falls back to the computed summary text and can be overridden by light-DOM slotting', () => {
    const el = mount({ date: "2026-05-14", view: "day", "day-header": "banner" });
    const slot = sr(el).querySelector('slot[name="day-summary"]') as HTMLSlotElement;
    expect(slot).toBeTruthy();
    expect(slot.textContent!.trim()).toBe("0 events · 0.0 hours scheduled");

    const span = document.createElement("span");
    span.slot = "day-summary";
    span.textContent = "Custom summary";
    el.appendChild(span);
    const assigned = slot.assignedNodes();
    expect(assigned.length).toBe(1);
    expect(assigned[0]!.textContent).toBe("Custom summary");
  });
});
