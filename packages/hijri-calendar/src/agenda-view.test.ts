import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createCalendar, translitMonthNames } from "@spezutil/hijri-core";
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
    (sr(el).querySelector('[part="agenda-item"]') as HTMLButtonElement).click();
    expect(detail!.event.id).toBe("a");
  });

  it("navigates by 30 days", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    (sr(el).querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    expect(el.getAttribute("date")).toBe("2026-08-05");
  });
});
