import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createCalendar, translitMonthNames, arMonthNames } from "@spezutil/hijri-core";
import type { CalendarEvent } from "@spezutil/hijri-view-core";
import { HijriCalendarElement } from "./hijri-calendar";

const cal = createCalendar();

beforeAll(() => {
  if (!customElements.get("hijri-calendar")) {
    customElements.define("hijri-calendar", HijriCalendarElement);
  }
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

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("<hijri-calendar> shell", () => {
  it("renders a month grid by default", () => {
    const el = mount({ date: "2026-07-06" });
    expect(sr(el).querySelector('[role="grid"]')).toBeTruthy();
    expect(sr(el).querySelectorAll('[data-i]').length).toBe(42);
  });

  it("shows the Hijri month title with a Gregorian subtitle", () => {
    const el = mount({ date: "2026-07-06" });
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    const title = sr(el).querySelector('[part="title"]')!.textContent!;
    expect(title).toContain(translitMonthNames[h.month - 1]);
    expect(title).toContain(String(h.year));
  });

  it("renders Arabic month names when locale=ar", () => {
    const el = mount({ date: "2026-07-06", locale: "ar" });
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    expect(sr(el).querySelector('[part="title"]')!.textContent).toContain(
      arMonthNames[h.month - 1]
    );
  });

  it("navigates to the next Hijri month and fires date-change", () => {
    const el = mount({ date: "2026-07-06" });
    const before = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    let detail: { date: string } | null = null;
    el.addEventListener("date-change", (e) => (detail = (e as CustomEvent).detail));
    (sr(el).querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    expect(detail).not.toBeNull();
    const after = cal.gregorianToHijri(new Date(detail!.date + "T00:00Z"));
    expect(after.month === before.month + 1 || (before.month === 12 && after.month === 1)).toBe(
      true
    );
    expect(sr(el).querySelector('[part="title"]')!.textContent).toContain(
      translitMonthNames[after.month - 1]
    );
  });

  it("returns to today via the today button", () => {
    const el = mount({ date: "2020-01-01" });
    (sr(el).querySelector('[part="nav-today"]') as HTMLButtonElement).click();
    const todayHijri = cal.gregorianToHijri(new Date());
    expect(sr(el).querySelector('[part="title"]')!.textContent).toContain(
      translitMonthNames[todayHijri.month - 1]
    );
  });

  it("switches views via the view switcher and fires view-change", () => {
    const el = mount({ date: "2026-07-06" });
    let detail: { view: string } | null = null;
    el.addEventListener("view-change", (e) => (detail = (e as CustomEvent).detail));
    (sr(el).querySelector('[data-view="week"]') as HTMLButtonElement).click();
    expect(detail).toEqual({ view: "week" });
    expect(el.getAttribute("view")).toBe("week");
  });

  it("reflects camelCase properties to attributes", () => {
    const el = mount({ date: "2026-07-06" });
    el.locale = "ar";
    el.dayStart = 8;
    el.dayEnd = 18;
    el.weekStart = 1;
    el.maxEvents = 5;
    el.timeFormat = "24";
    expect(el.getAttribute("locale")).toBe("ar");
    expect(el.getAttribute("day-start")).toBe("8");
    expect(el.getAttribute("day-end")).toBe("18");
    expect(el.getAttribute("week-start")).toBe("1");
    expect(el.getAttribute("max-events")).toBe("5");
    expect(el.getAttribute("time-format")).toBe("24");
    expect(el.locale).toBe("ar");
    expect(el.dayStart).toBe(8);
    expect(el.dayEnd).toBe(18);
  });

  it("applies rtl direction", () => {
    const el = mount({ date: "2026-07-06", dir: "rtl" });
    expect(el.getAttribute("dir")).toBe("rtl");
  });

  it("reflects the timezone property to an attribute", () => {
    const el = mount({ date: "2026-07-06" });
    el.timezone = "Asia/Kolkata";
    expect(el.getAttribute("timezone")).toBe("Asia/Kolkata");
    expect(el.timezone).toBe("Asia/Kolkata");
  });
});

describe("<hijri-calendar> timezone-aware today", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves the today button using the local calendar day, not UTC", () => {
    vi.useFakeTimers();
    // 00:30 UTC on 20 July 2026, but only 13:30 on 19 July in UTC-11 (Pago Pago).
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 20, 0, 30)));
    const el = mount({ date: "2020-01-01", timezone: "Pacific/Pago_Pago" });
    (sr(el).querySelector('[part="nav-today"]') as HTMLButtonElement).click();
    expect(el.date).toBe("2026-07-19");
  });

  it("resolves the today button forward across the UTC day boundary when the zone is ahead", () => {
    vi.useFakeTimers();
    // 23:30 UTC on 20 July 2026 is already 13:30 on 21 July in UTC+14 (Kiritimati).
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 20, 23, 30)));
    const el = mount({ date: "2020-01-01", timezone: "Pacific/Kiritimati" });
    (sr(el).querySelector('[part="nav-today"]') as HTMLButtonElement).click();
    expect(el.date).toBe("2026-07-21");
  });
});

