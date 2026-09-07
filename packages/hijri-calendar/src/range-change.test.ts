import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HijriCalendarElement, type RangeChangeDetail } from "./hijri-calendar";

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

function listen(el: HijriCalendarElement): RangeChangeDetail[] {
  const events: RangeChangeDetail[] = [];
  el.addEventListener("range-change", (e) => events.push((e as CustomEvent).detail));
  return events;
}

function daySpan(detail: RangeChangeDetail): number {
  const start = new Date(`${detail.start}T00:00:00Z`).getTime();
  const end = new Date(`${detail.end}T00:00:00Z`).getTime();
  return (end - start) / 86400000;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("<hijri-calendar> range-change: initial fire", () => {
  it('fires exactly once on connect with reason "init" and the month grid bounds', () => {
    const el = document.createElement("hijri-calendar") as HijriCalendarElement;
    el.setAttribute("date", "2026-07-06");
    const events = listen(el);
    document.body.appendChild(el); // triggers connectedCallback synchronously

    expect(events.length).toBe(1);
    expect(events[0]!.reason).toBe("init");
    expect(events[0]!.view).toBe("month");

    const cells = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-date]"));
    const firstDate = cells[0]!.dataset.date!;
    const lastDate = cells[cells.length - 1]!.dataset.date!;
    const expectedEnd = new Date(`${lastDate}T00:00:00Z`);
    expectedEnd.setUTCDate(expectedEnd.getUTCDate() + 1);

    expect(events[0]!.start).toBe(firstDate);
    expect(events[0]!.end).toBe(expectedEnd.toISOString().slice(0, 10));
    expect(el.visibleRange).toEqual(events[0]);
  });
});

describe("<hijri-calendar> range-change: navigation", () => {
  it('nav-next fires reason "navigate"', () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    (sr(el).querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    expect(events.length).toBe(1);
    expect(events[0]!.reason).toBe("navigate");
  });

  it("nav-next then nav-prev round-trips A→B→A, emitting exactly two more events and never a duplicate", () => {
    const el = mount({ date: "2026-07-06" });
    const initialStart = el.visibleRange!.start;
    const events = listen(el);
    (sr(el).querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    (sr(el).querySelector('[part="nav-prev"]') as HTMLButtonElement).click();
    expect(events.length).toBe(2);
    expect(events[0]!.reason).toBe("navigate");
    expect(events[1]!.reason).toBe("navigate");
    expect(events[0]!.start).not.toBe(initialStart);
    expect(events[1]!.start).toBe(initialStart);
  });
});

describe("<hijri-calendar> range-change: no-ops", () => {
  it("setting events does not fire range-change", () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    el.events = [{ id: "a", title: "Event a", start: "2026-07-06T10:00" }];
    expect(events.length).toBe(0);
  });

  it("setting eventFields does not fire range-change", () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    el.eventFields = { start: "start_at" };
    expect(events.length).toBe(0);
  });
});

describe("<hijri-calendar> range-change: view/attribute reasons", () => {
  it('an external view attribute change fires reason "attribute"', () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    el.setAttribute("view", "week");
    expect(events.length).toBe(1);
    expect(events[0]!.reason).toBe("attribute");
    expect(events[0]!.view).toBe("week");
  });

  it('clicking a view button fires reason "view"', () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    (sr(el).querySelector('[data-view="week"]') as HTMLButtonElement).click();
    expect(events.length).toBe(1);
    expect(events[0]!.reason).toBe("view");
    expect(events[0]!.view).toBe("week");
  });
});

describe("<hijri-calendar> range-change: per-view range length", () => {
  it("week view spans 7 days", () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    (sr(el).querySelector('[data-view="week"]') as HTMLButtonElement).click();
    expect(daySpan(events[0]!)).toBe(7);
  });

  it("day view spans 1 day", () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    (sr(el).querySelector('[data-view="day"]') as HTMLButtonElement).click();
    expect(daySpan(events[0]!)).toBe(1);
  });

  it("agenda view spans 30 days", () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    (sr(el).querySelector('[data-view="agenda"]') as HTMLButtonElement).click();
    expect(daySpan(events[0]!)).toBe(30);
  });
});