describe("<hijri-calendar> month view events", () => {
  it("renders event chips for supplied events", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00")];
    const chips = sr(el).querySelectorAll('[part~="event"]');
    expect(chips.length).toBe(1);
    expect(chips[0]!.textContent).toContain("Event a");
  });

  it("applies the event color to the chip", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00", { color: "rgb(200, 0, 0)" })];
    const chip = sr(el).querySelector('[part~="event"]') as HTMLElement;
    expect(chip.style.getPropertyValue("--_ev-color")).toBe("rgb(200, 0, 0)");
  });

  it("fires event-click with event, hijri and gregorian detail", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00", { data: { n: 1 } })];
    let detail: { event: CalendarEvent; gregorian: string } | null = null;
    el.addEventListener("event-click", (e) => (detail = (e as CustomEvent).detail));
    (sr(el).querySelector('[part~="event"]') as HTMLButtonElement).click();
    expect(detail!.event.id).toBe("a");
    expect(detail!.gregorian).toBe("2026-07-06T10:00");
    expect(detail!.event.data).toEqual({ n: 1 });
  });

  it("fires date-click when a day cell is clicked", () => {
    const el = mount({ date: "2026-07-06" });
    let detail: { gregorian: string; hijri: { day: number } } | null = null;
    el.addEventListener("date-click", (e) => (detail = (e as CustomEvent).detail));
    const target = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-i]")).find(
      (b) => b.dataset.date === "2026-07-06"
    )!;
    target.click();
    expect(detail!.gregorian).toBe("2026-07-06");
    expect(detail!.hijri).toEqual(cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6))));
  });

  it("collapses events beyond max-events into a +N more link firing more-click", () => {
    const el = mount({ date: "2026-07-06", "max-events": "2" });
    el.events = [
      ev("a", "2026-07-06T08:00"),
      ev("b", "2026-07-06T09:00"),
      ev("c", "2026-07-06T10:00"),
    ];
    expect(sr(el).querySelectorAll('[part~="event"]').length).toBe(2);
    const more = sr(el).querySelector('[part="more-link"]') as HTMLButtonElement;
    expect(more.textContent).toContain("1");
    let detail: { events: CalendarEvent[]; gregorian: string } | null = null;
    el.addEventListener("more-click", (e) => (detail = (e as CustomEvent).detail));
    more.click();
    expect(detail!.gregorian).toBe("2026-07-06");
    expect(detail!.events.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("<hijri-calendar> eventFields mapping", () => {
  it("renders unmodified events as before when eventFields is unset", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00")];
    expect(sr(el).querySelectorAll('[part~="event"]').length).toBe(1);
  });

  it("maps a differently-named start field before rendering", () => {
    const el = mount({ date: "2026-07-06" });
    el.eventFields = { start: "start_at" };
    el.events = [
      { id: "a", title: "Check", start_at: "2026-07-06T09:30", attendees: [{ id: "x" }] },
    ] as unknown as CalendarEvent[];
    const chips = sr(el).querySelectorAll('[part~="event"]');
    expect(chips.length).toBe(1);
    expect(chips[0]!.textContent).toContain("Check");
  });

  it("re-derives events when eventFields is set after events", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [
      { id: "a", title: "Check", start_at: "2026-07-06T09:30" },
    ] as unknown as CalendarEvent[];
    expect(sr(el).querySelectorAll('[part~="event"]').length).toBe(0);
    el.eventFields = { start: "start_at" };
    expect(sr(el).querySelectorAll('[part~="event"]').length).toBe(1);
  });

  it("attaches the original raw object as data for click handlers", () => {
    const el = mount({ date: "2026-07-06" });
    el.eventFields = { start: "start_at" };
    const raw = { id: "a", title: "Check", start_at: "2026-07-06T09:30", attendees: [{ id: "x" }] };
    el.events = [raw] as unknown as CalendarEvent[];
    let detail: { event: CalendarEvent } | null = null;
    el.addEventListener("event-click", (e) => (detail = (e as CustomEvent).detail));
    (sr(el).querySelector('[part~="event"]') as HTMLButtonElement).click();
    expect(detail!.event.data).toBe(raw);
  });
});
